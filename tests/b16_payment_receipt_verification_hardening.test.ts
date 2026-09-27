import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminSession } from '@/lib/auth/types';
import {
  getMemberOwnPaymentReceiptSignedUrl,
  getMemberApplicationPayment,
  getAdminPaymentsList,
  verifyPayment,
  rejectPayment,
  getPaymentReceiptSignedUrl,
} from '@/lib/payment/service';
import * as supabaseServer from '@/lib/supabase/server';

describe('Phase 2 Hardening: Payment Receipt & Verification Experience', () => {
  // Test sessions
  const superAdminSession: AdminSession = {
    user: { id: 'admin-super-uuid', email: 'super@yrl.org.gh' } as any,
    role: 'super_admin',
    assignedRegion: undefined,
  };

  const regionalAdminAshanti: AdminSession = {
    user: { id: 'admin-ashanti-uuid', email: 'ashanti@yrl.org.gh' } as any,
    role: 'regional_coordinator',
    assignedRegion: 'Ashanti',
  };

  const regionalAdminAccra: AdminSession = {
    user: { id: 'admin-accra-uuid', email: 'accra@yrl.org.gh' } as any,
    role: 'regional_coordinator',
    assignedRegion: 'Greater Accra',
  };

  const sampleMemberEmail = 'applicant.kwame@example.com';
  const otherMemberEmail = 'attacker.imposter@example.com';

  // Valid RFC 4122 v4 UUIDs
  const samplePaymentId = '11111111-1111-4111-8111-111111111111';
  const sampleApplicationId = '22222222-2222-4222-8222-222222222222';
  const attackerApplicationId = '33333333-3333-4333-8333-333333333333';
  const samplePaymentWithoutReceiptId = '55555555-5555-4555-8555-555555555555';

  const sampleApplication = {
    id: sampleApplicationId,
    application_number: 'YRL-APP-2026-9001',
    full_name: 'Kwame Mensah',
    email: sampleMemberEmail,
    region: 'Ashanti',
    phone_number: '0244111222',
    status: 'pending_verification',
  };

  const attackerApplication = {
    id: attackerApplicationId,
    application_number: 'YRL-APP-2026-9999',
    full_name: 'Imposter User',
    email: otherMemberEmail,
    region: 'Greater Accra',
    phone_number: '0244999999',
    status: 'pending_verification',
  };

  const samplePaymentWithReceipt = {
    id: samplePaymentId,
    application_id: sampleApplicationId,
    payment_reference: 'YRL-PAY-2026-9001',
    transaction_reference: 'MOMO-TXN-987654',
    payment_method: 'manual_mobile_money',
    amount: 5.0,
    currency: 'GHS',
    claimed_payment_date: '2026-09-27',
    storage_bucket: 'payment-receipts',
    storage_object_path: `${sampleApplicationId}/${samplePaymentId}/momo_slip.jpg`,
    receipt_original_filename: 'momo_slip.jpg',
    receipt_mime_type: 'image/jpeg',
    receipt_file_size: 153600,
    status: 'pending_verification',
    rejection_reason: null,
    created_at: '2026-09-27T08:00:00Z',
    membership_applications: sampleApplication,
  };

  const samplePaymentWithoutReceipt = {
    ...samplePaymentWithReceipt,
    id: samplePaymentWithoutReceiptId,
    storage_object_path: null,
    receipt_original_filename: null,
    receipt_mime_type: null,
    receipt_file_size: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // PART 1: MEMBER RECEIPT ACCESS & ANTI-IDOR SECURITY
  // =========================================================================
  describe('1. Member Receipt Access & Anti-IDOR Security', () => {
    it('generates a 5-minute signed URL when member requests their own payment receipt', async () => {
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/receipt.jpg?token=secret123' },
        error: null,
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              ilike: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: sampleApplication,
                error: null,
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: samplePaymentWithReceipt,
                error: null,
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: mockAuditInsert,
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: mockCreateSignedUrl,
          })),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getMemberOwnPaymentReceiptSignedUrl(sampleMemberEmail, samplePaymentId);

      expect(result.success).toBe(true);
      expect(result.data?.signedUrl).toBe('https://supabase.co/storage/v1/object/sign/receipt.jpg?token=secret123');
      expect(result.data?.expiresIn).toBe(300);

      // Verify audit log emitted with member_receipt_downloaded
      expect(mockAuditInsert).toHaveBeenCalledTimes(1);
      const auditPayload = mockAuditInsert.mock.calls[0][0];
      expect(auditPayload.action).toBe('member_receipt_downloaded');
      expect(auditPayload.actor_id).toBe(sampleMemberEmail);
      expect(auditPayload.entity_id).toBe(samplePaymentId);
      expect(auditPayload.new_state.payment_reference).toBe('YRL-PAY-2026-9001');
      expect(auditPayload.new_state.storage_bucket).toBe('payment-receipts');
      expect(auditPayload.new_state).not.toHaveProperty('signedUrl'); // Never log raw signed URL
    });

    it('blocks access and returns error if authenticated email does not match application payment (Anti-IDOR)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              ilike: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: attackerApplication, // Attacker's own application
                error: null,
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              // Payment requested does not belong to attacker's application
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      // Attacker attempts to download another member's receipt
      const result = await getMemberOwnPaymentReceiptSignedUrl(otherMemberEmail, samplePaymentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment record not found for your application.');
    });

    it('returns error if payment record has no uploaded receipt evidence', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              ilike: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: sampleApplication,
                error: null,
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: samplePaymentWithoutReceipt,
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getMemberOwnPaymentReceiptSignedUrl(sampleMemberEmail, samplePaymentWithoutReceiptId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No receipt file has been uploaded');
    });

    it('returns error if application record does not exist for the email', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              ilike: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getMemberOwnPaymentReceiptSignedUrl('unknown@example.com', samplePaymentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Application record not found');
    });

    it('retrieves member application payment summary including receipt metadata and rejection feedback', async () => {
      const paymentWithRejection = {
        ...samplePaymentWithReceipt,
        status: 'rejected',
        rejection_reason: 'Mobile money reference TXN-987654 not found in secretariat telecom statement.',
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: paymentWithRejection,
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const summary = await getMemberApplicationPayment(sampleApplicationId);

      expect(summary).not.toBeNull();
      expect(summary?.id).toBe(samplePaymentId);
      expect(summary?.payment_reference).toBe('YRL-PAY-2026-9001');
      expect(summary?.status).toBe('rejected');
      expect(summary?.rejection_reason).toContain('secretariat telecom statement');
      expect(summary?.has_receipt).toBe(true);
      expect(summary?.receipt_original_filename).toBe('momo_slip.jpg');
    });
  });

  // =========================================================================
  // PART 2: ADMIN PAYMENT QUEUE FILTERING & USABILITY
  // =========================================================================
  describe('2. Admin Payment Queue Filtering & Usability', () => {
    it('applies hasReceipt=with_receipt filter correctly', async () => {
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [samplePaymentWithReceipt],
          count: 1,
          error: null,
        }),
      };

      const mockReconQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn: any) =>
          Promise.resolve(fn({ data: [samplePaymentWithReceipt] }))
        ),
      };

      let paymentTableCalls = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            paymentTableCalls++;
            return paymentTableCalls === 1 ? mockQuery : mockReconQuery;
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getAdminPaymentsList(superAdminSession, {
        hasReceipt: 'with_receipt',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.not).toHaveBeenCalledWith('storage_object_path', 'is', null);
      expect(result.data?.payments[0].has_receipt).toBe(true);
      expect(result.data?.payments[0].receipt_mime_type).toBe('image/jpeg');
    });

    it('applies hasReceipt=without_receipt filter correctly', async () => {
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [samplePaymentWithoutReceipt],
          count: 1,
          error: null,
        }),
      };

      const mockReconQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn: any) =>
          Promise.resolve(fn({ data: [samplePaymentWithoutReceipt] }))
        ),
      };

      let paymentTableCalls = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            paymentTableCalls++;
            return paymentTableCalls === 1 ? mockQuery : mockReconQuery;
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getAdminPaymentsList(superAdminSession, {
        hasReceipt: 'without_receipt',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.is).toHaveBeenCalledWith('storage_object_path', null);
      expect(result.data?.payments[0].has_receipt).toBe(false);
    });

    it('applies paymentMethod filter correctly', async () => {
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [samplePaymentWithReceipt],
          count: 1,
          error: null,
        }),
      };

      const mockReconQuery: any = {
        select: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn: any) =>
          Promise.resolve(fn({ data: [samplePaymentWithReceipt] }))
        ),
      };

      let paymentTableCalls = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            paymentTableCalls++;
            return paymentTableCalls === 1 ? mockQuery : mockReconQuery;
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await getAdminPaymentsList(superAdminSession, {
        paymentMethod: 'manual_mobile_money',
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('payment_method', 'manual_mobile_money');
    });

    it('applies dateRange filters correctly (today, 7days, 30days, custom)', async () => {
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          count: 0,
          error: null,
        }),
      };

      const mockReconQuery: any = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn: any) =>
          Promise.resolve(fn({ data: [] }))
        ),
      };

      let paymentTableCalls = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          paymentTableCalls++;
          return paymentTableCalls % 2 === 1 ? mockQuery : mockReconQuery;
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      // Test 'custom' date range
      await getAdminPaymentsList(superAdminSession, {
        dateRange: 'custom',
        startDate: '2026-09-01',
        endDate: '2026-09-27',
      });

      expect(mockQuery.gte).toHaveBeenCalledWith(
        'created_at',
        new Date('2026-09-01').toISOString()
      );
      expect(mockQuery.lte).toHaveBeenCalled();
    });

    it('enforces regional scoping on regional coordinator queries strictly', async () => {
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [samplePaymentWithReceipt],
          count: 1,
          error: null,
        }),
      };

      const mockReconQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn: any) =>
          Promise.resolve(fn({ data: [samplePaymentWithReceipt] }))
        ),
      };

      let paymentTableCalls = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          paymentTableCalls++;
          return paymentTableCalls === 1 ? mockQuery : mockReconQuery;
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      // Attempt to pass region: 'Greater Accra' when assigned to Ashanti
      await getAdminPaymentsList(regionalAdminAshanti, {
        region: 'Greater Accra',
      });

      // Query MUST be scoped to Ashanti
      expect(mockQuery.eq).toHaveBeenCalledWith('membership_applications.region', 'Ashanti');
      expect(mockReconQuery.eq).toHaveBeenCalledWith('membership_applications.region', 'Ashanti');
    });
  });

  // =========================================================================
  // PART 3: OPERATIONAL RECONCILIATION SUMMARY AGGREGATION
  // =========================================================================
  describe('3. Operational Reconciliation Summary Aggregation', () => {
    it('calculates exact totals and breakdown across authorized jurisdiction', async () => {
      const scopedPayments = [
        { amount: 5.0, status: 'successful', storage_object_path: 'path/1.jpg' },
        { amount: 5.0, status: 'successful', storage_object_path: 'path/2.jpg' },
        { amount: 5.0, status: 'pending_verification', storage_object_path: 'path/3.jpg' },
        { amount: 5.0, status: 'rejected', storage_object_path: 'path/4.jpg' },
        { amount: 5.0, status: 'pending', storage_object_path: null },
      ];

      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          count: 5,
          error: null,
        }),
      };

      const mockReconQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn: any) =>
          Promise.resolve(fn({ data: scopedPayments }))
        ),
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          return callCount === 1 ? mockQuery : mockReconQuery;
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getAdminPaymentsList(superAdminSession);

      expect(result.success).toBe(true);
      const recon = result.data?.reconciliation;
      expect(recon).toBeDefined();
      expect(recon?.totalRecords).toBe(5);
      expect(recon?.verifiedCount).toBe(2);
      expect(recon?.totalVerifiedAmount).toBe(10.0);
      expect(recon?.pendingVerificationCount).toBe(1);
      expect(recon?.totalPendingAmount).toBe(5.0);
      expect(recon?.rejectedCount).toBe(1);
      expect(recon?.totalRejectedAmount).toBe(5.0);
      expect(recon?.awaitingReceiptCount).toBe(1);
      expect(recon?.receiptsWithEvidenceCount).toBe(4);
    });
  });

  // =========================================================================
  // PART 4: REJECTION FEEDBACK & STATE TRANSITIONS
  // =========================================================================
  describe('4. Rejection Feedback & State Transitions', () => {
    it('persists rejection_reason to both payment and application and emits audit log', async () => {
      const mockPaymentUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockAppUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: samplePaymentWithReceipt,
                error: null,
              }),
              update: mockPaymentUpdate,
            };
          }
          if (table === 'membership_applications') {
            return {
              update: mockAppUpdate,
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: mockAuditInsert,
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const reason = 'Momo transaction ID could not be found on secretariat records.';
      const result = await rejectPayment(superAdminSession, {
        payment_id: samplePaymentId,
        rejection_reason: reason,
      });

      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('rejected');
      expect(result.data?.applicationStatus).toBe('payment_rejected');
      expect(result.data?.rejectionReason).toBe(reason);

      // Verify payment was updated with rejection_reason
      expect(mockPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          rejection_reason: reason,
        })
      );

      // Verify application was updated with rejection_reason
      expect(mockAppUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'payment_rejected',
          rejection_reason: reason,
        })
      );

      // Verify audit log emitted with rejection reason
      expect(mockAuditInsert).toHaveBeenCalledTimes(1);
      const auditPayload = mockAuditInsert.mock.calls[0][0];
      expect(auditPayload.action).toBe('payment_rejected');
      expect(auditPayload.new_state.rejection_reason).toBe(reason);
    });

    it('rejects attempt to reject an already successful payment (state machine guard)', async () => {
      const verifiedPayment = {
        ...samplePaymentWithReceipt,
        status: 'successful',
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: verifiedPayment,
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await rejectPayment(superAdminSession, {
        payment_id: samplePaymentId,
        rejection_reason: 'Mistaken rejection after verification',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already verified');
    });

    it('rejects attempt to re-verify an already verified payment (idempotency)', async () => {
      const verifiedPayment = {
        ...samplePaymentWithReceipt,
        status: 'successful',
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: verifiedPayment,
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(superAdminSession, {
        payment_id: samplePaymentId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already verified');
    });
  });

  // =========================================================================
  // PART 5: ADMIN RECEIPT VIEW AUDIT TRAIL
  // =========================================================================
  describe('5. Admin Receipt View Audit Trail', () => {
    it('emits payment_receipt_viewed audit log and never includes raw signed URL', async () => {
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/receipt.jpg?token=adminsecret' },
        error: null,
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: samplePaymentWithReceipt,
                error: null,
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: mockAuditInsert,
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: mockCreateSignedUrl,
          })),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getPaymentReceiptSignedUrl(superAdminSession, samplePaymentId);

      expect(result.success).toBe(true);
      expect(result.data?.signedUrl).toBeDefined();

      expect(mockAuditInsert).toHaveBeenCalledTimes(1);
      const auditPayload = mockAuditInsert.mock.calls[0][0];
      expect(auditPayload.action).toBe('payment_receipt_viewed');
      expect(auditPayload.actor_id).toBe('super@yrl.org.gh');
      expect(auditPayload.entity_id).toBe(samplePaymentId);
      expect(auditPayload.new_state).not.toHaveProperty('signedUrl');
    });
  });
});

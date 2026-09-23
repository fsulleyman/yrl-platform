import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminSession } from '@/lib/auth/types';
import {
  verifyPayment,
  rejectPayment,
  activateMembershipApplication,
  getPaymentReceiptSignedUrl,
  getAdminPaymentsList,
  getAdminPaymentDetail,
  checkPaymentPermission,
} from '@/lib/payment/service';
import {
  verifyPaymentSchema,
  rejectPaymentSchema,
  activateApplicationSchema,
  paymentFilterSchema,
} from '@/lib/validations/payment';
import * as supabaseServer from '@/lib/supabase/server';

describe('Phase B13.3: Admin Payment Verification & Membership Activation', () => {
  // Admin Sessions
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

  const nationalReviewerSession: AdminSession = {
    user: { id: 'reviewer-uuid', email: 'reviewer@yrl.org.gh' } as any,
    role: 'national_reviewer',
    assignedRegion: undefined,
  };

  const deactivatedAdminSession: AdminSession & { disabled: boolean } = {
    user: { id: 'deactivated-uuid', email: 'former@yrl.org.gh' } as any,
    role: 'regional_coordinator',
    assignedRegion: 'Ashanti',
    disabled: true,
  };

  // Sample Mock Entities with Valid UUIDs
  const samplePaymentAshantiId = '11111111-1111-4111-8111-111111111111';
  const sampleApplicationAshantiId = '22222222-2222-4222-8222-222222222222';
  const samplePaymentAccraId = '33333333-3333-4333-8333-333333333333';
  const sampleApplicationAccraId = '44444444-4444-4444-8444-444444444444';

  const samplePaymentAshanti = {
    id: samplePaymentAshantiId,
    application_id: sampleApplicationAshantiId,
    payment_reference: 'YRL-PAY-2026-1050',
    transaction_reference: 'TXN-ASHANTI-123456',
    payment_method: 'mobile_money',
    amount: 5.0,
    currency: 'GHS',
    claimed_payment_date: '2026-09-23',
    storage_bucket: 'payment-receipts',
    storage_object_path: `${sampleApplicationAshantiId}/${samplePaymentAshantiId}/receipt.png`,
    receipt_original_filename: 'receipt.png',
    receipt_mime_type: 'image/png',
    receipt_file_size: 102400,
    status: 'pending_verification',
    created_at: '2026-09-23T10:00:00Z',
    updated_at: '2026-09-23T10:00:00Z',
  };

  const sampleApplicationAshanti = {
    id: sampleApplicationAshantiId,
    application_number: 'YRL-APP-2026-1050',
    member_id: null,
    full_name: 'Kwame Mensah',
    date_of_birth: '2000-01-15',
    gender: 'Male',
    phone_number: '0244111222',
    whatsapp_number: '0244111222',
    email: 'kwame.mensah@example.com',
    region: 'Ashanti',
    district_municipality: 'Kumasi Metro',
    town_community: 'Adum',
    occupation: 'Teacher',
    education_level: "Bachelor's Degree",
    why_join: 'Passionate about grassroots civic leadership and youth empowerment.',
    availability: '5-10 hours/week',
    engagement_interests: ['civic_education'],
    civic_acknowledgement: true,
    status: 'pending_verification',
    submitted_at: '2026-09-23T10:00:00Z',
    created_at: '2026-09-23T10:00:00Z',
    updated_at: '2026-09-23T10:00:00Z',
  };

  const samplePaymentAccra = {
    id: samplePaymentAccraId,
    application_id: sampleApplicationAccraId,
    payment_reference: 'YRL-PAY-2026-1051',
    transaction_reference: 'TXN-ACCRA-654321',
    payment_method: 'mobile_money',
    amount: 5.0,
    currency: 'GHS',
    claimed_payment_date: '2026-09-23',
    storage_bucket: 'payment-receipts',
    storage_object_path: `${sampleApplicationAccraId}/${samplePaymentAccraId}/receipt.png`,
    receipt_original_filename: 'receipt.png',
    receipt_mime_type: 'image/png',
    receipt_file_size: 204800,
    status: 'pending_verification',
    created_at: '2026-09-23T11:00:00Z',
    updated_at: '2026-09-23T11:00:00Z',
  };

  const sampleApplicationAccra = {
    id: sampleApplicationAccraId,
    application_number: 'YRL-APP-2026-1051',
    member_id: null,
    full_name: 'Akua Osei',
    date_of_birth: '1999-05-20',
    gender: 'Female',
    phone_number: '0200333444',
    whatsapp_number: '0200333444',
    email: 'akua.osei@example.com',
    region: 'Greater Accra',
    district_municipality: 'Accra Metro',
    town_community: 'Osu',
    occupation: 'Accountant',
    education_level: "Master's Degree",
    why_join: 'Contributing professional skills to community development.',
    availability: '1-3 hours/week',
    engagement_interests: ['finance_audit'],
    civic_acknowledgement: true,
    status: 'pending_verification',
    submitted_at: '2026-09-23T11:00:00Z',
    created_at: '2026-09-23T11:00:00Z',
    updated_at: '2026-09-23T11:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Part 1: Admin Authentication, Authorization & Regional Scoping (Scenarios 1–14)
  // ===========================================================================
  describe('1. Admin Authentication, Authorization & Regional Scoping', () => {
    it('Scenario 1: Super admin can view payments across all regions', () => {
      const check1 = checkPaymentPermission(superAdminSession, 'payments.view', 'Ashanti');
      const check2 = checkPaymentPermission(superAdminSession, 'payments.view', 'Greater Accra');
      const check3 = checkPaymentPermission(superAdminSession, 'payments.view', 'Northern');

      expect(check1.authorized).toBe(true);
      expect(check2.authorized).toBe(true);
      expect(check3.authorized).toBe(true);
    });

    it('Scenario 2: Super admin can verify payment in any region', () => {
      const check = checkPaymentPermission(superAdminSession, 'payments.verify', 'Ashanti');
      expect(check.authorized).toBe(true);
    });

    it('Scenario 3: Super admin can reject payment in any region', () => {
      const check = checkPaymentPermission(superAdminSession, 'payments.reject', 'Greater Accra');
      expect(check.authorized).toBe(true);
    });

    it('Scenario 4: Super admin can activate membership in any region', () => {
      const check = checkPaymentPermission(superAdminSession, 'payments.activate', 'Volta');
      expect(check.authorized).toBe(true);
    });

    it('Scenario 5: Regional coordinator (Ashanti) can view payments in Ashanti', () => {
      const check = checkPaymentPermission(regionalAdminAshanti, 'payments.view', 'Ashanti');
      expect(check.authorized).toBe(true);
    });

    it('Scenario 6: Regional coordinator (Ashanti) cannot view payments in Greater Accra', () => {
      const check = checkPaymentPermission(regionalAdminAshanti, 'payments.view', 'Greater Accra');
      expect(check.authorized).toBe(false);
      expect(check.reason).toContain('Forbidden');
    });

    it('Scenario 7: Regional coordinator (Ashanti) can verify payment in Ashanti', () => {
      const check = checkPaymentPermission(regionalAdminAshanti, 'payments.verify', 'Ashanti');
      expect(check.authorized).toBe(true);
    });

    it('Scenario 8: Regional coordinator (Ashanti) cannot verify payment in Greater Accra', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAccra, membership_applications: sampleApplicationAccra },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(regionalAdminAshanti, { payment_id: samplePaymentAccra.id });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
    });

    it('Scenario 9: Regional coordinator (Ashanti) can reject payment in Ashanti', () => {
      const check = checkPaymentPermission(regionalAdminAshanti, 'payments.reject', 'Ashanti');
      expect(check.authorized).toBe(true);
    });

    it('Scenario 10: Regional coordinator (Ashanti) cannot reject payment in Greater Accra', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAccra, membership_applications: sampleApplicationAccra },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await rejectPayment(regionalAdminAshanti, {
        payment_id: samplePaymentAccra.id,
        rejection_reason: 'Invalid telecom transaction reference',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
    });

    it('Scenario 11: Regional coordinator (Ashanti) can activate membership in Ashanti', () => {
      const check = checkPaymentPermission(regionalAdminAshanti, 'payments.activate', 'Ashanti');
      expect(check.authorized).toBe(true);
    });

    it('Scenario 12: Regional coordinator (Ashanti) cannot activate membership in Greater Accra', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...sampleApplicationAccra, payments: [{ status: 'successful' }] },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await activateMembershipApplication(regionalAdminAshanti, {
        application_id: sampleApplicationAccra.id,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
    });

    it('Scenario 13: National reviewer can view but cannot verify, reject, or activate payments', () => {
      const viewCheck = checkPaymentPermission(nationalReviewerSession, 'payments.view');
      const verifyCheck = checkPaymentPermission(nationalReviewerSession, 'payments.verify');
      const rejectCheck = checkPaymentPermission(nationalReviewerSession, 'payments.reject');
      const activateCheck = checkPaymentPermission(nationalReviewerSession, 'payments.activate');

      expect(viewCheck.authorized).toBe(true);
      expect(verifyCheck.authorized).toBe(false);
      expect(rejectCheck.authorized).toBe(false);
      expect(activateCheck.authorized).toBe(false);
    });

    it('Scenario 14: Deactivated administrator cannot perform any payment action', () => {
      const viewCheck = checkPaymentPermission(deactivatedAdminSession, 'payments.view');
      const verifyCheck = checkPaymentPermission(deactivatedAdminSession, 'payments.verify');
      const rejectCheck = checkPaymentPermission(deactivatedAdminSession, 'payments.reject');
      const activateCheck = checkPaymentPermission(deactivatedAdminSession, 'payments.activate');

      expect(viewCheck.authorized).toBe(false);
      expect(viewCheck.reason).toContain('deactivated');
      expect(verifyCheck.authorized).toBe(false);
      expect(rejectCheck.authorized).toBe(false);
      expect(activateCheck.authorized).toBe(false);
    });
  });

  // ===========================================================================
  // Part 2: Payment Verification Workflow (Scenarios 15–22)
  // ===========================================================================
  describe('2. Payment Verification Workflow', () => {
    it('Scenario 15: Verifying payment in pending_verification transitions status to successful', async () => {
      const mockPayUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockAppUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: mockPayUpdate,
            };
          }
          if (table === 'membership_applications') {
            return { update: mockAppUpdate };
          }
          if (table === 'audit_logs') {
            return { insert: mockAuditInsert };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(regionalAdminAshanti, { payment_id: samplePaymentAshanti.id });

      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('successful');
      expect(result.data?.applicationStatus).toBe('payment_verified');
    });

    it('Scenario 16: Verifying payment updates verified_by and verified_at', async () => {
      let paymentUpdatedWith: any = null;
      const mockPayUpdate = vi.fn((payload) => {
        paymentUpdatedWith = payload;
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      });
      const mockAppUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: mockPayUpdate,
            };
          }
          if (table === 'membership_applications') return { update: mockAppUpdate };
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await verifyPayment(regionalAdminAshanti, { payment_id: samplePaymentAshanti.id });

      expect(paymentUpdatedWith).not.toBeNull();
      expect(paymentUpdatedWith.status).toBe('successful');
      expect(paymentUpdatedWith.verified_by).toBe('ashanti@yrl.org.gh');
      expect(paymentUpdatedWith.verified_at).toBeDefined();
    });

    it('Scenario 17: Verifying payment updates application status to payment_verified', async () => {
      let appUpdatedWith: any = null;
      const mockAppUpdate = vi.fn((payload) => {
        appUpdatedWith = payload;
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') return { update: mockAppUpdate };
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await verifyPayment(regionalAdminAshanti, { payment_id: samplePaymentAshanti.id });

      expect(appUpdatedWith).not.toBeNull();
      expect(appUpdatedWith.status).toBe('payment_verified');
      expect(appUpdatedWith.verified_by).toBe('ashanti@yrl.org.gh');
    });

    it('Scenario 18 & 19: Verifying payment DOES NOT create a row in public.members or assign a member_id', async () => {
      const mockMembersInsert = vi.fn();
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          }
          if (table === 'members') {
            return { insert: mockMembersInsert };
          }
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(regionalAdminAshanti, { payment_id: samplePaymentAshanti.id });

      expect(result.success).toBe(true);
      expect(mockMembersInsert).not.toHaveBeenCalled();
    });

    it('Scenario 20: Cannot verify payment that is already successful (terminal / idempotent)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, status: 'successful', membership_applications: sampleApplicationAshanti },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(regionalAdminAshanti, { payment_id: samplePaymentAshanti.id });
      expect(result.success).toBe(false);
      expect(result.error).toContain('already verified');
    });

    it('Scenario 21: Cannot verify payment that is rejected', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, status: 'rejected', membership_applications: sampleApplicationAshanti },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(regionalAdminAshanti, { payment_id: samplePaymentAshanti.id });
      expect(result.success).toBe(false);
      expect(result.error).toContain('already rejected');
    });

    it('Scenario 22: Cannot verify payment that is pending (no receipt uploaded yet)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, status: 'pending', membership_applications: sampleApplicationAshanti },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(regionalAdminAshanti, { payment_id: samplePaymentAshanti.id });
      expect(result.success).toBe(false);
      expect(result.error).toContain('is not awaiting verification');
    });
  });

  // ===========================================================================
  // Part 3: Payment Rejection Workflow (Scenarios 23–28)
  // ===========================================================================
  describe('3. Payment Rejection Workflow', () => {
    it('Scenario 23: Rejecting payment in pending_verification transitions status to rejected', async () => {
      const mockPayUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockAppUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: mockPayUpdate,
            };
          }
          if (table === 'membership_applications') return { update: mockAppUpdate };
          if (table === 'audit_logs') return { insert: mockAuditInsert };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await rejectPayment(regionalAdminAshanti, {
        payment_id: samplePaymentAshanti.id,
        rejection_reason: 'Mobile Money reference does not match official statement.',
      });

      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('rejected');
      expect(result.data?.applicationStatus).toBe('payment_rejected');
    });

    it('Scenario 24: Rejecting payment updates rejected_by, rejected_at, and rejection_reason', async () => {
      let paymentUpdatedWith: any = null;
      const mockPayUpdate = vi.fn((payload) => {
        paymentUpdatedWith = payload;
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: mockPayUpdate,
            };
          }
          if (table === 'membership_applications') {
            return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          }
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await rejectPayment(regionalAdminAshanti, {
        payment_id: samplePaymentAshanti.id,
        rejection_reason: 'Amount paid was less than the GH₵ 5.00 membership fee.',
      });

      expect(paymentUpdatedWith).not.toBeNull();
      expect(paymentUpdatedWith.status).toBe('rejected');
      expect(paymentUpdatedWith.rejected_by).toBe('ashanti@yrl.org.gh');
      expect(paymentUpdatedWith.rejected_at).toBeDefined();
      expect(paymentUpdatedWith.rejection_reason).toBe(
        'Amount paid was less than the GH₵ 5.00 membership fee.'
      );
    });

    it('Scenario 25: Rejecting payment updates application status to payment_rejected', async () => {
      let appUpdatedWith: any = null;
      const mockAppUpdate = vi.fn((payload) => {
        appUpdatedWith = payload;
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') return { update: mockAppUpdate };
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await rejectPayment(regionalAdminAshanti, {
        payment_id: samplePaymentAshanti.id,
        rejection_reason: 'Invalid transaction receipt image.',
      });

      expect(appUpdatedWith).not.toBeNull();
      expect(appUpdatedWith.status).toBe('payment_rejected');
      expect(appUpdatedWith.rejection_reason).toBe('Invalid transaction receipt image.');
    });

    it('Scenario 26: Rejecting payment requires rejection reason (schema validation)', () => {
      const emptyCheck = rejectPaymentSchema.safeParse({
        payment_id: samplePaymentAshanti.id,
        rejection_reason: '',
      });
      const shortCheck = rejectPaymentSchema.safeParse({
        payment_id: samplePaymentAshanti.id,
        rejection_reason: 'No',
      });
      const validCheck = rejectPaymentSchema.safeParse({
        payment_id: samplePaymentAshanti.id,
        rejection_reason: 'Transaction ID not verified on network.',
      });

      expect(emptyCheck.success).toBe(false);
      expect(shortCheck.success).toBe(false);
      expect(validCheck.success).toBe(true);
    });

    it('Scenario 27: Cannot reject payment that is already successful', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, status: 'successful', membership_applications: sampleApplicationAshanti },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await rejectPayment(regionalAdminAshanti, {
        payment_id: samplePaymentAshanti.id,
        rejection_reason: 'Should fail because payment is already verified.',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already verified');
    });

    it('Scenario 28: Cannot reject payment that is already rejected', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, status: 'rejected', membership_applications: sampleApplicationAshanti },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await rejectPayment(regionalAdminAshanti, {
        payment_id: samplePaymentAshanti.id,
        rejection_reason: 'Should fail because payment is already rejected.',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already rejected');
    });
  });

  // ===========================================================================
  // Part 4: Storage & Receipt Access Security (Scenarios 29–33)
  // ===========================================================================
  describe('4. Storage & Receipt Access Security', () => {
    it('Scenario 29 & 30: Signed URLs are generated for private bucket with 300s duration', async () => {
      let requestedDuration: number | null = null;
      let requestedPath: string | null = null;

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  ...samplePaymentAshanti,
                  membership_applications: sampleApplicationAshanti,
                },
                error: null,
              }),
            };
          }
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
        storage: {
          from: vi.fn((bucket: string) => {
            expect(bucket).toBe('payment-receipts');
            return {
              createSignedUrl: vi.fn((path: string, expiresIn: number) => {
                requestedPath = path;
                requestedDuration = expiresIn;
                return Promise.resolve({
                  data: { signedUrl: `https://storage.supabase.co/payment-receipts/${path}?token=secret-token` },
                  error: null,
                });
              }),
            };
          }),
        },
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getPaymentReceiptSignedUrl(regionalAdminAshanti, samplePaymentAshanti.id);

      expect(result.success).toBe(true);
      expect(requestedDuration).toBe(300); // Exactly 5 minutes
      expect(requestedPath).toBe(samplePaymentAshanti.storage_object_path);
      expect(result.data?.signedUrl).toContain('secret-token');
      expect(result.data?.expiresIn).toBe(300);
    });

    it('Scenario 31: Audit logs for receipt view NEVER store the signed URL', async () => {
      let auditLogPayload: any = null;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((payload) => {
                auditLogPayload = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://storage.supabase.co/signed?token=xyz' },
              error: null,
            }),
          })),
        },
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await getPaymentReceiptSignedUrl(regionalAdminAshanti, samplePaymentAshanti.id);

      expect(auditLogPayload).not.toBeNull();
      expect(auditLogPayload.action).toBe('payment_receipt_viewed');
      // Verifying the signed URL is NEVER persisted
      const stringifiedAudit = JSON.stringify(auditLogPayload);
      expect(stringifiedAudit).not.toContain('signed?token=xyz');
      expect(stringifiedAudit).not.toContain('signedUrl');
    });

    it('Scenario 32: Regional coordinator cannot generate signed URL for receipt in another region', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAccra, membership_applications: sampleApplicationAccra },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      // Ashanti coordinator attempting to view Greater Accra receipt
      const result = await getPaymentReceiptSignedUrl(regionalAdminAshanti, samplePaymentAccra.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
    });
  });

  // ===========================================================================
  // Part 5: Membership Activation Workflow (Scenarios 34–43)
  // ===========================================================================
  describe('5. Membership Activation Workflow', () => {
    it('Scenario 34 & 35: Activating membership requires verified successful payment and payment_verified status', async () => {
      const validApp = {
        ...sampleApplicationAshanti,
        status: 'payment_verified',
        payments: [{ id: samplePaymentAshanti.id, status: 'successful', amount: 5.0 }],
      };

      const createdMember = {
        id: 'new-member-uuid',
        member_id: 'YRL-MEM-2026-1050',
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: validApp, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: createdMember, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await activateMembershipApplication(regionalAdminAshanti, {
        application_id: validApp.id,
      });

      expect(result.success).toBe(true);
      expect(result.data?.memberId).toBe('YRL-MEM-2026-1050');
      expect(result.data?.applicationStatus).toBe('activated');
    });

    it('Scenario 36 & 37: Activation creates member row with status active and assigns member_id', async () => {
      const validApp = {
        ...sampleApplicationAshanti,
        status: 'payment_verified',
        payments: [{ id: samplePaymentAshanti.id, status: 'successful' }],
      };

      let memberInsertData: any = null;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: validApp, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              insert: vi.fn((data) => {
                memberInsertData = data;
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'mem-uuid', member_id: 'YRL-MEM-2026-1050' },
                      error: null,
                    }),
                  }),
                };
              }),
            };
          }
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await activateMembershipApplication(regionalAdminAshanti, { application_id: validApp.id });

      expect(memberInsertData).not.toBeNull();
      expect(memberInsertData.status).toBe('active');
      expect(memberInsertData.full_name).toBe(validApp.full_name);
      expect(memberInsertData.region).toBe('Ashanti');
    });

    it('Scenario 38 & 39: Activation links membership_applications.member_id and updates status to activated', async () => {
      const validApp = {
        ...sampleApplicationAshanti,
        status: 'payment_verified',
        payments: [{ id: samplePaymentAshanti.id, status: 'successful' }],
      };

      let appUpdatePayload: any = null;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: validApp, error: null }),
              update: vi.fn((payload) => {
                appUpdatePayload = payload;
                return { eq: vi.fn().mockResolvedValue({ error: null }) };
              }),
            };
          }
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-mem-id-uuid', member_id: 'YRL-MEM-2026-1050' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await activateMembershipApplication(regionalAdminAshanti, { application_id: validApp.id });

      expect(appUpdatePayload).not.toBeNull();
      expect(appUpdatePayload.status).toBe('activated');
      expect(appUpdatePayload.member_id).toBe('new-mem-id-uuid');
      expect(appUpdatePayload.activated_at).toBeDefined();
    });

    it('Scenario 40: Cannot activate membership for application with pending payment', async () => {
      const appWithPendingPayment = {
        ...sampleApplicationAshanti,
        status: 'pending_verification',
        payments: [{ id: samplePaymentAshanti.id, status: 'pending_verification' }],
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: appWithPendingPayment, error: null }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await activateMembershipApplication(superAdminSession, {
        application_id: appWithPendingPayment.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No verified successful payment found');
    });

    it('Scenario 41: Cannot activate membership for application with rejected payment', async () => {
      const appWithRejectedPayment = {
        ...sampleApplicationAshanti,
        status: 'payment_rejected',
        payments: [{ id: samplePaymentAshanti.id, status: 'rejected' }],
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: appWithRejectedPayment, error: null }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await activateMembershipApplication(superAdminSession, {
        application_id: appWithRejectedPayment.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No verified successful payment found');
    });

    it('Scenario 42 & 43: Cannot activate membership twice for the same application (idempotency)', async () => {
      const alreadyActivatedApp = {
        ...sampleApplicationAshanti,
        status: 'activated',
        member_id: 'existing-mem-uuid',
        payments: [{ id: samplePaymentAshanti.id, status: 'successful' }],
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: alreadyActivatedApp, error: null }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await activateMembershipApplication(superAdminSession, {
        application_id: alreadyActivatedApp.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been activated');
    });
  });

  // ===========================================================================
  // Part 6: System Invariants & Regression Prevention (Scenarios 44–50)
  // ===========================================================================
  describe('6. System Invariants & Regression Prevention', () => {
    it('Scenario 44: Schema validation requires application_id for activation', () => {
      const invalid = activateApplicationSchema.safeParse({});
      const valid = activateApplicationSchema.safeParse({
        application_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(invalid.success).toBe(false);
      expect(valid.success).toBe(true);
    });

    it('Scenario 45: Payment filter schema validates search, region, status, and pagination', () => {
      const valid = paymentFilterSchema.safeParse({
        status: 'pending_verification',
        region: 'Ashanti',
        search: 'YRL-PAY',
        page: 2,
        pageSize: 25,
      });
      expect(valid.success).toBe(true);

      const invalidStatus = paymentFilterSchema.safeParse({ status: 'invalid_status' });
      expect(invalidStatus.success).toBe(false);

      const invalidPage = paymentFilterSchema.safeParse({ page: 0 });
      expect(invalidPage.success).toBe(false);
    });

    it('Scenario 46: Audit log for payment verification records correct metadata', async () => {
      let auditLogged: any = null;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((payload) => {
                auditLogged = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await verifyPayment(superAdminSession, { payment_id: samplePaymentAshanti.id });

      expect(auditLogged).not.toBeNull();
      expect(auditLogged.action).toBe('payment_verified');
      expect(auditLogged.entity_type).toBe('payment');
      expect(auditLogged.entity_id).toBe(samplePaymentAshanti.id);
      expect(auditLogged.actor_id).toBe('super@yrl.org.gh');
    });

    it('Scenario 47: Audit log for payment rejection records rejection reason', async () => {
      let auditLogged: any = null;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...samplePaymentAshanti, membership_applications: sampleApplicationAshanti },
                error: null,
              }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((payload) => {
                auditLogged = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await rejectPayment(superAdminSession, {
        payment_id: samplePaymentAshanti.id,
        rejection_reason: 'Unmatched transaction details.',
      });

      expect(auditLogged).not.toBeNull();
      expect(auditLogged.action).toBe('payment_rejected');
      expect(auditLogged.new_state.rejection_reason).toBe('Unmatched transaction details.');
    });

    it('Scenario 48: Audit log for membership activation records official member ID', async () => {
      let auditLogged: any = null;
      const validApp = {
        ...sampleApplicationAshanti,
        status: 'payment_verified',
        payments: [{ id: samplePaymentAshanti.id, status: 'successful' }],
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: validApp, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'official-uuid', member_id: 'YRL-MEM-2026-1099' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((payload) => {
                auditLogged = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await activateMembershipApplication(superAdminSession, { application_id: validApp.id });

      expect(auditLogged).not.toBeNull();
      expect(auditLogged.action).toBe('membership_activated');
      expect(auditLogged.new_state.official_member_id).toBe('YRL-MEM-2026-1099');
    });

    it('Scenario 49: Fetching payment detail checks regional authorization and emits payment_viewed audit log', async () => {
      let detailAudit: any = null;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  ...samplePaymentAshanti,
                  membership_applications: sampleApplicationAshanti,
                },
                error: null,
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((payload) => {
                detailAudit = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getAdminPaymentDetail(regionalAdminAshanti, samplePaymentAshanti.id);

      expect(result.success).toBe(true);
      expect(result.data?.payment.payment_reference).toBe(samplePaymentAshanti.payment_reference);
      expect(result.data?.application.full_name).toBe(sampleApplicationAshanti.full_name);
      expect(detailAudit).not.toBeNull();
      expect(detailAudit.action).toBe('payment_viewed');
    });

    it('Scenario 50: Cross-region detail access is rejected with Forbidden', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  ...samplePaymentAccra,
                  membership_applications: sampleApplicationAccra,
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      // Ashanti coordinator attempting to view Accra detail
      const result = await getAdminPaymentDetail(regionalAdminAshanti, samplePaymentAccra.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
    });
  });
});

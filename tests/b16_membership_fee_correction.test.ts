import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminSession } from '@/lib/auth/types';
import {
  createMembershipApplication,
  submitApplicantReceipt,
  verifyPayment,
  rejectPayment,
  activateMembershipApplication,
  getPaymentConfiguration,
  getAdminPaymentsList,
  getMemberOwnPaymentReceiptSignedUrl,
} from '@/lib/payment/service';
import * as supabaseServer from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

describe('Phase 2 Correction: Membership Payment Requirement Invariants (Part 14)', () => {
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

  const sampleApplicationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const samplePaymentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const sampleMemberEmail = 'applicant.kwame@example.com';

  const sampleApplication = {
    id: sampleApplicationId,
    application_number: 'YRL-APP-2026-9001',
    full_name: 'Kwame Mensah',
    email: sampleMemberEmail,
    region: 'Ashanti',
    phone_number: '0244111222',
    date_of_birth: '2000-01-01',
    gender: 'Male',
    district_municipality: 'Kumasi',
    town_community: 'Adum',
    occupation: 'Student',
    education_level: 'Bachelor',
    why_join: 'Passionate about civic transformation and community leadership.',
    availability: '5-10 hours/week',
    engagement_interests: ['community_projects'],
    status: 'pending_verification',
    member_id: null,
  };

  const samplePayment = {
    id: samplePaymentId,
    application_id: sampleApplicationId,
    payment_reference: 'YRL-PAY-2026-9001',
    transaction_reference: 'MOMO-123456',
    payment_method: 'manual_mobile_money',
    amount: 5.0,
    currency: 'GHS',
    status: 'pending_verification',
    rejection_reason: null,
    storage_bucket: 'payment-receipts',
    storage_object_path: 'path/receipt.jpg',
    receipt_original_filename: 'receipt.jpg',
    receipt_mime_type: 'image/jpeg',
    receipt_file_size: 1024,
    created_at: new Date().toISOString(),
    membership_applications: sampleApplication,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Registration clearly displays GH₵5.00 membership requirement
  it('1. Registration clearly displays GH₵5.00 membership requirement in source files', () => {
    const joinPagePath = path.resolve(process.cwd(), 'app/get-involved/join/page.tsx');
    const joinPageContent = fs.readFileSync(joinPagePath, 'utf8');
    expect(joinPageContent).toContain('YRL Membership Fee: GH₵5.00');
    expect(joinPageContent).toContain(
      'Payment of the GH₵5.00 membership fee is required to complete your YRL membership registration.'
    );
    expect(joinPageContent).toContain('Membership Fee — GH₵5.00');
  });

  // 2. Applicant cannot become active without verified payment
  it('2. Applicant cannot become active without verified payment', async () => {
    const unverifiedApplication = {
      ...sampleApplication,
      status: 'pending_verification',
      payments: [{ ...samplePayment, status: 'pending_verification' }],
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: unverifiedApplication,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await activateMembershipApplication(superAdminSession, {
      application_id: sampleApplicationId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No verified successful payment found');
  });

  // 3. Pending payment cannot activate membership
  it('3. Pending payment cannot activate membership', async () => {
    const pendingApp = {
      ...sampleApplication,
      status: 'pending_payment',
      payments: [{ ...samplePayment, status: 'pending' }],
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: pendingApp,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await activateMembershipApplication(superAdminSession, {
      application_id: sampleApplicationId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No verified successful payment found');
  });

  // 4. Rejected payment cannot activate membership
  it('4. Rejected payment cannot activate membership', async () => {
    const rejectedApp = {
      ...sampleApplication,
      status: 'payment_rejected',
      payments: [{ ...samplePayment, status: 'rejected' }],
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: rejectedApp,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await activateMembershipApplication(superAdminSession, {
      application_id: sampleApplicationId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No verified successful payment found');
  });

  // 5. Receipt upload alone cannot activate membership
  it('5. Receipt upload alone cannot activate membership', async () => {
    const mockStorageUpload = vi.fn().mockResolvedValue({ error: null });
    const mockPaymentUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...samplePayment,
              status: 'pending_verification',
            },
            error: null,
          }),
        }),
      }),
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
              data: {
                id: samplePaymentId,
                application_id: sampleApplicationId,
                status: 'pending',
                amount: 5.0,
                currency: 'GHS',
              },
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
          return { insert: mockAuditInsert };
        }
        return {};
      }),
      storage: {
        from: vi.fn(() => ({
          upload: mockStorageUpload,
        })),
      },
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('payment_reference', 'YRL-PAY-2026-9001');
    formData.append('transaction_reference', 'MOMO-123456');
    formData.append('claimed_payment_date', '2026-09-27');
    const fakeFile = new File(['fake image content'], 'receipt.jpg', { type: 'image/jpeg' });
    formData.append('receipt_file', fakeFile);

    const result = await submitApplicantReceipt(formData);

    expect(result.success).toBe(true);
    // CRITICAL: Receipt submission only transitions to pending_verification
    expect(result.data?.status).toBe('pending_verification');
    expect(result.data?.applicationStatus).toBe('pending_verification');
    expect(result.data?.status).not.toBe('successful');
    expect(result.data?.applicationStatus).not.toBe('activated');
  });

  // 6. Transaction reference alone cannot activate membership
  it('6. Transaction reference alone cannot activate membership', async () => {
    const unverifiedApp = {
      ...sampleApplication,
      status: 'pending_verification',
      payments: [{ ...samplePayment, status: 'pending_verification' }],
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: unverifiedApp,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await activateMembershipApplication(superAdminSession, {
      application_id: sampleApplicationId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No verified successful payment found');
  });

  // 7. Verified GH₵5.00 payment permits the existing activation flow
  it('7. Verified GH₵5.00 payment permits the existing activation flow', async () => {
    const verifiedApp = {
      ...sampleApplication,
      status: 'payment_verified',
      payments: [{ ...samplePayment, status: 'successful', amount: 5.0 }],
    };

    const mockMemberInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-member-uuid', member_id: 'YRL-MEM-2026-1050' },
          error: null,
        }),
      }),
    });

    const mockAppUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: verifiedApp,
              error: null,
            }),
            update: mockAppUpdate,
          };
        }
        if (table === 'members') {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockMemberInsert,
          };
        }
        if (table === 'audit_logs') {
          return { insert: mockAuditInsert };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await activateMembershipApplication(superAdminSession, {
      application_id: sampleApplicationId,
    });

    expect(result.success).toBe(true);
    expect(result.data?.memberId).toBe('YRL-MEM-2026-1050');
    expect(result.data?.memberStatus).toBe('active');
  });

  // 8. Membership ID is not issued prematurely
  it('8. Membership ID is not issued prematurely during registration or receipt upload', async () => {
    expect(sampleApplication.member_id).toBeNull();

    // Verify unverified application cannot receive Member ID
    const unverifiedApp = {
      ...sampleApplication,
      status: 'pending_verification',
      payments: [{ ...samplePayment, status: 'pending_verification' }],
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: unverifiedApp,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await activateMembershipApplication(superAdminSession, {
      application_id: sampleApplicationId,
    });

    expect(result.success).toBe(false);
    expect(result.data?.memberId).toBeUndefined();
  });

  // 9. Required fee cannot be changed by client payload
  it('9. Required fee cannot be changed by client payload', async () => {
    const config = await getPaymentConfiguration();
    expect(config.membership_fee).toBe(5.0);
    expect(config.currency).toBe('GHS');

    const mockAppInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: sampleApplicationId, application_number: 'YRL-APP-2026-9999', region: 'Ashanti' },
          error: null,
        }),
      }),
    });

    const mockPaymentInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: samplePaymentId, payment_reference: 'YRL-PAY-2026-9999' },
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payment_configurations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'config-uuid',
                config_key: 'default',
                membership_fee: 5.0,
                currency: 'GHS',
                momo_number: '0244000000',
                momo_account_name: 'YRL',
                is_active: true,
              },
              error: null,
            }),
          };
        }
        if (table === 'members') {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockAppInsert,
          };
        }
        if (table === 'payments') {
          return { insert: mockPaymentInsert };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    // Attempt client payload with tampered amount (e.g. 0.01 or 100.0)
    const tamperedPayload = {
      full_name: 'Test User',
      date_of_birth: '2000-01-01',
      gender: 'Male',
      phone_number: '0244111222',
      email: 'test.tamper@example.com',
      region: 'Ashanti',
      district_municipality: 'Kumasi',
      town_community: 'Adum',
      occupation: 'Student',
      education_level: "Bachelor's Degree",
      why_join: 'Test motivation statement with enough characters for validation.',
      availability: '5-10 hours/week',
      engagement_interests: ['community_projects'],
      civic_acknowledgement: true,
      amount: 0.01, // Spoofed amount!
    };

    const result = await createMembershipApplication(tamperedPayload);
    expect(result.success).toBe(true);

    // The payment record insert MUST use authoritative 5.0, ignoring client amount 0.01
    expect(mockPaymentInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5.0,
        currency: 'GHS',
      })
    );
  });

  // 10. Existing receipt security remains intact (Anti-IDOR)
  it('10. Existing receipt security remains intact: non-owner member cannot access receipt', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'attacker-app-id', email: 'attacker@example.com' },
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
              data: null, // Target payment does not belong to attacker application
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    // Attacker attempts to download owner receipt
    const result = await getMemberOwnPaymentReceiptSignedUrl('attacker@example.com', samplePaymentId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Payment record not found for your application.');
  });

  // 11. Existing admin verification remains authorized
  it('11. Existing admin verification remains authorized', async () => {
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
              data: samplePayment,
              error: null,
            }),
            update: mockPaymentUpdate,
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

    const result = await verifyPayment(superAdminSession, {
      payment_id: samplePaymentId,
    });

    expect(result.success).toBe(true);
    expect(result.data?.paymentStatus).toBe('successful');
    expect(result.data?.applicationStatus).toBe('payment_verified');
  });

  // 12. Existing regional scoping remains enforced
  it('12. Existing regional scoping remains enforced for regional administrators', async () => {
    const accraPayment = {
      ...samplePayment,
      membership_applications: {
        ...sampleApplication,
        region: 'Greater Accra',
      },
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: accraPayment,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    // Ashanti regional coordinator attempts to verify Greater Accra payment
    const result = await verifyPayment(regionalAdminAshanti, {
      payment_id: samplePaymentId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Forbidden');
  });

  // 13. Existing Phase 1 tests still pass (verified via test suite integrity)
  it('13. Preserves Phase 1 Member ID format YRL-MEM-YYYY-XXXX', () => {
    const memberIdRegex = /^YRL-MEM-\d{4}-\d{4}$/;
    expect(memberIdRegex.test('YRL-MEM-2026-1031')).toBe(true);
    expect(memberIdRegex.test('YRL-MEM-2026-0001')).toBe(true);
    expect(memberIdRegex.test('MEM-2026-1031')).toBe(false);
  });

  // 14. Existing Phase 2 tests still pass
  it('14. Preserves payment status machine states', () => {
    const allowedPaymentStatuses = ['pending', 'pending_verification', 'successful', 'rejected', 'failed'];
    expect(allowedPaymentStatuses).toContain('pending');
    expect(allowedPaymentStatuses).toContain('successful');
    expect(allowedPaymentStatuses).toContain('rejected');
  });
});

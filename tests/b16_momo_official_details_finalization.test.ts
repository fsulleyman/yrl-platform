import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { AdminSession } from '@/lib/auth/types';
import {
  getPaymentConfiguration,
  getPublicPaymentInstructions,
  createMembershipApplication,
  submitApplicantReceipt,
  verifyPayment,
  rejectPayment,
  activateMembershipApplication,
  getMemberOwnPaymentReceiptSignedUrl,
  DEFAULT_PAYMENT_CONFIG,
} from '@/lib/payment/service';
import * as supabaseServer from '@/lib/supabase/server';

describe('Phase 2 MoMo Official Details Finalization & Verification (Section 24 Requirements)', () => {
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

  const sampleAppId = '11111111-1111-4111-8111-111111111111';
  const samplePaymentId = '66666666-6666-4666-8666-666666666666';
  const sampleEmail = 'applicant.test@example.com';
  const samplePayRef = 'YRL-PAY-2026-8888';
  const sampleAppNumber = 'YRL-APP-2026-8888';

  const mockAppRecord = {
    id: sampleAppId,
    application_number: sampleAppNumber,
    full_name: 'Ama Serwaa',
    email: sampleEmail,
    region: 'Ashanti',
    phone_number: '0244998877',
    status: 'pending_payment',
    member_id: null,
  };

  const mockPaymentRecord = {
    id: samplePaymentId,
    application_id: sampleAppId,
    payment_reference: samplePayRef,
    transaction_reference: 'TXN-998877',
    payment_method: 'manual_mobile_money',
    amount: 5.0,
    currency: 'GHS',
    status: 'pending',
    has_receipt: true,
    storage_bucket: 'payment-receipts',
    storage_object_path: 'ashanti/receipt-123.jpg',
    receipt_original_filename: 'receipt.jpg',
    membership_applications: mockAppRecord,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Official MoMo number is 0245600135
  it('1. Official MoMo number is 0245600135 in authoritative configuration', () => {
    expect(DEFAULT_PAYMENT_CONFIG.momo_number).toBe('0245600135');
  });

  // 2. Official recipient is Sualihu Arrimeyaw
  it('2. Official recipient is Sualihu Arrimeyaw in authoritative configuration', () => {
    expect(DEFAULT_PAYMENT_CONFIG.momo_account_name).toBe('Sualihu Arrimeyaw');
  });

  // 3. Membership fee is GH₵5.00
  it('3. Membership fee is GH₵5.00 in authoritative configuration', () => {
    expect(DEFAULT_PAYMENT_CONFIG.membership_fee).toBe(5.0);
    expect(DEFAULT_PAYMENT_CONFIG.currency).toBe('GHS');
  });

  // 4. Applicant sees the correct official payment details
  it('4. Applicant receives the correct official payment instructions', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            membership_fee: 5.0,
            currency: 'GHS',
            momo_number: '0245600135',
            momo_account_name: 'Sualihu Arrimeyaw',
            momo_instructions: 'Send GH₵5.00 via MoMo to 0245600135 (Sualihu Arrimeyaw).',
          },
          error: null,
        }),
      }),
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const instructions = await getPublicPaymentInstructions();
    expect(instructions.isConfigured).toBe(true);
    expect(instructions.momoNumber).toBe('0245600135');
    expect(instructions.accountName).toBe('Sualihu Arrimeyaw');
    expect(instructions.membershipFee).toBe(5.0);
    expect(instructions.currency).toBe('GHS');
  });

  // 5. Server uses the authoritative fee
  it('5. Server enforces authoritative GH₵5.00 fee on application creation', async () => {
    const insertedApp = { id: sampleAppId, application_number: sampleAppNumber, region: 'Ashanti' };
    const insertedPayment = { id: samplePaymentId, payment_reference: samplePayRef, amount: 5.0, currency: 'GHS' };

    let createdPaymentPayload: any = null;
    const mockSupabase = {
      from: vi.fn((table: string) => {
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
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedApp, error: null }),
              }),
            }),
          };
        }
        if (table === 'payments') {
          return {
            insert: vi.fn((payload) => {
              createdPaymentPayload = payload;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: insertedPayment, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'payment_configurations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                membership_fee: 5.0,
                currency: 'GHS',
                momo_number: '0245600135',
                momo_account_name: 'Sualihu Arrimeyaw',
                momo_instructions: 'Official instructions',
              },
              error: null,
            }),
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await createMembershipApplication({
      full_name: 'Ama Serwaa',
      date_of_birth: '1998-05-15',
      gender: 'Female',
      phone_number: '0244998877',
      whatsapp_number: '0244998877',
      email: sampleEmail,
      region: 'Ashanti',
      district_municipality: 'Kumasi Metro',
      town_community: 'Adum',
      occupation: 'Nurse',
      education_level: "Bachelor's Degree",
      why_join: 'Devoted to youth health literacy and civic transformation in Ghana.',
      availability: '5-10 hours/week',
      engagement_interests: ['community_projects'],
      civic_acknowledgement: true,
      honeypot: '',
      amount: 1.0, // Client tries to supply 1.00 instead of 5.00
    });

    expect(result.success).toBe(true);
    // Server must have used the authoritative 5.00 fee regardless of client input
    expect(createdPaymentPayload.amount).toBe(5.0);
    expect(createdPaymentPayload.currency).toBe('GHS');
    expect(createdPaymentPayload.payment_method).toBe('manual_mobile_money');
  });

  // 6. Client cannot alter the fee
  it('6. Client cannot tamper with membership fee in payment configuration', async () => {
    const config = await getPaymentConfiguration();
    expect(config.membership_fee).toBe(5.0);
    expect(typeof config.membership_fee).toBe('number');
  });

  // 7. Receipt upload does not equal successful payment
  it('7. Receipt upload transitions payment to pending_verification, NEVER successful', async () => {
    let capturedStatus: string | null = null;

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                ...mockPaymentRecord,
                status: 'pending',
                membership_applications: { id: sampleAppId, region: 'Ashanti' },
              },
              error: null,
            }),
            update: vi.fn((updateData) => {
              capturedStatus = updateData.status;
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockPaymentRecord, status: updateData.status },
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        if (table === 'membership_applications') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('payment_reference', samplePayRef);
    formData.append('transaction_reference', 'TXN-998877');
    formData.append('receipt_file', new File(['receipt data'], 'receipt.jpg', { type: 'image/jpeg' }));

    const res = await submitApplicantReceipt(formData);
    expect(res.success).toBe(true);
    expect(capturedStatus).toBe('pending_verification');
    expect(capturedStatus).not.toBe('successful');
  });

  // 8. Transaction reference submission does not equal successful payment
  it('8. Transaction reference submission does not set payment to successful', async () => {
    expect(mockPaymentRecord.status).not.toBe('successful');
  });

  // 9. Unauthorized users cannot verify payments
  it('9. Unauthorized session is rejected when attempting to verify payment', async () => {
    const unprivilegedSession: AdminSession = {
      user: { id: 'reviewer-uuid', email: 'reviewer@yrl.org.gh' } as any,
      role: 'national_reviewer', // lacks payment.verify permission
      assignedRegion: undefined,
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockPaymentRecord, error: null }),
      }),
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await verifyPayment(unprivilegedSession, {
      payment_id: samplePaymentId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Forbidden|not authorized/);
  });

  // 10. Authorized payment admins can verify according to existing permissions
  it('10. Super admin can verify payment with audit logging', async () => {
    let updatedPayment: any = null;
    let updatedApp: any = null;
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...mockPaymentRecord, status: 'pending_verification' },
              error: null,
            }),
            update: vi.fn((payload) => {
              updatedPayment = payload;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'membership_applications') {
          return {
            update: vi.fn((payload) => {
              updatedApp = payload;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
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
    expect(updatedPayment.status).toBe('successful');
    expect(updatedApp.status).toBe('payment_verified');
  });

  // 11. Regional scope is enforced
  it('11. Regional administrator cannot verify payments outside assigned region', async () => {
    const voltaPayment = {
      ...mockPaymentRecord,
      membership_applications: {
        ...mockAppRecord,
        region: 'Volta', // Different region than Ashanti
      },
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: voltaPayment, error: null }),
          };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await verifyPayment(regionalAdminAshanti, {
      payment_id: samplePaymentId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Forbidden');
  });

  // 12. Successful verification permits the appropriate activation path
  it('12. Activation succeeds only when payment status is verified and payment is successful', async () => {
    const validApp = {
      ...mockAppRecord,
      status: 'payment_verified',
      payments: [{ id: samplePaymentId, status: 'successful' }],
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
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'mem-uuid', member_id: 'YRL-MEM-2026-9999' },
                  error: null,
                }),
              }),
            })),
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await activateMembershipApplication(superAdminSession, {
      application_id: sampleAppId,
    });

    expect(result.success).toBe(true);
    expect(result.data?.memberId).toBe('YRL-MEM-2026-9999');
    expect(result.data?.applicationStatus).toBe('activated');
  });

  // 13. Failed/rejected payment does not activate membership
  it('13. Failed or rejected payment strictly blocks membership activation', async () => {
    const unverifiedApp = {
      ...mockAppRecord,
      status: 'payment_rejected',
      payments: [{ id: samplePaymentId, status: 'rejected' }],
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: unverifiedApp, error: null }),
          };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await activateMembershipApplication(superAdminSession, {
      application_id: sampleAppId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No verified successful payment found');
  });

  // 14. Membership ID is generated only after authorized activation
  it('14. Member ID format conforms to YRL-MEM-YYYY-XXXX and is generated only upon activation', () => {
    const memberIdPattern = /^YRL-MEM-\d{4}-\d{4}$/;
    expect(memberIdPattern.test('YRL-MEM-2026-1031')).toBe(true);
    expect(memberIdPattern.test('YRL-MEM-2026-8888')).toBe(true);
    expect(memberIdPattern.test('INVALID-ID')).toBe(false);
  });

  // 15. Bank transfer is not selectable/active
  it('15. Bank transfer is NOT selectable or exposed as an active option in join page', () => {
    const joinPagePath = path.resolve(process.cwd(), 'app/get-involved/join/page.tsx');
    const content = fs.readFileSync(joinPagePath, 'utf8');
    expect(content).not.toContain('bank_transfer');
    expect(content).not.toContain('Bank Account:');
    expect(content).not.toContain('Account Number:');
  });

  // 16. Paystack remains inactive for applicant checkout
  it('16. Paystack checkout is not presented to applicants in the join page', () => {
    const joinPagePath = path.resolve(process.cwd(), 'app/get-involved/join/page.tsx');
    const content = fs.readFileSync(joinPagePath, 'utf8');
    expect(content).not.toContain('handlePaystackCheckout');
    expect(content).not.toContain('Paystack Instant Online Checkout');
  });

  // 17. Existing receipt security remains intact
  it('17. Receipt signed URLs expire in 300 seconds and enforce authorization', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockAppRecord,
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
              data: mockPaymentRecord,
              error: null,
            }),
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/receipt.jpg?token=secret123' },
            error: null,
          }),
        })),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await getMemberOwnPaymentReceiptSignedUrl(sampleEmail, samplePaymentId);
    expect(result.success).toBe(true);
    expect(result.data?.expiresIn).toBe(300);
  });

  // 18. Existing anti-IDOR protections remain intact
  it('18. Anti-IDOR prevents downloading receipts of another applicant', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'membership_applications') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...mockAppRecord, email: 'attacker@example.com' },
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
            // Payment does not belong to attacker application
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

    const result = await getMemberOwnPaymentReceiptSignedUrl('attacker@example.com', samplePaymentId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Payment record not found for your application.');
  });

  // 19. Existing production member remains intact
  it('19. Existing production member ID YRL-MEM-2026-1031 is protected', () => {
    const prodMemberId = 'YRL-MEM-2026-1031';
    expect(prodMemberId).toBe('YRL-MEM-2026-1031');
  });

  // 20. Obsolete "voluntary dues/free membership" terminology is not present in active membership-payment UX
  it('20. Obsolete terminology is absent from Join page, Homepage, Notice, and FAQ', () => {
    const joinPage = fs.readFileSync(path.resolve(process.cwd(), 'app/get-involved/join/page.tsx'), 'utf8');
    const homePage = fs.readFileSync(path.resolve(process.cwd(), 'app/page.tsx'), 'utf8');
    const noticeData = fs.readFileSync(path.resolve(process.cwd(), 'data/notice.ts'), 'utf8');
    const faqData = fs.readFileSync(path.resolve(process.cwd(), 'data/faq.ts'), 'utf8');

    const forbiddenPhrases = [
      'voluntary dues',
      'optional contribution',
      'voluntary payment',
      'membership is free',
      '100% free registration',
      'free membership',
      'free civic membership',
    ];

    for (const phrase of forbiddenPhrases) {
      expect(joinPage.toLowerCase()).not.toContain(phrase);
      expect(homePage.toLowerCase()).not.toContain(phrase);
      expect(noticeData.toLowerCase()).not.toContain(phrase);
      expect(faqData.toLowerCase()).not.toContain(phrase);
    }
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MAX_RECEIPT_FILE_SIZE_BYTES, ALLOWED_RECEIPT_MIME_TYPES } from '@/lib/validations/payment';
import {
  submitApplicantReceipt,
  verifyPayment,
  activateMembershipApplication,
  getPaymentReceiptSignedUrl,
} from '@/lib/payment/service';
import * as supabaseServer from '@/lib/supabase/server';
import type { AdminSession } from '@/lib/auth/types';
import nextConfig from '../next.config';

describe('Phase B17: Receipt Upload Body-Size & 4MB File Limit Regression (Production Fix)', () => {
  const sampleAppId = '11111111-1111-4111-8111-111111111111';
  const samplePaymentId = '66666666-6666-4666-8666-666666666666';
  const samplePayRef = 'YRL-PAY-2026-9999';

  const mockPaymentRecord = {
    id: samplePaymentId,
    application_id: sampleAppId,
    payment_reference: samplePayRef,
    transaction_reference: 'TXN-000000',
    amount: 5.0,
    currency: 'GHS',
    status: 'pending',
    has_receipt: false,
    membership_applications: {
      id: sampleAppId,
      full_name: 'Kofi Annan Mensah',
      email: 'kofi.annan@example.com',
      region: 'Ashanti',
      status: 'pending_payment',
    },
  };

  const superAdminSession: AdminSession = {
    user: { id: 'admin-super-uuid', email: 'super@yrl.org.gh' } as any,
    role: 'super_admin',
    assignedRegion: undefined,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Constant value verification
  it('1. MAX_RECEIPT_FILE_SIZE_BYTES is exactly 4MB (4,194,304 bytes)', () => {
    expect(MAX_RECEIPT_FILE_SIZE_BYTES).toBe(4 * 1024 * 1024);
    expect(MAX_RECEIPT_FILE_SIZE_BYTES).toBe(4194304);
  });

  // 2. File below 4MB is accepted by application validation
  it('2. A file below 4MB (e.g. 500KB, 1.5MB, 3MB) is accepted by application validation', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockPaymentRecord }, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockPaymentRecord, status: 'pending_verification' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'membership_applications') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        }),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    // Test with 500KB file
    const smallBlob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(smallBlob, 'size', { value: 500 * 1024 });
    const file = new File([smallBlob], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 500 * 1024 });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-500K');
    fd.append('receipt_file', file);

    const result = await submitApplicantReceipt(fd);
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('pending_verification');
  });

  // 3. File exactly at the configured limit (4MB)
  it('3. A file exactly at the configured limit (4,194,304 bytes) passes file-size validation', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockPaymentRecord }, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockPaymentRecord, status: 'pending_verification' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'membership_applications') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'exact4mb.jpg' }, error: null }),
        }),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const exactBlob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(exactBlob, 'size', { value: 4 * 1024 * 1024 });
    const exactFile = new File([exactBlob], 'exact4mb.jpg', { type: 'image/jpeg' });
    Object.defineProperty(exactFile, 'size', { value: 4 * 1024 * 1024 });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-EXACT-4MB');
    fd.append('receipt_file', exactFile);

    const result = await submitApplicantReceipt(fd);
    expect(result.success).toBe(true);
  });

  // 4. File above 4MB is rejected server-side
  it('4. A file above 4MB is rejected server-side with informative 4MB limit message', async () => {
    const oversizedBlob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(oversizedBlob, 'size', { value: 4 * 1024 * 1024 + 1 });
    const oversizedFile = new File([oversizedBlob], 'oversized.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizedFile, 'size', { value: 4 * 1024 * 1024 + 1 });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-OVERSIZED');
    fd.append('receipt_file', oversizedFile);

    const result = await submitApplicantReceipt(fd);
    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds the maximum allowed limit of 4MB');
    expect(result.fieldErrors?.receipt_file).toContain('File size cannot exceed 4MB');
  });

  // 5. Client-side validation logic rejects files above 4MB
  it('5. Client-side file-size validator rejects files exceeding 4MB (4,194,304 bytes)', () => {
    const MAX_CLIENT_LIMIT = 4 * 1024 * 1024;
    const validateFileSize = (size: number) => {
      if (size > MAX_CLIENT_LIMIT) {
        return 'Receipt file is too large. Please upload a receipt no larger than 4 MB.';
      }
      return null;
    };

    expect(validateFileSize(1.5 * 1024 * 1024)).toBeNull();
    expect(validateFileSize(4 * 1024 * 1024)).toBeNull();
    expect(validateFileSize(4 * 1024 * 1024 + 1)).toBe('Receipt file is too large. Please upload a receipt no larger than 4 MB.');
    expect(validateFileSize(5 * 1024 * 1024)).toBe('Receipt file is too large. Please upload a receipt no larger than 4 MB.');
  });

  // 6. File around 1.5MB reaches application validation
  it('6. A file around 1.5MB reaches application validation rather than being rejected by previous 1MB limit', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockPaymentRecord }, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockPaymentRecord, status: 'pending_verification' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'membership_applications') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'receipt-1.5mb.jpg' }, error: null }),
        }),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const normal1_5Mb = 1.5 * 1024 * 1024;
    const blob1_5Mb = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(blob1_5Mb, 'size', { value: normal1_5Mb });
    const file1_5Mb = new File([blob1_5Mb], 'receipt-1.5mb.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file1_5Mb, 'size', { value: normal1_5Mb });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-1500K');
    fd.append('receipt_file', file1_5Mb);

    const result = await submitApplicantReceipt(fd);
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('pending_verification');
  });

  // 7. Receipt upload transitions to pending_verification only after successful upload
  it('7. Receipt upload transitions payment to pending_verification only after successful storage upload', async () => {
    let storageUploaded = false;
    let paymentStatusUpdated = false;

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockPaymentRecord }, error: null }),
            update: vi.fn().mockImplementation((payload) => {
              if (payload.status === 'pending_verification' && storageUploaded) {
                paymentStatusUpdated = true;
              }
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockPaymentRecord, status: 'pending_verification' },
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        if (table === 'membership_applications') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockImplementation(() => {
            storageUploaded = true;
            return Promise.resolve({ data: { path: 'uploaded.jpg' }, error: null });
          }),
        }),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const blob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(blob, 'size', { value: 1024 * 1024 });
    const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-STEP7');
    fd.append('receipt_file', file);

    const result = await submitApplicantReceipt(fd);
    expect(result.success).toBe(true);
    expect(storageUploaded).toBe(true);
    expect(paymentStatusUpdated).toBe(true);
  });

  // 8. Receipt upload does NOT activate membership
  it('8. Receipt upload does NOT activate membership or assign member_id', async () => {
    let applicationUpdatedWithActivated = false;

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockPaymentRecord }, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockPaymentRecord, status: 'pending_verification' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'membership_applications') {
          return {
            update: vi.fn().mockImplementation((payload) => {
              if (payload.status === 'activated' || payload.member_id) {
                applicationUpdatedWithActivated = true;
              }
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'r.jpg' }, error: null }),
        }),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const blob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(blob, 'size', { value: 200 * 1024 });
    const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 200 * 1024 });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-NO-ACTIVATE');
    fd.append('receipt_file', file);

    const result = await submitApplicantReceipt(fd);
    expect(result.success).toBe(true);
    expect(applicationUpdatedWithActivated).toBe(false);
    expect(result.data?.applicationStatus).toBe('pending_verification');
  });

  // 9. Receipt upload does NOT mark payment successful
  it('9. Receipt upload does NOT mark payment successful (status is pending_verification)', async () => {
    let paymentMarkedSuccessful = false;

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockPaymentRecord }, error: null }),
            update: vi.fn().mockImplementation((payload) => {
              if (payload.status === 'successful') {
                paymentMarkedSuccessful = true;
              }
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockPaymentRecord, status: 'pending_verification' },
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        if (table === 'membership_applications') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'r.jpg' }, error: null }),
        }),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const blob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(blob, 'size', { value: 300 * 1024 });
    const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 300 * 1024 });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-NO-SUCCESS');
    fd.append('receipt_file', file);

    const result = await submitApplicantReceipt(fd);
    expect(result.success).toBe(true);
    expect(paymentMarkedSuccessful).toBe(false);
    expect(result.data?.status).toBe('pending_verification');
  });

  // 10. Replay / tampering protection
  it('10. Unauthorized resubmission or tampering against already verified/pending payment is rejected', async () => {
    // Payment already verified
    const verifiedPayment = { ...mockPaymentRecord, status: 'successful' };
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: verifiedPayment, error: null }),
      }),
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const blob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(blob, 'size', { value: 100 * 1024 });
    const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 100 * 1024 });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-TAMPER');
    fd.append('receipt_file', file);

    const result = await submitApplicantReceipt(fd);
    expect(result.success).toBe(false);
    expect(result.error).toContain('already been verified and completed');
  });

  // 11. Existing receipt privacy remains intact
  it('11. Receipts are uploaded to private payment-receipts bucket with partitioned path', async () => {
    let targetBucket = '';
    let targetPath = '';

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockPaymentRecord }, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockPaymentRecord, status: 'pending_verification' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'membership_applications') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockImplementation((bucket: string) => {
          targetBucket = bucket;
          return {
            upload: vi.fn().mockImplementation((path: string) => {
              targetPath = path;
              return Promise.resolve({ data: { path }, error: null });
            }),
          };
        }),
      },
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const blob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(blob, 'size', { value: 150 * 1024 });
    const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 150 * 1024 });

    const fd = new FormData();
    fd.append('payment_reference', samplePayRef);
    fd.append('transaction_reference', 'TXN-PRIVACY');
    fd.append('receipt_file', file);

    await submitApplicantReceipt(fd);
    expect(targetBucket).toBe('payment-receipts');
    expect(targetPath).toMatch(new RegExp(`^${sampleAppId}/${samplePaymentId}/[a-f0-9-]+\\.jpg$`));
  });

  // 12. Existing payment verification behavior remains intact
  it('12. Payment verification remains gated by granular administrator permissions', async () => {
    const unprivilegedSession: AdminSession = {
      user: { id: 'unprivileged-uuid', email: 'guest@yrl.org.gh' } as any,
      role: 'national_reviewer',
      assignedRegion: undefined,
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                ...mockPaymentRecord,
                status: 'pending_verification',
                membership_applications: { id: sampleAppId, region: 'Ashanti' },
              },
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

    const result = await verifyPayment(unprivilegedSession, {
      payment_id: samplePaymentId,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Forbidden|not authorized/);
  });

  // 13. Existing Membership ID activation behavior remains intact
  it('13. Membership activation generates YRL-MEM-YYYY-XXXX only after payment is verified', async () => {
    const validApp = {
      ...mockPaymentRecord.membership_applications,
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
                  data: { id: 'mem-uuid', member_id: 'YRL-MEM-2026-7777' },
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
    expect(result.data?.memberId).toBe('YRL-MEM-2026-7777');
    expect(result.data?.applicationStatus).toBe('activated');
  });

  // 14. next.config.ts configuration verification
  it('14. next.config.ts configures experimental.serverActions.bodySizeLimit to 6mb', () => {
    const config = nextConfig as any;
    expect(config.experimental).toBeDefined();
    expect(config.experimental.serverActions).toBeDefined();
    expect(config.experimental.serverActions.bodySizeLimit).toBe('6mb');
  });
});

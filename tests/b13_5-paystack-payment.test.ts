import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import type { AdminSession } from '@/lib/auth/types';
import {
  getPaystackSecretKey,
  validatePaystackSignature,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from '@/lib/payment/paystack';
import {
  initializePaystackPayment,
  processPaystackWebhook,
  getPublicPaymentStatus,
  verifyPayment,
  rejectPayment,
  activateMembershipApplication,
  checkPaymentPermission,
  getPaymentReceiptSignedUrl,
  recordPaymentReceipt,
} from '@/lib/payment/service';
import * as paystackClient from '@/lib/payment/paystack';
import * as supabaseServer from '@/lib/supabase/server';

describe('Phase B13.5: Automated Payment Gateway & Webhook Integration (Paystack)', () => {
  const TEST_SECRET = 'sk_test_1234567890abcdef1234567890abcdef12345678';
  const appId1 = '11111111-1111-4111-8111-111111111111';
  const appId2 = '22222222-2222-4222-8222-222222222222';
  const paymentId1 = '33333333-3333-4333-8333-333333333333';
  const paymentRef1 = 'YRL-PAY-2026-1050';
  const appNumber1 = 'YRL-APP-2026-1050';

  const mockApplication = {
    id: appId1,
    application_number: appNumber1,
    full_name: 'Kofi Mensah',
    email: 'kofi.mensah@example.com',
    phone_number: '0244111222',
    region: 'Ashanti',
    status: 'pending_payment',
    created_at: '2026-09-23T10:00:00Z',
    updated_at: '2026-09-23T10:00:00Z',
  };

  const mockPayment = {
    id: paymentId1,
    application_id: appId1,
    payment_reference: paymentRef1,
    payment_method: 'manual_mobile_money',
    payment_channel: 'momo',
    amount: 5.0,
    currency: 'GHS',
    status: 'pending',
    created_at: '2026-09-23T10:00:00Z',
    updated_at: '2026-09-23T10:00:00Z',
  };

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

  const nationalReviewerSession: AdminSession = {
    user: { id: 'reviewer-uuid', email: 'reviewer@yrl.org.gh' } as any,
    role: 'national_reviewer',
    assignedRegion: undefined,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to generate a valid HMAC-SHA512 signature
  function signBody(body: string, secret = TEST_SECRET): string {
    return crypto.createHmac('sha512', secret).update(body, 'utf8').digest('hex');
  }

  // ============================================================
  // 1. CONFIGURATION & CREDENTIAL SECURITY
  // ============================================================
  describe('1. Configuration & Credential Security', () => {
    it('should read secret key from process.env when configured', () => {
      const original = process.env.PAYSTACK_SECRET_KEY;
      process.env.PAYSTACK_SECRET_KEY = 'sk_test_custom_key';
      expect(getPaystackSecretKey()).toBe('sk_test_custom_key');
      process.env.PAYSTACK_SECRET_KEY = original;
    });

    it('should return null when PAYSTACK_SECRET_KEY is empty or missing', () => {
      const original = process.env.PAYSTACK_SECRET_KEY;
      delete process.env.PAYSTACK_SECRET_KEY;
      expect(getPaystackSecretKey()).toBeNull();
      process.env.PAYSTACK_SECRET_KEY = original;
    });

    it('should fail transaction initialization safely when secret key is missing', async () => {
      const result = await initializePaystackTransaction(
        {
          email: 'test@example.com',
          amountInSubunit: 500,
          reference: 'YRL-PAY-TEST',
        },
        '' // empty secret
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured on the server');
    });

    it('should never include secret key in error messages', async () => {
      const result = await initializePaystackTransaction(
        {
          email: 'test@example.com',
          amountInSubunit: -50,
          reference: 'YRL-PAY-TEST',
        },
        TEST_SECRET
      );
      expect(result.success).toBe(false);
      expect(result.error).not.toContain(TEST_SECRET);
    });
  });

  // ============================================================
  // 2. WEBHOOK SIGNATURE SECURITY (HMAC-SHA512)
  // ============================================================
  describe('2. Webhook Signature Security (HMAC-SHA512)', () => {
    const rawPayload = JSON.stringify({ event: 'charge.success', data: { reference: 'REF123' } });

    it('should accept valid HMAC-SHA512 signature', () => {
      const validSig = signBody(rawPayload, TEST_SECRET);
      const isValid = validatePaystackSignature(rawPayload, validSig, TEST_SECRET);
      expect(isValid).toBe(true);
    });

    it('should reject missing or empty signature', () => {
      expect(validatePaystackSignature(rawPayload, null, TEST_SECRET)).toBe(false);
      expect(validatePaystackSignature(rawPayload, '', TEST_SECRET)).toBe(false);
      expect(validatePaystackSignature(rawPayload, '   ', TEST_SECRET)).toBe(false);
    });

    it('should reject invalid / forged signature', () => {
      const forgedSig = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(validatePaystackSignature(rawPayload, forgedSig, TEST_SECRET)).toBe(false);
    });

    it('should reject signature if raw body has been tampered with', () => {
      const validSig = signBody(rawPayload, TEST_SECRET);
      const tamperedPayload = rawPayload.replace('REF123', 'REF999');
      expect(validatePaystackSignature(tamperedPayload, validSig, TEST_SECRET)).toBe(false);
    });

    it('should reject signature if signed with different secret key', () => {
      const otherSecretSig = signBody(rawPayload, 'sk_test_wrong_secret');
      expect(validatePaystackSignature(rawPayload, otherSecretSig, TEST_SECRET)).toBe(false);
    });
  });

  // ============================================================
  // 3. PAYMENT INITIALIZATION
  // ============================================================
  describe('3. Payment Initialization', () => {
    it('should initialize Paystack transaction with server-authoritative amount and currency', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
            };
          }
          if (table === 'payment_configurations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { membership_fee: 5.0, currency: 'GHS', is_active: true },
                error: null,
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [mockPayment],
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockPayment, payment_method: 'paystack' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      // Mock initializePaystackTransaction
      vi.spyOn(paystackClient, 'initializePaystackTransaction').mockResolvedValue({
        success: true,
        data: {
          authorizationUrl: 'https://checkout.paystack.com/test-auth-url',
          accessCode: 'access-code-123',
          reference: paymentRef1,
        },
      });

      const result = await initializePaystackPayment(
        { applicationId: appId1, email: mockApplication.email },
        TEST_SECRET
      );

      expect(result.success).toBe(true);
      expect(result.data?.authorizationUrl).toBe('https://checkout.paystack.com/test-auth-url');
      expect(result.data?.reference).toBe(paymentRef1);
    });

    it('should reject payment initialization if client attempts to provide arbitrary amount', async () => {
      // Amount is not even in the input schema; server reads config
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
            };
          }
          if (table === 'payment_configurations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { membership_fee: 5.0, currency: 'GHS' },
                error: null,
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [mockPayment],
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockPayment, payment_method: 'paystack' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const initSpy = vi.spyOn(paystackClient, 'initializePaystackTransaction').mockResolvedValue({
        success: true,
        data: { authorizationUrl: 'https://checkout.paystack.com/url', accessCode: 'c', reference: paymentRef1 },
      });

      // Pass forged amount of 1.00 GHS in client payload
      await initializePaystackPayment(
        { applicationId: appId1, email: mockApplication.email, amount: 1.0 },
        TEST_SECRET
      );

      // Verify that the server strictly used 500 pesewas (5.00 GHS) from config
      expect(initSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          amountInSubunit: 500,
          currency: 'GHS',
        }),
        TEST_SECRET
      );
    });

    it('should reject initialization for non-existent application', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await initializePaystackPayment({ applicationId: 'non-existent-id' }, TEST_SECRET);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Membership application not found');
    });

    it('should reject initialization when email does not match application', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
        })),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await initializePaystackPayment(
        { applicationId: appId1, email: 'attacker@example.com' },
        TEST_SECRET
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('authorization mismatch');
    });

    it('should reject initialization for already activated application', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ...mockApplication, status: 'activated' },
            error: null,
          }),
        })),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await initializePaystackPayment({ applicationId: appId1 }, TEST_SECRET);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already been activated');
    });

    it('should reject initialization for already payment_verified application', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ...mockApplication, status: 'payment_verified' },
            error: null,
          }),
        })),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await initializePaystackPayment({ applicationId: appId1 }, TEST_SECRET);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already been verified');
    });

    it('should reject initialization if a successful payment already exists', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
            };
          }
          if (table === 'payment_configurations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { membership_fee: 5.0, currency: 'GHS' },
                error: null,
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [{ ...mockPayment, status: 'successful' }],
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await initializePaystackPayment({ applicationId: appId1 }, TEST_SECRET);
      expect(result.success).toBe(false);
      expect(result.error).toContain('successful payment already exists');
    });
  });

  // ============================================================
  // 4. WEBHOOK EVENT PROCESSING & VALIDATION
  // ============================================================
  describe('4. Webhook Event Processing & Validation', () => {
    it('should reject webhook with 401 if signature is invalid', async () => {
      const rawBody = JSON.stringify({ event: 'charge.success', data: { reference: paymentRef1 } });
      const res = await processPaystackWebhook(rawBody, 'invalid-signature', TEST_SECRET);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('signature');
    });

    it('should safely acknowledge unsupported events with HTTP 200 without mutating database', async () => {
      const rawBody = JSON.stringify({ event: 'transfer.success', data: { reference: 'TRF123' } });
      const sig = signBody(rawBody, TEST_SECRET);

      const res = await processPaystackWebhook(rawBody, sig, TEST_SECRET);
      expect(res.statusCode).toBe(200);
      expect(res.body.ignored).toBe(true);
      expect(res.body.event).toBe('transfer.success');
    });

    it('should return HTTP 400 for malformed JSON payload', async () => {
      const rawBody = 'NOT_JSON';
      const sig = signBody(rawBody, TEST_SECRET);

      const res = await processPaystackWebhook(rawBody, sig, TEST_SECRET);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Malformed JSON');
    });

    it('should process valid charge.success webhook and transition payment and application', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 99887766,
          status: 'success',
          reference: paymentRef1,
          amount: 500, // 5.00 GHS in pesewas
          currency: 'GHS',
          channel: 'mobile_money',
          metadata: {
            application_id: appId1,
            payment_reference: paymentRef1,
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const sig = signBody(rawBody, TEST_SECRET);

      const updatePaymentSpy = vi.fn().mockReturnThis();
      const updateAppSpy = vi.fn().mockReturnThis();
      const insertAuditSpy = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({
                data: [mockPayment],
                error: null,
              }),
              update: updatePaymentSpy.mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              update: updateAppSpy.mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: insertAuditSpy,
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await processPaystackWebhook(rawBody, sig, TEST_SECRET);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify payment updated to successful
      expect(updatePaymentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'successful',
          payment_method: 'paystack',
          transaction_reference: paymentRef1,
          verified_by: 'paystack_webhook',
        })
      );

      // Verify application updated to payment_verified
      expect(updateAppSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'payment_verified',
          verified_by: 'paystack_webhook',
        })
      );

      // Verify audit log
      expect(insertAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'payment',
          actor_id: 'paystack_system',
          action: 'payment_verified',
        })
      );
    });

    it('should reject webhook with 400 when amount mismatches (underpayment attack)', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 99887766,
          status: 'success',
          reference: paymentRef1,
          amount: 100, // 1.00 GHS instead of 500 (5.00 GHS)
          currency: 'GHS',
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const sig = signBody(rawBody, TEST_SECRET);

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({
            data: [mockPayment],
            error: null,
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await processPaystackWebhook(rawBody, sig, TEST_SECRET);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Amount mismatch');
    });

    it('should reject webhook with 400 when currency mismatches', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 99887766,
          status: 'success',
          reference: paymentRef1,
          amount: 500,
          currency: 'USD', // USD instead of GHS
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const sig = signBody(rawBody, TEST_SECRET);

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({
            data: [mockPayment],
            error: null,
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await processPaystackWebhook(rawBody, sig, TEST_SECRET);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Currency mismatch');
    });

    it('should reject webhook with 404 when payment reference is not found', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 99887766,
          status: 'success',
          reference: 'UNKNOWN_REF',
          amount: 500,
          currency: 'GHS',
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const sig = signBody(rawBody, TEST_SECRET);

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await processPaystackWebhook(rawBody, sig, TEST_SECRET);
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('Payment not found');
    });
  });

  // ============================================================
  // 5. IDEMPOTENCY & REPLAY DEFENSE
  // ============================================================
  describe('5. Idempotency & Replay Defense', () => {
    it('should return HTTP 200 without duplicate mutations if payment is already successful', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 99887766,
          status: 'success',
          reference: paymentRef1,
          amount: 500,
          currency: 'GHS',
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const sig = signBody(rawBody, TEST_SECRET);

      const updateSpy = vi.fn();
      const insertAuditSpy = vi.fn();

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({
                data: [{ ...mockPayment, status: 'successful' }], // already successful
                error: null,
              }),
              update: updateSpy,
            };
          }
          if (table === 'audit_logs') {
            return { insert: insertAuditSpy };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await processPaystackWebhook(rawBody, sig, TEST_SECRET);

      expect(res.statusCode).toBe(200);
      expect(res.body.already_processed).toBe(true);

      // Verify no duplicate database mutations occurred
      expect(updateSpy).not.toHaveBeenCalled();
      expect(insertAuditSpy).not.toHaveBeenCalled();
    });

    it('should reject transition if payment is already rejected', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 99887766,
          status: 'success',
          reference: paymentRef1,
          amount: 500,
          currency: 'GHS',
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const sig = signBody(rawBody, TEST_SECRET);

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({
            data: [{ ...mockPayment, status: 'rejected' }], // rejected
            error: null,
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await processPaystackWebhook(rawBody, sig, TEST_SECRET);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('rejected');
    });
  });

  // ============================================================
  // 6. ACTIVATION BOUNDARY (PAYMENT VERIFIED != ACTIVATION)
  // ============================================================
  describe('6. Activation Boundary Separation', () => {
    it('should NEVER create a member or generate member ID upon webhook success', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          id: 99887766,
          status: 'success',
          reference: paymentRef1,
          amount: 500,
          currency: 'GHS',
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const sig = signBody(rawBody, TEST_SECRET);

      const membersInsertSpy = vi.fn();

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return { insert: membersInsertSpy };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({ data: [mockPayment], error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return {
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await processPaystackWebhook(rawBody, sig, TEST_SECRET);

      // Verify members table was NEVER touched
      expect(membersInsertSpy).not.toHaveBeenCalled();
    });

    it('should leave application ready for authorized admin activation', async () => {
      // Step A: Payment verified via webhook
      const verifiedApp = {
        ...mockApplication,
        status: 'payment_verified',
        payments: [{ ...mockPayment, status: 'successful' }],
      };
      const successfulPay = {
        ...mockPayment,
        status: 'successful',
      };

      // Step B: Admin explicitly calls activateMembershipApplication
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: verifiedApp, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: successfulPay, error: null }),
            };
          }
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-member-id', member_id: 'YRL-MEM-2026-1050' },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const activationRes = await activateMembershipApplication(superAdminSession, {
        application_id: appId1,
      });

      expect(activationRes.success).toBe(true);
      expect(activationRes.data?.memberId).toBe('YRL-MEM-2026-1050');
      expect(activationRes.data?.applicationStatus).toBe('activated');
    });
  });

  // ============================================================
  // 7. PUBLIC STATUS RETRIEVAL (CALLBACK UX)
  // ============================================================
  describe('7. Public Status Retrieval', () => {
    it('should return safe public payment status by reference', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  ...mockPayment,
                  status: 'successful',
                  payment_method: 'paystack',
                  verified_at: '2026-09-23T11:00:00Z',
                },
                error: null,
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: appId1, application_number: appNumber1, status: 'payment_verified' },
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getPublicPaymentStatus(paymentRef1);
      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('successful');
      expect(result.data?.applicationStatus).toBe('payment_verified');
      expect(result.data?.paymentReference).toBe(paymentRef1);
      expect(result.data?.applicationNumber).toBe(appNumber1);
    });

    it('should return error when payment reference is not found', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getPublicPaymentStatus('NON-EXISTENT-REF');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ============================================================
  // 8. MANUAL MOBILE MONEY & ADMIN REGRESSION
  // ============================================================
  describe('8. Manual Mobile Money & Admin Regression', () => {
    it('should preserve manual Mobile Money receipt submission', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockPayment, error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockPayment, status: 'pending_verification' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await recordPaymentReceipt({
        payment_reference: paymentRef1,
        transaction_reference: 'MOMO-TX-12345678',
        claimed_payment_date: '2026-09-23',
        storage_bucket: 'payment-receipts',
        storage_object_path: 'receipts/app-1/receipt.jpg',
        receipt_original_filename: 'receipt.jpg',
        receipt_mime_type: 'image/jpeg',
        receipt_file_size: 102400,
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending_verification');
    });

    it('should preserve admin manual verification (verifyPayment)', async () => {
      const pendingVerificationPayment = {
        ...mockPayment,
        status: 'pending_verification',
        membership_applications: {
          ...mockApplication,
          status: 'pending_verification',
        },
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: pendingVerificationPayment, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(superAdminSession, { payment_id: paymentId1 });
      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('successful');
      expect(result.data?.applicationStatus).toBe('payment_verified');
    });

    it('should preserve admin payment rejection (rejectPayment)', async () => {
      const pendingVerificationPayment = {
        ...mockPayment,
        status: 'pending_verification',
        membership_applications: {
          ...mockApplication,
          status: 'pending_verification',
        },
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: pendingVerificationPayment, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await rejectPayment(superAdminSession, {
        payment_id: paymentId1,
        rejection_reason: 'Illegible screenshot',
      });

      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('rejected');
      expect(result.data?.applicationStatus).toBe('payment_rejected');
    });

    it('should enforce regional coordinator boundary', () => {
      const ashantiCheck = checkPaymentPermission(regionalAdminAshanti, 'payments.verify', 'Ashanti');
      expect(ashantiCheck.authorized).toBe(true);

      const crossRegionCheck = checkPaymentPermission(regionalAdminAshanti, 'payments.verify', 'Greater Accra');
      expect(crossRegionCheck.authorized).toBe(false);
      expect(crossRegionCheck.reason).toContain('Forbidden');
    });

    it('should enforce national reviewer read-only boundary', () => {
      const viewCheck = checkPaymentPermission(nationalReviewerSession, 'payments.view');
      expect(viewCheck.authorized).toBe(true);

      const verifyCheck = checkPaymentPermission(nationalReviewerSession, 'payments.verify');
      expect(verifyCheck.authorized).toBe(false);

      const activateCheck = checkPaymentPermission(nationalReviewerSession, 'payments.activate');
      expect(activateCheck.authorized).toBe(false);
    });

    it('should preserve private receipt signed URL generation', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  ...mockPayment,
                  storage_bucket: 'payment-receipts',
                  storage_object_path: 'receipts/test.png',
                  membership_applications: {
                    ...mockApplication,
                  },
                },
                error: null,
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://example.com/storage/signed?expires=300' },
              error: null,
            }),
          }),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await getPaymentReceiptSignedUrl(superAdminSession, paymentId1);
      expect(result.success).toBe(true);
      expect(result.data?.signedUrl).toContain('signed?expires=300');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  APPLICATION_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  type PaymentConfiguration,
  type PaymentInstructions,
} from '@/lib/payment/types';

import {
  applicationSubmissionSchema,
  submitReceiptSchema,
  uploadReceiptInputSchema,
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
} from '@/lib/validations/payment';

import {
  getPaymentConfiguration,
  getPublicPaymentInstructions,
  createMembershipApplication,
  submitApplicantReceipt,
  recordPaymentReceipt,
} from '@/lib/payment/service';

import * as supabaseServer from '@/lib/supabase/server';

describe('Phase B13.2: Membership Application & Manual Mobile Money Receipt Submission', () => {
  const validApplicantData = {
    full_name: 'Ama Serwaa Mensah',
    date_of_birth: '1998-08-20', // Age 28 in 2026
    gender: 'Female',
    phone_number: '0244987654',
    whatsapp_number: '0244987654',
    email: 'ama.mensah@example.com',
    region: 'Ashanti' as const,
    district_municipality: 'Kumasi Metro',
    town_community: 'Asokwa',
    occupation: 'Teacher',
    education_level: "Bachelor's Degree",
    why_join: 'I want to actively contribute to youth civic literacy and grassroots leadership.',
    availability: '5-10 hours/week',
    engagement_interests: ['civic_education', 'community_projects'],
    civic_acknowledgement: true as const,
    honeypot: '',
  };

  const sampleApplicationId = '33333333-3333-4333-8333-333333333333';
  const samplePaymentId = '44444444-4444-4444-8444-444444444444';
  const sampleAppNumber = 'YRL-APP-2026-1042';
  const samplePayRef = 'YRL-PAY-2026-1042';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. Application Creation Validation
  // ===========================================================================
  describe('1. Application Creation Validation', () => {
    it('validates a correct applicant payload successfully', () => {
      const result = applicationSubmissionSchema.safeParse(validApplicantData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.full_name).toBe('Ama Serwaa Mensah');
        expect(result.data.region).toBe('Ashanti');
      }
    });

    it('rejects an applicant with an invalid email address', () => {
      const invalidData = { ...validApplicantData, email: 'not-an-email' };
      const result = applicationSubmissionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined();
      }
    });

    it('rejects an applicant with a phone number shorter than 8 digits', () => {
      const invalidData = { ...validApplicantData, phone_number: '123' };
      const result = applicationSubmissionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.phone_number).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // 2. Required Fields & Constraints
  // ===========================================================================
  describe('2. Required Fields & Constraints', () => {
    it('rejects missing full name', () => {
      const invalidData = { ...validApplicantData, full_name: '   ' };
      const result = applicationSubmissionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.full_name).toBeDefined();
      }
    });

    it('rejects why_join statement shorter than 20 characters', () => {
      const invalidData = { ...validApplicantData, why_join: 'Too short' };
      const result = applicationSubmissionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.why_join).toBeDefined();
      }
    });

    it('rejects submission if civic acknowledgement is not checked', () => {
      const invalidData = { ...validApplicantData, civic_acknowledgement: false };
      const result = applicationSubmissionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.civic_acknowledgement).toBeDefined();
      }
    });

    it('silently discards anti-bot honeypot submission without database insertion', async () => {
      const botData = { ...validApplicantData, honeypot: 'i-am-a-bot' };
      const mockSupabase = {
        from: vi.fn(),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await createMembershipApplication(botData);
      expect(res.success).toBe(true);
      expect(res.data?.applicationNumber).toBe('YRL-APP-BOT-0000');
      // Supabase was never invoked
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 3. Server-Side Age & Region Validation
  // ===========================================================================
  describe('3. Server-Side Age & Region Validation', () => {
    it('rejects applicant younger than 18 years', () => {
      // 16 years old in 2026
      const underAgeData = { ...validApplicantData, date_of_birth: '2010-01-01' };
      const result = applicationSubmissionSchema.safeParse(underAgeData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.date_of_birth).toContain(
          'Members must be between 18 and 40 years of age'
        );
      }
    });

    it('rejects applicant older than 40 years', () => {
      // 45 years old in 2026
      const overAgeData = { ...validApplicantData, date_of_birth: '1981-01-01' };
      const result = applicationSubmissionSchema.safeParse(overAgeData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.date_of_birth).toContain(
          'Members must be between 18 and 40 years of age'
        );
      }
    });

    it('accepts applicant exactly within 18 to 40 age boundary', () => {
      // 25 years old in 2026
      const eligibleData = { ...validApplicantData, date_of_birth: '2001-06-15' };
      const result = applicationSubmissionSchema.safeParse(eligibleData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid Ghanaian region string', () => {
      const invalidRegionData = { ...validApplicantData, region: 'Atlantis' as any };
      const result = applicationSubmissionSchema.safeParse(invalidRegionData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.region).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // 4. Authoritative Application Reference Generation
  // ===========================================================================
  describe('4. Authoritative Application Reference Generation', () => {
    it('generates application reference matching format YRL-APP-YYYY-XXXX', async () => {
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
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: sampleApplicationId,
                      application_number: 'YRL-APP-2026-1042',
                      region: 'Ashanti',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: samplePaymentId,
                      payment_reference: 'YRL-PAY-2026-1042',
                      amount: 5.0,
                      currency: 'GHS',
                    },
                    error: null,
                  }),
                }),
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
                  momo_number: null,
                  momo_account_name: 'Youth Republic Leadership',
                  momo_instructions: 'Pending configuration',
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

      const res = await createMembershipApplication(validApplicantData);
      expect(res.success).toBe(true);
      expect(res.data?.applicationNumber).toMatch(/^YRL-APP-\d{4}-\d{4,}$/);
      expect(res.data?.applicationNumber).toBe('YRL-APP-2026-1042');
    });
  });

  // ===========================================================================
  // 5. Payment Configuration Retrieval
  // ===========================================================================
  describe('5. Payment Configuration Retrieval', () => {
    it('retrieves configuration with active status and standard values', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'cfg-uuid-1',
              config_key: 'default',
              membership_fee: '5.00',
              currency: 'GHS',
              momo_number: null,
              momo_account_name: 'Youth Republic Leadership',
              is_active: true,
            },
            error: null,
          }),
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const config = await getPaymentConfiguration();
      expect(config.membership_fee).toBe(5.0);
      expect(config.currency).toBe('GHS');
      expect(config.momo_number).toBeNull();
    });

    it('falls back to safe default if configuration table query returns null', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const config = await getPaymentConfiguration();
      expect(config.membership_fee).toBe(5.0);
      expect(config.currency).toBe('GHS');
      expect(config.momo_number).toBeNull();
    });
  });

  // ===========================================================================
  // 6. Safe Unconfigured MoMo Destination Handling
  // ===========================================================================
  describe('6. Safe Unconfigured MoMo Destination Handling', () => {
    it('returns isConfigured: false and null momoNumber when momo_number is unset/null', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              membership_fee: 5.0,
              currency: 'GHS',
              momo_number: null, // UNSET
              momo_account_name: 'Youth Republic Leadership',
              momo_instructions: 'Pending configuration',
            },
            error: null,
          }),
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const instructions = await getPublicPaymentInstructions();
      expect(instructions.isConfigured).toBe(false);
      expect(instructions.momoNumber).toBeNull();
      expect(instructions.accountName).toBeNull();
      // Ensure no placeholder '0550000000' is present
      expect(instructions.momoNumber).not.toBe('0550000000');
    });

    it('createMembershipApplication returns instructions: null when momo_number is unset', async () => {
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
                  single: vi.fn().mockResolvedValue({
                    data: { id: sampleApplicationId, application_number: sampleAppNumber, region: 'Ashanti' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: samplePaymentId, payment_reference: samplePayRef, amount: 5.0, currency: 'GHS' },
                    error: null,
                  }),
                }),
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
                  momo_number: null,
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

      const res = await createMembershipApplication(validApplicantData);
      expect(res.success).toBe(true);
      expect(res.data?.instructions).toBeNull();
    });
  });

  // ===========================================================================
  // 7. Configured MoMo Instructions Presentation
  // ===========================================================================
  describe('7. Configured MoMo Instructions Presentation', () => {
    it('returns official instructions when administrator provides legitimate MoMo destination', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              membership_fee: 5.0,
              currency: 'GHS',
              momo_number: '0244112233',
              momo_account_name: 'Youth Republic Leadership Secretariat',
              momo_instructions: 'Pay 5 GHS to official YRL MoMo wallet.',
            },
            error: null,
          }),
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const instructions = await getPublicPaymentInstructions();
      expect(instructions.isConfigured).toBe(true);
      expect(instructions.momoNumber).toBe('0244112233');
      expect(instructions.accountName).toBe('Youth Republic Leadership Secretariat');
      expect(instructions.instructionsText).toBe('Pay 5 GHS to official YRL MoMo wallet.');
    });
  });

  // ===========================================================================
  // 8. Server-Controlled Fee Enforcement
  // ===========================================================================
  describe('8. Server-Controlled Fee Enforcement', () => {
    it('always derives payment amount from configuration (GH₵5.00), ignoring any client inputs', async () => {
      let insertedPaymentPayload: any = null;

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
                  single: vi.fn().mockResolvedValue({
                    data: { id: sampleApplicationId, application_number: sampleAppNumber, region: 'Ashanti' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn((payload) => {
                insertedPaymentPayload = payload;
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: samplePaymentId, payment_reference: samplePayRef, amount: payload.amount, currency: payload.currency },
                      error: null,
                    }),
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
                  momo_number: null,
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

      // Attempt to sneak in client fee: 0.01 or 1000.00
      const clientWithSpoofedFee = {
        ...validApplicantData,
        amount: 0.01,
        fee: 0.01,
      };

      const res = await createMembershipApplication(clientWithSpoofedFee);
      expect(res.success).toBe(true);
      expect(insertedPaymentPayload.amount).toBe(5.0);
      expect(res.data?.amount).toBe(5.0);
    });
  });

  // ===========================================================================
  // 9. Server-Controlled Currency
  // ===========================================================================
  describe('9. Server-Controlled Currency', () => {
    it('enforces GHS currency server-side', async () => {
      let insertedPaymentPayload: any = null;

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
                  single: vi.fn().mockResolvedValue({
                    data: { id: sampleApplicationId, application_number: sampleAppNumber, region: 'Ashanti' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn((payload) => {
                insertedPaymentPayload = payload;
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: samplePaymentId, payment_reference: samplePayRef, amount: 5.0, currency: payload.currency },
                      error: null,
                    }),
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
                  momo_number: null,
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

      const res = await createMembershipApplication(validApplicantData);
      expect(res.success).toBe(true);
      expect(insertedPaymentPayload.currency).toBe('GHS');
      expect(res.data?.currency).toBe('GHS');
    });
  });

  // ===========================================================================
  // 10. Authoritative Payment Reference Generation
  // ===========================================================================
  describe('10. Authoritative Payment Reference Generation', () => {
    it('generates payment reference matching format YRL-PAY-YYYY-XXXX', async () => {
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
                  single: vi.fn().mockResolvedValue({
                    data: { id: sampleApplicationId, application_number: sampleAppNumber, region: 'Ashanti' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: samplePaymentId, payment_reference: 'YRL-PAY-2026-1042', amount: 5.0, currency: 'GHS' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payment_configurations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { membership_fee: 5.0, currency: 'GHS', momo_number: null },
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

      const res = await createMembershipApplication(validApplicantData);
      expect(res.success).toBe(true);
      expect(res.data?.paymentReference).toMatch(/^YRL-PAY-\d{4}-\d{4,}$/);
      expect(res.data?.paymentReference).toBe('YRL-PAY-2026-1042');
    });
  });

  // ===========================================================================
  // 11. Receipt Submission Form Text Validation
  // ===========================================================================
  describe('11. Receipt Submission Form Text Validation', () => {
    it('validates correct uploadReceiptInputSchema data', () => {
      const valid = {
        payment_reference: 'YRL-PAY-2026-1042',
        transaction_reference: 'TXN-98472910',
        claimed_payment_date: '2026-09-23',
      };
      const result = uploadReceiptInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects transaction_reference shorter than 4 characters', () => {
      const invalid = {
        payment_reference: 'YRL-PAY-2026-1042',
        transaction_reference: '12',
      };
      const result = uploadReceiptInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.transaction_reference).toBeDefined();
      }
    });

    it('rejects invalid payment_reference format', () => {
      const invalid = {
        payment_reference: 'INVALID-REF',
        transaction_reference: 'TXN-12345678',
      };
      const result = uploadReceiptInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.payment_reference).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // 12. Unsupported File MIME Type Rejection
  // ===========================================================================
  describe('12. Unsupported File MIME Type Rejection', () => {
    it('ALLOWED_RECEIPT_MIME_TYPES includes only JPEG, PNG, WEBP, and PDF', () => {
      expect(ALLOWED_RECEIPT_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_RECEIPT_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_RECEIPT_MIME_TYPES).toContain('image/webp');
      expect(ALLOWED_RECEIPT_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_RECEIPT_MIME_TYPES).toHaveLength(4);
    });

    it('rejects executable file upload (.exe)', async () => {
      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-12345678');
      const maliciousFile = new File(['binary content'], 'virus.exe', { type: 'application/x-msdownload' });
      formData.append('receipt_file', maliciousFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unsupported file type');
    });

    it('rejects plain text script file (.sh or .txt)', async () => {
      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-12345678');
      const textFile = new File(['echo hello'], 'script.sh', { type: 'text/plain' });
      formData.append('receipt_file', textFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unsupported file type');
    });
  });

  // ===========================================================================
  // 13. Oversized File Rejection (> 5MB)
  // ===========================================================================
  describe('13. Oversized File Rejection (> 5MB)', () => {
    it('rejects file larger than 5MB (MAX_RECEIPT_FILE_SIZE_BYTES)', async () => {
      expect(MAX_RECEIPT_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-12345678');
      // Create a dummy file object with size property over 5MB
      const oversizedBlob = new Blob(['x'], { type: 'image/jpeg' });
      Object.defineProperty(oversizedBlob, 'size', { value: 6 * 1024 * 1024 });
      const oversizedFile = new File([oversizedBlob], 'huge_receipt.jpg', { type: 'image/jpeg' });
      Object.defineProperty(oversizedFile, 'size', { value: 6 * 1024 * 1024 });

      formData.append('receipt_file', oversizedFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('exceeds the maximum allowed limit of 5MB');
    });
  });

  // ===========================================================================
  // 14. Private Storage Bucket Verification
  // ===========================================================================
  describe('14. Private Storage Bucket Verification', () => {
    it('uploads receipt to private payment-receipts bucket with partitioned path', async () => {
      let capturedBucket = '';
      let capturedPath = '';

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
              update: vi.fn((payload) => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { id: samplePaymentId, ...payload },
                  error: null,
                }),
              })),
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
          from: vi.fn((bucket: string) => {
            capturedBucket = bucket;
            return {
              upload: vi.fn((path: string) => {
                capturedPath = path;
                return Promise.resolve({ data: { path }, error: null });
              }),
            };
          }),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['image-bytes'], 'receipt.png', { type: 'image/png' });
      formData.append('receipt_file', validFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(true);
      expect(capturedBucket).toBe('payment-receipts');
      // Storage object path must follow: application_id/payment_id/uuid.ext
      expect(capturedPath).toMatch(new RegExp(`^${sampleApplicationId}/${samplePaymentId}/[a-f0-9-]+\\.png$`));
    });
  });

  // ===========================================================================
  // 15. Receipt Metadata Persistence in Payments Table
  // ===========================================================================
  describe('15. Receipt Metadata Persistence in Payments Table', () => {
    it('persists file size, mime type, transaction reference, and original filename', async () => {
      let updatedPaymentData: any = null;

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
                },
                error: null,
              }),
              update: vi.fn((payload) => {
                updatedPaymentData = payload;
                return {
                  eq: vi.fn().mockReturnThis(),
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: samplePaymentId, ...payload },
                    error: null,
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
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
          }),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      formData.append('claimed_payment_date', '2026-09-23');
      const validFile = new File(['fake-jpg-content'], 'momo_sms_screenshot.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', validFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(true);
      expect(updatedPaymentData.transaction_reference).toBe('TXN-98472910');
      expect(updatedPaymentData.claimed_payment_date).toBe('2026-09-23');
      expect(updatedPaymentData.storage_bucket).toBe('payment-receipts');
      expect(updatedPaymentData.receipt_original_filename).toBe('momo_sms_screenshot.jpg');
      expect(updatedPaymentData.receipt_mime_type).toBe('image/jpeg');
      expect(updatedPaymentData.receipt_file_size).toBeGreaterThan(0);
      expect(updatedPaymentData.receipt_uploaded_at).toBeDefined();
    });
  });

  // ===========================================================================
  // 16. Status Lifecycle Transitions
  // ===========================================================================
  describe('16. Status Lifecycle Transitions', () => {
    it('initial application and payment have status payment_not_started and pending', async () => {
      let createdAppPayload: any = null;
      let createdPayPayload: any = null;

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
              insert: vi.fn((payload) => {
                createdAppPayload = payload;
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: sampleApplicationId, application_number: sampleAppNumber, region: 'Ashanti' },
                      error: null,
                    }),
                  }),
                };
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn((payload) => {
                createdPayPayload = payload;
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: samplePaymentId, payment_reference: samplePayRef, amount: 5.0, currency: 'GHS' },
                      error: null,
                    }),
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
                data: { membership_fee: 5.0, currency: 'GHS', momo_number: null },
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

      await createMembershipApplication(validApplicantData);
      expect(createdAppPayload.status).toBe('payment_not_started');
      expect(createdPayPayload.status).toBe('pending');
    });

    it('receipt upload transitions payments and membership_applications to pending_verification', async () => {
      let paymentStatusUpdate: any = null;
      let appStatusUpdate: any = null;

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
                },
                error: null,
              }),
              update: vi.fn((payload) => {
                paymentStatusUpdate = payload.status;
                return {
                  eq: vi.fn().mockReturnThis(),
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: samplePaymentId, ...payload },
                    error: null,
                  }),
                };
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              update: vi.fn((payload) => {
                appStatusUpdate = payload.status;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
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
            upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
          }),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['content'], 'receipt.pdf', { type: 'application/pdf' });
      formData.append('receipt_file', validFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(true);
      expect(paymentStatusUpdate).toBe('pending_verification');
      expect(appStatusUpdate).toBe('pending_verification');
      expect(res.data?.status).toBe('pending_verification');
      expect(res.data?.applicationStatus).toBe('pending_verification');
    });
  });

  // ===========================================================================
  // 17. Invariant: Receipt Upload Does NOT Mark Payment Successful
  // ===========================================================================
  describe('17. Invariant: Receipt Upload Does NOT Mark Payment Successful', () => {
    it('never sets payment status to successful during receipt upload', async () => {
      let finalPaymentStatus = '';

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
                },
                error: null,
              }),
              update: vi.fn((payload) => {
                finalPaymentStatus = payload.status;
                return {
                  eq: vi.fn().mockReturnThis(),
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: samplePaymentId, ...payload },
                    error: null,
                  }),
                };
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
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
          }),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['content'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', validFile);

      await submitApplicantReceipt(formData);
      expect(finalPaymentStatus).not.toBe('successful');
      expect(finalPaymentStatus).toBe('pending_verification');
    });
  });

  // ===========================================================================
  // 18. Invariant: Receipt Upload Does NOT Create Active Member
  // ===========================================================================
  describe('18. Invariant: Receipt Upload Does NOT Create Active Member', () => {
    it('does not touch or insert into members table during receipt upload', async () => {
      const accessedTables: string[] = [];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          accessedTables.push(table);
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: samplePaymentId,
                  application_id: sampleApplicationId,
                  status: 'pending',
                },
                error: null,
              }),
              update: vi.fn((payload) => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { id: samplePaymentId, ...payload },
                  error: null,
                }),
              })),
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
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
          }),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['content'], 'receipt.webp', { type: 'image/webp' });
      formData.append('receipt_file', validFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(true);
      expect(accessedTables).not.toContain('members');
      // No memberId in result
      expect((res.data as any)?.memberId).toBeUndefined();
    });
  });

  // ===========================================================================
  // 19. Duplicate / Replay Receipt Submission Protection
  // ===========================================================================
  describe('19. Duplicate / Replay Receipt Submission Protection', () => {
    it('rejects receipt submission if payment is already pending_verification', async () => {
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
                  status: 'pending_verification', // ALREADY SUBMITTED
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['content'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', validFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('A receipt has already been submitted');
    });

    it('rejects receipt submission if payment is already successful', async () => {
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
                  status: 'successful', // ALREADY VERIFIED
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['content'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', validFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('already been verified and completed');
    });
  });

  // ===========================================================================
  // 20. Cross-Applicant Data Isolation
  // ===========================================================================
  describe('20. Cross-Applicant Data Isolation', () => {
    it('rejects receipt upload if payment reference does not exist', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
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

      const formData = new FormData();
      formData.append('payment_reference', 'YRL-PAY-9999-9999');
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['content'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', validFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Payment reference was not found');
    });
  });

  // ===========================================================================
  // 21. Preservation of Existing Member sulleymanfuseini1@gmail.com
  // ===========================================================================
  describe('21. Preservation of Existing Member sulleymanfuseini1@gmail.com', () => {
    it('detects existing member and prevents re-registration or overwrite', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: '0c76cbdf-b4d2-4309-8d76-59c4fa920259',
                  email: 'sulleymanfuseini1@gmail.com',
                  phone_number: '0550000000',
                  member_id: 'YRL-MEM-2026-1031',
                  status: 'active',
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const duplicateAttempt = {
        ...validApplicantData,
        email: 'sulleymanfuseini1@gmail.com',
      };

      const res = await createMembershipApplication(duplicateAttempt);
      expect(res.success).toBe(false);
      expect(res.error).toContain('A registered member with this email or phone number already exists');
    });
  });

  // ===========================================================================
  // 22. Audit Logging
  // ===========================================================================
  describe('22. Audit Logging', () => {
    it('records membership_application_created and payment_created audit events', async () => {
      let loggedEvents: any[] = [];

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
                  single: vi.fn().mockResolvedValue({
                    data: { id: sampleApplicationId, application_number: sampleAppNumber, region: 'Ashanti' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: samplePaymentId, payment_reference: samplePayRef, amount: 5.0, currency: 'GHS' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payment_configurations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { membership_fee: 5.0, currency: 'GHS', momo_number: null },
                error: null,
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((logs) => {
                loggedEvents = logs;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await createMembershipApplication(validApplicantData);
      expect(loggedEvents).toHaveLength(2);
      expect(loggedEvents[0].action).toBe('membership_application_created');
      expect(loggedEvents[1].action).toBe('payment_created');
    });

    it('records payment_receipt_submitted audit event upon receipt upload', async () => {
      let loggedReceiptEvent: any = null;

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
                },
                error: null,
              }),
              update: vi.fn((payload) => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { id: samplePaymentId, ...payload },
                  error: null,
                }),
              })),
            };
          }
          if (table === 'membership_applications') {
            return {
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((log) => {
                loggedReceiptEvent = log;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
          }),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['content'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', validFile);

      await submitApplicantReceipt(formData);
      expect(loggedReceiptEvent).toBeDefined();
      expect(loggedReceiptEvent.action).toBe('payment_receipt_submitted');
      expect(loggedReceiptEvent.new_state.transaction_reference).toBe('TXN-98472910');
    });
  });

  // ===========================================================================
  // 23. Zero Secret / Key Leakage
  // ===========================================================================
  describe('23. Zero Secret / Key Leakage', () => {
    it('returns only clean, safe public data to applicant', async () => {
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
                  single: vi.fn().mockResolvedValue({
                    data: { id: sampleApplicationId, application_number: sampleAppNumber, region: 'Ashanti' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: samplePaymentId, payment_reference: samplePayRef, amount: 5.0, currency: 'GHS' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'payment_configurations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { membership_fee: 5.0, currency: 'GHS', momo_number: null },
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

      const res = await createMembershipApplication(validApplicantData);
      expect(res.success).toBe(true);
      const json = JSON.stringify(res);
      expect(json).not.toContain('supabase_service_role_key');
      expect(json).not.toContain('service_role');
      expect(json).not.toContain('secret');
      expect(json).not.toContain('password');
    });
  });

  // ===========================================================================
  // 24. Absence of Public Receipt URLs
  // ===========================================================================
  describe('24. Absence of Public Receipt URLs', () => {
    it('storage getPublicUrl is never called; bucket is strictly private', async () => {
      const getPublicUrlSpy = vi.fn();

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
                },
                error: null,
              }),
              update: vi.fn((payload) => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { id: samplePaymentId, ...payload },
                  error: null,
                }),
              })),
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
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
            getPublicUrl: getPublicUrlSpy,
          }),
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('payment_reference', samplePayRef);
      formData.append('transaction_reference', 'TXN-98472910');
      const validFile = new File(['content'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', validFile);

      const res = await submitApplicantReceipt(formData);
      expect(res.success).toBe(true);
      expect(getPublicUrlSpy).not.toHaveBeenCalled();
      expect((res.data as any)?.publicUrl).toBeUndefined();
    });
  });
});

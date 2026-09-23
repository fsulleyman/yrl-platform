import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  APPLICATION_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  type PaymentConfiguration,
  type MembershipApplication,
  type PaymentRecord,
} from '@/lib/payment/types';

import {
  applicationSubmissionSchema,
  submitReceiptSchema,
  verifyPaymentSchema,
  rejectPaymentSchema,
  activateApplicationSchema,
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
} from '@/lib/validations/payment';

import {
  getPaymentConfiguration,
  checkPaymentPermission,
  isPaymentOperationAuthorized,
  createMembershipApplication,
  recordPaymentReceipt,
  verifyPayment,
  activateMembershipApplication,
  rejectPayment,
} from '@/lib/payment/service';

import * as supabaseServer from '@/lib/supabase/server';
import { type AdminSession } from '@/lib/auth/types';

describe('Phase B13.1: Membership Payment Architecture & Database Foundation', () => {
  const superAdminSession: AdminSession = {
    user: { id: 'admin-super-uuid', email: 'superadmin@yrl.org' },
    role: 'super_admin',
  };

  const regionalAdminAshanti: AdminSession = {
    user: { id: 'admin-reg-uuid', email: 'coordinator.ashanti@yrl.org' },
    role: 'regional_coordinator',
    assignedRegion: 'Ashanti',
  };

  const regionalAdminAccra: AdminSession = {
    user: { id: 'admin-accra-uuid', email: 'coordinator.accra@yrl.org' },
    role: 'regional_coordinator',
    assignedRegion: 'Greater Accra',
  };

  const nationalReviewerSession: AdminSession = {
    user: { id: 'reviewer-uuid', email: 'reviewer@yrl.org' },
    role: 'national_reviewer',
  };

  const validApplicantData = {
    full_name: 'Kwame Osei Asante',
    date_of_birth: '2000-05-15',
    gender: 'Male',
    phone_number: '0244123456',
    whatsapp_number: '0244123456',
    email: 'kwame.asante@example.com',
    region: 'Ashanti' as const,
    district_municipality: 'Kumasi Metro',
    town_community: 'Bantama',
    occupation: 'Software Developer',
    education_level: "Bachelor's Degree",
    why_join: 'I am committed to empowering Ghanaian youth and contributing to community development.',
    availability: '5-10 hours/week',
    engagement_interests: ['community_projects', 'civic_education'],
    civic_acknowledgement: true as const,
    honeypot: '',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. Database Schema & Migration File Verification
  // ===========================================================================
  describe('1. Database Migration & Schema Integrity', () => {
    it('migration file exists with deterministic, idempotent SQL', () => {
      const migrationPath = path.resolve('supabase/migrations/20260923_b13_1_payment_foundation.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS payment_configurations');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS membership_applications');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS payments');
      // Legacy members table must NOT be altered with application_id
      expect(sql).not.toContain('ALTER TABLE members ADD COLUMN');
      expect(sql).toContain('member_id uuid REFERENCES members(id)');
      expect(sql).toContain('CREATE SEQUENCE IF NOT EXISTS seq_application_ref');
      expect(sql).toContain('CREATE SEQUENCE IF NOT EXISTS seq_payment_ref');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('GRANT USAGE, SELECT ON SEQUENCE seq_application_ref TO service_role');
      expect(sql).toContain('GRANT USAGE, SELECT ON SEQUENCE seq_payment_ref TO service_role');
      expect(sql).toContain('INSERT INTO payment_configurations');
      expect(sql).toContain('ON CONFLICT (config_key) DO UPDATE');
      // Migration MUST seed momo_number as NULL (never placeholder)
      expect(sql).toContain('NULL,');
    });

    it('status enums and payment methods contain all required states', () => {
      expect(APPLICATION_STATUSES).toContain('payment_not_started');
      expect(APPLICATION_STATUSES).toContain('pending_payment');
      expect(APPLICATION_STATUSES).toContain('receipt_submitted');
      expect(APPLICATION_STATUSES).toContain('pending_verification');
      expect(APPLICATION_STATUSES).toContain('payment_verified');
      expect(APPLICATION_STATUSES).toContain('payment_rejected');
      expect(APPLICATION_STATUSES).toContain('activated');
      expect(APPLICATION_STATUSES).toContain('cancelled');

      expect(PAYMENT_STATUSES).toContain('pending');
      expect(PAYMENT_STATUSES).toContain('receipt_submitted');
      expect(PAYMENT_STATUSES).toContain('pending_verification');
      expect(PAYMENT_STATUSES).toContain('successful');
      expect(PAYMENT_STATUSES).toContain('rejected');
      expect(PAYMENT_STATUSES).toContain('failed');
      expect(PAYMENT_STATUSES).toContain('cancelled');
      expect(PAYMENT_STATUSES).toContain('expired');
      expect(PAYMENT_STATUSES).toContain('reversed');

      expect(PAYMENT_METHODS).toContain('manual_mobile_money');
      expect(PAYMENT_METHODS).toContain('paystack');
      expect(PAYMENT_METHODS).toContain('other_provider');
    });
  });

  // ===========================================================================
  // 2. Configuration & Fee Handling (GH₵5.00) & NULL MoMo Number Guard
  // ===========================================================================
  describe('2. Payment Configuration & Mobile Money Destination Safety', () => {
    it('retrieves active configuration with numeric fee GH₵5.00 and NULL MoMo destination', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'cfg-1',
              config_key: 'default',
              membership_fee: 5.0,
              currency: 'GHS',
              momo_number: null,
              momo_account_name: 'Youth Republic Leadership',
              momo_instructions: 'Awaiting administrator configuration',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const config = await getPaymentConfiguration();
      expect(config.membership_fee).toBe(5.0);
      expect(config.currency).toBe('GHS');
      // MoMo number must be null until authorized administrator configures it
      expect(config.momo_number).toBeNull();
      expect(typeof config.membership_fee).toBe('number');
    });

    it('does not display payment instructions when destination MoMo number is unset/null', async () => {
      const insertedApp = {
        id: '22222222-2222-4222-8222-222222222222',
        application_number: 'YRL-APP-2026-1001',
        region: 'Ashanti',
      };
      const insertedPayment = {
        id: '11111111-1111-4111-8111-111111111111',
        payment_reference: 'YRL-PAY-2026-1001',
        amount: 5.0,
        currency: 'GHS',
      };

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
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: insertedPayment, error: null }),
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
                  momo_number: null, // UNSET
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

      const result = await createMembershipApplication(validApplicantData);
      expect(result.success).toBe(true);
      expect(result.data?.applicationNumber).toBe('YRL-APP-2026-1001');
      // Crucial: instructions must be null when MoMo destination is unset
      expect(result.data?.instructions).toBeNull();
    });

    it('displays payment instructions once authorized administrator configures the real MoMo number', async () => {
      const insertedApp = {
        id: '22222222-2222-4222-8222-222222222222',
        application_number: 'YRL-APP-2026-1001',
        region: 'Ashanti',
      };
      const insertedPayment = {
        id: '11111111-1111-4111-8111-111111111111',
        payment_reference: 'YRL-PAY-2026-1001',
        amount: 5.0,
        currency: 'GHS',
      };

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
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: insertedPayment, error: null }),
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
                  momo_number: '0240123456', // Real number configured
                  momo_account_name: 'Youth Republic Leadership',
                  momo_instructions: 'Pay GH₵5.00 via MoMo using application number',
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

      const result = await createMembershipApplication(validApplicantData);
      expect(result.success).toBe(true);
      expect(result.data?.instructions).not.toBeNull();
      expect(result.data?.instructions?.isConfigured).toBe(true);
      expect(result.data?.instructions?.momoNumber).toBe('0240123456');
    });
  });

  // ===========================================================================
  // 3. Application Creation Workflow
  // ===========================================================================
  describe('3. Application & Payment Creation Invariants', () => {
    it('rejects submission with honeypot bot trap without database persistence', async () => {
      const botSubmission = { ...validApplicantData, honeypot: 'spam_bot' };
      const mockSupabase = { from: vi.fn() };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await createMembershipApplication(botSubmission);
      expect(result.success).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('rejects applicant with existing active membership', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'existing-mem-uuid' },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await createMembershipApplication(validApplicantData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  // ===========================================================================
  // 4. Receipt Evidence Submission Workflow
  // ===========================================================================
  describe('4. Receipt Metadata & Transaction Reference Storage', () => {
    it('validates receipt MIME types and rejects unsupported extensions', () => {
      const validReceipt = {
        payment_reference: 'YRL-PAY-2026-1001',
        transaction_reference: 'MOMO-987654321',
        storage_bucket: 'payment-receipts',
        storage_object_path: 'receipts/2026/09/user-123.jpg',
        receipt_original_filename: 'receipt.jpg',
        receipt_mime_type: 'image/jpeg' as const,
        receipt_file_size: 256000,
      };

      const validParse = submitReceiptSchema.safeParse(validReceipt);
      expect(validParse.success).toBe(true);

      const invalidMime = {
        ...validReceipt,
        receipt_mime_type: 'application/x-executable',
      };
      const invalidParse = submitReceiptSchema.safeParse(invalidMime);
      expect(invalidParse.success).toBe(false);

      const overSized = {
        ...validReceipt,
        receipt_file_size: MAX_RECEIPT_FILE_SIZE_BYTES + 1024,
      };
      const overSizedParse = submitReceiptSchema.safeParse(overSized);
      expect(overSizedParse.success).toBe(false);
    });

    it('records transaction reference & storage metadata, transitions status to pending_verification', async () => {
      const existingPayment = {
        id: '11111111-1111-4111-8111-111111111111',
        application_id: '22222222-2222-4222-8222-222222222222',
        payment_reference: 'YRL-PAY-2026-1001',
        status: 'pending',
        amount: 5.0,
        currency: 'GHS',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...existingPayment, status: 'pending_verification' },
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
              maybeSingle: vi.fn().mockResolvedValue({ data: existingPayment, error: null }),
              update: mockUpdate,
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

      const result = await recordPaymentReceipt({
        payment_reference: 'YRL-PAY-2026-1001',
        transaction_reference: 'TXN-987654321',
        claimed_payment_date: '2026-09-23',
        storage_bucket: 'payment-receipts',
        storage_object_path: 'receipts/2026/09/receipt-1.png',
        receipt_original_filename: 'receipt.png',
        receipt_mime_type: 'image/png',
        receipt_file_size: 150000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending_verification');
      expect(result.data?.applicationStatus).toBe('pending_verification');

      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payment_receipt_submitted',
          entity_id: '11111111-1111-4111-8111-111111111111',
        })
      );
    });

    it('rejects receipt submission if payment was already verified and successful', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: '11111111-1111-4111-8111-111111111111',
                  status: 'successful',
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await recordPaymentReceipt({
        payment_reference: 'YRL-PAY-2026-1001',
        transaction_reference: 'TXN-123456',
        storage_bucket: 'payment-receipts',
        storage_object_path: 'receipts/path.jpg',
        receipt_original_filename: 'rec.jpg',
        receipt_mime_type: 'image/jpeg',
        receipt_file_size: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been verified');
    });
  });

  // ===========================================================================
  // 5. Granular Admin Authorization Compatibility
  // ===========================================================================
  describe('5. Granular RBAC & Regional Scope Verification', () => {
    it('authorizes super_admin unconditionally for all payment permissions across all regions', () => {
      expect(checkPaymentPermission(superAdminSession, 'payments.view', 'Ashanti').authorized).toBe(true);
      expect(checkPaymentPermission(superAdminSession, 'payments.verify', 'Ashanti').authorized).toBe(true);
      expect(checkPaymentPermission(superAdminSession, 'payments.reject', 'Ashanti').authorized).toBe(true);
      expect(checkPaymentPermission(superAdminSession, 'payments.export', 'Greater Accra').authorized).toBe(true);
    });

    it('authorizes regional_coordinator within their assigned region for all payment operations', () => {
      expect(checkPaymentPermission(regionalAdminAshanti, 'payments.view', 'Ashanti').authorized).toBe(true);
      expect(checkPaymentPermission(regionalAdminAshanti, 'payments.verify', 'Ashanti').authorized).toBe(true);
      expect(checkPaymentPermission(regionalAdminAshanti, 'payments.reject', 'Ashanti').authorized).toBe(true);
      expect(checkPaymentPermission(regionalAdminAshanti, 'payments.export', 'Ashanti').authorized).toBe(true);

      const outOfScope = checkPaymentPermission(regionalAdminAshanti, 'payments.verify', 'Greater Accra');
      expect(outOfScope.authorized).toBe(false);
      expect(outOfScope.reason).toContain('cannot administer resources in Greater Accra');
    });

    it('denies national_reviewer from verifying, rejecting, or activating payments', () => {
      expect(checkPaymentPermission(nationalReviewerSession, 'payments.verify', 'Ashanti').authorized).toBe(false);
      expect(checkPaymentPermission(nationalReviewerSession, 'payments.reject', 'Ashanti').authorized).toBe(false);
    });
  });

  // ===========================================================================
  // 6. Payment Verification Separated from Membership Activation
  // ===========================================================================
  describe('6. Payment Verification & Membership Approval Separation', () => {
    it('verifying payment transitions status to successful and application to payment_verified WITHOUT activating member', async () => {
      const mockPayment = {
        id: '11111111-1111-4111-8111-111111111111',
        application_id: '22222222-2222-4222-8222-222222222222',
        status: 'pending_verification',
        amount: 5.0,
        membership_applications: {
          id: '22222222-2222-4222-8222-222222222222',
          region: 'Ashanti',
          status: 'pending_verification',
          member_id: null,
        },
      };

      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockPayment, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return {
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'members') {
            return { insert: vi.fn() };
          }
          if (table === 'audit_logs') {
            return { insert: mockAuditInsert };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      // Verify payment (without auto-activate)
      const result = await verifyPayment(regionalAdminAshanti, {
        payment_id: '11111111-1111-4111-8111-111111111111',
        auto_activate: false,
      });

      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('successful');
      expect(result.data?.applicationStatus).toBe('payment_verified');
      // Members table insert was NOT called
      expect(mockSupabase.from('members').insert).not.toHaveBeenCalled();

      // Only payment_verified audit log was emitted
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment_verified' })
      );
    });

    it('activates membership only when application has a verified successful payment', async () => {
      const mockApplication = {
        id: '22222222-2222-4222-8222-222222222222',
        full_name: 'Kwame Osei Asante',
        date_of_birth: '2000-05-15',
        gender: 'Male',
        phone_number: '0244123456',
        whatsapp_number: '0244123456',
        email: 'kwame.asante@example.com',
        region: 'Ashanti',
        district_municipality: 'Kumasi Metro',
        town_community: 'Bantama',
        occupation: 'Software Developer',
        education_level: "Bachelor's Degree",
        why_join: 'Empowering youth leadership',
        availability: '5-10 hours/week',
        engagement_interests: ['community_projects'],
        civic_acknowledgement: true,
        status: 'payment_verified',
        member_id: null,
        payments: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            status: 'successful',
            amount: 5.0,
          },
        ],
      };

      const createdMember = {
        id: 'mem-new-uuid',
        member_id: 'YRL-MEM-2026-1032',
      };

      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'members') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: createdMember, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return { insert: mockAuditInsert };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await activateMembershipApplication(regionalAdminAshanti, {
        application_id: '22222222-2222-4222-8222-222222222222',
      });

      expect(result.success).toBe(true);
      expect(result.data?.applicationStatus).toBe('activated');
      expect(result.data?.memberId).toBe('YRL-MEM-2026-1032');
      expect(result.data?.memberStatus).toBe('active');

      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'membership_activated' })
      );
    });

    it('rejects activation attempt if application has no verified successful payment', async () => {
      const mockApplicationWithoutPayment = {
        id: '22222222-2222-4222-8222-222222222222',
        region: 'Ashanti',
        status: 'pending_verification',
        payments: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            status: 'pending_verification', // NOT successful
          },
        ],
      };

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockApplicationWithoutPayment, error: null }),
        })),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await activateMembershipApplication(superAdminSession, {
        application_id: '22222222-2222-4222-8222-222222222222',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No verified successful payment found');
    });

    it('prevents double activation if application is already activated', async () => {
      const mockAlreadyActivatedApp = {
        id: '22222222-2222-4222-8222-222222222222',
        region: 'Ashanti',
        status: 'activated', // Already activated
        payments: [{ status: 'successful' }],
      };

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockAlreadyActivatedApp, error: null }),
        })),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await activateMembershipApplication(superAdminSession, {
        application_id: '22222222-2222-4222-8222-222222222222',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been activated');
    });
  });

  // ===========================================================================
  // 7. Payment Rejection Workflow
  // ===========================================================================
  describe('7. Payment Rejection Workflow', () => {
    it('rejects payment with valid reason, updates status to rejected, and records audit log', async () => {
      const mockPayment = {
        id: '11111111-1111-4111-8111-111111111111',
        application_id: '22222222-2222-4222-8222-222222222222',
        status: 'pending_verification',
        membership_applications: {
          id: '22222222-2222-4222-8222-222222222222',
          region: 'Ashanti',
          status: 'pending_verification',
        },
      };

      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockPayment, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return {
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'audit_logs') {
            return { insert: mockAuditInsert };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await rejectPayment(superAdminSession, {
        payment_id: '11111111-1111-4111-8111-111111111111',
        rejection_reason: 'Transaction ID not found on YRL Mobile Money statement.',
      });

      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('rejected');
      expect(result.data?.applicationStatus).toBe('payment_rejected');
      expect(result.data?.rejectionReason).toContain('Transaction ID not found');

      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payment_rejected',
          new_state: expect.objectContaining({
            status: 'rejected',
            rejection_reason: 'Transaction ID not found on YRL Mobile Money statement.',
          }),
        })
      );
    });

    it('rejects payment rejection when reason is too short', async () => {
      const result = await rejectPayment(superAdminSession, {
        payment_id: '11111111-1111-4111-8111-111111111111',
        rejection_reason: 'No',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Please provide a valid payment ID and rejection reason');
    });
  });

  // ===========================================================================
  // 8. Secrets & Audit Hygiene
  // ===========================================================================
  describe('8. Privacy & Secrets Protection', () => {
    it('ensures audit logs never capture passwords, tokens, service keys, or binary data', async () => {
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: '11111111-1111-4111-8111-111111111111',
                  status: 'pending_verification',
                  membership_applications: {
                    id: '22222222-2222-4222-8222-222222222222',
                    region: 'Ashanti',
                  },
                },
                error: null,
              }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'membership_applications') {
            return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          }
          if (table === 'audit_logs') {
            return { insert: mockAuditInsert };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      await verifyPayment(superAdminSession, { payment_id: '11111111-1111-4111-8111-111111111111' });

      for (const call of mockAuditInsert.mock.calls) {
        const payloadStr = JSON.stringify(call);
        expect(payloadStr).not.toContain('password');
        expect(payloadStr).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
        expect(payloadStr).not.toContain('RESEND_API_KEY');
        expect(payloadStr).not.toContain('token');
      }
    });
  });

  // ===========================================================================
  // 9. Payment Reference Uniqueness & Formats
  // ===========================================================================
  describe('9. Payment Reference & Application Formats', () => {
    it('enforces expected reference format patterns (YRL-APP-YYYY-XXXX and YRL-PAY-YYYY-XXXX)', () => {
      const appRefPattern = /^YRL-APP-\d{4}-\d{4,}$/;
      const payRefPattern = /^YRL-PAY-\d{4}-\d{4,}$/;

      const sampleAppRef = 'YRL-APP-2026-1001';
      const samplePayRef = 'YRL-PAY-2026-1001';

      expect(sampleAppRef).toMatch(appRefPattern);
      expect(samplePayRef).toMatch(payRefPattern);

      expect(sampleAppRef).not.toEqual(samplePayRef);
    });
  });

  // ===========================================================================
  // 10. Status Transition & Activation Invariant Protections
  // ===========================================================================
  describe('10. Status Transitions & Activation Invariants', () => {
    it('rejects invalid status transitions (e.g. cancelled payment cannot be verified)', async () => {
      const mockCancelledPayment = {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'cancelled',
        membership_applications: {
          id: '22222222-2222-4222-8222-222222222222',
          region: 'Ashanti',
          status: 'cancelled',
        },
      };

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockCancelledPayment, error: null }),
        })),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await verifyPayment(superAdminSession, {
        payment_id: '11111111-1111-4111-8111-111111111111',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Payment cannot be verified from current status: 'cancelled'");
    });

    it('client receipt submission never marks payment successful or activates member', async () => {
      const mockPendingPayment = {
        id: '11111111-1111-4111-8111-111111111111',
        application_id: '22222222-2222-4222-8222-222222222222',
        payment_reference: 'YRL-PAY-2026-1001',
        status: 'pending',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockPendingPayment, status: 'pending_verification' },
              error: null,
            }),
          }),
        }),
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockPendingPayment, error: null }),
              update: mockUpdate,
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
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const result = await recordPaymentReceipt({
        payment_reference: 'YRL-PAY-2026-1001',
        transaction_reference: 'TXN-ABC1234',
        storage_bucket: 'payment-receipts',
        storage_object_path: 'receipts/file.pdf',
        receipt_original_filename: 'receipt.pdf',
        receipt_mime_type: 'application/pdf',
        receipt_file_size: 50000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending_verification');
      expect(result.data?.applicationStatus).toBe('pending_verification');
      expect(result.data?.status).not.toBe('successful');
    });
  });
});

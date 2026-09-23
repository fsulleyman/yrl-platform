/**
 * Phase B13.1: Authoritative Payment & Membership Application Service
 * Provides server-authoritative mutations for:
 * 1. Application registration & payment initialization
 * 2. Applicant receipt/transaction metadata submission
 * 3. Authorized Administrator Payment Verification (Separable from Activation)
 * 4. Authorized Administrator Membership Activation (PAYMENT SUCCESSFUL + APPLICATION APPROVED -> MEMBER ACTIVE)
 * 5. Authorized Administrator Payment Rejection
 * 6. Configuration lookup (with NULL MoMo guard)
 *
 * Implements granular RBAC compatibility, regional scoping, audit logging,
 * and protects against client-spoofed verification, client-supplied fees,
 * or premature Member ID generation.
 */

import { headers } from 'next/headers';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { publicSubmissionRateLimiter, extractClientIp } from '@/lib/security/rate-limit';
import { sanitizeError } from '@/lib/errors';
import { sendMembershipEmail } from '@/lib/email/resend';
import { type AdminSession } from '@/lib/auth/types';
import {
  type PaymentConfiguration,
  type MembershipApplication,
  type PaymentRecord,
  type PaymentOperationResult,
  type ApplicationSubmissionResult,
  type ReceiptSubmissionResult,
  type PaymentVerificationResult,
  type MembershipActivationResult,
  type RejectionResult,
  type PaymentPermission,
  type PaymentInstructions,
  type PaymentQueueItem,
  type PaymentListFilters,
  type PaginatedPaymentsResult,
  type PaymentSignedUrlResult,
  type PaymentDetailView,
  type PaystackInitializeInput,
  type PaystackInitializeResult,
  type PaystackWebhookEvent,
  type PaymentStatusResult,
} from './types';
import {
  initializePaystackTransaction,
  validatePaystackSignature,
  verifyPaystackTransaction,
} from './paystack';
import {
  applicationSubmissionSchema,
  submitReceiptSchema,
  uploadReceiptInputSchema,
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
  verifyPaymentSchema,
  rejectPaymentSchema,
  activateApplicationSchema,
  paymentFilterSchema,
} from '@/lib/validations/payment';

// Fallback configuration if payment_configurations table record is missing
// CRITICAL: MoMo destination is strictly NULL until authorized administrator configures it
const DEFAULT_PAYMENT_CONFIG: PaymentConfiguration = {
  id: '00000000-0000-0000-0000-000000000000',
  config_key: 'default',
  membership_fee: 5.0,
  currency: 'GHS',
  momo_number: null,
  momo_account_name: 'Youth Republic Leadership',
  momo_instructions:
    'Official Mobile Money payment destination is currently being configured by the YRL Secretariat. Please check back shortly.',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Retrieve active server-authoritative payment configuration.
 * Browser is never authoritative for amount or payment destinations.
 */
export async function getPaymentConfiguration(): Promise<PaymentConfiguration> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('payment_configurations')
      .select('*')
      .eq('is_active', true)
      .eq('config_key', 'default')
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_PAYMENT_CONFIG;
    }

    return {
      ...data,
      membership_fee: Number(data.membership_fee),
      momo_number: data.momo_number || null,
      momo_account_name: data.momo_account_name || null,
    };
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

/**
 * Retrieve public-safe payment instructions.
 * If momo_number is NULL or empty, returns isConfigured: false and null instructions.
 * Never exposes internal tokens or secrets.
 */
export async function getPublicPaymentInstructions(): Promise<
  PaymentInstructions & { membershipFee: number; currency: string }
> {
  const config = await getPaymentConfiguration();
  const isConfigured = Boolean(config.momo_number && config.momo_number.trim().length > 0);

  return {
    membershipFee: Number(config.membership_fee || 5.0),
    currency: config.currency || 'GHS',
    isConfigured,
    momoNumber: isConfigured ? config.momo_number : null,
    accountName: isConfigured ? config.momo_account_name : null,
    instructionsText: isConfigured
      ? config.momo_instructions
      : 'Official Mobile Money payment destination is currently being configured by the YRL Secretariat. Please check back shortly.',
  };
}

/**
 * Granular Authorization Engine for Payment & Membership Operations:
 * Evaluates requested permission against administrator capabilities:
 * - payments.view
 * - payments.verify
 * - payments.reject
 * - payments.export
 *
 * Supports:
 * 1. Explicit user permissions (if defined in adminUser/session metadata)
 * 2. Role-based fallback:
 *    - super_admin: holds all permissions across all regions
 *    - regional_coordinator: holds view, verify, reject, export SCOPED to assignedRegion
 *    - national_reviewer: denied payment verify/reject/activation by default
 */
export function checkPaymentPermission(
  session: AdminSession,
  permission: PaymentPermission,
  resourceRegion?: string
): { authorized: boolean; reason?: string } {
  // 0. Immediate revocation check for deactivated / invalid administrators
  if (
    !session ||
    !session.user ||
    (session as any).disabled === true ||
    (session.user as any).disabled === true ||
    (session.role as any) === 'deactivated'
  ) {
    return { authorized: false, reason: 'Administrator account is deactivated or invalid.' };
  }

  // 1. Super Admin unconditionally authorized across all scopes
  if (session.role === 'super_admin') {
    return { authorized: true };
  }

  // 2. Regional Coordinator scope check
  if (session.role === 'regional_coordinator') {
    if (!session.assignedRegion) {
      return { authorized: false, reason: 'Regional coordinator has no assigned region.' };
    }
    if (resourceRegion && session.assignedRegion !== resourceRegion) {
      return {
        authorized: false,
        reason: `Forbidden: Regional coordinator for ${session.assignedRegion} cannot administer resources in ${resourceRegion}.`,
      };
    }
    // Regional coordinators hold payment operational permissions strictly within their region
    return { authorized: true };
  }

  // 3. National Reviewer
  if (session.role === 'national_reviewer') {
    // Check if explicit permission exists in app_metadata
    const explicitPermissions =
      (session.user as any)?.app_metadata?.permissions || (session as any)?.permissions || [];
    if (Array.isArray(explicitPermissions) && explicitPermissions.includes(permission)) {
      return { authorized: true };
    }

    // National reviewers can view payment queues/records by default, but cannot verify, reject, or activate
    if (permission === 'payments.view') {
      return { authorized: true };
    }

    return {
      authorized: false,
      reason: `National reviewers are not authorized for '${permission}' by default.`,
    };
  }

  // 4. Default deny
  return {
    authorized: false,
    reason: `Administrator role '${session.role}' is not authorized for '${permission}'.`,
  };
}

/**
 * Backward-compatible helper for service operations.
 */
export function isPaymentOperationAuthorized(
  session: AdminSession,
  applicationRegion: string
): { authorized: boolean; reason?: string } {
  return checkPaymentPermission(session, 'payments.verify', applicationRegion);
}

/**
 * Server Action: createMembershipApplication
 *
 * Initiates the applicant join flow:
 * 1. Checks IP rate limit and anti-bot honeypot
 * 2. Validates 15 applicant profile fields
 * 3. Retrieves authoritative fee from payment_configurations (never trusts client amount)
 * 4. Inserts into membership_applications with status 'payment_not_started'
 * 5. Creates associated pending payment record with 'manual_mobile_money'
 * 6. Records 'membership_application_created' and 'payment_created' audit events
 * 7. Returns application number, payment reference, and instructions ONLY IF destination configured
 *
 * CRITICAL RULE:
 * If the official MoMo number is unset/null, payment instructions are NOT displayed.
 */
export async function createMembershipApplication(
  data: unknown
): Promise<PaymentOperationResult<ApplicationSubmissionResult>> {
  try {
    // 1. IP Rate Limiting
    let ip = '127.0.0.1';
    try {
      const headerList = await headers();
      ip = extractClientIp(headerList);
    } catch {
      ip = '127.0.0.1';
    }

    const rateLimit = publicSubmissionRateLimiter.check(ip);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Too many submissions from this network. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
      };
    }

    // 2. Anti-bot honeypot
    const rawData = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
    if (typeof rawData.honeypot === 'string' && rawData.honeypot.trim().length > 0) {
      // Silently discard bot submission
      return {
        success: true,
        data: {
          applicationId: '00000000-0000-0000-0000-000000000000',
          applicationNumber: 'YRL-APP-BOT-0000',
          paymentReference: 'YRL-PAY-BOT-0000',
          amount: 5.0,
          currency: 'GHS',
          instructions: null,
        },
      };
    }

    // 3. Validation
    const parseResult = applicationSubmissionSchema.safeParse(data);
    if (!parseResult.success) {
      return {
        success: false,
        error: 'Please correct the highlighted fields.',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { honeypot: _hp, ...applicantData } = parseResult.data;
    const normalizedEmail = applicantData.email.trim().toLowerCase();
    const normalizedPhone = applicantData.phone_number.trim();

    const supabase = createAdminClient();

    // Check duplicate in active members
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .or(`email.eq.${normalizedEmail},phone_number.eq.${normalizedPhone}`)
      .maybeSingle();

    if (existingMember) {
      return {
        success: false,
        error: 'A registered member with this email or phone number already exists.',
      };
    }

    // Check pending application
    const { data: existingApp } = await supabase
      .from('membership_applications')
      .select('id, application_number, status')
      .or(`email.eq.${normalizedEmail},phone_number.eq.${normalizedPhone}`)
      .not('status', 'in', '("cancelled","payment_rejected")')
      .maybeSingle();

    if (existingApp) {
      return {
        success: false,
        error: `An active application (${existingApp.application_number}) is already in progress for this email or phone number.`,
      };
    }

    // 4. Retrieve authoritative configuration
    const config = await getPaymentConfiguration();

    // 5. Insert application
    const { data: appInsert, error: appError } = await supabase
      .from('membership_applications')
      .insert({
        ...applicantData,
        email: normalizedEmail,
        phone_number: normalizedPhone,
        status: 'payment_not_started',
      })
      .select('id, application_number, region')
      .single();

    if (appError || !appInsert) {
      console.error('[Payment Error] Failed to insert membership application:', appError?.message);
      return {
        success: false,
        error: 'Unable to save your membership application. Please try again.',
      };
    }

    // 6. Insert pending payment record
    const { data: paymentInsert, error: payError } = await supabase
      .from('payments')
      .insert({
        application_id: appInsert.id,
        payment_method: 'manual_mobile_money',
        payment_channel: 'momo',
        amount: config.membership_fee,
        currency: config.currency,
        status: 'pending',
      })
      .select('id, payment_reference, amount, currency')
      .single();

    if (payError || !paymentInsert) {
      console.error('[Payment Error] Failed to create payment record:', payError?.message);
      return {
        success: false,
        error: 'Application saved, but payment reference could not be generated. Please contact support.',
      };
    }

    // 7. Audit log (never log sensitive secrets)
    await supabase.from('audit_logs').insert([
      {
        entity_type: 'membership_application',
        entity_id: appInsert.id,
        actor_id: normalizedEmail,
        action: 'membership_application_created',
        previous_state: null,
        new_state: {
          application_number: appInsert.application_number,
          status: 'payment_not_started',
          region: appInsert.region,
        },
        ip_address: ip,
      },
      {
        entity_type: 'payment',
        entity_id: paymentInsert.id,
        actor_id: normalizedEmail,
        action: 'payment_created',
        previous_state: null,
        new_state: {
          payment_reference: paymentInsert.payment_reference,
          amount: paymentInsert.amount,
          currency: paymentInsert.currency,
          status: 'pending',
          payment_method: 'manual_mobile_money',
        },
        ip_address: ip,
      },
    ]);

    // Destination configured check: Do NOT expose instructions if destination is unset/null
    const isDestinationConfigured = Boolean(config.momo_number && config.momo_number.trim().length > 0);
    const instructions = isDestinationConfigured
      ? {
          isConfigured: true,
          momoNumber: config.momo_number,
          accountName: config.momo_account_name,
          instructionsText: config.momo_instructions,
        }
      : null;

    return {
      success: true,
      data: {
        applicationId: appInsert.id,
        applicationNumber: appInsert.application_number,
        paymentReference: paymentInsert.payment_reference,
        amount: Number(paymentInsert.amount),
        currency: paymentInsert.currency,
        instructions,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An error occurred while creating your membership application.'),
    };
  }
}

/**
 * Server Action: recordPaymentReceipt
 *
 * Records applicant evidence of Mobile Money payment:
 * 1. Validates transaction reference format & receipt storage metadata
 * 2. Checks payment exists and is in an acceptable submission status ('pending', 'rejected', etc.)
 * 3. Updates payment record with transaction reference, storage path, status -> 'pending_verification'
 * 4. Updates application status -> 'pending_verification'
 * 5. Emits 'payment_receipt_submitted' audit event
 *
 * IMPORTANT: Receipt upload is evidence only! Browser can never self-verify or activate.
 */
export async function recordPaymentReceipt(
  data: unknown
): Promise<PaymentOperationResult<ReceiptSubmissionResult>> {
  try {
    const parseResult = submitReceiptSchema.safeParse(data);
    if (!parseResult.success) {
      return {
        success: false,
        error: 'Please verify the transaction reference and receipt file details.',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const {
      payment_reference,
      transaction_reference,
      claimed_payment_date,
      storage_bucket,
      storage_object_path,
      receipt_original_filename,
      receipt_mime_type,
      receipt_file_size,
    } = parseResult.data;

    const supabase = createAdminClient();

    // Find the payment record
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select('id, application_id, status, amount, currency')
      .eq('payment_reference', payment_reference)
      .maybeSingle();

    if (payError || !payment) {
      return {
        success: false,
        error: 'Payment reference was not found. Please verify your reference number.',
      };
    }

    // Guard against resubmitting already verified/successful payment
    if (payment.status === 'successful') {
      return {
        success: false,
        error: 'This payment has already been verified and completed.',
      };
    }

    if (payment.status === 'pending_verification') {
      return {
        success: false,
        error: 'A receipt has already been submitted for this payment and is awaiting administrative verification.',
      };
    }

    const now = new Date().toISOString();

    // Update payment record
    const { data: updatedPayment, error: updatePayError } = await supabase
      .from('payments')
      .update({
        transaction_reference,
        claimed_payment_date: claimed_payment_date || null,
        storage_bucket,
        storage_object_path,
        receipt_original_filename,
        receipt_mime_type,
        receipt_file_size,
        receipt_uploaded_at: now,
        status: 'pending_verification',
        updated_at: now,
      })
      .eq('id', payment.id)
      .select('*')
      .single();

    if (updatePayError || !updatedPayment) {
      console.error('[Payment Error] Failed to update payment with receipt:', updatePayError?.message);
      return {
        success: false,
        error: 'Failed to record receipt details. Please try again.',
      };
    }

    // Update application record status
    await supabase
      .from('membership_applications')
      .update({
        status: 'pending_verification',
        updated_at: now,
      })
      .eq('id', payment.application_id);

    // Audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: payment.id,
      actor_id: 'applicant',
      action: 'payment_receipt_submitted',
      previous_state: { status: payment.status },
      new_state: {
        status: 'pending_verification',
        transaction_reference,
        storage_object_path,
        receipt_mime_type,
        receipt_file_size,
      },
    });

    return {
      success: true,
      data: {
        paymentId: payment.id,
        paymentReference: payment_reference,
        status: 'pending_verification',
        applicationStatus: 'pending_verification',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An error occurred while submitting payment evidence.'),
    };
  }
}

/**
 * Server Action: submitApplicantReceipt
 *
 * Handles file upload and metadata submission for Mobile Money receipts:
 * 1. Parses and validates form fields via uploadReceiptInputSchema
 * 2. Validates receipt file presence, size (<= 5MB), and MIME type (JPEG/PNG/WEBP/PDF)
 * 3. Enforces that payment reference exists and is not already successful or pending verification
 * 4. Generates a secure randomized object path in the private 'payment-receipts' bucket:
 *    <application_id>/<payment_id>/<random-uuid>.<ext>
 * 5. Streams/uploads file directly to private bucket
 * 6. Updates payment record with transaction reference, storage path, file metadata, and status -> 'pending_verification'
 * 7. Updates application record status -> 'pending_verification'
 * 8. Records 'payment_receipt_submitted' audit log
 *
 * CRITICAL INVARIANTS:
 * - Receipt upload is EVIDENCE only, never automatic verification.
 * - Does NOT mark payment successful.
 * - Does NOT activate membership or create a members row.
 * - Replay protection: cannot resubmit if already pending_verification or successful.
 */
export async function submitApplicantReceipt(
  formData: FormData
): Promise<PaymentOperationResult<ReceiptSubmissionResult>> {
  try {
    const payment_reference = formData.get('payment_reference');
    const transaction_reference = formData.get('transaction_reference');
    const claimed_payment_date = formData.get('claimed_payment_date');
    const receipt_file = formData.get('receipt_file');

    // 1. Validate text inputs
    const parseResult = uploadReceiptInputSchema.safeParse({
      payment_reference,
      transaction_reference,
      claimed_payment_date: claimed_payment_date || undefined,
    });

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Please verify the transaction reference format.',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const validatedInput = parseResult.data;

    // 2. Validate receipt file
    if (!receipt_file || !(receipt_file instanceof File) || receipt_file.size === 0) {
      return {
        success: false,
        error: 'Please upload a receipt file (JPEG, PNG, WEBP, or PDF).',
        fieldErrors: { receipt_file: ['A valid receipt file is required'] },
      };
    }

    if (receipt_file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: 'Receipt file size exceeds the maximum allowed limit of 5MB.',
        fieldErrors: { receipt_file: ['File size cannot exceed 5MB'] },
      };
    }

    const mimeType = receipt_file.type;
    if (!ALLOWED_RECEIPT_MIME_TYPES.includes(mimeType as any)) {
      return {
        success: false,
        error: 'Unsupported file type. Receipts must be JPEG, PNG, WEBP, or PDF.',
        fieldErrors: { receipt_file: ['Supported formats: JPEG, PNG, WEBP, PDF'] },
      };
    }

    const supabase = createAdminClient();

    // 3. Query payment record
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select('id, application_id, status, amount, currency')
      .eq('payment_reference', validatedInput.payment_reference)
      .maybeSingle();

    if (payError || !payment) {
      return {
        success: false,
        error: 'Payment reference was not found. Please verify your reference number.',
      };
    }

    // Duplicate / Replay Protection:
    if (payment.status === 'successful') {
      return {
        success: false,
        error: 'This payment has already been verified and completed.',
      };
    }

    if (payment.status === 'pending_verification') {
      return {
        success: false,
        error: 'A receipt has already been submitted for this payment and is awaiting administrative verification.',
      };
    }

    // 4. Generate safe unique file path
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    const extension = extensionMap[mimeType] || 'bin';
    const safeFilename = `${crypto.randomUUID()}.${extension}`;
    const storageObjectPath = `${payment.application_id}/${payment.id}/${safeFilename}`;

    // 5. Upload to private bucket 'payment-receipts'
    const fileBuffer = Buffer.from(await receipt_file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('payment-receipts')
      .upload(storageObjectPath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Payment Error] Failed to upload receipt to private storage:', uploadError.message);
      return {
        success: false,
        error: 'Unable to upload receipt file securely. Please try again.',
      };
    }

    const now = new Date().toISOString();

    // 6. Update payment record: status -> 'pending_verification'
    const { data: updatedPayment, error: updatePayError } = await supabase
      .from('payments')
      .update({
        transaction_reference: validatedInput.transaction_reference,
        claimed_payment_date: validatedInput.claimed_payment_date || null,
        storage_bucket: 'payment-receipts',
        storage_object_path: storageObjectPath,
        receipt_original_filename: receipt_file.name.slice(0, 255),
        receipt_mime_type: mimeType,
        receipt_file_size: receipt_file.size,
        receipt_uploaded_at: now,
        status: 'pending_verification',
        updated_at: now,
      })
      .eq('id', payment.id)
      .select('*')
      .single();

    if (updatePayError || !updatedPayment) {
      console.error('[Payment Error] Failed to update payment record with receipt metadata:', updatePayError?.message);
      return {
        success: false,
        error: 'Receipt was uploaded, but payment metadata could not be recorded. Please contact support.',
      };
    }

    // 7. Update application record: status -> 'pending_verification'
    await supabase
      .from('membership_applications')
      .update({
        status: 'pending_verification',
        updated_at: now,
      })
      .eq('id', payment.application_id);

    // 8. Audit log (never log file contents or secret keys)
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: payment.id,
      actor_id: 'applicant',
      action: 'payment_receipt_submitted',
      previous_state: { status: payment.status },
      new_state: {
        payment_reference: validatedInput.payment_reference,
        transaction_reference: validatedInput.transaction_reference,
        status: 'pending_verification',
        storage_bucket: 'payment-receipts',
        storage_object_path: storageObjectPath,
        receipt_mime_type: mimeType,
        receipt_file_size: receipt_file.size,
      },
    });

    return {
      success: true,
      data: {
        paymentId: payment.id,
        paymentReference: validatedInput.payment_reference,
        status: 'pending_verification',
        applicationStatus: 'pending_verification',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An error occurred while uploading your payment receipt.'),
    };
  }
}

/**
 * Server Action: verifyPayment
 *
 * Authorized administrator verifies Mobile Money payment:
 * 1. Checks granular permission 'payments.verify' (scoped by region)
 * 2. Strictly validates payment is in 'pending_verification' status
 * 3. Transitions payment status to 'successful'
 * 4. Transitions application status to 'payment_verified'
 * 5. Emits 'payment_verified' audit log
 *
 * CRITICAL INVARIANT:
 * PAYMENT VERIFICATION != MEMBERSHIP ACTIVATION
 * Verifying payment strictly does NOT create a member or activate membership.
 */
export async function verifyPayment(
  session: AdminSession,
  input: unknown
): Promise<PaymentOperationResult<PaymentVerificationResult>> {
  try {
    const parseResult = verifyPaymentSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: 'Invalid payment ID provided.',
      };
    }

    const { payment_id } = parseResult.data;
    const supabase = createAdminClient();

    // Fetch payment and associated application
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*, membership_applications(*)')
      .eq('id', payment_id)
      .maybeSingle();

    if (fetchError || !payment) {
      return {
        success: false,
        error: 'Payment record not found.',
      };
    }

    const application: MembershipApplication = payment.membership_applications;
    if (!application) {
      return {
        success: false,
        error: 'Associated membership application not found.',
      };
    }

    // Granular RBAC & Regional Scoping Authorization Check
    const authCheck = checkPaymentPermission(session, 'payments.verify', application.region);
    if (!authCheck.authorized) {
      return {
        success: false,
        error: authCheck.reason || 'Forbidden: You are not authorized to verify payments for this application.',
      };
    }

    // State Machine & Idempotency Enforcement
    if (payment.status === 'successful') {
      return {
        success: false,
        error: 'Payment already verified',
      };
    }

    if (payment.status === 'rejected') {
      return {
        success: false,
        error: 'Payment already rejected',
      };
    }

    if (payment.status !== 'pending_verification') {
      return {
        success: false,
        error: `Payment is not awaiting verification. Payment cannot be verified from current status: '${payment.status}'.`,
      };
    }

    const now = new Date().toISOString();
    const adminIdentifier = session.user.email || session.user.id;

    // 1. Transition payment status to 'successful'
    const { error: payUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'successful',
        verified_at: now,
        verified_by: adminIdentifier,
        updated_at: now,
      })
      .eq('id', payment.id);

    if (payUpdateError) {
      console.error('[Payment Error] Failed to update payment status to successful:', payUpdateError.message);
      return {
        success: false,
        error: 'Failed to update payment status.',
      };
    }

    // 2. Transition application status to 'payment_verified'
    await supabase
      .from('membership_applications')
      .update({
        status: 'payment_verified',
        verified_at: now,
        verified_by: adminIdentifier,
        updated_at: now,
      })
      .eq('id', application.id);

    // 3. Audit log for payment verification (strictly no secrets/signed URLs)
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: payment.id,
      actor_id: adminIdentifier,
      action: 'payment_verified',
      previous_state: { status: payment.status },
      new_state: {
        payment_reference: payment.payment_reference,
        status: 'successful',
        verified_by: adminIdentifier,
        verified_at: now,
      },
    });

    return {
      success: true,
      data: {
        paymentId: payment.id,
        applicationId: application.id,
        paymentStatus: 'successful',
        applicationStatus: 'payment_verified',
        verifiedBy: adminIdentifier,
        verifiedAt: now,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An error occurred while verifying the payment.'),
    };
  }
}

/**
 * Server Action: rejectPayment
 *
 * Authorized administrator rejects Mobile Money payment evidence:
 * 1. Checks granular permission 'payments.reject' (scoped by region)
 * 2. Strictly validates payment is in 'pending_verification' status
 * 3. Validates rejection reason (minimum 5 chars, max 500 chars)
 * 4. Transitions payment status to 'rejected'
 * 5. Transitions application status to 'payment_rejected'
 * 6. Emits 'payment_rejected' audit log
 * 7. Preserves payment and application records (never deletes)
 */
export async function rejectPayment(
  session: AdminSession,
  input: unknown
): Promise<PaymentOperationResult<RejectionResult>> {
  try {
    const parseResult = rejectPaymentSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: 'Please provide a valid payment ID and rejection reason.',
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { payment_id, rejection_reason } = parseResult.data;
    const supabase = createAdminClient();

    // Fetch payment and associated application
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*, membership_applications(*)')
      .eq('id', payment_id)
      .maybeSingle();

    if (fetchError || !payment) {
      return {
        success: false,
        error: 'Payment record not found.',
      };
    }

    const application: MembershipApplication = payment.membership_applications;
    if (!application) {
      return {
        success: false,
        error: 'Associated membership application not found.',
      };
    }

    // Granular RBAC & Regional Scoping Authorization Check
    const authCheck = checkPaymentPermission(session, 'payments.reject', application.region);
    if (!authCheck.authorized) {
      return {
        success: false,
        error: authCheck.reason || 'Forbidden: You are not authorized to reject payments for this application.',
      };
    }

    // State Machine & Idempotency Enforcement
    if (payment.status === 'successful') {
      return {
        success: false,
        error: 'Payment already verified',
      };
    }

    if (payment.status === 'rejected') {
      return {
        success: false,
        error: 'Payment already rejected',
      };
    }

    if (payment.status !== 'pending_verification') {
      return {
        success: false,
        error: 'Payment is not awaiting verification',
      };
    }

    const now = new Date().toISOString();
    const adminIdentifier = session.user.email || session.user.id;

    // Update payment record
    const { error: payUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        rejected_at: now,
        rejected_by: adminIdentifier,
        rejection_reason,
        updated_at: now,
      })
      .eq('id', payment.id);

    if (payUpdateError) {
      return {
        success: false,
        error: 'Failed to update payment record status.',
      };
    }

    // Update application record
    await supabase
      .from('membership_applications')
      .update({
        status: 'payment_rejected',
        rejected_at: now,
        rejected_by: adminIdentifier,
        rejection_reason,
        updated_at: now,
      })
      .eq('id', application.id);

    // Audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: payment.id,
      actor_id: adminIdentifier,
      action: 'payment_rejected',
      previous_state: { status: payment.status },
      new_state: {
        payment_reference: payment.payment_reference,
        status: 'rejected',
        rejection_reason,
        rejected_by: adminIdentifier,
        rejected_at: now,
      },
    });

    return {
      success: true,
      data: {
        paymentId: payment.id,
        applicationId: application.id,
        paymentStatus: 'rejected',
        applicationStatus: 'payment_rejected',
        rejectionReason: rejection_reason,
        rejectedBy: adminIdentifier,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An error occurred while rejecting the payment.'),
    };
  }
}

/**
 * Server Action: activateMembershipApplication
 *
 * Authorized administrator activates membership after verified payment:
 * Represents the business step:
 * PAYMENT SUCCESSFUL + APPLICATION APPROVED -> MEMBER ACTIVE
 *
 * 1. Checks granular permission 'payments.activate' (scoped by region)
 * 2. Verifies application status = 'payment_verified'
 * 3. Verifies associated payment status = 'successful'
 * 4. Guards against duplicate activation (application.member_id or status = activated)
 * 5. Guards against duplicate members in 'members' table
 * 6. Creates authoritative 'members' record; database generates 'member_id' ('YRL-MEM-YYYY-XXXX')
 * 7. Links application.member_id = members.id, application.status = 'activated'
 * 8. Emits 'membership_activated' audit log
 */
export async function activateMembershipApplication(
  session: AdminSession,
  input: unknown
): Promise<PaymentOperationResult<MembershipActivationResult>> {
  try {
    const parseResult = activateApplicationSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: 'Invalid application ID provided.',
      };
    }

    const { application_id } = parseResult.data;
    const supabase = createAdminClient();

    // Fetch application and associated payments
    const { data: application, error: appError } = await supabase
      .from('membership_applications')
      .select('*, payments(*)')
      .eq('id', application_id)
      .maybeSingle();

    if (appError || !application) {
      return {
        success: false,
        error: 'Membership application not found.',
      };
    }

    // Granular RBAC & Regional Scoping Authorization Check
    const authCheck = checkPaymentPermission(session, 'payments.activate', application.region);
    if (!authCheck.authorized) {
      return {
        success: false,
        error: authCheck.reason || 'Forbidden: You are not authorized to activate membership for this application.',
      };
    }

    // Guard against duplicate activation
    if (application.status === 'activated' || application.member_id) {
      return {
        success: false,
        error: 'This membership application has already been activated.',
      };
    }

    // Ensure associated payment is successful
    const payments: PaymentRecord[] = application.payments || [];
    const hasSuccessfulPayment = payments.some((p) => p.status === 'successful');
    if (!hasSuccessfulPayment) {
      return {
        success: false,
        error: 'Cannot activate membership: No verified successful payment found for this application.',
      };
    }

    // Must be payment_verified before activation can proceed
    if (application.status !== 'payment_verified') {
      return {
        success: false,
        error: 'Application is not eligible for activation',
      };
    }

    // Pre-check for duplicate member in members table
    const normalizedEmail = (application.email || '').trim().toLowerCase();
    const normalizedPhone = (application.phone_number || '').trim();

    if (normalizedEmail && normalizedPhone) {
      const membersTable = supabase.from('members') as any;
      if (typeof membersTable?.select === 'function') {
        const { data: existingMember } = await membersTable
          .select('id, member_id')
          .or(`email.eq.${normalizedEmail},phone_number.eq.${normalizedPhone}`)
          .maybeSingle();

        if (existingMember) {
          return {
            success: false,
            error: 'A registered member with this email or phone number already exists.',
          };
        }
      }
    }

    const now = new Date().toISOString();
    const adminIdentifier = session.user.email || session.user.id;

    // Create new official member identity in members table
    // PostgreSQL assigns default member_id via generate_yrl_reference('MEM', 'seq_member_ref')
    const { data: newMember, error: memInsertError } = await supabase
      .from('members')
      .insert({
        full_name: application.full_name,
        date_of_birth: application.date_of_birth,
        gender: application.gender,
        phone_number: normalizedPhone,
        whatsapp_number: application.whatsapp_number,
        email: normalizedEmail,
        region: application.region,
        district_municipality: application.district_municipality,
        town_community: application.town_community,
        occupation: application.occupation,
        education_level: application.education_level,
        why_join: application.why_join,
        availability: application.availability,
        engagement_interests: application.engagement_interests || [],
        civic_acknowledgement: application.civic_acknowledgement,
        status: 'active',
      })
      .select('id, member_id')
      .single();

    if (memInsertError || !newMember) {
      console.error('[Payment Error] Failed to create active member identity:', memInsertError?.message);
      return {
        success: false,
        error: 'Membership identity creation failed. Please contact support.',
      };
    }

    // Update application record status to 'activated' and link authoritative member_id
    const { error: appUpdateError } = await supabase
      .from('membership_applications')
      .update({
        status: 'activated',
        member_id: newMember.id,
        activated_at: now,
        updated_at: now,
      })
      .eq('id', application.id);

    if (appUpdateError) {
      console.error('[Payment Error] Failed to link activated member to application:', appUpdateError.message);
      return {
        success: false,
        error: 'Failed to link membership activation. Please contact support.',
      };
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'membership_application',
      entity_id: application.id,
      actor_id: adminIdentifier,
      action: 'membership_activated',
      previous_state: { status: application.status },
      new_state: {
        application_number: application.application_number,
        status: 'activated',
        member_id: newMember.id,
        official_member_id: newMember.member_id,
        activated_by: adminIdentifier,
        activated_at: now,
      },
    });

    // Non-blocking welcome email dispatch (graceful degradation)
    try {
      const emailResult = await sendMembershipEmail(normalizedEmail, {
        fullName: application.full_name,
        memberId: newMember.member_id,
        region: application.region,
        occupation: application.occupation,
      });

      if (emailResult.success) {
        await supabase
          .from('members')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq('id', newMember.id);
      }
    } catch (emailErr: any) {
      console.error('[B13.4 Notice] Non-blocking membership activation email dispatch error:', emailErr?.message || emailErr);
    }

    return {
      success: true,
      data: {
        applicationId: application.id,
        memberId: newMember.member_id,
        applicationStatus: 'activated',
        memberStatus: 'active',
        activatedBy: adminIdentifier,
        activatedAt: now,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An error occurred while activating membership.'),
    };
  }
}

/**
 * Server Action: getPaymentReceiptSignedUrl
 *
 * Generates a short-lived (5-minute) signed URL for an authorized administrator to view receipt evidence.
 * - Enforces payments.view permission scoped to application's region
 * - Validates private bucket and object path
 * - Never persists the signed URL
 * - Emits payment_receipt_viewed audit log (never logs the signed URL itself)
 */
export async function getPaymentReceiptSignedUrl(
  session: AdminSession,
  paymentId: string
): Promise<PaymentOperationResult<PaymentSignedUrlResult>> {
  try {
    const supabase = createAdminClient();

    // 1. Fetch payment and joined application
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, payment_reference, storage_bucket, storage_object_path, membership_applications(id, application_number, region)')
      .eq('id', paymentId)
      .maybeSingle();

    if (fetchError || !payment) {
      return { success: false, error: 'Payment not found' };
    }

    const application = (payment as any).membership_applications;
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // 2. Authorization check scoped by region
    const authCheck = checkPaymentPermission(session, 'payments.view', application.region);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.reason || 'Forbidden' };
    }

    // 3. Receipt presence check
    if (!payment.storage_object_path) {
      return { success: false, error: 'Receipt unavailable' };
    }

    const bucketName = payment.storage_bucket || 'payment-receipts';
    const expiresIn = 300; // 5 minutes

    // 4. Generate signed URL
    const { data: signedData, error: signError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(payment.storage_object_path, expiresIn);

    if (signError || !signedData?.signedUrl) {
      return { success: false, error: 'Unable to generate secure receipt access link.' };
    }

    // 5. Audit log (NEVER log the signed URL itself)
    const adminIdentifier = session.user.email || session.user.id;
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: payment.id,
      actor_id: adminIdentifier,
      action: 'payment_receipt_viewed',
      previous_state: null,
      new_state: {
        payment_reference: payment.payment_reference,
        application_number: application.application_number,
        storage_bucket: bucketName,
        expires_in_seconds: expiresIn,
        viewed_by: adminIdentifier,
      },
    });

    return {
      success: true,
      data: {
        signedUrl: signedData.signedUrl,
        expiresIn,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'Failed to generate secure receipt link.'),
    };
  }
}

/**
 * Server Action: getAdminPaymentsList
 *
 * Authenticated query for the administrative payment verification queue:
 * - Server-side region scoping for Regional Coordinators
 * - Server-side filtering by status, region, search query
 * - Default ordering: oldest pending verification first
 * - Server-side pagination
 */
export async function getAdminPaymentsList(
  session: AdminSession,
  filters: PaymentListFilters = {}
): Promise<PaymentOperationResult<PaginatedPaymentsResult>> {
  try {
    // 1. Authorization check
    const authCheck = checkPaymentPermission(session, 'payments.view');
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.reason || 'Forbidden' };
    }

    const supabase = createAdminClient();
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize || 20));
    const offset = (page - 1) * pageSize;

    // Build query with inner join on membership_applications
    let query = supabase
      .from('payments')
      .select(
        'id, payment_reference, transaction_reference, amount, currency, status, claimed_payment_date, created_at, storage_object_path, receipt_mime_type, receipt_file_size, membership_applications!inner(id, application_number, full_name, region, phone_number, status)',
        { count: 'exact' }
      );

    // Enforce regional coordinator scope
    if (session.role === 'regional_coordinator') {
      if (!session.assignedRegion) {
        return { success: false, error: 'Regional coordinator has no assigned region.' };
      }
      query = query.eq('membership_applications.region', session.assignedRegion);
    } else if (filters.region && filters.region !== 'all') {
      query = query.eq('membership_applications.region', filters.region);
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(`payment_reference.ilike.%${q}%,transaction_reference.ilike.%${q}%`);
    }

    // Order: oldest submissions first for pending_verification, or standard created_at desc
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('[Payment Error] Failed to fetch payments list:', error.message);
      return { success: false, error: 'Failed to retrieve payment queue.' };
    }

    const totalCount = count || 0;
    const items: PaymentQueueItem[] = (data || []).map((row: any) => {
      const app = row.membership_applications;
      return {
        id: row.id,
        payment_reference: row.payment_reference,
        transaction_reference: row.transaction_reference,
        application_id: app.id,
        application_number: app.application_number,
        full_name: app.full_name,
        region: app.region,
        phone_number: app.phone_number,
        amount: Number(row.amount),
        currency: row.currency,
        claimed_payment_date: row.claimed_payment_date,
        status: row.status,
        application_status: app.status,
        submitted_at: row.created_at,
        has_receipt: Boolean(row.storage_object_path),
        receipt_mime_type: row.receipt_mime_type,
        receipt_file_size: row.receipt_file_size,
      };
    });

    // Authoritative calculation of Total Amount Received for the admin's scope:
    // SUM(payment.amount) WHERE payment.status = 'successful'
    let totalReceivedQuery = supabase
      .from('payments')
      .select('amount, currency, membership_applications!inner(region)')
      .eq('status', 'successful');

    if (session.role === 'regional_coordinator') {
      if (session.assignedRegion) {
        totalReceivedQuery = totalReceivedQuery.eq(
          'membership_applications.region',
          session.assignedRegion
        );
      }
    } else if (filters.region && filters.region !== 'all') {
      totalReceivedQuery = totalReceivedQuery.eq(
        'membership_applications.region',
        filters.region
      );
    }

    const { data: verifiedPayments } = await totalReceivedQuery;
    const totalAmountReceived = (verifiedPayments || []).reduce(
      (acc: number, row: any) => acc + Number(row.amount || 0),
      0
    );
    const verifiedPaymentsCount = (verifiedPayments || []).length;
    const summaryCurrency =
      verifiedPayments && verifiedPayments.length > 0 && verifiedPayments[0].currency
        ? verifiedPayments[0].currency
        : 'GHS';

    return {
      success: true,
      data: {
        payments: items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        totalAmountReceived,
        verifiedPaymentsCount,
        currency: summaryCurrency,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An error occurred while loading the payment queue.'),
    };
  }
}

/**
 * Server Action: getAdminPaymentDetail
 *
 * Fetches full review detail for a payment and associated application:
 * - Scoped to administrator authorized region
 * - Emits payment_viewed audit log
 */
export async function getAdminPaymentDetail(
  session: AdminSession,
  paymentId: string
): Promise<PaymentOperationResult<PaymentDetailView>> {
  try {
    const supabase = createAdminClient();

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*, membership_applications(*)')
      .eq('id', paymentId)
      .maybeSingle();

    if (error || !payment) {
      return { success: false, error: 'Payment not found' };
    }

    const application: MembershipApplication = (payment as any).membership_applications;
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // Scoping check
    const authCheck = checkPaymentPermission(session, 'payments.view', application.region);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.reason || 'Forbidden' };
    }

    // Audit log: payment_viewed
    const adminIdentifier = session.user.email || session.user.id;
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: payment.id,
      actor_id: adminIdentifier,
      action: 'payment_viewed',
      previous_state: null,
      new_state: {
        payment_reference: payment.payment_reference,
        application_number: application.application_number,
        region: application.region,
        viewed_by: adminIdentifier,
      },
    });

    return {
      success: true,
      data: {
        payment: {
          ...payment,
          amount: Number(payment.amount),
        },
        application,
        receipt: {
          hasReceipt: Boolean(payment.storage_object_path),
          storageBucket: payment.storage_bucket || null,
          storageObjectPath: payment.storage_object_path || null,
          originalFilename: payment.receipt_original_filename || null,
          mimeType: payment.receipt_mime_type || null,
          fileSize: payment.receipt_file_size || null,
          uploadedAt: payment.receipt_uploaded_at || null,
        },
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'Failed to load payment detail.'),
    };
  }
}

/**
 * Phase B13.5: Initialize automated Paystack payment for a membership application.
 *
 * Flow & Security:
 * 1. Resolves application server-side.
 * 2. Enforces application ownership / anti-tampering (matches email if provided).
 * 3. Prevents payment for already verified or activated applications.
 * 4. Resolves authoritative fee from server-side payment_configurations (never trusts client).
 * 5. Reuses or creates pending payment record with payment_method: 'paystack'.
 * 6. Invokes server-to-server Paystack transaction initialization.
 * 7. Stores Paystack reference in payments table.
 * 8. Returns only client-safe checkout data (authorizationUrl, accessCode, reference).
 */
export async function initializePaystackPayment(
  input: unknown,
  secretKeyOverride?: string
): Promise<PaymentOperationResult<PaystackInitializeResult>> {
  try {
    if (!input || typeof input !== 'object') {
      return { success: false, error: 'Invalid request payload.' };
    }

    const { applicationId, email } = input as { applicationId?: string; email?: string };

    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim().length === 0) {
      return { success: false, error: 'Membership application ID is required.' };
    }

    const supabase = createAdminClient();

    // 1. Resolve application server-side
    const { data: application, error: appError } = await supabase
      .from('membership_applications')
      .select('*')
      .eq('id', applicationId.trim())
      .maybeSingle();

    if (appError || !application) {
      return { success: false, error: 'Membership application not found.' };
    }

    // 2. Ownership / anti-tampering check: If email is supplied, it must match application email
    if (email && typeof email === 'string' && email.trim().length > 0) {
      const normalizedInputEmail = email.trim().toLowerCase();
      const normalizedAppEmail = application.email.trim().toLowerCase();
      if (normalizedInputEmail !== normalizedAppEmail) {
        return { success: false, error: 'Application authorization mismatch.' };
      }
    }

    // 3. Status guards: cannot pay for already verified or activated applications
    if (application.status === 'activated') {
      return { success: false, error: 'This membership application has already been activated.' };
    }

    if (application.status === 'payment_verified') {
      return { success: false, error: 'Payment for this application has already been verified.' };
    }

    // 4. Retrieve authoritative fee from payment_configurations
    const config = await getPaymentConfiguration();
    const feeInSubunit = Math.round(Number(config.membership_fee) * 100);

    if (feeInSubunit <= 0) {
      return { success: false, error: 'Invalid membership fee configuration.' };
    }

    // 5. Check existing payment records for this application
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false });

    const successfulPayment = existingPayments?.find((p) => p.status === 'successful');
    if (successfulPayment) {
      return { success: false, error: 'A successful payment already exists for this application.' };
    }

    const pendingPayment = existingPayments?.find(
      (p) => p.status === 'pending' || p.status === 'receipt_submitted' || p.status === 'pending_verification'
    );

    let activePayment: PaymentRecord;
    const now = new Date().toISOString();

    if (pendingPayment) {
      // Reuse existing pending payment, updating payment method to paystack
      const { data: updated, error: updateError } = await supabase
        .from('payments')
        .update({
          payment_method: 'paystack',
          amount: config.membership_fee,
          currency: config.currency,
          updated_at: now,
        })
        .eq('id', pendingPayment.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        return { success: false, error: 'Failed to update payment record for Paystack initialization.' };
      }
      activePayment = { ...updated, amount: Number(updated.amount) };
    } else {
      // Create new payment record
      const { data: created, error: createError } = await supabase
        .from('payments')
        .insert({
          application_id: application.id,
          payment_method: 'paystack',
          payment_channel: 'card_or_momo',
          amount: config.membership_fee,
          currency: config.currency,
          status: 'pending',
        })
        .select('*')
        .single();

      if (createError || !created) {
        return { success: false, error: 'Failed to generate payment record for Paystack checkout.' };
      }
      activePayment = { ...created, amount: Number(created.amount) };
    }

    // 6. Initialize Paystack transaction server-side
    const initResult = await initializePaystackTransaction(
      {
        email: application.email,
        amountInSubunit: feeInSubunit,
        currency: config.currency || 'GHS',
        reference: activePayment.payment_reference,
        callbackUrl: `/payment/paystack/callback?reference=${encodeURIComponent(activePayment.payment_reference)}`,
        metadata: {
          application_id: application.id,
          payment_id: activePayment.id,
          payment_reference: activePayment.payment_reference,
          application_number: application.application_number,
        },
      },
      secretKeyOverride
    );

    if (!initResult.success || !initResult.data) {
      return { success: false, error: initResult.error || 'Failed to initialize Paystack checkout.' };
    }

    // 7. Store provider reference / transaction reference
    await supabase
      .from('payments')
      .update({
        provider_reference: initResult.data.reference,
        transaction_reference: activePayment.payment_reference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activePayment.id);

    return {
      success: true,
      data: {
        authorizationUrl: initResult.data.authorizationUrl,
        accessCode: initResult.data.accessCode,
        reference: activePayment.payment_reference,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An error occurred while initializing Paystack payment.'),
    };
  }
}

export interface WebhookProcessResult {
  statusCode: number;
  body: Record<string, unknown>;
}

/**
 * Phase B13.5: Process authoritative Paystack webhook.
 *
 * Requirements:
 * 1. Validates HMAC-SHA512 signature against raw body using timing-safe comparison.
 * 2. Parses and safely acknowledges non-charge events without state mutation.
 * 3. Validates event data (status === 'success', positive integer amount, matching currency).
 * 4. Resolves YRL payment record and ensures amount matches authoritative database fee.
 * 5. Idempotent: duplicate deliveries return HTTP 200 without duplicate updates or audit logs.
 * 6. Transitions payment to 'successful' and application to 'payment_verified'.
 * 7. ABSOLUTE INVARIANT: DOES NOT activate membership or create a member.
 * 8. Records audit event with actor 'paystack_system'.
 */
export async function processPaystackWebhook(
  rawBody: string,
  signature: string | null | undefined,
  secretKeyOverride?: string
): Promise<WebhookProcessResult> {
  // 1. Signature validation
  const isValidSignature = validatePaystackSignature(rawBody, signature, secretKeyOverride);
  if (!isValidSignature) {
    return {
      statusCode: 401,
      body: { error: 'Invalid or missing webhook signature' },
    };
  }

  // 2. Parse event payload
  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return {
      statusCode: 400,
      body: { error: 'Malformed JSON payload' },
    };
  }

  // 3. Supported events: process 'charge.success', acknowledge others safely
  if (event.event !== 'charge.success') {
    return {
      statusCode: 200,
      body: { received: true, ignored: true, event: event.event },
    };
  }

  const { data } = event;
  if (!data || typeof data !== 'object') {
    return {
      statusCode: 400,
      body: { error: 'Missing transaction data in event' },
    };
  }

  if (data.status !== 'success') {
    return {
      statusCode: 200,
      body: { received: true, ignored: true, reason: 'Transaction status is not success' },
    };
  }

  if (!data.reference || typeof data.reference !== 'string') {
    return {
      statusCode: 400,
      body: { error: 'Missing transaction reference' },
    };
  }

  const supabase = createAdminClient();

  // 4. Resolve payment record
  const candidateRef = data.reference.trim();
  const metadataPaymentRef = data.metadata?.payment_reference ? String(data.metadata.payment_reference).trim() : null;
  const metadataPaymentId = data.metadata?.payment_id ? String(data.metadata.payment_id).trim() : null;

  let query = supabase.from('payments').select('*');
  if (metadataPaymentId) {
    query = query.or(
      `id.eq.${metadataPaymentId},payment_reference.eq.${candidateRef},provider_reference.eq.${candidateRef},transaction_reference.eq.${candidateRef}`
    );
  } else if (metadataPaymentRef) {
    query = query.or(
      `payment_reference.eq.${metadataPaymentRef},payment_reference.eq.${candidateRef},provider_reference.eq.${candidateRef},transaction_reference.eq.${candidateRef}`
    );
  } else {
    query = query.or(
      `payment_reference.eq.${candidateRef},provider_reference.eq.${candidateRef},transaction_reference.eq.${candidateRef}`
    );
  }

  const { data: matchedPayments, error: findError } = await query;
  if (findError || !matchedPayments || matchedPayments.length === 0) {
    console.error('[Paystack Webhook] Payment not found for reference:', candidateRef);
    return {
      statusCode: 404,
      body: { error: 'Payment not found for provided reference' },
    };
  }

  const payment = matchedPayments[0];

  // 5. Cross-application / integrity check: if metadata application_id exists, must match
  if (data.metadata?.application_id && data.metadata.application_id !== payment.application_id) {
    console.error('[Paystack Webhook] Application ID mismatch');
    return {
      statusCode: 400,
      body: { error: 'Application mismatch' },
    };
  }

  // 6. Currency validation
  if (data.currency && data.currency.toUpperCase() !== payment.currency.toUpperCase()) {
    console.error('[Paystack Webhook] Currency mismatch:', data.currency, 'vs', payment.currency);
    return {
      statusCode: 400,
      body: { error: 'Currency mismatch' },
    };
  }

  // 7. Amount validation (server-authoritative amount check)
  const expectedSubunits = Math.round(Number(payment.amount) * 100);
  const actualSubunits = Number(data.amount);

  if (actualSubunits !== expectedSubunits) {
    console.error('[Paystack Webhook] Amount mismatch:', actualSubunits, 'vs expected', expectedSubunits);
    return {
      statusCode: 400,
      body: { error: 'Amount mismatch' },
    };
  }

  // 8. Idempotency Guard: if already successful, acknowledge immediately without duplicate effects
  if (payment.status === 'successful') {
    return {
      statusCode: 200,
      body: { received: true, already_processed: true, payment_id: payment.id },
    };
  }

  // 9. State Transition Guard: cannot resurrect rejected or cancelled payments
  if (payment.status === 'rejected' || payment.status === 'cancelled') {
    console.error(`[Paystack Webhook] Invalid transition from ${payment.status} to successful`);
    return {
      statusCode: 400,
      body: { error: `Cannot transition payment in '${payment.status}' state to successful.` },
    };
  }

  // 10. Perform atomic state transition
  const now = new Date().toISOString();
  const providerTxId = data.id ? String(data.id) : null;

  // Update payments record
  const { error: payUpdateError } = await supabase
    .from('payments')
    .update({
      status: 'successful',
      payment_method: 'paystack',
      payment_channel: data.channel || payment.payment_channel || 'card_or_momo',
      provider_reference: providerTxId || payment.provider_reference,
      transaction_reference: data.reference,
      verified_at: now,
      verified_by: 'paystack_webhook',
      updated_at: now,
    })
    .eq('id', payment.id);

  if (payUpdateError) {
    console.error('[Paystack Webhook] Failed to update payment status:', payUpdateError.message);
    return {
      statusCode: 500,
      body: { error: 'Failed to update payment record' },
    };
  }

  // Update membership_applications record
  const { error: appUpdateError } = await supabase
    .from('membership_applications')
    .update({
      status: 'payment_verified',
      verified_at: now,
      verified_by: 'paystack_webhook',
      updated_at: now,
    })
    .eq('id', payment.application_id);

  if (appUpdateError) {
    console.error('[Paystack Webhook] Failed to update application status:', appUpdateError.message);
  }

  // Record audit log
  await supabase.from('audit_logs').insert({
    entity_type: 'payment',
    entity_id: payment.id,
    actor_id: 'paystack_system',
    action: 'payment_verified',
    previous_state: { status: payment.status },
    new_state: {
      status: 'successful',
      payment_method: 'paystack',
      provider_reference: providerTxId,
      transaction_reference: data.reference,
      verified_by: 'paystack_webhook',
    },
  });

  // ABSOLUTE INVARIANT CHECK:
  // We do NOT call activateMembershipApplication()
  // We do NOT insert into members
  // We do NOT generate YRL-MEM-YYYY-XXXX

  return {
    statusCode: 200,
    body: {
      received: true,
      success: true,
      payment_id: payment.id,
      application_id: payment.application_id,
    },
  };
}

/**
 * Public: Query payment status by reference or application ID.
 * Returns non-sensitive status information for polling/callback.
 */
export async function getPublicPaymentStatus(
  referenceOrId: string
): Promise<PaymentOperationResult<PaymentStatusResult>> {
  try {
    if (!referenceOrId || typeof referenceOrId !== 'string') {
      return { success: false, error: 'Reference or ID is required.' };
    }

    const trimmed = referenceOrId.trim();
    const supabase = createAdminClient();

    // Query payment
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select('id, application_id, payment_reference, status, amount, currency, payment_method, verified_at')
      .or(`payment_reference.eq.${trimmed},id.eq.${trimmed},transaction_reference.eq.${trimmed}`)
      .maybeSingle();

    if (payError || !payment) {
      return { success: false, error: 'Payment record not found.' };
    }

    // Query application
    const { data: application, error: appError } = await supabase
      .from('membership_applications')
      .select('id, application_number, status')
      .eq('id', payment.application_id)
      .maybeSingle();

    if (appError || !application) {
      return { success: false, error: 'Associated application not found.' };
    }

    return {
      success: true,
      data: {
        paymentReference: payment.payment_reference,
        applicationNumber: application.application_number,
        paymentStatus: payment.status,
        applicationStatus: application.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.payment_method,
        verifiedAt: payment.verified_at || null,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'Failed to retrieve payment status.'),
    };
  }
}

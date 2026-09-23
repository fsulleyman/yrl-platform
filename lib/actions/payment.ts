'use server';

/**
 * Phase B13.2 & B13.3: Payment & Membership Server Actions
 * Next.js Server Actions entrypoint for public membership applications, receipt uploads,
 * admin payment verification, rejection, and membership activation.
 * Explicitly boundary-isolated with 'use server' directive for App Router Turbopack builds.
 */

import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/lib/auth/server';
import {
  createMembershipApplication as serviceCreateMembershipApplication,
  submitApplicantReceipt as serviceSubmitApplicantReceipt,
  getPublicPaymentInstructions as serviceGetPublicPaymentInstructions,
  verifyPayment as serviceVerifyPayment,
  rejectPayment as serviceRejectPayment,
  activateMembershipApplication as serviceActivateMembershipApplication,
  getPaymentReceiptSignedUrl as serviceGetPaymentReceiptSignedUrl,
  getAdminPaymentsList as serviceGetAdminPaymentsList,
  getAdminPaymentDetail as serviceGetAdminPaymentDetail,
  initializePaystackPayment as serviceInitializePaystackPayment,
  getPublicPaymentStatus as serviceGetPublicPaymentStatus,
} from '@/lib/payment/service';
import type {
  PaymentOperationResult,
  ApplicationSubmissionResult,
  ReceiptSubmissionResult,
  PaymentInstructions,
  PaymentVerificationResult,
  RejectionResult,
  MembershipActivationResult,
  PaymentSignedUrlResult,
  PaymentListFilters,
  PaginatedPaymentsResult,
  PaymentDetailView,
  PaystackInitializeResult,
  PaymentStatusResult,
} from '@/lib/payment/types';

/**
 * Public: Server Action to submit an applicant membership application.
 */
export async function createMembershipApplication(
  data: unknown
): Promise<PaymentOperationResult<ApplicationSubmissionResult>> {
  return serviceCreateMembershipApplication(data);
}

/**
 * Public: Server Action to submit applicant Mobile Money receipt file and metadata.
 */
export async function submitApplicantReceipt(
  formData: FormData
): Promise<PaymentOperationResult<ReceiptSubmissionResult>> {
  return serviceSubmitApplicantReceipt(formData);
}

/**
 * Public: Server Action to fetch public payment instructions.
 */
export async function getPublicPaymentInstructions(): Promise<
  PaymentInstructions & { membershipFee: number; currency: string }
> {
  return serviceGetPublicPaymentInstructions();
}

/**
 * Admin: Server Action to verify a Mobile Money payment.
 * Strict prerequisite: payment.status === 'pending_verification'.
 * Does NOT activate membership.
 */
export async function verifyPaymentAction(
  paymentId: string
): Promise<PaymentOperationResult<PaymentVerificationResult>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: Administrative login required.' };
  }

  const result = await serviceVerifyPayment(session, { payment_id: paymentId });
  if (result.success) {
    revalidatePath('/admin/payments');
    revalidatePath(`/admin/payments/${paymentId}`);
  }
  return result;
}

/**
 * Admin: Server Action to reject a Mobile Money payment.
 * Requires mandatory rejection reason.
 */
export async function rejectPaymentAction(
  paymentId: string,
  rejectionReason: string
): Promise<PaymentOperationResult<RejectionResult>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: Administrative login required.' };
  }

  const result = await serviceRejectPayment(session, {
    payment_id: paymentId,
    rejection_reason: rejectionReason,
  });
  if (result.success) {
    revalidatePath('/admin/payments');
    revalidatePath(`/admin/payments/${paymentId}`);
  }
  return result;
}

/**
 * Admin: Server Action to activate membership for a verified application.
 * Strict prerequisite: application.status === 'payment_verified' and payment.status === 'successful'.
 */
export async function activateMembershipApplicationAction(
  applicationId: string
): Promise<PaymentOperationResult<MembershipActivationResult>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: Administrative login required.' };
  }

  const result = await serviceActivateMembershipApplication(session, {
    application_id: applicationId,
  });
  if (result.success) {
    revalidatePath('/admin/payments');
    revalidatePath('/admin');
  }
  return result;
}

/**
 * Admin: Server Action to generate a short-lived (5-minute) signed URL for private receipt viewing.
 */
export async function getPaymentReceiptSignedUrlAction(
  paymentId: string
): Promise<PaymentOperationResult<PaymentSignedUrlResult>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: Administrative login required.' };
  }

  return serviceGetPaymentReceiptSignedUrl(session, paymentId);
}

/**
 * Admin: Server Action to fetch the paginated payment verification queue.
 */
export async function getAdminPaymentsListAction(
  filters: PaymentListFilters = {}
): Promise<PaymentOperationResult<PaginatedPaymentsResult>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: Administrative login required.' };
  }

  return serviceGetAdminPaymentsList(session, filters);
}

/**
 * Admin: Server Action to fetch payment review detail.
 */
export async function getAdminPaymentDetailAction(
  paymentId: string
): Promise<PaymentOperationResult<PaymentDetailView>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: Administrative login required.' };
  }

  return serviceGetAdminPaymentDetail(session, paymentId);
}

/**
 * Public / Applicant: Server Action to initialize an automated Paystack transaction.
 * Resolves authoritative fee and application state server-side.
 */
export async function initializePaystackPaymentAction(
  data: unknown
): Promise<PaymentOperationResult<PaystackInitializeResult>> {
  return serviceInitializePaystackPayment(data);
}

/**
 * Public: Server Action to retrieve payment status for callback landing page.
 */
export async function checkPaymentStatusAction(
  referenceOrId: string
): Promise<PaymentOperationResult<PaymentStatusResult>> {
  return serviceGetPublicPaymentStatus(referenceOrId);
}

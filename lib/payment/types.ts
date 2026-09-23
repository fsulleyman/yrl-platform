/**
 * Phase B13.1: Membership Payment Architecture & Database Foundation
 * Authoritative Payment & Application Types
 */

import { type AdminSession } from '@/lib/auth/types';

export const APPLICATION_STATUSES = [
  'payment_not_started',
  'pending_payment',
  'receipt_submitted',
  'pending_verification',
  'payment_verified',
  'payment_rejected',
  'activated',
  'cancelled',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'receipt_submitted',
  'pending_verification',
  'successful',
  'rejected',
  'failed',
  'cancelled',
  'expired',
  'reversed',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'manual_mobile_money',
  'paystack',
  'other_provider',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentConfiguration {
  id: string;
  config_key: string;
  membership_fee: number;
  currency: string;
  momo_number: string | null;
  momo_account_name: string | null;
  momo_instructions: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentInstructions {
  isConfigured: boolean;
  momoNumber: string | null;
  accountName: string | null;
  instructionsText: string;
}

export interface MembershipApplication {
  id: string;
  application_number: string;
  member_id?: string | null;
  full_name: string;
  date_of_birth: string;
  gender?: string | null;
  phone_number: string;
  whatsapp_number?: string | null;
  email: string;
  region: string;
  district_municipality: string;
  town_community: string;
  occupation: string;
  education_level: string;
  why_join: string;
  availability: string;
  engagement_interests: string[];
  civic_acknowledgement: boolean;
  status: ApplicationStatus;
  submitted_at: string;
  verified_at?: string | null;
  verified_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentReceiptMetadata {
  storage_bucket: string;
  storage_object_path: string;
  receipt_original_filename: string;
  receipt_mime_type: string;
  receipt_file_size: number;
  receipt_uploaded_at?: string;
}

export interface PaymentRecord {
  id: string;
  application_id: string;
  payment_reference: string;
  provider_reference?: string | null;
  transaction_reference?: string | null;
  payment_method: PaymentMethod;
  payment_channel?: string | null;
  amount: number;
  currency: string;
  claimed_payment_date?: string | null;
  storage_bucket?: string | null;
  storage_object_path?: string | null;
  receipt_original_filename?: string | null;
  receipt_mime_type?: string | null;
  receipt_file_size?: number | null;
  receipt_uploaded_at?: string | null;
  status: PaymentStatus;
  submitted_at: string;
  verified_at?: string | null;
  verified_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentPermission =
  | 'payments.view'
  | 'payments.verify'
  | 'payments.reject'
  | 'payments.activate'
  | 'payments.export';

export interface PaymentOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface ApplicationSubmissionResult {
  applicationId: string;
  applicationNumber: string;
  paymentReference: string;
  amount: number;
  currency: string;
  instructions: PaymentInstructions | null;
}

export interface ReceiptSubmissionResult {
  paymentId: string;
  paymentReference: string;
  status: PaymentStatus;
  applicationStatus: ApplicationStatus;
}

export interface PaymentVerificationResult {
  paymentId: string;
  applicationId: string;
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationStatus;
  verifiedBy: string;
  verifiedAt: string;
}

export interface MembershipActivationResult {
  applicationId: string;
  memberId: string;
  applicationStatus: ApplicationStatus;
  memberStatus: string;
  activatedBy: string;
  activatedAt: string;
}

export interface RejectionResult {
  paymentId: string;
  applicationId: string;
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationStatus;
  rejectionReason: string;
  rejectedBy: string;
}

export interface PaymentQueueItem {
  id: string;
  payment_reference: string;
  transaction_reference: string | null;
  application_id: string;
  application_number: string;
  full_name: string;
  region: string;
  phone_number: string;
  amount: number;
  currency: string;
  claimed_payment_date: string | null;
  status: PaymentStatus;
  application_status: ApplicationStatus;
  submitted_at: string;
  has_receipt: boolean;
  receipt_mime_type?: string | null;
  receipt_file_size?: number | null;
}

export interface PaymentListFilters {
  status?: string;
  region?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPaymentsResult {
  payments: PaymentQueueItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalAmountReceived?: number;
  verifiedPaymentsCount?: number;
  currency?: string;
}

export interface PaymentSignedUrlResult {
  signedUrl: string;
  expiresIn: number;
}

export interface PaymentDetailView {
  payment: PaymentRecord;
  application: MembershipApplication;
  receipt: {
    hasReceipt: boolean;
    storageBucket: string | null;
    storageObjectPath: string | null;
    originalFilename: string | null;
    mimeType: string | null;
    fileSize: number | null;
    uploadedAt: string | null;
  };
}

export interface PaystackInitializeInput {
  applicationId: string;
  email?: string;
}

export interface PaystackInitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer?: {
      id: number;
      email: string;
    };
    metadata?: Record<string, unknown>;
    paid_at?: string;
    created_at?: string;
    channel?: string;
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel?: string;
    paid_at?: string;
    metadata?: {
      application_id?: string;
      payment_id?: string;
      payment_reference?: string;
      application_number?: string;
      [key: string]: unknown;
    };
    customer?: {
      email?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface PaymentStatusResult {
  paymentReference: string;
  applicationNumber: string;
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  verifiedAt: string | null;
}

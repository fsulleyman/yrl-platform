/**
 * Phase B13.1: Membership Payment Validations
 * Zod validation schemas for applications, payment initiation, receipt metadata, and verification
 */

import { z } from 'zod';
import { GHANA_REGIONS, RegionEnum } from '@/lib/validations/member';
import { APPLICATION_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '@/lib/payment/types';

// Allowed MIME types for uploaded payment receipts
export const ALLOWED_RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

// Maximum allowed receipt file size (5MB in bytes)
export const MAX_RECEIPT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Validation schema for public membership application submission.
 * Reuses candidate profile criteria (18-40 age boundary, regions, etc.).
 */
export const applicationSubmissionSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: 'Enter your full name (minimum 2 characters)' }),
  date_of_birth: z
    .string()
    .min(1, { message: 'Enter your date of birth' })
    .refine(
      (val) => {
        const birthDate = new Date(val);
        if (isNaN(birthDate.getTime())) return false;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= 18 && age <= 40;
      },
      { message: 'Members must be between 18 and 40 years of age' }
    ),
  gender: z.string().optional().nullable(),
  phone_number: z
    .string()
    .trim()
    .min(8, { message: 'Enter a valid phone number (minimum 8 digits)' }),
  whatsapp_number: z.string().trim().optional().nullable(),
  email: z
    .string()
    .trim()
    .email({ message: 'Enter a valid email address' }),
  region: RegionEnum,
  district_municipality: z
    .string()
    .trim()
    .min(2, { message: 'Enter your district or municipality' }),
  town_community: z
    .string()
    .trim()
    .min(2, { message: 'Enter your town or community' }),
  occupation: z
    .string()
    .trim()
    .min(2, { message: 'Enter your occupation' }),
  education_level: z
    .string()
    .min(1, { message: 'Select your highest level of education' }),
  why_join: z
    .string()
    .trim()
    .min(20, { message: 'Please provide at least 20 characters explaining why you wish to join YRL' }),
  availability: z
    .string()
    .min(1, { message: 'Select your availability' }),
  engagement_interests: z.array(z.string()).default([]),
  civic_acknowledgement: z.literal(true, {
    message: 'You must acknowledge the civic statement to register',
  }),
  honeypot: z.string().max(0, { message: 'Bot submission detected' }).optional().default(''),
});

export type ApplicationSubmissionInput = z.infer<typeof applicationSubmissionSchema>;

/**
 * Validation schema for applicant submitting Mobile Money payment evidence.
 */
export const submitReceiptSchema = z.object({
  payment_reference: z
    .string()
    .trim()
    .regex(/^YRL-PAY-\d{4}-\d{4,}$/, { message: 'Invalid payment reference format' }),
  transaction_reference: z
    .string()
    .trim()
    .min(4, { message: 'Transaction reference must be at least 4 characters' })
    .max(50, { message: 'Transaction reference must not exceed 50 characters' }),
  claimed_payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be formatted as YYYY-MM-DD' })
    .optional(),
  storage_bucket: z.string().trim().min(1).default('payment-receipts'),
  storage_object_path: z
    .string()
    .trim()
    .min(5, { message: 'Invalid storage object path' }),
  receipt_original_filename: z
    .string()
    .trim()
    .min(1, { message: 'Original filename required' })
    .max(255),
  receipt_mime_type: z.enum(ALLOWED_RECEIPT_MIME_TYPES, {
    message: 'Receipt must be a JPEG, PNG, WEBP, or PDF file',
  }),
  receipt_file_size: z
    .number()
    .int()
    .positive({ message: 'Receipt file size must be positive' })
    .max(MAX_RECEIPT_FILE_SIZE_BYTES, { message: 'Receipt file size cannot exceed 5MB' }),
});

export type SubmitReceiptInput = z.infer<typeof submitReceiptSchema>;

/**
 * Validation schema for applicant submitting receipt via multipart FormData.
 */
export const uploadReceiptInputSchema = z.object({
  payment_reference: z
    .string()
    .trim()
    .regex(/^YRL-PAY-\d{4}-\d{4,}$/, { message: 'Invalid payment reference format' }),
  transaction_reference: z
    .string()
    .trim()
    .min(4, { message: 'Transaction reference must be at least 4 characters' })
    .max(50, { message: 'Transaction reference must not exceed 50 characters' }),
  claimed_payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be formatted as YYYY-MM-DD' })
    .optional()
    .or(z.literal('')),
});

export type UploadReceiptInput = z.infer<typeof uploadReceiptInputSchema>;

/**
 * Validation schema for administrator payment verification.
 */
export const verifyPaymentSchema = z.object({
  payment_id: z.string().uuid({ message: 'Invalid payment UUID' }),
  auto_activate: z.boolean().optional().default(false),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

/**
 * Validation schema for administrator payment rejection.
 */
export const rejectPaymentSchema = z.object({
  payment_id: z.string().uuid({ message: 'Invalid payment UUID' }),
  rejection_reason: z
    .string()
    .trim()
    .min(5, { message: 'Please provide a clear rejection reason (minimum 5 characters)' })
    .max(500, { message: 'Rejection reason must not exceed 500 characters' }),
});

export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;

/**
 * Validation schema for administrator membership approval and activation.
 */
export const activateApplicationSchema = z.object({
  application_id: z.string().uuid({ message: 'Invalid application UUID' }),
});

export type ActivateApplicationInput = z.infer<typeof activateApplicationSchema>;

/**
 * Validation schema for administrative payment queue querying.
 */
export const paymentFilterSchema = z.object({
  status: z.enum(['pending', 'pending_verification', 'successful', 'rejected', 'all']).optional(),
  region: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>;

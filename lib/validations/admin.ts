import { z } from 'zod';
import { NOMINATION_STATUSES, REVIEW_RECOMMENDATIONS } from '@/lib/auth/types';

export const updateStatusSchema = z.object({
  nominationId: z.string().uuid({ message: 'Valid nomination ID is required' }),
  status: z.enum(NOMINATION_STATUSES, { message: 'Invalid nomination status' }),
  reason: z.string().trim().optional(),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const submitReviewSchema = z.object({
  nominationId: z.string().uuid({ message: 'Valid nomination ID is required' }),
  reviewStage: z
    .string()
    .trim()
    .min(2, { message: 'Review stage must be at least 2 characters' })
    .max(100, { message: 'Review stage is too long' }),
  rating: z
    .number()
    .int()
    .min(1, { message: 'Rating must be at least 1' })
    .max(5, { message: 'Rating cannot exceed 5' })
    .optional()
    .nullable(),
  recommendation: z.enum(REVIEW_RECOMMENDATIONS, {
    message: 'Recommendation must be one of: advance, hold, decline',
  }),
  notes: z.string().trim().optional().nullable(),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

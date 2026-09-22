import { z } from 'zod';
import { NOMINATION_STATUSES, REVIEW_RECOMMENDATIONS, ADMIN_ROLES } from '@/lib/auth/types';

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

export const inviteAdminSchema = z
  .object({
    email: z.string().trim().email({ message: 'A valid email address is required' }),
    role: z.enum(ADMIN_ROLES, { message: 'Approved administrative role is required' }),
    assignedRegion: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.role === 'regional_coordinator') {
        return !!data.assignedRegion && data.assignedRegion.length > 0;
      }
      return true;
    },
    {
      message: 'Assigned region is required for Regional Coordinator role',
      path: ['assignedRegion'],
    }
  );

export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;

export const updateAdminRoleSchema = z
  .object({
    userId: z.string().uuid({ message: 'Valid user ID is required' }),
    role: z.enum(ADMIN_ROLES, { message: 'Approved administrative role is required' }),
    assignedRegion: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.role === 'regional_coordinator') {
        return !!data.assignedRegion && data.assignedRegion.length > 0;
      }
      return true;
    },
    {
      message: 'Assigned region is required for Regional Coordinator role',
      path: ['assignedRegion'],
    }
  );

export type UpdateAdminRoleInput = z.infer<typeof updateAdminRoleSchema>;

export const setAdminStatusSchema = z.object({
  userId: z.string().uuid({ message: 'Valid user ID is required' }),
  disabled: z.boolean({ message: 'Status must be a boolean' }),
});

export type SetAdminStatusInput = z.infer<typeof setAdminStatusSchema>;

export const deleteAdminUserSchema = z.object({
  userId: z.string().trim().min(1, { message: 'Valid user ID is required' }),
});

export type DeleteAdminUserInput = z.infer<typeof deleteAdminUserSchema>;

export const EXPORT_DATASETS = ['nominations', 'members', 'inquiries', 'reviews'] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

export const exportAdminDataSchema = z.object({
  dataset: z.enum(EXPORT_DATASETS, { message: 'Valid export dataset is required' }),
  region: z.string().trim().optional(),
});

export type ExportAdminDataInput = z.infer<typeof exportAdminDataSchema>;

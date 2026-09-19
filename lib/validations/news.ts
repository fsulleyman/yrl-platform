import { z } from 'zod';

/**
 * Slug validation regex: lowercase alphanumeric with single hyphens between words.
 * Example: 'interim-leadership-nominations-open'
 */
export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Standard categories for YRL official communications
 */
export const NEWS_CATEGORIES = [
  'Official Notice',
  'Press Release',
  'Announcement',
  'Leadership Update',
  'Civic Initiative',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/**
 * Base schema for a news article
 */
export const newsArticleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: 'Title must be at least 3 characters' })
    .max(250, { message: 'Title cannot exceed 250 characters' }),
  slug: z
    .string()
    .trim()
    .min(3, { message: 'Slug must be at least 3 characters' })
    .max(150, { message: 'Slug cannot exceed 150 characters' })
    .regex(slugRegex, {
      message: 'Slug must be lowercase alphanumeric characters separated by single hyphens (e.g. my-first-announcement)',
    }),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
  category: z
    .string()
    .trim()
    .min(2, { message: 'Category must be at least 2 characters' })
    .max(100, { message: 'Category is too long' })
    .default('Official Notice'),
  author: z
    .string()
    .trim()
    .min(2, { message: 'Author must be at least 2 characters' })
    .max(150, { message: 'Author is too long' })
    .default('YRL Interim National Secretariat'),
  excerpt: z
    .string()
    .trim()
    .min(10, { message: 'Excerpt must be at least 10 characters' })
    .max(500, { message: 'Excerpt cannot exceed 500 characters' }),
  content: z
    .array(z.string().trim().min(1, { message: 'Paragraph cannot be empty' }))
    .min(1, { message: 'At least one content paragraph is required' }),
  image: z
    .string()
    .trim()
    .nullable()
    .optional(),
  is_published: z.boolean().default(true),
});

export type NewsArticleInput = z.input<typeof newsArticleSchema>;

/**
 * Schema for creating a new news article via Server Action
 */
export const createNewsArticleSchema = newsArticleSchema;
export type CreateNewsArticleInput = z.input<typeof createNewsArticleSchema>;

/**
 * Schema for updating an existing news article
 */
export const updateNewsArticleSchema = newsArticleSchema.partial().extend({
  id: z.string().uuid({ message: 'Valid article ID is required' }),
});
export type UpdateNewsArticleInput = z.input<typeof updateNewsArticleSchema>;

/**
 * Schema for toggling an article's published status
 */
export const togglePublishSchema = z.object({
  id: z.string().uuid({ message: 'Valid article ID is required' }),
  is_published: z.boolean(),
});
export type TogglePublishInput = z.infer<typeof togglePublishSchema>;

/**
 * Schema for deleting an article
 */
export const deleteNewsArticleSchema = z.object({
  id: z.string().uuid({ message: 'Valid article ID is required' }),
});
export type DeleteNewsArticleInput = z.infer<typeof deleteNewsArticleSchema>;

/**
 * Helper to slugify arbitrary string into kebab-case
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

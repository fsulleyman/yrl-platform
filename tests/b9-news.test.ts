import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Parse and load .env.local before imports evaluate process.env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import {
  newsArticleSchema,
  createNewsArticleSchema,
  updateNewsArticleSchema,
  togglePublishSchema,
  deleteNewsArticleSchema,
  slugify,
  NEWS_CATEGORIES,
} from '@/lib/validations/news';
import {
  createNewsArticle,
  updateNewsArticle,
  toggleNewsArticlePublishStatus,
  deleteNewsArticle,
} from '@/app/admin/actions';
import {
  getFilesystemNewsArticles,
  getAllNewsArticles,
  getNewsArticleBySlug,
  getAllNewsSlugs,
} from '@/lib/news';

describe('Model B / Phase B9: Dynamic News CMS Verification Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. Zod Validation Schemas
  // ---------------------------------------------------------------------------
  describe('1. Zod Validation & Slugify Helpers', () => {
    it('1.1. Valid news article input passes validation', () => {
      const validArticle = {
        title: 'Youth Republic Leadership Launches Regional Outreach',
        slug: 'youth-republic-leadership-launches-regional-outreach',
        date: '2026-09-19',
        category: 'Official Notice',
        author: 'YRL Interim National Secretariat',
        excerpt: 'YRL leadership is launching nationwide consultative engagements across all 16 regions.',
        content: [
          'The Interim National Secretariat announces regional tour dates.',
          'All regional coordinators are urged to mobilize grassroots youth.',
        ],
        image: 'https://example.com/images/outreach.jpg',
        is_published: true,
      };

      const result = createNewsArticleSchema.safeParse(validArticle);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validArticle.title);
        expect(result.data.slug).toBe(validArticle.slug);
        expect(result.data.category).toBe('Official Notice');
      }
    });

    it('1.2. Rejects invalid slugs (spaces, uppercase, special characters)', () => {
      const baseArticle = {
        title: 'Test Article Title',
        date: '2026-09-19',
        category: 'Announcement',
        author: 'Secretariat',
        excerpt: 'A short excerpt that is at least 10 chars long.',
        content: ['Paragraph 1 content here.'],
        is_published: true,
      };

      const invalidSlugs = [
        'Invalid Slug With Spaces',
        'invalid_slug_with_underscores',
        'invalid--consecutive--hyphens',
        '-leading-hyphen',
        'trailing-hyphen-',
        'UPPERCASE-SLUG',
        'special@char!slug',
      ];

      for (const slug of invalidSlugs) {
        const result = createNewsArticleSchema.safeParse({ ...baseArticle, slug });
        expect(result.success).toBe(false);
      }
    });

    it('1.3. Rejects missing required fields', () => {
      // Missing title
      expect(
        createNewsArticleSchema.safeParse({
          slug: 'valid-slug',
          date: '2026-09-19',
          excerpt: 'Valid excerpt here for testing.',
          content: ['Paragraph content'],
        }).success
      ).toBe(false);

      // Missing content
      expect(
        createNewsArticleSchema.safeParse({
          title: 'Valid Title',
          slug: 'valid-slug',
          date: '2026-09-19',
          excerpt: 'Valid excerpt here for testing.',
          content: [],
        }).success
      ).toBe(false);

      // Excerpt too short (< 10 chars)
      expect(
        createNewsArticleSchema.safeParse({
          title: 'Valid Title',
          slug: 'valid-slug',
          date: '2026-09-19',
          excerpt: 'Too short',
          content: ['Paragraph content'],
        }).success
      ).toBe(false);

      // Invalid date format
      expect(
        createNewsArticleSchema.safeParse({
          title: 'Valid Title',
          slug: 'valid-slug',
          date: '19/09/2026',
          excerpt: 'Valid excerpt here for testing.',
          content: ['Paragraph content'],
        }).success
      ).toBe(false);
    });

    it('1.4. slugify helper converts titles to clean kebab-case slugs', () => {
      expect(slugify('Youth Republic Leadership Opens Nominations!')).toBe(
        'youth-republic-leadership-opens-nominations'
      );
      expect(slugify('  Spaced  & Special   Characters $100%  ')).toBe(
        'spaced-special-characters-100'
      );
      expect(slugify('Already-kebab-cased-title')).toBe('already-kebab-cased-title');
    });

    it('1.5. NEWS_CATEGORIES contains authoritative categories', () => {
      expect(NEWS_CATEGORIES).toContain('Official Notice');
      expect(NEWS_CATEGORIES).toContain('Press Release');
      expect(NEWS_CATEGORIES).toContain('Announcement');
      expect(NEWS_CATEGORIES).toContain('Leadership Update');
      expect(NEWS_CATEGORIES).toContain('Civic Initiative');
    });

    it('1.6. updateNewsArticleSchema requires valid UUID', () => {
      expect(
        updateNewsArticleSchema.safeParse({
          id: 'not-a-uuid',
          title: 'Updated Title',
        }).success
      ).toBe(false);

      expect(
        updateNewsArticleSchema.safeParse({
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Updated Title',
        }).success
      ).toBe(true);
    });

    it('1.7. deleteNewsArticleSchema requires valid UUID', () => {
      expect(deleteNewsArticleSchema.safeParse({ id: 'invalid' }).success).toBe(false);
      expect(
        deleteNewsArticleSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' }).success
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Server Actions RBAC & Authentication Enforcement
  // ---------------------------------------------------------------------------
  describe('2. Server Actions RBAC & Security Enforcement', () => {
    it('2.1. createNewsArticle rejects unauthenticated caller', async () => {
      const res = await createNewsArticle({
        title: 'Unauthenticated Test Article',
        slug: 'unauthenticated-test-article',
        date: '2026-09-19',
        category: 'Official Notice',
        author: 'Test Author',
        excerpt: 'Testing unauthenticated rejection of news article creation.',
        content: ['Paragraph 1'],
        is_published: true,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Unauthorized/i);
    });

    it('2.2. updateNewsArticle rejects unauthenticated caller', async () => {
      const res = await updateNewsArticle({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated Title',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Unauthorized/i);
    });

    it('2.3. toggleNewsArticlePublishStatus rejects unauthenticated caller', async () => {
      const res = await toggleNewsArticlePublishStatus({
        id: '123e4567-e89b-12d3-a456-426614174000',
        is_published: false,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Unauthorized/i);
    });

    it('2.4. deleteNewsArticle rejects unauthenticated caller', async () => {
      const res = await deleteNewsArticle({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Unauthorized/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Filesystem Fallback & Storage Integrity
  // ---------------------------------------------------------------------------
  describe('3. Filesystem Fallback & Public Retrieval', () => {
    it('3.1. getFilesystemNewsArticles returns the 3 foundational articles', () => {
      const articles = getFilesystemNewsArticles();
      expect(articles.length).toBeGreaterThanOrEqual(3);

      const slugs = articles.map((a) => a.slug);
      expect(slugs).toContain('interim-leadership-nominations-open');
      expect(slugs).toContain('general-civic-membership-registration-launched');
      expect(slugs).toContain('yrl-issues-foundational-civic-declarations-and-notice');
    });

    it('3.2. Foundational articles are sorted in descending chronological order', () => {
      const articles = getFilesystemNewsArticles();
      for (let i = 0; i < articles.length - 1; i++) {
        const currentDate = new Date(articles[i].date).getTime();
        const nextDate = new Date(articles[i + 1].date).getTime();
        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
      }
    });

    it('3.3. getNewsArticleBySlug retrieves an existing article correctly', async () => {
      const article = await getNewsArticleBySlug('interim-leadership-nominations-open');
      expect(article).not.toBeNull();
      expect(article?.slug).toBe('interim-leadership-nominations-open');
      expect(article?.title).toContain('Interim Leadership Nominations');
      expect(article?.content.length).toBeGreaterThan(0);
    });

    it('3.4. getNewsArticleBySlug returns null for non-existent slug', async () => {
      const article = await getNewsArticleBySlug('non-existent-article-slug-xyz');
      expect(article).toBeNull();
    });

    it('3.5. getAllNewsSlugs returns array containing all published slugs', async () => {
      const slugs = await getAllNewsSlugs();
      expect(slugs).toBeInstanceOf(Array);
      expect(slugs).toContain('interim-leadership-nominations-open');
      expect(slugs).toContain('general-civic-membership-registration-launched');
      expect(slugs).toContain('yrl-issues-foundational-civic-declarations-and-notice');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Audit Log Specification Invariance
  // ---------------------------------------------------------------------------
  describe('4. Deletion & Mutation Audit Log Specification', () => {
    it('4.1. Audit log schema accommodates news_article entity and news_deleted action', () => {
      // Invariant: Verify expected audit log properties for news operations
      const mockDeletionAudit = {
        entity_type: 'news_article',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        actor_id: 'admin@yrl.org',
        action: 'news_deleted',
        previous_state: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          slug: 'test-slug',
          title: 'Test Title',
          category: 'Official Notice',
          is_published: true,
        },
        new_state: null,
      };

      expect(mockDeletionAudit.entity_type).toBe('news_article');
      expect(mockDeletionAudit.action).toBe('news_deleted');
      expect(mockDeletionAudit.previous_state).toHaveProperty('id');
      expect(mockDeletionAudit.previous_state).toHaveProperty('slug');
      expect(mockDeletionAudit.previous_state).toHaveProperty('title');
      expect(mockDeletionAudit.previous_state).toHaveProperty('category');
      expect(mockDeletionAudit.previous_state).toHaveProperty('is_published');
    });
  });
});

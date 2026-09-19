-- ==============================================================================
-- YOUTH REPUBLIC LEADERSHIP (YRL) PLATFORM
-- Model B / Phase B9: Authoritative News Management Schema
-- Migration: 20260919_b9_news_schema.sql
-- Description: Creates news_articles table for dynamic announcements & notices,
--              with unique slug indexing, RLS, and explicit service_role grants.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: NEWS_ARTICLES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'Official Notice',
  author text NOT NULL DEFAULT 'YRL Interim National Secretariat',
  excerpt text NOT NULL,
  content text[] NOT NULL DEFAULT '{}',
  image text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. INDEXES
-- ------------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_news_articles_slug ON public.news_articles (lower(trim(slug)));
CREATE INDEX IF NOT EXISTS idx_news_articles_date ON public.news_articles (date DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON public.news_articles (is_published);

-- ------------------------------------------------------------------------------
-- 3. TRIGGER: AUTOMATIC updated_at
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_news_articles_updated_at ON public.news_articles;
CREATE TRIGGER trg_news_articles_updated_at
BEFORE UPDATE ON public.news_articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Public read access: Anyone (anon or authenticated) can view published articles
DROP POLICY IF EXISTS "Public can view published news" ON public.news_articles;
CREATE POLICY "Public can view published news"
ON public.news_articles FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- ------------------------------------------------------------------------------
-- 5. PERMISSIONS & GRANTS
-- ------------------------------------------------------------------------------

-- Allow service_role full administrative access for Next.js Server Actions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.news_articles TO service_role;

-- Allow public read access to the table directly (governed by RLS policy)
GRANT SELECT ON TABLE public.news_articles TO anon, authenticated;

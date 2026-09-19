import fs from 'fs';
import path from 'path';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

export interface NewsArticle {
  id?: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category?: string;
  author?: string;
  image?: string | null;
  content: string[];
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

const NEWS_DIRECTORY = path.join(process.cwd(), 'content', 'news');

/**
 * Reads news articles from the local filesystem (content/news/*.json).
 * Used as a fallback if database is unavailable or during build-time isolation.
 */
export function getFilesystemNewsArticles(): NewsArticle[] {
  try {
    if (!fs.existsSync(NEWS_DIRECTORY)) {
      return [];
    }

    const fileNames = fs.readdirSync(NEWS_DIRECTORY);
    const jsonFiles = fileNames.filter((file) => file.endsWith('.json'));

    const articles: NewsArticle[] = [];

    for (const fileName of jsonFiles) {
      const fullPath = path.join(NEWS_DIRECTORY, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      try {
        const article = JSON.parse(fileContents) as NewsArticle;
        if (article.slug && article.title && article.date && article.content) {
          articles.push({
            ...article,
            is_published: article.is_published ?? true,
          });
        }
      } catch (err) {
        console.error(`Error parsing news file ${fileName}:`, err);
      }
    }

    // Sort descending by date (newest first)
    return articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error reading news directory:', error);
    return [];
  }
}

/**
 * Retrieves all news articles sorted in descending chronological order (newest first).
 * Attempts to query authoritative Supabase table 'news_articles', falling back to filesystem.
 *
 * @param includeDrafts When true (e.g. for super_admin review), includes unpublished articles.
 */
export async function getAllNewsArticles(includeDrafts = false): Promise<NewsArticle[]> {
  try {
    const supabase = includeDrafts ? createAdminClient() : createServerClient();
    let query = supabase.from('news_articles').select('*').order('date', { ascending: false });

    if (!includeDrafts) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        date: typeof item.date === 'string' ? item.date.slice(0, 10) : item.date,
        category: item.category,
        author: item.author,
        excerpt: item.excerpt,
        content: Array.isArray(item.content) ? item.content : [item.content],
        image: item.image,
        is_published: item.is_published,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    }

    if (error) {
      console.warn('[News] Supabase query failed, falling back to filesystem:', error.message);
    }
  } catch (err: any) {
    console.warn('[News] Supabase client exception, falling back to filesystem:', err?.message || err);
  }

  // Fallback to filesystem
  const fsArticles = getFilesystemNewsArticles();
  if (!includeDrafts) {
    return fsArticles.filter((art) => art.is_published !== false);
  }
  return fsArticles;
}

/**
 * Retrieves a single news article by its URL slug.
 *
 * @param slug The unique URL slug
 * @param includeDrafts When true, allows finding unpublished articles (for admin preview)
 */
export async function getNewsArticleBySlug(
  slug: string,
  includeDrafts = false
): Promise<NewsArticle | null> {
  try {
    const supabase = includeDrafts ? createAdminClient() : createServerClient();
    let query = supabase.from('news_articles').select('*').eq('slug', slug);

    if (!includeDrafts) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        date: typeof data.date === 'string' ? data.date.slice(0, 10) : data.date,
        category: data.category,
        author: data.author,
        excerpt: data.excerpt,
        content: Array.isArray(data.content) ? data.content : [data.content],
        image: data.image,
        is_published: data.is_published,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
  } catch (err: any) {
    console.warn('[News] Supabase getNewsArticleBySlug failed, falling back to filesystem:', err?.message || err);
  }

  const articles = getFilesystemNewsArticles();
  const matched = articles.find((art) => art.slug === slug);
  if (matched && (includeDrafts || matched.is_published !== false)) {
    return matched;
  }
  return null;
}

/**
 * Retrieves all published news article slugs for static route generation (generateStaticParams).
 */
export async function getAllNewsSlugs(): Promise<string[]> {
  const articles = await getAllNewsArticles(false);
  return articles.map((art) => art.slug);
}

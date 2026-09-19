import fs from 'fs';
import path from 'path';

export interface NewsArticle {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category?: string;
  author?: string;
  image?: string | null;
  content: string[];
}

const NEWS_DIRECTORY = path.join(process.cwd(), 'content', 'news');

/**
 * Retrieves all news articles sorted in descending chronological order (newest first).
 */
export async function getAllNewsArticles(): Promise<NewsArticle[]> {
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
          articles.push(article);
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
 * Retrieves a single news article by its URL slug.
 */
export async function getNewsArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const articles = await getAllNewsArticles();
  const matched = articles.find((art) => art.slug === slug);
  return matched || null;
}

/**
 * Retrieves all news article slugs for static route generation (generateStaticParams).
 */
export async function getAllNewsSlugs(): Promise<string[]> {
  const articles = await getAllNewsArticles();
  return articles.map((art) => art.slug);
}

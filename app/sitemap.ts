import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://[DOMAIN — TO BE CONFIRMED]';
  const currentDate = new Date();

  const routes = [
    '',
    '/about',
    '/interim-leadership',
    '/positions',
    '/structure',
    '/vision',
    '/contact',
    '/nominate',
    '/join',
    '/privacy-policy',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: (route === '' || route === '/positions' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: route === '' ? 1.0 : route === '/nominate' || route === '/positions' ? 0.9 : 0.7,
  }));
}

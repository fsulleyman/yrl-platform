import type { Metadata } from 'next';

const siteConfig = {
  name: 'Youth Republic Leadership',
  shortName: 'YRL',
  tagline: 'A Nation Built By Young Leaders',
  description:
    'Official public nomination and membership portal for Youth Republic Leadership (YRL) in Ghana. Recruiting interim national ministers, regional ministers, and youth members aged 18–40.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yrl-domain-placeholder.org',
  ogImage: '/brand/logo.png',
};

export function constructMetadata({
  title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
} = {}): Metadata {
  const pageTitle = title
    ? `${title} | ${siteConfig.name} (${siteConfig.shortName})`
    : `${siteConfig.name} (${siteConfig.shortName}) — ${siteConfig.tagline}`;

  let metadataBase: URL | undefined;
  try {
    metadataBase = new URL(siteConfig.url);
  } catch {
    metadataBase = undefined;
  }

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: pageTitle,
      description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 800,
          height: 800,
          alt: `${siteConfig.name} Official Seal`,
        },
      ],
      locale: 'en_GH',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [image],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
    ...(metadataBase ? { metadataBase } : {}),
  };
}

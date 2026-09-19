import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  Calendar,
  User,
  Shield,
  ArrowRight,
  Share2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { getAllNewsSlugs, getNewsArticleBySlug } from '@/lib/news';
import { constructMetadata } from '@/lib/metadata';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Pre-generates all static paths at build time for high performance.
 */
export async function generateStaticParams() {
  const slugs = await getAllNewsSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

/**
 * Generates dynamic SEO and OpenGraph metadata for each article.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);

  if (!article) {
    return constructMetadata({
      title: 'Announcement Not Found',
      description: 'The requested official announcement could not be found.',
    });
  }

  return constructMetadata({
    title: article.title,
    description: article.excerpt,
    image: article.image || '/brand/logo.png',
  });
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Persistent Civic Notice Banner */}
      <NoticeBanner variant="fullWidth" />

      <main id="main-content" className="flex-1">
        <Section className="py-8 md:py-14">
          <Container className="max-w-3xl">
            {/* Back Navigation */}
            <div className="mb-6">
              <Link
                href="/news"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#0B1F3A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded px-1 py-0.5"
              >
                <ArrowLeft className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
                <span>Back to News & Announcements</span>
              </Link>
            </div>

            {/* Main Article Container Card */}
            <article className="bg-white border border-[#C9A227]/30 rounded-lg shadow-md overflow-hidden">
              {/* Decorative Flag Micro-Stripe */}
              <div
                className="h-1.5 w-full bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
                aria-hidden="true"
              />

              <div className="p-6 sm:p-10 md:p-12">
                {/* Article Header & Metadata */}
                <header className="border-b border-slate-100 pb-8 mb-8">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <Badge variant="gold" className="text-xs uppercase tracking-wider font-semibold">
                      {article.category || 'Official Announcement'}
                    </Badge>
                    <time
                      dateTime={article.date}
                      className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1.5"
                    >
                      <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      <span>{formatDate(article.date)}</span>
                    </time>
                  </div>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-[#0B1F3A] tracking-tight leading-tight mb-5">
                    {article.title}
                  </h1>

                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                    <Shield className="w-4 h-4 text-[#C9A227] shrink-0" aria-hidden="true" />
                    <span>Issued by: {article.author || 'YRL Interim National Secretariat'}</span>
                  </div>
                </header>

                {/* Featured Header Banner / Graphic Fallback */}
                <div className="mb-10 rounded-lg overflow-hidden border border-slate-200/80 bg-[#0B1F3A] text-white p-6 sm:p-8 flex items-center justify-between relative shadow-inner">
                  <div className="space-y-1 relative z-10 max-w-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#FCD116]">
                      Official Institutional Communication
                    </p>
                    <p className="text-base sm:text-lg font-heading font-bold text-white leading-snug">
                      Youth Republic Leadership • Republic of Ghana
                    </p>
                    <p className="text-xs text-slate-300 italic">
                      &ldquo;Leadership is service, not privilege.&rdquo;
                    </p>
                  </div>
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-white/10 border-2 border-[#C9A227] flex items-center justify-center shrink-0">
                    <Image
                      src="/brand/logo.png"
                      alt="Youth Republic Leadership Seal"
                      width={56}
                      height={56}
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Article Body Paragraphs */}
                <div className="space-y-6 text-slate-700 leading-relaxed font-normal text-base sm:text-lg">
                  {article.content.map((paragraph, index) => (
                    <p key={index} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Institutional Notice Callout */}
                <div className="mt-12 p-5 bg-amber-50/70 border border-[#C9A227]/40 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      <strong className="block font-heading font-bold text-[#0B1F3A] mb-1">
                        Civic Integrity & Public Transparency
                      </strong>
                      All applications, nominations, and general memberships in Youth Republic Leadership are 100% free.
                      YRL never solicits application fees, registration fees, or processing charges. Interim roles are
                      strictly voluntary and non-governmental.
                    </div>
                  </div>
                </div>

                {/* Next Action Pathways */}
                <div className="mt-10 pt-8 border-t border-slate-100">
                  <h2 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-500 mb-4">
                    Participate in YRL
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/get-involved/nominate" className="block">
                      <div className="p-4 rounded-md border border-slate-200 hover:border-[#C9A227] bg-slate-50 hover:bg-amber-50/40 transition-colors group">
                        <p className="text-xs font-bold text-[#0B1F3A] group-hover:text-[#C9A227] transition-colors flex items-center justify-between">
                          <span>Nominate for Leadership</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Apply for National Ministerial or Regional Minister portfolios.
                        </p>
                      </div>
                    </Link>

                    <Link href="/get-involved/join" className="block">
                      <div className="p-4 rounded-md border border-slate-200 hover:border-[#006B3F] bg-slate-50 hover:bg-emerald-50/40 transition-colors group">
                        <p className="text-xs font-bold text-[#0B1F3A] group-hover:text-[#006B3F] transition-colors flex items-center justify-between">
                          <span>Join as Civic Member</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Participate in grassroots volunteer community development.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <footer className="bg-slate-50 border-t border-slate-100 px-6 sm:px-10 py-5 flex items-center justify-between flex-wrap gap-4">
                <Link href="/news">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    <span>Back to News</span>
                  </Button>
                </Link>

                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900">
                    Return to Home
                  </Button>
                </Link>
              </footer>
            </article>
          </Container>
        </Section>
      </main>

      {/* Footer Civic Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
        <Disclaimer title="Official Civic Transparency Notice">
          Youth Republic Leadership (YRL) is an independent, non-partisan, non-governmental civic leadership organisation
          in Ghana. News and updates published here reflect official institutional notices and grassroots civic activities.
        </Disclaimer>
      </div>
    </div>
  );
}

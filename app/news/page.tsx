import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  User,
  FileText,
  Sparkles,
  Shield,
  Clock,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { Alert } from '@/components/ui/Alert';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { getAllNewsArticles } from '@/lib/news';
import { constructMetadata } from '@/lib/metadata';

export const metadata = constructMetadata({
  title: 'News & Official Announcements',
  description:
    'Official announcements, institutional statements, interim leadership updates, and civic initiatives published by Youth Republic Leadership (YRL) in Ghana.',
});

export default async function NewsListingPage() {
  const articles = await getAllNewsArticles();

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
        <Section className="py-10 md:py-16">
          <Container className="max-w-7xl">
            {/* Hero Header */}
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <Badge variant="gold" className="mb-3 uppercase tracking-wider text-xs font-semibold">
                Official Communications • YRL National Secretariat
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-[#0B1F3A] tracking-tight mb-4">
                News & Official Announcements
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Verified institutional statements, leadership updates, and civic governance notices from the Youth Republic
                Leadership movement in Ghana.
              </p>
            </div>

            {/* Articles Grid or Empty State */}
            <h2 className="sr-only">Official Announcements Listing</h2>
            {articles.length === 0 ? (
              <div className="max-w-xl mx-auto py-8">
                <Alert
                  variant="info"
                  title="No Announcements Published"
                  className="bg-slate-100 border-slate-300 text-slate-800"
                >
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                    There are currently no published news articles. Please check back regularly for updates or review our
                    foundational governance declarations on the{' '}
                    <Link href="/notice" className="font-semibold text-[#0B1F3A] underline underline-offset-2">
                      Official Notice Board
                    </Link>
                    .
                  </p>
                </Alert>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {articles.map((article) => (
                  <article key={article.slug} className="flex flex-col h-full">
                    <Card className="flex flex-col h-full border border-slate-200 bg-white hover:border-[#C9A227]/60 hover:shadow-lg transition-all duration-200 overflow-hidden group">
                      {/* Decorative Flag Micro-Stripe */}
                      <div
                        className="h-1 w-full bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
                        aria-hidden="true"
                      />

                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                          <Badge variant="neutral" className="text-[11px] uppercase tracking-wider font-semibold">
                            {article.category || 'Official Notice'}
                          </Badge>
                          <time
                            dateTime={article.date}
                            className="text-xs font-medium text-slate-500 flex items-center gap-1"
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <span>{formatDate(article.date)}</span>
                          </time>
                        </div>

                        <CardTitle className="text-lg sm:text-xl font-heading font-bold text-[#0B1F3A] group-hover:text-[#C9A227] transition-colors line-clamp-2">
                          <Link
                            href={`/news/${article.slug}`}
                            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded"
                            aria-label={`Read full announcement: ${article.title}`}
                          >
                            {article.title}
                          </Link>
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex-1 pb-4">
                        <CardDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                          {article.excerpt}
                        </CardDescription>
                      </CardContent>

                      <CardFooter className="pt-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between mt-auto">
                        <span className="text-[11px] text-slate-500 truncate max-w-[170px] sm:max-w-[190px]">
                          {article.author || 'YRL Secretariat'}
                        </span>

                        <Link href={`/news/${article.slug}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-bold text-[#0B1F3A] hover:text-[#C9A227] p-0 h-auto hover:bg-transparent flex items-center gap-1 group/btn"
                          >
                            <span>Read Article</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform text-[#C9A227]" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  </article>
                ))}
              </div>
            )}
          </Container>
        </Section>
      </main>

      {/* Footer Civic Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
        <Disclaimer title="Official Civic Transparency Notice">
          Youth Republic Leadership (YRL) is an independent, non-partisan, non-governmental civic leadership organisation
          in Ghana. News and updates published here reflect official institutional notices and grassroots civic activities.
          YRL does not issue government directives or state policy.
        </Disclaimer>
      </div>
    </div>
  );
}

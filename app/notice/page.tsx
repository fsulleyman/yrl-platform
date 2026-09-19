import React from 'react';
import Link from 'next/link';
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Award,
  ArrowRight,
  HelpCircle,
  Clock,
  Building,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { PageHeading } from '@/components/ui/PageHeading';
import { NOTICE_POINTS } from '@/data/notice';
import { SITE_IDENTITY } from '@/data/navigation';

export default function NoticePage() {
  const getNoticeIcon = (id: number) => {
    switch (id) {
      case 1:
        return <Award className="w-6 h-6 text-[#006B3F]" />;
      case 2:
        return <Clock className="w-6 h-6 text-[#C9A227]" />;
      case 3:
        return <AlertTriangle className="w-6 h-6 text-[#C9A227]" />;
      case 4:
        return <Scale className="w-6 h-6 text-[#0B1F3A]" />;
      case 5:
        return <Building className="w-6 h-6 text-[#0B1F3A]" />;
      case 6:
        return <Shield className="w-6 h-6 text-[#CE1126]" />;
      default:
        return <FileText className="w-6 h-6 text-[#0B1F3A]" />;
    }
  };

  return (
    <div className="flex flex-col">
      {/* ========================================================================= */}
      {/* PAGE HERO HEADER                                                          */}
      {/* ========================================================================= */}
      <section className="relative bg-[#0B1F3A] text-white pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden border-b border-[#C9A227]/20">
        <div
          className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[#006B3F]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <Container size="lg" className="relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#C9A227]/40 text-xs sm:text-sm font-semibold text-[#FCD116]">
              <Shield className="w-3.5 h-3.5" />
              <span>Official Public Notice</span>
            </div>

            <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-tight">
              Institutional Transparency &amp; Legal Notice
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Important operational, structural, and legal declarations governing Youth Republic
              Leadership (YRL), our foundational interim leadership setup, and public participation
              across Ghana.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Award className="w-3.5 h-3.5 text-[#FCD116]" />
                <span className="text-white font-medium">100% Free Nominations</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Scale className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-white font-medium">Voluntary &amp; Non-Partisan</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Building className="w-3.5 h-3.5 text-[#006B3F]" />
                <span className="text-white font-medium">Civil Society Initiative</span>
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 1: MANDATORY HIGH-PRIORITY NOTICE BANNER                          */}
      {/* ========================================================================= */}
      <section className="bg-slate-50 border-b border-slate-200 py-8">
        <Container size="lg">
          <div className="bg-[#0B1F3A] text-white rounded-xl border-2 border-[#C9A227]/40 p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div
              className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
              aria-hidden="true"
            />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-[#C9A227] flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-6 h-6 text-[#C9A227]" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#FCD116]">
                    Notice to All Applicants &amp; General Public
                  </span>
                  <h2 className="font-heading font-bold text-lg sm:text-xl text-white">
                    Official Operational Declaration
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                    Youth Republic Leadership is a voluntary, non-partisan, non-profit youth
                    initiative. Nominations are 100% free. Interim positions within YRL are NOT
                    positions in the Government of Ghana.
                  </p>
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <Link href="/get-involved/nominate">
                  <Button variant="gold" size="sm" className="w-full md:w-auto font-bold text-xs">
                    <span>Submit Free Nomination</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: THE 6 CORE NOTICE DECLARATIONS                                */}
      {/* ========================================================================= */}
      <Section background="white" spacing="lg">
        <Container size="lg">
          <PageHeading
            as="h2"
            eyebrow="Core Declarations"
            title="Six Essential Principles of Public Trust"
            description="All members, applicants, and institutional partners must review and acknowledge these six confirmed operational standards."
            align="left"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {NOTICE_POINTS.map((point) => (
              <Card
                key={point.id}
                variant="bordered"
                accent={point.id === 1 ? 'green' : point.id === 6 ? 'flag' : 'navy'}
                className="h-full flex flex-col bg-white shadow-xs"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {getNoticeIcon(point.id)}
                    </div>
                    <Badge
                      variant={point.id === 1 ? 'success' : point.id === 6 ? 'error' : 'gold'}
                      size="sm"
                    >
                      {point.badge}
                    </Badge>
                  </div>

                  <span className="text-[11px] font-bold text-[#C9A227] tracking-wider uppercase">
                    Notice Item #{point.id}
                  </span>
                  <CardTitle className="text-lg leading-snug">{point.title}</CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-500">
                    {point.shortSummary}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                  <p>{point.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 3: FRAUD WARNING & PUBLIC REPORTING ADVISORY                     */}
      {/* ========================================================================= */}
      <Section background="slate" spacing="md" className="border-t border-b border-slate-200">
        <Container size="md">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-[#CE1126]">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-heading font-bold text-base sm:text-lg text-[#0B1F3A]">
                Fraud Prevention &amp; Public Advisory
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Youth Republic Leadership maintains strict zero-tolerance policies regarding financial
              fraud, extortion, or misrepresentation. If you are contacted by any individual or
              group demanding money, payments, or favors under the pretext of securing an interim
              leadership role or membership in YRL, please note:
            </p>

            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#006B3F] shrink-0 mt-0.5" />
                <span>YRL has NO authorized payment agents, intermediaries, or fee collectors.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#006B3F] shrink-0 mt-0.5" />
                <span>No fee can influence or guarantee appointment to any interim position.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#006B3F] shrink-0 mt-0.5" />
                <span>
                  Report any suspected extortion or unauthorized representation to our Secretariat
                  via our official contact channels.
                </span>
              </li>
            </ul>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Have questions about our legitimacy, process, or principles?
              </p>
              <Link href="/faq" className="text-xs font-semibold text-[#0B1F3A] hover:text-[#C9A227] flex items-center gap-1">
                <span>Read Frequently Asked Questions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 4: CLOSING ACTION BLOCK                                           */}
      {/* ========================================================================= */}
      <section className="bg-[#0B1F3A] text-white py-14 sm:py-16">
        <Container size="md" className="text-center space-y-6">
          <Badge variant="gold" size="md">
            Civic Transparency
          </Badge>

          <h2 className="font-heading font-bold text-2xl sm:text-4xl text-white tracking-tight">
            Ready to Serve with Full Clarity?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Now that you understand our interim non-governmental status and free process, step
            forward to nominate for leadership or join as a registered member.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/get-involved/nominate" className="w-full sm:w-auto">
              <Button variant="gold" size="lg" className="w-full sm:w-auto font-bold px-8">
                <span>Submit Free Nomination</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/get-involved/join" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white/40 text-white hover:bg-white/10 hover:text-white"
              >
                Join as a Member
              </Button>
            </Link>
          </div>

          <div className="pt-2 flex justify-center gap-6 text-xs text-slate-400">
            <Link href="/structure" className="hover:text-[#FCD116] underline underline-offset-4">
              Explore Structure
            </Link>
            <Link href="/about" className="hover:text-[#FCD116] underline underline-offset-4">
              About YRL
            </Link>
            <Link href="/faq" className="hover:text-[#FCD116] underline underline-offset-4">
              Read FAQs
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

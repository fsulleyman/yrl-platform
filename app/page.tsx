import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Users,
  Award,
  Scale,
  FileText,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
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
  CardFooter,
} from '@/components/ui/Card';
import { PageHeading } from '@/components/ui/PageHeading';
import { SITE_IDENTITY } from '@/data/navigation';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ========================================================================= */}
      {/* SECTION 1: HERO SECTION                                                   */}
      {/* ========================================================================= */}
      <section className="relative bg-[#0B1F3A] text-white pt-12 pb-16 sm:pt-16 sm:pb-24 overflow-hidden border-b border-[#C9A227]/20">
        {/* Subtle decorative radial gradient */}
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#006B3F]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <Container size="lg" className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Core Message & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-[#C9A227]/40 text-xs sm:text-sm font-semibold text-[#FCD116] tracking-wide shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#006B3F] animate-pulse" />
                <span>{SITE_IDENTITY.tagline}</span>
              </div>

              {/* Primary Hero Headline */}
              <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.1]">
                BUILD THE LEADERSHIP.{' '}
                <span className="text-[#FCD116]">SERVE THE PEOPLE.</span>{' '}
                SHAPE THE FUTURE.
              </h1>

              {/* Sub-headline copy */}
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Youth Republic Leadership (YRL) is a civic, non-partisan, youth-led organisation in
                Ghana establishing our foundational governance structure for young leaders aged
                18–40.
              </p>

              {/* Dual Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link href="/get-involved/nominate" className="w-full sm:w-auto">
                  <Button
                    variant="gold"
                    size="lg"
                    className="w-full sm:w-auto shadow-md font-bold text-base px-8 py-3.5"
                  >
                    <span>Nominate for Leadership</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/get-involved/join" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/40 text-white hover:bg-white/10 hover:text-white text-base px-6 py-3.5"
                  >
                    Join as a Member
                  </Button>
                </Link>
              </div>

              {/* Tertiary link */}
              <div className="pt-1">
                <Link
                  href="/structure"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 hover:text-[#FCD116] underline underline-offset-4 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded-[2px]"
                >
                  <span>Explore Organisational Structure &amp; 16 Regions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Trust Indicators Bar */}
              <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="flex items-center gap-2 p-2 rounded-[4px] bg-white/5 border border-white/10">
                  <Clock className="w-4 h-4 text-[#FCD116] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Ages 18–40</p>
                    <p className="text-[10px] text-slate-400">Youth Eligibility</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-[4px] bg-white/5 border border-white/10">
                  <MapPin className="w-4 h-4 text-[#006B3F] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">16 Regions</p>
                    <p className="text-[10px] text-slate-400">Across Ghana</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-[4px] bg-white/5 border border-white/10">
                  <Award className="w-4 h-4 text-[#FCD116] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">100% Free</p>
                    <p className="text-[10px] text-slate-400">Zero Nomination Fees</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-[4px] bg-white/5 border border-white/10">
                  <Scale className="w-4 h-4 text-slate-300 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Non-Partisan</p>
                    <p className="text-[10px] text-slate-400">Voluntary Service</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Official Seal Heraldic Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-72 sm:w-84 lg:w-96 aspect-square rounded-2xl bg-white/5 border-2 border-[#C9A227]/40 p-8 sm:p-10 flex flex-col items-center justify-center text-center shadow-2xl backdrop-blur-xs">
                {/* Decorative border frame */}
                <div className="absolute inset-3 border border-white/10 rounded-xl pointer-events-none" />

                {/* Logo Image */}
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-2 bg-white/10 border-2 border-[#C9A227] shadow-lg flex items-center justify-center mb-6">
                  <Image
                    src="/brand/logo.png"
                    alt={`${SITE_IDENTITY.name} Official Seal`}
                    width={176}
                    height={176}
                    className="w-full h-full object-contain"
                    priority
                  />
                  <Shield
                    className="w-12 h-12 text-[#C9A227] absolute pointer-events-none -z-10"
                    aria-hidden="true"
                  />
                </div>

                {/* Seal Label & Motto */}
                <h2 className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight leading-tight">
                  {SITE_IDENTITY.name}
                </h2>
                <p className="text-xs text-[#C9A227] tracking-widest uppercase font-semibold mt-1">
                  Republic of Ghana
                </p>
                <div className="mt-4 pt-3 border-t border-white/10 w-full">
                  <p className="text-xs text-slate-300 italic font-medium">
                    &ldquo;{SITE_IDENTITY.motto}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: CORE PRINCIPLE BANNER                                          */}
      {/* ========================================================================= */}
      <section className="bg-slate-50 border-b border-slate-200 py-10 sm:py-12">
        <Container size="md">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 text-center relative overflow-hidden">
            {/* Top Ghana Flag subtle accent line */}
            <div
              className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
              aria-hidden="true"
            />

            <div className="max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C9A227]">
                Our Guiding Core Principle
              </span>
              <blockquote className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#0B1F3A] tracking-tight leading-snug">
                &ldquo;{SITE_IDENTITY.corePrinciple}&rdquo;
              </blockquote>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Official Motto: <span className="text-[#0B1F3A]">{SITE_IDENTITY.motto}</span>
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: THREE FOUNDATION PILLARS                                       */}
      {/* ========================================================================= */}
      <Section background="white" spacing="lg">
        <Container size="lg">
          <PageHeading
            as="h2"
            eyebrow="Our Foundation"
            title="Built on Service, Driven by Youth"
            description="Our structure is anchored on three foundational pillars derived directly from our official motto, guiding every interim officer and general member."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-12">
            {/* Pillar 1: Leadership */}
            <Card variant="bordered" accent="navy" className="h-full flex flex-col">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-[#0B1F3A]/5 border border-[#0B1F3A]/15 flex items-center justify-center mb-4 text-[#0B1F3A]">
                  <Shield className="w-6 h-6 text-[#0B1F3A]" />
                </div>
                <Badge variant="primary" size="sm" className="w-fit mb-2">
                  Pillar I
                </Badge>
                <CardTitle className="text-xl">Leadership</CardTitle>
                <CardDescription>Ethical, merit-based governance</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Equipping and empowering young Ghanaians aged 18–40 to take active responsibility
                  in organizational leadership, regional administration, and constructive civic
                  stewardship.
                </p>
              </CardContent>
              <CardFooter className="pt-4 border-t border-slate-100 text-xs font-semibold text-[#0B1F3A]">
                Prior political experience is not required.
              </CardFooter>
            </Card>

            {/* Pillar 2: Service */}
            <Card variant="bordered" accent="gold" className="h-full flex flex-col">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-[#C9A227]/10 border border-[#C9A227]/25 flex items-center justify-center mb-4 text-[#C9A227]">
                  <Award className="w-6 h-6 text-[#C9A227]" />
                </div>
                <Badge variant="gold" size="sm" className="w-fit mb-2">
                  Pillar II
                </Badge>
                <CardTitle className="text-xl">Service</CardTitle>
                <CardDescription>Leadership is service, not privilege</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Rejecting entitlement in favor of voluntary, selfless civic contribution. Every
                  interim position exists to serve youth communities and uphold transparent,
                  accountable public standards.
                </p>
              </CardContent>
              <CardFooter className="pt-4 border-t border-slate-100 text-xs font-semibold text-[#9A7B1D]">
                All roles are 100% voluntary &amp; non-governmental.
              </CardFooter>
            </Card>

            {/* Pillar 3: Development */}
            <Card variant="bordered" accent="green" className="h-full flex flex-col">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-[#006B3F]/10 border border-[#006B3F]/20 flex items-center justify-center mb-4 text-[#006B3F]">
                  <Users className="w-6 h-6 text-[#006B3F]" />
                </div>
                <Badge variant="success" size="sm" className="w-fit mb-2">
                  Pillar III
                </Badge>
                <CardTitle className="text-xl">Development</CardTitle>
                <CardDescription>Grassroots impact across 16 regions</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Mobilizing collective talent across Ghana to initiate community projects, policy
                  dialogues, and capacity-building programs that advance Ghana&apos;s youth.
                </p>
              </CardContent>
              <CardFooter className="pt-4 border-t border-slate-100 text-xs font-semibold text-[#006B3F]">
                Active coordination across all 16 regions of Ghana.
              </CardFooter>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 4: TWO PATHWAYS TO PARTICIPATION                                  */}
      {/* ========================================================================= */}
      <Section background="slate" spacing="lg" className="border-t border-b border-slate-200">
        <Container size="lg">
          <PageHeading
            as="h2"
            eyebrow="Get Involved"
            title="Two Pathways to Shape the Republic"
            description="Whether you are called to serve as an interim executive officer or stand as a committed civic member, YRL has a transparent pathway for your participation."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mt-12 max-w-5xl mx-auto">
            {/* Pathway 1: Interim Leadership */}
            <Card variant="bordered" accent="gold" className="bg-white shadow-sm flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="gold" size="sm">
                    Interim Leadership
                  </Badge>
                  <span className="text-xs font-bold text-[#006B3F] bg-[#006B3F]/10 px-2 py-0.5 rounded-[2px]">
                    100% Free Application
                  </span>
                </div>
                <CardTitle className="text-2xl mt-2">Nominate for Leadership</CardTitle>
                <CardDescription>
                  For young Ghanaians aged 18–40 ready to lead national portfolios or regional
                  secretariats.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#006B3F] shrink-0 mt-0.5" />
                    <span>Apply for National Interim Ministerial portfolios</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#006B3F] shrink-0 mt-0.5" />
                    <span>Lead or coordinate Regional Interim Secretariats across 16 regions</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#006B3F] shrink-0 mt-0.5" />
                    <span>Gain hands-on governance, administrative, and strategic experience</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#006B3F] shrink-0 mt-0.5" />
                    <span>Selected strictly on merit; no political affiliation required</span>
                  </li>
                </ul>
              </CardContent>

              <CardFooter className="pt-6 border-t border-slate-100">
                <Link href="/get-involved/nominate" className="w-full">
                  <Button variant="gold" fullWidth size="lg" className="font-bold">
                    <span>Submit Leadership Nomination</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Pathway 2: General Membership */}
            <Card variant="bordered" accent="navy" className="bg-white shadow-sm flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="primary" size="sm">
                    Civic Membership
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-[2px]">
                    Open to All Youth
                  </span>
                </div>
                <CardTitle className="text-2xl mt-2">Join as a Member</CardTitle>
                <CardDescription>
                  For every young Ghanaian who wants to support, network, and contribute to
                  grassroots national development.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0B1F3A] shrink-0 mt-0.5" />
                    <span>Connect with like-minded civic leaders across the country</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0B1F3A] shrink-0 mt-0.5" />
                    <span>Participate in regional youth dialogues and community outreach</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0B1F3A] shrink-0 mt-0.5" />
                    <span>Contribute skills, ideas, and local knowledge to civic programs</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0B1F3A] shrink-0 mt-0.5" />
                    <span>100% free registration with voluntary engagement</span>
                  </li>
                </ul>
              </CardContent>

              <CardFooter className="pt-6 border-t border-slate-100">
                <Link href="/get-involved/join" className="w-full">
                  <Button variant="primary" fullWidth size="lg" className="font-semibold">
                    <span>Register as a Member</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 5: OFFICIAL CIVIC NOTICE & TRANSPARENCY                           */}
      {/* ========================================================================= */}
      <Section background="white" spacing="md">
        <Container size="md">
          <div className="bg-[#0B1F3A] text-white rounded-xl border-2 border-[#C9A227]/40 p-6 sm:p-10 shadow-lg relative overflow-hidden">
            {/* Top Ghana Flag accent stripe */}
            <div
              className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
              aria-hidden="true"
            />

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 border border-[#C9A227] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#C9A227]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
                    Official Public Notice &amp; Legal Transparency
                  </h3>
                  <p className="text-xs text-[#C9A227] font-semibold uppercase tracking-wider">
                    Important Information for All Applicants and Members
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                  <span className="text-xs font-bold text-[#FCD116] uppercase tracking-wide block">
                    100% Free Process
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Nominations and registrations are strictly free. No agent or representative is
                    authorized to demand or accept fees.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                  <span className="text-xs font-bold text-[#FCD116] uppercase tracking-wide block">
                    Interim Setup Nature
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Interim roles establish our foundational structure and do not guarantee
                    permanent appointment or election to the same office.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                  <span className="text-xs font-bold text-[#FCD116] uppercase tracking-wide block">
                    Independent &amp; Voluntary
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    YRL is an independent, non-partisan civil society organisation. Positions within
                    YRL are not positions in the Government of Ghana.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/10">
                <p className="text-xs text-slate-400">
                  Read our full public transparency guidelines, terms, and code of conduct.
                </p>
                <Link
                  href="/notice"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#FCD116] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded-[2px]"
                >
                  <span>Read Official Notice Board</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 6: FINAL CIVIC CALL TO ACTION                                     */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-b from-[#0B1F3A] to-[#061120] text-white py-16 sm:py-20 border-t border-[#C9A227]/20 relative overflow-hidden">
        {/* Subtle decorative gold circle */}
        <div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <Container size="md" className="relative z-10 text-center space-y-6">
          <Badge variant="gold" size="md">
            Ghana • Civic Leadership
          </Badge>

          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Ready to Lead with Integrity?
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
            Ghana&apos;s future is shaped by the young leaders who step forward today. Submit your
            interim leadership nomination or register as a general member now.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 max-w-md mx-auto">
            <Link href="/get-involved/nominate" className="w-full sm:w-auto">
              <Button
                variant="gold"
                size="lg"
                className="w-full sm:w-auto font-bold px-8 shadow-md text-base"
              >
                <span>Nominate Yourself</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/get-involved/join" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white/40 text-white hover:bg-white/10 hover:text-white px-6 text-base"
              >
                Join as a Member
              </Button>
            </Link>
          </div>

          <p className="text-xs text-slate-400 pt-2">
            Nominations are 100% Free • Independent, Voluntary &amp; Non-Partisan
          </p>
        </Container>
      </section>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  Target,
  Compass,
  Award,
  CheckCircle2,
  Users,
  Scale,
  FileText,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
  AlertTriangle,
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

export default function AboutPage() {
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
              <span>About Youth Republic Leadership</span>
            </div>

            <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-tight">
              A Nation Built by Young Leaders
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Youth Republic Leadership (YRL) is a voluntary, non-partisan, non-profit youth
              organisation in Ghana dedicated to practical leadership, civic governance, service,
              and active community participation.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Clock className="w-3.5 h-3.5 text-[#FCD116]" />
                <span>Ages 18–40</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-[#006B3F]" />
                <span>All 16 Regions of Ghana</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Scale className="w-3.5 h-3.5 text-slate-300" />
                <span>Non-Partisan &amp; Voluntary</span>
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 1: WHO WE ARE                                                     */}
      {/* ========================================================================= */}
      <Section background="white" spacing="lg">
        <Container size="lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Detailed Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <PageHeading
                as="h2"
                eyebrow="Identity"
                title="Who We Are"
                description="An independent civil society initiative establishing a merit-based youth leadership platform across Ghana."
                align="left"
              />

              <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                <p>
                  Youth Republic Leadership (YRL) is an independent, non-partisan, and voluntary
                  youth leadership initiative established to mobilize young Ghanaians aged 18–40.
                  We exist to build a disciplined, ethical, and capable generation of civic leaders
                  grounded in our core principle that{' '}
                  <strong className="text-[#0B1F3A] font-semibold">
                    leadership is service, not privilege.
                  </strong>
                </p>
                <p>
                  Unlike traditional political avenues, YRL operates with strict non-partisanship.
                  We provide a platform where youth from every background, profession, and region
                  can collaborate on practical governance, regional development, and civic service
                  without partisan division or political prerequisites.
                </p>
                <p>
                  Currently in our foundational interim setup phase, YRL is establishing ministerial
                  portfolios at the national level and administrative secretariats across all 16
                  regions of Ghana.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <h3 className="font-heading font-bold text-sm text-[#0B1F3A] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#006B3F]" />
                    <span>Independent &amp; Non-Profit</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Guided exclusively by public interest and youth empowerment.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <h3 className="font-heading font-bold text-sm text-[#0B1F3A] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#006B3F]" />
                    <span>Strictly Non-Partisan</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Free from party affiliations, campaign agendas, or partisan interests.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Heraldic Identity Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl bg-slate-50 border-2 border-[#C9A227]/30 p-8 text-center space-y-5 shadow-sm">
                <div className="relative w-32 h-32 mx-auto rounded-full bg-white border-2 border-[#C9A227] p-2 shadow-sm flex items-center justify-center">
                  <Image
                    src="/brand/logo.png"
                    alt={`${SITE_IDENTITY.name} Official Seal`}
                    width={128}
                    height={128}
                    className="w-full h-full object-contain"
                  />
                  <Shield
                    className="w-8 h-8 text-[#C9A227] absolute pointer-events-none -z-10"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h3 className="font-heading font-bold text-lg text-[#0B1F3A]">
                    {SITE_IDENTITY.name}
                  </h3>
                  <p className="text-xs text-[#C9A227] font-semibold tracking-wider uppercase mt-0.5">
                    Republic of Ghana
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-[#0B1F3A]">Official Motto</p>
                  <p className="italic text-[#C9A227] font-medium">&ldquo;{SITE_IDENTITY.motto}&rdquo;</p>
                </div>

                <div className="pt-2">
                  <span className="inline-block text-[11px] font-bold text-[#006B3F] bg-[#006B3F]/10 px-3 py-1 rounded-full">
                    Ages 18–40 • 16 Regions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTIONS 2 & 3: VISION & MISSION                                          */}
      {/* ========================================================================= */}
      <Section background="slate" spacing="lg" className="border-t border-b border-slate-200">
        <Container size="lg">
          <PageHeading
            as="h2"
            eyebrow="Guiding Horizon"
            title="Vision &amp; Mission"
            description="Our dual commitments to the young leaders of today and the future of the Republic of Ghana."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
            {/* Vision Card */}
            <Card variant="bordered" accent="gold" className="bg-white shadow-sm flex flex-col">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-[#C9A227]/10 border border-[#C9A227]/25 flex items-center justify-center mb-3 text-[#C9A227]">
                  <Compass className="w-6 h-6 text-[#C9A227]" />
                </div>
                <Badge variant="gold" size="sm" className="w-fit mb-2">
                  Our Vision
                </Badge>
                <CardTitle className="text-2xl">The Vision</CardTitle>
                <CardDescription>What we aspire to build for Ghana</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <blockquote className="text-base text-slate-800 font-medium leading-relaxed italic border-l-2 border-[#C9A227] pl-3 py-1 mb-4 bg-[#C9A227]/5 rounded-r">
                  &ldquo;A Ghana where ethical, prepared, and service-minded young leaders actively
                  shape civic governance and national development.&rdquo;
                </blockquote>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We envision an active, engaged generation of youth whose civic participation is
                  guided by competence, integrity, and democratic principles, serving as the
                  foundation for sustainable national progress.
                </p>
              </CardContent>
            </Card>

            {/* Mission Card */}
            <Card variant="bordered" accent="green" className="bg-white shadow-sm flex flex-col">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-[#006B3F]/10 border border-[#006B3F]/20 flex items-center justify-center mb-3 text-[#006B3F]">
                  <Target className="w-6 h-6 text-[#006B3F]" />
                </div>
                <Badge variant="success" size="sm" className="w-fit mb-2">
                  Our Mission
                </Badge>
                <CardTitle className="text-2xl">The Mission</CardTitle>
                <CardDescription>How we turn purpose into practical action</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <blockquote className="text-base text-slate-800 font-medium leading-relaxed italic border-l-2 border-[#006B3F] pl-3 py-1 mb-4 bg-[#006B3F]/5 rounded-r">
                  &ldquo;To mobilize, equip, and organize Ghanaian youth aged 18–40 into a
                  structured, voluntary, and non-partisan leadership platform centered on practical
                  governance, community impact, and civic responsibility.&rdquo;
                </blockquote>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We accomplish this by establishing clear leadership structures, facilitating
                  nationwide civic participation, and offering hands-on opportunities for young
                  Ghanaians to serve their communities.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 4: WHAT YRL DOES                                                  */}
      {/* ========================================================================= */}
      <Section background="white" spacing="lg">
        <Container size="lg">
          <PageHeading
            as="h2"
            eyebrow="Our Scope"
            title="What YRL Does"
            description="Our operations are focused on four core areas of practical youth engagement, ethical governance, and grassroots participation."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {/* Area 1: Practical Leadership */}
            <Card variant="bordered" accent="navy" className="h-full flex flex-col">
              <CardHeader>
                <div className="w-10 h-10 rounded-md bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 flex items-center justify-center mb-3 text-[#0B1F3A]">
                  <Award className="w-5 h-5 text-[#0B1F3A]" />
                </div>
                <CardTitle className="text-lg">Practical Leadership</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Creating structured interim portfolios where young leaders gain hands-on
                  experience in administrative management, portfolio coordination, and civic
                  strategy.
                </p>
              </CardContent>
            </Card>

            {/* Area 2: Civic Governance */}
            <Card variant="bordered" accent="gold" className="h-full flex flex-col">
              <CardHeader>
                <div className="w-10 h-10 rounded-md bg-[#C9A227]/10 border border-[#C9A227]/20 flex items-center justify-center mb-3 text-[#C9A227]">
                  <Scale className="w-5 h-5 text-[#C9A227]" />
                </div>
                <CardTitle className="text-lg">Civic Governance</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Instilling transparent governance principles, accountability, and ethical public
                  standards among youth without partisan interference or bias.
                </p>
              </CardContent>
            </Card>

            {/* Area 3: Community Service */}
            <Card variant="bordered" accent="green" className="h-full flex flex-col">
              <CardHeader>
                <div className="w-10 h-10 rounded-md bg-[#006B3F]/10 border border-[#006B3F]/20 flex items-center justify-center mb-3 text-[#006B3F]">
                  <Users className="w-5 h-5 text-[#006B3F]" />
                </div>
                <CardTitle className="text-lg">Community Service</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Mobilizing youth to identify local community needs, organize voluntary civic
                  initiatives, and implement constructive grassroots solutions.
                </p>
              </CardContent>
            </Card>

            {/* Area 4: Youth Participation */}
            <Card variant="bordered" accent="flag" className="h-full flex flex-col">
              <CardHeader>
                <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-[#0B1F3A]">
                  <MapPin className="w-5 h-5 text-[#0B1F3A]" />
                </div>
                <CardTitle className="text-lg">Nationwide Participation</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Connecting young Ghanaians across all 16 regions into an active civic network of
                  peers committed to national development.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 5: CORE PRINCIPLE BANNER                                          */}
      {/* ========================================================================= */}
      <section className="bg-slate-50 border-t border-b border-slate-200 py-12">
        <Container size="md">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-10 text-center relative overflow-hidden">
            <div
              className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
              aria-hidden="true"
            />
            <div className="max-w-2xl mx-auto space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C9A227]">
                Our Inviolable Core Principle
              </span>
              <blockquote className="font-heading font-extrabold text-2xl sm:text-4xl text-[#0B1F3A] tracking-tight leading-snug">
                &ldquo;{SITE_IDENTITY.corePrinciple}&rdquo;
              </blockquote>
              <p className="text-sm text-slate-600 leading-relaxed">
                At Youth Republic Leadership, leadership is defined by responsibility, humility, and
                service to the common good. We reject entitlement and personal gain, affirming that
                true leadership exists exclusively to serve the people of Ghana.
              </p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">
                Official Motto: <span className="text-[#0B1F3A]">{SITE_IDENTITY.motto}</span>
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: ELIGIBILITY STANDARDS                                          */}
      {/* ========================================================================= */}
      <Section background="white" spacing="lg">
        <Container size="lg">
          <PageHeading
            as="h2"
            eyebrow="Participation Standards"
            title="Eligibility &amp; Requirements"
            description="Clear, transparent criteria for joining as a member or nominating for an interim leadership role."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto items-start">
            {/* Eligibility Criteria List */}
            <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h3 className="font-heading font-bold text-lg text-[#0B1F3A] border-b border-slate-200 pb-3">
                Who Can Apply &amp; Join
              </h3>
              <ul className="space-y-3.5 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#006B3F] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Age Requirement: 18–40 Years</strong>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Open to all young Ghanaians born within the eligible youth bracket.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#006B3F] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Citizenship &amp; Residence</strong>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Open to Ghanaian citizens living in Ghana across all 16 regions.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#006B3F] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Voluntary Service Commitment</strong>
                    <p className="text-xs text-slate-500 mt-0.5">
                      A dedication to public good, community upliftment, and active participation.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#006B3F] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">100% Free Application</strong>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Zero application or nomination fees at all stages of the process.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Political Experience Notice */}
            <div className="space-y-4 bg-[#0B1F3A] text-white p-6 rounded-xl border border-[#C9A227]/40 shadow-sm">
              <div className="flex items-center gap-2.5 text-[#FCD116]">
                <Scale className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Important Qualification Notice
                </span>
              </div>

              <h3 className="font-heading font-bold text-xl text-white">
                Prior Political Experience is NOT Required
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                YRL is intentionally designed to open leadership doors to competent, passionate young
                people who may not have had traditional political platforms.
              </p>

              <div className="p-3 bg-white/10 rounded border border-white/15 text-xs text-slate-200 leading-relaxed space-y-1">
                <p className="font-semibold text-[#FCD116]">Selection is based on:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  <li>Character, integrity, and ethical leadership</li>
                  <li>Commitment to our core principle of service</li>
                  <li>Passion for community and regional development</li>
                </ul>
              </div>

              <p className="text-[11px] text-slate-400">
                Independent civil society initiative • Non-partisan meritocracy
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 7: WHAT "INTERIM" MEANS                                           */}
      {/* ========================================================================= */}
      <Section background="slate" spacing="lg" className="border-t border-b border-slate-200">
        <Container size="md">
          <div className="bg-[#0B1F3A] text-white rounded-xl border-2 border-[#C9A227]/40 p-6 sm:p-10 shadow-lg relative overflow-hidden">
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
                  <h2 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
                    What &ldquo;Interim&rdquo; Means
                  </h2>
                  <p className="text-xs text-[#C9A227] font-semibold uppercase tracking-wider">
                    Institutional &amp; Legal Clarity
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                To guarantee complete transparency and legal fidelity, all applicants and members
                must understand the definition and purpose of our interim leadership structure:
              </p>

              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-white/5 border border-white/10 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#FCD116] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs sm:text-sm text-white block">
                      Foundational Setup Phase
                    </strong>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      Interim officers are tasked with establishing foundational administrative
                      processes, drafting operational guidelines, and coordinating initial membership
                      registration across Ghana.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-white/5 border border-white/10 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#FCD116] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs sm:text-sm text-white block">
                      Interim Does Not Mean Permanent
                    </strong>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      Appointment to an interim role does not guarantee permanent appointment or
                      future election to the same position. Interim roles exist specifically for the
                      setup term.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-white/5 border border-white/10 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-[#FCD116] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs sm:text-sm text-white block">
                      Not Government of Ghana Positions
                    </strong>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      YRL is an independent, voluntary, non-partisan civil society organisation.
                      Positions within YRL are not government positions. Applicants must not use
                      YRL’s name, logo, or position to claim governmental authority.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/10">
                <p className="text-xs text-slate-400">
                  Read our full public transparency guidelines and legal notice.
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
      {/* SECTION 8: CLOSING CALL TO ACTION                                         */}
      {/* ========================================================================= */}
      <section className="bg-[#0B1F3A] text-white py-14 sm:py-16 border-t border-[#C9A227]/20">
        <Container size="md" className="text-center space-y-6">
          <Badge variant="gold" size="md">
            Get Involved in YRL
          </Badge>

          <h2 className="font-heading font-bold text-2xl sm:text-4xl text-white tracking-tight">
            Ready to Take Your Place in Civic Leadership?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Whether you feel called to serve in an interim leadership portfolio or contribute as an
            active member, your commitment moves Ghana forward.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/get-involved/nominate" className="w-full sm:w-auto">
              <Button variant="gold" size="lg" className="w-full sm:w-auto font-bold px-8">
                <span>Nominate for Leadership</span>
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

          <div className="pt-2">
            <Link
              href="/structure"
              className="text-xs text-slate-400 hover:text-[#FCD116] underline underline-offset-4 transition-colors font-medium"
            >
              Explore our National &amp; Regional Structure &rarr;
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

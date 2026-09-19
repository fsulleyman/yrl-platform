'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Scale,
  Award,
  BookOpen,
  Briefcase,
  Cpu,
  Radio,
  Heart,
  Sprout,
  Users,
  Building,
  MapPin,
  Search,
  ArrowRight,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
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
import { Input } from '@/components/ui/Input';
import { NATIONAL_POSITIONS, GHANA_REGIONS } from '@/data/structure';
import { SITE_IDENTITY } from '@/data/navigation';

export default function StructurePage() {
  const [regionSearch, setRegionSearch] = useState('');

  // Icon mapper helper
  const getNationalIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-6 h-6 text-[#0B1F3A]" />;
      case 'Scale':
        return <Scale className="w-6 h-6 text-[#C9A227]" />;
      case 'Award':
        return <Award className="w-6 h-6 text-[#0B1F3A]" />;
      case 'BookOpen':
        return <BookOpen className="w-6 h-6 text-[#006B3F]" />;
      case 'Briefcase':
        return <Briefcase className="w-6 h-6 text-[#0B1F3A]" />;
      case 'Cpu':
        return <Cpu className="w-6 h-6 text-[#0B1F3A]" />;
      case 'Radio':
        return <Radio className="w-6 h-6 text-[#C9A227]" />;
      case 'Heart':
        return <Heart className="w-6 h-6 text-[#CE1126]" />;
      case 'Sprout':
        return <Sprout className="w-6 h-6 text-[#006B3F]" />;
      case 'Users':
        return <Users className="w-6 h-6 text-[#006B3F]" />;
      case 'Building':
        return <Building className="w-6 h-6 text-[#0B1F3A]" />;
      default:
        return <Shield className="w-6 h-6 text-[#0B1F3A]" />;
    }
  };

  // Filtered regions for quick scanning
  const filteredRegions = useMemo(() => {
    const query = regionSearch.trim().toLowerCase();
    if (!query) return GHANA_REGIONS;
    return GHANA_REGIONS.filter(
      (r) => r.name.toLowerCase().includes(query) || r.code.toLowerCase().includes(query)
    );
  }, [regionSearch]);

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
              <span>Governance Framework</span>
            </div>

            <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-tight">
              Organisational Structure
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              A transparent, two-tier interim leadership framework designed to empower Ghanaian
              youth aged 18–40 across 11 national policy portfolios and all 16 administrative
              regions of Ghana.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Shield className="w-3.5 h-3.5 text-[#FCD116]" />
                <span className="text-white font-medium">11 National Portfolios</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-[#006B3F]" />
                <span className="text-white font-medium">16 Regional Secretariats</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Award className="w-3.5 h-3.5 text-[#FCD116]" />
                <span className="text-white font-medium">100% Free Nominations</span>
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* INTERIM TRANSPARENCY NOTICE BANNER                                       */}
      {/* ========================================================================= */}
      <section className="bg-slate-50 border-b border-slate-200 py-6 sm:py-8">
        <Container size="lg">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-[#0B1F3A]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm text-[#0B1F3A]">
                    Foundational Interim Setup Phase
                  </span>
                  <Badge variant="gold" size="sm">
                    Open Call
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  All positions listed below are currently open for public nomination. YRL is an
                  independent civil society initiative; positions are voluntary and are not
                  positions in the Government of Ghana.
                </p>
              </div>
            </div>

            <Link href="/notice" className="shrink-0 w-full md:w-auto">
              <Button variant="outline" size="sm" className="w-full md:w-auto text-xs">
                <span>Read Public Notice</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 1: NATIONAL LEADERSHIP LEVEL                                      */}
      {/* ========================================================================= */}
      <Section background="white" spacing="lg">
        <Container size="lg">
          <PageHeading
            as="h2"
            eyebrow="Tier I — National Level"
            title="National Leadership Portfolios"
            description="Specialized national executive portfolios responsible for administrative direction, policy coordination, and youth mobilization across Ghana."
            align="left"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {NATIONAL_POSITIONS.map((pos) => (
              <Card key={pos.id} variant="bordered" accent="navy" className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {getNationalIcon(pos.iconName)}
                    </div>
                    <Badge variant="gold" size="sm">
                      Open for Nomination
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A227]">
                      {pos.category} Portfolio
                    </span>
                    <CardTitle className="text-lg leading-snug">{pos.title}</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{pos.scope}</p>
                </CardContent>

                <CardFooter className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Voluntary Service</span>
                  <Link href="/get-involved/nominate">
                    <Button variant="outline" size="sm" className="text-xs font-semibold">
                      <span>Apply</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 2: REGIONAL LEADERSHIP LEVEL (ALL 16 REGIONS)                     */}
      {/* ========================================================================= */}
      <Section background="slate" spacing="lg" className="border-t border-b border-slate-200">
        <Container size="lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
            <PageHeading
              as="h2"
              eyebrow="Tier II — Regional Level"
              title="16 Regional Secretariats"
              description="Decentralized youth leadership, member coordination, and community service across every administrative region of Ghana."
              align="left"
            />

            {/* Region search / filter box */}
            <div className="w-full md:w-72 space-y-1.5 shrink-0">
              <label
                htmlFor="region-search"
                className="text-xs font-semibold text-slate-700 block"
              >
                Filter by Region:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="region-search"
                  type="text"
                  placeholder="Search region (e.g. Ashanti)..."
                  value={regionSearch}
                  onChange={(e) => setRegionSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Showing {filteredRegions.length} of {GHANA_REGIONS.length} regions
              </p>
            </div>
          </div>

          {filteredRegions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 mt-8 p-6">
              <p className="text-sm text-slate-600">No regions match &ldquo;{regionSearch}&rdquo;.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRegionSearch('')}
                className="mt-2 text-xs"
              >
                Clear filter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
              {filteredRegions.map((region) => (
                <Card
                  key={region.code}
                  variant="bordered"
                  accent="green"
                  className="bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-[2px]">
                        {region.code}
                      </span>
                      <Badge variant="success" size="sm">
                        Open
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-1 text-[#0B1F3A]">{region.name}</CardTitle>
                    <CardDescription className="text-xs font-semibold text-[#006B3F]">
                      {region.role}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 text-xs text-slate-600 leading-relaxed">
                    {region.description}
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-slate-100">
                    <Link href="/get-involved/nominate" className="w-full">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        className="text-xs font-semibold justify-between"
                      >
                        <span>Nominate</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 3: ORGANISATIONAL PRINCIPLES                                     */}
      {/* ========================================================================= */}
      <Section background="white" spacing="md">
        <Container size="md">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C9A227]">
                Governance Integrity
              </span>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#0B1F3A]">
                Principles Governing All Leadership Roles
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <CheckCircle2 className="w-5 h-5 text-[#006B3F]" />
                <h3 className="font-heading font-bold text-sm text-[#0B1F3A]">Merit-Based</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Selection is based on personal integrity, competence, and willingness to serve.
                  Previous political experience is not required.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <CheckCircle2 className="w-5 h-5 text-[#006B3F]" />
                <h3 className="font-heading font-bold text-sm text-[#0B1F3A]">Voluntary Service</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every position is a voluntary civic contribution dedicated to Ghanaian youth and
                  community development.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <CheckCircle2 className="w-5 h-5 text-[#006B3F]" />
                <h3 className="font-heading font-bold text-sm text-[#0B1F3A]">Strictly Non-Partisan</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Positions are civil society roles, not Government of Ghana positions. No partisan
                  affiliation or alignment is required or permitted.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 4: CLOSING ACTION BLOCK                                           */}
      {/* ========================================================================= */}
      <section className="bg-[#0B1F3A] text-white py-14 sm:py-16 border-t border-[#C9A227]/20">
        <Container size="md" className="text-center space-y-6">
          <Badge variant="gold" size="md">
            Serve Ghana
          </Badge>

          <h2 className="font-heading font-bold text-2xl sm:text-4xl text-white tracking-tight">
            Ready to Serve at National or Regional Level?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Nominations are 100% free and open to young Ghanaians aged 18–40 across all 16 regions.
            Step forward to help build our foundational governance structure.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/get-involved/nominate" className="w-full sm:w-auto">
              <Button variant="gold" size="lg" className="w-full sm:w-auto font-bold px-8">
                <span>Submit Leadership Nomination</span>
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
              href="/about"
              className="text-xs text-slate-400 hover:text-[#FCD116] underline underline-offset-4 transition-colors font-medium"
            >
              Learn more about our Vision, Mission &amp; Principles &rarr;
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

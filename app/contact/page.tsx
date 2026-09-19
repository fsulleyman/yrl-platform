import React from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  FileText,
  Shield,
  ArrowRight,
  Clock,
  Users,
  Compass,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { ContactForm } from './ContactForm';
import { constructMetadata } from '@/lib/metadata';

export const metadata = constructMetadata({
  title: 'Contact Us',
  description:
    'Contact the Youth Republic Leadership (YRL) interim secretariat in Ghana. Submit official inquiries, feedback, and civic correspondence.',
});

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Civic Notice Banner */}
      <NoticeBanner variant="fullWidth" />

      {/* Page Header Section */}
      <section className="border-b border-slate-200 bg-white py-12 sm:py-16">
        <Container>
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="navy" className="text-xs font-semibold uppercase tracking-wider">
                Official Communications
              </Badge>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-600">
                YRL Interim Secretariat • Ghana
              </span>
            </div>

            <h1 className="font-heading text-3xl font-bold tracking-tight text-[#0B1F3A] sm:text-4xl lg:text-5xl">
              Contact Youth Republic Leadership
            </h1>

            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-700">
              We welcome official inquiries, community partnership proposals, and civic correspondence from Ghanaian youth, civil society, and the public. Please use the form below to reach our interim team.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Content Area */}
      <Section spacing="md" background="slate">
        <h2 className="sr-only">Official Inquiry and Communications Desk</h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Form / Success Card (7 cols) */}
          <div className="lg:col-span-7">
            <ContactForm />
          </div>

          {/* Right Column: Communications Guidance & Cross-Links (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: Communication Guidelines */}
            <Card className="border border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#C9A227]" aria-hidden="true" />
                  <CardTitle className="text-lg font-bold text-[#0B1F3A]">
                    Communication Guidelines
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p className="leading-relaxed">
                  Youth Republic Leadership is actively building its foundational interim governance structure across Ghana.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-slate-900">• Response Time:</span>
                    <span>Typically 3–5 working days for general inquiries.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-slate-900">• Direct Nominations:</span>
                    <span>For interim leadership applications, please submit directly via the nomination portal.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-slate-900">• Privacy:</span>
                    <span>All messages are held in confidence under Act 843.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Card 2: Quick Answers Cross-Links */}
            <Card className="border border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#0B1F3A]" aria-hidden="true" />
                  <CardTitle className="text-lg font-bold text-[#0B1F3A]">
                    Looking for Quick Answers?
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-600">
                  Many common questions are already answered in our official resources:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Link
                  href="/faq"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    <HelpCircle className="h-4 w-4 text-slate-500 group-hover:text-[#0B1F3A]" />
                    Frequently Asked Questions
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0B1F3A] group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/notice"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    <FileText className="h-4 w-4 text-slate-500 group-hover:text-[#0B1F3A]" />
                    Official Notice Board
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0B1F3A] group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/structure"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    <Compass className="h-4 w-4 text-slate-500 group-hover:text-[#0B1F3A]" />
                    Organisational Structure
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0B1F3A] group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/get-involved/join"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    <Users className="h-4 w-4 text-slate-500 group-hover:text-[#0B1F3A]" />
                    Join as General Member
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0B1F3A] group-hover:translate-x-0.5 transition-all" />
                </Link>
              </CardContent>
            </Card>

            {/* Card 3: Official Channels Notice */}
            <Card className="border border-slate-200 bg-slate-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#0B1F3A]" aria-hidden="true" />
                  <CardTitle className="text-base font-bold text-[#0B1F3A]">
                    Official Channels Status
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 leading-relaxed space-y-2">
                <p>
                  Official regional secretariat contact numbers and physical addresses across the 16 regions of Ghana will be published following the conclusion of interim leadership appointments.
                </p>
                <p className="text-slate-500">
                  All verified organizational announcements are published exclusively via our <Link href="/news" className="text-[#0B1F3A] font-semibold underline hover:text-[#C9A227]">News &amp; Updates</Link> page and <Link href="/notice" className="text-[#0B1F3A] font-semibold underline hover:text-[#C9A227]">Official Notice Board</Link>.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>
    </div>
  );
}

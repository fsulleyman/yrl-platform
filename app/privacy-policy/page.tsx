import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { constructMetadata } from '@/lib/metadata';

export const metadata = constructMetadata({
  title: 'Privacy Policy',
  description:
    'Privacy Policy and Data Protection Notice for Youth Republic Leadership (YRL), outlining data collection, processing, and individual rights under Ghana Data Protection Act, 2012 (Act 843).',
});

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-10 sm:py-16">
      <Section containerSize="narrow" background="white" className="rounded-[4px] border border-slate-200/80 shadow-xs">
        {/* Header */}
        <div className="border-b border-slate-100 pb-8 mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C9A227] mb-2">
            <Shield className="w-4 h-4" />
            <span>Data Protection & Privacy Notice</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0E1E3B] tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Effective Date: September 2026 • Governing Law: Data Protection Act, 2012 (Act 843), Republic of Ghana
          </p>
        </div>

        {/* Legal Disclaimer / Compliance Advisory */}
        <Disclaimer variant="standard" title="COMPLIANCE & LEGAL NOTICE" className="mb-8">
          <p>
            Youth Republic Leadership (YRL) is committed to handling applicant and member information in a transparent, accountable, and lawful manner. Please note that this policy outlines our current technical and administrative data handling procedures. Formal registration with the Data Protection Commission (DPC) of Ghana is an administrative requirement under Act 843.
          </p>
        </Disclaimer>

        {/* Content Sections */}
        <div className="space-y-8 text-slate-800 text-sm sm:text-base leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E1E3B] border-b border-slate-100 pb-1.5">
              1. Organisation & Data Controller Identity
            </h2>
            <p>
              This privacy notice applies to personal information collected by <strong>Youth Republic Leadership</strong> (&quot;YRL&quot;), an independent, voluntary, and non-partisan youth civic organisation registered and operating in the Republic of Ghana.
            </p>
            <p>
              For inquiries regarding data protection, please contact the YRL Secretariat via email at{' '}
              <span className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                [CONTACT EMAIL — TO BE CONFIRMED]
              </span>{' '}
              or visit our <Link href="/contact" className="text-[#006B3F] underline font-medium">Contact page</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E1E3B] border-b border-slate-100 pb-1.5">
              2. Personal Data We Collect
            </h2>
            <p>
              When you apply for an interim leadership position or register as a member through our portal, we collect the following categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-sm">
              <li><strong>Applicant Identity:</strong> Full legal name, date of birth (used strictly to verify eligibility within the 18–40 age requirement), gender.</li>
              <li><strong>Contact Information:</strong> Active phone number, WhatsApp contact, email address.</li>
              <li><strong>Residential & Geographic Details:</strong> Administrative region, district/municipality, and town/community within Ghana.</li>
              <li><strong>Educational & Professional Background:</strong> Current occupation, employer or educational institution, highest education level, and area of study/profession.</li>
              <li><strong>Leadership Assessment Data:</strong> Prior leadership experience, track record, suitability statements, answers to governance and recruitment plans (Q1–Q6), and time availability.</li>
              <li><strong>Referee Details:</strong> Full name, professional or personal relationship, and phone number of your designated referee.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E1E3B] border-b border-slate-100 pb-1.5">
              3. Notice Regarding Referee Contact Information
            </h2>
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-[4px] text-xs sm:text-sm text-slate-800 space-y-2">
              <p className="font-semibold text-[#0E1E3B]">
                Collection of Third-Party Personal Information:
              </p>
              <p>
                As part of the interim nomination process, applicants provide the name, relationship, and telephone number of a reference person. YRL relies on the applicant to inform their designated referee before submitting their details. YRL does not currently execute an independent consent verification step prior to storing referee details.
              </p>
              <p>
                Referee contact details are used exclusively to confirm applicant credibility and character during the screening process and are never shared with commercial entities. Referees may request deletion of their records at any time.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E1E3B] border-b border-slate-100 pb-1.5">
              4. Purposes of Data Processing
            </h2>
            <p>We process your personal information strictly for legitimate organizational and civic recruitment objectives:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
              <li>Verifying eligibility for interim national and regional leadership roles;</li>
              <li>Assessing candidate suitability, vision, and operational plans for the interim phase;</li>
              <li>Contacting applicants for screening, interviews, and orientation sessions;</li>
              <li>Establishing interim regional and district youth leadership committees across Ghana;</li>
              <li>Communicating key organisational announcements to registered members.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E1E3B] border-b border-slate-100 pb-1.5">
              5. Data Retention Policy
            </h2>
            <p className="italic text-slate-700">
              We retain your information for as long as necessary for the recruitment and organisational purposes described above, and will review this policy as a fixed retention period is defined.
            </p>
            <p className="text-xs text-slate-500">
              Note: As YRL establishes its permanent constitutional structures and formal Data Protection Commission registration, a formalized schedule for archiving or purging application records will be instituted and published.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E1E3B] border-b border-slate-100 pb-1.5">
              6. Data Security & Storage
            </h2>
            <p>
              Your data is stored in secure, encrypted cloud databases hosted with industry-standard safeguards. Access to applicant records is protected by strict technical controls including Row Level Security (RLS) policies that prohibit public reading of applicant records.
            </p>
            <p>
              Only authorized members of the interim leadership screening committee have administrative access to applicant dossiers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E1E3B] border-b border-slate-100 pb-1.5">
              7. Your Rights Under Act 843
            </h2>
            <p>
              Under Ghana&apos;s Data Protection Act, 2012 (Act 843), you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
              <li>Request access to the personal data we hold about you;</li>
              <li>Request the correction or updating of inaccurate or outdated information;</li>
              <li>Request the deletion or withdrawal of your nomination or membership application;</li>
              <li>Lodge an inquiry or objection with our data protection officer.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E1E3B] border-b border-slate-100 pb-1.5">
              8. How to Request Data Deletion or Correction
            </h2>
            <p>
              To request that your nomination or membership record be deleted or modified, please send a written request to{' '}
              <span className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                [CONTACT EMAIL — TO BE CONFIRMED]
              </span>{' '}
              from the email address used in your original submission, citing your Full Name and Nomination Reference Number.
            </p>
            <p className="text-xs text-slate-500">
              Requests are reviewed and processed within fourteen (14) business days.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between text-sm">
          <Link href="/" className="text-[#0E1E3B] hover:text-[#006B3F] hover:underline font-medium">
            ← Back to Homepage
          </Link>
          <Link href="/nominate" className="text-[#006B3F] hover:underline font-medium">
            Proceed to Nomination Form →
          </Link>
        </div>
      </Section>
    </div>
  );
}

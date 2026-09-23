import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMemberAuthResult } from '@/lib/auth/server';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Shield,
  ArrowRight,
  Edit3,
  Award,
  BookOpen,
  Users,
} from 'lucide-react';
import { MemberSignOutButton } from './SignOutButton';

export const metadata = {
  title: 'Member Dashboard | Youth Republic Leadership (YRL)',
  description: 'Official YRL Member Portal, onboarding guidance, and civic status.',
};

export const dynamic = 'force-dynamic';

export default async function MemberDashboardPage() {
  const authResult = await getMemberAuthResult();

  if (authResult.status === 'unauthenticated') {
    redirect('/member/login');
  }

  // State: Application Pending Activation
  if (authResult.status === 'pending_activation') {
    const { application } = authResult;
    return (
      <div className="min-h-[75vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-[#0B1F3A] text-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-[#C9A227] flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">
                    Membership Application in Review
                  </h1>
                  <p className="text-slate-300 text-sm mt-1">
                    Your application has been received and is progressing through administrative verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                    Application Reference
                  </span>
                  <span className="text-base font-bold text-[#0B1F3A] font-mono mt-1 block">
                    {application.application_number}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                    Current Status
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mt-1">
                    {application.status === 'payment_verified'
                      ? 'Payment Verified — Awaiting Secretariat Activation'
                      : application.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-sm text-blue-900 space-y-2">
                <h3 className="font-semibold text-blue-950 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-700" />
                  Understanding the Verification Process
                </h3>
                <p>
                  In accordance with YRL governance policies, payment verification confirms receipt of your voluntary membership dues.
                  Full membership activation is conducted as a separate administrative review by the Secretariat.
                </p>
                <p>
                  Once approved, your official Member ID (<code>YRL-MEM-YYYY-XXXX</code>) will be generated and you will gain full access to the member dashboard and regional activities.
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <MemberSignOutButton />
                <Link href="/">
                  <Button variant="outline" size="sm">
                    Return to Homepage
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State: Not a member
  if (authResult.status === 'not_a_member') {
    return (
      <div className="min-h-[75vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">No Active Membership Found</h1>
          <p className="mt-2 text-slate-600 text-sm max-w-md mx-auto">
            You are signed in as <strong>{authResult.user.email}</strong>, but there is no active membership record associated with this email address.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/get-involved/join">
              <Button variant="gold">
                Join as Member
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <MemberSignOutButton />
          </div>
        </div>
      </div>
    );
  }

  // State: Authenticated Active Member
  const { member, application } = authResult.session;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header Card: Official Identity */}
        <div className="bg-gradient-to-r from-[#0B1F3A] to-[#15345E] rounded-2xl shadow-md text-white overflow-hidden border-b-4 border-[#C9A227]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Member
                  </span>
                  <span className="text-xs text-slate-300">
                    {member.region} Regional Chapter
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Welcome, {member.full_name}
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  Youth Republic Leadership &bull; Ghana Chapter
                </p>
              </div>

              {/* Official Member ID Box */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-5 text-left md:text-right">
                <span className="text-xs font-medium text-slate-300 uppercase tracking-wider block">
                  Official Member ID
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#FCD116] tracking-wider block mt-1">
                  {member.member_id}
                </span>
                {application?.application_number && (
                  <span className="text-xs text-slate-400 block mt-1 font-mono">
                    Ref: {application.application_number}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Calendar className="w-4 h-4 text-[#C9A227]" />
                <span>
                  Member since:{' '}
                  {new Date(member.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/member/profile">
                  <Button
                    size="sm"
                    className="bg-[#C9A227] hover:bg-[#b08d1f] text-[#0B1F3A] font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    Edit Profile
                  </Button>
                </Link>
                <MemberSignOutButton />
              </div>
            </div>
          </div>
        </div>

        {/* Post-Activation Onboarding Guidance Hub */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B1F3A]">
                Post-Activation Onboarding Guide
              </h2>
              <p className="text-sm text-slate-600">
                Follow these essential next steps to maximize your civic engagement in YRL.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0B1F3A] flex items-center justify-center font-bold text-sm mb-3">
                1
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Complete Your Profile
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Ensure your community details, occupation, and availability are up to date so chapter leads can connect you with initiatives.
              </p>
              <Link
                href="/member/profile"
                className="mt-3 inline-flex items-center text-xs font-semibold text-[#0B1F3A] hover:text-[#C9A227]"
              >
                Review Profile <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0B1F3A] flex items-center justify-center font-bold text-sm mb-3">
                2
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Regional Chapter Connect
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                You are registered with the <strong>{member.region}</strong> chapter. Regional coordinates will contact you regarding upcoming meetings and community service drives.
              </p>
              <Link
                href="/structure"
                className="mt-3 inline-flex items-center text-xs font-semibold text-[#0B1F3A] hover:text-[#C9A227]"
              >
                View Structure <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0B1F3A] flex items-center justify-center font-bold text-sm mb-3">
                3
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Civic Responsibility & Ethos
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                As a verified member, uphold the core principle: <em>Leadership is service, not privilege.</em> Participate actively in local civic education and community empowerment.
              </p>
              <Link
                href="/about"
                className="mt-3 inline-flex items-center text-xs font-semibold text-[#0B1F3A] hover:text-[#C9A227]"
              >
                Read YRL Ethos <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Member Profile Overview & Permitted Data Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity & Contact Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0B1F3A] flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-[#C9A227]" />
              Civic Profile & Contact
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Full Name</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.full_name}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">Email Address</dt>
                <dd className="font-semibold text-slate-900 mt-0.5 truncate">{member.email}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">Phone Number</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.phone_number}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">WhatsApp Number</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {member.whatsapp_number || 'None provided'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">Gender</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {member.gender || 'Not specified'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">Date of Birth</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.date_of_birth}</dd>
              </div>
            </dl>
          </div>

          {/* Location & Civic Background */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0B1F3A] flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-[#C9A227]" />
              Location & Background
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Region</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.region}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">District / Municipality</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.district_municipality}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">Town / Community</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.town_community}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">Occupation</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.occupation}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">Education Level</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.education_level}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500">Weekly Availability</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{member.availability}</dd>
              </div>
            </dl>

            <div className="pt-2 border-t border-slate-100">
              <dt className="text-xs font-medium text-slate-500 mb-1.5">Civic Interests</dt>
              <dd className="flex flex-wrap gap-1.5">
                {member.engagement_interests && member.engagement_interests.length > 0 ? (
                  member.engagement_interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800"
                    >
                      {interest.replace(/_/g, ' ')}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">General Participation</span>
                )}
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

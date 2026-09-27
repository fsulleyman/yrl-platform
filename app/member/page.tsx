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
  ShieldCheck,
  Lock,
  FileCheck2,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { MemberSignOutButton } from './SignOutButton';
import { DigitalMembershipCard } from './DigitalMembershipCard';
import { MemberReceiptButton } from './MemberReceiptButton';
import { MomoCopyButton } from './MomoCopyButton';
import { getMemberApplicationPayment } from '@/lib/payment/service';

export const metadata = {
  title: 'Member Dashboard | Youth Republic Leadership (YRL)',
  description: 'Official YRL Member Portal, onboarding guidance, and civic status.',
};

export const dynamic = 'force-dynamic';

function getApplicationLifecycleDetails(status: string) {
  switch (status) {
    case 'payment_not_started':
    case 'pending_payment':
      return {
        badge: 'Payment Required',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        headline: 'Action Required: Complete Membership Fee Payment',
        description: 'Membership fee required: GH₵5.00. Your application has been received. Please complete payment of the required GH₵5.00 membership fee via Mobile Money and submit your receipt to enter the verification queue.',
        currentStep: 2,
        actionLink: '/member/payment',
        actionLabel: 'Submit Payment Receipt',
      };
    case 'receipt_submitted':
    case 'pending_verification':
      return {
        badge: 'Receipt Under Review',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        headline: 'Payment Verification in Progress',
        description: 'Your GH₵5.00 membership payment is awaiting verification. An authorized vetting officer will verify your transaction against our records.',
        currentStep: 3,
        actionLink: null,
        actionLabel: null,
      };
    case 'payment_verified':
      return {
        badge: 'Payment Verified',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        headline: 'Payment Verified — Awaiting Secretariat Activation',
        description: 'Your GH₵5.00 membership payment has been verified. Your application is undergoing final executive approval before your official Member ID (YRL-MEM-YYYY-XXXX) is generated.',
        currentStep: 3,
        actionLink: null,
        actionLabel: null,
      };
    case 'payment_rejected':
      return {
        badge: 'Payment Requires Attention',
        badgeClass: 'bg-red-100 text-red-900 border-red-300',
        headline: 'Payment Requires Attention',
        description: 'Your GH₵5.00 membership payment requires attention. The uploaded payment receipt could not be verified by the secretariat. Please ensure you have transferred the required GH₵5.00 fee and uploaded valid proof of payment.',
        currentStep: 2,
        actionLink: '/member/payment',
        actionLabel: 'Resubmit Payment Proof',
      };
    default:
      return {
        badge: status.replace(/_/g, ' ').toUpperCase(),
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        headline: 'Application in Processing',
        description: 'Your membership application is currently being processed by the YRL Secretariat.',
        currentStep: 2,
        actionLink: null,
        actionLabel: null,
      };
  }
}

export default async function MemberDashboardPage() {
  const authResult = await getMemberAuthResult();

  if (authResult.status === 'unauthenticated') {
    redirect('/member/login');
  }

  // State: Application Pending Activation
  if (authResult.status === 'pending_activation') {
    const { application } = authResult;
    const details = getApplicationLifecycleDetails(application.status);
    const payment = await getMemberApplicationPayment(application.id);

    const steps = [
      { label: 'Registration Details', completed: true, active: false },
      { label: 'Membership Fee — GH₵5.00', completed: details.currentStep > 2, active: details.currentStep === 2 },
      { label: 'Payment Verification', completed: application.status === 'payment_verified', active: details.currentStep === 3 },
      { label: 'Membership Activation', completed: false, active: false },
    ];

    return (
      <div className="min-h-[75vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
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
                    Your application is progressing through the YRL onboarding lifecycle.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Stepper Progress Bar */}
              <div className="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-4">
                  Membership Lifecycle Progress
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {steps.map((step, idx) => (
                    <div
                      key={step.label}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        step.completed
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : step.active
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-1.5">
                        {step.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : step.active ? (
                          <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold block leading-tight">
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection Feedback Alert (Visible if Secretariat rejected evidence) */}
              {(application.status === 'payment_rejected' || payment?.status === 'rejected') && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-2.5" role="alert">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <strong className="text-sm font-bold uppercase tracking-wider text-red-950">
                      Secretariat Rejection Feedback
                    </strong>
                  </div>
                  <div className="bg-white p-3.5 rounded-lg border border-red-200 text-xs text-red-800 leading-relaxed font-medium">
                    &ldquo;{application.rejection_reason || payment?.rejection_reason || 'Payment receipt evidence could not be verified against Mobile Money records.'}&rdquo;
                  </div>
                  <p className="text-xs text-red-700">
                    Please review the feedback above and submit valid transaction evidence to proceed with your onboarding.
                  </p>
                </div>
              )}

              {/* Status and Reference Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                    Application Reference
                  </span>
                  <span className="text-base font-bold text-[#0B1F3A] font-mono mt-1 block">
                    {application.application_number}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Submitted on{' '}
                    {new Date(application.submitted_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                    Lifecycle Status
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border mt-1.5 ${details.badgeClass}`}>
                    {details.badge}
                  </span>
                  <span className="text-xs text-slate-600 mt-1 block">
                    {details.headline}
                  </span>
                </div>
              </div>

              {/* Payment Details & Receipt Evidence Card */}
              {payment && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#0B1F3A]" />
                      <h3 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                        YRL Membership Fee Payment Record
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#0B1F3A] bg-white border border-slate-200 px-2.5 py-0.5 rounded">
                      {payment.payment_reference}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Membership Fee</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {payment.currency} {payment.amount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Payment Method</span>
                      <span className="font-semibold text-slate-800 capitalize">
                        {payment.payment_method.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Telecom Txn Ref</span>
                      <span className="font-mono text-slate-800 font-medium">
                        {payment.transaction_reference || 'None submitted'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Claimed Date</span>
                      <span className="text-slate-800 font-mono">
                        {payment.claimed_payment_date || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Uploaded Receipt Evidence & Secure Download */}
                  {payment.has_receipt && (
                    <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Uploaded Receipt Evidence
                        </span>
                        <span className="text-slate-500 font-mono text-[11px] truncate block max-w-xs sm:max-w-md">
                          {payment.receipt_original_filename || 'Receipt attached'}
                          {payment.receipt_file_size ? ` • ${(payment.receipt_file_size / 1024).toFixed(1)} KB` : ''}
                        </span>
                      </div>
                      <MemberReceiptButton paymentId={payment.id} filename={payment.receipt_original_filename} />
                    </div>
                  )}
                </div>
              )}

              {/* Official MoMo Details for Pending / Rejected Payment */}
              {details.actionLink && (
                <div className="bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 border border-amber-300 rounded-xl p-5 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#C9A227]" />
                      <h3 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                        Official Mobile Money Payment Destination
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-[#0B1F3A] bg-amber-100 border border-amber-300 px-2 py-0.5 rounded w-fit">
                      Required Fee: GH₵5.00
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Required Fee</span>
                      <span className="text-xl font-extrabold text-[#0B1F3A] block mt-0.5">GH₵5.00</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">MoMo Number</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-lg font-mono font-bold text-[#0B1F3A] select-all">0245600135</span>
                        <MomoCopyButton numberToCopy="0245600135" />
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">MTN Mobile Money</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Account Name</span>
                      <span className="text-sm font-bold text-slate-900 block mt-0.5">Sualihu Arrimeyaw</span>
                      <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">Official YRL Recipient</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Banner if payment needed / rejected */}
              {details.actionLink && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-amber-900">
                    <strong>Next Step Required:</strong> {details.description}
                  </div>
                  <Link href={details.actionLink}>
                    <Button size="sm" className="bg-[#0B1F3A] hover:bg-[#15345E] text-white shrink-0">
                      {details.actionLabel}
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* Informative Guidance */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-sm text-blue-900 space-y-2">
                <h3 className="font-semibold text-blue-950 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-700" />
                  Understanding the Verification Process
                </h3>
                <p>
                  In accordance with YRL governance policies, payment verification confirms receipt of your required YRL membership fee (GH₵5.00).
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

  // State: Authenticated Official Member
  const { member, application } = authResult.session;
  const memberPayment = application?.id ? await getMemberApplicationPayment(application.id) : null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* ========================================================= */}
        {/* SECTION 1: WELCOME & OFFICIAL IDENTITY HEADER            */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-r from-[#0B1F3A] to-[#15345E] rounded-2xl shadow-md text-white overflow-hidden border-b-4 border-[#C9A227]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C9A227]/20 text-[#FCD116] border border-[#C9A227]/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    YRL MEMBER
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {member.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-300">
                    {member.region} Chapter
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Welcome, {member.full_name}
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  Youth Republic Leadership &bull; National Civic Movement &bull; Ghana
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
                <span className="text-xs text-slate-300 block mt-1">
                  Region: <strong className="text-white">{member.region}</strong>
                </span>
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

        {/* ========================================================= */}
        {/* SECTION 2: MY MEMBERSHIP & DIGITAL IDENTITY               */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0B1F3A]">
                  My Membership & Official Credential
                </h2>
                <p className="text-xs text-slate-600">
                  Authoritative membership credentials, digital wallet identity, and secretariat standing.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Official Member
            </span>
          </div>

          {/* Interactive Digital Membership Card with Print / PDF generation */}
          <div className="pt-1 pb-4">
            <DigitalMembershipCard member={member} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Official Member ID
              </span>
              <span className="text-base font-bold text-[#0B1F3A] font-mono mt-1 block">
                {member.member_id}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Membership Status
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mt-1">
                {member.status.toUpperCase()}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Application Reference
              </span>
              <span className="text-sm font-semibold text-slate-800 font-mono mt-1 block">
                {application?.application_number || 'Direct Secretariat Registration'}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Activation Information
              </span>
              <span className="text-xs font-medium text-slate-700 mt-1 block">
                {application?.activated_at
                  ? `Activated ${new Date(application.activated_at).toLocaleDateString('en-GB')}`
                  : `Registered ${new Date(member.created_at).toLocaleDateString('en-GB')}`}
              </span>
            </div>
          </div>

          {/* Verified Lifecycle Status Indicator */}
          <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mb-2.5">
              Verified Membership Milestones
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>1. Application Approved</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>2. Payment Verified</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>3. Member ID Issued</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>4. Active & In Good Standing</span>
              </div>
            </div>
          </div>

          {/* Verified YRL Membership Fee & Receipt Evidence Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0B1F3A]" />
                <h3 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                  YRL Membership Fee & Payment Status
                </h3>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Verified & Recorded
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Membership Fee</span>
                <span className="font-bold text-slate-900 text-sm">
                  {memberPayment ? `${memberPayment.currency} ${memberPayment.amount.toFixed(2)}` : 'GH₵ 5.00'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Payment Method</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {memberPayment ? memberPayment.payment_method.replace(/_/g, ' ') : 'Mobile Money'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Payment Reference</span>
                <span className="font-mono text-slate-800 font-medium">
                  {memberPayment?.payment_reference || application?.application_number || 'YRL-FEE-VERIFIED'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Verification Standing</span>
                <span className="text-emerald-700 font-semibold">
                  Good Standing (Active)
                </span>
              </div>
            </div>

            {/* Uploaded Receipt Evidence & Download Button if payment has receipt */}
            {memberPayment?.has_receipt && (
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Official Payment Evidence
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] truncate block max-w-xs sm:max-w-md">
                    {memberPayment.receipt_original_filename || 'Payment receipt on file'}
                    {memberPayment.receipt_file_size ? ` • ${(memberPayment.receipt_file_size / 1024).toFixed(1)} KB` : ''}
                  </span>
                </div>
                <MemberReceiptButton paymentId={memberPayment.id} filename={memberPayment.receipt_original_filename} />
              </div>
            )}
          </div>

          {/* Civic Entitlements & Good Standing Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C9A227]" />
              <h3 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                Active Member Entitlements & Civic Standing
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your membership status is officially recorded as <strong className="text-emerald-700 font-semibold uppercase">{member.status}</strong>. In accordance with the YRL Constitution, members in good standing are entitled to full participation across the movement:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Democratic Franchise:</strong>
                  Full voting rights in local and regional chapter assemblies and national convention delegations.
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Leadership Candidacy:</strong>
                  Right to submit nominations for constitutional leadership offices as per nomination guidelines.
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Civic Academy Access:</strong>
                  Unrestricted participation in YRL leadership development workshops, mentorship circles, and forums.
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Community Empowerment:</strong>
                  Direct involvement in chapter-level civic actions, youth empowerment projects, and advocacy initiatives.
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Maintaining good standing requires upholding the YRL civic code of ethics and remaining active in chapter activities.</span>
              <span className="font-semibold text-emerald-700 shrink-0">Standing: Good Standing</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: MY PROFILE                                    */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0B1F3A] flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0B1F3A]">
                  My Profile
                </h2>
                <p className="text-xs text-slate-600">
                  Your registered contact information, location, and civic engagement preferences.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/member/profile">
                <Button
                  size="sm"
                  className="bg-[#0B1F3A] hover:bg-[#15345E] text-white font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact & Legal Identity */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Contact & Legal Identity
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Full Name</dt>
                  <dd className="font-semibold text-slate-900">{member.full_name}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Email Address</dt>
                  <dd className="font-semibold text-slate-900">{member.email}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Phone Number</dt>
                  <dd className="font-semibold text-slate-900">{member.phone_number}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">WhatsApp Number</dt>
                  <dd className="font-semibold text-slate-900">{member.whatsapp_number || 'None provided'}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Date of Birth</dt>
                  <dd className="font-semibold text-slate-900">{member.date_of_birth}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Gender</dt>
                  <dd className="font-semibold text-slate-900">{member.gender || 'Not specified'}</dd>
                </div>
              </dl>
            </div>

            {/* Residence & Civic Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Residence & Civic Details
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Region</dt>
                  <dd className="font-semibold text-slate-900">{member.region}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">District / Municipality</dt>
                  <dd className="font-semibold text-slate-900">{member.district_municipality}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Town / Community</dt>
                  <dd className="font-semibold text-slate-900">{member.town_community}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Occupation</dt>
                  <dd className="font-semibold text-slate-900">{member.occupation}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Education Level</dt>
                  <dd className="font-semibold text-slate-900">{member.education_level}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <dt className="text-xs font-medium text-slate-500">Weekly Availability</dt>
                  <dd className="font-semibold text-slate-900">{member.availability}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500 block mb-2">Civic Engagement Interests</span>
            <div className="flex flex-wrap gap-2">
              {member.engagement_interests && member.engagement_interests.length > 0 ? (
                member.engagement_interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-800"
                  >
                    {interest.replace(/_/g, ' ')}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">General Participation</span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 4: ACCOUNT & SECURITY                             */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0B1F3A]">
                  Account & Security
                </h2>
                <p className="text-xs text-slate-600">
                  Manage your account and view your security status.
                </p>
              </div>
            </div>
            <MemberSignOutButton />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Signed-In Email
              </span>
              <span className="text-sm font-semibold text-slate-900 font-mono mt-1 block">
                {member.email}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Account Status
              </span>
              <span className="text-sm font-semibold text-emerald-700 mt-1 block">
                {member.status === 'active' ? 'Secure & Active' : (member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Inactive')}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              Your account is securely linked to your official YRL membership record.
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 5: POST-ACTIVATION ONBOARDING GUIDANCE           */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
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
                You are registered with the <strong>{member.region}</strong> chapter. Regional coordinators will contact you regarding upcoming meetings and community service drives.
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
      </div>
    </div>
  );
}

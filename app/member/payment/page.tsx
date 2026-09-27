import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMemberAuthResult } from '@/lib/auth/server';
import { getMemberApplicationPayment } from '@/lib/payment/service';
import { MemberPaymentReceiptForm } from './MemberPaymentReceiptForm';
import { MomoCopyButton } from '../MomoCopyButton';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  FileCheck2,
} from 'lucide-react';
import { MemberReceiptButton } from '../MemberReceiptButton';

export const metadata = {
  title: 'Submit Membership Payment Receipt | Youth Republic Leadership (YRL)',
  description: 'Upload proof of your GH₵5.00 YRL membership fee payment via Mobile Money.',
};

export const dynamic = 'force-dynamic';

export default async function MemberPaymentPage() {
  const authResult = await getMemberAuthResult();

  if (authResult.status === 'unauthenticated') {
    redirect('/member/login');
  }

  if (authResult.status === 'authenticated') {
    redirect('/member');
  }

  if (authResult.status === 'not_a_member') {
    redirect('/member');
  }

  const { application } = authResult;
  const payment = await getMemberApplicationPayment(application.id);

  if (!payment) {
    return (
      <div className="min-h-[75vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">No Pending Payment Found</h1>
          <p className="text-sm text-slate-600">
            There is no active pending payment record associated with application{' '}
            <strong className="font-mono text-slate-900">{application.application_number}</strong>.
          </p>
          <div className="pt-2">
            <Link href="/member">
              <Button className="bg-[#0B1F3A] hover:bg-[#15345E] text-white">
                Return to Member Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State: Payment already verified/completed
  if (payment.status === 'successful' || application.status === 'payment_verified') {
    return (
      <div className="min-h-[75vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#0B1F3A]">
              Membership Payment Already Verified
            </h1>
            <p className="text-sm text-slate-600">
              Your GH₵5.00 membership fee payment has already been verified by the YRL Secretariat.
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Application Number:</span>
              <span className="font-mono font-bold text-slate-900">{application.application_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Reference:</span>
              <span className="font-mono font-bold text-slate-900">{payment.payment_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-semibold text-emerald-700">Verified & Approved</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Your application is currently undergoing final secretariat approval for Member ID generation.
            No further payment receipt is required.
          </p>

          <div className="pt-2">
            <Link href="/member">
              <Button className="bg-[#0B1F3A] hover:bg-[#15345E] text-white">
                Return to Member Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State: Payment receipt already submitted and awaiting verification
  if (payment.status === 'pending_verification' && application.status === 'pending_verification') {
    return (
      <div className="min-h-[75vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#0B1F3A]">
              Payment Receipt Under Verification
            </h1>
            <p className="text-sm text-slate-600">
              Your payment evidence has already been submitted and is currently in the secretariat verification queue.
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Application Number:</span>
              <span className="font-mono font-bold text-slate-900">{application.application_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Reference:</span>
              <span className="font-mono font-bold text-slate-900">{payment.payment_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Telecom Txn ID:</span>
              <span className="font-mono font-medium text-slate-800">
                {payment.transaction_reference || 'Submitted'}
              </span>
            </div>
            {payment.claimed_payment_date && (
              <div className="flex justify-between">
                <span className="text-slate-500">Claimed Date:</span>
                <span className="font-mono text-slate-800">{payment.claimed_payment_date}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Review Status:</span>
              <span className="font-semibold text-blue-700">Awaiting Admin Verification</span>
            </div>
          </div>

          {payment.has_receipt && (
            <div className="pt-2">
              <MemberReceiptButton paymentId={payment.id} filename={payment.receipt_original_filename} />
            </div>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">
            An authorized vetting officer will verify your transaction against our Mobile Money records.
            You do not need to resubmit unless requested by the secretariat.
          </p>

          <div className="pt-2">
            <Link href="/member">
              <Button className="bg-[#0B1F3A] hover:bg-[#15345E] text-white">
                Return to Member Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active Resumption State: payment is 'pending' or 'rejected'
  const isResubmission = payment.status === 'rejected';

  return (
    <div className="min-h-[80vh] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/member"
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#0B1F3A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Return to Member Dashboard
          </Link>
        </div>

        {/* Header Card */}
        <div className="bg-[#0B1F3A] text-white rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-[#C9A227] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {isResubmission ? 'Resubmit Payment Proof' : 'Submit Membership Fee Receipt'}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Complete payment of the required GH₵5.00 membership fee and upload your receipt.
              </p>
            </div>
          </div>
        </div>

        {/* Existing Record Identification Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">
              Existing Application
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {application.application_number}
            </span>
          </div>

          <div className="sm:text-right">
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">
              Payment Reference
            </span>
            <span className="font-mono font-bold text-[#0B1F3A] text-sm bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {payment.payment_reference}
            </span>
          </div>
        </div>

        {/* Official Mobile Money Payment Destination Card */}
        <div className="bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 border border-amber-300 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#C9A227]" />
              <h2 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                Official Mobile Money Payment Destination
              </h2>
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

        {/* Upload Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <MemberPaymentReceiptForm
            paymentReference={payment.payment_reference}
            applicationNumber={application.application_number}
            amount={payment.amount}
            currency={payment.currency}
            initialTransactionReference={payment.transaction_reference}
            initialClaimedDate={payment.claimed_payment_date}
            rejectionReason={payment.rejection_reason || application.rejection_reason}
            isResubmission={isResubmission}
          />
        </div>

        {/* Governance & Verification Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-blue-950">
            <Shield className="w-4 h-4 text-blue-700" />
            Verification Policy
          </div>
          <p>
            Receipt upload places your payment into the administrative review queue. It does not automatically
            activate membership. The YRL Secretariat verifies every transaction reference against official
            Mobile Money records before approval.
          </p>
        </div>
      </div>
    </div>
  );
}

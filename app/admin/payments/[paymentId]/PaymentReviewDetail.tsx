'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  FileText,
  FileCheck2,
  User,
  CreditCard,
  FileImage,
  ExternalLink,
  AlertTriangle,
  Lock,
  Eye,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  verifyPaymentAction,
  rejectPaymentAction,
  activateMembershipApplicationAction,
  getPaymentReceiptSignedUrlAction,
} from '@/lib/actions/payment';
import type { AdminSession } from '@/lib/auth/types';
import type { PaymentDetailView, PaymentSignedUrlResult } from '@/lib/payment/types';

interface PaymentReviewDetailProps {
  session: AdminSession;
  initialData: PaymentDetailView;
}

export function PaymentReviewDetail({ session, initialData }: PaymentReviewDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<PaymentDetailView>(initialData);

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);

  // Form state
  const [rejectionReason, setRejectionReason] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  // Receipt viewing state
  const [signedUrlData, setSignedUrlData] = useState<PaymentSignedUrlResult | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const payment = data.payment;
  const app = data.application;
  const isNationalReviewer = session.role === 'national_reviewer';

  const canVerify = !isNationalReviewer && payment.status === 'pending_verification';
  const canReject = !isNationalReviewer && payment.status === 'pending_verification';
  const canActivate =
    !isNationalReviewer &&
    payment.status === 'successful' &&
    app.status === 'payment_verified';

  // Handler: View Receipt (Get Signed URL)
  const handleLoadReceipt = async () => {
    setReceiptError(null);
    setReceiptLoading(true);
    const res = await getPaymentReceiptSignedUrlAction(payment.id);
    setReceiptLoading(false);

    if (res.success && res.data) {
      setSignedUrlData(res.data);
    } else {
      setReceiptError(res.error || 'Failed to generate secure receipt access link.');
    }
  };

  // Handler: Verify Payment
  const handleConfirmVerify = () => {
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await verifyPaymentAction(payment.id);
      if (res.success && res.data) {
        setIsVerifyModalOpen(false);
        setActionSuccess('Payment verified successfully. Application status is now payment_verified.');
        setData((prev) => ({
          ...prev,
          payment: {
            ...prev.payment,
            status: 'successful',
            verified_by: session.user.email || session.user.id,
            verified_at: new Date().toISOString(),
          },
          application: {
            ...prev.application,
            status: 'payment_verified',
          },
        }));
      } else {
        setActionError(res.error || 'Failed to verify payment.');
      }
    });
  };

  // Handler: Reject Payment
  const handleConfirmReject = () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setActionError('Rejection reason must be at least 5 characters long.');
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await rejectPaymentAction(payment.id, rejectionReason.trim());
      if (res.success && res.data) {
        setIsRejectModalOpen(false);
        setActionSuccess('Payment has been rejected. Application status is now payment_rejected.');
        setData((prev) => ({
          ...prev,
          payment: {
            ...prev.payment,
            status: 'rejected',
            rejected_by: session.user.email || session.user.id,
            rejected_at: new Date().toISOString(),
            rejection_reason: rejectionReason.trim(),
          },
          application: {
            ...prev.application,
            status: 'payment_rejected',
            rejection_reason: rejectionReason.trim(),
          },
        }));
      } else {
        setActionError(res.error || 'Failed to reject payment.');
      }
    });
  };

  // Handler: Activate Membership
  const handleConfirmActivate = () => {
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await activateMembershipApplicationAction(app.id);
      if (res.success && res.data) {
        setIsActivateModalOpen(false);
        setActionSuccess(
          `Membership activated successfully! Assigned Official Member ID: ${res.data.memberId}`
        );
        setData((prev) => ({
          ...prev,
          application: {
            ...prev.application,
            status: 'activated',
            member_id: res.data?.memberId,
          },
        }));
      } else {
        setActionError(res.error || 'Failed to activate membership.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0E1E3B] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Verification Queue
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0E1E3B]">
              Payment Review: <span className="font-mono">{payment.payment_reference}</span>
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                payment.status === 'successful'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : payment.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {payment.status.replace('_', ' ')}
            </span>
            {app.status === 'activated' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-700" />
                Active Member: {app.member_id || 'YRL-MEM'}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2">
          {canVerify && (
            <Button
              size="sm"
              onClick={() => setIsVerifyModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs flex items-center gap-1.5 min-h-[38px]"
            >
              <Check className="w-4 h-4" /> Verify Payment
            </Button>
          )}

          {canReject && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectModalOpen(true)}
              className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center gap-1.5 min-h-[38px]"
            >
              <X className="w-4 h-4" /> Reject Payment
            </Button>
          )}

          {canActivate && (
            <Button
              size="sm"
              onClick={() => setIsActivateModalOpen(true)}
              className="bg-[#0E1E3B] hover:bg-[#1a335f] text-white text-xs flex items-center gap-1.5 min-h-[38px] shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" /> Activate Membership
            </Button>
          )}

          {isNationalReviewer && (
            <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
              <Lock className="w-3.5 h-3.5" />
              <span>National Reviewer (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-[4px] flex items-start gap-2.5 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong>Action Error:</strong> {actionError}
          </div>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[4px] flex items-start gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong>Success:</strong> {actionSuccess}
          </div>
        </div>
      )}

      {/* Invariant Info Banner */}
      {payment.status === 'successful' && app.status === 'payment_verified' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-[4px] flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Payment is Verified.</strong> Membership has not yet been activated. Click &ldquo;Activate Membership&rdquo; to complete applicant enrollment and generate official YRL Member ID.
            </span>
          </div>
          {canActivate && (
            <Button
              size="sm"
              onClick={() => setIsActivateModalOpen(true)}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs shrink-0"
            >
              Activate Now
            </Button>
          )}
        </div>
      )}

      {/* 3-Panel Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel A: Application Information */}
        <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-[#0E1E3B]" />
            <h2 className="text-sm font-bold text-[#0E1E3B] uppercase tracking-wider">
              Application Details
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Application Number</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {app.application_number}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Applicant Full Name</span>
              <span className="font-semibold text-slate-900 text-sm">{app.full_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Phone Number</span>
                <span className="font-mono text-slate-800">{app.phone_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">WhatsApp</span>
                <span className="font-mono text-slate-800">{app.whatsapp_number || 'None'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Email Address</span>
              <span className="font-mono text-slate-800">{app.email}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Region</span>
                <span className="font-medium text-slate-800">{app.region}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">District / Muni</span>
                <span className="text-slate-800">{app.district_municipality || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Town / Community</span>
              <span className="text-slate-800">{app.town_community || 'N/A'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Gender</span>
                <span className="text-slate-800">{app.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                <span className="text-slate-800">{app.date_of_birth}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Education &amp; Occupation</span>
              <span className="text-slate-800">
                {app.education_level} • {app.occupation}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Why Join YRL</span>
              <p className="text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 italic leading-relaxed">
                &ldquo;{app.why_join}&rdquo;
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Application Status</span>
              <span className="font-semibold capitalize text-slate-800 font-mono">
                {app.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Panel B: Payment Information */}
        <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-[#0E1E3B]" />
            <h2 className="text-sm font-bold text-[#0E1E3B] uppercase tracking-wider">
              Payment Information
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Payment Reference</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {payment.payment_reference}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Amount</span>
                <span className="font-bold text-base text-slate-900">
                  {payment.currency} {payment.amount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Method</span>
                <span className="font-medium text-slate-800">Mobile Money</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Claimed Telecom Txn Reference</span>
              {payment.transaction_reference ? (
                <div className="font-mono text-sm font-bold text-[#0E1E3B] bg-slate-50 p-2 rounded border border-slate-200 select-all">
                  {payment.transaction_reference}
                </div>
              ) : (
                <span className="text-slate-400 italic">No transaction reference submitted</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Claimed Payment Date</span>
                <span className="text-slate-800 font-mono">
                  {payment.claimed_payment_date || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Submitted Timestamp</span>
                <span className="text-slate-800 font-mono text-[11px]">
                  {payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Verification Metadata */}
            {payment.status === 'successful' && (
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Verification Audit
                </span>
                <div className="text-emerald-900 text-xs">
                  Verified by: <strong>{payment.verified_by || 'Admin'}</strong>
                </div>
                <div className="text-emerald-700 text-[11px] font-mono">
                  Verified at: {payment.verified_at ? new Date(payment.verified_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            )}

            {/* Rejection Metadata */}
            {payment.status === 'rejected' && (
              <div className="p-3 bg-rose-50 rounded border border-rose-200 space-y-1.5">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                  Rejection Reason
                </span>
                <p className="text-rose-900 text-xs font-medium">
                  {payment.rejection_reason || app.rejection_reason || 'No reason provided.'}
                </p>
                <div className="text-rose-700 text-[11px]">
                  Rejected by: {payment.rejected_by || 'Admin'}
                </div>
                <div className="text-rose-600 text-[10px] font-mono">
                  {payment.rejected_at ? new Date(payment.rejected_at).toLocaleString() : ''}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel C: Payment Evidence / Receipt */}
        <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileImage className="w-4 h-4 text-[#0E1E3B]" />
            <h2 className="text-sm font-bold text-[#0E1E3B] uppercase tracking-wider">
              Payment Evidence / Receipt
            </h2>
          </div>

          {payment.storage_object_path ? (
            <div className="space-y-4">
              <div className="text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span>File Type:</span>
                  <span className="font-mono text-slate-800">
                    {payment.receipt_mime_type || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>File Size:</span>
                  <span className="font-mono text-slate-800">
                    {payment.receipt_file_size
                      ? `${(payment.receipt_file_size / 1024).toFixed(1)} KB`
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              {!signedUrlData ? (
                <div className="pt-2">
                  <Button
                    onClick={handleLoadReceipt}
                    disabled={receiptLoading}
                    size="sm"
                    className="w-full bg-[#0E1E3B] hover:bg-[#1a335f] text-white text-xs flex items-center justify-center gap-2 min-h-[40px]"
                  >
                    <Eye className="w-4 h-4" />
                    {receiptLoading ? 'Generating Secure Access...' : 'View Receipt Evidence'}
                  </Button>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Private bucket access. Secure link expires in 5 minutes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Temporary Access Link Active (5m)
                    </span>
                    <button
                      onClick={handleLoadReceipt}
                      className="text-[10px] text-amber-800 underline hover:text-amber-950 font-semibold"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Image Viewer */}
                  {(payment.receipt_mime_type?.startsWith('image/') ||
                    data.receipt.mimeType?.startsWith('image/') ||
                    signedUrlData.signedUrl.match(/\.(jpeg|jpg|png|webp)/i)) ? (
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signedUrlData.signedUrl}
                        alt="Payment Receipt Evidence"
                        className="w-full h-auto max-h-[360px] object-contain mx-auto"
                      />
                      <div className="p-2 bg-white border-t border-slate-200 text-center">
                        <a
                          href={signedUrlData.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#0E1E3B] hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open Full-Size Image
                        </a>
                      </div>
                    </div>
                  ) : (
                    /* PDF Document Link */
                    <div className="p-4 bg-slate-50 rounded border border-slate-200 text-center space-y-2">
                      <FileText className="w-8 h-8 text-[#0E1E3B] mx-auto" />
                      <p className="text-xs font-semibold text-slate-800">PDF Receipt Document</p>
                      <a
                        href={signedUrlData.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#0E1E3B] text-white hover:bg-[#1a335f]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Receipt in New Tab
                      </a>
                    </div>
                  )}
                </div>
              )}

              {receiptError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {receiptError}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded border border-dashed border-slate-300 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No Receipt Uploaded</p>
              <p className="text-[11px] text-slate-400">
                Applicant has not submitted a receipt file for this payment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Verify Payment Confirmation */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-emerald-800">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0E1E3B]">Verify Mobile Money Payment</h3>
                <p className="text-xs text-slate-500">Confirm receipt of funds</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
              <p>
                You are verifying payment reference <strong>{payment.payment_reference}</strong> for{' '}
                <strong>GH₵ {payment.amount.toFixed(2)}</strong> from{' '}
                <strong>{app.full_name}</strong>.
              </p>
              <p className="text-emerald-800 font-medium">
                Claimed Txn Ref: <strong>{payment.transaction_reference || 'N/A'}</strong>
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              <strong>Important Invariant:</strong> Verifying this payment will transition payment status to <code>successful</code> and application status to <code>payment_verified</code>. It does <strong>not</strong> activate the membership.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVerifyModalOpen(false)}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmVerify}
                disabled={isPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
              >
                {isPending ? 'Verifying...' : 'Confirm Verification'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Payment */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-800">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <X className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0E1E3B]">Reject Mobile Money Payment</h3>
                <p className="text-xs text-slate-500">Provide reason for rejection</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Please enter the specific reason for rejecting payment reference{' '}
              <strong>{payment.payment_reference}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason <span className="text-red-500">* (min 5 characters)</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Transaction reference does not match official MTN MoMo records..."
                rows={3}
                className="w-full p-2.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReject}
                disabled={isPending || rejectionReason.trim().length < 5}
                className="bg-rose-700 hover:bg-rose-800 text-white text-xs disabled:opacity-50"
              >
                {isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Activate Membership Confirmation */}
      {isActivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-[#0E1E3B]">
              <div className="w-10 h-10 rounded-full bg-[#0E1E3B] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0E1E3B]">Activate Membership</h3>
                <p className="text-xs text-slate-500">Official YRL Enrollment</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
              <p>
                You are activating official membership for applicant <strong>{app.full_name}</strong>{' '}
                (Region: <strong>{app.region}</strong>).
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li>Database will generate authoritative Member ID (<code>YRL-MEM-YYYY-XXXX</code>)</li>
                <li>Applicant record in <code>members</code> table will be set to <code>active</code></li>
                <li>Application record will be set to <code>activated</code></li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsActivateModalOpen(false)}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmActivate}
                disabled={isPending}
                className="bg-[#0E1E3B] hover:bg-[#1a335f] text-white text-xs"
              >
                {isPending ? 'Activating...' : 'Confirm & Activate Membership'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  FileCheck,
  Clock,
} from 'lucide-react';
import { submitApplicantReceipt } from '@/lib/actions/payment';

interface MemberPaymentReceiptFormProps {
  paymentReference: string;
  applicationNumber: string;
  amount: number;
  currency: string;
  initialTransactionReference?: string | null;
  initialClaimedDate?: string | null;
  rejectionReason?: string | null;
  isResubmission?: boolean;
}

export function MemberPaymentReceiptForm({
  paymentReference,
  applicationNumber,
  amount,
  currency,
  initialTransactionReference,
  initialClaimedDate,
  rejectionReason,
  isResubmission,
}: MemberPaymentReceiptFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transactionReference, setTransactionReference] = useState(
    initialTransactionReference || ''
  );
  const [claimedPaymentDate, setClaimedPaymentDate] = useState(
    initialClaimedDate || new Date().toISOString().split('T')[0]
  );
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      if (selectedFile.size > 4 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          file: 'Receipt file is too large. Please upload a receipt no larger than 4 MB.',
        }));
      } else {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(selectedFile.type)) {
          setErrors((prev) => ({
            ...prev,
            file: 'Please upload a supported receipt image or PDF (JPEG, PNG, WEBP, PDF).',
          }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.file;
            return next;
          });
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!transactionReference.trim()) {
      newErrors.transactionReference = 'Enter the Mobile Money transaction reference / SMS ID.';
    } else if (transactionReference.trim().length < 4) {
      newErrors.transactionReference = 'Transaction reference must be at least 4 characters.';
    }

    if (!file) {
      newErrors.file = 'Please upload a receipt file (JPEG, PNG, WEBP, or PDF).';
    } else {
      if (file.size > 4 * 1024 * 1024) {
        newErrors.file = 'Receipt file is too large. Please upload a receipt no larger than 4 MB.';
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        newErrors.file = 'Please upload a supported receipt image or PDF.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('payment_reference', paymentReference);
      formData.append('transaction_reference', transactionReference.trim());
      if (claimedPaymentDate) {
        formData.append('claimed_payment_date', claimedPaymentDate);
      }
      formData.append('receipt_file', file as File);

      const result = await submitApplicantReceipt(formData);

      if (result.success) {
        setIsSuccess(true);
      } else {
        setErrors({
          _server: result.error || 'Failed to submit receipt. Please try again.',
        });
      }
    } catch {
      setErrors({
        _server:
          "We couldn't upload your receipt right now. Please check your connection and try again. If the problem continues, please contact YRL support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center space-y-5 shadow-xs">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0B1F3A]">
            Payment Receipt Submitted Successfully!
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Your payment proof for{' '}
            <strong className="text-slate-900 font-mono">{paymentReference}</strong> has been
            received and placed into the official verification queue.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-w-md mx-auto text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Application Number:</span>
            <span className="font-mono font-bold text-slate-900">{applicationNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payment Reference:</span>
            <span className="font-mono font-bold text-slate-900">{paymentReference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Telecom Txn ID:</span>
            <span className="font-mono font-medium text-slate-800">
              {transactionReference.trim()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Status:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <Clock className="w-3 h-3" /> Under Verification
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/member">
            <Button className="bg-[#0B1F3A] hover:bg-[#15345E] text-white">
              Return to Member Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rejection Alert if Resubmitting */}
      {isResubmission && rejectionReason && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <strong className="text-sm font-bold uppercase tracking-wider text-red-950">
              Action Required: Secretariat Feedback
            </strong>
          </div>
          <div className="bg-white p-3 rounded-lg border border-red-200 text-xs text-red-800 font-medium">
            &ldquo;{rejectionReason}&rdquo;
          </div>
          <p className="text-xs text-red-700">
            Please review the feedback above and upload a valid Mobile Money SMS or transaction receipt.
          </p>
        </div>
      )}

      {/* Server Error Alert */}
      {errors._server && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span>{errors._server}</span>
        </div>
      )}

      {/* Transaction Reference Input */}
      <div>
        <Label htmlFor="transaction_reference" className="text-sm font-semibold text-slate-900 block mb-1">
          Mobile Money Transaction ID / Reference <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-slate-500 mb-2">
          Enter the official transaction ID from your MTN Mobile Money SMS confirmation.
        </p>
        <Input
          id="transaction_reference"
          name="transaction_reference"
          type="text"
          required
          value={transactionReference}
          onChange={(e) => {
            setTransactionReference(e.target.value);
            if (errors.transactionReference) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.transactionReference;
                return next;
              });
            }
          }}
          placeholder="e.g. 28471928371 or MP260927.1845.A12345"
          className={`font-mono text-sm uppercase ${
            errors.transactionReference ? 'border-red-500 focus:ring-red-400' : ''
          }`}
          disabled={isSubmitting}
        />
        {errors.transactionReference && (
          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.transactionReference}
          </p>
        )}
      </div>

      {/* Claimed Payment Date Input */}
      <div>
        <Label htmlFor="claimed_payment_date" className="text-sm font-semibold text-slate-900 block mb-1">
          Date of Transfer
        </Label>
        <Input
          id="claimed_payment_date"
          name="claimed_payment_date"
          type="date"
          value={claimedPaymentDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setClaimedPaymentDate(e.target.value)}
          className="text-sm"
          disabled={isSubmitting}
        />
      </div>

      {/* Receipt File Upload */}
      <div>
        <Label htmlFor="receipt_file" className="text-sm font-semibold text-slate-900 block mb-1">
          Payment Receipt File (Max 4MB) <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-slate-500 mb-2">
          Upload a clear screenshot of your Mobile Money SMS or a PDF transaction statement (PNG, JPG, WEBP, PDF up to 4MB).
        </p>

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            errors.file
              ? 'border-red-400 bg-red-50/40 hover:bg-red-50/70'
              : file
              ? 'border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/50'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-400'
          }`}
        >
          <input
            ref={fileInputRef}
            id="receipt_file"
            name="receipt_file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB • Click to choose a different file
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Click to select receipt file
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  JPEG, PNG, WEBP, or PDF (Max 4MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {errors.file && (
          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.file}
          </p>
        )}
      </div>

      {/* Submission Button */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/member" className="w-full sm:w-auto order-2 sm:order-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto text-slate-700"
            disabled={isSubmitting}
          >
            Cancel & Return to Dashboard
          </Button>
        </Link>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto order-1 sm:order-2 bg-[#0B1F3A] hover:bg-[#15345E] text-white font-semibold py-2.5 px-6 shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading Receipt...
            </>
          ) : (
            <>
              {isResubmission ? 'Resubmit Payment Proof' : 'Submit Payment Receipt'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

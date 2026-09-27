'use client';

import React, { useState } from 'react';
import { Download, Loader2, AlertCircle, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getMemberOwnPaymentReceiptSignedUrlAction } from '@/lib/actions/payment';

interface MemberReceiptButtonProps {
  paymentId?: string;
  filename?: string | null;
  buttonText?: string;
  variant?: 'outline' | 'secondary' | 'gold' | 'primary' | 'ghost';
  className?: string;
}

export function MemberReceiptButton({
  paymentId,
  filename,
  buttonText = 'Download Receipt',
  variant = 'outline',
  className = '',
}: MemberReceiptButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getMemberOwnPaymentReceiptSignedUrlAction(paymentId);
      if (!result.success || !result.data?.signedUrl) {
        setError(result.error || 'Unable to retrieve receipt download link.');
        setIsLoading(false);
        return;
      }

      // Trigger download / open signed URL safely
      const downloadName = filename || result.data.filename || 'yrl-membership-receipt';
      const link = document.createElement('a');
      link.href = result.data.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while downloading receipt.');
      setIsLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={isLoading}
        onClick={handleDownload}
        className={`min-h-[44px] text-xs font-semibold flex items-center gap-2 ${className}`}
        aria-label="Download uploaded payment receipt"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Generating Link...</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>{buttonText}</span>
          </>
        )}
      </Button>

      {error && (
        <span className="text-[11px] text-red-600 flex items-center gap-1 mt-1" role="alert">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

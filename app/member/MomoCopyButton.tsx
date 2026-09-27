'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MomoCopyButtonProps {
  numberToCopy: string;
}

export function MomoCopyButton({ numberToCopy }: MomoCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(numberToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-semibold rounded-md border border-amber-300 bg-amber-100 hover:bg-amber-200 text-[#0B1F3A] transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
      aria-label={'Copy official Mobile Money number ' + numberToCopy}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-700 mr-1" aria-hidden="true" />
          <span className="text-emerald-800 font-bold">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 text-amber-900 mr-1" aria-hidden="true" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 bg-slate-50">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-[4px] p-8 sm:p-10 shadow-sm border-t-4 border-t-[#C9A227]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-[#C9A227]/40 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6 text-[#C9A227]" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Status 404
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0E1E3B] tracking-tight">
              Page Not Found
            </h1>
          </div>
        </div>

        <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-6">
          This page doesn&apos;t exist. Here&apos;s where you might be headed instead:
        </p>

        <ul className="space-y-3 mb-8 text-sm">
          <li className="flex items-center gap-2 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
            <Link href="/" className="text-[#0E1E3B] hover:text-[#006B3F] hover:underline font-medium">
              Return to Homepage
            </Link>
          </li>
          <li className="flex items-center gap-2 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
            <Link href="/positions" className="text-[#0E1E3B] hover:text-[#006B3F] hover:underline font-medium">
              Explore Open Interim Leadership Positions
            </Link>
          </li>
          <li className="flex items-center gap-2 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
            <Link href="/nominate" className="text-[#0E1E3B] hover:text-[#006B3F] hover:underline font-medium">
              Submit a Nomination
            </Link>
          </li>
          <li className="flex items-center gap-2 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
            <Link href="/join" className="text-[#0E1E3B] hover:text-[#006B3F] hover:underline font-medium">
              Register as a General Member
            </Link>
          </li>
          <li className="flex items-center gap-2 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
            <Link href="/contact" className="text-[#0E1E3B] hover:text-[#006B3F] hover:underline font-medium">
              Contact the Secretariat
            </Link>
          </li>
        </ul>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Link href="/">
            <Button variant="primary" size="md">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

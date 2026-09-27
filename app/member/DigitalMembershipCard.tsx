'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Printer,
  RotateCw,
  Award,
  CheckCircle2,
  Calendar,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DigitalMembershipCardProps {
  member: {
    member_id: string;
    full_name: string;
    region: string;
    status: string;
    created_at: string;
    district_municipality?: string;
  };
}

export function DigitalMembershipCard({ member }: DigitalMembershipCardProps) {
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  const joinDateFormatted = new Date(member.created_at).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Print Stylesheet: Isolates the card when printing / saving as PDF */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #yrl-printable-card-wrapper,
              #yrl-printable-card-wrapper * {
                visibility: visible;
              }
              #yrl-printable-card-wrapper {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                background: white !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1F3A]">
              Official Digital Membership Card
            </h3>
            <p className="text-xs text-slate-500">
              Verified civic identification credential issued by the National Secretariat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCardSide((prev) => (prev === 'front' ? 'back' : 'front'))}
            className="min-h-[44px] text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50"
            aria-label={`Flip card to ${cardSide === 'front' ? 'back' : 'front'} view`}
          >
            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
            {cardSide === 'front' ? 'View Card Back' : 'View Card Front'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="min-h-[44px] text-xs font-semibold bg-[#0B1F3A] hover:bg-[#15345E] text-white"
            aria-label="Print or Save Official Membership Card"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save Card
          </Button>
        </div>
      </div>

      {/* Card Display Container */}
      <div id="yrl-printable-card-wrapper" className="flex justify-center">
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden shadow-lg border border-slate-700 bg-gradient-to-br from-[#071527] via-[#0B1F3A] to-[#15345E] text-white relative select-none transition-all duration-300"
          style={{ minHeight: '230px' }}
        >
          {/* Subtle civic watermark background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
            <ShieldCheck className="w-72 h-72 text-white" />
          </div>

          {/* Tricolor National Civic Accent Ribbon */}
          <div className="h-1.5 w-full flex">
            <div className="w-1/3 bg-[#CE1126]" />
            <div className="w-1/3 bg-[#FCD116]" />
            <div className="w-1/3 bg-[#006B3F]" />
          </div>

          {cardSide === 'front' ? (
            /* ======================================================== */
            /* CARD FRONT: OFFICIAL CREDENTIAL DETAILS                  */
            /* ======================================================== */
            <div className="p-5 sm:p-6 flex flex-col justify-between h-full relative z-10 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center text-[#FCD116]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-200 block">
                      Youth Republic Leadership
                    </span>
                    <span className="text-[9px] text-[#FCD116] uppercase tracking-widest font-semibold block">
                      National Civic Movement &bull; Ghana
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3" />
                  {member.status.toUpperCase()}
                </span>
              </div>

              {/* Member Core Identity */}
              <div className="space-y-1.5 my-1">
                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest block">
                  Official Member Name
                </span>
                <h4 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase leading-tight">
                  {member.full_name}
                </h4>
              </div>

              {/* ID Box and Regional Chapter */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white/10 backdrop-blur-xs rounded-lg p-2.5 border border-white/15">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block">
                    Official Member ID
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-[#FCD116] tracking-wider block mt-0.5">
                    {member.member_id}
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-lg p-2.5 border border-white/15">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block">
                    Regional Chapter
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white block mt-0.5 truncate">
                    {member.region}
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#C9A227]" />
                  <span>Issued: {joinDateFormatted}</span>
                </span>
                <span className="text-[#FCD116] font-mono tracking-wider font-semibold">
                  SECURE CIVIC CREDENTIAL
                </span>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* CARD BACK: ETHOS, CONSTITUTIONAL RIGHTS & ENDORSEMENT    */
            /* ======================================================== */
            <div className="p-5 sm:p-6 flex flex-col justify-between h-full relative z-10 space-y-4">
              {/* Back Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-bold text-[#FCD116] uppercase tracking-wider">
                  Constitutional Declaration & Member Rights
                </span>
                <span className="text-[9px] text-slate-300 font-mono">
                  REF: {member.member_id}
                </span>
              </div>

              {/* Civic Ethos Quote */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs italic text-slate-200 text-center leading-relaxed">
                  &ldquo;Leadership is service, not privilege.&rdquo;
                </p>
                <span className="text-[9px] text-[#FCD116] text-center block mt-1 uppercase font-semibold">
                  — Youth Republic Leadership Foundational Ethos
                </span>
              </div>

              {/* Entitlements */}
              <div className="space-y-1.5 text-[10px] text-slate-200 leading-snug">
                <p className="flex items-start gap-1.5">
                  <span className="text-[#FCD116] font-bold">&bull;</span>
                  <span>Bearer is entitled to full democratic participation in regional assemblies.</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-[#FCD116] font-bold">&bull;</span>
                  <span>Authorized to vote in official YRL elections and stand for leadership nomination where eligible.</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-[#FCD116] font-bold">&bull;</span>
                  <span>Non-transferable personal credential. Present upon request at official YRL conventions.</span>
                </p>
              </div>

              {/* Secretariat Seal */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-300">
                <div>
                  <span className="block font-semibold text-white">YRL Interim National Secretariat</span>
                  <span className="block text-slate-400">Accra &bull; Republic of Ghana</span>
                </div>
                <div className="text-right">
                  <span className="text-[#FCD116] font-bold block">VERIFIED STATUS</span>
                  <span className="text-slate-400 font-mono">yrl.org.gh</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Helpful Hint */}
      <div className="text-center text-xs text-slate-500 no-print flex items-center justify-center gap-1.5 pt-1">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>Use the print button to generate a physical wallet card or save as a digital PDF file.</span>
      </div>
    </div>
  );
}

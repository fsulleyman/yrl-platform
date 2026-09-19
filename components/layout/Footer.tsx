import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, ExternalLink } from 'lucide-react';
import { FOOTER_NAV, SITE_IDENTITY, SOCIAL_LINKS } from '@/data/navigation';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#061120] text-slate-300 border-t border-[#C9A227]/30 relative mt-auto">
      {/* Ghana Flag micro-stripe accent line */}
      <div
        className="h-1 w-full bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1: Organisation & Brand Seal */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-white/10 border-2 border-[#C9A227] flex items-center justify-center shrink-0">
                <Image
                  src="/brand/logo.png"
                  alt={`${SITE_IDENTITY.name} Seal`}
                  width={44}
                  height={44}
                  className="object-contain"
                />
                <Shield className="w-5 h-5 text-[#C9A227] absolute pointer-events-none -z-10" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-white font-heading font-bold text-base sm:text-lg tracking-tight leading-tight">
                  {SITE_IDENTITY.name}
                </h3>
                <p className="text-xs text-[#C9A227] tracking-wider uppercase font-medium">
                  {SITE_IDENTITY.country}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-white tracking-wide">
                Motto: <span className="text-[#FCD116] font-normal">{SITE_IDENTITY.motto}</span>
              </p>
              <p className="text-xs text-slate-400">
                Tagline: <span className="text-slate-300 italic">{SITE_IDENTITY.tagline}</span>
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {SITE_IDENTITY.summary}
            </p>

            {/* Mandatory Disclaimer Box */}
            <div className="bg-white/5 border border-[#C9A227]/30 rounded-[4px] p-3 text-xs text-slate-300 leading-normal">
              <span className="font-semibold text-[#FCD116]">Official Notice: </span>
              {SITE_IDENTITY.notice}
            </div>
          </div>

          {/* Column 2: Site Navigation */}
          <div>
            <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {FOOTER_NAV.main.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="py-1 inline-block text-slate-300 hover:text-[#FCD116] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded-[2px]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Civic Participation */}
          <div>
            <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
              Civic Participation
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              <li>
                <Link
                  href="/get-involved/nominate"
                  className="py-1 inline-flex items-center gap-1.5 text-[#FCD116] hover:text-white font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded-[2px]"
                >
                  <span>Submit Nomination</span>
                  <span className="text-[10px] uppercase font-bold bg-[#FCD116]/20 text-[#FCD116] px-1.5 py-0.5 rounded-[2px]">
                    Free
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/get-involved/join"
                  className="py-1 inline-block text-emerald-400 hover:text-white font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded-[2px]"
                >
                  Join as Member
                </Link>
              </li>
              <li>
                <Link
                  href="/notice"
                  className="py-1 inline-block text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded-[2px]"
                >
                  Official Notice Board
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="py-1 inline-block text-slate-400 hover:text-white transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded-[2px]"
                >
                  Privacy Policy (Act 843)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Official Channels & Notices */}
          <div>
            <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
              Official Channels
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Official social communications channels will be published upon conclusion of the interim setup phase.
            </p>
            <ul className="space-y-2">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.platform}>
                  <div
                    className="inline-flex items-center justify-between w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-[4px] text-xs text-slate-400"
                    aria-disabled="true"
                  >
                    <span>{link.platform}</span>
                    <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                      Coming Soon
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {currentYear} {SITE_IDENTITY.name} ({SITE_IDENTITY.shortName}). All rights reserved.
          </p>
          <p className="text-center sm:text-right">
            Independent, voluntary & non-partisan organisation • Republic of Ghana
          </p>
        </div>
      </div>
    </footer>
  );
}

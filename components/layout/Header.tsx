'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HEADER_NAV, GET_INVOLVED_NAV, SITE_IDENTITY } from '@/data/navigation';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Close mobile drawer whenever pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle focus trap, escape key, and focus restoration
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      // Shift focus to close button when drawer opens
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setMobileMenuOpen(false);
        } else if (event.key === 'Tab' && drawerRef.current) {
          const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];

            if (event.shiftKey && document.activeElement === firstEl) {
              event.preventDefault();
              lastEl.focus();
            } else if (!event.shiftKey && document.activeElement === lastEl) {
              event.preventDefault();
              firstEl.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
      // Restore focus to trigger when drawer closes
      triggerRef.current?.focus();
    }
  }, [mobileMenuOpen]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B1F3A] text-white border-b border-[#C9A227]/30 shadow-md">
      {/* Ghana Flag micro-stripe accent line */}
      <div
        className="h-1 w-full bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Seal & Organisation Identity */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] rounded-[4px] py-1"
          >
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white/10 border-2 border-[#C9A227] flex items-center justify-center shrink-0">
              <Image
                src="/brand/logo.png"
                alt={`${SITE_IDENTITY.name} Official Seal`}
                width={48}
                height={48}
                className="object-contain"
                priority
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Shield className="w-6 h-6 text-[#C9A227] absolute pointer-events-none -z-10" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-[#FCD116] transition-colors leading-tight">
                {SITE_IDENTITY.name}
              </span>
              <span className="text-[11px] text-[#C9A227] tracking-wider uppercase font-medium">
                {SITE_IDENTITY.country} • Civic Leadership
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium"
          >
            {HEADER_NAV.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-[4px] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${
                    active
                      ? 'text-[#FCD116] bg-white/10 font-semibold'
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Link href="/member">
              <Button
                variant="outline"
                size="sm"
                className="border-[#C9A227]/60 text-[#FCD116] hover:bg-white/10 hover:text-white"
              >
                Member Portal
              </Button>
            </Link>
            <Link href="/get-involved/join">
              <Button
                variant="outline"
                size="sm"
                className="border-white/40 text-white hover:bg-white/10 hover:text-white"
              >
                Join YRL
              </Button>
            </Link>
            <Link href="/get-involved/nominate">
              <Button
                variant="gold"
                size="sm"
                className="shadow-sm font-semibold"
              >
                Get Involved
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex lg:hidden">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-in Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm bg-[#0B1F3A] border-l border-[#C9A227]/40 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-[#C9A227] flex items-center justify-center shrink-0">
                    <Image
                      src="/brand/logo.png"
                      alt={SITE_IDENTITY.name}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <span className="font-heading font-bold text-sm text-white uppercase tracking-wider">
                    Menu
                  </span>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <nav aria-label="Mobile Menu Links" className="flex flex-col gap-1.5">
                {HEADER_NAV.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-2.5 rounded-[4px] text-base transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${
                        active
                          ? 'bg-white/15 text-[#FCD116] font-semibold'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span>{link.label}</span>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#FCD116]" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Actions & Civic Notice */}
            <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
              <Link
                href="/get-involved/nominate"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button variant="gold" fullWidth size="md" className="font-semibold justify-center">
                  <span>Nominate Yourself</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link
                href="/member"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  className="border-[#C9A227]/60 text-[#FCD116] hover:bg-white/10 justify-center"
                >
                  Member Portal
                </Button>
              </Link>
              <Link
                href="/get-involved/join"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  className="border-white/30 text-white hover:bg-white/10 justify-center"
                >
                  Join as a Member
                </Button>
              </Link>

              <div className="bg-white/5 border border-white/10 rounded-[4px] p-2.5 text-center mt-2">
                <p className="text-[11px] text-slate-300 leading-tight">
                  <span className="text-[#FCD116] font-semibold">Free & Voluntary: </span>
                  Nominations are 100% free.
                </p>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                {SITE_IDENTITY.name} • {SITE_IDENTITY.country}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

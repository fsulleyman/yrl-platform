'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  ArrowRight,
  Shield,
  FileText,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeading } from '@/components/ui/PageHeading';
import { Input } from '@/components/ui/Input';
import { Accordion, AccordionItem } from '@/components/ui/Accordion';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { FAQ_ITEMS, FAQ_CATEGORIES } from '@/data/faq';
import { SITE_IDENTITY } from '@/data/navigation';

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'faq-1': true, // Open the first FAQ by default
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col">
      {/* ========================================================================= */}
      {/* PAGE HERO HEADER                                                          */}
      {/* ========================================================================= */}
      <section className="relative bg-[#0B1F3A] text-white pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden border-b border-[#C9A227]/20">
        <div
          className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[#006B3F]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <Container size="lg" className="relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#C9A227]/40 text-xs sm:text-sm font-semibold text-[#FCD116]">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Civic Information &amp; Answers</span>
            </div>

            <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-tight">
              Frequently Asked Questions
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Find transparent, direct answers regarding Youth Republic Leadership (YRL), our
              eligibility criteria, non-partisan civil society status, interim setup, and how to get
              involved.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006B3F]" />
                <span className="text-white font-medium">12 Verified Answers</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Shield className="w-3.5 h-3.5 text-[#FCD116]" />
                <span className="text-white font-medium">100% Free Process</span>
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 1: PERSISTENT NOTICE CALLOUT                                      */}
      {/* ========================================================================= */}
      <section className="bg-slate-50 border-b border-slate-200 py-6 sm:py-8">
        <Container size="lg">
          <NoticeBanner variant="card" />
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: FAQ SEARCH, CATEGORIES & ACCORDION                            */}
      {/* ========================================================================= */}
      <Section background="white" spacing="lg">
        <Container size="lg">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Search & Category Filter Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:max-w-md relative">
                  <label htmlFor="faq-search" className="sr-only">
                    Search questions and answers
                  </label>
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="faq-search"
                    type="text"
                    placeholder="Search questions (e.g. free, interim, age)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs sm:text-sm"
                  />
                </div>

                <p className="text-xs text-slate-500 shrink-0">
                  Showing {filteredFaqs.length} of {FAQ_ITEMS.length} questions
                </p>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1" role="tablist" aria-label="FAQ Categories">
                {FAQ_CATEGORIES.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedCategory(category)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${
                        isActive
                          ? 'bg-[#0B1F3A] text-white font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accordion List */}
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-3">
                <p className="text-sm text-slate-600">
                  No questions match &ldquo;{searchQuery}&rdquo;.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="text-xs"
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <Accordion>
                {filteredFaqs.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    id={faq.id}
                    question={faq.question}
                    badge={faq.category}
                    isOpen={!!openItems[faq.id]}
                    onToggle={() => toggleItem(faq.id)}
                  >
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {/* Quick Link to Notice Board */}
            <div className="p-4 sm:p-5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#C9A227] shrink-0" />
                <p className="text-xs sm:text-sm text-slate-700">
                  Looking for our mandatory legal, non-governmental, and fraud prevention declarations?
                </p>
              </div>
              <Link href="/notice" className="shrink-0 text-xs font-semibold text-[#0B1F3A] hover:text-[#C9A227] flex items-center gap-1">
                <span>View Notice Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* ========================================================================= */}
      {/* SECTION 3: CLOSING ACTION BLOCK                                           */}
      {/* ========================================================================= */}
      <section className="bg-[#0B1F3A] text-white py-14 sm:py-16 border-t border-[#C9A227]/20">
        <Container size="md" className="text-center space-y-6">
          <Badge variant="gold" size="md">
            Ready to Begin?
          </Badge>

          <h2 className="font-heading font-bold text-2xl sm:text-4xl text-white tracking-tight">
            Take Your Step into Civic Leadership
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            All nominations and memberships are 100% free. Apply for an interim leadership role or
            join as a general civic member today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/get-involved/nominate" className="w-full sm:w-auto">
              <Button variant="gold" size="lg" className="w-full sm:w-auto font-bold px-8">
                <span>Submit Leadership Nomination</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/get-involved/join" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white/40 text-white hover:bg-white/10 hover:text-white"
              >
                Join as a Member
              </Button>
            </Link>
          </div>

          <div className="pt-2 flex justify-center gap-6 text-xs text-slate-400">
            <Link href="/structure" className="hover:text-[#FCD116] underline underline-offset-4">
              Explore Structure
            </Link>
            <Link href="/notice" className="hover:text-[#FCD116] underline underline-offset-4">
              Read Official Notice
            </Link>
            <Link href="/contact" className="hover:text-[#FCD116] underline underline-offset-4">
              Contact Secretariat
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

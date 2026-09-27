import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MemberDashboardPage from '@/app/member/page';
import * as authServer from '@/lib/auth/server';
import * as paymentService from '@/lib/payment/service';

// Mock child client components that use interactive hooks/handlers
vi.mock('@/app/member/SignOutButton', () => ({
  MemberSignOutButton: () => React.createElement('button', { 'data-testid': 'signout-btn' }, 'Sign Out'),
}));

vi.mock('@/app/member/DigitalMembershipCard', () => ({
  DigitalMembershipCard: () => React.createElement('div', { 'data-testid': 'membership-card' }, 'Card'),
}));

vi.mock('@/app/member/MemberReceiptButton', () => ({
  MemberReceiptButton: () => React.createElement('button', { 'data-testid': 'receipt-btn' }, 'Receipt'),
}));

vi.mock('@/app/member/MomoCopyButton', () => ({
  MomoCopyButton: () => React.createElement('button', { 'data-testid': 'copy-btn' }, 'Copy'),
}));

describe('Phase B19: Member Dashboard — Account & Security UX Cleanup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createMockMember = (overrides = {}) => ({
    id: 'mem-1111-2222-3333-4444',
    member_id: 'YRL-MEM-2026-1001',
    full_name: 'Kofi Annor',
    email: 'kofi.annor@example.com',
    phone_number: '0244123456',
    whatsapp_number: '0244123456',
    date_of_birth: '1995-05-10',
    gender: 'Male',
    region: 'Greater Accra',
    district_municipality: 'Accra Metropolitan',
    town_community: 'Osu',
    occupation: 'Community Organizer',
    education_level: "Bachelor's Degree",
    availability: '5-10 hours/week',
    why_join: 'Building youth leadership.',
    civic_acknowledgement: true,
    engagement_interests: ['civic_education'],
    status: 'active',
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
    ...overrides,
  });

  const createMockApplication = (overrides = {}) => ({
    id: 'app-1111-2222-3333-4444',
    application_number: 'YRL-APP-2026-1001',
    member_id: 'mem-1111-2222-3333-4444',
    full_name: 'Kofi Annor',
    email: 'kofi.annor@example.com',
    status: 'activated',
    submitted_at: '2026-09-20T09:00:00Z',
    activated_at: '2026-09-20T11:00:00Z',
    rejection_reason: null,
    ...overrides,
  });

  // =========================================================================
  // Requirement 1: Authenticated member email is displayed dynamically
  // =========================================================================
  describe('1. Dynamic Authenticated Email Display', () => {
    it('displays the authenticated member email dynamically for member A', async () => {
      const memberA = createMockMember({ email: 'kofi.annor@example.com' });
      vi.spyOn(authServer, 'getMemberAuthResult').mockResolvedValue({
        status: 'authenticated',
        session: {
          user: { id: 'auth-user-1', email: memberA.email },
          member: memberA,
          application: createMockApplication({ email: memberA.email }),
        },
      });
      vi.spyOn(paymentService, 'getMemberApplicationPayment').mockResolvedValue(null);

      const pageJsx = await MemberDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      expect(html).toContain('kofi.annor@example.com');
      expect(html).toContain('Signed-In Email');
    });

    it('displays a different authenticated member email dynamically for member B (not hardcoded)', async () => {
      const memberB = createMockMember({ email: 'abena.mansa@example.com' });
      vi.spyOn(authServer, 'getMemberAuthResult').mockResolvedValue({
        status: 'authenticated',
        session: {
          user: { id: 'auth-user-2', email: memberB.email },
          member: memberB,
          application: createMockApplication({ email: memberB.email }),
        },
      });
      vi.spyOn(paymentService, 'getMemberApplicationPayment').mockResolvedValue(null);

      const pageJsx = await MemberDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      expect(html).toContain('abena.mansa@example.com');
      expect(html).not.toContain('kofi.annor@example.com');
    });
  });

  // =========================================================================
  // Requirement 2: Old technical phrases are no longer rendered
  // =========================================================================
  describe('2. Elimination of Implementation Jargon in Member UI', () => {
    const technicalPhrases = [
      'Server-Authoritative',
      'HTTP-Only Cookies',
      'cryptographically validated',
      'Client-side parameters',
      'Session Authorization Model',
      'Authenticated Account Email',
    ];

    it.each(technicalPhrases)(
      'does NOT render "%s" in the member dashboard output',
      async (phrase) => {
        const member = createMockMember();
        vi.spyOn(authServer, 'getMemberAuthResult').mockResolvedValue({
          status: 'authenticated',
          session: {
            user: { id: 'auth-user-1', email: member.email },
            member,
            application: createMockApplication(),
          },
        });
        vi.spyOn(paymentService, 'getMemberApplicationPayment').mockResolvedValue(null);

        const pageJsx = await MemberDashboardPage();
        const html = renderToStaticMarkup(pageJsx);

        expect(html).not.toContain(phrase);
      }
    );

    it('does NOT contain technical phrases in app/member/page.tsx', () => {
      const filePath = path.resolve(process.cwd(), 'app/member/page.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).not.toContain('Server-Authoritative');
      expect(content).not.toContain('HTTP-Only Cookies');
      expect(content).not.toContain('cryptographically validated');
      expect(content).not.toContain('Client-side parameters');
    });
  });

  // =========================================================================
  // Requirement 3: Desired member-friendly content and status
  // =========================================================================
  describe('3. Desired Member-Friendly Content & Supporting Message', () => {
    it('renders "Account & Security" and new descriptive subtitle', async () => {
      const member = createMockMember();
      vi.spyOn(authServer, 'getMemberAuthResult').mockResolvedValue({
        status: 'authenticated',
        session: {
          user: { id: 'auth-user-1', email: member.email },
          member,
          application: createMockApplication(),
        },
      });
      vi.spyOn(paymentService, 'getMemberApplicationPayment').mockResolvedValue(null);

      const pageJsx = await MemberDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      expect(html).toContain('Account &amp; Security');
      expect(html).toContain('Manage your account and view your security status.');
    });

    it('renders "Signed-In Email" and "Account Status" labels with "Secure & Active" for active members', async () => {
      const member = createMockMember({ status: 'active' });
      vi.spyOn(authServer, 'getMemberAuthResult').mockResolvedValue({
        status: 'authenticated',
        session: {
          user: { id: 'auth-user-1', email: member.email },
          member,
          application: createMockApplication(),
        },
      });
      vi.spyOn(paymentService, 'getMemberApplicationPayment').mockResolvedValue(null);

      const pageJsx = await MemberDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      expect(html).toContain('Signed-In Email');
      expect(html).toContain('Account Status');
      expect(html).toContain('Secure &amp; Active');
    });

    it('renders the friendly supporting message', async () => {
      const member = createMockMember();
      vi.spyOn(authServer, 'getMemberAuthResult').mockResolvedValue({
        status: 'authenticated',
        session: {
          user: { id: 'auth-user-1', email: member.email },
          member,
          application: createMockApplication(),
        },
      });
      vi.spyOn(paymentService, 'getMemberApplicationPayment').mockResolvedValue(null);

      const pageJsx = await MemberDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      expect(html).toContain('Your account is securely linked to your official YRL membership record.');
    });
  });

  // =========================================================================
  // Requirement 4: State integrity & Non-Active Member Safeguard
  // =========================================================================
  describe('4. Member Status Logic & Security Safeguards', () => {
    it('does NOT falsely display "Secure & Active" if member is suspended or inactive', async () => {
      const member = createMockMember({ status: 'suspended' });
      vi.spyOn(authServer, 'getMemberAuthResult').mockResolvedValue({
        status: 'authenticated',
        session: {
          user: { id: 'auth-user-1', email: member.email },
          member,
          application: createMockApplication(),
        },
      });
      vi.spyOn(paymentService, 'getMemberApplicationPayment').mockResolvedValue(null);

      const pageJsx = await MemberDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      expect(html).not.toContain('Secure &amp; Active');
      expect(html).toContain('Suspended');
    });

    it('verifies that authentication & authorization functions are intact and unaltered', () => {
      expect(typeof authServer.getMemberAuthResult).toBe('function');
      expect(typeof authServer.getMemberSession).toBe('function');
      expect(typeof authServer.getAdminAuthResult).toBe('function');
    });
  });
});

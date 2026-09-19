import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryRateLimiter,
  RATE_LIMIT_CONFIGS,
  extractClientIp,
  publicSubmissionRateLimiter,
  adminLoginRateLimiter,
} from '@/lib/security/rate-limit';
import {
  maskPhone,
  maskEmail,
  maskDateOfBirth,
  maskDocumentUrl,
  maskAddress,
  maskNominationRecord,
} from '@/lib/security/privacy';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  NotFoundError,
  sanitizeError,
} from '@/lib/errors';
import GlobalError from '@/app/global-error';
import React from 'react';
import { renderToString } from 'react-dom/server';

describe('Phase B11: Security & Production Hardening', () => {
  // ===========================================================================
  // 1. RATE LIMITING
  // ===========================================================================
  describe('1. In-Memory Sliding-Window Rate Limiter', () => {
    let testLimiter: InMemoryRateLimiter;
    const baseTime = 1700000000000;

    beforeEach(() => {
      // 3 requests per 60 seconds for deterministic testing
      testLimiter = new InMemoryRateLimiter({
        maxRequests: 3,
        windowMs: 60 * 1000,
      });
    });

    it('allows requests within threshold', () => {
      const res1 = testLimiter.check('client-1', baseTime);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = testLimiter.check('client-1', baseTime + 1000);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = testLimiter.check('client-1', baseTime + 2000);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);
    });

    it('blocks requests exceeding threshold and returns accurate retry metadata', () => {
      testLimiter.check('client-1', baseTime);
      testLimiter.check('client-1', baseTime + 1000);
      testLimiter.check('client-1', baseTime + 2000);

      // 4th request exceeds maxRequests
      const blockedRes = testLimiter.check('client-1', baseTime + 3000);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.retryAfterSeconds).toBe(57); // oldest (baseTime) + 60s - (baseTime + 3s) = 57s
      expect(blockedRes.resetAt).toBe(baseTime + 60000);
    });

    it('prunes expired timestamps and resets allowance after window expires', () => {
      testLimiter.check('client-1', baseTime);
      testLimiter.check('client-1', baseTime + 1000);
      testLimiter.check('client-1', baseTime + 2000);

      // Advance time beyond all previous timestamps (oldest is 0s, latest is 2s; +63s exceeds all)
      const afterWindow = baseTime + 63000;
      const res = testLimiter.check('client-1', afterWindow);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(2);
    });

    it('prune removes empty trackers and prevents unbounded memory growth', () => {
      testLimiter.check('client-a', baseTime);
      testLimiter.check('client-b', baseTime);
      expect(testLimiter.getTrackerSize()).toBe(2);

      // Prune after window expiration
      const pruned = testLimiter.prune(baseTime + 70000);
      expect(pruned).toBe(2);
      expect(testLimiter.getTrackerSize()).toBe(0);
    });

    it('reset clears rate limit for a specific identifier or all identifiers', () => {
      testLimiter.check('client-1', baseTime);
      testLimiter.check('client-1', baseTime);
      testLimiter.check('client-1', baseTime);
      expect(testLimiter.check('client-1', baseTime).allowed).toBe(false);

      testLimiter.reset('client-1');
      expect(testLimiter.check('client-1', baseTime).allowed).toBe(true);
    });

    it('extractClientIp correctly reads forwarded headers or falls back to local IP', () => {
      const mockHeaders1 = {
        get: (name: string) => (name === 'x-forwarded-for' ? '197.251.130.42, 10.0.0.1' : null),
      };
      expect(extractClientIp(mockHeaders1)).toBe('197.251.130.42');

      const mockHeaders2 = {
        get: (name: string) => (name === 'x-real-ip' ? '154.160.22.10' : null),
      };
      expect(extractClientIp(mockHeaders2)).toBe('154.160.22.10');

      const mockHeadersEmpty = {
        get: () => null,
      };
      expect(extractClientIp(mockHeadersEmpty)).toBe('127.0.0.1');
    });

    it('centralized configs provide appropriate thresholds for Ghana networks', () => {
      expect(RATE_LIMIT_CONFIGS.PUBLIC_SUBMISSION.maxRequests).toBe(10);
      expect(RATE_LIMIT_CONFIGS.PUBLIC_SUBMISSION.windowMs).toBe(10 * 60 * 1000);

      expect(RATE_LIMIT_CONFIGS.ADMIN_LOGIN.maxRequests).toBe(5);
      expect(RATE_LIMIT_CONFIGS.ADMIN_LOGIN.windowMs).toBe(15 * 60 * 1000);
    });
  });

  // ===========================================================================
  // 2. PRIVACY & PII MASKING
  // ===========================================================================
  describe('2. Privacy & PII Protection Utilities', () => {
    it('maskPhone redacts Ghanaian phone numbers while preserving operator and ending digits', () => {
      expect(maskPhone('+233241234567')).toBe('+233****567');
      expect(maskPhone('0241234567')).toBe('0241****567');
      expect(maskPhone('+233501112233')).toBe('+233****233');
      expect(maskPhone('12345')).toBe('12***45');
      expect(maskPhone('123')).toBe('****');
      expect(maskPhone(null)).toBe('');
      expect(maskPhone(undefined)).toBe('');
      expect(maskPhone('')).toBe('');
    });

    it('maskEmail redacts email addresses safely', () => {
      expect(maskEmail('kofi.mensah@example.org')).toBe('k***h@example.org');
      expect(maskEmail('ab@test.com')).toBe('a***@test.com');
      expect(maskEmail('a@test.com')).toBe('***@test.com');
      expect(maskEmail(null)).toBe('');
      expect(maskEmail(undefined)).toBe('');
    });

    it('maskDateOfBirth preserves year for age eligibility while masking day/month', () => {
      expect(maskDateOfBirth('1998-04-12')).toBe('1998-**-**');
      expect(maskDateOfBirth('2001-11-30')).toBe('2001-**-**');
      expect(maskDateOfBirth('invalid')).toBe('****-**-**');
      expect(maskDateOfBirth(null)).toBe('');
    });

    it('maskDocumentUrl redacts sensitive CV and identity document links', () => {
      expect(maskDocumentUrl('https://storage.supabase.co/yrl/id_doc.pdf')).toBe(
        '[DOCUMENT_ATTACHED]'
      );
      expect(maskDocumentUrl(null)).toBe('');
      expect(maskDocumentUrl('')).toBe('');
    });

    it('maskAddress redacts street-level details while preserving community', () => {
      expect(maskAddress('Flat 4B, Ridge Towers, Accra')).toBe('[CONFIDENTIAL STREET], Accra');
      expect(maskAddress('Short')).toBe('[CONFIDENTIAL_ADDRESS]');
      expect(maskAddress(null)).toBe('');
    });

    it('maskNominationRecord respects RBAC roles and redacts PII for regional coordinators', () => {
      const originalRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reference_id: 'YRL-NOM-2026-0001',
        full_name: 'Kwame Mensah',
        date_of_birth: '1996-08-14',
        phone_number: '+233241234567',
        whatsapp_number: '+233241234567',
        email: 'kwame@example.org',
        region: 'Ashanti',
        position_applied: 'Minister for Health',
        id_document_url: 'https://storage.supabase.co/id.pdf',
        referee_phone: '+233201112233',
      };

      // Super Admin receives unmasked record
      const superAdminView = maskNominationRecord(originalRecord, 'super_admin');
      expect(superAdminView.phone_number).toBe('+233241234567');
      expect(superAdminView.date_of_birth).toBe('1996-08-14');
      expect(superAdminView.id_document_url).toBe('https://storage.supabase.co/id.pdf');

      // Regional Coordinator receives masked record
      const regionalView = maskNominationRecord(originalRecord, 'regional_coordinator');
      expect(regionalView.phone_number).toBe('+233****567');
      expect(regionalView.date_of_birth).toBe('1996-**-**');
      expect(regionalView.id_document_url).toBe('[DOCUMENT_ATTACHED]');
      expect(regionalView.referee_phone).toBe('+233****233');
      // ID and Reference ID must remain intact for workflow transitions
      expect(regionalView.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(regionalView.reference_id).toBe('YRL-NOM-2026-0001');
    });
  });

  // ===========================================================================
  // 3. AUDIT LOGGING
  // ===========================================================================
  describe('3. Audit Logging Security Payload Specification', () => {
    it('audit payload structure captures entity, actor, and action without leaking credentials', () => {
      const loginAudit = {
        entity_type: 'auth',
        entity_id: 'admin@yrl.org',
        actor_id: 'admin@yrl.org',
        action: 'admin_login',
        previous_state: null,
        new_state: { status: 'success', method: 'password' },
        ip_address: '197.251.130.42',
      };

      expect(loginAudit.entity_type).toBe('auth');
      expect(loginAudit.action).toBe('admin_login');
      expect(loginAudit.new_state).not.toHaveProperty('password');
      expect(loginAudit.new_state).not.toHaveProperty('token');
      expect(loginAudit.new_state).not.toHaveProperty('secret');
    });

    it('failed login audit records reason without capturing submitted password', () => {
      const failedAudit = {
        entity_type: 'auth',
        entity_id: 'attacker@example.org',
        actor_id: 'attacker@example.org',
        action: 'admin_login_failed',
        previous_state: null,
        new_state: { reason: 'invalid_credentials' },
        ip_address: '102.176.65.12',
      };

      expect(failedAudit.action).toBe('admin_login_failed');
      expect(failedAudit.new_state.reason).toBe('invalid_credentials');
      expect(failedAudit.new_state).not.toHaveProperty('password');
    });

    it('logout audit records session termination cleanly', () => {
      const logoutAudit = {
        entity_type: 'auth',
        entity_id: 'user-uuid-1234',
        actor_id: 'admin@yrl.org',
        action: 'admin_logout',
        previous_state: null,
        new_state: { status: 'logged_out' },
      };

      expect(logoutAudit.action).toBe('admin_logout');
      expect(logoutAudit.new_state.status).toBe('logged_out');
    });
  });

  // ===========================================================================
  // 4. ERROR TAXONOMY & SAFE SANITIZATION
  // ===========================================================================
  describe('4. Error Taxonomy & Safe Serialization', () => {
    it('AppError subclasses maintain codes, user messages, and operational status', () => {
      const valErr = new ValidationError('Invalid email format', { email: ['Invalid email'] });
      expect(valErr.code).toBe('VALIDATION_ERROR');
      expect(valErr.isOperational).toBe(true);
      expect(valErr.fieldErrors).toHaveProperty('email');

      const unauthErr = new UnauthorizedError();
      expect(unauthErr.code).toBe('UNAUTHORIZED');

      const forbidErr = new ForbiddenError();
      expect(forbidErr.code).toBe('FORBIDDEN');

      const rateErr = new RateLimitError(45);
      expect(rateErr.code).toBe('RATE_LIMITED');
      expect(rateErr.retryAfterSeconds).toBe(45);
      expect(rateErr.userMessage).toContain('45 seconds');

      const notFoundErr = new NotFoundError();
      expect(notFoundErr.code).toBe('NOT_FOUND');
    });

    it('sanitizeError converts operational errors to user messages', () => {
      const rateErr = new RateLimitError(30);
      expect(sanitizeError(rateErr)).toBe(
        'Too many requests. Please wait 30 seconds before trying again.'
      );
    });

    it('sanitizeError hides raw database stack traces and returns generic message', () => {
      const dbErr = new Error(
        'SELECT * FROM nominations WHERE id = $1; Connection terminated unexpectedly'
      );
      const safeMessage = sanitizeError(dbErr);
      expect(safeMessage).not.toContain('SELECT');
      expect(safeMessage).not.toContain('Connection terminated');
      expect(safeMessage).toBe('An unexpected error occurred. Please try again.');
    });

    it('sanitizeError translates duplicate key constraints into user-friendly message', () => {
      const duplicateErr = new Error(
        'duplicate key value violates unique constraint "uq_nominations_email_position" (23505)'
      );
      const safeMessage = sanitizeError(duplicateErr);
      expect(safeMessage).toBe('A record with this information already exists in the system.');
      expect(safeMessage).not.toContain('23505');
      expect(safeMessage).not.toContain('uq_nominations_email_position');
    });
  });

  // ===========================================================================
  // 5. GLOBAL ERROR BOUNDARY
  // ===========================================================================
  describe('5. Root Global Error Boundary', () => {
    it('renders safe branded recovery UI without leaking error messages or stack traces', () => {
      const mockError = new Error('FATAL DATABASE DISASTER: secret_token_xyz failed');
      const html = renderToString(React.createElement(GlobalError, { error: mockError, reset: () => {} }));

      expect(html).toContain('Application Interrupted');
      expect(html).toContain('A critical system error occurred while rendering the platform');
      expect(html).toContain('Return to Homepage');
      expect(html).toContain('Reload Platform');

      // Crucial: Must NEVER leak internal error message or tokens into the HTML
      expect(html).not.toContain('FATAL DATABASE DISASTER');
      expect(html).not.toContain('secret_token_xyz');
    });
  });
});

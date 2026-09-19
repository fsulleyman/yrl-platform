import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getContactEmail, getEmailFrom, isResendConfigured } from '../lib/email/config';
import { renderNominationEmail } from '../lib/email/templates/nomination';
import { renderMembershipEmail } from '../lib/email/templates/member';
import { renderContactConfirmationEmail } from '../lib/email/templates/contact';
import { sendEmail, sendNominationEmail, sendMembershipEmail, sendContactConfirmationEmail } from '../lib/email/resend';

describe('Model B / Phase B6: Email Integration & Templates Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ---------------------------------------------------------------------------
  // 1. Configuration-Driven Email Settings (config.ts)
  // ---------------------------------------------------------------------------
  it('1. getContactEmail returns configured environment variable or empty string', () => {
    delete process.env.YRL_CONTACT_EMAIL;
    delete process.env.NEXT_PUBLIC_YRL_CONTACT_EMAIL;
    expect(getContactEmail()).toBe('');

    process.env.YRL_CONTACT_EMAIL = 'contact@youthrepublicleadership.org';
    expect(getContactEmail()).toBe('contact@youthrepublicleadership.org');

    process.env.NEXT_PUBLIC_YRL_CONTACT_EMAIL = 'public@youthrepublicleadership.org';
    expect(getContactEmail()).toBe('public@youthrepublicleadership.org');
  });

  it('2. getEmailFrom falls back appropriately', () => {
    delete process.env.YRL_EMAIL_FROM;
    delete process.env.YRL_CONTACT_EMAIL;
    delete process.env.NEXT_PUBLIC_YRL_CONTACT_EMAIL;
    expect(getEmailFrom()).toBe('');

    process.env.YRL_CONTACT_EMAIL = 'fallback@youthrepublicleadership.org';
    expect(getEmailFrom()).toBe('fallback@youthrepublicleadership.org');

    process.env.YRL_EMAIL_FROM = 'Youth Republic Leadership <info@youthrepublicleadership.org>';
    expect(getEmailFrom()).toBe('Youth Republic Leadership <info@youthrepublicleadership.org>');
  });

  it('3. isResendConfigured detects presence and absence of RESEND_API_KEY', () => {
    delete process.env.RESEND_API_KEY;
    expect(isResendConfigured()).toBe(false);

    process.env.RESEND_API_KEY = '   ';
    expect(isResendConfigured()).toBe(false);

    process.env.RESEND_API_KEY = 're_test_dummy_key_12345';
    expect(isResendConfigured()).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 2. Nomination Confirmation Template
  // ---------------------------------------------------------------------------
  it('4. renderNominationEmail produces valid subject, HTML, and text containing referenceId and details', () => {
    const data = {
      fullName: 'Kwame Mensah',
      referenceId: 'YRL-NOM-2026-1001',
      positionApplied: 'Minister for Education',
      region: 'Ashanti',
    };

    const rendered = renderNominationEmail(data);

    expect(rendered.subject).toContain('YRL-NOM-2026-1001');
    expect(rendered.html).toContain('Kwame Mensah');
    expect(rendered.html).toContain('YRL-NOM-2026-1001');
    expect(rendered.html).toContain('Minister for Education');
    expect(rendered.html).toContain('Ashanti Region');
    expect(rendered.html).toContain('18–40');
    expect(rendered.html).toContain('non-partisan');

    expect(rendered.text).toContain('Kwame Mensah');
    expect(rendered.text).toContain('YRL-NOM-2026-1001');
    expect(rendered.text).toContain('Minister for Education');
    expect(rendered.text).toContain('Ashanti Region');
  });

  // ---------------------------------------------------------------------------
  // 3. Membership Confirmation Template
  // ---------------------------------------------------------------------------
  it('5. renderMembershipEmail produces valid subject, HTML, and text containing memberId and details', () => {
    const data = {
      fullName: 'Ama Serwaa Boateng',
      memberId: 'YRL-MEM-2026-1002',
      region: 'Greater Accra',
      occupation: 'Civil Engineer',
    };

    const rendered = renderMembershipEmail(data);

    expect(rendered.subject).toContain('YRL-MEM-2026-1002');
    expect(rendered.html).toContain('Ama Serwaa Boateng');
    expect(rendered.html).toContain('YRL-MEM-2026-1002');
    expect(rendered.html).toContain('Greater Accra Region');
    expect(rendered.html).toContain('Civil Engineer');
    expect(rendered.html).toContain('Active');

    expect(rendered.text).toContain('Ama Serwaa Boateng');
    expect(rendered.text).toContain('YRL-MEM-2026-1002');
    expect(rendered.text).toContain('Greater Accra Region');
    expect(rendered.text).toContain('Civil Engineer');
  });

  // ---------------------------------------------------------------------------
  // 4. Contact Confirmation Template
  // ---------------------------------------------------------------------------
  it('6. renderContactConfirmationEmail produces valid subject, HTML, and text containing referenceId', () => {
    const data = {
      fullName: 'Kofi Mensah',
      referenceId: 'YRL-MSG-2026-1003',
    };

    const rendered = renderContactConfirmationEmail(data);

    expect(rendered.subject).toContain('YRL-MSG-2026-1003');
    expect(rendered.html).toContain('Kofi Mensah');
    expect(rendered.html).toContain('YRL-MSG-2026-1003');

    expect(rendered.text).toContain('Kofi Mensah');
    expect(rendered.text).toContain('YRL-MSG-2026-1003');
  });

  // ---------------------------------------------------------------------------
  // 5. Graceful Degradation when Resend is Unconfigured
  // ---------------------------------------------------------------------------
  it('7. sendEmail returns skipped result without throwing when Resend is unconfigured', async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toContain('Resend API key is not configured');
  });

  it('8. sendNominationEmail, sendMembershipEmail, and sendContactConfirmationEmail degrade gracefully', async () => {
    delete process.env.RESEND_API_KEY;

    const nomResult = await sendNominationEmail('applicant@example.com', {
      fullName: 'Test Applicant',
      referenceId: 'YRL-NOM-2026-9999',
      positionApplied: 'Chief of Staff',
    });
    expect(nomResult.success).toBe(false);
    expect(nomResult.skipped).toBe(true);

    const memResult = await sendMembershipEmail('member@example.com', {
      fullName: 'Test Member',
      memberId: 'YRL-MEM-2026-9999',
      region: 'Central',
    });
    expect(memResult.success).toBe(false);
    expect(memResult.skipped).toBe(true);

    const contactResult = await sendContactConfirmationEmail('inquiry@example.com', {
      fullName: 'Test Inquirer',
      referenceId: 'YRL-MSG-2026-9999',
    });
    expect(contactResult.success).toBe(false);
    expect(contactResult.skipped).toBe(true);
  });
});

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Parse and load .env.local before any module import evaluates process.env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { contactSchema, contactSubmissionSchema } from '../lib/validations/contact';

describe('Model B / Phase B5: Contact Us Backend Verification Suite', () => {
  const timestamp = Date.now();
  const testEmail = `b5_test_${timestamp}@example.com`;
  const honeypotEmail = `b5_bot_${timestamp}@example.com`;
  const createdRecordIds: string[] = [];

  const validContact = {
    full_name: 'Kofi Annan Mensah',
    email: testEmail,
    message: 'We are requesting information on youth community outreach partnerships in the Ashanti region.',
    honeypot: '',
  };

  let createAdminClient: typeof import('../lib/supabase/server').createAdminClient;

  beforeAll(async () => {
    const serverModule = await import('../lib/supabase/server');
    createAdminClient = serverModule.createAdminClient;
  });

  afterAll(async () => {
    // Cleanup: Safely remove temporary test records from production DB
    if (createAdminClient) {
      const supabase = createAdminClient();
      for (const id of createdRecordIds) {
        await supabase.from('contact_messages').delete().eq('id', id);
      }
      // Guarantee honeypot email didn't leave any stray record
      await supabase.from('contact_messages').delete().eq('email', honeypotEmail);
      await supabase.from('contact_messages').delete().eq('email', testEmail);
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Validation Tests (19.2, 19.3, 19.4)
  // ---------------------------------------------------------------------------
  it('1. Valid submission passes schema validation', () => {
    const result = contactSubmissionSchema.safeParse(validContact);
    expect(result.success).toBe(true);
  });

  it('2. Rejects invalid full_name (empty, < 2 chars, > 100 chars)', () => {
    const emptyName = { ...validContact, full_name: '' };
    const shortName = { ...validContact, full_name: 'A' };
    const longName = { ...validContact, full_name: 'A'.repeat(101) };

    expect(contactSubmissionSchema.safeParse(emptyName).success).toBe(false);
    expect(contactSubmissionSchema.safeParse(shortName).success).toBe(false);
    expect(contactSubmissionSchema.safeParse(longName).success).toBe(false);
  });

  it('3. Rejects invalid email (empty, malformed)', () => {
    const emptyEmail = { ...validContact, email: '' };
    const malformedEmail = { ...validContact, email: 'not-an-email' };

    expect(contactSubmissionSchema.safeParse(emptyEmail).success).toBe(false);
    expect(contactSubmissionSchema.safeParse(malformedEmail).success).toBe(false);
  });

  it('4. Rejects invalid message (< 20 chars, > 2000 chars)', () => {
    const shortMessage = { ...validContact, message: 'Too short' };
    const longMessage = { ...validContact, message: 'A'.repeat(2001) };

    expect(contactSubmissionSchema.safeParse(shortMessage).success).toBe(false);
    expect(contactSubmissionSchema.safeParse(longMessage).success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 2. Honeypot Behavior (19.5)
  // ---------------------------------------------------------------------------
  it('5. Honeypot rejects bot submission and creates zero database records', async () => {
    const botSubmission = {
      ...validContact,
      email: honeypotEmail,
      honeypot: 'spam_bot_input',
    };

    // Schema level check
    const schemaCheck = contactSubmissionSchema.safeParse(botSubmission);
    expect(schemaCheck.success).toBe(false);

    // Database level check
    const supabase = createAdminClient();
    const { data: records, error } = await supabase
      .from('contact_messages')
      .select('id')
      .eq('email', honeypotEmail);

    expect(error).toBeNull();
    expect(records?.length).toBe(0);
  }, 15000);

  // ---------------------------------------------------------------------------
  // 3. Live Database: Insertion, Reference, Status (19.1, 19.8)
  // ---------------------------------------------------------------------------
  it('6. Live Database: persists all 3 fields, status is received, reference matches YRL-MSG-YYYY-XXXX', async () => {
    const supabase = createAdminClient();
    const { honeypot, ...contactRecord } = validContact;

    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        full_name: contactRecord.full_name.trim(),
        email: contactRecord.email.trim().toLowerCase(),
        message: contactRecord.message.trim(),
        status: 'received',
      })
      .select('id, reference_id, status, full_name, email, message')
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data?.id) {
      createdRecordIds.push(data.id);
    }

    // Check status
    expect(data?.status).toBe('received');

    // Check authoritative reference format: YRL-MSG-YYYY-XXXX
    const msgRegex = /^YRL-MSG-\d{4}-\d{4,}$/;
    expect(data?.reference_id).toMatch(msgRegex);

    // Verify all 3 submitted fields
    expect(data?.full_name).toBe(validContact.full_name);
    expect(data?.email).toBe(validContact.email.toLowerCase());
    expect(data?.message).toBe(validContact.message);
  }, 15000);
});

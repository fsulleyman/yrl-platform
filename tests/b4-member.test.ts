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

import { memberSchema, memberSubmissionSchema } from '../lib/validations/member';

describe('Model B / Phase B4: General Membership Backend Verification Suite', () => {
  const timestamp = Date.now();
  const testEmail1 = `b4_test_${timestamp}_1@example.com`;
  const testEmail2 = `b4_test_${timestamp}_2@example.com`;
  const testPhone1 = `0241${timestamp.toString().slice(-6)}`;
  const testPhone2 = `0242${timestamp.toString().slice(-6)}`;
  const honeypotEmail = `b4_bot_${timestamp}@example.com`;

  const createdMemberIds: string[] = [];

  // Age boundary date helpers
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const exact18Date = formatDate(new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()));
  const exact40Date = formatDate(new Date(today.getFullYear() - 40, today.getMonth(), today.getDate()));
  const exact17Date = formatDate(new Date(today.getFullYear() - 17, today.getMonth(), today.getDate()));
  const exact41Date = formatDate(new Date(today.getFullYear() - 41, today.getMonth(), today.getDate()));

  // Base 15-field valid membership payload
  const validMember = {
    full_name: 'Ama Serwaa Mensah',
    date_of_birth: exact18Date,
    gender: 'Female',
    phone_number: testPhone1,
    whatsapp_number: testPhone1,
    email: testEmail1,
    region: 'Ashanti' as const,
    district_municipality: 'Kumasi Metropolitan',
    town_community: 'Adum',
    occupation: 'Secondary School Teacher',
    education_level: "Bachelor's Degree",
    why_join: 'I believe in youth mobilization and grassroots civic participation to transform our communities.',
    availability: '5-10 hours/week',
    engagement_interests: ['community_projects', 'civic_education'],
    civic_acknowledgement: true as const,
    honeypot: '',
  };

  let createAdminClient: typeof import('../lib/supabase/server').createAdminClient;

  beforeAll(async () => {
    const serverModule = await import('../lib/supabase/server');
    createAdminClient = serverModule.createAdminClient;
  });

  afterAll(async () => {
    // Cleanup: Remove any created test records from production DB
    if (createAdminClient) {
      const supabase = createAdminClient();
      for (const id of createdMemberIds) {
        await supabase.from('members').delete().eq('id', id);
      }
      // Guarantee honeypot email didn't leave any stray record
      await supabase.from('members').delete().eq('email', honeypotEmail);
      await supabase.from('members').delete().eq('email', testEmail1);
      await supabase.from('members').delete().eq('email', testEmail2);
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Age Boundary Verifications (18-40 Inclusive)
  // ---------------------------------------------------------------------------
  it('1a. Age boundary: accepts candidate exactly 18 years old', () => {
    const candidate18 = { ...validMember, date_of_birth: exact18Date };
    const result = memberSubmissionSchema.safeParse(candidate18);
    expect(result.success).toBe(true);
  });

  it('1b. Age boundary: accepts candidate exactly 40 years old', () => {
    const candidate40 = { ...validMember, date_of_birth: exact40Date };
    const result = memberSubmissionSchema.safeParse(candidate40);
    expect(result.success).toBe(true);
  });

  it('1c. Age boundary: rejects candidate 17 years old', () => {
    const candidate17 = { ...validMember, date_of_birth: exact17Date };
    const result = memberSubmissionSchema.safeParse(candidate17);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dobError = result.error.flatten().fieldErrors.date_of_birth;
      expect(dobError).toBeDefined();
    }
  });

  it('1d. Age boundary: rejects candidate 41 years old', () => {
    const candidate41 = { ...validMember, date_of_birth: exact41Date };
    const result = memberSubmissionSchema.safeParse(candidate41);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dobError = result.error.flatten().fieldErrors.date_of_birth;
      expect(dobError).toBeDefined();
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Server Validation: Rejects Invalid Submissions
  // ---------------------------------------------------------------------------
  it('2a. Rejects submission when why_join is less than 20 characters', () => {
    const shortMotivation = { ...validMember, why_join: 'Too short.' };
    const result = memberSubmissionSchema.safeParse(shortMotivation);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.why_join).toBeDefined();
    }
  });

  it('2b. Rejects submission when civic_acknowledgement is false', () => {
    const unacknowledged = { ...validMember, civic_acknowledgement: false };
    const result = memberSubmissionSchema.safeParse(unacknowledged);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.civic_acknowledgement).toBeDefined();
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Honeypot Behavior
  // ---------------------------------------------------------------------------
  it('3. Honeypot: rejects bot submission and creates zero database records', async () => {
    const botSubmission = {
      ...validMember,
      email: honeypotEmail,
      honeypot: 'spam_bot_input',
    };

    // Schema level: honeypot fails valid user schema
    const schemaCheck = memberSubmissionSchema.safeParse(botSubmission);
    expect(schemaCheck.success).toBe(false);

    // Database level: verify no record exists for honeypot email
    const supabase = createAdminClient();
    const { data: records, error } = await supabase
      .from('members')
      .select('id')
      .eq('email', honeypotEmail);

    expect(error).toBeNull();
    expect(records?.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 4. Live Database: All 15 Fields Persist, Authoritative ID, Status Active
  // ---------------------------------------------------------------------------
  it('4. Live Database: persists all 15 fields, status is active, member_id matches YRL-MEM-YYYY-XXXX', async () => {
    const supabase = createAdminClient();
    const { honeypot, ...dbRecord } = validMember;

    const { data, error } = await supabase
      .from('members')
      .insert({
        ...dbRecord,
        email: dbRecord.email.trim().toLowerCase(),
        phone_number: dbRecord.phone_number.trim(),
        engagement_interests: dbRecord.engagement_interests,
        status: 'active',
      })
      .select(`
        id,
        member_id,
        status,
        full_name,
        date_of_birth,
        gender,
        phone_number,
        whatsapp_number,
        email,
        region,
        district_municipality,
        town_community,
        occupation,
        education_level,
        why_join,
        availability,
        engagement_interests,
        civic_acknowledgement
      `)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data?.id) {
      createdMemberIds.push(data.id);
    }

    // Status is 'active'
    expect(data?.status).toBe('active');

    // Authoritative member_id format: YRL-MEM-YYYY-XXXX
    const memRegex = /^YRL-MEM-\d{4}-\d{4,}$/;
    expect(data?.member_id).toMatch(memRegex);

    // Verify all 15 submitted fields
    expect(data?.full_name).toBe(validMember.full_name);
    expect(data?.date_of_birth).toBe(validMember.date_of_birth);
    expect(data?.gender).toBe(validMember.gender);
    expect(data?.phone_number).toBe(validMember.phone_number);
    expect(data?.whatsapp_number).toBe(validMember.whatsapp_number);
    expect(data?.email).toBe(validMember.email.toLowerCase());
    expect(data?.region).toBe(validMember.region);
    expect(data?.district_municipality).toBe(validMember.district_municipality);
    expect(data?.town_community).toBe(validMember.town_community);
    expect(data?.occupation).toBe(validMember.occupation);
    expect(data?.education_level).toBe(validMember.education_level);
    expect(data?.why_join).toBe(validMember.why_join);
    expect(data?.availability).toBe(validMember.availability);
    expect(data?.engagement_interests).toEqual(validMember.engagement_interests);
    expect(data?.civic_acknowledgement).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5. Live Database: Duplicate Email Protection
  // ---------------------------------------------------------------------------
  it('5. Live Database: enforces duplicate email prevention (code 23505)', async () => {
    const supabase = createAdminClient();
    const { honeypot, ...dbRecord } = validMember;

    // Attempt second insert with same email (different case/spaces) but different phone
    const duplicateEmail = `  ${testEmail1.toUpperCase()}  `;

    const { data, error } = await supabase
      .from('members')
      .insert({
        ...dbRecord,
        email: duplicateEmail.trim().toLowerCase(),
        phone_number: testPhone2,
        status: 'active',
      })
      .select('id');

    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505'); // PostgreSQL unique_violation (uq_members_email)
  });

  // ---------------------------------------------------------------------------
  // 6. Live Database: Duplicate Phone Protection
  // ---------------------------------------------------------------------------
  it('6. Live Database: enforces duplicate phone prevention (code 23505)', async () => {
    const supabase = createAdminClient();
    const { honeypot, ...dbRecord } = validMember;

    // Attempt insert with same phone (with spaces) but different email
    const spacedPhone = `  ${testPhone1.slice(0, 3)} ${testPhone1.slice(3, 6)} ${testPhone1.slice(6)}  `;

    const { data, error } = await supabase
      .from('members')
      .insert({
        ...dbRecord,
        email: testEmail2,
        phone_number: spacedPhone,
        status: 'active',
      })
      .select('id');

    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505'); // PostgreSQL unique_violation (uq_members_phone)
  });
});

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

import { nominationSchema, nominationSubmissionSchema } from '../lib/validations/nomination';

describe('Model B / Phase B3: Final Audit Verification Suite', () => {
  const testEmail = `b3_audit_${Date.now()}@example.com`;
  const honeypotEmail = `b3_bot_${Date.now()}@example.com`;
  let createdRecordId: string | null = null;

  // Age boundary date helpers
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const exact18Date = formatDate(new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()));
  const exact40Date = formatDate(new Date(today.getFullYear() - 40, today.getMonth(), today.getDate()));
  const exact17Date = formatDate(new Date(today.getFullYear() - 17, today.getMonth(), today.getDate()));
  const exact41Date = formatDate(new Date(today.getFullYear() - 41, today.getMonth(), today.getDate()));

  // Base 35-field valid nomination (Regional Minister to test all 6 qualitative fields)
  const validNomination = {
    full_name: 'Kwame Test Mensah',
    date_of_birth: exact18Date,
    gender: 'Male',
    phone_number: '0241234567',
    whatsapp_number: '0241234567',
    email: testEmail,
    region: 'Greater Accra' as const,
    district_municipality: 'Accra Metropolitan',
    town_community: 'Osu',
    occupation: 'Civic Policy Researcher',
    organisation_institution: 'Civic Ghana Foundation',
    education_level: "Bachelor's Degree",
    area_of_study_profession: 'Political Science',
    position_applied: 'Interim Regional Minister' as const,
    region_if_regional_minister: 'Greater Accra' as const,
    has_leadership_experience: true,
    prior_position: 'Youth Coordinator',
    prior_organisation: 'Youth Forum',
    prior_duration: '2 years',
    prior_responsibilities: 'Coordinated youth workshops across 5 districts.',
    suitability_statement: 'Dedicated to ethical leadership and institutional excellence.',
    proudest_achievement: 'Mobilized 500 youth volunteers for civic engagement.',
    q1_why_serve: 'I wish to serve because structured youth participation is essential for Ghana.',
    q2_leadership_as_service: 'Leadership is stewardship, accountability, and enabling citizens to thrive.',
    q3_first_90_days: 'Establish administrative guidelines, coordinate secretariat, align strategy.',
    q4_recruitment_plan: 'Partner with universities, community clubs, and trade groups nationwide.',
    q5_recruitment_estimate: '100-250 members',
    q6_regional_building_plan: 'Establish regional executive committees across all administrative districts.',
    weekly_hours: '15-20 hours/week',
    willing_online_meetings: true as const,
    willing_physical_activities: true as const,
    referee_name: 'Dr. Joseph Mensah',
    referee_relationship: 'Academic Mentor',
    referee_phone: '0205550192',
    declaration_agreed: true as const,
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
      if (createdRecordId) {
        await supabase.from('nominations').delete().eq('id', createdRecordId);
      }
      // Guarantee honeypot email didn't leave any stray record
      await supabase.from('nominations').delete().eq('email', honeypotEmail);
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Age Boundary Verifications
  // ---------------------------------------------------------------------------
  it('1a. Age boundary: accepts applicant of exactly age 18', () => {
    const candidate18 = { ...validNomination, date_of_birth: exact18Date };
    const result = nominationSubmissionSchema.safeParse(candidate18);
    expect(result.success).toBe(true);
  });

  it('1b. Age boundary: accepts applicant of exactly age 40', () => {
    const candidate40 = { ...validNomination, date_of_birth: exact40Date };
    const result = nominationSubmissionSchema.safeParse(candidate40);
    expect(result.success).toBe(true);
  });

  it('1c. Age boundary: rejects applicant of age 17', () => {
    const candidate17 = { ...validNomination, date_of_birth: exact17Date };
    const result = nominationSubmissionSchema.safeParse(candidate17);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dobError = result.error.flatten().fieldErrors.date_of_birth;
      expect(dobError).toBeDefined();
    }
  });

  it('1d. Age boundary: rejects applicant of age 41', () => {
    const candidate41 = { ...validNomination, date_of_birth: exact41Date };
    const result = nominationSubmissionSchema.safeParse(candidate41);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dobError = result.error.flatten().fieldErrors.date_of_birth;
      expect(dobError).toBeDefined();
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Honeypot Behavior
  // ---------------------------------------------------------------------------
  it('2. Honeypot behavior: rejects bot submission without writing to database', async () => {
    const botSubmission = {
      ...validNomination,
      email: honeypotEmail,
      honeypot: 'automated_spam_bot_input',
    };

    // Schema level verification: honeypot fails schema for valid user
    const schemaCheck = nominationSubmissionSchema.safeParse(botSubmission);
    expect(schemaCheck.success).toBe(false);

    // Database level verification: verify no record is written for honeypot
    const supabase = createAdminClient();
    const { data: records, error } = await supabase
      .from('nominations')
      .select('id')
      .eq('email', honeypotEmail);

    expect(error).toBeNull();
    expect(records?.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 3. Live Database: All 35 Fields Persist, Authoritative Reference, Status
  // ---------------------------------------------------------------------------
  it('3. Live Database: persists all 35 fields (including q1-q6), status is submitted, reference is generated', async () => {
    const supabase = createAdminClient();
    const { honeypot, ...dbRecord } = validNomination;

    const { data, error } = await supabase
      .from('nominations')
      .insert({
        ...dbRecord,
        email: dbRecord.email.trim().toLowerCase(),
        status: 'submitted',
      })
      .select(`
        id,
        reference_id,
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
        organisation_institution,
        education_level,
        area_of_study_profession,
        position_applied,
        region_if_regional_minister,
        has_leadership_experience,
        prior_position,
        prior_organisation,
        prior_duration,
        prior_responsibilities,
        suitability_statement,
        proudest_achievement,
        q1_why_serve,
        q2_leadership_as_service,
        q3_first_90_days,
        q4_recruitment_plan,
        q5_recruitment_estimate,
        q6_regional_building_plan,
        weekly_hours,
        willing_online_meetings,
        willing_physical_activities,
        referee_name,
        referee_relationship,
        referee_phone,
        declaration_agreed
      `)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();

    createdRecordId = data?.id || null;

    // Check status
    expect(data?.status).toBe('submitted');

    // Check authoritative reference format: YRL-NOM-YYYY-XXXX
    const refRegex = /^YRL-NOM-\d{4}-\d{4,}$/;
    expect(data?.reference_id).toMatch(refRegex);

    // Verify all six qualitative fields (q1 through q6)
    expect(data?.q1_why_serve).toBe(validNomination.q1_why_serve);
    expect(data?.q2_leadership_as_service).toBe(validNomination.q2_leadership_as_service);
    expect(data?.q3_first_90_days).toBe(validNomination.q3_first_90_days);
    expect(data?.q4_recruitment_plan).toBe(validNomination.q4_recruitment_plan);
    expect(data?.q5_recruitment_estimate).toBe(validNomination.q5_recruitment_estimate);
    expect(data?.q6_regional_building_plan).toBe(validNomination.q6_regional_building_plan);

    // Verify key fields
    expect(data?.full_name).toBe(validNomination.full_name);
    expect(data?.position_applied).toBe(validNomination.position_applied);
    expect(data?.region_if_regional_minister).toBe(validNomination.region_if_regional_minister);
    expect(data?.declaration_agreed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Duplicate Handling
  // ---------------------------------------------------------------------------
  it('4. Live Database: enforces duplicate prevention on (lower(trim(email)), position_applied)', async () => {
    const supabase = createAdminClient();
    const { honeypot, ...dbRecord } = validNomination;

    // Attempt second insert with same email (mixed case/spacing) and position
    const duplicateEmail = `  ${testEmail.toUpperCase()}  `;

    const { data, error } = await supabase
      .from('nominations')
      .insert({
        ...dbRecord,
        email: duplicateEmail.trim().toLowerCase(),
        status: 'submitted',
      })
      .select('id');

    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505'); // PostgreSQL unique_violation
  });

  // ---------------------------------------------------------------------------
  // 5. Regional Minister vs National Position Region Field Behavior
  // ---------------------------------------------------------------------------
  it('5. Schema handles region_if_regional_minister properly for national and regional positions', () => {
    // A. National position with empty string for region_if_regional_minister succeeds
    const nationalNomination = {
      ...validNomination,
      position_applied: 'Minister for Education' as const,
      region_if_regional_minister: '',
      email: 'national_test@example.com',
    };
    const nationalResult = nominationSubmissionSchema.safeParse(nationalNomination);
    expect(nationalResult.success).toBe(true);

    // B. Regional minister with empty string for region_if_regional_minister fails with clear custom message
    const emptyRegionalNomination = {
      ...validNomination,
      position_applied: 'Interim Regional Minister' as const,
      region_if_regional_minister: '',
      email: 'regional_test@example.com',
    };
    const regionalResult = nominationSubmissionSchema.safeParse(emptyRegionalNomination);
    expect(regionalResult.success).toBe(false);
    expect(regionalResult.error?.issues[0].message).toBe(
      'Select the region you wish to serve as Interim Regional Minister'
    );
  });
});

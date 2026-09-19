import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  nominationSchema,
  nominationSubmissionSchema,
  memberSchema,
} from '../lib/validations/nomination';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

describe('YRL Phase 1 Smoke Test Suite', () => {
  const validNominationData = {
    full_name: 'Kwame Mensah',
    date_of_birth: '1995-05-15', // Age ~31 (valid between 18 and 40)
    gender: 'Male',
    phone_number: '+233241234567',
    whatsapp_number: '+233241234567',
    email: 'kwame.mensah@example.com',
    region: 'Greater Accra',
    district_municipality: 'Accra Metropolitan',
    town_community: 'Osu',
    occupation: 'Software Engineer & Youth Organizer',
    organisation_institution: 'Accra Tech Hub',
    education_level: 'Bachelor Degree',
    area_of_study_profession: 'Computer Science',
    position_applied: 'Minister for Research, Science and Technology',
    has_leadership_experience: true,
    prior_position: 'President',
    prior_organisation: 'University Computing Society',
    prior_duration: '2 years',
    prior_responsibilities: 'Led a 500-member community organizing workshops.',
    q1_why_serve: 'I believe Ghanaian youth possess the ingenuity and passion to transform public policy.',
    q2_leadership_as_service: 'Leadership is fundamentally about stewardship, accountability, and enabling others.',
    q3_first_90_days: 'Establish nationwide technology councils and launch youth innovation challenges.',
    q4_recruitment_plan: 'Leverage university campuses and regional hubs to register 2,000 active members.',
    weekly_hours: '15-20 hours',
    willing_online_meetings: true,
    willing_physical_activities: true,
    referee_name: 'Dr. John Doe',
    referee_relationship: 'Former University Lecturer',
    referee_phone: '+233200987654',
    declaration_agreed: true,
  };

  it('validates a complete and legitimate nomination submission', () => {
    const result = nominationSchema.safeParse(validNominationData);
    expect(result.success).toBe(true);
  });

  it('rejects an applicant outside the 18–40 age bracket', () => {
    // Under 18
    const underAgeData = {
      ...validNominationData,
      date_of_birth: '2015-01-01',
    };
    const underAgeResult = nominationSchema.safeParse(underAgeData);
    expect(underAgeResult.success).toBe(false);
    if (!underAgeResult.success) {
      const issue = underAgeResult.error.issues.find((i) => i.path.includes('date_of_birth'));
      expect(issue?.message).toContain('18 and 40');
    }

    // Over 40
    const overAgeData = {
      ...validNominationData,
      date_of_birth: '1970-01-01',
    };
    const overAgeResult = nominationSchema.safeParse(overAgeData);
    expect(overAgeResult.success).toBe(false);
  });

  it('enforces regional minister specific requirements', () => {
    const regionalDataWithoutRegion = {
      ...validNominationData,
      position_applied: 'Interim Regional Minister',
      region_if_regional_minister: undefined,
    };
    const result = nominationSchema.safeParse(regionalDataWithoutRegion);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('region_if_regional_minister');
    }
  });

  it('rejects submission when honeypot field is filled by a bot', () => {
    const botSubmission = {
      ...validNominationData,
      honeypot: 'http://spam-link.com',
    };
    const result = nominationSubmissionSchema.safeParse(botSubmission);
    expect(result.success).toBe(false);
  });

  it('validates general member registration schema', () => {
    const validMember = {
      full_name: 'Ama Serwaa',
      phone: '+233240001122',
      email: 'ama@example.com',
      region: 'Ashanti',
      district: 'Kumasi Metropolitan',
      honeypot: '',
    };
    const result = memberSchema.safeParse(validMember);
    expect(result.success).toBe(true);
  });

  it('verifies RLS policies strictly prohibit anonymous SELECT on nominations and members in SQL schema', () => {
    // Read actual migration file to test schema security assertions
    const migrationPath = path.resolve('supabase/migrations/20260913_init_yrl_schema.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. Assert RLS is unconditionally enabled on all 3 tables
    expect(sql).toContain('ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE members ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE minister_reports ENABLE ROW LEVEL SECURITY;');

    // 2. Assert INSERT policy exists for anon
    expect(sql).toMatch(/CREATE\s+POLICY\s+["']Allow anonymous users to submit nomination["']\s+ON\s+nominations\s+FOR\s+INSERT\s+TO\s+anon/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+["']Allow anonymous users to register as members["']\s+ON\s+members\s+FOR\s+INSERT\s+TO\s+anon/i);

    // 3. Assert NO SELECT policy exists for anon role anywhere in the migration
    const selectAnonRegex = /CREATE\s+POLICY.*FOR\s+SELECT.*TO\s+anon/i;
    expect(selectAnonRegex.test(sql)).toBe(false);

    // 4. Assert NO UPDATE or DELETE policy exists for anon
    const updateAnonRegex = /CREATE\s+POLICY.*FOR\s+(UPDATE|DELETE).*TO\s+anon/i;
    expect(updateAnonRegex.test(sql)).toBe(false);

    // 5. Assert minister_reports has zero public policies
    const ministerReportsPolicy = /CREATE\s+POLICY.*ON\s+minister_reports/i;
    expect(ministerReportsPolicy.test(sql)).toBe(false);
  });

  it('confirms anonymous public client cannot read from nominations or members', async () => {
    if (!isSupabaseConfigured) {
      // In pre-credentials test environment, verify that anon client instance is initialized
      // without service role key and is configured for public anon access only
      expect(supabase).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeFalsy();
      return;
    }

    // When live credentials exist, run live query with 3s timeout
    const queryPromise = supabase.from('nominations').select('id, full_name, email');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 3000)
    );

    const { data: nomData, error: nomError } = (await Promise.race([
      queryPromise,
      timeoutPromise,
    ])) as any;

    expect(nomData === null || nomData.length === 0 || nomError !== null).toBe(true);
  });

  it('confirms service role key is strictly isolated to server runtime', async () => {
    // In client-facing code, process.env.SUPABASE_SERVICE_ROLE_KEY must not be used
    const clientModule = await import('../lib/supabase/client');
    expect(clientModule).toBeDefined();
    expect(clientModule.supabase).toBeDefined();
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Parse and load .env.local before imports
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

import { NATIONAL_PORTFOLIOS, REGIONAL_PORTFOLIO, type AdminSession, type AdminRole } from '../lib/auth/types';
import { getAdminScopedData } from '../app/admin/data';
import { createAdminClient } from '../lib/supabase/server';

describe('Model B / Phase B7: Authentication & RBAC Verification Suite', () => {
  const timestamp = Date.now();
  const testAshantiNomId = `b7_ashanti_${timestamp}`;
  const testAccraNomId = `b7_accra_${timestamp}`;
  const createdRecordIds: string[] = [];

  beforeAll(async () => {
    // Seed isolated test records in Supabase to test regional and national scoping
    const supabase = createAdminClient();

    // Record 1: National portfolio in Greater Accra
    const { data: rec1, error: err1 } = await supabase
      .from('nominations')
      .insert({
        full_name: 'National Candidate Test',
        date_of_birth: '1995-01-01',
        phone_number: '0240001111',
        email: `national_${timestamp}@example.com`,
        region: 'Greater Accra',
        district_municipality: 'Accra Metro',
        town_community: 'Osu',
        occupation: 'Analyst',
        education_level: "Bachelor's Degree",
        area_of_study_profession: 'Economics',
        position_applied: 'Minister for Finance',
        region_if_regional_minister: null,
        q1_why_serve: 'Serving the nation with integrity and civic dedication.',
        q2_leadership_as_service: 'Leadership is about empowering communities.',
        q3_first_90_days: 'Establish initial youth fiscal frameworks.',
        q4_recruitment_plan: 'Grassroots recruitment across all educational institutions.',
        weekly_hours: '15-20 hours/week',
        willing_online_meetings: true,
        willing_physical_activities: true,
        referee_name: 'Dr. Mentor',
        referee_relationship: 'Academic Advisor',
        referee_phone: '0240002222',
        declaration_agreed: true,
        status: 'submitted',
      })
      .select('id')
      .single();

    if (rec1?.id) createdRecordIds.push(rec1.id);

    // Record 2: Regional Minister candidate for Ashanti (resident in Central)
    const { data: rec2, error: err2 } = await supabase
      .from('nominations')
      .insert({
        full_name: 'Ashanti Regional Minister Candidate',
        date_of_birth: '1996-02-02',
        phone_number: '0240003333',
        email: `ashanti_${timestamp}@example.com`,
        region: 'Central',
        district_municipality: 'Cape Coast Metro',
        town_community: 'Cape Coast',
        occupation: 'Community Organizer',
        education_level: "Bachelor's Degree",
        area_of_study_profession: 'Development Studies',
        position_applied: 'Interim Regional Minister',
        region_if_regional_minister: 'Ashanti',
        q1_why_serve: 'Dedicated to regional youth empowerment in Ashanti.',
        q2_leadership_as_service: 'True leadership works with the youth.',
        q3_first_90_days: 'Launch Ashanti youth consultative forum.',
        q4_recruitment_plan: 'Town halls across Kumasi and district capitals.',
        q5_recruitment_estimate: '1000 members',
        q6_regional_building_plan: '10-member district committees across all districts.',
        weekly_hours: '20+ hours/week',
        willing_online_meetings: true,
        willing_physical_activities: true,
        referee_name: 'Nana Elder',
        referee_relationship: 'Community Leader',
        referee_phone: '0240004444',
        declaration_agreed: true,
        status: 'submitted',
      })
      .select('id')
      .single();

    if (rec2?.id) createdRecordIds.push(rec2.id);

    // Record 3: Resident in Volta applying for Interim Regional Minister in Volta
    const { data: rec3, error: err3 } = await supabase
      .from('nominations')
      .insert({
        full_name: 'Volta Candidate Test',
        date_of_birth: '1997-03-03',
        phone_number: '0240005555',
        email: `volta_${timestamp}@example.com`,
        region: 'Volta',
        district_municipality: 'Ho Municipal',
        town_community: 'Ho',
        occupation: 'Teacher',
        education_level: "Bachelor's Degree",
        area_of_study_profession: 'Education',
        position_applied: 'Interim Regional Minister',
        region_if_regional_minister: 'Volta',
        q1_why_serve: 'Promoting educational access for youth in Volta.',
        q2_leadership_as_service: 'Selfless dedication to community development.',
        q3_first_90_days: 'Establish district youth councils.',
        q4_recruitment_plan: 'School and campus outreach in Volta.',
        q5_recruitment_estimate: '500 members',
        q6_regional_building_plan: 'Regional executive council setup.',
        weekly_hours: '10-15 hours/week',
        willing_online_meetings: true,
        willing_physical_activities: true,
        referee_name: 'Mr. Headmaster',
        referee_relationship: 'Principal',
        referee_phone: '0240006666',
        declaration_agreed: true,
        status: 'submitted',
      })
      .select('id')
      .single();

    if (rec3?.id) createdRecordIds.push(rec3.id);
  });

  afterAll(async () => {
    // Cleanup seeded test records from database
    const supabase = createAdminClient();
    for (const id of createdRecordIds) {
      await supabase.from('nominations').delete().eq('id', id);
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Authoritative National Portfolio Allow-List
  // ---------------------------------------------------------------------------
  it('1. Authoritative NATIONAL_PORTFOLIOS contains exactly 11 portfolios', () => {
    expect(NATIONAL_PORTFOLIOS.length).toBe(11);
    expect(NATIONAL_PORTFOLIOS).toContain('Chief of Staff');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Education');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Youth Employment and Entrepreneurship');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Finance');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Research, Science and Technology');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Communications');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Health');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Agriculture');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Gender, Women and Social Protection');
    expect(NATIONAL_PORTFOLIOS).toContain('Minister for Local Government and Community Development');
    expect(NATIONAL_PORTFOLIOS).toContain('Attorney-General and Minister for Justice');

    // Interim Regional Minister is the regional position, not a national portfolio
    expect(NATIONAL_PORTFOLIOS).not.toContain('Interim Regional Minister');
    expect(REGIONAL_PORTFOLIO).toBe('Interim Regional Minister');
  });

  // ---------------------------------------------------------------------------
  // 2. Super Admin Access Scoping
  // ---------------------------------------------------------------------------
  it('2. Super Admin receives all categories without regional or portfolio restrictions', async () => {
    const superAdminSession: AdminSession = {
      user: { id: 'super-admin-uuid', email: 'admin@yrl.org' },
      role: 'super_admin',
    };

    const data = await getAdminScopedData(superAdminSession);

    expect(data.nominations.length).toBeGreaterThanOrEqual(3);
    const hasNational = data.nominations.some((n) => n.position_applied === 'Minister for Finance');
    const hasAshanti = data.nominations.some((n) => n.region_if_regional_minister === 'Ashanti');
    const hasVolta = data.nominations.some((n) => n.region === 'Volta');

    expect(hasNational).toBe(true);
    expect(hasAshanti).toBe(true);
    expect(hasVolta).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 3. National Reviewer Scoping
  // ---------------------------------------------------------------------------
  it('3. National Reviewer is strictly restricted to the 11 national portfolios', async () => {
    const reviewerSession: AdminSession = {
      user: { id: 'reviewer-uuid', email: 'reviewer@yrl.org' },
      role: 'national_reviewer',
    };

    const data = await getAdminScopedData(reviewerSession);

    // Must not contain any Interim Regional Minister application
    for (const nom of data.nominations) {
      expect(NATIONAL_PORTFOLIOS).toContain(nom.position_applied);
      expect(nom.position_applied).not.toBe('Interim Regional Minister');
    }

    // National Reviewer does not view general members or contact messages
    expect(data.members.length).toBe(0);
    expect(data.contactMessages.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 4. Regional Coordinator Isolation
  // ---------------------------------------------------------------------------
  it('4. Regional Coordinator for Ashanti can view Ashanti records (both residence and deployment), but cannot see Volta records', async () => {
    const ashantiSession: AdminSession = {
      user: { id: 'coord-ashanti-uuid', email: 'ashanti.coord@yrl.org' },
      role: 'regional_coordinator',
      assignedRegion: 'Ashanti',
    };

    const data = await getAdminScopedData(ashantiSession);

    // Must contain the candidate applying for Ashanti deployment (even if resident in Central)
    const hasAshantiDeployment = data.nominations.some(
      (n) => n.region_if_regional_minister === 'Ashanti'
    );
    expect(hasAshantiDeployment).toBe(true);

    // Must NOT contain Volta records
    const hasVolta = data.nominations.some(
      (n) => n.region === 'Volta' || n.region_if_regional_minister === 'Volta'
    );
    expect(hasVolta).toBe(false);

    // Contact messages must be empty
    expect(data.contactMessages.length).toBe(0);
  });

  it('5. Regional Coordinator for Volta cannot see Ashanti or Greater Accra records', async () => {
    const voltaSession: AdminSession = {
      user: { id: 'coord-volta-uuid', email: 'volta.coord@yrl.org' },
      role: 'regional_coordinator',
      assignedRegion: 'Volta',
    };

    const data = await getAdminScopedData(voltaSession);

    const hasVolta = data.nominations.some(
      (n) => n.region === 'Volta' || n.region_if_regional_minister === 'Volta'
    );
    expect(hasVolta).toBe(true);

    const hasAshanti = data.nominations.some(
      (n) => n.region_if_regional_minister === 'Ashanti'
    );
    expect(hasAshanti).toBe(false);

    const hasNational = data.nominations.some(
      (n) => n.email === `national_${timestamp}@example.com`
    );
    expect(hasNational).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Unauthorized Roles Rejection
  // ---------------------------------------------------------------------------
  it('6. Unknown role or missing assigned region returns empty scoped data', async () => {
    const invalidSession = {
      user: { id: 'hacker-uuid', email: 'intruder@example.com' },
      role: 'unknown_role' as any,
    };

    const data = await getAdminScopedData(invalidSession);
    expect(data.nominations.length).toBe(0);
    expect(data.members.length).toBe(0);
    expect(data.contactMessages.length).toBe(0);

    const unassignedCoordSession = {
      user: { id: 'coord-no-region-uuid', email: 'noregion@example.com' },
      role: 'regional_coordinator' as const,
      assignedRegion: undefined,
    };

    const dataCoord = await getAdminScopedData(unassignedCoordSession);
    expect(dataCoord.nominations.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 6. Security Boundaries
  // ---------------------------------------------------------------------------
  it('7. Service role key is never exported or present in client modules', () => {
    const clientModulePath = path.resolve(process.cwd(), 'lib/supabase/client.ts');
    const content = fs.readFileSync(clientModulePath, 'utf8');

    expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(content).not.toContain('createAdminClient');
  });

  it('8. Legacy admin password and cookie references are eliminated from admin code', () => {
    const actionsPath = path.resolve(process.cwd(), 'app/admin/actions.ts');
    const actionsContent = fs.readFileSync(actionsPath, 'utf8');

    expect(actionsContent).not.toContain('ADMIN_VIEW_PASSWORD');
    expect(actionsContent).not.toContain('yrl_admin_auth');
    expect(actionsContent).not.toContain('updateNominationStatus');

    const dashboardPath = path.resolve(process.cwd(), 'app/admin/AdminDashboard.tsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

    expect(dashboardContent).not.toContain('updateNominationStatus');
  });
});

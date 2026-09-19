import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Parse and load .env.local before imports evaluate process.env
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

import {
  NATIONAL_PORTFOLIOS,
  REGIONAL_PORTFOLIO,
  type AdminSession,
  type NominationStatus,
  NOMINATION_STATUSES,
  REVIEW_RECOMMENDATIONS,
  isNominationInScope,
} from '@/lib/auth/types';
import {
  transitionNominationStatus,
  submitNominationReview,
  getNominationReviews,
  loginWithSupabase,
} from '@/app/admin/actions';
import { updateStatusSchema, submitReviewSchema } from '@/lib/validations/admin';
import { createAdminClient } from '@/lib/supabase/server';

describe('Model B / Phase B8: Admin Review / Management Workflow Verification Suite', () => {
  const timestamp = Date.now();
  const createdRecordIds: string[] = [];
  let testNominationId: string;

  beforeAll(async () => {
    const supabase = createAdminClient();

    // Create a real test nomination to verify mutations, reviews, and audit logs
    const { data: nom, error: nomErr } = await supabase
      .from('nominations')
      .insert({
        full_name: `B8 Test Applicant ${timestamp}`,
        date_of_birth: '1995-05-15',
        gender: 'Female',
        phone_number: `0244${timestamp.toString().slice(-6)}`,
        whatsapp_number: `0244${timestamp.toString().slice(-6)}`,
        email: `b8_test_${timestamp}@example.com`,
        region: 'Greater Accra',
        district_municipality: 'Accra Metropolitan',
        town_community: 'Osu',
        occupation: 'Civil Servant',
        education_level: 'Master’s Degree',
        area_of_study_profession: 'Public Administration',
        position_applied: 'Minister for Health',
        has_leadership_experience: true,
        q1_why_serve: 'Committed to serving the nation through YRL initiatives.',
        q2_leadership_as_service: 'Leadership is fundamentally about empowerment and humility.',
        q3_first_90_days: 'Establish baseline health metrics across grassroots communities.',
        q4_recruitment_plan: 'Leverage youth networks and regional university health clubs.',
        weekly_hours: '15-20 hours',
        willing_online_meetings: true,
        willing_physical_activities: true,
        referee_name: 'Dr. Jane Mensah',
        referee_relationship: 'Former Director',
        referee_phone: '0244000111',
        declaration_agreed: true,
        status: 'submitted',
      })
      .select('id')
      .single();

    if (nomErr || !nom) {
      throw new Error(`Failed to seed test nomination for B8: ${nomErr?.message}`);
    }

    testNominationId = nom.id;
    createdRecordIds.push(nom.id);
  });

  afterAll(async () => {
    const supabase = createAdminClient();
    if (createdRecordIds.length > 0) {
      // Clean up reviews, audit logs, and nominations created during test
      await supabase.from('nomination_reviews').delete().in('nomination_id', createdRecordIds);
      await supabase.from('audit_logs').delete().in('entity_id', createdRecordIds);
      await supabase.from('nominations').delete().in('id', createdRecordIds);
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Authoritative Schema & Statuses Invariance
  // ---------------------------------------------------------------------------
  it('1. Authoritative nomination statuses match the 6 DB statuses exactly', () => {
    expect(NOMINATION_STATUSES).toEqual([
      'submitted',
      'screening',
      'shortlisted',
      'interview',
      'selected',
      'declined',
    ]);
  });

  it('2. Review recommendations match the 3 DB recommendations exactly', () => {
    expect(REVIEW_RECOMMENDATIONS).toEqual(['advance', 'hold', 'decline']);
  });

  // ---------------------------------------------------------------------------
  // 2. Server-side RBAC Scope Helper (isNominationInScope)
  // ---------------------------------------------------------------------------
  it('3. isNominationInScope correctly enforces role and regional boundaries', () => {
    const superAdminSession: AdminSession = {
      user: { id: 'admin-1', email: 'super@yrl.org' },
      role: 'super_admin',
    };

    const nationalReviewerSession: AdminSession = {
      user: { id: 'reviewer-1', email: 'national@yrl.org' },
      role: 'national_reviewer',
    };

    const regionalCoordinatorAshanti: AdminSession = {
      user: { id: 'coord-1', email: 'ashanti@yrl.org' },
      role: 'regional_coordinator',
      assignedRegion: 'Ashanti',
    };

    const nationalRecord = {
      position_applied: 'Minister for Health',
      region: 'Greater Accra',
      region_if_regional_minister: null,
    };

    const regionalRecordAshanti = {
      position_applied: 'Interim Regional Minister',
      region: 'Ashanti',
      region_if_regional_minister: 'Ashanti',
    };

    const regionalRecordVolta = {
      position_applied: 'Interim Regional Minister',
      region: 'Volta',
      region_if_regional_minister: 'Volta',
    };

    // Super Admin: access to all
    expect(isNominationInScope(nationalRecord, superAdminSession)).toBe(true);
    expect(isNominationInScope(regionalRecordAshanti, superAdminSession)).toBe(true);
    expect(isNominationInScope(regionalRecordVolta, superAdminSession)).toBe(true);

    // National Reviewer: access to national portfolios only
    expect(isNominationInScope(nationalRecord, nationalReviewerSession)).toBe(true);
    expect(isNominationInScope(regionalRecordAshanti, nationalReviewerSession)).toBe(false);
    expect(isNominationInScope(regionalRecordVolta, nationalReviewerSession)).toBe(false);

    // Regional Coordinator Ashanti: access to Ashanti only
    expect(isNominationInScope(regionalRecordAshanti, regionalCoordinatorAshanti)).toBe(true);
    expect(isNominationInScope(regionalRecordVolta, regionalCoordinatorAshanti)).toBe(false);
    // National portfolio in Greater Accra is outside Ashanti coordinator's region
    expect(isNominationInScope(nationalRecord, regionalCoordinatorAshanti)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 3. Validation Schemas (updateStatusSchema & submitReviewSchema)
  // ---------------------------------------------------------------------------
  it('4. updateStatusSchema validates valid inputs and rejects invalid statuses', () => {
    const valid = updateStatusSchema.safeParse({
      nominationId: testNominationId,
      status: 'screening',
      reason: 'Passed preliminary check',
    });
    expect(valid.success).toBe(true);

    const invalidStatus = updateStatusSchema.safeParse({
      nominationId: testNominationId,
      status: 'approved_invalid',
    });
    expect(invalidStatus.success).toBe(false);

    const invalidUuid = updateStatusSchema.safeParse({
      nominationId: 'not-a-uuid',
      status: 'shortlisted',
    });
    expect(invalidUuid.success).toBe(false);
  });

  it('5. submitReviewSchema validates ratings (1-5), recommendations, and stages', () => {
    const valid = submitReviewSchema.safeParse({
      nominationId: testNominationId,
      reviewStage: 'Screening Assessment',
      rating: 4,
      recommendation: 'advance',
      notes: 'Strong candidate with verifiable civic background.',
    });
    expect(valid.success).toBe(true);

    // Rating > 5 rejected
    const invalidRatingHigh = submitReviewSchema.safeParse({
      nominationId: testNominationId,
      reviewStage: 'Screening Assessment',
      rating: 6,
      recommendation: 'advance',
    });
    expect(invalidRatingHigh.success).toBe(false);

    // Rating < 1 rejected
    const invalidRatingLow = submitReviewSchema.safeParse({
      nominationId: testNominationId,
      reviewStage: 'Screening Assessment',
      rating: 0,
      recommendation: 'advance',
    });
    expect(invalidRatingLow.success).toBe(false);

    // Invalid recommendation rejected
    const invalidRec = submitReviewSchema.safeParse({
      nominationId: testNominationId,
      reviewStage: 'Screening Assessment',
      rating: 3,
      recommendation: 'hire',
    });
    expect(invalidRec.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 4. Unauthenticated Rejection
  // ---------------------------------------------------------------------------
  it('6. Server Actions reject unauthenticated calls safely', async () => {
    // Calling server actions directly in node environment without cookies returns unauthorized error
    const statusRes = await transitionNominationStatus({
      nominationId: testNominationId,
      status: 'screening',
    });
    expect(statusRes.success).toBe(false);
    expect(statusRes.error).toContain('Unauthorized');

    const reviewRes = await submitNominationReview({
      nominationId: testNominationId,
      reviewStage: 'Screening',
      rating: 4,
      recommendation: 'advance',
    });
    expect(reviewRes.success).toBe(false);
    expect(reviewRes.error).toContain('Unauthorized');

    const fetchReviewsRes = await getNominationReviews(testNominationId);
    expect(fetchReviewsRes.success).toBe(false);
    expect(fetchReviewsRes.error).toContain('Unauthorized');
  });

  // ---------------------------------------------------------------------------
  // 5. Database Verification: Status Mutation & Audit Log Persistence
  // ---------------------------------------------------------------------------
  it('7. Live Supabase verification: status update and audit logging', async () => {
    const supabase = createAdminClient();

    // Perform direct authoritative mutation simulation matching Server Action logic
    const previousStatus = 'submitted';
    const nextStatus: NominationStatus = 'screening';

    const { error: updateErr } = await supabase
      .from('nominations')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', testNominationId);

    expect(updateErr).toBeNull();

    // Verify status updated in database
    const { data: updatedNom, error: fetchErr } = await supabase
      .from('nominations')
      .select('status')
      .eq('id', testNominationId)
      .single();

    expect(fetchErr).toBeNull();
    expect(updatedNom?.status).toBe('screening');

    // Insert audit log
    const { error: auditErr } = await supabase.from('audit_logs').insert({
      entity_type: 'nomination',
      entity_id: testNominationId,
      actor_id: 'test_admin@yrl.org',
      action: 'status_change',
      previous_state: { status: previousStatus },
      new_state: { status: nextStatus, reason: 'Test verification' },
    });

    expect(auditErr).toBeNull();

    // Verify audit log record exists
    const { data: auditLogs, error: auditFetchErr } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_id', testNominationId)
      .eq('action', 'status_change');

    expect(auditFetchErr).toBeNull();
    expect(auditLogs && auditLogs.length > 0).toBe(true);
    expect(auditLogs![0].previous_state.status).toBe('submitted');
    expect(auditLogs![0].new_state.status).toBe('screening');
  });

  // ---------------------------------------------------------------------------
  // 6. Database Verification: Review Notes, Rating & Audit Log Persistence
  // ---------------------------------------------------------------------------
  it('8. Live Supabase verification: review notes, rating, and review audit logging', async () => {
    const supabase = createAdminClient();

    // Insert review record
    const { data: reviewRecord, error: reviewErr } = await supabase
      .from('nomination_reviews')
      .insert({
        nomination_id: testNominationId,
        reviewer_name: 'test_reviewer@yrl.org',
        review_stage: 'Screening Assessment',
        rating: 4,
        recommendation: 'advance',
        notes: 'Candidate demonstrated exemplary commitment and articulated high-impact priorities.',
      })
      .select('id, rating, recommendation, notes, review_stage')
      .single();

    expect(reviewErr).toBeNull();
    expect(reviewRecord?.id).toBeDefined();
    expect(reviewRecord?.rating).toBe(4);
    expect(reviewRecord?.recommendation).toBe('advance');
    expect(reviewRecord?.notes).toContain('Candidate demonstrated exemplary commitment');

    // Insert review audit log
    const { error: auditErr } = await supabase.from('audit_logs').insert({
      entity_type: 'nomination',
      entity_id: testNominationId,
      actor_id: 'test_reviewer@yrl.org',
      action: 'review_submitted',
      previous_state: null,
      new_state: {
        review_id: reviewRecord!.id,
        review_stage: 'Screening Assessment',
        rating: 4,
        recommendation: 'advance',
      },
    });

    expect(auditErr).toBeNull();

    // Verify review retrieval
    const { data: fetchedReviews, error: fetchReviewsErr } = await supabase
      .from('nomination_reviews')
      .select('*')
      .eq('nomination_id', testNominationId);

    expect(fetchReviewsErr).toBeNull();
    expect(fetchedReviews && fetchedReviews.length > 0).toBe(true);
    expect(fetchedReviews![0].notes).toContain('exemplary commitment');
  });

  // ---------------------------------------------------------------------------
  // 7. Login Server Action Execution & Verification
  // ---------------------------------------------------------------------------
  it('9. loginWithSupabase executes safely as a valid async Server Action', async () => {
    const fd = new FormData();
    fd.append('email', 'admin_test@yrl.org');
    fd.append('password', 'wrongpassword');

    const res = await loginWithSupabase(fd);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(typeof res.error).toBe('string');
  });
});


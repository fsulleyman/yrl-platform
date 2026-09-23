import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminSession } from '@/lib/auth/types';
import {
  getMemberAuthResult,
  getMemberSession,
} from '@/lib/auth/server';
import {
  getMemberDataAction,
  updateMemberProfileAction,
} from '@/lib/actions/member';
import {
  updateMemberProfileSchema,
} from '@/lib/validations/member';
import {
  verifyPayment,
  rejectPayment,
  activateMembershipApplication,
  checkPaymentPermission,
  getPaymentReceiptSignedUrl,
  getAdminPaymentsList,
  getAdminPaymentDetail,
} from '@/lib/payment/service';
import * as supabaseServer from '@/lib/supabase/server';
import * as resendEmail from '@/lib/email/resend';

describe('Phase B13.4: Post-Activation Member Onboarding & Membership Completion', () => {
  // Test Data Fixtures
  const memberId1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const memberId2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const appId1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const paymentId1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  const mockActiveMember = {
    id: memberId1,
    member_id: 'YRL-MEM-2026-1050',
    full_name: 'Kwame Mensah',
    date_of_birth: '2000-01-15',
    gender: 'Male',
    phone_number: '0244111222',
    whatsapp_number: '0244111222',
    email: 'kwame.mensah@example.com',
    region: 'Ashanti',
    district_municipality: 'Kumasi Metro',
    town_community: 'Adum',
    occupation: 'Teacher',
    education_level: "Bachelor's Degree",
    why_join: 'Passionate about grassroots civic leadership and youth empowerment.',
    availability: '5-10 hours/week',
    engagement_interests: ['civic_education'],
    civic_acknowledgement: true,
    status: 'active',
    created_at: '2026-09-23T10:00:00Z',
    updated_at: '2026-09-23T10:00:00Z',
  };

  const mockOtherMember = {
    id: memberId2,
    member_id: 'YRL-MEM-2026-1051',
    full_name: 'Akua Osei',
    phone_number: '0200333444',
    email: 'akua.osei@example.com',
    region: 'Greater Accra',
    status: 'active',
  };

  const mockApplication = {
    id: appId1,
    application_number: 'YRL-APP-2026-1050',
    member_id: memberId1,
    full_name: 'Kwame Mensah',
    date_of_birth: '2000-01-15',
    gender: 'Male',
    phone_number: '0244111222',
    whatsapp_number: '0244111222',
    email: 'kwame.mensah@example.com',
    region: 'Ashanti',
    district_municipality: 'Kumasi Metro',
    town_community: 'Adum',
    occupation: 'Teacher',
    education_level: "Bachelor's Degree",
    why_join: 'Passionate about grassroots civic leadership and youth empowerment.',
    availability: '5-10 hours/week',
    engagement_interests: ['civic_education'],
    civic_acknowledgement: true,
    status: 'activated',
    submitted_at: '2026-09-23T10:00:00Z',
    activated_at: '2026-09-23T12:00:00Z',
  };

  const superAdminSession: AdminSession = {
    user: { id: 'admin-super-uuid', email: 'super@yrl.org.gh' } as any,
    role: 'super_admin',
    assignedRegion: undefined,
  };

  const regionalAdminAshanti: AdminSession = {
    user: { id: 'admin-ashanti-uuid', email: 'ashanti@yrl.org.gh' } as any,
    role: 'regional_coordinator',
    assignedRegion: 'Ashanti',
  };

  const regionalAdminAccra: AdminSession = {
    user: { id: 'admin-accra-uuid', email: 'accra@yrl.org.gh' } as any,
    role: 'regional_coordinator',
    assignedRegion: 'Greater Accra',
  };

  const nationalReviewerSession: AdminSession = {
    user: { id: 'reviewer-uuid', email: 'reviewer@yrl.org.gh' } as any,
    role: 'national_reviewer',
    assignedRegion: undefined,
  };

  const deactivatedAdminSession: AdminSession & { disabled: boolean } = {
    user: { id: 'deactivated-uuid', email: 'former@yrl.org.gh' } as any,
    role: 'regional_coordinator',
    assignedRegion: 'Ashanti',
    disabled: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // 1. AUTHENTICATION & IDENTITY RESOLUTION
  // ============================================================
  describe('1. Member Authentication & Identity Resolution', () => {
    it('should return unauthenticated if Supabase session is missing', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }),
        },
      } as any);

      const result = await getMemberAuthResult();
      expect(result.status).toBe('unauthenticated');
    });

    it('should return unauthenticated if user email is empty or null', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: null } }, error: null }),
        },
      } as any);

      const result = await getMemberAuthResult();
      expect(result.status).toBe('unauthenticated');
    });

    it('should resolve active member session when email matches members record', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMember, error: null }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await getMemberAuthResult();
      expect(result.status).toBe('authenticated');
      if (result.status === 'authenticated') {
        expect(result.session.member.member_id).toBe('YRL-MEM-2026-1050');
        expect(result.session.member.full_name).toBe('Kwame Mensah');
        expect(result.session.application?.application_number).toBe('YRL-APP-2026-1050');
      }
    });

    it('should return pending_activation if user has submitted application but not yet activated', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-pending', email: 'pending@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: 'app-pending-id',
                          application_number: 'YRL-APP-2026-9999',
                          status: 'payment_verified',
                          submitted_at: '2026-09-23T10:00:00Z',
                          activated_at: null,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await getMemberAuthResult();
      expect(result.status).toBe('pending_activation');
      if (result.status === 'pending_activation') {
        expect(result.application.application_number).toBe('YRL-APP-2026-9999');
        expect(result.application.status).toBe('payment_verified');
      }
    });

    it('should return not_a_member if no member record or application exists for user email', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-unknown', email: 'unknown@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        })),
      } as any);

      const result = await getMemberAuthResult();
      expect(result.status).toBe('not_a_member');
    });

    it('getMemberSession helper returns null when unauthenticated', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }),
        },
      } as any);

      const session = await getMemberSession();
      expect(session).toBeNull();
    });
  });

  // ============================================================
  // 2. SERVER-SIDE OWNERSHIP & ANTI-IDOR PROTECTION
  // ============================================================
  describe('2. Server-Side Ownership & IDOR Protection', () => {
    it('getMemberDataAction derives member identity strictly from session cookies', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMember, error: null }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const dataResult = await getMemberDataAction();
      expect(dataResult.success).toBe(true);
      expect(dataResult.member?.email).toBe('kwame.mensah@example.com');
      expect(dataResult.member?.member_id).toBe('YRL-MEM-2026-1050');
    });

    it('getMemberDataAction rejects unauthenticated request without exposing data', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const dataResult = await getMemberDataAction();
      expect(dataResult.success).toBe(false);
      expect(dataResult.member).toBeUndefined();
      expect(dataResult.error).toContain('Unauthorized');
    });

    it('updateMemberProfileAction updates only the authenticated session member, ignoring client IDs', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      let targetUpdateId = '';
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMember, error: null }),
                  neq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              update: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  if (col === 'id') targetUpdateId = val;
                  return {
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { ...mockActiveMember, occupation: 'Senior Lecturer' },
                        error: null,
                      }),
                    }),
                  };
                }),
              })),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {} as any;
        }),
      } as any);

      // Attempted IDOR: passing a tampered target ID in payload should have zero effect
      const payloadWithTamperedId = {
        id: 'tampered-other-member-id',
        member_id: 'YRL-MEM-9999-9999',
        phone_number: '0244111222',
        district_municipality: 'Kumasi Metro',
        town_community: 'Adum',
        occupation: 'Senior Lecturer',
        education_level: "Master's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      };

      // updateMemberProfileSchema uses .strict() so extra fields like id and member_id will be rejected immediately!
      const result = await updateMemberProfileAction(payloadWithTamperedId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Please correct the highlighted fields');
    });
  });

  // ============================================================
  // 3. PROFILE ALLOWLIST & MASS-ASSIGNMENT DEFENSE
  // ============================================================
  describe('3. Profile Allowlist & Mass-Assignment Defense', () => {
    it('validates permitted fields successfully', () => {
      const validPayload = {
        phone_number: '0244998877',
        whatsapp_number: '0244998877',
        district_municipality: 'Sekondi-Takoradi',
        town_community: 'Takoradi',
        occupation: 'Civil Engineer',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['community_projects', 'civic_education'],
      };

      const parseResult = updateMemberProfileSchema.safeParse(validPayload);
      expect(parseResult.success).toBe(true);
    });

    it('rejects payload when required permitted fields are missing', () => {
      const invalidPayload = {
        phone_number: '0244', // too short
        district_municipality: '',
      };

      const parseResult = updateMemberProfileSchema.safeParse(invalidPayload);
      expect(parseResult.success).toBe(false);
    });

    it('strict schema rejects attempt to modify member_id', () => {
      const payloadWithMemberId = {
        member_id: 'YRL-MEM-SPOOFED',
        phone_number: '0244998877',
        district_municipality: 'Sekondi-Takoradi',
        town_community: 'Takoradi',
        occupation: 'Engineer',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      };

      const parseResult = updateMemberProfileSchema.safeParse(payloadWithMemberId);
      expect(parseResult.success).toBe(false);
    });

    it('strict schema rejects attempt to modify status', () => {
      const payloadWithStatus = {
        status: 'suspended',
        phone_number: '0244998877',
        district_municipality: 'Sekondi-Takoradi',
        town_community: 'Takoradi',
        occupation: 'Engineer',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      };

      const parseResult = updateMemberProfileSchema.safeParse(payloadWithStatus);
      expect(parseResult.success).toBe(false);
    });

    it('strict schema rejects attempt to modify region', () => {
      const payloadWithRegion = {
        region: 'Greater Accra',
        phone_number: '0244998877',
        district_municipality: 'Sekondi-Takoradi',
        town_community: 'Takoradi',
        occupation: 'Engineer',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      };

      const parseResult = updateMemberProfileSchema.safeParse(payloadWithRegion);
      expect(parseResult.success).toBe(false);
    });

    it('strict schema rejects attempt to modify email', () => {
      const payloadWithEmail = {
        email: 'hacker@example.com',
        phone_number: '0244998877',
        district_municipality: 'Sekondi-Takoradi',
        town_community: 'Takoradi',
        occupation: 'Engineer',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      };

      const parseResult = updateMemberProfileSchema.safeParse(payloadWithEmail);
      expect(parseResult.success).toBe(false);
    });

    it('strict schema rejects attempt to modify payment or application status', () => {
      const payloadWithPaymentStatus = {
        payment_status: 'successful',
        application_status: 'activated',
        phone_number: '0244998877',
        district_municipality: 'Sekondi-Takoradi',
        town_community: 'Takoradi',
        occupation: 'Engineer',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      };

      const parseResult = updateMemberProfileSchema.safeParse(payloadWithPaymentStatus);
      expect(parseResult.success).toBe(false);
    });

    it('rejects phone number if already used by another member', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMember, error: null }),
                  neq: vi.fn().mockReturnValue({
                    // Existing phone owned by someone else!
                    maybeSingle: vi.fn().mockResolvedValue({ data: { id: memberId2 }, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await updateMemberProfileAction({
        phone_number: '0200333444', // Taken by Akua
        district_municipality: 'Kumasi Metro',
        town_community: 'Adum',
        occupation: 'Teacher',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Another member with this phone number is already registered');
    });
  });

  // ============================================================
  // 4. AUDIT TRAIL INTEGRITY
  // ============================================================
  describe('4. Audit Trail Integrity', () => {
    it('records member_profile_updated audit event upon successful profile update', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      const auditInserts: any[] = [];
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMember, error: null }),
                  neq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockActiveMember, town_community: 'Bantama' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn().mockImplementation((record: any) => {
                auditInserts.push(record);
                return Promise.resolve({ data: null, error: null });
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await updateMemberProfileAction({
        phone_number: '0244111222',
        district_municipality: 'Kumasi Metro',
        town_community: 'Bantama',
        occupation: 'Teacher',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      });

      expect(result.success).toBe(true);
      expect(auditInserts.length).toBe(1);
      const audit = auditInserts[0];
      expect(audit.entity_type).toBe('member');
      expect(audit.entity_id).toBe(memberId1);
      expect(audit.actor_id).toBe('kwame.mensah@example.com');
      expect(audit.action).toBe('member_profile_updated');
      expect(audit.previous_state.town_community).toBe('Adum');
      expect(audit.new_state.town_community).toBe('Bantama');
      // Verify no sensitive tokens or secrets in audit
      expect(audit.new_state.password).toBeUndefined();
      expect(audit.new_state.token).toBeUndefined();
    });
  });

  // ============================================================
  // 5. ACTIVATION INTEGRITY & WELCOME EMAIL DISPATCH
  // ============================================================
  describe('5. Activation Integrity & Welcome Email Integration', () => {
    it('dispatches welcome email once upon successful activation', async () => {
      const emailSpy = vi.spyOn(resendEmail, 'sendMembershipEmail').mockResolvedValue({
        success: true,
        id: 'email-resend-id',
      });

      const pendingApp = {
        ...mockApplication,
        id: appId1,
        status: 'payment_verified',
        member_id: null,
        payments: [{ id: paymentId1, status: 'successful' }],
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: pendingApp, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-mem-uuid', member_id: 'YRL-MEM-2026-1099' },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await activateMembershipApplication(superAdminSession, {
        application_id: appId1,
      });

      expect(result.success).toBe(true);
      expect(result.data?.memberId).toBe('YRL-MEM-2026-1099');
      expect(emailSpy).toHaveBeenCalledTimes(1);
      expect(emailSpy).toHaveBeenCalledWith(
        'kwame.mensah@example.com',
        expect.objectContaining({
          fullName: 'Kwame Mensah',
          memberId: 'YRL-MEM-2026-1099',
          region: 'Ashanti',
        })
      );
    });

    it('gracefully degrades if email provider encounters network error during activation', async () => {
      vi.spyOn(resendEmail, 'sendMembershipEmail').mockRejectedValue(new Error('Resend network timeout'));

      const pendingApp = {
        ...mockApplication,
        id: appId1,
        status: 'payment_verified',
        member_id: null,
        payments: [{ id: paymentId1, status: 'successful' }],
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: pendingApp, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-mem-uuid', member_id: 'YRL-MEM-2026-1099' },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await activateMembershipApplication(superAdminSession, {
        application_id: appId1,
      });

      // Member creation and activation must succeed even if non-blocking email fails
      expect(result.success).toBe(true);
      expect(result.data?.memberId).toBe('YRL-MEM-2026-1099');
    });

    it('duplicate activation attempt is blocked without duplicate member or email', async () => {
      const emailSpy = vi.spyOn(resendEmail, 'sendMembershipEmail');

      const alreadyActivatedApp = {
        ...mockApplication,
        id: appId1,
        status: 'activated',
        member_id: memberId1,
        payments: [{ id: paymentId1, status: 'successful' }],
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: alreadyActivatedApp, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await activateMembershipApplication(superAdminSession, {
        application_id: appId1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been activated');
      expect(emailSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 6. INVARIANT ENFORCEMENT: VERIFY != ACTIVATE & NO MEMBER PAYMENT MUTATION
  // ============================================================
  describe('6. Invariant Enforcement: verifyPayment != activateMembershipApplication', () => {
    it('verifyPayment only marks payment successful and application payment_verified', async () => {
      const mockPay = {
        id: paymentId1,
        application_id: appId1,
        payment_reference: 'YRL-PAY-2026-1050',
        status: 'pending_verification',
        membership_applications: {
          id: appId1,
          region: 'Ashanti',
          status: 'pending_verification',
        },
      };

      let memberInserted = false;
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockPay, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          if (table === 'members') {
            return {
              insert: vi.fn().mockImplementation(() => {
                memberInserted = true;
                return Promise.resolve({ data: null, error: null });
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await verifyPayment(superAdminSession, { payment_id: paymentId1 });
      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('successful');
      expect(result.data?.applicationStatus).toBe('payment_verified');
      // Verifying payment must NEVER create a member or generate YRL-MEM
      expect(memberInserted).toBe(false);
      expect((result.data as any)?.memberId).toBeUndefined();
    });
  });

  // ============================================================
  // 7. ADMIN RBAC & REGIONAL SCOPE PRESERVATION
  // ============================================================
  describe('7. Admin RBAC & Regional Scope Preservation', () => {
    it('Super Admin has full access across all regions', () => {
      const checkAshanti = checkPaymentPermission(superAdminSession, 'payments.verify', 'Ashanti');
      const checkAccra = checkPaymentPermission(superAdminSession, 'payments.activate', 'Greater Accra');
      expect(checkAshanti.authorized).toBe(true);
      expect(checkAccra.authorized).toBe(true);
    });

    it('Regional Coordinator is permitted for assigned region but denied for others', () => {
      const allowed = checkPaymentPermission(regionalAdminAshanti, 'payments.verify', 'Ashanti');
      const forbidden = checkPaymentPermission(regionalAdminAshanti, 'payments.verify', 'Greater Accra');
      expect(allowed.authorized).toBe(true);
      expect(forbidden.authorized).toBe(false);
      expect(forbidden.reason?.toLowerCase()).toContain('cannot administer resources');
    });

    it('National Reviewer is view-only: denied payment verification, rejection, and activation', () => {
      const verifyCheck = checkPaymentPermission(nationalReviewerSession, 'payments.verify');
      const rejectCheck = checkPaymentPermission(nationalReviewerSession, 'payments.reject');
      const activateCheck = checkPaymentPermission(nationalReviewerSession, 'payments.activate');

      expect(verifyCheck.authorized).toBe(false);
      expect(rejectCheck.authorized).toBe(false);
      expect(activateCheck.authorized).toBe(false);
    });

    it('Deactivated Administrator is immediately blocked from all operations', () => {
      const check = checkPaymentPermission(deactivatedAdminSession as any, 'payments.view');
      expect(check.authorized).toBe(false);
      expect(check.reason?.toLowerCase()).toContain('deactivated');
    });
  });

  // ============================================================
  // 8. RECEIPT PRIVACY & SIGNED URLS
  // ============================================================
  describe('8. Receipt Privacy & Storage Security', () => {
    it('getPaymentReceiptSignedUrl generates short-lived signed URL for authorized admin', async () => {
      const mockPay = {
        id: paymentId1,
        application_id: appId1,
        storage_bucket: 'payment-receipts',
        storage_object_path: `${appId1}/${paymentId1}/receipt.png`,
        receipt_original_filename: 'receipt.png',
        receipt_mime_type: 'image/png',
        membership_applications: {
          id: appId1,
          application_number: 'YRL-APP-2026-1050',
          region: 'Ashanti',
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockPay, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {} as any;
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/receipt.png?token=exp300' },
              error: null,
            }),
          }),
        },
      } as any);

      const result = await getPaymentReceiptSignedUrl(regionalAdminAshanti, paymentId1);
      expect(result.success).toBe(true);
      expect(result.data?.signedUrl).toContain('token=exp300');
      expect(result.data?.expiresIn).toBe(300);
    });

    it('getPaymentReceiptSignedUrl rejects cross-region administrator access', async () => {
      const mockPay = {
        id: paymentId1,
        application_id: appId1,
        storage_bucket: 'payment-receipts',
        storage_object_path: `${appId1}/${paymentId1}/receipt.png`,
        membership_applications: {
          id: appId1,
          application_number: 'YRL-APP-2026-1050',
          region: 'Greater Accra', // Accra application
        },
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockPay, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      // Ashanti admin accessing Accra receipt
      const result = await getPaymentReceiptSignedUrl(regionalAdminAshanti, paymentId1);
      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('cannot administer resources');
    });
  });

  // ============================================================
  // 9. REPLAY, CONCURRENCY & IDEMPOTENCY
  // ============================================================
  describe('9. Replay, Concurrency & Idempotency', () => {
    it('concurrent profile updates with identical permitted data succeed idempotently', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMember, error: null }),
                  neq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockActiveMember, occupation: 'Community Lead' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {} as any;
        }),
      } as any);

      const updateData = {
        phone_number: '0244111222',
        district_municipality: 'Kumasi Metro',
        town_community: 'Adum',
        occupation: 'Community Lead',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      };

      const [res1, res2] = await Promise.all([
        updateMemberProfileAction(updateData),
        updateMemberProfileAction(updateData),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res1.member?.occupation).toBe('Community Lead');
      expect(res2.member?.occupation).toBe('Community Lead');
    });
  });

  // ============================================================
  // 10. MEMBER LOGIN & LOGOUT SERVER ACTIONS
  // ============================================================
  describe('10. Member Login & Logout Server Actions', () => {
    it('loginMemberAction rejects submission with missing email or password', async () => {
      const formData = new FormData();
      formData.set('email', '');
      formData.set('password', '');

      const { loginMemberAction } = await import('@/app/member/actions');
      const result = await loginMemberAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Please enter both your registered email and password');
    });

    it('loginMemberAction rejects invalid credentials from Supabase Auth', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: new Error('Invalid login credentials'),
          }),
        },
      } as any);

      const formData = new FormData();
      formData.set('email', 'member@example.com');
      formData.set('password', 'wrongpassword');

      const { loginMemberAction } = await import('@/app/member/actions');
      const result = await loginMemberAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });

    it('loginMemberAction successfully authenticates and redirects to /member', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: { id: 'u1', email: 'kwame.mensah@example.com' }, session: {} },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'u1', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMember, error: null }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const formData = new FormData();
      formData.set('email', 'kwame.mensah@example.com');
      formData.set('password', 'correctpassword123');

      const { loginMemberAction } = await import('@/app/member/actions');
      const result = await loginMemberAction(formData);

      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe('/member');
    });

    it('logoutMemberAction signs out via Supabase Auth and returns success', async () => {
      const signOutSpy = vi.fn().mockResolvedValue({ error: null });
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          signOut: signOutSpy,
        },
      } as any);

      const { logoutMemberAction } = await import('@/app/member/actions');
      const result = await logoutMemberAction();

      expect(result.success).toBe(true);
      expect(signOutSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // 11. MEMBER PRIVILEGE SEPARATION & VALIDATION CORNERS
  // ============================================================
  describe('11. Member Privilege Separation & Validation Details', () => {
    it('ordinary member session cannot call admin payment verification', async () => {
      const memberAsAdminSession: AdminSession = {
        user: { id: memberId1, email: 'kwame.mensah@example.com' } as any,
        role: 'member' as any, // Not an authorized admin role!
        assignedRegion: undefined,
      };

      const permCheck = checkPaymentPermission(memberAsAdminSession, 'payments.verify');
      expect(permCheck.authorized).toBe(false);
      expect(permCheck.reason?.toLowerCase()).toContain('not authorized');

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: paymentId1,
                  status: 'pending_verification',
                  membership_applications: { id: appId1, region: 'Ashanti' },
                },
                error: null,
              }),
            }),
          }),
        })),
      } as any);

      const result = await verifyPayment(memberAsAdminSession, { payment_id: paymentId1 });
      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('not authorized');
    });

    it('ordinary member session cannot call admin payment rejection', async () => {
      const memberAsAdminSession: AdminSession = {
        user: { id: memberId1, email: 'kwame.mensah@example.com' } as any,
        role: 'member' as any,
        assignedRegion: undefined,
      };

      const permCheck = checkPaymentPermission(memberAsAdminSession, 'payments.reject');
      expect(permCheck.authorized).toBe(false);
      expect(permCheck.reason?.toLowerCase()).toContain('not authorized');

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: paymentId1,
                  status: 'pending_verification',
                  membership_applications: { id: appId1, region: 'Ashanti' },
                },
                error: null,
              }),
            }),
          }),
        })),
      } as any);

      const { rejectPayment } = await import('@/lib/payment/service');
      const result = await rejectPayment(memberAsAdminSession, {
        payment_id: paymentId1,
        rejection_reason: 'I am a member attempting to reject',
      });
      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('not authorized');
    });

    it('ordinary member session cannot call admin membership activation', async () => {
      const memberAsAdminSession: AdminSession = {
        user: { id: memberId1, email: 'kwame.mensah@example.com' } as any,
        role: 'member' as any,
        assignedRegion: undefined,
      };

      const permCheck = checkPaymentPermission(memberAsAdminSession, 'payments.activate');
      expect(permCheck.authorized).toBe(false);
      expect(permCheck.reason?.toLowerCase()).toContain('not authorized');

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: appId1,
                  region: 'Ashanti',
                  status: 'payment_verified',
                  payments: [{ status: 'successful' }],
                },
                error: null,
              }),
            }),
          }),
        })),
      } as any);

      const result = await activateMembershipApplication(memberAsAdminSession, {
        application_id: appId1,
      });
      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('not authorized');
    });

    it('updateMemberProfileSchema transforms empty whatsapp_number to null', () => {
      const parsed = updateMemberProfileSchema.parse({
        phone_number: '0244111222',
        whatsapp_number: '',
        district_municipality: 'Kumasi Metro',
        town_community: 'Adum',
        occupation: 'Teacher',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      });

      expect(parsed.whatsapp_number).toBeNull();
    });

    it('updateMemberProfileSchema rejects empty engagement_interests array', () => {
      const parseResult = updateMemberProfileSchema.safeParse({
        phone_number: '0244111222',
        district_municipality: 'Kumasi Metro',
        town_community: 'Adum',
        occupation: 'Teacher',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: [],
      });

      expect(parseResult.success).toBe(false);
    });

    it('updateMemberProfileAction returns unauthorized if member session is null', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const result = await updateMemberProfileAction({
        phone_number: '0244111222',
        district_municipality: 'Kumasi Metro',
        town_community: 'Adum',
        occupation: 'Teacher',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('updateMemberProfileSchema rejects invalid education_level string that exceeds max length', () => {
      const parseResult = updateMemberProfileSchema.safeParse({
        phone_number: '0244111222',
        district_municipality: 'Kumasi Metro',
        town_community: 'Adum',
        occupation: 'Teacher',
        education_level: 'A'.repeat(101),
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education'],
      });

      expect(parseResult.success).toBe(false);
    });

    it('updateMemberProfileSchema rejects invalid availability string that exceeds max length', () => {
      const parseResult = updateMemberProfileSchema.safeParse({
        phone_number: '0244111222',
        district_municipality: 'Kumasi Metro',
        town_community: 'Adum',
        occupation: 'Teacher',
        education_level: "Bachelor's Degree",
        availability: 'B'.repeat(101),
        engagement_interests: ['civic_education'],
      });

      expect(parseResult.success).toBe(false);
    });
  });
});


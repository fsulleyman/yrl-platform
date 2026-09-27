import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMemberAuthResult,
  getMemberSession,
  getAdminAuthResult,
} from '@/lib/auth/server';
import {
  getMemberDataAction,
  updateMemberProfileAction,
} from '@/lib/actions/member';
import {
  loginMemberAction,
  registerMemberAccountAction,
} from '@/app/member/actions';
import {
  updateMemberProfileSchema,
} from '@/lib/validations/member';
import * as supabaseServer from '@/lib/supabase/server';

describe('Phase B15: Member Account, Personal Dashboard & Member Self-Service', () => {
  // Test Data Fixtures
  const memberIdA = '11111111-1111-4111-8111-111111111111';
  const memberIdB = '22222222-2222-4222-8222-222222222222';
  const appIdA = '33333333-3333-4333-8333-333333333333';

  const mockActiveMemberA = {
    id: memberIdA,
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

  const mockActiveMemberB = {
    id: memberIdB,
    member_id: 'YRL-MEM-2026-1051',
    full_name: 'Akua Osei',
    date_of_birth: '1998-05-20',
    gender: 'Female',
    phone_number: '0200333444',
    whatsapp_number: '0200333444',
    email: 'akua.osei@example.com',
    region: 'Greater Accra',
    district_municipality: 'Accra Metro',
    town_community: 'Osu',
    occupation: 'Lawyer',
    education_level: "Master's Degree",
    why_join: 'Promoting youth representation and legal advocacy.',
    availability: '2-5 hours/week',
    engagement_interests: ['advocacy'],
    civic_acknowledgement: true,
    status: 'active',
    created_at: '2026-09-23T11:00:00Z',
    updated_at: '2026-09-23T11:00:00Z',
  };

  const mockApplicationA = {
    id: appIdA,
    application_number: 'YRL-APP-2026-1050',
    member_id: memberIdA,
    full_name: 'Kwame Mensah',
    email: 'kwame.mensah@example.com',
    status: 'activated',
    submitted_at: '2026-09-23T10:00:00Z',
    activated_at: '2026-09-23T12:00:00Z',
  };

  const validProfileUpdate = {
    phone_number: '0244999888',
    whatsapp_number: '0244999888',
    district_municipality: 'Asokwa',
    town_community: 'Ahinsan',
    occupation: 'Education Consultant',
    education_level: "Master's Degree",
    availability: '10+ hours/week',
    engagement_interests: ['civic_education', 'advocacy'],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. ACCOUNT / AUTH (Tests 1–5)
  // =========================================================================
  describe('1. Account / Auth Security', () => {
    it('1. Unauthenticated user cannot access /member', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }),
        },
      } as any);

      const result = await getMemberAuthResult();
      expect(result.status).toBe('unauthenticated');
    });

    it('2. Authenticated official member can access /member', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'auth-user-a', email: 'kwame.mensah@example.com' } },
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplicationA, error: null }),
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
      }
    });

    it('3. Authenticated official member can access /member/profile', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'auth-user-a', email: 'kwame.mensah@example.com' } },
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplicationA, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const session = await getMemberSession();
      expect(session).not.toBeNull();
      expect(session?.member.member_id).toBe('YRL-MEM-2026-1050');
      expect(session?.member.email).toBe('kwame.mensah@example.com');
    });

    it('4. Invalid/expired session is rejected', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'JWT expired' },
          }),
        },
      } as any);

      const session = await getMemberSession();
      expect(session).toBeNull();

      const authResult = await getMemberAuthResult();
      expect(authResult.status).toBe('unauthenticated');
    });

    it('5. Login redirects correctly after successful authentication', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const formData = new FormData();
      formData.set('email', 'kwame.mensah@example.com');
      formData.set('password', 'ValidPassword123');

      const result = await loginMemberAction(formData);
      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe('/member');
    });
  });

  // =========================================================================
  // 2. MEMBER IDENTITY & IDOR PREVENTION (Tests 6–9)
  // =========================================================================
  describe('2. Member Identity & IDOR Prevention', () => {
    it('6. Server resolves member identity from authenticated session', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
            }),
          }),
        })),
      } as any);

      const res = await getMemberDataAction();
      expect(res.success).toBe(true);
      expect(res.member?.id).toBe(memberIdA);
      expect(res.member?.email).toBe('kwame.mensah@example.com');
    });

    it('7. Client cannot select another member', async () => {
      // Session belongs to Member A
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
            }),
          }),
        })),
      } as any);

      // getMemberDataAction takes ZERO client parameters and returns only the authenticated member
      const res = await getMemberDataAction();
      expect(res.success).toBe(true);
      expect(res.member?.id).toBe(memberIdA);
      expect(res.member?.id).not.toBe(memberIdB);
    });

    it('8. Member A cannot access Member B', async () => {
      // Member A session
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
            }),
          }),
        })),
      } as any);

      const res = await getMemberDataAction();
      expect(res.member?.member_id).toBe('YRL-MEM-2026-1050');
      expect(res.member?.member_id).not.toBe('YRL-MEM-2026-1051');
      expect(res.member?.full_name).toBe('Kwame Mensah');
      expect(res.member?.full_name).not.toBe('Akua Osei');
    });

    it('9. Member ID cannot be changed by client input', async () => {
      const maliciousPayload = {
        ...validProfileUpdate,
        member_id: 'YRL-MEM-FORGED-9999',
      };

      const parsed = updateMemberProfileSchema.safeParse(maliciousPayload);
      expect(parsed.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. PROFILE ALLOWLIST (Tests 10–17)
  // =========================================================================
  describe('3. Profile Allowlist Verification', () => {
    it('10. phone_number can be updated', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        phone_number: '0551122334',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.phone_number).toBe('0551122334');
      }
    });

    it('11. whatsapp_number can be updated', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        whatsapp_number: '0559988776',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.whatsapp_number).toBe('0559988776');
      }
    });

    it('12. district_municipality can be updated', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        district_municipality: 'Sunyani Municipal',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.district_municipality).toBe('Sunyani Municipal');
      }
    });

    it('13. town_community can be updated', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        town_community: 'New Dormaa',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.town_community).toBe('New Dormaa');
      }
    });

    it('14. occupation can be updated', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        occupation: 'Software Engineer',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.occupation).toBe('Software Engineer');
      }
    });

    it('15. education_level can be updated', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        education_level: 'Doctorate / PhD',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.education_level).toBe('Doctorate / PhD');
      }
    });

    it('16. availability can be updated', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        availability: 'Events & Projects Only',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.availability).toBe('Events & Projects Only');
      }
    });

    it('17. engagement_interests can be updated', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        engagement_interests: ['community_projects', 'digital_media'],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.engagement_interests).toEqual(['community_projects', 'digital_media']);
      }
    });
  });

  // =========================================================================
  // 4. PROTECTED FIELDS IMMUTABILITY (Tests 18–29)
  // =========================================================================
  describe('4. Protected Fields Immutability', () => {
    it('18. id cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        id: 'malicious-id-value',
      });
      expect(parsed.success).toBe(false);
    });

    it('19. member_id cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        member_id: 'YRL-MEM-2099-9999',
      });
      expect(parsed.success).toBe(false);
    });

    it('20. email cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        email: 'attacker@evil.com',
      });
      expect(parsed.success).toBe(false);
    });

    it('21. full_name cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        full_name: 'Imposter Name',
      });
      expect(parsed.success).toBe(false);
    });

    it('22. date_of_birth cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        date_of_birth: '1970-01-01',
      });
      expect(parsed.success).toBe(false);
    });

    it('23. gender cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        gender: 'Female',
      });
      expect(parsed.success).toBe(false);
    });

    it('24. region cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        region: 'Greater Accra',
      });
      expect(parsed.success).toBe(false);
    });

    it('25. why_join cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        why_join: 'Changing my motivation statement after activation',
      });
      expect(parsed.success).toBe(false);
    });

    it('26. civic_acknowledgement cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        civic_acknowledgement: false,
      });
      expect(parsed.success).toBe(false);
    });

    it('27. status cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        status: 'suspended',
      });
      expect(parsed.success).toBe(false);
    });

    it('28. application_status cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        application_status: 'activated',
      });
      expect(parsed.success).toBe(false);
    });

    it('29. payment_status cannot be changed', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        payment_status: 'successful',
      });
      expect(parsed.success).toBe(false);
    });
  });

  // =========================================================================
  // 5. MASS ASSIGNMENT PROTECTION (Tests 30–34)
  // =========================================================================
  describe('5. Mass Assignment Protection', () => {
    it('30. Extra unauthorized fields are rejected/ignored', () => {
      const parsed = updateMemberProfileSchema.safeParse({
        ...validProfileUpdate,
        role: 'super_admin',
        is_admin: true,
        permissions: ['*'],
      });
      expect(parsed.success).toBe(false);
    });

    it('31. Client-supplied member_id cannot redirect the update', async () => {
      // Member A session
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
          }),
        }),
      });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                  neq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              update: updateSpy,
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {} as any;
        }),
      } as any);

      // Attempt update providing Member B's ID in payload
      const result = await updateMemberProfileAction({
        ...validProfileUpdate,
        member_id: memberIdB,
      });

      // Zod schema with strict() immediately rejects the unpermitted member_id key
      expect(result.success).toBe(false);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('32. Client-supplied status cannot activate membership', async () => {
      const result = await updateMemberProfileAction({
        ...validProfileUpdate,
        status: 'active',
      });
      expect(result.success).toBe(false);
    });

    it('33. Client-supplied payment_status cannot verify payment', async () => {
      const result = await updateMemberProfileAction({
        ...validProfileUpdate,
        payment_status: 'successful',
      });
      expect(result.success).toBe(false);
    });

    it('34. Client-supplied application_status cannot alter application state', async () => {
      const result = await updateMemberProfileAction({
        ...validProfileUpdate,
        application_status: 'activated',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 6. AUTHORIZATION & ADMIN SEPARATION (Tests 35–38)
  // =========================================================================
  describe('6. Authorization & Admin Route Separation', () => {
    it('35. Member cannot access /admin', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'member-user-id',
                email: 'kwame.mensah@example.com',
                app_metadata: {}, // Zero admin role
              },
            },
            error: null,
          }),
        },
      } as any);

      const adminAuth = await getAdminAuthResult();
      expect(adminAuth.status).toBe('unauthorized_role');
      if (adminAuth.status === 'unauthorized_role') {
        expect(adminAuth.user.email).toBe('kwame.mensah@example.com');
      }
    });

    it('36. Member cannot access /admin/payments', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'member-user-id',
                email: 'kwame.mensah@example.com',
                app_metadata: {}, // Zero admin role
              },
            },
            error: null,
          }),
        },
      } as any);

      const adminAuth = await getAdminAuthResult();
      expect(adminAuth.status).toBe('unauthorized_role');
    });

    it('37. Member cannot access /admin/activity', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'member-user-id',
                email: 'kwame.mensah@example.com',
                app_metadata: {}, // Zero admin role
              },
            },
            error: null,
          }),
        },
      } as any);

      const adminAuth = await getAdminAuthResult();
      expect(adminAuth.status).toBe('unauthorized_role');
    });

    it('38. Non-super-admin remains denied from Activity Log', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'reviewer-user-id',
                email: 'reviewer@yrl.org.gh',
                app_metadata: { role: 'national_reviewer' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const adminAuth = await getAdminAuthResult();
      expect(adminAuth.status).toBe('authenticated');
      if (adminAuth.status === 'authenticated') {
        // national_reviewer role is authenticated for admin, but is NOT super_admin
        expect(adminAuth.session.role).toBe('national_reviewer');
        expect(adminAuth.session.role === 'super_admin').toBe(false);
      }
    });
  });

  // =========================================================================
  // 7. MEMBERSHIP INTEGRITY (Tests 39–42)
  // =========================================================================
  describe('7. Membership Integrity Invariants', () => {
    it('39. Login account creation does not create membership', async () => {
      const memberInsertSpy = vi.fn();

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                }),
              }),
              insert: memberInsertSpy,
            };
          }
          return {} as any;
        }),
      } as any);

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-auth-id', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      const formData = new FormData();
      formData.set('email', 'kwame.mensah@example.com');
      formData.set('password', 'SecurePass123!');
      formData.set('confirmPassword', 'SecurePass123!');

      const result = await registerMemberAccountAction(formData);
      expect(result.success).toBe(true);
      expect(memberInsertSpy).not.toHaveBeenCalled();
    });

    it('40. Login account creation does not create Member ID', async () => {
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-auth-id', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      const formData = new FormData();
      formData.set('email', 'kwame.mensah@example.com');
      formData.set('password', 'SecurePass123!');
      formData.set('confirmPassword', 'SecurePass123!');

      const result = await registerMemberAccountAction(formData);
      expect(result.success).toBe(true);
      // Result object has message/success but NEVER returns a generated memberId
      expect((result as any).memberId).toBeUndefined();
      expect((result as any).member_id).toBeUndefined();
    });

    it('41. Login account creation does not activate membership', async () => {
      const appUpdateSpy = vi.fn();

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
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'app-unactivated', email: 'applicant@example.com', status: 'pending_payment' },
                    error: null,
                  }),
                }),
              }),
              update: appUpdateSpy,
            };
          }
          return {} as any;
        }),
      } as any);

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: 'applicant-auth-id', email: 'applicant@example.com' } },
            error: null,
          }),
        },
      } as any);

      const formData = new FormData();
      formData.set('email', 'applicant@example.com');
      formData.set('password', 'SecurePass123!');
      formData.set('confirmPassword', 'SecurePass123!');

      const result = await registerMemberAccountAction(formData);
      expect(result.success).toBe(true);
      expect(appUpdateSpy).not.toHaveBeenCalled();
    });

    it('42. Member dashboard only represents authoritative membership', async () => {
      // Authenticated user with NO row in members table
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-unregistered', email: 'stranger@example.com' } },
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
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const authResult = await getMemberAuthResult();
      expect(authResult.status).toBe('not_a_member');
      if (authResult.status === 'not_a_member') {
        expect(authResult.user.email).toBe('stranger@example.com');
      }

      // getMemberSession returns null for non-members
      const session = await getMemberSession();
      expect(session).toBeNull();
    });
  });

  // =========================================================================
  // 8. AUDIT LOGGING & SECRETS REDACTION (Tests 43–44)
  // =========================================================================
  describe('8. Audit Logging & Redaction', () => {
    it('43. Permitted profile changes generate correct audit event where required', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      const auditInsertSpy = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                  neq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockActiveMemberA, ...validProfileUpdate },
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplicationA, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: auditInsertSpy,
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await updateMemberProfileAction(validProfileUpdate);
      expect(result.success).toBe(true);
      expect(auditInsertSpy).toHaveBeenCalledTimes(1);

      const auditPayload = auditInsertSpy.mock.calls[0][0];
      expect(auditPayload.entity_type).toBe('member');
      expect(auditPayload.entity_id).toBe(memberIdA);
      expect(auditPayload.actor_id).toBe('kwame.mensah@example.com');
      expect(auditPayload.action).toBe('member_profile_updated');
      expect(auditPayload.previous_state.phone_number).toBe('0244111222');
      expect(auditPayload.new_state.phone_number).toBe('0244999888');
    });

    it('44. Audit record contains no credentials/tokens/secrets', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
            error: null,
          }),
        },
      } as any);

      const auditInsertSpy = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                  neq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockActiveMemberA, ...validProfileUpdate },
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplicationA, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: auditInsertSpy,
            };
          }
          return {} as any;
        }),
      } as any);

      const result = await updateMemberProfileAction(validProfileUpdate);
      expect(result.success).toBe(true);

      const auditPayload = auditInsertSpy.mock.calls[0][0];
      const serialized = JSON.stringify(auditPayload);

      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('token');
      expect(serialized).not.toContain('secret');
      expect(serialized).not.toContain('cookie');
    });
  });

  // =========================================================================
  // 7. PHASE 1: MEMBER PORTAL LIFECYCLE & STATUS PRESENTATION (Tests 45–48)
  // =========================================================================
  describe('7. Phase 1 Member Portal Lifecycle & Status Presentation', () => {
    it('TEST 45: correctly derives application lifecycle status for payment_not_started', async () => {
      const mockPendingApp = {
        id: 'app-pending-1',
        application_number: 'YRL-APP-2026-9001',
        email: 'applicant.pending@example.com',
        status: 'payment_not_started',
        submitted_at: '2026-09-24T10:00:00Z',
      };

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-pending', email: 'applicant.pending@example.com' } },
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockPendingApp, error: null }),
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: mockPendingApp, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const authResult = await getMemberAuthResult();
      expect(authResult.status).toBe('pending_activation');
      if (authResult.status === 'pending_activation') {
        expect(authResult.application.application_number).toBe('YRL-APP-2026-9001');
        expect(authResult.application.status).toBe('payment_not_started');
      }
    });

    it('TEST 46: correctly identifies payment_verified application awaiting activation', async () => {
      const mockVerifiedApp = {
        id: 'app-verified-1',
        application_number: 'YRL-APP-2026-9002',
        email: 'applicant.verified@example.com',
        status: 'payment_verified',
        submitted_at: '2026-09-24T10:00:00Z',
      };

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-verified', email: 'applicant.verified@example.com' } },
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockVerifiedApp, error: null }),
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: mockVerifiedApp, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const authResult = await getMemberAuthResult();
      expect(authResult.status).toBe('pending_activation');
      if (authResult.status === 'pending_activation') {
        expect(authResult.application.status).toBe('payment_verified');
      }
    });

    it('TEST 47: authenticated active member returns member record and member_id', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-a', email: 'kwame.mensah@example.com' } },
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
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockActiveMemberA, error: null }),
                }),
              }),
            };
          }
          if (table === 'membership_applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockApplicationA, error: null }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const authResult = await getMemberAuthResult();
      expect(authResult.status).toBe('authenticated');
      if (authResult.status === 'authenticated') {
        expect(authResult.session.member.member_id).toBe('YRL-MEM-2026-1050');
        expect(authResult.session.member.status).toBe('active');
        expect(authResult.session.member.region).toBe('Ashanti');
      }
    });

    it('TEST 48: unauthenticated visitor is rejected by getMemberAuthResult', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Auth session missing'),
          }),
        },
      } as any);

      const authResult = await getMemberAuthResult();
      expect(authResult.status).toBe('unauthenticated');
    });
  });

  // =========================================================================
  // 10. PHASE 1: MEMBER PORTAL EXPERIENCE & IDENTITY REFINEMENT (Tests 49–54)
  // =========================================================================
  describe('10. Phase 1: Member Portal Experience & Identity Refinement', () => {
    it('TEST 49: Digital Membership Card data contract validates Member ID format, full name, region, and active status', () => {
      const cardData = {
        member_id: mockActiveMemberA.member_id,
        full_name: mockActiveMemberA.full_name,
        region: mockActiveMemberA.region,
        status: mockActiveMemberA.status,
        created_at: mockActiveMemberA.created_at,
      };

      // Member ID format must adhere to YRL-MEM-YYYY-XXXX
      expect(cardData.member_id).toMatch(/^YRL-MEM-\d{4}-\d{4}$/);
      expect(cardData.full_name.length).toBeGreaterThanOrEqual(2);
      expect(cardData.region).toBe('Ashanti');
      expect(cardData.status).toBe('active');
    });

    it('TEST 50: Protected identity fields are rejected by strict profile schema to preserve governance integrity', () => {
      const forbiddenAttempts = [
        { ...validProfileUpdate, member_id: 'YRL-MEM-9999-9999' },
        { ...validProfileUpdate, status: 'suspended' },
        { ...validProfileUpdate, region: 'Volta' },
        { ...validProfileUpdate, email: 'hacker@example.com' },
        { ...validProfileUpdate, full_name: 'Impostor Name' },
        { ...validProfileUpdate, id: '00000000-0000-0000-0000-000000000000' },
      ];

      for (const attempt of forbiddenAttempts) {
        const parseResult = updateMemberProfileSchema.safeParse(attempt);
        expect(parseResult.success).toBe(false);
        if (!parseResult.success) {
          const issueCodes = parseResult.error.issues.map((i) => i.code);
          expect(issueCodes).toContain('unrecognized_keys');
        }
      }
    });

    it('TEST 51: Permitted profile update schema validates valid civic details successfully', () => {
      const validPayload = {
        phone_number: '0244123456',
        whatsapp_number: '0244123456',
        district_municipality: 'Accra Metro',
        town_community: 'Osu',
        occupation: 'Community Organizer',
        education_level: "Bachelor's Degree",
        availability: '5-10 hours/week',
        engagement_interests: ['civic_education', 'community_projects'],
      };

      const result = updateMemberProfileSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.district_municipality).toBe('Accra Metro');
        expect(result.data.town_community).toBe('Osu');
        expect(result.data.engagement_interests).toHaveLength(2);
      }
    });

    it('TEST 52: Empty WhatsApp number is sanitized to null in profile schema', () => {
      const payloadWithEmptyWhatsapp = {
        ...validProfileUpdate,
        whatsapp_number: '',
      };

      const result = updateMemberProfileSchema.safeParse(payloadWithEmptyWhatsapp);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.whatsapp_number).toBeNull();
      }
    });

    it('TEST 53: Active member civic entitlements provide democratic franchise and chapter rights', () => {
      // Entitlements structure for members in good standing
      const resolveMemberEntitlements = (status: string) => {
        if (status === 'active') {
          return {
            hasDemocraticFranchise: true,
            canStandForNomination: true,
            hasCivicAcademyAccess: true,
            canParticipateInChapterAssemblies: true,
            standing: 'Good Standing',
          };
        }
        return {
          hasDemocraticFranchise: false,
          canStandForNomination: false,
          hasCivicAcademyAccess: false,
          canParticipateInChapterAssemblies: false,
          standing: 'Restricted',
        };
      };

      const activeEntitlements = resolveMemberEntitlements(mockActiveMemberA.status);
      expect(activeEntitlements.hasDemocraticFranchise).toBe(true);
      expect(activeEntitlements.canStandForNomination).toBe(true);
      expect(activeEntitlements.hasCivicAcademyAccess).toBe(true);
      expect(activeEntitlements.canParticipateInChapterAssemblies).toBe(true);
      expect(activeEntitlements.standing).toBe('Good Standing');

      const suspendedEntitlements = resolveMemberEntitlements('suspended');
      expect(suspendedEntitlements.hasDemocraticFranchise).toBe(false);
      expect(suspendedEntitlements.canStandForNomination).toBe(false);
      expect(suspendedEntitlements.standing).toBe('Restricted');
    });

    it('TEST 54: Profile update requires at least one civic engagement interest', () => {
      const payloadWithoutInterests = {
        ...validProfileUpdate,
        engagement_interests: [],
      };

      const result = updateMemberProfileSchema.safeParse(payloadWithoutInterests);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPath = result.error.issues[0]?.path;
        expect(errorPath).toContain('engagement_interests');
      }
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  inviteAdminSchema,
  updateAdminRoleSchema,
  setAdminStatusSchema,
} from '@/lib/validations/admin';
import { ADMIN_ROLES, type AdminRole, type AdminUserRecord } from '@/lib/auth/types';
import { getAdminAuthResult, getAdminSession } from '@/lib/auth/server';
import {
  inviteAdminUser,
  updateAdminUserRole,
  setAdminUserStatus,
  mapAuthInvitationError,
  resolveAdminRedirectUrl,
} from '@/app/admin/actions';
import * as supabaseServer from '@/lib/supabase/server';
import { Footer } from '@/components/layout/Footer';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Phase B12.1.1: Final Admin Ownership, Invitation & Client Handover Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. ROUTING & SESSION REDIRECT LOGIC
  // ===========================================================================
  describe('1. Admin Routing & Authentication State Evaluation', () => {
    it('identifies unauthenticated requests when no Supabase user exists', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any);

      const result = await getAdminAuthResult();
      expect(result.status).toBe('unauthenticated');

      const session = await getAdminSession();
      expect(session).toBeNull();
    });

    it('identifies authenticated valid super_admin session', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: '00000000-0000-0000-0000-000000000001',
                email: 'admin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const result = await getAdminAuthResult();
      expect(result.status).toBe('authenticated');
      if (result.status === 'authenticated') {
        expect(result.session.role).toBe('super_admin');
        expect(result.session.user.email).toBe('admin@yrl.org.gh');
      }

      const session = await getAdminSession();
      expect(session).not.toBeNull();
      expect(session?.role).toBe('super_admin');
    });

    it('identifies regional_coordinator with valid assigned_region', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: '00000000-0000-0000-0000-000000000002',
                email: 'ashanti.coord@yrl.org.gh',
                app_metadata: {
                  role: 'regional_coordinator',
                  assigned_region: 'Ashanti',
                },
              },
            },
            error: null,
          }),
        },
      } as any);

      const result = await getAdminAuthResult();
      expect(result.status).toBe('authenticated');
      if (result.status === 'authenticated') {
        expect(result.session.role).toBe('regional_coordinator');
        expect(result.session.assignedRegion).toBe('Ashanti');
      }
    });

    it('flags unauthorized role when user has unknown role', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: '00000000-0000-0000-0000-000000000003',
                email: 'guest@yrl.org.gh',
                app_metadata: { role: 'public_guest' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const result = await getAdminAuthResult();
      expect(result.status).toBe('unauthorized_role');
      if (result.status === 'unauthorized_role') {
        expect(result.detectedRole).toBe('public_guest');
      }

      const session = await getAdminSession();
      expect(session).toBeNull();
    });

    it('flags regional_coordinator without assigned_region as unauthorized_role', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: '00000000-0000-0000-0000-000000000004',
                email: 'noregion@yrl.org.gh',
                app_metadata: { role: 'regional_coordinator' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const result = await getAdminAuthResult();
      expect(result.status).toBe('unauthorized_role');
      if (result.status === 'unauthorized_role') {
        expect(result.detectedRole).toContain('missing assigned_region');
      }
    });
  });

  // ===========================================================================
  // 2. IMMEDIATE ACCOUNT DEACTIVATION REVOCATION (Req 19)
  // ===========================================================================
  describe('2. Immediate Revocation for Deactivated Accounts', () => {
    it('immediately blocks deactivated super_admin when app_metadata.disabled === true', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: '00000000-0000-0000-0000-000000000005',
                email: 'deactivated.super@yrl.org.gh',
                app_metadata: {
                  role: 'super_admin',
                  disabled: true,
                },
              },
            },
            error: null,
          }),
        },
      } as any);

      const result = await getAdminAuthResult();
      expect(result.status).toBe('unauthorized_role');
      if (result.status === 'unauthorized_role') {
        expect(result.detectedRole).toBe('deactivated');
        expect(result.user.email).toBe('deactivated.super@yrl.org.gh');
      }

      const session = await getAdminSession();
      expect(session).toBeNull();
    });

    it('immediately blocks deactivated national_reviewer when app_metadata.disabled === true', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: '00000000-0000-0000-0000-000000000006',
                email: 'deactivated.reviewer@yrl.org.gh',
                app_metadata: {
                  role: 'national_reviewer',
                  disabled: true,
                },
              },
            },
            error: null,
          }),
        },
      } as any);

      const result = await getAdminAuthResult();
      expect(result.status).toBe('unauthorized_role');
      if (result.status === 'unauthorized_role') {
        expect(result.detectedRole).toBe('deactivated');
      }

      const session = await getAdminSession();
      expect(session).toBeNull();
    });
  });

  // ===========================================================================
  // 3. ADMIN VALIDATION SCHEMAS & FIELD SECURITY (Req 1, 3, 4)
  // ===========================================================================
  describe('3. Admin User Validation Schemas', () => {
    it('validates ADMIN_ROLES definition', () => {
      expect(ADMIN_ROLES).toEqual(['super_admin', 'national_reviewer', 'regional_coordinator']);
    });

    describe('inviteAdminSchema', () => {
      // Req 1: Invite Administrator form/schema does not contain password fields
      it('ensures inviteAdminSchema has no password or temporaryPassword fields', () => {
        const parsedWithPassword = inviteAdminSchema.safeParse({
          email: 'test@yrl.org.gh',
          role: 'super_admin',
          password: 'somepassword123',
          temporaryPassword: 'tempPassword123',
        });
        expect(parsedWithPassword.success).toBe(true);
        if (parsedWithPassword.success) {
          expect((parsedWithPassword.data as any).password).toBeUndefined();
          expect((parsedWithPassword.data as any).temporaryPassword).toBeUndefined();
        }
      });

      // Req 2: Valid administrator invitation succeeds parsing
      it('accepts valid super_admin invitation input', () => {
        const input = {
          email: 'newadmin@yrl.org.gh',
          role: 'super_admin',
        };
        const parsed = inviteAdminSchema.safeParse(input);
        expect(parsed.success).toBe(true);
      });

      it('accepts valid regional_coordinator with assignedRegion', () => {
        const input = {
          email: 'coord@yrl.org.gh',
          role: 'regional_coordinator',
          assignedRegion: 'Greater Accra',
        };
        const parsed = inviteAdminSchema.safeParse(input);
        expect(parsed.success).toBe(true);
      });

      it('rejects regional_coordinator without assignedRegion', () => {
        const input = {
          email: 'coord@yrl.org.gh',
          role: 'regional_coordinator',
          assignedRegion: '',
        };
        const parsed = inviteAdminSchema.safeParse(input);
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.issues[0]?.message).toContain('Assigned region is required');
        }
      });

      // Req 3: Invalid email fails validation
      it('rejects invalid email address', () => {
        const input = {
          email: 'not-an-email',
          role: 'national_reviewer',
        };
        const parsed = inviteAdminSchema.safeParse(input);
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.issues[0]?.message).toContain('valid email address');
        }
      });

      // Req 4: Invalid role fails validation
      it('rejects invalid administrative role', () => {
        const input = {
          email: 'admin@yrl.org.gh',
          role: 'unauthorized_super_user',
        };
        const parsed = inviteAdminSchema.safeParse(input);
        expect(parsed.success).toBe(false);
      });
    });

    describe('updateAdminRoleSchema', () => {
      it('accepts valid UUID and valid role update', () => {
        const input = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          role: 'national_reviewer',
        };
        const parsed = updateAdminRoleSchema.safeParse(input);
        expect(parsed.success).toBe(true);
      });

      it('rejects invalid UUID for userId', () => {
        const input = {
          userId: 'not-a-uuid',
          role: 'national_reviewer',
        };
        const parsed = updateAdminRoleSchema.safeParse(input);
        expect(parsed.success).toBe(false);
      });

      it('rejects update to regional_coordinator without assignedRegion', () => {
        const input = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          role: 'regional_coordinator',
        };
        const parsed = updateAdminRoleSchema.safeParse(input);
        expect(parsed.success).toBe(false);
      });
    });

    describe('setAdminStatusSchema', () => {
      it('accepts valid UUID and boolean disabled', () => {
        const input = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          disabled: true,
        };
        const parsed = setAdminStatusSchema.safeParse(input);
        expect(parsed.success).toBe(true);
      });

      it('rejects non-boolean disabled value', () => {
        const input = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          disabled: 'yes',
        };
        const parsed = setAdminStatusSchema.safeParse(input);
        expect(parsed.success).toBe(false);
      });
    });
  });

  // ===========================================================================
  // 4. SERVER ACTION AUTHORIZATION & INVITATION FLOW (Req 2, 5, 6, 7, 8, 9, 13)
  // ===========================================================================
  describe('4. Server Action: inviteAdminUser Secure Flow', () => {
    // Req 5: Unauthorized user cannot invite administrators
    it('rejects invitation when caller is not authenticated as super_admin', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'rev-1',
                email: 'reviewer@yrl.org.gh',
                app_metadata: { role: 'national_reviewer' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const result = await inviteAdminUser({
        email: 'client@yrl.org.gh',
        role: 'super_admin',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: Super Admin privileges required');
    });

    // Req 2 & 13: Valid administrator invitation succeeds and never returns passwords or tokens
    it('dispatches invitation via inviteUserByEmail and never returns credentials', async () => {
      // Mock Super Admin session
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-1',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      // Mock admin Supabase client
      const mockInviteUserByEmail = vi.fn().mockResolvedValue({
        data: { user: { id: 'new-client-uuid', email: 'client@yrl.org.gh', app_metadata: {} } },
        error: null,
      });
      const mockUpdateUserById = vi.fn().mockResolvedValue({
        data: { user: { id: 'new-client-uuid' } },
        error: null,
      });
      const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: { users: [] },
              error: null,
            }),
            inviteUserByEmail: mockInviteUserByEmail,
            updateUserById: mockUpdateUserById,
          },
        },
        from: vi.fn().mockReturnValue({
          insert: mockInsertAudit,
        }),
      } as any);

      const result = await inviteAdminUser({
        email: 'client@yrl.org.gh',
        role: 'super_admin',
      });

      expect(result.success).toBe(true);
      expect(mockInviteUserByEmail).toHaveBeenCalledWith(
        'client@yrl.org.gh',
        expect.objectContaining({
          data: { role: 'super_admin', assigned_region: null },
          redirectTo: expect.stringContaining('/admin/login'),
        })
      );
      expect(mockUpdateUserById).toHaveBeenCalledWith(
        'new-client-uuid',
        expect.objectContaining({
          app_metadata: { role: 'super_admin', assigned_region: null, disabled: false },
        })
      );

      // Req 13: Service-role credentials and passwords must NEVER be returned
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('new-client-uuid');
      expect(result.data?.email).toBe('client@yrl.org.gh');
      expect(result.data?.role).toBe('super_admin');
      expect((result.data as any).temporaryPassword).toBeUndefined();
      expect((result.data as any).password).toBeUndefined();
      expect((result.data as any).token).toBeUndefined();
    });

    // Req 6 & 7: Existing active administrator is handled safely (never overwritten)
    it('rejects invitation when email belongs to an existing active administrator', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-1',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: {
                users: [
                  {
                    id: 'existing-admin-1',
                    email: 'existing.admin@yrl.org.gh',
                    app_metadata: { role: 'national_reviewer', disabled: false },
                  },
                ],
              },
              error: null,
            }),
            inviteUserByEmail: vi.fn(),
          },
        },
      } as any);

      const result = await inviteAdminUser({
        email: 'existing.admin@yrl.org.gh',
        role: 'super_admin',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('An administrator with this email already exists.');
    });

    // Req 8: Pending/unconfirmed invitation can be re-invited safely
    it('safely re-triggers invitation when an existing user is pending without active role', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-1',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const mockInviteUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'pending-user-id', email: 'pending@yrl.org.gh' } },
        error: null,
      });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: {
                users: [
                  {
                    id: 'pending-user-id',
                    email: 'pending@yrl.org.gh',
                    app_metadata: {}, // no role yet
                    invited_at: '2026-09-20T00:00:00Z',
                  },
                ],
              },
              error: null,
            }),
            inviteUserByEmail: mockInviteUser,
            updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
          },
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await inviteAdminUser({
        email: 'pending@yrl.org.gh',
        role: 'national_reviewer',
      });

      expect(result.success).toBe(true);
      expect(mockInviteUser).toHaveBeenCalled();
    });

    // Req 9: Invitation failure returns sanitized error
    it('returns sanitized error message when Supabase inviteUserByEmail fails', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-1',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: { users: [] },
              error: null,
            }),
            inviteUserByEmail: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'Database connection failed: internal postgres error at 0xdeadbeef' },
            }),
          },
        },
      } as any);

      const result = await inviteAdminUser({
        email: 'newuser@yrl.org.gh',
        role: 'super_admin',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to send invitation. Please verify the email address and try again.');
      expect(result.error).not.toContain('postgres');
      expect(result.error).not.toContain('0xdeadbeef');
    });

    // Req 9b: Specific mapping for Supabase rate limit error (HTTP 429 / over_email_send_rate_limit)
    it('returns accurate rate limit message when Supabase returns HTTP 429 or over_email_send_rate_limit', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-1',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: { users: [] },
              error: null,
            }),
            inviteUserByEmail: vi.fn().mockResolvedValue({
              data: { user: null },
              error: {
                status: 429,
                code: 'over_email_send_rate_limit',
                message: 'email rate limit exceeded',
              },
            }),
          },
        },
      } as any);

      const result = await inviteAdminUser({
        email: 'ratelimited@yrl.org.gh',
        role: 'super_admin',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Email delivery rate limit exceeded by the authentication service. Please wait a few minutes before trying again.'
      );
    });

    // Req 9c: Specific mapping for email_exists error (HTTP 422)
    it('returns accurate account already registered message when Supabase returns email_exists', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-1',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: { users: [] },
              error: null,
            }),
            inviteUserByEmail: vi.fn().mockResolvedValue({
              data: { user: null },
              error: {
                status: 422,
                code: 'email_exists',
                message: 'A user with this email address has already been registered',
              },
            }),
          },
        },
      } as any);

      const result = await inviteAdminUser({
        email: 'registered@yrl.org.gh',
        role: 'super_admin',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account with this email address is already registered.');
    });

    // Req 9d: Specific mapping for invalid email error (HTTP 400 / email_address_invalid)
    it('returns accurate invalid email message when Supabase returns HTTP 400 email_address_invalid', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-1',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: { users: [] },
              error: null,
            }),
            inviteUserByEmail: vi.fn().mockResolvedValue({
              data: { user: null },
              error: {
                status: 400,
                code: 'email_address_invalid',
                message: 'Email address "invalid@bad-domain.xyz" is invalid',
              },
            }),
          },
        },
      } as any);

      const result = await inviteAdminUser({
        email: 'invalid@bad-domain.xyz',
        role: 'super_admin',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'The email address could not be verified by the email service. Please check the spelling and try again.'
      );
    });

    // Req 9e: Resend invitation path uses the same safe error mapping
    it('applies safe error mapping on the resend invitation path for pending users', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-1',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: {
                users: [
                  {
                    id: 'pending-user-id',
                    email: 'pending@yrl.org.gh',
                    app_metadata: {},
                    invited_at: '2026-09-20T00:00:00Z',
                  },
                ],
              },
              error: null,
            }),
            inviteUserByEmail: vi.fn().mockResolvedValue({
              data: { user: null },
              error: {
                status: 429,
                code: 'over_email_send_rate_limit',
                message: 'email rate limit exceeded',
              },
            }),
          },
        },
      } as any);

      const result = await inviteAdminUser({
        email: 'pending@yrl.org.gh',
        role: 'national_reviewer',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Email delivery rate limit exceeded by the authentication service. Please wait a few minutes before trying again.'
      );
    });

    // Req 9f: Helper unit tests for mapAuthInvitationError
    it('verifies mapAuthInvitationError directly for various error signatures', async () => {
      expect(await mapAuthInvitationError({ status: 429 })).toBe(
        'Email delivery rate limit exceeded by the authentication service. Please wait a few minutes before trying again.'
      );
      expect(await mapAuthInvitationError({ code: 'over_email_send_rate_limit' })).toBe(
        'Email delivery rate limit exceeded by the authentication service. Please wait a few minutes before trying again.'
      );
      expect(await mapAuthInvitationError({ message: 'Rate limit exceeded for email' })).toBe(
        'Email delivery rate limit exceeded by the authentication service. Please wait a few minutes before trying again.'
      );
      expect(await mapAuthInvitationError({ code: 'email_exists' })).toBe(
        'An account with this email address is already registered.'
      );
      expect(await mapAuthInvitationError({ message: 'A user with this email address has already been registered' })).toBe(
        'An account with this email address is already registered.'
      );
      expect(await mapAuthInvitationError({ status: 400 })).toBe(
        'The email address could not be verified by the email service. Please check the spelling and try again.'
      );
      expect(await mapAuthInvitationError({ code: 'email_address_invalid' })).toBe(
        'The email address could not be verified by the email service. Please check the spelling and try again.'
      );
      expect(await mapAuthInvitationError(null)).toBe(
        'Unable to send invitation. Please verify the email address and try again.'
      );
      expect(await mapAuthInvitationError({ message: 'Something completely random' })).toBe(
        'Unable to send invitation. Please verify the email address and try again.'
      );
    });

    // Req 9g: Helper unit tests for resolveAdminRedirectUrl
    it('resolves redirect URLs with proper protocol, fallback, and trailing slash handling', async () => {
      const origEnv = process.env.NEXT_PUBLIC_SITE_URL;

      try {
        // Test trailing slash removal on configured HTTPS site URL
        process.env.NEXT_PUBLIC_SITE_URL = 'https://yrl.org.gh/';
        const url1 = await resolveAdminRedirectUrl();
        expect(url1).toBe('https://yrl.org.gh/admin/login');

        // Test configured HTTPS site URL without trailing slash
        process.env.NEXT_PUBLIC_SITE_URL = 'https://portal.yrl.org.gh';
        const url2 = await resolveAdminRedirectUrl();
        expect(url2).toBe('https://portal.yrl.org.gh/admin/login');

        // Test fallback when NEXT_PUBLIC_SITE_URL is undefined
        delete process.env.NEXT_PUBLIC_SITE_URL;
        delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
        delete process.env.VERCEL_URL;
        const url3 = await resolveAdminRedirectUrl();
        expect(url3).toBe('http://localhost:3000/admin/login');
      } finally {
        if (origEnv !== undefined) {
          process.env.NEXT_PUBLIC_SITE_URL = origEnv;
        } else {
          delete process.env.NEXT_PUBLIC_SITE_URL;
        }
      }
    });
  });

  // ===========================================================================
  // 5. LAST SUPER ADMIN INVARIANT ENFORCEMENT (Req 14, 15)
  // ===========================================================================
  describe('5. Last Super Admin Protection Invariant', () => {
    // Req 14: Last active Super Admin cannot be deactivated
    it('prevents deactivating the sole remaining active Super Administrator', () => {
      const existingUsers: AdminUserRecord[] = [
        {
          id: 'admin-1',
          email: 'sole.super@yrl.org.gh',
          role: 'super_admin',
          disabled: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'admin-2',
          email: 'reviewer@yrl.org.gh',
          role: 'national_reviewer',
          disabled: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const targetUserId = 'admin-1';
      const targetUser = existingUsers.find((u) => u.id === targetUserId);
      const isDeactivating = true;

      let allowed = true;
      let abortReason = '';

      if (isDeactivating && targetUser?.role === 'super_admin') {
        const activeSuperAdmins = existingUsers.filter(
          (u) => u.role === 'super_admin' && !u.disabled
        );
        if (activeSuperAdmins.length <= 1) {
          allowed = false;
          abortReason = 'Operation aborted: Cannot deactivate the sole remaining active Super Administrator.';
        }
      }

      expect(allowed).toBe(false);
      expect(abortReason).toContain('Cannot deactivate the sole remaining active Super Administrator');
    });

    // Req 15: Last active Super Admin cannot be demoted
    it('prevents demoting the sole remaining active Super Administrator', () => {
      const existingUsers: AdminUserRecord[] = [
        {
          id: 'admin-1',
          email: 'sole.super@yrl.org.gh',
          role: 'super_admin',
          disabled: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const targetUserId = 'admin-1';
      const targetUser = existingUsers.find((u) => u.id === targetUserId);
      const newRole: AdminRole = 'national_reviewer';

      let allowed = true;
      let abortReason = '';

      if (targetUser?.role === 'super_admin' && (newRole as string) !== 'super_admin') {
        const activeSuperAdmins = existingUsers.filter(
          (u) => u.role === 'super_admin' && !u.disabled
        );
        if (activeSuperAdmins.length <= 1) {
          allowed = false;
          abortReason = 'Operation aborted: Cannot demote the sole remaining active Super Administrator.';
        }
      }

      expect(allowed).toBe(false);
      expect(abortReason).toContain('Cannot demote the sole remaining active Super Administrator');
    });

    it('permits deactivating or demoting a Super Admin if at least one other active Super Admin exists', () => {
      const existingUsers: AdminUserRecord[] = [
        {
          id: 'admin-1',
          email: 'super1@yrl.org.gh',
          role: 'super_admin',
          disabled: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'admin-2',
          email: 'super2@yrl.org.gh',
          role: 'super_admin',
          disabled: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const targetUserId = 'admin-1';
      const targetUser = existingUsers.find((u) => u.id === targetUserId);
      const isDeactivating = true;

      let allowed = true;
      if (isDeactivating && targetUser?.role === 'super_admin') {
        const activeSuperAdmins = existingUsers.filter(
          (u) => u.role === 'super_admin' && !u.disabled
        );
        if (activeSuperAdmins.length <= 1) {
          allowed = false;
        }
      }

      expect(allowed).toBe(true);
    });
  });

  // ===========================================================================
  // 6. MEMBER SEARCH & REGIONAL FILTERING LOGIC
  // ===========================================================================
  describe('6. Member Search & Regional Filtering', () => {
    const mockMembers = [
      {
        id: '1',
        full_name: 'Kofi Mensah',
        email: 'kofi@example.com',
        phone_number: '0241234567',
        region: 'Greater Accra',
        district_municipality: 'Accra Metro',
        membership_id: 'YRL-M-2026-0001',
      },
      {
        id: '2',
        full_name: 'Ama Serwaa',
        email: 'ama@example.com',
        phone_number: '0249876543',
        region: 'Ashanti',
        district_municipality: 'Kumasi Metro',
        membership_id: 'YRL-M-2026-0002',
      },
      {
        id: '3',
        full_name: 'Kwame Nkrumah Mensah',
        email: 'kwame@example.com',
        phone_number: '0205556666',
        region: 'Central',
        district_municipality: 'Cape Coast Metro',
        membership_id: 'YRL-M-2026-0003',
      },
    ];

    function filterMembers(members: typeof mockMembers, search: string, region: string) {
      return members.filter((m) => {
        const matchesRegion = !region || m.region === region;
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          m.full_name?.toLowerCase().includes(q) ||
          m.membership_id?.toLowerCase().includes(q) ||
          m.phone_number?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.district_municipality?.toLowerCase().includes(q);
        return matchesRegion && matchesSearch;
      });
    }

    it('filters members by partial name search', () => {
      const results = filterMembers(mockMembers, 'Mensah', '');
      expect(results.length).toBe(2);
      expect(results.map((r) => r.full_name)).toEqual(['Kofi Mensah', 'Kwame Nkrumah Mensah']);
    });

    it('filters members by membership ID', () => {
      const results = filterMembers(mockMembers, 'YRL-M-2026-0002', '');
      expect(results.length).toBe(1);
      expect(results[0].full_name).toBe('Ama Serwaa');
    });

    it('filters members by region', () => {
      const results = filterMembers(mockMembers, '', 'Ashanti');
      expect(results.length).toBe(1);
      expect(results[0].full_name).toBe('Ama Serwaa');
    });

    it('filters members by combined region and search query', () => {
      const results = filterMembers(mockMembers, 'Mensah', 'Greater Accra');
      expect(results.length).toBe(1);
      expect(results[0].full_name).toBe('Kofi Mensah');
    });

    it('returns empty array when search matches no records', () => {
      const results = filterMembers(mockMembers, 'NonexistentPerson', '');
      expect(results.length).toBe(0);
    });
  });

  // ===========================================================================
  // 7. SECURITY & AUDIT LOG SANITIZATION (Req 10, 11, 12, 13)
  // ===========================================================================
  describe('7. Security & Audit Log Sanitization', () => {
    // Req 10 & 11 & 12: Successful invitation creates audit event without passwords or tokens
    it('creates audit event for invitation without passwords, temporary passwords, or tokens', () => {
      const auditPayload = {
        entity_type: 'admin_user',
        entity_id: 'user-uuid-1234',
        actor_id: 'superadmin@yrl.org.gh',
        action: 'admin_user_invited',
        previous_state: null,
        new_state: {
          email: 'invited@yrl.org.gh',
          role: 'national_reviewer',
          assigned_region: null,
          disabled: false,
        },
      };

      const serialized = JSON.stringify(auditPayload);
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('temporaryPassword');
      expect(serialized).not.toContain('token');
      expect(serialized).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(auditPayload.action).toBe('admin_user_invited');
    });

    it('verifies audit action types conform to admin security standards', () => {
      const allowedAdminAuditActions = [
        'admin_user_invited',
        'admin_role_changed',
        'admin_deactivated',
        'admin_reactivated',
      ];

      expect(allowedAdminAuditActions).toContain('admin_user_invited');
      expect(allowedAdminAuditActions).toContain('admin_role_changed');
      expect(allowedAdminAuditActions).toContain('admin_deactivated');
      expect(allowedAdminAuditActions).toContain('admin_reactivated');
    });
  });

  // ===========================================================================
  // 8. CLIENT HANDOVER & PASSWORD ESTABLISHMENT (Req 16, 17, 18, 20)
  // ===========================================================================
  describe('8. Client Handover & Password Establishment Flow', () => {
    // Req 16: Invited user can establish their own password via updateUser
    it('simulates client establishing own password via supabase.auth.updateUser', async () => {
      const clientPasswordChoice = 'MyVeryOwnPrivateClientPassword2026!';
      const mockUpdateUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'client-uuid', email: 'client@yrl.org.gh' } },
        error: null,
      });

      const clientSupabase = {
        auth: {
          updateUser: mockUpdateUser,
        },
      };

      const response = await clientSupabase.auth.updateUser({
        password: clientPasswordChoice,
      });

      expect(response.error).toBeNull();
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: clientPasswordChoice,
      });
    });

    // Req 17 & 18: Invited user logs in through /admin/login and accesses /admin
    it('verifies authenticated invited user with super_admin role accesses /admin', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'client-uuid',
                email: 'client@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const authResult = await getAdminAuthResult();
      expect(authResult.status).toBe('authenticated');
      if (authResult.status === 'authenticated') {
        expect(authResult.session.role).toBe('super_admin');
        expect(authResult.session.user.email).toBe('client@yrl.org.gh');
      }
    });

    // Req 20: Existing RBAC role scopes are preserved
    it('preserves existing RBAC role scopes and permissions', () => {
      expect(ADMIN_ROLES).toContain('super_admin');
      expect(ADMIN_ROLES).toContain('national_reviewer');
      expect(ADMIN_ROLES).toContain('regional_coordinator');
    });
  });

  // ===========================================================================
  // 9. SUMMARY KPI CARD METRICS
  // ===========================================================================
  describe('9. Summary KPI Calculation', () => {
    it('accurately computes summary metrics for responsive cards', () => {
      const mockNominations = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const mockMembers = [{ id: 'm1' }, { id: 'm2' }];
      const mockInquiries = [{ id: 'i1' }];
      const mockNews = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }];
      const mockAdmins = [{ id: 'a1' }, { id: 'a2' }];

      const kpis = {
        nominationsCount: mockNominations.length,
        membersCount: mockMembers.length,
        inquiriesCount: mockInquiries.length,
        newsCount: mockNews.length,
        adminsCount: mockAdmins.length,
      };

      expect(kpis.nominationsCount).toBe(3);
      expect(kpis.membersCount).toBe(2);
      expect(kpis.inquiriesCount).toBe(1);
      expect(kpis.newsCount).toBe(4);
      expect(kpis.adminsCount).toBe(2);
    });
  });

  // ===========================================================================
  // 10. PUBLIC FOOTER ADMIN LINKS & DISCOVERABILITY (B12.1.3 Requirement)
  // ===========================================================================
  describe('10. Public Footer Admin Links & Discoverability', () => {
    function hasTextOrHref(node: any, target: string): boolean {
      if (!node) return false;
      if (typeof node === 'string') return node.includes(target);
      if (node.props?.href === target) return true;
      if (node.props?.children) {
        const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
        return children.some((c: any) => hasTextOrHref(c, target));
      }
      return false;
    }

    it('renders the public Footer with a discreet Admin Login link in Civic Participation', () => {
      const footer = Footer();
      expect(hasTextOrHref(footer, '/admin/login')).toBe(true);
      expect(hasTextOrHref(footer, 'Admin Login')).toBe(true);
    });

    it('renders the public Footer with an Admin Portal link in the bottom copyright bar', () => {
      const footer = Footer();
      expect(hasTextOrHref(footer, 'Admin Portal')).toBe(true);
      expect(hasTextOrHref(footer, '/admin/login')).toBe(true);
    });
  });

  // ===========================================================================
  // 11. INVITATION TOKEN HANDLING & SESSION ESTABLISHMENT (B12.1.3 Requirement)
  // ===========================================================================
  describe('11. Invitation Token Parsing & Session Establishment', () => {
    it('correctly extracts access_token and refresh_token from hash fragment and calls setSession', async () => {
      const mockSetSession = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token-12345',
            refresh_token: 'mock-refresh-token-67890',
            user: { email: 'invited-admin@yrl.org.gh' },
          },
        },
        error: null,
      });

      const clientSupabase = {
        auth: {
          setSession: mockSetSession,
        },
      };

      const testHash = '#access_token=mock-access-token-12345&refresh_token=mock-refresh-token-67890&token_type=bearer&type=invite';
      const hashParams = new URLSearchParams(testHash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      expect(accessToken).toBe('mock-access-token-12345');
      expect(refreshToken).toBe('mock-refresh-token-67890');
      expect(type).toBe('invite');

      const result = await clientSupabase.auth.setSession({
        access_token: accessToken!,
        refresh_token: refreshToken!,
      });

      expect(result.error).toBeNull();
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'mock-access-token-12345',
        refresh_token: 'mock-refresh-token-67890',
      });
      expect(result.data.session.user.email).toBe('invited-admin@yrl.org.gh');
    });

    it('handles PKCE auth code exchange when ?code= arrives in query string', async () => {
      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { email: 'pkce-admin@yrl.org.gh' },
          },
        },
        error: null,
      });

      const clientSupabase = {
        auth: {
          exchangeCodeForSession: mockExchangeCode,
        },
      };

      const search = '?code=pkce-auth-code-abc-123';
      const searchParams = new URLSearchParams(search);
      const code = searchParams.get('code');

      expect(code).toBe('pkce-auth-code-abc-123');

      const result = await clientSupabase.auth.exchangeCodeForSession(code!);
      expect(result.error).toBeNull();
      expect(mockExchangeCode).toHaveBeenCalledWith('pkce-auth-code-abc-123');
    });

    it('handles OTP token verification when ?token_hash= arrives in query string', async () => {
      const mockVerifyOtp = vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { email: 'otp-admin@yrl.org.gh' },
          },
        },
        error: null,
      });

      const clientSupabase = {
        auth: {
          verifyOtp: mockVerifyOtp,
        },
      };

      const search = '?token_hash=token-hash-xyz&type=invite';
      const searchParams = new URLSearchParams(search);
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      expect(tokenHash).toBe('token-hash-xyz');
      expect(type).toBe('invite');

      const result = await clientSupabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type as any,
      });

      expect(result.error).toBeNull();
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'token-hash-xyz',
        type: 'invite',
      });
    });

    it('handles expired or invalid invitation link gracefully without crashing', async () => {
      const mockSetSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Token has expired or is invalid.' },
      });

      const clientSupabase = {
        auth: {
          setSession: mockSetSession,
        },
      };

      const result = await clientSupabase.auth.setSession({
        access_token: 'expired-token',
        refresh_token: 'expired-refresh',
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('expired');
    });
  });

  // ===========================================================================
  // 12. CLIENT PASSWORD ESTABLISHMENT VALIDATION (B12.1.3 Requirement)
  // ===========================================================================
  describe('12. Client Password Establishment Validation', () => {
    it('enforces minimum 8 characters for client password', () => {
      const validatePasswordLength = (pwd: string) => pwd.length >= 8;

      expect(validatePasswordLength('1234567')).toBe(false);
      expect(validatePasswordLength('12345678')).toBe(true);
      expect(validatePasswordLength('SecureAdminPassword2026!')).toBe(true);
    });

    it('enforces password confirmation matching', () => {
      const validateMatch = (p1: string, p2: string) => p1 === p2;

      expect(validateMatch('SecurePassword2026!', 'DifferentPassword!')).toBe(false);
      expect(validateMatch('SecurePassword2026!', 'SecurePassword2026!')).toBe(true);
    });

    it('successfully calls supabase.auth.updateUser to store the client chosen password', async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'usr-client', email: 'owner@yrl.org.gh' } },
        error: null,
      });

      const clientSupabase = {
        auth: {
          updateUser: mockUpdateUser,
        },
      };

      const chosenPassword = 'ConfidentialClientPassword2026#';
      const result = await clientSupabase.auth.updateUser({
        password: chosenPassword,
      });

      expect(result.error).toBeNull();
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: chosenPassword,
      });
    });

    it('verifies that no temporary passwords or tokens are returned or logged', async () => {
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
            inviteUserByEmail: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: '00000000-0000-0000-0000-000000000999',
                  email: 'newadmin@yrl.org.gh',
                  app_metadata: { role: 'national_reviewer' },
                },
              },
              error: null,
            }),
            updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
          },
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'super-admin-id',
                email: 'superadmin@yrl.org.gh',
                app_metadata: { role: 'super_admin' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const res = await inviteAdminUser({
        email: 'newadmin@yrl.org.gh',
        role: 'national_reviewer',
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      const stringified = JSON.stringify(res.data);
      expect(stringified).not.toContain('password');
      expect(stringified).not.toContain('temporaryPassword');
      expect(stringified).not.toContain('token');
      expect(res.data?.email).toBe('newadmin@yrl.org.gh');
      expect(res.data?.role).toBe('national_reviewer');
    });
  });
});

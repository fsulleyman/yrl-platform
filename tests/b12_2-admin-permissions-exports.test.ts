import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeCsvCell,
  buildCsvString,
  formatNominationsCsv,
  formatMembersCsv,
  formatInquiriesCsv,
  formatReviewsCsv,
} from '@/lib/export/csv';
import {
  deleteAdminUserSchema,
  exportAdminDataSchema,
} from '@/lib/validations/admin';
import { deleteAdminUser, exportAdminData } from '@/app/admin/actions';
import * as authServer from '@/lib/auth/server';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Phase B12.2: Admin Permissions, Scoping, CSV Export & Permanent Deletion Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. CSV ESCAPING & FORMULA INJECTION NEUTRALIZATION
  // ===========================================================================
  describe('1. CSV Escaping & Formula Injection Defense', () => {
    it('escapes standard strings, booleans, and null/undefined values correctly', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
      expect(escapeCsvCell('Kofi Mensah')).toBe('Kofi Mensah');
      expect(escapeCsvCell(42)).toBe('42');
      expect(escapeCsvCell(true)).toBe('true');
    });

    it('escapes cells containing commas, quotes, and newlines according to RFC 4180', () => {
      expect(escapeCsvCell('Accra, Ghana')).toBe('"Accra, Ghana"');
      expect(escapeCsvCell('Said "Hello" to all')).toBe('"Said ""Hello"" to all"');
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it('neutralizes spreadsheet formula injection vectors (=, +, -, @)', () => {
      // Formula starting with '='
      const formulaEq = escapeCsvCell('=SUM(A1:A10)');
      expect(formulaEq).toBe("\"'=SUM(A1:A10)\"");

      // Formula starting with '+'
      const formulaPlus = escapeCsvCell('+123456');
      expect(formulaPlus).toBe("\"'+123456\"");

      // Formula starting with '-'
      const formulaMinus = escapeCsvCell('-2+5');
      expect(formulaMinus).toBe("\"'-2+5\"");

      // Formula starting with '@'
      const formulaAt = escapeCsvCell('@SUM(B1:B5)');
      expect(formulaAt).toBe("\"'@SUM(B1:B5)\"");

      // Formula starting with tab '\t' or carriage return '\r'
      const formulaTab = escapeCsvCell('\tcmd');
      expect(formulaTab).toBe("\"'\tcmd\"");
    });

    it('handles Ghanaian Unicode characters and prepends UTF-8 BOM', () => {
      const headers = ['Name', 'Town'];
      const rows = [
        ['Nana Ɛsiam', 'Kyebi'],
        ['Kojo Mensah', 'Ɔsu'],
      ];

      const csv = buildCsvString(headers, rows);

      // Prepend UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Nana Ɛsiam');
      expect(csv).toContain('Ɔsu');
      expect(csv).toContain('Name,Town');
    });
  });

  // ===========================================================================
  // 2. ROLE-SCOPED CSV RECORD FORMATTING & PII REDACTION
  // ===========================================================================
  describe('2. Role-Scoped Record Transformers & PII Redaction', () => {
    const sampleNomination = {
      id: '00000000-0000-0000-0000-000000000010',
      reference_id: 'NOM-2026-0001',
      full_name: 'Kwame Nkrumah',
      position_applied: 'Chief of Staff',
      region: 'Greater Accra',
      region_if_regional_minister: null,
      district_municipality: 'Accra Metro',
      town_community: 'Ridge',
      gender: 'Male',
      date_of_birth: '1990-05-15',
      phone_number: '+233241234567',
      whatsapp_number: '+233241234567',
      email: 'kwame.nkrumah@example.com',
      occupation: 'Civil Servant',
      organisation_institution: 'Civic Trust',
      education_level: 'Master’s Degree',
      area_of_study_profession: 'Public Policy',
      has_leadership_experience: true,
      prior_position: 'Director',
      prior_organisation: 'Youth Alliance',
      prior_duration: '3 years',
      weekly_hours: '15-20 hours',
      willing_online_meetings: true,
      willing_physical_activities: true,
      declaration_agreed: true,
      status: 'submitted',
      created_at: '2026-09-20T10:00:00Z',
    };

    it('Super Admin export retains full unmasked PII', () => {
      const csv = formatNominationsCsv([sampleNomination], 'super_admin');
      expect(csv).toContain('+233241234567');
      expect(csv).toContain('1990-05-15');
      expect(csv).toContain('kwame.nkrumah@example.com');
    });

    it('Regional Coordinator and National Reviewer exports preserve PII masking', () => {
      const coordCsv = formatNominationsCsv([sampleNomination], 'regional_coordinator');
      expect(coordCsv).not.toContain('+233241234567');
      expect(coordCsv).toContain('+233****567');
      expect(coordCsv).toContain('1990-**-**');

      const reviewerCsv = formatNominationsCsv([sampleNomination], 'national_reviewer');
      expect(reviewerCsv).not.toContain('+233241234567');
      expect(reviewerCsv).toContain('+233****567');
      expect(reviewerCsv).toContain('1990-**-**');
    });

    it('formats member records into RFC 4180 CSV', () => {
      const sampleMember = {
        id: '00000000-0000-0000-0000-000000000020',
        member_id: 'MEM-2026-0001',
        full_name: 'Ama Serwaa',
        region: 'Ashanti',
        district_municipality: 'Kumasi Metro',
        town_community: 'Bantama',
        gender: 'Female',
        date_of_birth: '1995-11-20',
        phone_number: '+233201112233',
        whatsapp_number: '+233201112233',
        email: 'ama.serwaa@example.com',
        occupation: 'Pharmacist',
        education_level: 'Bachelor’s Degree',
        why_join: 'Passionate about youth healthcare and community development',
        availability: 'Weekends and evenings',
        engagement_interests: ['Health', 'Community Outreach'],
        created_at: '2026-09-21T12:00:00Z',
      };

      const csv = formatMembersCsv([sampleMember], 'super_admin');
      expect(csv).toContain('MEM-2026-0001');
      expect(csv).toContain('Ama Serwaa');
      expect(csv).toContain('Ashanti');
      expect(csv).toContain('Health; Community Outreach');
    });

    it('formats inquiries and reviews into RFC 4180 CSV', () => {
      const sampleInquiry = {
        id: 'msg-1',
        reference_id: 'MSG-2026-0001',
        full_name: 'Yaw Boateng',
        email: 'yaw@example.com',
        status: 'received',
        resolved: false,
        resolved_at: null,
        message: 'Inquiry regarding regional vetting schedule',
        created_at: '2026-09-22T08:00:00Z',
      };

      const inqCsv = formatInquiriesCsv([sampleInquiry]);
      expect(inqCsv).toContain('MSG-2026-0001');
      expect(inqCsv).toContain('Yaw Boateng');

      const sampleReview = {
        id: 'rev-1',
        nomination_id: 'nom-1',
        reviewer_name: 'Dr. Mensah',
        review_stage: 'Screening Assessment',
        recommendation: 'advance',
        rating: 5,
        notes: 'Exceptional civic background and strong references',
        created_at: '2026-09-22T09:00:00Z',
      };

      const revCsv = formatReviewsCsv([sampleReview]);
      expect(revCsv).toContain('Dr. Mensah');
      expect(revCsv).toContain('advance');
      expect(revCsv).toContain('5');
    });
  });

  // ===========================================================================
  // 3. ZOD VALIDATION SCHEMAS
  // ===========================================================================
  describe('3. Validation Schemas for Deletion & Export', () => {
    it('validates deleteAdminUserSchema with valid ID', () => {
      const valid = deleteAdminUserSchema.safeParse({
        userId: '00000000-0000-0000-0000-000000000001',
      });
      expect(valid.success).toBe(true);

      const invalid = deleteAdminUserSchema.safeParse({
        userId: '',
      });
      expect(invalid.success).toBe(false);
    });

    it('validates exportAdminDataSchema with approved datasets', () => {
      expect(exportAdminDataSchema.safeParse({ dataset: 'nominations' }).success).toBe(true);
      expect(exportAdminDataSchema.safeParse({ dataset: 'members' }).success).toBe(true);
      expect(exportAdminDataSchema.safeParse({ dataset: 'inquiries' }).success).toBe(true);
      expect(exportAdminDataSchema.safeParse({ dataset: 'reviews' }).success).toBe(true);
      expect(exportAdminDataSchema.safeParse({ dataset: 'passwords' }).success).toBe(false);
    });
  });

  // ===========================================================================
  // 4. PERMANENT ADMINISTRATOR DELETION & LAST SUPER ADMIN PROTECTION
  // ===========================================================================
  describe('4. Permanent Administrator Deletion & Last Super Admin Protection', () => {
    const superAdminSession = {
      user: { id: 'admin-1', email: 'owner@yrl.org.gh' },
      role: 'super_admin' as const,
    };

    const regionalCoordinatorSession = {
      user: { id: 'coord-1', email: 'coord@yrl.org.gh' },
      role: 'regional_coordinator' as const,
      assignedRegion: 'Ashanti',
    };

    it('rejects deletion attempt from non-super_admin session', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue(regionalCoordinatorSession);

      const result = await deleteAdminUser({
        userId: '00000000-0000-0000-0000-000000000002',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: Super Admin privileges required');
    });

    it('blocks permanent deletion of the sole remaining active Super Admin (Invariant)', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue(superAdminSession);

      const mockDeleteUser = vi.fn();
      const mockListUsers = vi.fn().mockResolvedValue({
        data: {
          users: [
            {
              id: 'super-1',
              email: 'sole.admin@yrl.org.gh',
              app_metadata: { role: 'super_admin', disabled: false },
            },
            {
              id: 'coord-1',
              email: 'coord@yrl.org.gh',
              app_metadata: { role: 'regional_coordinator', assigned_region: 'Volta' },
            },
          ],
        },
        error: null,
      });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: mockListUsers,
            deleteUser: mockDeleteUser,
          },
        },
      } as any);

      const result = await deleteAdminUser({
        userId: 'super-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Operation aborted: Cannot permanently delete the sole remaining active Super Administrator.'
      );
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('permits deletion of a secondary Super Admin when another active Super Admin exists', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue(superAdminSession);

      const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });
      const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });
      const mockListUsers = vi.fn().mockResolvedValue({
        data: {
          users: [
            {
              id: 'client-executive',
              email: 'executive@yrl.org.gh',
              app_metadata: { role: 'super_admin', disabled: false },
            },
            {
              id: 'dev-bootstrap',
              email: 'developer@agency.io',
              app_metadata: { role: 'super_admin', disabled: false },
            },
          ],
        },
        error: null,
      });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: mockListUsers,
            deleteUser: mockDeleteUser,
          },
        },
        from: vi.fn().mockReturnValue({
          insert: mockInsertAudit,
        }),
      } as any);

      const result = await deleteAdminUser({
        userId: 'dev-bootstrap',
      });

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('developer@agency.io');
      expect(mockDeleteUser).toHaveBeenCalledWith('dev-bootstrap');

      // Verify audit log call
      expect(mockInsertAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'admin_user',
          entity_id: 'dev-bootstrap',
          action: 'admin_user_deleted',
          actor_id: 'owner@yrl.org.gh',
        })
      );
    });

    it('permits permanent deletion of regional coordinator accounts with audit log', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue(superAdminSession);

      const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });
      const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });
      const mockListUsers = vi.fn().mockResolvedValue({
        data: {
          users: [
            {
              id: 'super-1',
              email: 'admin@yrl.org.gh',
              app_metadata: { role: 'super_admin', disabled: false },
            },
            {
              id: 'coord-old',
              email: 'old.coordinator@yrl.org.gh',
              app_metadata: { role: 'regional_coordinator', assigned_region: 'Oti' },
            },
          ],
        },
        error: null,
      });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        auth: {
          admin: {
            listUsers: mockListUsers,
            deleteUser: mockDeleteUser,
          },
        },
        from: vi.fn().mockReturnValue({
          insert: mockInsertAudit,
        }),
      } as any);

      const result = await deleteAdminUser({
        userId: 'coord-old',
      });

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('old.coordinator@yrl.org.gh');
      expect(mockDeleteUser).toHaveBeenCalledWith('coord-old');
      expect(mockInsertAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin_user_deleted',
          entity_id: 'coord-old',
        })
      );
    });
  });

  // ===========================================================================
  // 5. SERVER-SIDE ROLE-SCOPED DATA EXPORT
  // ===========================================================================
  describe('5. Role-Scoped Data Export Server Action', () => {
    it('allows Super Admin to export all members with audit logging', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue({
        user: { id: 'admin-1', email: 'super@yrl.org.gh' },
        role: 'super_admin',
      });

      const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'mem-1',
              member_id: 'MEM-001',
              full_name: 'Member One',
              region: 'Greater Accra',
              email: 'mem1@example.com',
              phone_number: '+233240000001',
              created_at: '2026-09-20',
            },
          ],
          error: null,
        }),
      });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') return { select: mockSelect };
          if (table === 'audit_logs') return { insert: mockInsertAudit };
          return { select: vi.fn() };
        }),
      } as any);

      const result = await exportAdminData({ dataset: 'members' });

      expect(result.success).toBe(true);
      expect(result.data?.recordCount).toBe(1);
      expect(result.data?.filename).toContain('yrl-members-all-');
      expect(result.data?.csvContent).toContain('Member One');

      expect(mockInsertAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'export',
          entity_id: 'members',
          action: 'data_exported',
          actor_id: 'super@yrl.org.gh',
        })
      );
    });

    it('enforces Regional Coordinator scoping on member exports (ignores client-supplied region)', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue({
        user: { id: 'coord-1', email: 'coord@yrl.org.gh' },
        role: 'regional_coordinator',
        assignedRegion: 'Ashanti',
      });

      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'mem-2',
              member_id: 'MEM-002',
              full_name: 'Ashanti Member',
              region: 'Ashanti',
              created_at: '2026-09-21',
            },
          ],
          error: null,
        }),
      });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'members') return { select: vi.fn().mockReturnValue({ eq: mockEq }) };
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return { select: vi.fn() };
        }),
      } as any);

      // Attempting to request "Northern" region when assigned "Ashanti"
      const result = await exportAdminData({ dataset: 'members', region: 'Northern' });

      expect(result.success).toBe(true);
      // Query must be scoped strictly to assigned region "Ashanti", ignoring client's "Northern"
      expect(mockEq).toHaveBeenCalledWith('region', 'Ashanti');
      expect(result.data?.filename).toContain('yrl-members-ashanti-');
    });

    it('rejects National Reviewer attempt to export member records', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue({
        user: { id: 'nat-1', email: 'reviewer@yrl.org.gh' },
        role: 'national_reviewer',
      });

      const result = await exportAdminData({ dataset: 'members' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: National Reviewers do not have access to member records');
    });

    it('rejects non-Super Admin attempt to export secretariat inquiries', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue({
        user: { id: 'coord-1', email: 'coord@yrl.org.gh' },
        role: 'regional_coordinator',
        assignedRegion: 'Eastern',
      });

      const result = await exportAdminData({ dataset: 'inquiries' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: Only Super Administrators have access to export inquiry records');
    });

    it('scopes nominations export for National Reviewers to national portfolios with PII masking', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue({
        user: { id: 'nat-1', email: 'reviewer@yrl.org.gh' },
        role: 'national_reviewer',
      });

      const mockIn = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'nom-100',
              reference_id: 'NOM-100',
              full_name: 'National Candidate',
              position_applied: 'Chief of Staff',
              region: 'Greater Accra',
              phone_number: '+233241234567',
              email: 'candidate@example.com',
              date_of_birth: '1988-02-10',
              created_at: '2026-09-22',
            },
          ],
          error: null,
        }),
      });

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'nominations') return { select: vi.fn().mockReturnValue({ in: mockIn }) };
          if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
          return { select: vi.fn() };
        }),
      } as any);

      const result = await exportAdminData({ dataset: 'nominations' });

      expect(result.success).toBe(true);
      expect(result.data?.filename).toContain('yrl-nominations-national-portfolios-');
      // PII must be masked in the returned CSV
      expect(result.data?.csvContent).not.toContain('+233241234567');
      expect(result.data?.csvContent).toContain('+233****567');
      expect(result.data?.csvContent).toContain('1988-**-**');
    });

    it('allows Super Admin to export contact inquiries with audit record', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue({
        user: { id: 'admin-1', email: 'super@yrl.org.gh' },
        role: 'super_admin',
      });

      const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'contact_messages') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'msg-99',
                      reference_id: 'MSG-99',
                      full_name: 'Inquiring Citizen',
                      email: 'citizen@example.org',
                      message: 'When will interim appointments be gazetted?',
                      status: 'received',
                      resolved: false,
                      resolved_at: null,
                      created_at: '2026-09-22T10:00:00Z',
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'audit_logs') return { insert: mockInsertAudit };
          return { select: vi.fn() };
        }),
      } as any);

      const result = await exportAdminData({ dataset: 'inquiries' });
      expect(result.success).toBe(true);
      expect(result.data?.recordCount).toBe(1);
      expect(result.data?.filename).toContain('yrl-inquiries-all-');
      expect(result.data?.csvContent).toContain('Inquiring Citizen');
      expect(mockInsertAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_exported',
          entity_id: 'inquiries',
        })
      );
    });

    it('allows Super Admin to export nomination reviews', async () => {
      vi.spyOn(authServer, 'getAdminSession').mockResolvedValue({
        user: { id: 'admin-1', email: 'super@yrl.org.gh' },
        role: 'super_admin',
      });

      const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'nomination_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'rev-1',
                      nomination_id: 'nom-1',
                      reviewer_name: 'Lead Evaluator',
                      review_stage: 'Technical Interview',
                      recommendation: 'advance',
                      rating: 5,
                      notes: 'High competency in constitutional and public law',
                      created_at: '2026-09-22T11:00:00Z',
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'audit_logs') return { insert: mockInsertAudit };
          return { select: vi.fn() };
        }),
      } as any);

      const result = await exportAdminData({ dataset: 'reviews' });
      expect(result.success).toBe(true);
      expect(result.data?.recordCount).toBe(1);
      expect(result.data?.filename).toContain('yrl-nomination-reviews-all-');
      expect(result.data?.csvContent).toContain('Lead Evaluator');
      expect(result.data?.csvContent).toContain('Technical Interview');
    });

    it('neutralizes formula injection embedded in applicant or reviewer notes', () => {
      const dangerousReview = {
        id: 'rev-danger',
        nomination_id: 'nom-1',
        reviewer_name: '=cmd|’ /C calc’!A0',
        review_stage: 'Assessment',
        recommendation: 'hold',
        rating: 1,
        notes: '@SUM(1+1)*cmd',
        created_at: '2026-09-22',
      };

      const csv = formatReviewsCsv([dangerousReview]);
      // Formula triggers must be prefixed with a single quote
      expect(csv).toContain("\"'=cmd|’ /C calc’!A0\"");
      expect(csv).toContain("\"'@SUM(1+1)*cmd\"");
    });
  });
});

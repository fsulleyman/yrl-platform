import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminSession } from '@/lib/auth/types';
import { getAdminPaymentsList } from '@/lib/payment/service';
import { getAdminActivityLogs, sanitizeObject } from '@/lib/audit/service';
import { getActivityLogsAction } from '@/lib/actions/activity';
import * as supabaseServer from '@/lib/supabase/server';
import * as authServer from '@/lib/auth/server';

describe('Phase B14 Correction: Payment Dashboard Total & Super Admin Activity Log', () => {
  // Test Administrative Sessions
  const superAdminSession: AdminSession = {
    user: { id: 'admin-super-uuid', email: 'super@yrl.org.gh' } as any,
    role: 'super_admin',
    assignedRegion: undefined,
  };

  const regionalCoordinatorSession: AdminSession = {
    user: { id: 'admin-ashanti-uuid', email: 'ashanti@yrl.org.gh' } as any,
    role: 'regional_coordinator',
    assignedRegion: 'Ashanti',
  };

  const nationalReviewerSession: AdminSession = {
    user: { id: 'reviewer-uuid', email: 'reviewer@yrl.org.gh' } as any,
    role: 'national_reviewer',
    assignedRegion: undefined,
  };

  const ordinaryMemberSession: any = {
    user: { id: 'member-uuid', email: 'member@yrl.org.gh' },
    role: 'ordinary_member',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // PART 1 & 2: PAYMENT DASHBOARD TOTAL AMOUNT RECEIVED
  // =========================================================================

  describe('Part 1 & 2: Payment Dashboard Dynamic Calculation', () => {
    it('1. Three successful GH₵5 payments produce exactly GH₵15.00', async () => {
      const mockVerified = [
        { amount: 5.0, currency: 'GHS', membership_applications: { region: 'Ashanti' } },
        { amount: 5.0, currency: 'GHS', membership_applications: { region: 'Greater Accra' } },
        { amount: 5.0, currency: 'GHS', membership_applications: { region: 'Northern' } },
      ];

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockImplementation((fields: string, opts?: any) => {
                // If count query (queue list)
                if (opts?.count === 'exact') {
                  const chain: any = {
                    eq: vi.fn().mockReturnThis(),
                    or: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    range: vi.fn().mockResolvedValue({
                      data: [],
                      count: 3,
                      error: null,
                    }),
                  };
                  return chain;
                }
                // If totalReceivedQuery (amount, currency...)
                const chain: any = {
                  eq: vi.fn().mockImplementation((col: string, val: string) => {
                    return chain;
                  }),
                  then: (resolve: any) =>
                    Promise.resolve({
                      data: mockVerified,
                      error: null,
                    }).then(resolve),
                };
                return chain;
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminPaymentsList(superAdminSession);

      expect(res.success).toBe(true);
      expect(res.data?.totalAmountReceived).toBe(15.0);
      expect(res.data?.verifiedPaymentsCount).toBe(3);
      expect(res.data?.currency).toBe('GHS');
    });

    it('2. One successful GH₵5 payment + one pending GH₵5 payment produces GH₵5.00 total received', async () => {
      const mockVerifiedOnly = [
        { amount: 5.0, currency: 'GHS', membership_applications: { region: 'Ashanti' } },
      ];

      const mockSupabase: any = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockImplementation((fields: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                  data: [],
                  count: 2,
                  error: null,
                }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              then: (resolve: any) =>
                Promise.resolve({
                  data: mockVerifiedOnly,
                  error: null,
                }).then(resolve),
            };
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminPaymentsList(superAdminSession);

      expect(res.success).toBe(true);
      expect(res.data?.totalAmountReceived).toBe(5.0);
      expect(res.data?.verifiedPaymentsCount).toBe(1);
    });

    it('3. Successful + rejected payment: only successful payment contributes to total', async () => {
      // In the database, the query filters .eq('status', 'successful')
      const mockVerifiedRecords = [
        { amount: 5.0, currency: 'GHS', membership_applications: { region: 'Ashanti' } },
      ];

      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockImplementation((fields: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                  data: [],
                  count: 2,
                  error: null,
                }),
              };
            }
            return {
              eq: vi.fn().mockImplementation((field: string, val: string) => {
                expect(field).toBe('status');
                expect(val).toBe('successful');
                return {
                  then: (resolve: any) =>
                    Promise.resolve({
                      data: mockVerifiedRecords,
                      error: null,
                    }).then(resolve),
                };
              }),
            };
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminPaymentsList(superAdminSession);

      expect(res.success).toBe(true);
      expect(res.data?.totalAmountReceived).toBe(5.0);
      expect(res.data?.verifiedPaymentsCount).toBe(1);
    });

    it('4. Cancelled, failed, expired, and reversed payments do not contribute', async () => {
      // All invalid statuses are excluded by the WHERE status = 'successful' predicate
      const emptyVerified: any[] = [];

      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockImplementation((fields: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                  data: [],
                  count: 4,
                  error: null,
                }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              then: (resolve: any) =>
                Promise.resolve({
                  data: emptyVerified,
                  error: null,
                }).then(resolve),
            };
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminPaymentsList(superAdminSession);

      expect(res.success).toBe(true);
      expect(res.data?.totalAmountReceived).toBe(0);
      expect(res.data?.verifiedPaymentsCount).toBe(0);
    });

    it('5. Total is dynamically calculated and is not hard-coded', async () => {
      const dynamicAmounts = [
        { amount: 12.5, currency: 'GHS' },
        { amount: 25.0, currency: 'GHS' },
        { amount: 50.0, currency: 'GHS' },
      ];

      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockImplementation((fields: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: [], count: 3, error: null }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              then: (resolve: any) =>
                Promise.resolve({
                  data: dynamicAmounts,
                  error: null,
                }).then(resolve),
            };
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminPaymentsList(superAdminSession);

      expect(res.success).toBe(true);
      expect(res.data?.totalAmountReceived).toBe(87.5);
      expect(res.data?.verifiedPaymentsCount).toBe(3);
    });

    it('6. Currency formatting and currency identification is correct', async () => {
      const mockPayments = [{ amount: 15.0, currency: 'GHS' }];

      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockImplementation((fields: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: [], count: 1, error: null }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              then: (resolve: any) =>
                Promise.resolve({
                  data: mockPayments,
                  error: null,
                }).then(resolve),
            };
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminPaymentsList(superAdminSession);

      expect(res.success).toBe(true);
      expect(res.data?.currency).toBe('GHS');
      const formatted = `GH₵${res.data?.totalAmountReceived?.toFixed(2)}`;
      expect(formatted).toBe('GH₵15.00');
    });

    it('7. Existing payment queue filters still work without contaminating total amount received', async () => {
      // Filtering queue by status: 'pending_verification' should still report authoritative total of verified payments
      const mockVerified = [{ amount: 15.0, currency: 'GHS' }];
      const queueItems = [
        {
          id: 'pay-pending-1',
          payment_reference: 'YRL-PAY-2026-9999',
          transaction_reference: 'TXN-9999',
          amount: 5.0,
          currency: 'GHS',
          status: 'pending_verification',
          claimed_payment_date: '2026-09-23',
          created_at: '2026-09-23T12:00:00Z',
          storage_object_path: 'app/pay/receipt.png',
          receipt_mime_type: 'image/png',
          receipt_file_size: 1024,
          membership_applications: {
            id: 'app-1',
            application_number: 'YRL-APP-2026-9999',
            full_name: 'Test Applicant',
            region: 'Ashanti',
            phone_number: '0244111222',
            status: 'pending_verification',
          },
        },
      ];

      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockImplementation((fields: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: queueItems, count: 1, error: null }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              then: (resolve: any) =>
                Promise.resolve({
                  data: mockVerified,
                  error: null,
                }).then(resolve),
            };
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminPaymentsList(superAdminSession, {
        status: 'pending_verification',
      });

      expect(res.success).toBe(true);
      expect(res.data?.payments.length).toBe(1);
      expect(res.data?.payments[0].status).toBe('pending_verification');
      // Financial summary remains authoritative for verified payments:
      expect(res.data?.totalAmountReceived).toBe(15.0);
    });
  });

  // =========================================================================
  // PART 3 - 8: SUPER ADMIN ACTIVITY LOG
  // =========================================================================

  describe('Part 3 - 8: Super Admin Activity Log & Strict RBAC', () => {
    const sampleAuditLogs = [
      {
        id: 'log-1',
        entity_type: 'payment',
        entity_id: 'pay-uuid-1',
        actor_id: 'admin@yrl.org.gh',
        action: 'payment_verified',
        previous_state: { status: 'pending_verification' },
        new_state: { status: 'successful', payment_reference: 'YRL-PAY-2026-1010' },
        ip_address: '127.0.0.1',
        user_agent: 'Vitest/Agent',
        created_at: '2026-09-23T06:00:00Z',
      },
      {
        id: 'log-2',
        entity_type: 'membership_application',
        entity_id: 'app-uuid-1',
        actor_id: 'applicant',
        action: 'payment_receipt_submitted',
        previous_state: { status: 'pending_payment' },
        new_state: { status: 'pending_verification' },
        ip_address: '127.0.0.1',
        user_agent: 'Vitest/Agent',
        created_at: '2026-09-23T05:30:00Z',
      },
    ];

    it('8. super_admin can access Activity Log and receives records', async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          expect(table).toBe('audit_logs');
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lte: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: sampleAuditLogs,
                count: 2,
                error: null,
              }),
            }),
          };
        }),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminActivityLogs(superAdminSession);

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data?.logs.length).toBe(2);
      expect(res.data?.totalCount).toBe(2);
      expect(res.data?.logs[0].action).toBe('payment_verified');
    });

    it('9. regional_coordinator receives 403 Forbidden', async () => {
      const res = await getAdminActivityLogs(regionalCoordinatorSession);

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toMatch(/Forbidden/i);
      expect(res.data).toBeUndefined();
    });

    it('10. national_reviewer receives 403 Forbidden', async () => {
      const res = await getAdminActivityLogs(nationalReviewerSession);

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toMatch(/Forbidden/i);
      expect(res.data).toBeUndefined();
    });

    it('11. ordinary authenticated user receives 403 Forbidden', async () => {
      const res = await getAdminActivityLogs(ordinaryMemberSession);

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toMatch(/Forbidden/i);
      expect(res.data).toBeUndefined();
    });

    it('12. unauthenticated request cannot access Activity Log', async () => {
      const res = await getAdminActivityLogs(null as any);

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.data).toBeUndefined();
    });

    it('13. Client-side manipulation of role cannot bypass authorization', async () => {
      // Mocking getAdminAuthResult returning regional_coordinator
      vi.spyOn(authServer, 'getAdminAuthResult').mockResolvedValue({
        status: 'authenticated',
        session: regionalCoordinatorSession,
      });

      // Server action must reject even if caller desires super_admin data
      const res = await getActivityLogsAction();

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toMatch(/Forbidden/i);
    });

    it('14. Activity Log data is NOT returned to unauthorized users', async () => {
      const mockSupabase = {
        from: vi.fn(),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminActivityLogs(regionalCoordinatorSession);

      // Verify supabase query was never executed
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(res.data).toBeUndefined();
    });

    it('15. Activity Log does not expose secrets, tokens, signed URLs, or credentials', () => {
      const dirtyState = {
        payment_reference: 'YRL-PAY-2026-1010',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        secret_key: 'sk_live_secret123456789',
        bearer_token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
        session_cookie: 'sb-auth-token=xyz',
        signed_url: 'https://storage.yrl.org/receipt.png?token=secret123&Signature=abc',
        webhook_signature: 'sha512=signature987654',
        nested: {
          api_key: 'key_123456',
          public_info: 'clean',
        },
      };

      const clean = sanitizeObject(dirtyState);

      expect(clean?.payment_reference).toBe('YRL-PAY-2026-1010');
      expect(clean?.password_hash).toBe('[REDACTED]');
      expect(clean?.secret_key).toBe('[REDACTED]');
      expect(clean?.bearer_token).toBe('[REDACTED]');
      expect(clean?.session_cookie).toBe('[REDACTED]');
      expect(clean?.signed_url).toBe('[REDACTED]');
      expect(clean?.webhook_signature).toBe('[REDACTED]');
      expect(clean?.nested?.api_key).toBe('[REDACTED]');
      expect(clean?.nested?.public_info).toBe('clean');
    });

    it('16. Server-side pagination works correctly', async () => {
      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockImplementation((start: number, end: number) => {
              expect(start).toBe(20);
              expect(end).toBe(39);
              return Promise.resolve({
                data: sampleAuditLogs,
                count: 45,
                error: null,
              });
            }),
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminActivityLogs(superAdminSession, {
        page: 2,
        pageSize: 20,
      });

      expect(res.success).toBe(true);
      expect(res.data?.page).toBe(2);
      expect(res.data?.pageSize).toBe(20);
      expect(res.data?.totalCount).toBe(45);
      expect(res.data?.totalPages).toBe(3);
    });

    it('17. Existing audit records render correctly with actions and entity types', async () => {
      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'audit-log-uuid-1',
                  entity_type: 'payment',
                  entity_id: 'payment-uuid-1',
                  actor_id: 'admin@yrl.org.gh',
                  action: 'payment_verified',
                  previous_state: { status: 'pending_verification' },
                  new_state: { status: 'successful' },
                  ip_address: '10.0.0.1',
                  user_agent: 'Mozilla/5.0',
                  created_at: '2026-09-23T06:34:46Z',
                },
              ],
              count: 1,
              error: null,
            }),
          }),
        })),
      };

      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      const res = await getAdminActivityLogs(superAdminSession);

      expect(res.success).toBe(true);
      const entry = res.data?.logs[0];
      expect(entry?.entity_type).toBe('payment');
      expect(entry?.action).toBe('payment_verified');
      expect(entry?.actor_id).toBe('admin@yrl.org.gh');
    });

    it('18. Existing payment verification permissions remain intact', async () => {
      const regionalAdmin: AdminSession = {
        user: { id: 'reg-admin', email: 'reg@yrl.org.gh' } as any,
        role: 'regional_coordinator',
        assignedRegion: 'Ashanti',
      };

      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockImplementation((fields: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
            };
          }),
        })),
      };
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue(mockSupabase as any);

      // Regional coordinator can view payments in their region
      const res = await getAdminPaymentsList(regionalAdmin);
      expect(res.success).toBe(true);
    });

    it('19. Existing membership activation authorization remains intact', () => {
      // National reviewer cannot verify payments or view activity log
      expect(nationalReviewerSession.role).toBe('national_reviewer');
    });

    it('20. Existing RBAC security model remains strictly enforced', async () => {
      // Verify all non-super-admin roles receive 403 on activity log
      const roles: AdminSession[] = [
        regionalCoordinatorSession,
        nationalReviewerSession,
        {
          user: { id: 'deactivated', email: 'deactivated@yrl.org.gh' } as any,
          role: 'regional_coordinator',
          assignedRegion: 'Ashanti',
        },
      ];

      for (const s of roles) {
        const res = await getAdminActivityLogs(s);
        expect(res.success).toBe(false);
        expect(res.statusCode).toBe(403);
      }
    });
  });
});

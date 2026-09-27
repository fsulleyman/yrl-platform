import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getMemberAuthResult } from '@/lib/auth/server';
import {
  getMemberApplicationPayment,
  submitApplicantReceipt,
} from '@/lib/payment/service';
import { getApplicantSessionRecoveryAction } from '@/lib/actions/payment';
import * as supabaseServer from '@/lib/supabase/server';

describe('Phase B18: Member Payment Receipt Resumption & Application Continuity', () => {
  const applicantEmail = 'applicant.kofi@example.com';
  const otherApplicantEmail = 'attacker.kwame@example.com';

  const mockAppId = '11111111-2222-3333-4444-555555555555';
  const otherAppId = '99999999-8888-7777-6666-555555555555';

  const mockPaymentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const otherPaymentId = 'xxxxxxxx-yyyy-zzzz-wwww-vvvvvvvvvvvv';

  const mockAppNumber = 'YRL-APP-2026-1014';
  const mockPayRef = 'YRL-PAY-2026-1014';

  const otherAppNumber = 'YRL-APP-2026-9999';
  const otherPayRef = 'YRL-PAY-2026-9999';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Requirement A & B: Dashboard Action & Route Accessibility
  // =========================================================================
  describe('A & B. Dashboard Action & Route Accessibility', () => {
    it('TEST A: Authenticated applicant with pending payment resolves session to pending_activation', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'auth-user-1', email: applicantEmail } },
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
                          id: mockAppId,
                          application_number: mockAppNumber,
                          status: 'payment_not_started',
                          submitted_at: '2026-09-27T10:00:00Z',
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

      const authResult = await getMemberAuthResult();
      expect(authResult.status).toBe('pending_activation');
      if (authResult.status === 'pending_activation') {
        expect(authResult.application.id).toBe(mockAppId);
        expect(authResult.application.application_number).toBe(mockAppNumber);
      }
    });

    it('TEST B: Member dashboard source code routes payment resumption to /member/payment', () => {
      const dashboardPath = path.resolve(process.cwd(), 'app/member/page.tsx');
      const content = fs.readFileSync(dashboardPath, 'utf8');

      // Must point to /member/payment
      expect(content).toContain("actionLink: '/member/payment'");
      expect(content).toContain("actionLabel: 'Submit Payment Receipt'");

      // Must NOT send pending applicants back to /get-involved/join
      const lifecycleMatch = content.match(/function getApplicationLifecycleDetails[\s\S]*?case 'payment_not_started':[\s\S]*?actionLink: '([^']+)'/);
      expect(lifecycleMatch).not.toBeNull();
      expect(lifecycleMatch![1]).toBe('/member/payment');
      expect(lifecycleMatch![1]).not.toBe('/get-involved/join');
    });
  });

  // =========================================================================
  // Requirement C, D, E, F, G, H: Existing Record Continuity (No Duplication)
  // =========================================================================
  describe('C through H. Existing Application & Payment Reuse (No Duplication)', () => {
    it('TEST C & D: getMemberApplicationPayment resolves the existing payment for the application', async () => {
      vi.spyOn(supabaseServer, 'createAdminClient').mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: mockPaymentId,
                          payment_reference: mockPayRef,
                          amount: 5.0,
                          currency: 'GHS',
                          status: 'pending',
                          payment_method: 'manual_mobile_money',
                          transaction_reference: null,
                          claimed_payment_date: null,
                          storage_object_path: null,
                          receipt_original_filename: null,
                          has_receipt: false,
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

      const payment = await getMemberApplicationPayment(mockAppId);
      expect(payment).not.toBeNull();
      expect(payment?.id).toBe(mockPaymentId);
      expect(payment?.payment_reference).toBe(mockPayRef);
      expect(payment?.amount).toBe(5.0);
      expect(payment?.currency).toBe('GHS');
      expect(payment?.status).toBe('pending');
    });

    it('TEST E & F: Receipt submission updates existing payment and application to pending_verification', async () => {
      const updatePaymentsMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockPaymentId,
                application_id: mockAppId,
                status: 'pending_verification',
              },
              error: null,
            }),
          }),
        }),
      });
      const updateApplicationsMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const insertAuditLogMock = vi.fn().mockResolvedValue({ error: null });

      const mockStorageUpload = vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null });

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: applicantEmail } },
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
                        data: { id: mockAppId, application_number: mockAppNumber, email: applicantEmail },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
              update: updateApplicationsMock,
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: mockPaymentId,
                      application_id: mockAppId,
                      status: 'pending',
                      amount: 5.0,
                      currency: 'GHS',
                    },
                    error: null,
                  }),
                }),
              }),
              update: updatePaymentsMock,
            };
          }
          if (table === 'audit_logs') {
            return { insert: insertAuditLogMock };
          }
          return {} as any;
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            upload: mockStorageUpload,
          }),
        },
      } as any);

      const formData = new FormData();
      formData.append('payment_reference', mockPayRef);
      formData.append('transaction_reference', '28471928371');
      formData.append('claimed_payment_date', '2026-09-27');
      const dummyFile = new File(['valid dummy image content'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', dummyFile);

      const result = await submitApplicantReceipt(formData);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending_verification');
      expect(result.data?.applicationStatus).toBe('pending_verification');
      expect(result.data?.paymentId).toBe(mockPaymentId);

      // Verify payment was UPDATED, not created
      expect(updatePaymentsMock).toHaveBeenCalled();
      expect(updateApplicationsMock).toHaveBeenCalled();
    });

    it('TEST G & H: Receipt submission does not call insert on payments or membership_applications', async () => {
      const insertPaymentsSpy = vi.fn();
      const insertApplicationsSpy = vi.fn();
      const updatePaymentsMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockPaymentId,
                application_id: mockAppId,
                status: 'pending_verification',
              },
              error: null,
            }),
          }),
        }),
      });

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: applicantEmail } },
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
                        data: { id: mockAppId, application_number: mockAppNumber, email: applicantEmail },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
              insert: insertApplicationsSpy,
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: mockPaymentId,
                      application_id: mockAppId,
                      status: 'pending',
                      amount: 5.0,
                      currency: 'GHS',
                    },
                    error: null,
                  }),
                }),
              }),
              insert: insertPaymentsSpy,
              update: updatePaymentsMock,
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {} as any;
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
          }),
        },
      } as any);

      const formData = new FormData();
      formData.append('payment_reference', mockPayRef);
      formData.append('transaction_reference', 'TXN99887766');
      const dummyFile = new File(['valid receipt content'], 'receipt.png', { type: 'image/png' });
      formData.append('receipt_file', dummyFile);

      const result = await submitApplicantReceipt(formData);
      expect(result.success).toBe(true);

      // Invariants: ZERO inserts to membership_applications or payments!
      expect(insertApplicationsSpy).not.toHaveBeenCalled();
      expect(insertPaymentsSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Requirement I & J: Anti-IDOR & Server-Side Ownership
  // =========================================================================
  describe('I & J. Anti-IDOR & Server-Side Ownership Protection', () => {
    it('TEST I: Authenticated applicant cannot submit receipt against another applicant payment', async () => {
      // Attacker is logged in as attacker.kwame@example.com (otherAppId)
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'attacker-user', email: otherApplicantEmail } },
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
                      // Attacker's application is otherAppId
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { id: otherAppId, application_number: otherAppNumber, email: otherApplicantEmail },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  // Looked-up payment belongs to mockAppId (victim)
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: mockPaymentId,
                      application_id: mockAppId, // VICTIM'S APPLICATION!
                      status: 'pending',
                      amount: 5.0,
                      currency: 'GHS',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const formData = new FormData();
      formData.append('payment_reference', mockPayRef); // Attacker tries to submit for victim's payment
      formData.append('transaction_reference', 'ATTACK9999');
      const dummyFile = new File(['fake receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', dummyFile);

      const result = await submitApplicantReceipt(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
      expect(result.error).toContain('own application');
    });

    it('TEST J: Manipulating form payment reference cannot bypass server-side ownership verification', async () => {
      // User is authenticated as applicant.kofi@example.com (mockAppId)
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'kofi-user', email: applicantEmail } },
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
                        data: { id: mockAppId, application_number: mockAppNumber, email: applicantEmail },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  // Attacker manipulated hidden field to point to other payment belonging to otherAppId
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: otherPaymentId,
                      application_id: otherAppId,
                      status: 'pending',
                      amount: 5.0,
                      currency: 'GHS',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const formData = new FormData();
      formData.append('payment_reference', otherPayRef); // Manipulated
      formData.append('transaction_reference', 'TXN-TAMPER-001');
      const dummyFile = new File(['dummy proof'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', dummyFile);

      const result = await submitApplicantReceipt(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  // =========================================================================
  // Requirement K & L: Lifecycle Resumption & Page Refresh
  // =========================================================================
  describe('K & L. Lifecycle Resumption & Refresh Resilience', () => {
    it('TEST K: Logged out and logging back in resolves the exact same application and payment', async () => {
      // Re-login establishes session with applicantEmail
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'kofi-user', email: applicantEmail } },
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
                        data: { id: mockAppId, application_number: mockAppNumber, status: 'payment_not_started' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: mockPaymentId,
                          payment_reference: mockPayRef,
                          status: 'pending',
                          amount: 5.0,
                          currency: 'GHS',
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

      const auth = await getMemberAuthResult();
      expect(auth.status).toBe('pending_activation');
      if (auth.status === 'pending_activation') {
        const pay = await getMemberApplicationPayment(auth.application.id);
        expect(pay?.id).toBe(mockPaymentId);
        expect(pay?.payment_reference).toBe(mockPayRef);
      }
    });

    it('TEST L: Refreshing /member/payment loads context purely server-side from session cookies without URL params', async () => {
      // The server component takes no query params and derives everything from getMemberAuthResult
      const paymentPagePath = path.resolve(process.cwd(), 'app/member/payment/page.tsx');
      const content = fs.readFileSync(paymentPagePath, 'utf8');

      // Must call getMemberAuthResult()
      expect(content).toContain('await getMemberAuthResult()');
      // Must call getMemberApplicationPayment(application.id)
      expect(content).toContain('await getMemberApplicationPayment(application.id)');
      // Must NOT inspect searchParams or URL parameters for application ID or payment ID
      expect(content).not.toContain('searchParams.applicationId');
      expect(content).not.toContain('searchParams.paymentId');
      expect(content).not.toContain('params.applicationId');
      expect(content).not.toContain('params.paymentId');
    });
  });

  // =========================================================================
  // Requirement M, N, O: State Replay Guard & Rejection Resubmission
  // =========================================================================
  describe('M, N, O. State Replay Guard & Rejection Handling', () => {
    it('TEST M: Already verified/successful payment cannot be resubmitted', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'kofi-user', email: applicantEmail } },
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
                        data: { id: mockAppId, application_number: mockAppNumber, email: applicantEmail },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: mockPaymentId,
                      application_id: mockAppId,
                      status: 'successful', // ALREADY VERIFIED!
                      amount: 5.0,
                      currency: 'GHS',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {} as any;
        }),
      } as any);

      const formData = new FormData();
      formData.append('payment_reference', mockPayRef);
      formData.append('transaction_reference', 'TXN-DUPLICATE');
      const dummyFile = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', dummyFile);

      const result = await submitApplicantReceipt(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already been verified');
    });

    it('TEST N: Rejected payment permits corrected receipt resubmission', async () => {
      const updatePaymentsMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockPaymentId,
                application_id: mockAppId,
                status: 'pending_verification',
              },
              error: null,
            }),
          }),
        }),
      });
      const updateApplicationsMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'kofi-user', email: applicantEmail } },
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
                          id: mockAppId,
                          application_number: mockAppNumber,
                          email: applicantEmail,
                          status: 'payment_rejected',
                          rejection_reason: 'Blurry screenshot; transaction ID was unreadable.',
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
              update: updateApplicationsMock,
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: mockPaymentId,
                      application_id: mockAppId,
                      status: 'rejected', // REJECTED
                      amount: 5.0,
                      currency: 'GHS',
                      rejection_reason: 'Blurry screenshot; transaction ID was unreadable.',
                    },
                    error: null,
                  }),
                }),
              }),
              update: updatePaymentsMock,
            };
          }
          if (table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {} as any;
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
          }),
        },
      } as any);

      const formData = new FormData();
      formData.append('payment_reference', mockPayRef);
      formData.append('transaction_reference', 'CORRECTED-TXN-001');
      const dummyFile = new File(['clear receipt image'], 'clear_receipt.jpg', { type: 'image/jpeg' });
      formData.append('receipt_file', dummyFile);

      const result = await submitApplicantReceipt(formData);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending_verification');
    });

    it('TEST O: /member/payment and MemberPaymentReceiptForm handle and display rejectionReason', () => {
      const formPath = path.resolve(process.cwd(), 'app/member/payment/MemberPaymentReceiptForm.tsx');
      const content = fs.readFileSync(formPath, 'utf8');

      expect(content).toContain('rejectionReason');
      expect(content).toContain('isResubmission');
      expect(content).toContain('Action Required: Secretariat Feedback');
      expect(content).toContain('Resubmit Payment Proof');
    });
  });

  // =========================================================================
  // Requirement P & Q: Public Join Page Integrity & Recovery Path
  // =========================================================================
  describe('P & Q. Public Join Page Integrity & Recovery Path', () => {
    it('TEST P: Public /get-involved/join remains usable for new visitor registration', () => {
      const joinPagePath = path.resolve(process.cwd(), 'app/get-involved/join/page.tsx');
      const content = fs.readFileSync(joinPagePath, 'utf8');

      // Preserves new applicant registration fields
      expect(content).toContain('name="full_name"');
      expect(content).toContain('name="date_of_birth"');
      expect(content).toContain('name="phone_number"');
      expect(content).toContain('name="email"');
      expect(content).toContain('createMembershipApplication');
    });

    it('TEST Q: Authenticated applicant reaching join page receives safe recovery path via getApplicantSessionRecoveryAction', async () => {
      vi.spyOn(supabaseServer, 'createAuthClient').mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'kofi-user', email: applicantEmail } },
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
                          id: mockAppId,
                          application_number: mockAppNumber,
                          status: 'payment_not_started',
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

      const recovery = await getApplicantSessionRecoveryAction();
      expect(recovery).not.toBeNull();
      expect(recovery?.hasExistingApplication).toBe(true);
      expect(recovery?.applicationNumber).toBe(mockAppNumber);

      // Verify join/page.tsx displays the recovery banner pointing to /member/payment
      const joinPagePath = path.resolve(process.cwd(), 'app/get-involved/join/page.tsx');
      const content = fs.readFileSync(joinPagePath, 'utf8');
      expect(content).toContain('Your YRL Membership Application is Already on File');
      expect(content).toContain('href="/member/payment"');
    });
  });
});

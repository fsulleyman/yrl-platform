-- ==============================================================================
-- YOUTH REPUBLIC LEADERSHIP (YRL) PLATFORM
-- Model B / Phase B2.1: Service-Role Permissions Correction
-- Migration: 20260919_b2_1_service_role_permissions.sql
-- Description: Grants explicit, least-privilege PostgreSQL object permissions
--              to the 'service_role' for YRL Model B2 tables, sequences,
--              and functions. Does NOT grant any privileges to 'anon' or
--              'authenticated', preserving strict zero-public-access RLS.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA PERMISSION
-- Ensures service_role can resolve objects within the public schema.
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO service_role;


-- ------------------------------------------------------------------------------
-- 2. TABLE PERMISSIONS
-- Grants explicit DML privileges to service_role for backend Server Actions
-- and administrative portal workflows.
-- ------------------------------------------------------------------------------

-- Nominations: Full lifecycle management by backend (submission, screening, status updates)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nominations TO service_role;

-- Members: Full lifecycle management by backend (registration, status updates)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.members TO service_role;

-- Contact Messages: Submission processing, resolution tracking, and archiving
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_messages TO service_role;

-- Nomination Reviews: Reviewer assessment creation, rating updates, and review notes
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nomination_reviews TO service_role;

-- Audit Logs: Append-only audit trail; SELECT for review, INSERT for event recording
-- UPDATE and DELETE are intentionally omitted to preserve audit log immutability.
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;


-- ------------------------------------------------------------------------------
-- 3. SEQUENCE PERMISSIONS
-- Grants USAGE and SELECT on sequences required by generate_yrl_reference()
-- to generate unique, atomic reference IDs under concurrent inserts.
-- ------------------------------------------------------------------------------
GRANT USAGE, SELECT ON SEQUENCE public.seq_nomination_ref TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.seq_member_ref TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.seq_contact_ref TO service_role;


-- ------------------------------------------------------------------------------
-- 4. FUNCTION EXECUTION PERMISSIONS
-- Grants explicit EXECUTE on B2 functions using exact parameter signatures.
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.generate_yrl_reference(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

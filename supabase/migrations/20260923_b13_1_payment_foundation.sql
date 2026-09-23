-- ==============================================================================
-- YOUTH REPUBLIC LEADERSHIP (YRL) PLATFORM
-- Phase B13.1: Membership Payment Architecture & Database Foundation
-- Migration: 20260923_b13_1_payment_foundation.sql
-- Description: Creates payment_configurations, membership_applications,
--              and payments tables with reference sequences, status lifecycles,
--              receipt storage metadata, indexes, and strict RLS.
--              Legacy 'members' table schema is preserved 100% without modification.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------------------------

-- Application Workflow Statuses
DO $$ BEGIN
  CREATE TYPE application_status_enum AS ENUM (
    'payment_not_started',
    'pending_payment',
    'receipt_submitted',
    'pending_verification',
    'payment_verified',
    'payment_rejected',
    'activated',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment Transaction & Evidence Statuses
DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM (
    'pending',
    'receipt_submitted',
    'pending_verification',
    'successful',
    'rejected',
    'failed',
    'cancelled',
    'expired',
    'reversed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment Method / Provider Architecture
DO $$ BEGIN
  CREATE TYPE payment_method_enum AS ENUM (
    'manual_mobile_money',
    'paystack',
    'other_provider'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 2. SEQUENCES
-- ------------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS seq_application_ref START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS seq_payment_ref START WITH 1001;

-- ------------------------------------------------------------------------------
-- 3. TABLE: PAYMENT_CONFIGURATIONS (Server-Authoritative Fee & Details)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE DEFAULT 'default',
  membership_fee numeric(10, 2) NOT NULL DEFAULT 5.00 CHECK (membership_fee > 0),
  currency text NOT NULL DEFAULT 'GHS',
  momo_number text, -- NULL until authorized administrator configures real production destination
  momo_account_name text DEFAULT 'Youth Republic Leadership',
  momo_instructions text NOT NULL DEFAULT 'Official Mobile Money payment destination is currently being configured by the YRL Secretariat. Please check back shortly.',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed authoritative default configuration (GH₵5.00 with UNSET / NULL MoMo number)
INSERT INTO payment_configurations (
  config_key,
  membership_fee,
  currency,
  momo_number,
  momo_account_name,
  momo_instructions,
  is_active
) VALUES (
  'default',
  5.00,
  'GHS',
  NULL,
  'Youth Republic Leadership',
  'Official Mobile Money payment destination is currently being configured by the YRL Secretariat. Please check back shortly.',
  true
) ON CONFLICT (config_key) DO UPDATE SET
  momo_number = NULL,
  momo_instructions = EXCLUDED.momo_instructions;

-- ------------------------------------------------------------------------------
-- 4. TABLE: MEMBERSHIP_APPLICATIONS
-- Authoritative relationship: membership_applications.member_id -> members.id
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS membership_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text NOT NULL DEFAULT generate_yrl_reference('APP', 'seq_application_ref') UNIQUE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,

  -- Applicant Profile
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text,
  phone_number text NOT NULL,
  whatsapp_number text,
  email text NOT NULL,

  -- Location
  region region_enum NOT NULL,
  district_municipality text NOT NULL,
  town_community text NOT NULL,

  -- Background
  occupation text NOT NULL,
  education_level text NOT NULL,

  -- Civic Motivation
  why_join text NOT NULL,
  availability text NOT NULL,
  engagement_interests text[] NOT NULL DEFAULT '{}',
  civic_acknowledgement boolean NOT NULL DEFAULT true,

  -- Application Lifecycle
  status application_status_enum NOT NULL DEFAULT 'payment_not_started',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  rejected_at timestamptz,
  rejected_by text,
  rejection_reason text,
  activated_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. TABLE: PAYMENTS (Transaction Lifecycle & Evidence Metadata)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
  payment_reference text NOT NULL DEFAULT generate_yrl_reference('PAY', 'seq_payment_ref') UNIQUE,

  -- Provider & Network References
  provider_reference text,
  transaction_reference text,
  payment_method payment_method_enum NOT NULL DEFAULT 'manual_mobile_money',
  payment_channel text DEFAULT 'momo',

  -- Monetary Amount (numeric, strictly non-floating point)
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'GHS',
  claimed_payment_date date,

  -- Private Storage Evidence Reference (Binary NEVER stored in database)
  storage_bucket text DEFAULT 'payment-receipts',
  storage_object_path text,
  receipt_original_filename text,
  receipt_mime_type text,
  receipt_file_size integer,
  receipt_uploaded_at timestamptz,

  -- Status & Verification
  status payment_status_enum NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  rejected_at timestamptz,
  rejected_by text,
  rejection_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. TRIGGERS: AUTOMATIC updated_at
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_payment_configurations_updated_at ON payment_configurations;
CREATE TRIGGER trg_payment_configurations_updated_at
BEFORE UPDATE ON payment_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_membership_applications_updated_at ON membership_applications;
CREATE TRIGGER trg_membership_applications_updated_at
BEFORE UPDATE ON membership_applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. INDEXES
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_applications_status ON membership_applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_region ON membership_applications (region);
CREATE INDEX IF NOT EXISTS idx_applications_email ON membership_applications (lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_applications_phone ON membership_applications (regexp_replace(phone_number, '\s+', '', 'g'));
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON membership_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_app_number ON membership_applications (application_number);
CREATE INDEX IF NOT EXISTS idx_applications_member_id ON membership_applications (member_id);

CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments (application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON payments (payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_tx_reference ON payments (transaction_reference);

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) & OBJECT PRIVILEGES
-- ------------------------------------------------------------------------------

ALTER TABLE payment_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Grants to service_role (Next.js server-mediated execution)
GRANT USAGE, SELECT ON SEQUENCE seq_application_ref TO service_role;
GRANT USAGE, SELECT ON SEQUENCE seq_payment_ref TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payment_configurations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE membership_applications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payments TO service_role;

-- Public read for active payment configuration (fee & MoMo instructions)
DROP POLICY IF EXISTS "Public can view active payment configurations" ON payment_configurations;
CREATE POLICY "Public can view active payment configurations"
ON payment_configurations FOR SELECT
TO anon, authenticated
USING (is_active = true);

GRANT SELECT ON TABLE payment_configurations TO anon, authenticated;

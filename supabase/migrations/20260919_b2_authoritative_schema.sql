-- ==============================================================================
-- YOUTH REPUBLIC LEADERSHIP (YRL) PLATFORM
-- Model B / Phase B2: Authoritative Database Schema & Migrations
-- Migration: 20260919_b2_authoritative_schema.sql
-- Description: Creates core tables (nominations, members, contact_messages)
--              and supporting tables (nomination_reviews, audit_logs) with
--              year-aware reference generators, unique constraints, indexes,
--              and strict Row Level Security (RLS).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------------------------

-- 16 Regions of Ghana
DO $$ BEGIN
  CREATE TYPE region_enum AS ENUM (
    'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra',
    'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta',
    'Western', 'Western North'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 12 Official YRL Leadership Positions
DO $$ BEGIN
  CREATE TYPE position_enum AS ENUM (
    'Chief of Staff',
    'Minister for Education',
    'Minister for Youth Employment and Entrepreneurship',
    'Minister for Finance',
    'Minister for Research, Science and Technology',
    'Minister for Communications',
    'Minister for Health',
    'Minister for Agriculture',
    'Minister for Gender, Women and Social Protection',
    'Minister for Local Government and Community Development',
    'Attorney-General and Minister for Justice',
    'Interim Regional Minister'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Nomination Workflow Statuses
DO $$ BEGIN
  CREATE TYPE nomination_status_enum AS ENUM (
    'submitted',
    'screening',
    'shortlisted',
    'interview',
    'selected',
    'declined'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Member Statuses
DO $$ BEGIN
  CREATE TYPE member_status_enum AS ENUM (
    'active',
    'inactive',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Contact Message Statuses
DO $$ BEGIN
  CREATE TYPE contact_status_enum AS ENUM (
    'received',
    'in_progress',
    'resolved',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ------------------------------------------------------------------------------
-- 2. SEQUENCES & YEAR-AWARE IDENTIFIER GENERATOR
-- ------------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS seq_nomination_ref START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS seq_member_ref START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS seq_contact_ref START WITH 1001;

-- Function: generate_yrl_reference
-- Generates human-readable IDs in the format: YRL-{PREFIX}-{YYYY}-{XXXX}
-- Automatically derives YYYY from CURRENT_DATE (never hardcoded to 2026).
CREATE OR REPLACE FUNCTION generate_yrl_reference(prefix text, seq_name text)
RETURNS text AS $$
DECLARE
  current_year text;
  next_seq bigint;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  EXECUTE 'SELECT nextval(' || quote_literal(seq_name) || ')' INTO next_seq;
  RETURN 'YRL-' || prefix || '-' || current_year || '-' || lpad(next_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger Function: Automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- 3. TABLE: NOMINATIONS (35 Verified Submitted Fields + Metadata)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nominations (
  -- Internal & Authoritative Identity
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text NOT NULL DEFAULT generate_yrl_reference('NOM', 'seq_nomination_ref') UNIQUE,

  -- Personal Profile (Verified Model A Fields 1-6)
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text,
  phone_number text NOT NULL,
  whatsapp_number text,
  email text NOT NULL,

  -- Geographic Location (Verified Model A Fields 7-9)
  region region_enum NOT NULL,
  district_municipality text NOT NULL,
  town_community text NOT NULL,

  -- Vocational & Educational Background (Verified Model A Fields 10-13)
  occupation text NOT NULL,
  organisation_institution text,
  education_level text NOT NULL,
  area_of_study_profession text NOT NULL,

  -- Position & Regional Application (Verified Model A Fields 14-15)
  position_applied position_enum NOT NULL,
  region_if_regional_minister region_enum,

  -- Leadership Track Record (Verified Model A Fields 16-22)
  has_leadership_experience boolean NOT NULL DEFAULT false,
  prior_position text,
  prior_organisation text,
  prior_duration text,
  prior_responsibilities text,
  suitability_statement text,
  proudest_achievement text,

  -- Civic Vision & Ministerial Questions (Verified Model A Fields 23-28)
  q1_why_serve text NOT NULL,
  q2_leadership_as_service text NOT NULL,
  q3_first_90_days text NOT NULL,
  q4_recruitment_plan text NOT NULL,
  q5_recruitment_estimate text,
  q6_regional_building_plan text,

  -- Availability & Operational Readiness (Verified Model A Fields 29-31)
  weekly_hours text NOT NULL,
  willing_online_meetings boolean NOT NULL,
  willing_physical_activities boolean NOT NULL,

  -- Referee & Declaration (Verified Model A Fields 32-35)
  referee_name text NOT NULL,
  referee_relationship text NOT NULL,
  referee_phone text NOT NULL,
  declaration_agreed boolean NOT NULL,

  -- Backend Metadata
  status nomination_status_enum NOT NULL DEFAULT 'submitted',
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Conditional Check: If position is Interim Regional Minister, region_if_regional_minister must be specified
  CONSTRAINT chk_regional_minister_region CHECK (
    position_applied != 'Interim Regional Minister' OR region_if_regional_minister IS NOT NULL
  )
);

-- Case-insensitive unique constraint on (email, position_applied)
CREATE UNIQUE INDEX IF NOT EXISTS uq_nominations_email_position 
ON nominations (lower(trim(email)), position_applied);

-- Nominations Indexes
CREATE INDEX IF NOT EXISTS idx_nominations_status ON nominations (status);
CREATE INDEX IF NOT EXISTS idx_nominations_region ON nominations (region);
CREATE INDEX IF NOT EXISTS idx_nominations_position ON nominations (position_applied);
CREATE INDEX IF NOT EXISTS idx_nominations_created_at ON nominations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nominations_reference_id ON nominations (reference_id);

-- Updated_at trigger for nominations
DROP TRIGGER IF EXISTS trg_nominations_updated_at ON nominations;
CREATE TRIGGER trg_nominations_updated_at
BEFORE UPDATE ON nominations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 4. TABLE: MEMBERS (15 Verified Submitted Fields + Metadata)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS members (
  -- Internal & Authoritative Identity
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL DEFAULT generate_yrl_reference('MEM', 'seq_member_ref') UNIQUE,

  -- Personal Profile (Verified Model A Fields 1-6)
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text,
  phone_number text NOT NULL,
  whatsapp_number text,
  email text NOT NULL,

  -- Geographic Location (Verified Model A Fields 7-9)
  region region_enum NOT NULL,
  district_municipality text NOT NULL,
  town_community text NOT NULL,

  -- Occupation & Education (Verified Model A Fields 10-11)
  occupation text NOT NULL,
  education_level text NOT NULL,

  -- Civic Motivation & Availability (Verified Model A Fields 12-14)
  why_join text NOT NULL,
  availability text NOT NULL,
  engagement_interests text[] NOT NULL DEFAULT '{}',

  -- Declaration & Acknowledgement (Verified Model A Field 15)
  civic_acknowledgement boolean NOT NULL,

  -- Backend Metadata
  status member_status_enum NOT NULL DEFAULT 'active',
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraints for member deduplication (case-insensitive email and normalized phone)
CREATE UNIQUE INDEX IF NOT EXISTS uq_members_email 
ON members (lower(trim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_members_phone 
ON members (regexp_replace(phone_number, '\s+', '', 'g'));

-- Members Indexes
CREATE INDEX IF NOT EXISTS idx_members_region ON members (region);
CREATE INDEX IF NOT EXISTS idx_members_status ON members (status);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members (member_id);

-- Updated_at trigger for members
DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 5. TABLE: CONTACT_MESSAGES (3 Verified Submitted Fields + Metadata)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact_messages (
  -- Internal & Authoritative Identity
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text NOT NULL DEFAULT generate_yrl_reference('MSG', 'seq_contact_ref') UNIQUE,

  -- Submitted Contact Form Data (Verified Model A Fields 1-3)
  full_name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,

  -- Backend Metadata
  status contact_status_enum NOT NULL DEFAULT 'received',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contact Messages Indexes
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_reference_id ON contact_messages (reference_id);

-- Updated_at trigger for contact messages
DROP TRIGGER IF EXISTS trg_contact_updated_at ON contact_messages;
CREATE TRIGGER trg_contact_updated_at
BEFORE UPDATE ON contact_messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 6. SUPPORTING TABLE: NOMINATION_REVIEWS (Reviewer Notes & Scoring)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nomination_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id uuid NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  reviewer_id uuid,
  reviewer_name text,
  review_stage text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  recommendation text NOT NULL CHECK (recommendation IN ('advance', 'hold', 'decline')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_nomination_id ON nomination_reviews (nomination_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON nomination_reviews (created_at DESC);

-- Updated_at trigger for nomination reviews
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON nomination_reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON nomination_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 7. SUPPORTING TABLE: AUDIT_LOGS (Status & Administrative Audit Trail)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  actor_id text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);


-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ------------------------------------------------------------------------------

-- Enable RLS unconditionally on all tables
ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Posture: Zero public read access to PII.
-- All queries, submissions, and review workflows are mediated via server actions
-- utilizing the Supabase service-role client (which bypasses RLS safely on the server).
-- Direct PostgREST client queries from 'anon' and 'authenticated' roles are strictly denied.

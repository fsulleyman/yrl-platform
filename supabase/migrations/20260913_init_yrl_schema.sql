-- Youth Republic Leadership (YRL) Database Schema & Security
-- Initial Migration: 20260913_init_yrl_schema.sql

-- 1. Create Enums
CREATE TYPE region_enum AS ENUM (
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra',
  'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta',
  'Western', 'Western North'
);

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

-- 2. Create Nominations Table
CREATE TABLE nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text,
  phone_number text NOT NULL,
  whatsapp_number text,
  email text NOT NULL,
  region region_enum NOT NULL,
  district_municipality text NOT NULL,
  town_community text NOT NULL,
  occupation text NOT NULL,
  organisation_institution text,
  education_level text NOT NULL,
  area_of_study_profession text NOT NULL,
  position_applied position_enum NOT NULL,
  region_if_regional_minister region_enum,
  has_leadership_experience boolean,
  prior_position text,
  prior_organisation text,
  prior_duration text,
  prior_responsibilities text,
  suitability_statement text,
  proudest_achievement text,
  q1_why_serve text NOT NULL,
  q2_leadership_as_service text NOT NULL,
  q3_first_90_days text NOT NULL,
  q4_recruitment_plan text NOT NULL,
  q5_recruitment_estimate text,
  q6_regional_building_plan text,
  weekly_hours text NOT NULL,
  willing_online_meetings boolean NOT NULL,
  willing_physical_activities boolean NOT NULL,
  referee_name text NOT NULL,
  referee_relationship text NOT NULL,
  referee_phone text NOT NULL,
  declaration_agreed boolean NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_applicant_position UNIQUE (email, position_applied)
);

-- 3. Create Members Table
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  region region_enum NOT NULL,
  district text,
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create Minister Reports Table (Future Phase 7 storage foundation)
CREATE TABLE minister_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id uuid REFERENCES nominations(id) ON DELETE CASCADE,
  report_period text,
  summary text,
  submitted_at timestamptz DEFAULT now()
);

-- 5. Row Level Security (RLS)
-- Enable RLS unconditionally on all tables
ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE minister_reports ENABLE ROW LEVEL SECURITY;

-- Nominations: INSERT-only for anon role; NO SELECT/UPDATE/DELETE for anon
CREATE POLICY "Allow anonymous users to submit nomination" 
ON nominations 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Members: INSERT-only for anon role; NO SELECT/UPDATE/DELETE for anon
CREATE POLICY "Allow anonymous users to register as members" 
ON members 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Minister Reports: No public policies at all (fully locked down, Phase 7 territory)
-- Service role bypasses RLS on server-side for admin view

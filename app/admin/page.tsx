import React from 'react';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { loginAdmin } from './actions';
import { AdminDashboard } from './AdminDashboard';
import { Button } from '@/components/ui/Button';
import { Lock } from 'lucide-react';

export const metadata = {
  title: 'Interim Review Portal | YRL',
  robots: {
    index: false,
    follow: false,
  },
};

const SAMPLE_NOMINATIONS = [
  {
    id: 'd3b07384-d113-491a-a578-f7b2434f4342',
    full_name: 'Kwame Asante Mensah',
    date_of_birth: '1995-04-12',
    gender: 'Male',
    phone_number: '+233 24 123 4567',
    whatsapp_number: '+233 24 123 4567',
    email: 'k.asante@example.com',
    region: 'Greater Accra',
    district_municipality: 'Accra Metropolitan',
    town_community: 'Osu',
    occupation: 'Civic Project Lead & Policy Researcher',
    organisation_institution: 'Institute of Civic Youth',
    education_level: 'Master Degree',
    area_of_study_profession: 'Public Administration & Governance',
    position_applied: 'Chief of Staff',
    region_if_regional_minister: null,
    has_leadership_experience: true,
    prior_position: 'National Youth Coordinator',
    prior_organisation: 'Ghana Youth Alliance',
    prior_duration: '3 years',
    prior_responsibilities: 'Coordinated regional summits and policy workshops across 12 regions.',
    suitability_statement: 'Committed to transparent and servant-leadership in building foundational structures.',
    proudest_achievement: 'Mobilized over 5,000 university students for community development projects.',
    q1_why_serve: 'I believe Ghanaian youth must actively participate in nation-building through structured, non-partisan constitutional frameworks.',
    q2_leadership_as_service: 'Leadership is stewardship and enabling others rather than seeking prestige or personal authority.',
    q3_first_90_days: 'Establish national administrative protocols, coordinate ministerial recruitment, and prepare standing orders.',
    q4_recruitment_plan: 'Partner with tertiary institutions, trade associations, and civic clubs across all 16 regions.',
    q5_recruitment_estimate: null,
    q6_regional_building_plan: null,
    weekly_hours: '20-25 hours/week',
    willing_online_meetings: true,
    willing_physical_activities: true,
    referee_name: 'Dr. Emmanuel Osei',
    referee_relationship: 'Senior Lecturer',
    referee_phone: '+233 20 555 0192',
    declaration_agreed: true,
    status: 'screening' as const,
    submitted_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'f948a12e-8419-4cb5-b28e-8a032d8471c0',
    full_name: 'Abena Serwaa Boateng',
    date_of_birth: '1997-08-23',
    gender: 'Female',
    phone_number: '+233 27 987 6543',
    whatsapp_number: '+233 27 987 6543',
    email: 'abena.boateng@example.com',
    region: 'Ashanti',
    district_municipality: 'Kumasi Metropolitan',
    town_community: 'Bantama',
    occupation: 'Agribusiness Consultant',
    organisation_institution: 'AgriYouth Ghana',
    education_level: 'Bachelor Degree',
    area_of_study_profession: 'Agricultural Economics',
    position_applied: 'Interim Regional Minister',
    region_if_regional_minister: 'Ashanti',
    has_leadership_experience: true,
    prior_position: 'Regional Youth Director',
    prior_organisation: 'Farmers Forum',
    prior_duration: '2 years',
    prior_responsibilities: 'Led rural youth empowerment in poultry and greenhouse farming.',
    suitability_statement: 'Passionate about decentralised leadership and youth grassroots mobilization in Ashanti.',
    proudest_achievement: 'Trained 350 rural youths in organic vegetable farming.',
    q1_why_serve: 'To ensure regional youth voices directly shape the future policies of Ghana.',
    q2_leadership_as_service: 'True service listens first and works alongside community members.',
    q3_first_90_days: 'Visit 15 districts in Ashanti, inaugurate 5 district youth councils, and recruit initial members.',
    q4_recruitment_plan: 'Establish district executive committees and organize town halls in Kumasi, Obuasi, and Mampong.',
    q5_recruitment_estimate: '1,000 - 2,500 members',
    q6_regional_building_plan: 'Recruit 10-member regional interim cabinet and appoint district convenors.',
    weekly_hours: '15-20 hours/week',
    willing_online_meetings: true,
    willing_physical_activities: true,
    referee_name: 'Nana Kwabena Poku',
    referee_relationship: 'Community Elder & Mentor',
    referee_phone: '+233 24 888 1122',
    declaration_agreed: true,
    status: 'submitted' as const,
    submitted_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

const SAMPLE_MEMBERS = [
  {
    id: 'm1-9923',
    full_name: 'Kofi Mensah Agyeman',
    phone: '+233 24 400 1122',
    email: 'kofi.agyeman@example.com',
    region: 'Central',
    district: 'Cape Coast Metropolitan',
    joined_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'm2-8841',
    full_name: 'Esi Mansa Ofori',
    phone: '+233 50 333 4455',
    email: 'esi.ofori@example.com',
    region: 'Eastern',
    district: 'New Juaben South',
    joined_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
];

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('yrl_admin_auth');
  const isAuthenticated = session?.value === 'authenticated_session';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[4px] border border-slate-300 shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#0E1E3B] text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0E1E3B]">YRL Interim Admin</h1>
              <p className="text-xs text-slate-500">Temporary password-gated review tool</p>
            </div>
          </div>

          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-[2px] text-xs text-amber-900 leading-normal">
            <strong>Interim Access:</strong> Enter the admin view password configured in your environment variables.
          </div>

          <form action={loginAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Admin View Password
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••••••"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0E1E3B]"
              />
            </div>

            <Button variant="secondary" fullWidth size="md" type="submit">
              Authenticate Access
            </Button>
          </form>

          <p className="text-[11px] text-slate-400 text-center mt-6">
            Youth Republic Leadership • Confidential Review Portal
          </p>
        </div>
      </div>
    );
  }

  // Fetch nominations & members via service role
  let nominations: any[] = [];
  let members: any[] = [];

  try {
    const supabase = createAdminClient();
    const [nomRes, memRes] = await Promise.all([
      supabase.from('nominations').select('*').order('submitted_at', { ascending: false }),
      supabase.from('members').select('*').order('joined_at', { ascending: false }),
    ]);

    if (!nomRes.error && nomRes.data && nomRes.data.length > 0) {
      nominations = nomRes.data;
    } else {
      nominations = SAMPLE_NOMINATIONS;
    }

    if (!memRes.error && memRes.data && memRes.data.length > 0) {
      members = memRes.data;
    } else {
      members = SAMPLE_MEMBERS;
    }
  } catch (_err) {
    // If Supabase not yet configured, provide sample preview records for inspection
    nominations = SAMPLE_NOMINATIONS;
    members = SAMPLE_MEMBERS;
  }

  return <AdminDashboard initialNominations={nominations} initialMembers={members} />;
}

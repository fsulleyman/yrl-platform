'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { updateNominationStatus, logoutAdmin } from './actions';
import { GHANA_REGIONS, YRL_POSITIONS } from '@/lib/validations/nomination';
import { Eye, X, Users, FileText } from 'lucide-react';

interface NominationRecord {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string | null;
  phone_number: string;
  whatsapp_number: string | null;
  email: string;
  region: string;
  district_municipality: string;
  town_community: string;
  occupation: string;
  organisation_institution: string | null;
  education_level: string;
  area_of_study_profession: string;
  position_applied: string;
  region_if_regional_minister: string | null;
  has_leadership_experience: boolean;
  prior_position: string | null;
  prior_organisation: string | null;
  prior_duration: string | null;
  prior_responsibilities: string | null;
  suitability_statement: string | null;
  proudest_achievement: string | null;
  q1_why_serve: string;
  q2_leadership_as_service: string;
  q3_first_90_days: string;
  q4_recruitment_plan: string;
  q5_recruitment_estimate: string | null;
  q6_regional_building_plan: string | null;
  weekly_hours: string;
  willing_online_meetings: boolean;
  willing_physical_activities: boolean;
  referee_name: string;
  referee_relationship: string;
  referee_phone: string;
  declaration_agreed: boolean;
  status: 'submitted' | 'screening' | 'shortlisted' | 'interview' | 'selected' | 'declined';
  submitted_at: string;
}

interface MemberRecord {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  region: string;
  district: string | null;
  joined_at: string;
}

export function AdminDashboard({
  initialNominations,
  initialMembers,
}: {
  initialNominations: NominationRecord[];
  initialMembers: MemberRecord[];
}) {
  const [activeTab, setActiveTab] = useState<'nominations' | 'members'>('nominations');
  const [nominations, setNominations] = useState<NominationRecord[]>(initialNominations);
  const [selectedRecord, setSelectedRecord] = useState<NominationRecord | null>(null);

  // Filters
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Status Change Handler
  const handleStatusChange = async (id: string, newStatus: any) => {
    setUpdatingId(id);
    const res = await updateNominationStatus(id, newStatus);
    if (res.success) {
      setNominations((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: newStatus } : n))
      );
      if (selectedRecord && selectedRecord.id === id) {
        setSelectedRecord({ ...selectedRecord, status: newStatus });
      }
    } else {
      alert('Failed to update status: ' + res.error);
    }
    setUpdatingId(null);
  };

  // Filtered Nominations
  const filteredNominations = nominations.filter((item) => {
    if (filterRegion !== 'all' && item.region !== filterRegion) return false;
    if (filterPosition !== 'all' && item.position_applied !== filterPosition) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.full_name.toLowerCase().includes(q);
      const matchEmail = item.email.toLowerCase().includes(q);
      const matchPhone = item.phone_number.includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Top Warning Banner */}
      <div className="bg-amber-500 text-slate-950 px-4 py-3 font-semibold text-xs sm:text-sm flex items-center justify-between shadow-xs border-b border-amber-600">
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
          <span className="bg-black text-amber-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-[2px]">
            Interim Tool
          </span>
          <span>
            TEMPORARY REVIEW DASHBOARD (PHASE 1–6): Built strictly for early review and screening. Full authenticated management portal with role-based permissions launches in Phase 7.
          </span>
        </div>
      </div>

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[4px] bg-[#0E1E3B] text-white flex items-center justify-center font-bold text-sm">
            YRL
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0E1E3B] leading-tight">
              Interim Admin Review
            </h1>
            <p className="text-xs text-slate-500">
              Service Role Access • Read-Only Dossiers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <form action={logoutAdmin}>
            <Button variant="outline" size="sm" type="submit" className="text-xs">
              Log Out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('nominations')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors ${
                activeTab === 'nominations'
                  ? 'bg-[#0E1E3B] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Nominations ({nominations.length})
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors ${
                activeTab === 'members'
                  ? 'bg-[#0E1E3B] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Registered Members ({initialMembers.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Nominations */}
        {activeTab === 'nominations' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Position Filter
                </label>
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                >
                  <option value="all">All Positions ({nominations.length})</option>
                  {YRL_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Region Filter
                </label>
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                >
                  <option value="all">All Regions</option>
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Status Filter
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="screening">Screening</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview</option>
                  <option value="selected">Selected</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>

            {/* Nominations Table */}
            <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Applicant</th>
                      <th className="py-3.5 px-4">Position Applied</th>
                      <th className="py-3.5 px-4">Region & District</th>
                      <th className="py-3.5 px-4">Date Submitted</th>
                      <th className="py-3.5 px-4">Status Action</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredNominations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No nomination records matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredNominations.map((nom) => (
                        <tr key={nom.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-[#0E1E3B]">
                            <div className="font-bold text-sm">{nom.full_name}</div>
                            <div className="text-xs text-slate-500 font-mono">{nom.email}</div>
                            <div className="text-xs text-slate-500">{nom.phone_number}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {nom.position_applied}
                            </div>
                            {nom.region_if_regional_minister && (
                              <div className="text-xs text-[#C9A227] font-semibold mt-0.5">
                                Region: {nom.region_if_regional_minister}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <div>{nom.region}</div>
                            <div className="text-xs text-slate-500">{nom.district_municipality}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs">
                            {new Date(nom.submitted_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Badge status={nom.status} size="sm" />
                              <select
                                value={nom.status}
                                disabled={updatingId === nom.id}
                                onChange={(e) => handleStatusChange(nom.id, e.target.value)}
                                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none"
                              >
                                <option value="submitted">submitted</option>
                                <option value="screening">screening</option>
                                <option value="shortlisted">shortlisted</option>
                                <option value="interview">interview</option>
                                <option value="selected">selected</option>
                                <option value="declined">declined</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRecord(nom)}
                              className="text-xs h-7 px-2.5"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Members */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-[#0E1E3B] text-sm">Registered YRL Youth Members</h3>
              <span className="text-xs text-slate-500 font-mono">Total: {initialMembers.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Full Name</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Region</th>
                    <th className="py-3.5 px-4">District</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No member records found.
                      </td>
                    </tr>
                  ) : (
                    initialMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-[#0E1E3B]">{m.full_name}</td>
                        <td className="py-3 px-4 text-slate-700 font-mono">{m.phone}</td>
                        <td className="py-3 px-4 text-slate-600">{m.email || '—'}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{m.region}</td>
                        <td className="py-3 px-4 text-slate-600">{m.district || '—'}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(m.joined_at).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Read-Only Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Dossier Ref: {selectedRecord.id.substring(0, 8)}...
                </span>
                <h2 className="text-lg font-bold text-[#0E1E3B]">
                  {selectedRecord.full_name} — {selectedRecord.position_applied}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Read Only */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-800">
              {/* Status Update Bar */}
              <div className="p-3 bg-slate-100 rounded-[2px] flex items-center justify-between border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Current Review Status:</span>
                  <Badge status={selectedRecord.status} size="sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Update:</span>
                  <select
                    value={selectedRecord.status}
                    onChange={(e) => handleStatusChange(selectedRecord.id, e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 bg-white font-medium"
                  >
                    <option value="submitted">submitted</option>
                    <option value="screening">screening</option>
                    <option value="shortlisted">shortlisted</option>
                    <option value="interview">interview</option>
                    <option value="selected">selected</option>
                    <option value="declined">declined</option>
                  </select>
                </div>
              </div>

              {/* Personal & Contact Details */}
              <div className="border border-slate-200 rounded-[2px] p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  1. Personal & Contact Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-xs">Date of Birth</span>
                    <span className="font-medium">{selectedRecord.date_of_birth}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Gender</span>
                    <span className="font-medium">{selectedRecord.gender || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Phone</span>
                    <span className="font-medium font-mono">{selectedRecord.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">WhatsApp</span>
                    <span className="font-medium font-mono">{selectedRecord.whatsapp_number || 'Same'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-xs">Email</span>
                    <span className="font-medium font-mono">{selectedRecord.email}</span>
                  </div>
                </div>
              </div>

              {/* Geographic Info */}
              <div className="border border-slate-200 rounded-[2px] p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  2. Geographic Details
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-xs">Region</span>
                    <span className="font-medium">{selectedRecord.region}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">District/Municipality</span>
                    <span className="font-medium">{selectedRecord.district_municipality}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Town/Community</span>
                    <span className="font-medium">{selectedRecord.town_community}</span>
                  </div>
                </div>
              </div>

              {/* Professional Background */}
              <div className="border border-slate-200 rounded-[2px] p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  3. Professional & Educational Background
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block text-xs">Occupation</span>
                    <span className="font-medium">{selectedRecord.occupation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Institution / Organisation</span>
                    <span className="font-medium">{selectedRecord.organisation_institution || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Education Level</span>
                    <span className="font-medium">{selectedRecord.education_level}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Area of Study / Profession</span>
                    <span className="font-medium">{selectedRecord.area_of_study_profession}</span>
                  </div>
                </div>
              </div>

              {/* Leadership Questionnaire Responses */}
              <div className="border border-slate-200 rounded-[2px] p-4 space-y-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider border-b pb-1">
                  4. Leadership Vision & Governance Questions (Q1–Q6)
                </h4>
                <div>
                  <h5 className="font-bold text-xs text-slate-700">Q1: Why serve in Youth Republic Leadership?</h5>
                  <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.q1_why_serve}
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-700">Q2: Perspective on Leadership as Service</h5>
                  <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.q2_leadership_as_service}
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-700">Q3: Priorities for First 90 Days</h5>
                  <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.q3_first_90_days}
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-700">Q4: Grassroots Recruitment Plan</h5>
                  <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.q4_recruitment_plan}
                  </p>
                </div>
                {selectedRecord.q5_recruitment_estimate && (
                  <div>
                    <h5 className="font-bold text-xs text-slate-700">Q5: Estimated Recruitment Target</h5>
                    <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1">
                      {selectedRecord.q5_recruitment_estimate}
                    </p>
                  </div>
                )}
                {selectedRecord.q6_regional_building_plan && (
                  <div>
                    <h5 className="font-bold text-xs text-slate-700">Q6: Regional Building Plan</h5>
                    <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                      {selectedRecord.q6_regional_building_plan}
                    </p>
                  </div>
                )}
              </div>

              {/* Referee & Availability */}
              <div className="border border-slate-200 rounded-[2px] p-4 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-2 border-b pb-1">
                    5. Referee Details
                  </h4>
                  <div className="space-y-1">
                    <p><span className="text-slate-500">Name:</span> {selectedRecord.referee_name}</p>
                    <p><span className="text-slate-500">Relationship:</span> {selectedRecord.referee_relationship}</p>
                    <p><span className="text-slate-500">Phone:</span> {selectedRecord.referee_phone}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-2 border-b pb-1">
                    6. Availability & Commitments
                  </h4>
                  <div className="space-y-1">
                    <p><span className="text-slate-500">Weekly Hours:</span> {selectedRecord.weekly_hours}</p>
                    <p><span className="text-slate-500">Online Meetings:</span> {selectedRecord.willing_online_meetings ? 'Confirmed' : 'No'}</p>
                    <p><span className="text-slate-500">Physical Ground Activities:</span> {selectedRecord.willing_physical_activities ? 'Confirmed' : 'No'}</p>
                    <p><span className="text-slate-500">Declaration Agreed:</span> {selectedRecord.declaration_agreed ? 'Yes (Confirmed)' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  EDUCATION_LEVELS,
  AVAILABILITY_OPTIONS,
  ENGAGEMENT_INTEREST_OPTIONS,
} from '@/lib/validations/member';
import { updateMemberProfileAction } from '@/lib/actions/member';
import type { MemberRecord } from '@/lib/auth/types';

interface MemberProfileFormProps {
  member: MemberRecord;
}

export function MemberProfileForm({ member }: MemberProfileFormProps) {
  const router = useRouter();

  // Permitted editable fields
  const [phoneNumber, setPhoneNumber] = useState(member.phone_number || '');
  const [whatsappNumber, setWhatsappNumber] = useState(member.whatsapp_number || '');
  const [district, setDistrict] = useState(member.district_municipality || '');
  const [town, setTown] = useState(member.town_community || '');
  const [occupation, setOccupation] = useState(member.occupation || '');
  const [educationLevel, setEducationLevel] = useState(member.education_level || '');
  const [availability, setAvailability] = useState(member.availability || '');
  const [interests, setInterests] = useState<string[]>(
    member.engagement_interests || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleInterestToggle(interestId: string) {
    setInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        phone_number: phoneNumber,
        whatsapp_number: whatsappNumber ? whatsappNumber : null,
        district_municipality: district,
        town_community: town,
        occupation,
        education_level: educationLevel,
        availability,
        engagement_interests: interests,
      };

      const result = await updateMemberProfileAction(payload);
      if (!result.success) {
        setError(result.error || 'Failed to update profile. Please correct highlighted fields.');
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Your profile has been updated successfully.');
      setIsSubmitting(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while saving your changes.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Alert Messages */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-sm"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* SECTION 1: PROTECTED / IMMUTABLE SYSTEM FIELDS */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Protected Civic Identity (Read-Only)
            </h2>
          </div>
          <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            System Locked
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Official identity records (Member ID, Full Name, Email, Region, and Date of Birth) are locked to maintain governance integrity and regional chapter voting registries. To request a formal correction, please contact the YRL Secretariat.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Official Member ID</label>
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-mono font-bold text-[#0B1F3A]">
              {member.member_id}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Full Legal Name</label>
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-semibold text-slate-700">
              {member.full_name}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Registered Email</label>
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 truncate">
              {member.email}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Regional Chapter</label>
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-semibold text-slate-700">
              {member.region}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Date of Birth</label>
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700">
              {member.date_of_birth}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Membership Status</label>
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-semibold text-emerald-700">
              {member.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PERMITTED EDITABLE CIVIC INFORMATION */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="pb-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-[#0B1F3A]">
            Permitted Profile Information
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Update your contact numbers, residence, educational background, and availability.
          </p>
        </div>

        {/* Contact Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone_number"
              type="tel"
              required
              disabled={isSubmitting}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227] ${
                fieldErrors.phone_number ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            />
            {fieldErrors.phone_number && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.phone_number[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="whatsapp_number" className="block text-sm font-medium text-slate-700 mb-1">
              WhatsApp Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="whatsapp_number"
              type="tel"
              disabled={isSubmitting}
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g. 0244123456"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            />
          </div>
        </div>

        {/* Location Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="district" className="block text-sm font-medium text-slate-700 mb-1">
              District / Municipality <span className="text-red-500">*</span>
            </label>
            <input
              id="district"
              type="text"
              required
              disabled={isSubmitting}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227] ${
                fieldErrors.district_municipality ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            />
            {fieldErrors.district_municipality && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.district_municipality[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="town" className="block text-sm font-medium text-slate-700 mb-1">
              Town / Community <span className="text-red-500">*</span>
            </label>
            <input
              id="town"
              type="text"
              required
              disabled={isSubmitting}
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227] ${
                fieldErrors.town_community ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            />
            {fieldErrors.town_community && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.town_community[0]}</p>
            )}
          </div>
        </div>

        {/* Professional & Educational Background */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="occupation" className="block text-sm font-medium text-slate-700 mb-1">
              Current Occupation <span className="text-red-500">*</span>
            </label>
            <input
              id="occupation"
              type="text"
              required
              disabled={isSubmitting}
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227] ${
                fieldErrors.occupation ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            />
            {fieldErrors.occupation && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.occupation[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="education_level" className="block text-sm font-medium text-slate-700 mb-1">
              Highest Education Level <span className="text-red-500">*</span>
            </label>
            <select
              id="education_level"
              required
              disabled={isSubmitting}
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227] bg-white"
            >
              <option value="">Select Education Level</option>
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Weekly Availability */}
        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-slate-700 mb-1">
            Weekly Availability <span className="text-red-500">*</span>
          </label>
          <select
            id="availability"
            required
            disabled={isSubmitting}
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227] bg-white"
          >
            <option value="">Select Weekly Availability</option>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Civic Engagement Interests */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Areas of Civic Engagement <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ENGAGEMENT_INTEREST_OPTIONS.map((item) => {
              const checked = interests.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? 'border-[#C9A227] bg-amber-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={isSubmitting}
                    checked={checked}
                    onChange={() => handleInterestToggle(item.id)}
                    className="mt-0.5 rounded text-[#C9A227] focus:ring-[#C9A227]"
                  />
                  <span className="text-xs text-slate-700 font-medium">{item.label}</span>
                </label>
              );
            })}
          </div>
          {fieldErrors.engagement_interests && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.engagement_interests[0]}</p>
          )}
        </div>

        {/* Form Action Buttons */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/member">
            <Button variant="outline" size="sm" type="button">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Dashboard
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#0B1F3A] hover:bg-[#15345E] text-white px-6 font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

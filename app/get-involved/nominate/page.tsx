'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  ArrowRight,
  ArrowLeft,
  User,
  Briefcase,
  Layers,
  Sparkles,
  HeartHandshake,
  Printer,
  RotateCcw,
  Check,
  MapPin,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { Alert } from '@/components/ui/Alert';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Radio } from '@/components/ui/Radio';
import { GHANA_REGIONS, NATIONAL_POSITIONS } from '@/data/structure';
import { nominationSchema } from '@/lib/validations/nomination';
import { submitNomination } from '@/lib/actions/nominate';

export const EDUCATION_LEVELS = [
  { value: 'High School / WASSCE', label: 'High School / WASSCE' },
  { value: 'Diploma / HND', label: 'Diploma / HND' },
  { value: "Bachelor's Degree", label: "Bachelor's Degree" },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'Doctorate / PhD', label: 'Doctorate / PhD' },
  { value: 'Professional Qualification', label: 'Professional Qualification' },
  { value: 'Other', label: 'Other' },
];

export const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

export const WEEKLY_HOURS_OPTIONS = [
  { value: '5-10 hours/week', label: '5 – 10 hours per week (Foundational)' },
  { value: '10-15 hours/week', label: '10 – 15 hours per week (Recommended)' },
  { value: '15-20 hours/week', label: '15 – 20 hours per week (Active Committee)' },
  { value: '20+ hours/week', label: '20+ hours per week (High Dedication)' },
];

export const RECRUITMENT_TARGET_OPTIONS = [
  { value: '50-100 members', label: '50 – 100 members in first 90 days' },
  { value: '100-250 members', label: '100 – 250 members in first 90 days' },
  { value: '250-500 members', label: '250 – 500 members in first 90 days' },
  { value: '500+ members', label: '500+ members in first 90 days' },
];

export const REFEREE_RELATIONSHIPS = [
  { value: 'Academic Mentor / Lecturer', label: 'Academic Mentor / Lecturer' },
  { value: 'Employer / Supervisor', label: 'Employer / Supervisor' },
  { value: 'Community / Youth Leader', label: 'Community / Youth Leader' },
  { value: 'Professional Colleague', label: 'Professional Colleague' },
  { value: 'Religious / Civic Leader', label: 'Religious / Civic Leader' },
  { value: 'Other Professional Reference', label: 'Other Professional Reference' },
];

interface FormDataType {
  // Step 1: Personal & Position
  full_name: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  whatsapp_number: string;
  email: string;
  region: string;
  district_municipality: string;
  town_community: string;
  occupation: string;
  organisation_institution: string;
  education_level: string;
  area_of_study_profession: string;
  position_applied: string;

  // Step 2: Regional Minister Specifics (Conditional)
  region_if_regional_minister: string;
  q5_recruitment_estimate: string;
  q6_regional_building_plan: string;

  // Step 2: Leadership Experience (Optional)
  has_leadership_experience: boolean;
  prior_position: string;
  prior_organisation: string;
  prior_duration: string;
  prior_responsibilities: string;
  suitability_statement: string;
  proudest_achievement: string;

  // Step 2: Qualitative Vision Questions
  q1_why_serve: string;
  q2_leadership_as_service: string;
  q3_first_90_days: string;
  q4_recruitment_plan: string;

  // Step 2: Availability & Commitments
  weekly_hours: string;
  willing_online_meetings: boolean;
  willing_physical_activities: boolean;

  // Step 2: Referee Information
  referee_name: string;
  referee_relationship: string;
  referee_phone: string;

  // Step 3: Declaration Agreement
  declaration_agreed: boolean;

  // Anti-abuse honeypot
  honeypot: string;
}

const initialFormData: FormDataType = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  phone_number: '',
  whatsapp_number: '',
  email: '',
  region: '',
  district_municipality: '',
  town_community: '',
  occupation: '',
  organisation_institution: '',
  education_level: '',
  area_of_study_profession: '',
  position_applied: '',

  region_if_regional_minister: '',
  q5_recruitment_estimate: '',
  q6_regional_building_plan: '',

  has_leadership_experience: false,
  prior_position: '',
  prior_organisation: '',
  prior_duration: '',
  prior_responsibilities: '',
  suitability_statement: '',
  proudest_achievement: '',

  q1_why_serve: '',
  q2_leadership_as_service: '',
  q3_first_90_days: '',
  q4_recruitment_plan: '',

  weekly_hours: '',
  willing_online_meetings: false,
  willing_physical_activities: false,

  referee_name: '',
  referee_relationship: '',
  referee_phone: '',

  declaration_agreed: false,
  honeypot: '',
};

export default function NominatePage() {
  // Step management: 1 = Profile & Position, 2 = Vision & Commitment, 3 = Review & Confirm, 4 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form data state
  const [formData, setFormData] = useState<FormDataType>(initialFormData);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Mock submission confirmation data
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Age calculation helper
  const calculateAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculatedAge = calculateAge(formData.date_of_birth);

  // Field change handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCheckboxChange = (name: keyof FormDataType, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateSingleField(name as keyof FormDataType);
  };

  // Single field validator
  const validateSingleField = (name: keyof FormDataType): string => {
    let error = '';
    const val = formData[name];

    switch (name) {
      // Step 1
      case 'full_name':
        if (typeof val === 'string' && !val.trim()) error = 'Full Name is required';
        else if (typeof val === 'string' && val.trim().length < 2) error = 'Enter at least 2 characters';
        break;

      case 'date_of_birth':
        if (!val) {
          error = 'Date of Birth is required';
        } else if (typeof val === 'string') {
          const age = calculateAge(val);
          if (age === null) {
            error = 'Please enter a valid date of birth';
          } else if (age < 18) {
            error = `Applicants must be at least 18 years old (Current age: ${age})`;
          } else if (age > 40) {
            error = `Applicants must be 40 years of age or younger (Current age: ${age})`;
          }
        }
        break;

      case 'phone_number':
        if (typeof val === 'string' && !val.trim()) error = 'Phone Number is required';
        else if (typeof val === 'string' && val.trim().length < 8)
          error = 'Enter a valid phone number (minimum 8 digits)';
        break;

      case 'email':
        if (typeof val === 'string' && !val.trim()) {
          error = 'Email Address is required';
        } else if (
          typeof val === 'string' &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
        ) {
          error = 'Enter a valid email address';
        }
        break;

      case 'region':
        if (!val) error = 'Please select your region of residence';
        break;

      case 'district_municipality':
        if (typeof val === 'string' && !val.trim()) error = 'District or Municipality is required';
        else if (typeof val === 'string' && val.trim().length < 2) error = 'Enter at least 2 characters';
        break;

      case 'town_community':
        if (typeof val === 'string' && !val.trim()) error = 'Town or Community is required';
        else if (typeof val === 'string' && val.trim().length < 2) error = 'Enter at least 2 characters';
        break;

      case 'occupation':
        if (typeof val === 'string' && !val.trim()) error = 'Current Occupation is required';
        else if (typeof val === 'string' && val.trim().length < 2) error = 'Enter at least 2 characters';
        break;

      case 'education_level':
        if (!val) error = 'Please select your highest educational level';
        break;

      case 'area_of_study_profession':
        if (typeof val === 'string' && !val.trim()) error = 'Area of study or profession is required';
        else if (typeof val === 'string' && val.trim().length < 2) error = 'Enter at least 2 characters';
        break;

      case 'position_applied':
        if (!val) error = 'Please select the leadership position you are applying for';
        break;

      // Step 2: Regional Minister Conditionals
      case 'region_if_regional_minister':
        if (formData.position_applied === 'Interim Regional Minister' && !val) {
          error = 'Select the region you wish to serve as Interim Regional Minister';
        }
        break;

      case 'q5_recruitment_estimate':
        if (formData.position_applied === 'Interim Regional Minister' && !val) {
          error = 'Select an estimated number of members for your regional recruitment target';
        }
        break;

      case 'q6_regional_building_plan':
        if (
          formData.position_applied === 'Interim Regional Minister' &&
          typeof val === 'string' &&
          val.trim().length < 20
        ) {
          error = 'Provide your regional executive building plan (minimum 20 characters)';
        }
        break;

      // Step 2: Core Qualitative Questions
      case 'q1_why_serve':
        if (typeof val === 'string' && val.trim().length < 20) {
          error = 'Please explain why you wish to serve in YRL (minimum 20 characters)';
        }
        break;

      case 'q2_leadership_as_service':
        if (typeof val === 'string' && val.trim().length < 20) {
          error = 'Share your perspective on leadership as service (minimum 20 characters)';
        }
        break;

      case 'q3_first_90_days':
        if (typeof val === 'string' && val.trim().length < 20) {
          error = 'Outline your priorities for the first 90 days (minimum 20 characters)';
        }
        break;

      case 'q4_recruitment_plan':
        if (typeof val === 'string' && val.trim().length < 20) {
          error = 'Describe your grassroots recruitment plan (minimum 20 characters)';
        }
        break;

      // Step 2: Commitments & References
      case 'weekly_hours':
        if (!val) error = 'Specify the weekly hours you can dedicate to this role';
        break;

      case 'willing_online_meetings':
        if (!val) error = 'You must confirm willingness to attend online meetings';
        break;

      case 'willing_physical_activities':
        if (!val) error = 'You must confirm willingness to engage in physical activities';
        break;

      case 'referee_name':
        if (typeof val === 'string' && !val.trim()) error = 'Enter your referee full name';
        else if (typeof val === 'string' && val.trim().length < 2) error = 'Enter at least 2 characters';
        break;

      case 'referee_relationship':
        if (typeof val === 'string' && !val.trim()) error = 'Specify your relationship to the referee';
        else if (typeof val === 'string' && val.trim().length < 2) error = 'Enter at least 2 characters';
        break;

      case 'referee_phone':
        if (typeof val === 'string' && !val.trim()) error = 'Enter your referee phone number';
        else if (typeof val === 'string' && val.trim().length < 8)
          error = 'Enter a valid phone number (minimum 8 digits)';
        break;

      // Step 3: Declaration
      case 'declaration_agreed':
        if (!val) error = 'You must agree to the declaration to submit your nomination';
        break;

      default:
        break;
    }

    setErrors((prev) => {
      if (error) return { ...prev, [name]: error };
      const next = { ...prev };
      delete next[name];
      return next;
    });

    return error;
  };

  // Step 1 Validator
  const validateStep1 = (): boolean => {
    const step1Fields: (keyof FormDataType)[] = [
      'full_name',
      'date_of_birth',
      'phone_number',
      'email',
      'region',
      'district_municipality',
      'town_community',
      'occupation',
      'education_level',
      'area_of_study_profession',
      'position_applied',
    ];

    const stepErrors: Record<string, string> = {};
    const touchedFields: Record<string, boolean> = {};

    step1Fields.forEach((field) => {
      touchedFields[field] = true;
      const err = validateSingleField(field);
      if (err) stepErrors[field] = err;
    });

    setTouched((prev) => ({ ...prev, ...touchedFields }));
    return Object.keys(stepErrors).length === 0;
  };

  // Step 2 Validator
  const validateStep2 = (): boolean => {
    const step2Fields: (keyof FormDataType)[] = [
      'q1_why_serve',
      'q2_leadership_as_service',
      'q3_first_90_days',
      'q4_recruitment_plan',
      'weekly_hours',
      'willing_online_meetings',
      'willing_physical_activities',
      'referee_name',
      'referee_relationship',
      'referee_phone',
    ];

    if (formData.position_applied === 'Interim Regional Minister') {
      step2Fields.push(
        'region_if_regional_minister',
        'q5_recruitment_estimate',
        'q6_regional_building_plan'
      );
    }

    const stepErrors: Record<string, string> = {};
    const touchedFields: Record<string, boolean> = {};

    step2Fields.forEach((field) => {
      touchedFields[field] = true;
      const err = validateSingleField(field);
      if (err) stepErrors[field] = err;
    });

    setTouched((prev) => ({ ...prev, ...touchedFields }));
    return Object.keys(stepErrors).length === 0;
  };

  // Navigation handlers
  const handleProceedToStep2 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 500, behavior: 'smooth' });
    }
  };

  const handleProceedToStep3 = () => {
    if (validateStep2()) {
      setCurrentStep(3);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 500, behavior: 'smooth' });
    }
  };

  // Final Confirmation / Server Action Submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!formData.declaration_agreed) {
      setErrors((prev) => ({
        ...prev,
        declaration_agreed: 'You must agree to the declaration to complete your nomination.',
      }));
      setTouched((prev) => ({ ...prev, declaration_agreed: true }));
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        ...formData,
        region_if_regional_minister:
          formData.position_applied === 'Interim Regional Minister' && formData.region_if_regional_minister
            ? formData.region_if_regional_minister
            : null,
      };

      const result = await submitNomination(submissionData);

      if (result.success && result.referenceId) {
        const formattedDate = new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        setConfirmationNumber(result.referenceId);
        setSubmissionDate(formattedDate);
        setCurrentStep(4);
        window.scrollTo({ top: 300, behavior: 'smooth' });
      } else {
        if (result.fieldErrors) {
          const mappedErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(result.fieldErrors)) {
            if (msgs && msgs.length > 0) {
              mappedErrors[key] = msgs[0];
            }
          }
          setErrors(mappedErrors);
        }
        if (result.error) {
          setServerError(result.error);
        }
      }
    } catch (err) {
      setServerError('A network or server error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setTouched({});
    setConfirmationNumber('');
    setServerError(null);
    setIsSubmitting(false);
    setCurrentStep(1);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  // Options
  const positionOptions = [
    ...NATIONAL_POSITIONS.map((p) => ({
      value: p.title,
      label: `${p.title} (National ${p.category})`,
    })),
    {
      value: 'Interim Regional Minister',
      label: 'Interim Regional Minister (16 Regions)',
    },
  ];

  const regionOptions = GHANA_REGIONS.map((r) => ({
    value: r.name,
    label: `${r.name} Region`,
  }));

  // Live character counter helper component
  const CharacterCounter = ({ value, min = 20 }: { value: string; min?: number }) => {
    const currentLength = value?.trim().length || 0;
    const isMet = currentLength >= min;

    return (
      <div className="flex items-center justify-between text-xs mt-1">
        <span
          className={
            isMet ? 'text-emerald-700 font-semibold flex items-center gap-1' : 'text-slate-500'
          }
        >
          {isMet ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Minimum length reached ({currentLength} characters)
            </>
          ) : (
            `Required minimum: ${min} characters`
          )}
        </span>
        <span
          className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
            isMet ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {currentLength} / {min}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* ========================================================================= */}
      {/* PAGE HERO HEADER                                                          */}
      {/* ========================================================================= */}
      <section className="relative bg-[#0B1F3A] text-white pt-12 pb-14 sm:pt-16 sm:pb-18 overflow-hidden border-b border-[#C9A227]/20">
        <div
          className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <Container size="lg" className="relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#C9A227]/40 text-xs sm:text-sm font-semibold text-[#FCD116]">
              <Shield className="w-3.5 h-3.5" />
              <span>Interim Leadership Application</span>
            </div>

            <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-tight">
              Nominate Yourself for Interim Leadership
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Step forward to serve Ghana in our foundational interim leadership setup. Open to
              passionate, ethical young Ghanaians aged 18–40 across all 16 administrative regions.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Award className="w-3.5 h-3.5 text-[#FCD116]" />
                <span className="text-white font-medium">100% Free Application</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <Clock className="w-3.5 h-3.5 text-[#006B3F]" />
                <span className="text-white font-medium">Ages 18–40 Eligible</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-[4px] border border-white/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-white font-medium">No Prior Political Experience Needed</span>
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 1: PERSISTENT NOTICE BANNER                                       */}
      {/* ========================================================================= */}
      <section className="bg-slate-50 border-b border-slate-200 py-6 sm:py-8">
        <Container size="lg">
          <NoticeBanner variant="card" />
        </Container>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: MULTI-STEP NOMINATION FORM                                     */}
      {/* ========================================================================= */}
      <Section background="white" spacing="lg">
        <Container size="md">
          <div className="space-y-8">
            {/* Step / Progress Indicator */}
            {currentStep < 4 && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-bold text-[#C9A227] uppercase tracking-wider">
                      Application Workflow
                    </span>
                    <h2 className="font-heading font-bold text-lg text-[#0B1F3A]">
                      {currentStep === 1 && 'Step 1: Profile & Position Selection'}
                      {currentStep === 2 && 'Step 2: Leadership, Vision & Commitment'}
                      {currentStep === 3 && 'Step 3: Review & Final Declaration'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0B1F3A] text-white">
                      Step {currentStep} of 3
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {currentStep === 1
                        ? 'Profile Details'
                        : currentStep === 2
                        ? 'Leadership Essays'
                        : 'Final Verification'}
                    </span>
                  </div>
                </div>

                {/* Visual Step Tracker */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  {/* Step 1 Pill */}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className={`p-2.5 rounded text-left transition-all flex items-center gap-2.5 ${
                      currentStep === 1
                        ? 'bg-white border-2 border-[#0B1F3A] shadow-sm'
                        : currentStep > 1
                        ? 'bg-emerald-50 border border-emerald-300 hover:bg-emerald-100/60'
                        : 'bg-slate-100 border border-slate-200 opacity-60'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        currentStep === 1
                          ? 'bg-[#0B1F3A] text-white'
                          : currentStep > 1
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0B1F3A] truncate">Profile &amp; Position</p>
                      <p className="text-[10px] text-slate-500">
                        {currentStep > 1 ? 'Completed' : 'Active'}
                      </p>
                    </div>
                  </button>

                  {/* Step 2 Pill */}
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) setCurrentStep(2);
                    }}
                    className={`p-2.5 rounded text-left transition-all flex items-center gap-2.5 ${
                      currentStep === 2
                        ? 'bg-white border-2 border-[#0B1F3A] shadow-sm'
                        : currentStep > 2
                        ? 'bg-emerald-50 border border-emerald-300 hover:bg-emerald-100/60'
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        currentStep === 2
                          ? 'bg-[#0B1F3A] text-white'
                          : currentStep > 2
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0B1F3A] truncate">Vision &amp; Essays</p>
                      <p className="text-[10px] text-slate-500">
                        {currentStep === 2 ? 'Active' : currentStep > 2 ? 'Completed' : 'Next Step'}
                      </p>
                    </div>
                  </button>

                  {/* Step 3 Pill */}
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1() && validateStep2()) setCurrentStep(3);
                    }}
                    className={`p-2.5 rounded text-left transition-all flex items-center gap-2.5 ${
                      currentStep === 3
                        ? 'bg-white border-2 border-[#0B1F3A] shadow-sm'
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        currentStep === 3 ? 'bg-[#0B1F3A] text-white' : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      3
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0B1F3A] truncate">Review &amp; Submit</p>
                      <p className="text-[10px] text-slate-500">
                        {currentStep === 3 ? 'Active' : 'Final Step'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 1: PERSONAL & POSITION (Part 1 Reused & Polished)            */}
            {/* ================================================================= */}
            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Card 1: Personal Information */}
                <Card variant="bordered" accent="navy" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#0B1F3A]/10 border border-[#0B1F3A]/20 flex items-center justify-center text-[#0B1F3A]">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">1. Personal Information</CardTitle>
                        <CardDescription className="text-xs">
                          Legal identity, date of birth, contact details, and current residential location.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name" required>
                        Full Name (as on official ID)
                      </Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        required
                        placeholder="e.g. Kwame Mensah"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.full_name ? errors.full_name : undefined}
                        helperText="Enter your official first, middle (if any), and last name."
                      />
                    </div>

                    {/* Date of Birth & Gender Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="date_of_birth" required>
                          Date of Birth
                        </Label>
                        <Input
                          id="date_of_birth"
                          name="date_of_birth"
                          type="date"
                          required
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          error={touched.date_of_birth ? errors.date_of_birth : undefined}
                          helperText={
                            calculatedAge !== null && !errors.date_of_birth
                              ? `Verified age: ${calculatedAge} years (Eligible)`
                              : 'Applicants must be strictly aged 18 to 40.'
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="gender">Gender (Optional)</Label>
                        <Select
                          id="gender"
                          name="gender"
                          options={GENDER_OPTIONS}
                          placeholder="Select gender (optional)"
                          value={formData.gender}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                        />
                      </div>
                    </div>

                    {/* Phone & WhatsApp Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone_number" required>
                          Primary Phone Number
                        </Label>
                        <Input
                          id="phone_number"
                          name="phone_number"
                          type="tel"
                          required
                          placeholder="e.g. 024 123 4567"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          error={touched.phone_number ? errors.phone_number : undefined}
                          helperText="Active mobile line for communication."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="whatsapp_number">WhatsApp Number (Optional)</Label>
                        <Input
                          id="whatsapp_number"
                          name="whatsapp_number"
                          type="tel"
                          placeholder="e.g. 024 123 4567"
                          value={formData.whatsapp_number}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          helperText="Optional, if different from your primary line."
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" required>
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="e.g. kwame.mensah@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.email ? errors.email : undefined}
                        helperText="We will send nomination updates to this email."
                      />
                    </div>

                    {/* Region, District, Town Grid */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                        Residential Location
                      </p>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="region" required>
                            Region of Residence
                          </Label>
                          <Select
                            id="region"
                            name="region"
                            required
                            options={regionOptions}
                            placeholder="Select your region"
                            value={formData.region}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            error={touched.region ? errors.region : undefined}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="district_municipality" required>
                              District / Municipality
                            </Label>
                            <Input
                              id="district_municipality"
                              name="district_municipality"
                              required
                              placeholder="e.g. Accra Metropolitan"
                              value={formData.district_municipality}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              error={
                                touched.district_municipality
                                  ? errors.district_municipality
                                  : undefined
                              }
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="town_community" required>
                              Town / Community
                            </Label>
                            <Input
                              id="town_community"
                              name="town_community"
                              required
                              placeholder="e.g. Osu / East Legon"
                              value={formData.town_community}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              error={touched.town_community ? errors.town_community : undefined}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Professional Information */}
                <Card variant="bordered" accent="gold" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#C9A227]/10 border border-[#C9A227]/25 flex items-center justify-center text-[#C9A227]">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">2. Professional Background</CardTitle>
                        <CardDescription className="text-xs">
                          Your educational background, current vocation, and area of expertise.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-5">
                    {/* Occupation & Organisation Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="occupation" required>
                          Current Occupation / Role
                        </Label>
                        <Input
                          id="occupation"
                          name="occupation"
                          required
                          placeholder="e.g. Teacher, Entrepreneur, Civil Engineer"
                          value={formData.occupation}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          error={touched.occupation ? errors.occupation : undefined}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="organisation_institution">
                          Organisation / Institution (Optional)
                        </Label>
                        <Input
                          id="organisation_institution"
                          name="organisation_institution"
                          placeholder="e.g. Ghana Education Service, Self-employed"
                          value={formData.organisation_institution}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          helperText="Optional current employer or educational institution."
                        />
                      </div>
                    </div>

                    {/* Education Level & Area of Study Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="education_level" required>
                          Highest Educational Level
                        </Label>
                        <Select
                          id="education_level"
                          name="education_level"
                          required
                          options={EDUCATION_LEVELS}
                          placeholder="Select highest education level"
                          value={formData.education_level}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          error={touched.education_level ? errors.education_level : undefined}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="area_of_study_profession" required>
                          Area of Study / Profession
                        </Label>
                        <Input
                          id="area_of_study_profession"
                          name="area_of_study_profession"
                          required
                          placeholder="e.g. Economics, Law, Nursing, Computer Science"
                          value={formData.area_of_study_profession}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          error={
                            touched.area_of_study_profession
                              ? errors.area_of_study_profession
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Position Selection */}
                <Card variant="bordered" accent="green" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#006B3F]/10 border border-[#006B3F]/20 flex items-center justify-center text-[#006B3F]">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">3. Position Applied For</CardTitle>
                        <CardDescription className="text-xs">
                          Select from the 11 approved national ministerial portfolios or the 16 interim regional ministers.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="position_applied" required>
                        Select Leadership Position
                      </Label>
                      <Select
                        id="position_applied"
                        name="position_applied"
                        required
                        options={positionOptions}
                        placeholder="Choose an interim position..."
                        value={formData.position_applied}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.position_applied ? errors.position_applied : undefined}
                        helperText="All positions are voluntary civic leadership roles. Selected on merit without partisan prerequisites."
                      />
                    </div>

                    {formData.position_applied === 'Interim Regional Minister' && (
                      <div className="p-4 rounded-lg bg-[#006B3F]/5 border border-[#006B3F]/20 flex items-start gap-3 text-xs text-[#006B3F]">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <strong className="font-semibold text-sm">
                            Interim Regional Minister Portfolio Selected
                          </strong>
                          <p className="text-slate-600 leading-relaxed">
                            You will represent and mobilize youth within one of Ghana&apos;s 16 regions.
                            Step 2 will request your specific regional deployment preference, membership
                            recruitment goals, and regional coordination plan.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 1 Error Feedback */}
                {Object.keys(errors).length > 0 && (
                  <Alert variant="error">
                    <div>
                      <strong className="block font-bold">Please complete the required fields:</strong>
                      <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                        {Object.entries(errors).map(([key, err]) => (
                          <li key={key}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </Alert>
                )}

                {/* Step 1 Actions */}
                <div className="flex items-center justify-end pt-2">
                  <Button
                    type="button"
                    variant="gold"
                    size="lg"
                    onClick={handleProceedToStep2}
                    className="font-bold text-base shadow-sm px-8"
                  >
                    <span>Continue to Step 2: Vision &amp; Essays</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 2: LEADERSHIP, VISION & COMMITMENT (Part 2 Core)             */}
            {/* ================================================================= */}
            {currentStep === 2 && (
              <div className="space-y-8">
                {/* Conditional Card: Regional Minister Specifics */}
                {formData.position_applied === 'Interim Regional Minister' && (
                  <Card variant="bordered" accent="green" className="bg-white">
                    <CardHeader className="border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-[#006B3F]/10 border border-[#006B3F]/20 flex items-center justify-center text-[#006B3F]">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg sm:text-xl">
                            Regional Minister Assignment &amp; Mobilization Plan
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Specify which administrative region you seek to lead, your 90-day recruitment target, and mobilization strategy.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-5">
                      {/* Region & Recruitment Target Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="region_if_regional_minister" required>
                            Regional Deployment Choice
                          </Label>
                          <Select
                            id="region_if_regional_minister"
                            name="region_if_regional_minister"
                            required
                            options={regionOptions}
                            placeholder="Select region to represent"
                            value={formData.region_if_regional_minister}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            error={
                              touched.region_if_regional_minister
                                ? errors.region_if_regional_minister
                                : undefined
                            }
                            helperText="Which of the 16 regions do you intend to lead?"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="q5_recruitment_estimate" required>
                            90-Day Youth Recruitment Target
                          </Label>
                          <Select
                            id="q5_recruitment_estimate"
                            name="q5_recruitment_estimate"
                            required
                            options={RECRUITMENT_TARGET_OPTIONS}
                            placeholder="Select estimated recruitment target"
                            value={formData.q5_recruitment_estimate}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            error={
                              touched.q5_recruitment_estimate
                                ? errors.q5_recruitment_estimate
                                : undefined
                            }
                            helperText="Realistic membership target for your region."
                          />
                        </div>
                      </div>

                      {/* Regional Mobilization Plan */}
                      <div className="space-y-1.5">
                        <Label htmlFor="q6_regional_building_plan" required>
                          Regional Executive Building &amp; Mobilization Strategy
                        </Label>
                        <Textarea
                          id="q6_regional_building_plan"
                          name="q6_regional_building_plan"
                          rows={3}
                          required
                          placeholder="How will you set up regional district coordinators, connect with youth groups, and establish local YRL branches?"
                          value={formData.q6_regional_building_plan}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          error={
                            touched.q6_regional_building_plan
                              ? errors.q6_regional_building_plan
                              : undefined
                          }
                        />
                        <CharacterCounter value={formData.q6_regional_building_plan} min={20} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Card 4: Leadership Background (Optional Experience Toggle) */}
                <Card variant="bordered" accent="gold" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#C9A227]/10 border border-[#C9A227]/25 flex items-center justify-center text-[#C9A227]">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">
                          4. Prior Leadership Experience (Optional)
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Prior political experience is NOT required. Passion, character, and integrity are our primary criteria.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-5">
                    {/* Toggle: Do you have prior leadership experience? */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                      <Label className="text-sm font-semibold text-slate-800">
                        Have you held formal leadership positions before? (e.g. Student council, youth group, club, NGO, or workplace)
                      </Label>
                      <div className="flex items-center gap-6">
                        <Radio
                          id="exp_yes"
                          name="has_leadership_experience_radio"
                          checked={formData.has_leadership_experience === true}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, has_leadership_experience: true }))
                          }
                          label="Yes, I have prior leadership experience"
                        />
                        <Radio
                          id="exp_no"
                          name="has_leadership_experience_radio"
                          checked={formData.has_leadership_experience === false}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, has_leadership_experience: false }))
                          }
                          label="No, this is my first formal leadership application"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Selecting &ldquo;No&rdquo; will in no way disadvantage your application. YRL exists to discover and nurture new generation leaders.
                      </p>
                    </div>

                    {/* Conditional Fields if Leadership Experience is Yes */}
                    {formData.has_leadership_experience && (
                      <div className="space-y-4 pt-2 border-t border-slate-100 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="prior_position">Prior Leadership Role / Title</Label>
                            <Input
                              id="prior_position"
                              name="prior_position"
                              placeholder="e.g. SRC President, Youth Fellowship Coordinator"
                              value={formData.prior_position}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="prior_organisation">Organisation / Community Group</Label>
                            <Input
                              id="prior_organisation"
                              name="prior_organisation"
                              placeholder="e.g. University of Ghana, Local Youth Association"
                              value={formData.prior_organisation}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="prior_duration">Duration of Service</Label>
                            <Input
                              id="prior_duration"
                              name="prior_duration"
                              placeholder="e.g. 1 year (2023 – 2024)"
                              value={formData.prior_duration}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="proudest_achievement">Proudest Civic Achievement</Label>
                            <Input
                              id="proudest_achievement"
                              name="proudest_achievement"
                              placeholder="e.g. Organized clean water outreach for 200 households"
                              value={formData.proudest_achievement}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="prior_responsibilities">
                            Brief Summary of Responsibilities
                          </Label>
                          <Textarea
                            id="prior_responsibilities"
                            name="prior_responsibilities"
                            rows={2}
                            placeholder="Summarize your key responsibilities and teams managed..."
                            value={formData.prior_responsibilities}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                          />
                        </div>
                      </div>
                    )}

                    {/* Statement of Suitability (Optional for all) */}
                    <div className="space-y-1.5 pt-2">
                      <Label htmlFor="suitability_statement">
                        Statement of Suitability (Optional)
                      </Label>
                      <Textarea
                        id="suitability_statement"
                        name="suitability_statement"
                        rows={3}
                        placeholder="What specific skills, life experiences, or perspectives make you well-suited to this portfolio?"
                        value={formData.suitability_statement}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        helperText="Highlight any special abilities, languages spoken, community relationships, or technical competencies."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 5: Core Vision & Civic Service Essays */}
                <Card variant="bordered" accent="navy" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#0B1F3A]/10 border border-[#0B1F3A]/20 flex items-center justify-center text-[#0B1F3A]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">
                          5. Vision &amp; Civic Reflections
                        </CardTitle>
                        <CardDescription className="text-xs">
                          All qualitative questions are mandatory (minimum 20 characters each). Take time to articulate your values and goals.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-6">
                    {/* Q1: Why Serve */}
                    <div className="space-y-1.5">
                      <Label htmlFor="q1_why_serve" required>
                        1. Why do you wish to serve in the Youth Republic Leadership?
                      </Label>
                      <Textarea
                        id="q1_why_serve"
                        name="q1_why_serve"
                        rows={3}
                        required
                        placeholder="Explain your motivation, your commitment to youth empowerment, and what inspires you to step up..."
                        value={formData.q1_why_serve}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.q1_why_serve ? errors.q1_why_serve : undefined}
                      />
                      <CharacterCounter value={formData.q1_why_serve} min={20} />
                    </div>

                    {/* Q2: Leadership as Service */}
                    <div className="space-y-1.5">
                      <Label htmlFor="q2_leadership_as_service" required>
                        2. What does &ldquo;Leadership is service, not privilege&rdquo; mean to you in practice?
                      </Label>
                      <Textarea
                        id="q2_leadership_as_service"
                        name="q2_leadership_as_service"
                        rows={3}
                        required
                        placeholder="Reflect on humility, accountability, servant leadership, and ethical stewardship in public life..."
                        value={formData.q2_leadership_as_service}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={
                          touched.q2_leadership_as_service
                            ? errors.q2_leadership_as_service
                            : undefined
                        }
                      />
                      <CharacterCounter value={formData.q2_leadership_as_service} min={20} />
                    </div>

                    {/* Q3: First 90 Days */}
                    <div className="space-y-1.5">
                      <Label htmlFor="q3_first_90_days" required>
                        3. What would be your immediate priorities and actionable goals for your first 90 days?
                      </Label>
                      <Textarea
                        id="q3_first_90_days"
                        name="q3_first_90_days"
                        rows={3}
                        required
                        placeholder="Outline 2 to 3 concrete initiatives or benchmarks you will execute during the interim startup phase..."
                        value={formData.q3_first_90_days}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.q3_first_90_days ? errors.q3_first_90_days : undefined}
                      />
                      <CharacterCounter value={formData.q3_first_90_days} min={20} />
                    </div>

                    {/* Q4: Recruitment Plan */}
                    <div className="space-y-1.5">
                      <Label htmlFor="q4_recruitment_plan" required>
                        4. How will you mobilize, recruit, and engage young Ghanaians into YRL?
                      </Label>
                      <Textarea
                        id="q4_recruitment_plan"
                        name="q4_recruitment_plan"
                        rows={3}
                        required
                        placeholder="Describe your strategy for community outreach, social media mobilization, school/campus engagement, or word-of-mouth..."
                        value={formData.q4_recruitment_plan}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.q4_recruitment_plan ? errors.q4_recruitment_plan : undefined}
                      />
                      <CharacterCounter value={formData.q4_recruitment_plan} min={20} />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 6: Availability & Civic Commitments */}
                <Card variant="bordered" accent="gold" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#C9A227]/10 border border-[#C9A227]/25 flex items-center justify-center text-[#C9A227]">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">
                          6. Availability &amp; Civic Dedication
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Confirm your realistic time commitments and active participation requirements.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-5">
                    {/* Weekly Hours */}
                    <div className="space-y-1.5">
                      <Label htmlFor="weekly_hours" required>
                        Weekly Dedicated Hours
                      </Label>
                      <Select
                        id="weekly_hours"
                        name="weekly_hours"
                        required
                        options={WEEKLY_HOURS_OPTIONS}
                        placeholder="Select your weekly time dedication"
                        value={formData.weekly_hours}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.weekly_hours ? errors.weekly_hours : undefined}
                        helperText="Time dedicated to planning, meetings, committee work, and youth mobilization."
                      />
                    </div>

                    {/* Commitments Checkboxes */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3.5">
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Mandatory Operational Confirmations
                      </p>

                      <Checkbox
                        id="willing_online_meetings"
                        name="willing_online_meetings"
                        checked={formData.willing_online_meetings}
                        onChange={(e) =>
                          handleCheckboxChange('willing_online_meetings', e.target.checked)
                        }
                        label="I confirm my willingness to attend virtual leadership briefings and committee working sessions."
                        description="Regular online video/voice calls for policy planning, regional reporting, and cross-portfolio coordination."
                        error={touched.willing_online_meetings ? errors.willing_online_meetings : undefined}
                      />

                      <Checkbox
                        id="willing_physical_activities"
                        name="willing_physical_activities"
                        checked={formData.willing_physical_activities}
                        onChange={(e) =>
                          handleCheckboxChange('willing_physical_activities', e.target.checked)
                        }
                        label="I confirm my willingness to participate in grassroots civic events and regional outreach."
                        description="Ground-level youth forums, town halls, community clean-ups, and civic workshops where feasible."
                        error={
                          touched.willing_physical_activities
                            ? errors.willing_physical_activities
                            : undefined
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 7: Character / Professional Reference */}
                <Card variant="bordered" accent="green" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#006B3F]/10 border border-[#006B3F]/20 flex items-center justify-center text-[#006B3F]">
                        <HeartHandshake className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">
                          7. Character / Professional Reference
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Provide one credible mentor, lecturer, supervisor, or community leader who can vouch for your integrity.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="referee_name" required>
                          Referee Full Name
                        </Label>
                        <Input
                          id="referee_name"
                          name="referee_name"
                          required
                          placeholder="e.g. Dr. Abena Osei"
                          value={formData.referee_name}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          error={touched.referee_name ? errors.referee_name : undefined}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="referee_relationship" required>
                          Professional Relationship
                        </Label>
                        <Select
                          id="referee_relationship"
                          name="referee_relationship"
                          required
                          options={REFEREE_RELATIONSHIPS}
                          placeholder="Select relationship"
                          value={formData.referee_relationship}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          error={
                            touched.referee_relationship ? errors.referee_relationship : undefined
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="referee_phone" required>
                        Referee Phone Number
                      </Label>
                      <Input
                        id="referee_phone"
                        name="referee_phone"
                        type="tel"
                        required
                        placeholder="e.g. 024 987 6543"
                        value={formData.referee_phone}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        error={touched.referee_phone ? errors.referee_phone : undefined}
                        helperText="We will only contact your referee if your application is shortlisted for interim screening."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2 Error Feedback */}
                {Object.keys(errors).length > 0 && (
                  <Alert variant="error">
                    <div>
                      <strong className="block font-bold">Please complete the required fields:</strong>
                      <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                        {Object.entries(errors).map(([key, err]) => (
                          <li key={key}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </Alert>
                )}

                {/* Step 2 Actions */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setCurrentStep(1);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span>Back to Step 1</span>
                  </Button>

                  <Button
                    type="button"
                    variant="gold"
                    size="lg"
                    onClick={handleProceedToStep3}
                    className="w-full sm:w-auto font-bold text-base shadow-sm px-8"
                  >
                    <span>Continue to Step 3: Review &amp; Declaration</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 3: REVIEW & FINAL DECLARATION                                */}
            {/* ================================================================= */}
            {currentStep === 3 && (
              <form onSubmit={handleFinalSubmit} className="space-y-8">
                {/* Honeypot field (hidden from real users) */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="honeypot"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.honeypot}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Summary Review Card */}
                <Card variant="bordered" accent="navy" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-[#0B1F3A]/10 border border-[#0B1F3A]/20 flex items-center justify-center text-[#0B1F3A]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg sm:text-xl">
                            Review Your Interim Nomination
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Verify all your details carefully before submitting your formal civic nomination.
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="default" size="sm">
                        Pre-Submission Review
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-6">
                    {/* Review Section 1: Profile & Position */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                          1. Profile &amp; Applied Portfolio
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-xs font-semibold text-[#C9A227] hover:underline"
                        >
                          Edit Profile
                        </button>
                      </div>

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <dt className="text-slate-500 font-medium">Full Legal Name:</dt>
                          <dd className="font-bold text-slate-800">{formData.full_name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Position Applied For:</dt>
                          <dd className="font-bold text-[#006B3F]">
                            {formData.position_applied || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Date of Birth (Age):</dt>
                          <dd className="font-semibold text-slate-800">
                            {formData.date_of_birth} ({calculatedAge} years old)
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Contact Details:</dt>
                          <dd className="font-semibold text-slate-800">
                            {formData.phone_number} • {formData.email}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Residential Location:</dt>
                          <dd className="font-semibold text-slate-800">
                            {formData.town_community}, {formData.district_municipality},{' '}
                            {formData.region}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Vocation &amp; Education:</dt>
                          <dd className="font-semibold text-slate-800">
                            {formData.occupation} • {formData.education_level} (
                            {formData.area_of_study_profession})
                          </dd>
                        </div>
                      </dl>

                      {formData.position_applied === 'Interim Regional Minister' && (
                        <div className="pt-2 border-t border-slate-200 text-xs">
                          <dt className="text-slate-500 font-medium">
                            Regional Assignment &amp; 90-Day Target:
                          </dt>
                          <dd className="font-bold text-[#006B3F]">
                            {formData.region_if_regional_minister} Region • Target:{' '}
                            {formData.q5_recruitment_estimate}
                          </dd>
                        </div>
                      )}
                    </div>

                    {/* Review Section 2: Vision & Essays Summary */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                          2. Leadership Reflections &amp; Service Perspective
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-xs font-semibold text-[#C9A227] hover:underline"
                        >
                          Edit Essays
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <p className="text-slate-500 font-medium">
                            Why do you wish to serve in YRL?
                          </p>
                          <p className="text-slate-800 bg-white p-2.5 rounded border border-slate-200 line-clamp-3">
                            {formData.q1_why_serve || '—'}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500 font-medium">
                            Perspective on &ldquo;Leadership is service, not privilege&rdquo;:
                          </p>
                          <p className="text-slate-800 bg-white p-2.5 rounded border border-slate-200 line-clamp-3">
                            {formData.q2_leadership_as_service || '—'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-slate-500 font-medium">Dedicated Weekly Time:</p>
                            <p className="font-semibold text-slate-800">
                              {formData.weekly_hours || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-medium">Character Reference:</p>
                            <p className="font-semibold text-slate-800">
                              {formData.referee_name} ({formData.referee_relationship}) •{' '}
                              {formData.referee_phone}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mandatory Code of Conduct & Declarations */}
                <Card variant="bordered" accent="gold" className="bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#C9A227]/10 border border-[#C9A227]/25 flex items-center justify-center text-[#C9A227]">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">
                          8. Institutional Transparency &amp; Code of Conduct
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Please review the official institutional declaration before submitting.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-4">
                    {/* Important Civic Notice Box */}
                    <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Core Governance Distinctions</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                        <li>
                          <strong>100% Free:</strong> YRL never charges any fee for nominations,
                          application forms, processing, or leadership appointments.
                        </li>
                        <li>
                          <strong>Non-Governmental:</strong> YRL is an independent, non-partisan
                          civic platform. Interim ministerial portfolios are civil society roles
                          and do NOT constitute government or state positions in Ghana.
                        </li>
                        <li>
                          <strong>Interim Nature:</strong> Interim positions are transitional civic
                          roles focused on startup mobilization and do not guarantee permanent or
                          elected office.
                        </li>
                        <li>
                          <strong>Zero Misrepresentation:</strong> Appointees may never represent
                          themselves as government officials or state authorities.
                        </li>
                      </ul>
                    </div>

                    {/* Declaration Checkbox */}
                    <div className="pt-2">
                      <Checkbox
                        id="declaration_agreed"
                        name="declaration_agreed"
                        checked={formData.declaration_agreed}
                        onChange={(e) =>
                          handleCheckboxChange('declaration_agreed', e.target.checked)
                        }
                        label="I hereby declare that all information provided in this nomination is complete, truthful, and accurate."
                        description="I understand and accept that YRL is an independent civic platform, all nominations are 100% free, interim positions are voluntary civil society roles, and I agree to abide by the highest standards of integrity, transparency, and youth service."
                        error={touched.declaration_agreed ? errors.declaration_agreed : undefined}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Server Error Feedback */}
                {serverError && (
                  <Alert variant="error">
                    <div>
                      <strong className="block font-bold">Submission Error</strong>
                      <p className="text-xs mt-1">{serverError}</p>
                    </div>
                  </Alert>
                )}

                {/* Final Submission Feedback */}
                {Object.keys(errors).length > 0 && (
                  <Alert variant="error">
                    <div>
                      <strong className="block font-bold">Please resolve the following before submitting:</strong>
                      <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                        {Object.entries(errors).map(([key, err]) => (
                          <li key={key}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={isSubmitting}
                    onClick={() => {
                      setCurrentStep(2);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span>Back to Step 2</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="gold"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto font-bold text-base shadow-sm px-10"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-5 h-5 mr-2 animate-spin" />
                        <span>Submitting Nomination...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        <span>Confirm &amp; Complete Nomination</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* ================================================================= */}
            {/* STEP 4: SUCCESSFUL CONFIRMATION VIEW                              */}
            {/* ================================================================= */}
            {currentStep === 4 && (
              <div className="space-y-8 animate-fadeIn">
                {/* Official Confirmation Banner */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-950">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-sm font-bold">Official Nomination Submitted</strong>
                    <p className="text-emerald-800 leading-relaxed">
                      Your nomination has been securely recorded in the official YRL database. Please keep your
                      Nomination ID (<code>{confirmationNumber}</code>) for your records and reference during the
                      civic screening process.
                    </p>
                  </div>
                </div>

                {/* Formal Confirmation Card */}
                <Card variant="bordered" accent="green" className="bg-white text-center sm:text-left">
                  <CardHeader className="border-b border-slate-100 pb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-700">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                          <Badge variant="success" size="sm" className="mb-1.5">
                            Nomination Verified
                          </Badge>
                          <CardTitle className="text-2xl sm:text-3xl text-[#0B1F3A]">
                            Interim Leadership Nomination Recorded
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            Thank you for stepping forward to serve Ghana and empower the next generation.
                          </CardDescription>
                        </div>
                      </div>

                      <div className="text-right sm:text-right bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Nomination ID
                        </span>
                        <span className="font-mono font-bold text-base text-[#0B1F3A]">
                          {confirmationNumber}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {submissionDate}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-6">
                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                      <h3 className="font-heading font-bold text-sm text-[#0B1F3A] uppercase tracking-wider">
                        Applicant Summary Record
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded border border-slate-200">
                          <span className="block text-slate-500 font-medium">Candidate:</span>
                          <span className="font-bold text-slate-800 text-sm">{formData.full_name}</span>
                        </div>

                        <div className="bg-white p-3 rounded border border-slate-200">
                          <span className="block text-slate-500 font-medium">Applied Portfolio:</span>
                          <span className="font-bold text-[#006B3F] text-sm">
                            {formData.position_applied}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded border border-slate-200">
                          <span className="block text-slate-500 font-medium">Region:</span>
                          <span className="font-bold text-slate-800 text-sm">
                            {formData.position_applied === 'Interim Regional Minister'
                              ? `${formData.region_if_regional_minister} (Deployment)`
                              : `${formData.region} (Residence)`}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="bg-white p-3 rounded border border-slate-200">
                          <span className="block text-slate-500 font-medium">Contact:</span>
                          <span className="font-semibold text-slate-800">
                            {formData.phone_number} • {formData.email}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded border border-slate-200">
                          <span className="block text-slate-500 font-medium">Time Dedication:</span>
                          <span className="font-semibold text-slate-800">{formData.weekly_hours}</span>
                        </div>
                      </div>
                    </div>

                    {/* What Happens Next Section */}
                    <div className="space-y-3">
                      <h4 className="font-heading font-bold text-sm text-[#0B1F3A]">
                        What Happens Next in the YRL Interim Process?
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <strong className="block text-slate-800 font-semibold">
                            1. Civic Screening
                          </strong>
                          <p>
                            Founding committee reviews applicant eligibility, age (18–40), and
                            portfolio vision.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <strong className="block text-slate-800 font-semibold">
                            2. Virtual Conversation
                          </strong>
                          <p>
                            Shortlisted candidates participate in an interim leadership interview
                            session.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                          <strong className="block text-slate-800 font-semibold">
                            3. Interim Commission
                          </strong>
                          <p>
                            Selected interim leaders receive formal onboarding and startup
                            briefings. 100% free.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={() => window.print()}
                        className="w-full sm:w-auto"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        <span>Print / Save Record</span>
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={handleResetForm}
                        className="w-full sm:w-auto"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        <span>Start New Nomination</span>
                      </Button>
                    </div>

                    <Link href="/structure">
                      <Button variant="ghost" size="md" className="text-xs">
                        <span>View All 16 Regional Portfolios</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </div>
  );
}

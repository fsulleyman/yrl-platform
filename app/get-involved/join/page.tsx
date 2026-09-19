'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  Shield,
  ArrowRight,
  Printer,
  RotateCcw,
  Sparkles,
  Users,
  Clock,
  MapPin,
  Briefcase,
  HeartHandshake,
  BookOpen,
  Loader2,
  HelpCircle,
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
import { Disclaimer } from '@/components/ui/Disclaimer';
import {
  memberSchema,
  GHANA_REGIONS,
  EDUCATION_LEVELS,
  AVAILABILITY_OPTIONS,
  GENDER_OPTIONS,
  ENGAGEMENT_INTEREST_OPTIONS,
  MemberFormData,
} from '@/lib/validations/member';
import { registerMember } from '@/lib/actions/member';

interface FormStateType {
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
  education_level: string;
  why_join: string;
  availability: string;
  engagement_interests: string[];
  civic_acknowledgement: boolean;
  honeypot: string;
}

const initialFormData: FormStateType = {
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
  education_level: '',
  why_join: '',
  availability: '',
  engagement_interests: [],
  civic_acknowledgement: false,
  honeypot: '',
};

export default function JoinPage() {
  const [formData, setFormData] = useState<FormStateType>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    memberId: string;
    registeredAt: string;
  }>({
    memberId: '',
    registeredAt: '',
  });

  const errorSummaryRef = useRef<HTMLDivElement>(null);

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
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleCheckboxChange = (name: keyof FormStateType, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));

    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleInterestToggle = (interestId: string, checked: boolean) => {
    setFormData((prev) => {
      const current = prev.engagement_interests || [];
      if (checked) {
        return { ...prev, engagement_interests: [...current, interestId] };
      } else {
        return { ...prev, engagement_interests: current.filter((id) => id !== interestId) };
      }
    });
  };

  // Single field validation for onBlur
  const validateField = (name: keyof FormStateType): string => {
    let error = '';
    const val = formData[name];

    switch (name) {
      case 'full_name':
        if (typeof val === 'string' && !val.trim()) {
          error = 'Enter your full name';
        } else if (typeof val === 'string' && val.trim().length < 2) {
          error = 'Enter at least 2 characters';
        }
        break;

      case 'date_of_birth':
        if (!val) {
          error = 'Enter your date of birth';
        } else if (calculatedAge !== null && (calculatedAge < 18 || calculatedAge > 40)) {
          error = 'Members must be between 18 and 40 years of age';
        }
        break;

      case 'phone_number':
        if (typeof val === 'string' && !val.trim()) {
          error = 'Enter your phone number';
        } else if (typeof val === 'string' && val.trim().length < 8) {
          error = 'Enter a valid phone number (minimum 8 digits)';
        }
        break;

      case 'email':
        if (typeof val === 'string' && !val.trim()) {
          error = 'Enter your email address';
        } else if (typeof val === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
          error = 'Enter a valid email address';
        }
        break;

      case 'region':
        if (!val) {
          error = 'Select your region';
        }
        break;

      case 'district_municipality':
        if (typeof val === 'string' && !val.trim()) {
          error = 'Enter your district or municipality';
        } else if (typeof val === 'string' && val.trim().length < 2) {
          error = 'Enter at least 2 characters';
        }
        break;

      case 'town_community':
        if (typeof val === 'string' && !val.trim()) {
          error = 'Enter your town or community';
        } else if (typeof val === 'string' && val.trim().length < 2) {
          error = 'Enter at least 2 characters';
        }
        break;

      case 'occupation':
        if (typeof val === 'string' && !val.trim()) {
          error = 'Enter your current occupation';
        } else if (typeof val === 'string' && val.trim().length < 2) {
          error = 'Enter at least 2 characters';
        }
        break;

      case 'education_level':
        if (!val) {
          error = 'Select your highest level of education';
        }
        break;

      case 'why_join':
        if (typeof val === 'string' && !val.trim()) {
          error = 'Please share why you want to join YRL';
        } else if (typeof val === 'string' && val.trim().length < 20) {
          error = 'Please enter at least 20 characters explaining your motivation';
        } else if (typeof val === 'string' && val.trim().length > 1000) {
          error = 'Motivation statement cannot exceed 1000 characters';
        }
        break;

      case 'availability':
        if (!val) {
          error = 'Select your weekly availability';
        }
        break;

      case 'civic_acknowledgement':
        if (!val) {
          error = 'You must acknowledge the civic terms to complete registration';
        }
        break;

      default:
        break;
    }

    setErrors((prev) => {
      if (error) return { ...prev, [name]: error };
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });

    return error;
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name as keyof FormStateType);
  };

  // Form submission handler with server action integration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all required fields as touched
    const touchedAll: Record<string, boolean> = {
      full_name: true,
      date_of_birth: true,
      phone_number: true,
      email: true,
      region: true,
      district_municipality: true,
      town_community: true,
      occupation: true,
      education_level: true,
      why_join: true,
      availability: true,
      civic_acknowledgement: true,
    };
    setTouched((prev) => ({ ...prev, ...touchedAll }));

    // Full schema validation using Zod
    const zodResult = memberSchema.safeParse(formData);

    if (!zodResult.success) {
      const fieldErrors: Record<string, string> = {};
      zodResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);

      // Scroll to error summary
      if (errorSummaryRef.current) {
        errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
      return;
    }

    // Begin server submission
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await registerMember(formData);

      if (result.success && result.memberId) {
        const formattedDate = new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        setConfirmationData({
          memberId: result.memberId,
          registeredAt: formattedDate,
        });
        setIsSuccess(true);
        window.scrollTo({ top: 150, behavior: 'smooth' });
      } else if (result.success) {
        // Honeypot trap: generic success without official ID
        const formattedDate = new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        setConfirmationData({
          memberId: 'SUBMITTED-FOR-REVIEW',
          registeredAt: formattedDate,
        });
        setIsSuccess(true);
        window.scrollTo({ top: 150, behavior: 'smooth' });
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
          setErrors((prev) => ({
            ...prev,
            _server: result.error!,
          }));
        }

        if (errorSummaryRef.current) {
          errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }
      }
    } catch (err) {
      setErrors({
        _server: 'A network or server error occurred. Please try again later.',
      });
      if (errorSummaryRef.current) {
        errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
    setTouched({});
    setIsSuccess(false);
    setIsSubmitting(false);
    setConfirmationData({ memberId: '', registeredAt: '' });
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Civic Transparency Notice Banner */}
      <NoticeBanner variant="fullWidth" />

      <main id="main-content" className="flex-1">
        <Section className="py-10 md:py-16">
          <Container className="max-w-3xl">
            {/* Pathway Distinction Banner */}
            <div className="mb-8">
              <Alert
                variant="warning"
                title="Looking to apply for an interim leadership role?"
                className="bg-amber-50/80 border-[#C9A227]/40 text-slate-800"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    This registration form is for <strong>General Civic Membership</strong>. If you intend to apply for
                    an <strong>Interim National Minister</strong> or <strong>Interim Regional Minister</strong> position,
                    please complete the formal leadership nomination form instead.
                  </p>
                  <Link href="/get-involved/nominate" className="shrink-0">
                    <Button variant="outline" size="sm" className="text-xs font-semibold border-[#0B1F3A] text-[#0B1F3A] hover:bg-[#0B1F3A] hover:text-white">
                      Leadership Nomination <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
                    </Button>
                  </Link>
                </div>
              </Alert>
            </div>

            {!isSuccess ? (
              <>
                {/* Hero Header */}
                <div className="text-center mb-10">
                  <Badge variant="gold" className="mb-3 uppercase tracking-wider text-xs font-semibold">
                    Civic Membership • Open Nationwide
                  </Badge>
                  <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#0B1F3A] tracking-tight mb-4">
                    Join the Youth Republic Leadership Movement
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Step forward as a verified civic member. Connect with young leaders across Ghana to participate in
                    community development, civic education, and youth-led national transformation.
                  </p>
                </div>

                {/* Form Card */}
                <Card className="border border-[#C9A227]/30 shadow-md bg-white">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle as="h2" className="text-xl font-heading font-bold text-[#0B1F3A] flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#C9A227]" aria-hidden="true" />
                        <span>General Membership Registration</span>
                      </CardTitle>
                      <Badge variant="neutral" className="text-xs">
                        Free Registration • Ages 18–40
                      </Badge>
                    </div>
                    <CardDescription className="text-xs sm:text-sm text-slate-600 mt-1">
                      Fields marked with an asterisk (<span className="text-red-600">*</span>) are mandatory. Please provide accurate details.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-6 sm:pt-8">
                    {/* Error Summary Alert */}
                    {Object.keys(errors).length > 0 && (
                      <div ref={errorSummaryRef} tabIndex={-1} className="mb-8 focus:outline-none">
                        <Alert
                          variant="error"
                          title={`Please review ${Object.keys(errors).length} required item${Object.keys(errors).length > 1 ? 's' : ''}:`}
                        >
                          <ul className="list-disc list-inside text-xs sm:text-sm space-y-1 mt-2 text-red-700">
                            {Object.entries(errors).map(([key, msg]) => (
                              <li key={key}>{msg}</li>
                            ))}
                          </ul>
                        </Alert>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-8">
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
                      {/* SECTION 1: Personal Profile */}
                      <fieldset className="border-b border-slate-100 pb-8">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] mb-1 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs flex items-center justify-center font-bold">
                            1
                          </span>
                          <span>Personal Profile</span>
                        </legend>
                        <p className="text-xs text-slate-500 mb-6 ml-8">
                          Your legal name and age verification for membership records.
                        </p>

                        <div className="space-y-5 ml-0 sm:ml-8">
                          {/* Full Name */}
                          <div>
                            <Label htmlFor="full_name" required>
                              Full Legal Name
                            </Label>
                            <Input
                              id="full_name"
                              name="full_name"
                              type="text"
                              autoComplete="name"
                              value={formData.full_name}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. Kwame Mensah Asante"
                              disabled={isSubmitting}
                              error={touched.full_name && !!errors.full_name}
                              aria-invalid={touched.full_name && !!errors.full_name}
                              aria-describedby={errors.full_name ? 'full_name-error' : undefined}
                              className="mt-1"
                            />
                            {touched.full_name && errors.full_name && (
                              <p id="full_name-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                {errors.full_name}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Date of Birth */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label htmlFor="date_of_birth" required>
                                  Date of Birth
                                </Label>
                                {calculatedAge !== null && (
                                  <span
                                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                      calculatedAge >= 18 && calculatedAge <= 40
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    Age: {calculatedAge} {calculatedAge >= 18 && calculatedAge <= 40 ? '✓ Eligible' : '✗ 18–40 Only'}
                                  </span>
                                )}
                              </div>
                              <Input
                                id="date_of_birth"
                                name="date_of_birth"
                                type="date"
                                value={formData.date_of_birth}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                disabled={isSubmitting}
                                error={touched.date_of_birth && !!errors.date_of_birth}
                                aria-invalid={touched.date_of_birth && !!errors.date_of_birth}
                                aria-describedby={errors.date_of_birth ? 'date_of_birth-error' : undefined}
                              />
                              <p className="text-[11px] text-slate-500 mt-1">
                                Per YRL Charter, membership is open to youth aged 18–40.
                              </p>
                              {touched.date_of_birth && errors.date_of_birth && (
                                <p id="date_of_birth-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                  {errors.date_of_birth}
                                </p>
                              )}
                            </div>

                            {/* Gender (Optional) */}
                            <div>
                              <Label htmlFor="gender">
                                Gender <span className="text-slate-500 font-normal text-xs">(Optional)</span>
                              </Label>
                              <Select
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleInputChange}
                                disabled={isSubmitting}
                                className="mt-1"
                              >
                                <option value="">Select gender (optional)</option>
                                {GENDER_OPTIONS.map((g) => (
                                  <option key={g.value} value={g.value}>
                                    {g.label}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 2: Contact Information */}
                      <fieldset className="border-b border-slate-100 pb-8">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] mb-1 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs flex items-center justify-center font-bold">
                            2
                          </span>
                          <span>Contact Details</span>
                        </legend>
                        <p className="text-xs text-slate-500 mb-6 ml-8">
                          Active contact channels for regional communications and event notices.
                        </p>

                        <div className="space-y-5 ml-0 sm:ml-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Phone Number */}
                            <div>
                              <Label htmlFor="phone_number" required>
                                Primary Phone Number
                              </Label>
                              <Input
                                id="phone_number"
                                name="phone_number"
                                type="tel"
                                autoComplete="tel"
                                value={formData.phone_number}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                placeholder="e.g. 024 123 4567"
                                disabled={isSubmitting}
                                error={touched.phone_number && !!errors.phone_number}
                                aria-invalid={touched.phone_number && !!errors.phone_number}
                                aria-describedby={errors.phone_number ? 'phone_number-error' : undefined}
                                className="mt-1"
                              />
                              {touched.phone_number && errors.phone_number && (
                                <p id="phone_number-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                  {errors.phone_number}
                                </p>
                              )}
                            </div>

                            {/* WhatsApp Number (Optional) */}
                            <div>
                              <Label htmlFor="whatsapp_number">
                                WhatsApp Number <span className="text-slate-500 font-normal text-xs">(Optional)</span>
                              </Label>
                              <Input
                                id="whatsapp_number"
                                name="whatsapp_number"
                                type="tel"
                                autoComplete="tel"
                                value={formData.whatsapp_number}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                placeholder="e.g. 024 123 4567"
                                disabled={isSubmitting}
                                className="mt-1"
                              />
                              <p className="text-[11px] text-slate-500 mt-1">Used for regional community announcements.</p>
                            </div>
                          </div>

                          {/* Email Address */}
                          <div>
                            <Label htmlFor="email" required>
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. kwame.asante@example.com"
                              disabled={isSubmitting}
                              error={touched.email && !!errors.email}
                              aria-invalid={touched.email && !!errors.email}
                              aria-describedby={errors.email ? 'email-error' : undefined}
                              className="mt-1"
                            />
                            {touched.email && errors.email && (
                              <p id="email-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                {errors.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 3: Geographic Location */}
                      <fieldset className="border-b border-slate-100 pb-8">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] mb-1 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs flex items-center justify-center font-bold">
                            3
                          </span>
                          <span>Geographic Location</span>
                        </legend>
                        <p className="text-xs text-slate-500 mb-6 ml-8">
                          Helps assign you to your respective regional and community youth forum.
                        </p>

                        <div className="space-y-5 ml-0 sm:ml-8">
                          {/* Region */}
                          <div>
                            <Label htmlFor="region" required>
                              Region
                            </Label>
                            <Select
                              id="region"
                              name="region"
                              value={formData.region}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              disabled={isSubmitting}
                              error={touched.region && !!errors.region}
                              aria-invalid={touched.region && !!errors.region}
                              aria-describedby={errors.region ? 'region-error' : undefined}
                              className="mt-1"
                            >
                              <option value="">Select your region (16 Regions of Ghana)</option>
                              {GHANA_REGIONS.map((region) => (
                                <option key={region} value={region}>
                                  {region} Region
                                </option>
                              ))}
                            </Select>
                            {touched.region && errors.region && (
                              <p id="region-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                {errors.region}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* District / Municipality */}
                            <div>
                              <Label htmlFor="district_municipality" required>
                                District / Municipality
                              </Label>
                              <Input
                                id="district_municipality"
                                name="district_municipality"
                                type="text"
                                value={formData.district_municipality}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                placeholder="e.g. Ayawaso West / Kumasi Metro"
                                disabled={isSubmitting}
                                error={touched.district_municipality && !!errors.district_municipality}
                                aria-invalid={touched.district_municipality && !!errors.district_municipality}
                                aria-describedby={
                                  errors.district_municipality ? 'district_municipality-error' : undefined
                                }
                                className="mt-1"
                              />
                              {touched.district_municipality && errors.district_municipality && (
                                <p
                                  id="district_municipality-error"
                                  role="alert"
                                  className="text-xs text-red-600 mt-1 font-medium"
                                >
                                  {errors.district_municipality}
                                </p>
                              )}
                            </div>

                            {/* Town / Community */}
                            <div>
                              <Label htmlFor="town_community" required>
                                Town / Community
                              </Label>
                              <Input
                                id="town_community"
                                name="town_community"
                                type="text"
                                value={formData.town_community}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                placeholder="e.g. Dzorwulu / Bantama"
                                disabled={isSubmitting}
                                error={touched.town_community && !!errors.town_community}
                                aria-invalid={touched.town_community && !!errors.town_community}
                                aria-describedby={errors.town_community ? 'town_community-error' : undefined}
                                className="mt-1"
                              />
                              {touched.town_community && errors.town_community && (
                                <p id="town_community-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                  {errors.town_community}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 4: Occupation & Education */}
                      <fieldset className="border-b border-slate-100 pb-8">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] mb-1 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs flex items-center justify-center font-bold">
                            4
                          </span>
                          <span>Occupation & Education</span>
                        </legend>
                        <p className="text-xs text-slate-500 mb-6 ml-8">
                          Your vocational background helps match you with relevant civic programs.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 ml-0 sm:ml-8">
                          {/* Current Occupation */}
                          <div>
                            <Label htmlFor="occupation" required>
                              Current Occupation / Status
                            </Label>
                            <Input
                              id="occupation"
                              name="occupation"
                              type="text"
                              value={formData.occupation}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. Software Developer / Student / Farmer"
                              disabled={isSubmitting}
                              error={touched.occupation && !!errors.occupation}
                              aria-invalid={touched.occupation && !!errors.occupation}
                              aria-describedby={errors.occupation ? 'occupation-error' : undefined}
                              className="mt-1"
                            />
                            {touched.occupation && errors.occupation && (
                              <p id="occupation-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                {errors.occupation}
                              </p>
                            )}
                          </div>

                          {/* Educational Level */}
                          <div>
                            <Label htmlFor="education_level" required>
                              Highest Level of Education
                            </Label>
                            <Select
                              id="education_level"
                              name="education_level"
                              value={formData.education_level}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              disabled={isSubmitting}
                              error={touched.education_level && !!errors.education_level}
                              aria-invalid={touched.education_level && !!errors.education_level}
                              aria-describedby={errors.education_level ? 'education_level-error' : undefined}
                              className="mt-1"
                            >
                              <option value="">Select educational attainment</option>
                              {EDUCATION_LEVELS.map((ed) => (
                                <option key={ed.value} value={ed.value}>
                                  {ed.label}
                                </option>
                              ))}
                            </Select>
                            {touched.education_level && errors.education_level && (
                              <p id="education_level-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                {errors.education_level}
                              </p>
                            )}
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 5: Motivation & Availability */}
                      <fieldset className="border-b border-slate-100 pb-8">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] mb-1 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs flex items-center justify-center font-bold">
                            5
                          </span>
                          <span>Civic Motivation & Availability</span>
                        </legend>
                        <p className="text-xs text-slate-500 mb-6 ml-8">
                          Tell us what motivates you to participate and how you wish to contribute.
                        </p>

                        <div className="space-y-6 ml-0 sm:ml-8">
                          {/* Why Join */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label htmlFor="why_join" required>
                                Why do you want to join YRL?
                              </Label>
                              <span
                                className={`text-[11px] font-medium ${
                                  formData.why_join.length >= 20 ? 'text-slate-500' : 'text-amber-700'
                                }`}
                              >
                                {formData.why_join.length} / 1000 chars (min 20)
                              </span>
                            </div>
                            <Textarea
                              id="why_join"
                              name="why_join"
                              rows={4}
                              value={formData.why_join}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="Share what inspires you to join this youth movement, the civic issues you care about, or how you hope to contribute to national development..."
                              disabled={isSubmitting}
                              error={touched.why_join && !!errors.why_join}
                              aria-invalid={touched.why_join && !!errors.why_join}
                              aria-describedby={errors.why_join ? 'why_join-error' : undefined}
                            />
                            {touched.why_join && errors.why_join && (
                              <p id="why_join-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                {errors.why_join}
                              </p>
                            )}
                          </div>

                          {/* Availability */}
                          <div>
                            <Label htmlFor="availability" required>
                              Weekly Availability Commitment
                            </Label>
                            <Select
                              id="availability"
                              name="availability"
                              value={formData.availability}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              disabled={isSubmitting}
                              error={touched.availability && !!errors.availability}
                              aria-invalid={touched.availability && !!errors.availability}
                              aria-describedby={errors.availability ? 'availability-error' : undefined}
                              className="mt-1"
                            >
                              <option value="">Select your estimated availability</option>
                              {AVAILABILITY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Select>
                            {touched.availability && errors.availability && (
                              <p id="availability-error" role="alert" className="text-xs text-red-600 mt-1 font-medium">
                                {errors.availability}
                              </p>
                            )}
                          </div>

                          {/* Engagement Interests (Checkboxes) */}
                          <div>
                            <Label className="block mb-2">
                              Areas of Civic Interest <span className="text-slate-500 font-normal text-xs">(Select all that apply)</span>
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-md border border-slate-200/60">
                              {ENGAGEMENT_INTEREST_OPTIONS.map((interest) => {
                                const isChecked = formData.engagement_interests.includes(interest.id);
                                return (
                                  <label
                                    key={interest.id}
                                    htmlFor={`interest_${interest.id}`}
                                    className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 cursor-pointer select-none"
                                  >
                                    <input
                                      id={`interest_${interest.id}`}
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => handleInterestToggle(interest.id, e.target.checked)}
                                      disabled={isSubmitting}
                                      className="rounded border-slate-300 text-[#0B1F3A] focus:ring-[#C9A227] mt-0.5"
                                    />
                                    <span>{interest.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 6: Civic Acknowledgment */}
                      <fieldset className="pt-2">
                        <div className="bg-amber-50/60 border border-[#C9A227]/30 rounded-lg p-5">
                          <h4 className="text-sm font-heading font-bold text-[#0B1F3A] mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
                            <span>Civic Member Declaration</span>
                          </h4>
                          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                            Youth Republic Leadership is dedicated to servant leadership, ethical civic stewardship, and community empowerment. Membership is 100% free and voluntary.
                          </p>

                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="civic_acknowledgement"
                              name="civic_acknowledgement"
                              checked={formData.civic_acknowledgement}
                              onChange={(e) => handleCheckboxChange('civic_acknowledgement', e.target.checked)}
                              onBlur={handleBlur}
                              disabled={isSubmitting}
                              aria-invalid={touched.civic_acknowledgement && !!errors.civic_acknowledgement}
                              aria-describedby={
                                errors.civic_acknowledgement ? 'civic_acknowledgement-error' : undefined
                              }
                              className="rounded border-slate-300 text-[#0B1F3A] focus:ring-[#C9A227] mt-1 shrink-0"
                            />
                            <Label
                              htmlFor="civic_acknowledgement"
                              className="text-xs sm:text-sm font-normal text-slate-700 leading-snug cursor-pointer select-none"
                            >
                              <span className="font-semibold text-slate-900">I confirm that all information provided is accurate and true.</span> I understand that Youth Republic Leadership is an independent civic youth movement, and I pledge to uphold the values of integrity, service, and constructive national development. <span className="text-red-600 font-bold">*</span>
                            </Label>
                          </div>
                          {touched.civic_acknowledgement && errors.civic_acknowledgement && (
                            <p
                              id="civic_acknowledgement-error"
                              role="alert"
                              className="text-xs text-red-600 mt-2 font-medium ml-7"
                            >
                              {errors.civic_acknowledgement}
                            </p>
                          )}
                        </div>
                      </fieldset>

                      {/* Submission Controls */}
                      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <Link href="/" className="w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </Button>
                        </Link>

                        <Button
                          type="submit"
                          variant="gold"
                          size="lg"
                          disabled={isSubmitting}
                          className="w-full sm:w-auto min-w-[220px] font-bold shadow-md flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#0B1F3A]" aria-hidden="true" />
                              <span>Registering Membership...</span>
                            </>
                          ) : (
                            <>
                              <span>Register as Member</span>
                              <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* SUCCESS CONFIRMATION VIEW */
              <div className="animate-in fade-in duration-300">
                <Card className="border-2 border-emerald-500/40 shadow-lg bg-white overflow-hidden">
                  {/* Decorative Banner Stripe */}
                  <div className="h-2 w-full bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]" />

                  <CardHeader className="text-center pb-6 pt-8 bg-emerald-50/40 border-b border-emerald-100">
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 border-2 border-emerald-300 shadow-sm">
                      <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
                    </div>
                    <Badge variant="success" className="mx-auto mb-2 text-xs uppercase tracking-wider font-semibold">
                      Civic Registration Confirmed
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#0B1F3A]">
                      Welcome to Youth Republic Leadership!
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
                      Thank you for standing up for Ghana’s future. Your general civic membership registration has been
                      recorded in our foundational register.
                    </p>
                  </CardHeader>

                  <CardContent className="pt-8 space-y-8">
                    {/* Membership ID Callout Box */}
                    <div className="bg-[#0B1F3A] text-white rounded-lg p-6 text-center relative overflow-hidden shadow-inner">
                      <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-10">
                        <Shield className="w-32 h-32" />
                      </div>
                      <p className="text-xs uppercase tracking-widest text-[#FCD116] font-semibold mb-1">
                        Official Membership Reference Number
                      </p>
                      <p className="text-2xl sm:text-3xl font-heading font-extrabold tracking-wider text-white select-all">
                        {confirmationData.memberId}
                      </p>
                      <p className="text-xs text-slate-300 mt-2">
                        Registered on: <span className="font-semibold text-white">{confirmationData.registeredAt}</span>
                      </p>
                    </div>

                    {/* Member Summary Card */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                      <h3 className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                        Registration Details Summary
                      </h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs sm:text-sm">
                        <div>
                          <dt className="text-slate-500 font-medium">Full Name:</dt>
                          <dd className="text-slate-900 font-semibold">{formData.full_name}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Region:</dt>
                          <dd className="text-slate-900 font-semibold">{formData.region} Region</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">District & Town:</dt>
                          <dd className="text-slate-900">
                            {formData.district_municipality}, {formData.town_community}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Contact Phone:</dt>
                          <dd className="text-slate-900">{formData.phone_number}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Email Address:</dt>
                          <dd className="text-slate-900">{formData.email}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 font-medium">Availability:</dt>
                          <dd className="text-slate-900">{formData.availability}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Onboarding Next Steps */}
                    <div>
                      <h3 className="text-sm font-heading font-bold text-[#0B1F3A] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
                        <span>What Happens Next?</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                          <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs font-bold flex items-center justify-center mb-2">
                            1
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mb-1">Roster Assignment</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Your profile is routed to the interim coordinating secretariat for your region.
                          </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                          <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs font-bold flex items-center justify-center mb-2">
                            2
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mb-1">Civic Orientation</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            You will receive communications regarding local introductory forums and civic orientations.
                          </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                          <span className="w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs font-bold flex items-center justify-center mb-2">
                            3
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mb-1">Community Action</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Participate in grassroots cleanups, educational programs, and youth leadership initiatives.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex flex-wrap items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 text-xs text-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Print Confirmation</span>
                    </Button>

                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Register Another</span>
                      </Button>

                      <Link href="/">
                        <Button variant="gold" size="sm" className="text-xs font-bold shadow-sm">
                          Return to Home
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            )}
          </Container>
        </Section>
      </main>

      {/* Footer Civic Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Disclaimer title="Official Civic Transparency Notice">
          Youth Republic Leadership is a non-partisan, non-governmental civic leadership organization in Ghana. General membership is voluntary and free. Membership does not constitute public service appointment or government employment.
        </Disclaimer>
      </div>
    </div>
  );
}

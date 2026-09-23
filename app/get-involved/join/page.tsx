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
  BookOpen,
  Loader2,
  HelpCircle,
  CreditCard,
  Upload,
  FileCheck,
  FileText,
  AlertTriangle,
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
import {
  memberSchema,
  GHANA_REGIONS,
  EDUCATION_LEVELS,
  AVAILABILITY_OPTIONS,
  GENDER_OPTIONS,
  ENGAGEMENT_INTEREST_OPTIONS,
} from '@/lib/validations/member';
import {
  createMembershipApplication,
  submitApplicantReceipt,
  initializePaystackPaymentAction,
} from '@/lib/actions/payment';
import type { PaymentInstructions } from '@/lib/payment/types';

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

type Step = 'application' | 'payment_instructions' | 'confirmation';

export default function JoinPage() {
  const [currentStep, setCurrentStep] = useState<Step>('application');
  const [formData, setFormData] = useState<FormStateType>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Application & Payment Reference Data from Server
  const [applicationData, setApplicationData] = useState<{
    applicationId: string;
    applicationNumber: string;
    paymentReference: string;
    amount: number;
    currency: string;
    instructions: PaymentInstructions | null;
  } | null>(null);

  // Receipt submission state
  const [receiptForm, setReceiptForm] = useState<{
    transactionReference: string;
    claimedPaymentDate: string;
    file: File | null;
  }>({
    transactionReference: '',
    claimedPaymentDate: new Date().toISOString().split('T')[0],
    file: null,
  });
  const [receiptErrors, setReceiptErrors] = useState<Record<string, string>>({});
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Payment method selection state (Manual Mobile Money is the primary operational method)
  const [paymentMethodTab, setPaymentMethodTab] = useState<'manual' | 'paystack'>('manual');
  const [isInitializingPaystack, setIsInitializingPaystack] = useState(false);
  const [paystackError, setPaystackError] = useState<string | null>(null);

  const handlePaystackCheckout = async () => {
    if (!applicationData) return;
    setIsInitializingPaystack(true);
    setPaystackError(null);

    try {
      const res = await initializePaystackPaymentAction({
        applicationId: applicationData.applicationId,
        email: formData.email,
      });

      if (res.success && res.data?.authorizationUrl) {
        window.location.href = res.data.authorizationUrl;
      } else {
        setPaystackError(
          res.error || 'Failed to initialize Paystack checkout. Please try again or use manual transfer.'
        );
      }
    } catch (err) {
      setPaystackError('An unexpected error occurred connecting to Paystack.');
    } finally {
      setIsInitializingPaystack(false);
    }
  };

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // STEP 1: Application submission handler
  const handleApplicationSubmit = async (e: React.FormEvent) => {
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

    const zodResult = memberSchema.safeParse(formData);
    if (!zodResult.success) {
      const fieldErrors: Record<string, string> = {};
      zodResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);

      if (errorSummaryRef.current) {
        errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createMembershipApplication(formData);

      if (result.success && result.data) {
        setApplicationData(result.data);
        setCurrentStep('payment_instructions');
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
    } catch {
      setErrors({
        _server: 'A network or server error occurred. Please try again later.',
      });
      if (errorSummaryRef.current) {
        errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: Receipt submission handler
  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicationData) return;

    const newReceiptErrors: Record<string, string> = {};

    if (!receiptForm.transactionReference.trim()) {
      newReceiptErrors.transactionReference = 'Enter the Mobile Money transaction reference / SMS ID.';
    } else if (receiptForm.transactionReference.trim().length < 4) {
      newReceiptErrors.transactionReference = 'Transaction reference must be at least 4 characters.';
    }

    if (!receiptForm.file) {
      newReceiptErrors.file = 'Please upload a receipt file (JPEG, PNG, WEBP, or PDF).';
    } else {
      if (receiptForm.file.size > 5 * 1024 * 1024) {
        newReceiptErrors.file = 'File size cannot exceed 5MB.';
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(receiptForm.file.type)) {
        newReceiptErrors.file = 'Receipt must be a JPEG, PNG, WEBP, or PDF document.';
      }
    }

    if (Object.keys(newReceiptErrors).length > 0) {
      setReceiptErrors(newReceiptErrors);
      return;
    }

    setIsUploadingReceipt(true);
    setReceiptErrors({});

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('payment_reference', applicationData.paymentReference);
      uploadFormData.append('transaction_reference', receiptForm.transactionReference.trim());
      if (receiptForm.claimedPaymentDate) {
        uploadFormData.append('claimed_payment_date', receiptForm.claimedPaymentDate);
      }
      if (receiptForm.file) {
        uploadFormData.append('receipt_file', receiptForm.file);
      }

      const result = await submitApplicantReceipt(uploadFormData);

      if (result.success) {
        setCurrentStep('confirmation');
        window.scrollTo({ top: 150, behavior: 'smooth' });
      } else {
        setReceiptErrors({
          _server: result.error || 'Failed to submit receipt. Please try again.',
        });
      }
    } catch {
      setReceiptErrors({
        _server: 'A network error occurred while uploading your receipt. Please try again.',
      });
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setReceiptForm((prev) => ({ ...prev, file: selectedFile }));
      if (receiptErrors.file) {
        setReceiptErrors((prev) => {
          const updated = { ...prev };
          delete updated.file;
          return updated;
        });
      }
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setReceiptForm({
      transactionReference: '',
      claimedPaymentDate: new Date().toISOString().split('T')[0],
      file: null,
    });
    setErrors({});
    setReceiptErrors({});
    setTouched({});
    setApplicationData(null);
    setCurrentStep('application');
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold border-[#0B1F3A] text-[#0B1F3A] hover:bg-[#0B1F3A] hover:text-white"
                    >
                      Leadership Nomination <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
                    </Button>
                  </Link>
                </div>
              </Alert>
            </div>

            {/* PROGRESS STEPPER */}
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                <div className="w-full absolute top-1/2 h-0.5 bg-slate-200 -z-0" />
                <div className="flex flex-col items-center relative z-10 bg-slate-50 px-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                      currentStep === 'application'
                        ? 'bg-[#0B1F3A] text-white ring-4 ring-[#C9A227]/30'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    1
                  </div>
                  <span className="text-xs font-semibold mt-1 text-slate-700">Application</span>
                </div>

                <div className="flex flex-col items-center relative z-10 bg-slate-50 px-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                      currentStep === 'payment_instructions'
                        ? 'bg-[#0B1F3A] text-white ring-4 ring-[#C9A227]/30'
                        : currentStep === 'confirmation'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    2
                  </div>
                  <span className="text-xs font-semibold mt-1 text-slate-700">Payment Evidence</span>
                </div>

                <div className="flex flex-col items-center relative z-10 bg-slate-50 px-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                      currentStep === 'confirmation'
                        ? 'bg-[#0B1F3A] text-white ring-4 ring-[#C9A227]/30'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    3
                  </div>
                  <span className="text-xs font-semibold mt-1 text-slate-700">Verification</span>
                </div>
              </div>
            </div>

            {/* STEP 1: APPLICATION FORM */}
            {currentStep === 'application' && (
              <>
                <div className="text-center mb-10">
                  <Badge variant="gold" className="mb-3 uppercase tracking-wider text-xs font-semibold">
                    Step 1 of 3 • Civic Registration
                  </Badge>
                  <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#0B1F3A] tracking-tight mb-4">
                    Join the Youth Republic Leadership Movement
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Step forward as a verified civic member. Connect with young leaders across Ghana to participate in
                    community development, civic education, and youth-led national transformation.
                  </p>
                </div>

                <Card className="border border-[#C9A227]/30 shadow-md bg-white">
                  <CardHeader className="border-b border-slate-100 pb-6 bg-slate-50/50">
                    <CardTitle className="text-xl font-heading font-bold text-[#0B1F3A]">
                      Membership Application Form
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600">
                      Please complete all required fields. A one-time membership registration fee of GH₵5.00 applies to support grassroots civic organizing.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-6">
                    {/* Error Summary */}
                    {Object.keys(errors).length > 0 && (
                      <div
                        ref={errorSummaryRef}
                        role="alert"
                        tabIndex={-1}
                        className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
                          <span>Please correct the errors before submitting:</span>
                        </div>
                        <ul className="list-disc list-inside text-xs sm:text-sm space-y-1 text-red-800">
                          {errors._server && <li className="font-semibold">{errors._server}</li>}
                          {Object.entries(errors)
                            .filter(([key]) => key !== '_server')
                            .map(([key, msg]) => (
                              <li key={key}>{msg}</li>
                            ))}
                        </ul>
                      </div>
                    )}

                    <form onSubmit={handleApplicationSubmit} noValidate className="space-y-8">
                      {/* Anti-bot Honeypot Field */}
                      <div className="hidden" aria-hidden="true">
                        <label htmlFor="honeypot">Leave this blank</label>
                        <input
                          type="text"
                          id="honeypot"
                          name="honeypot"
                          value={formData.honeypot}
                          onChange={handleInputChange}
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>

                      {/* SECTION 1: Personal Details */}
                      <fieldset className="space-y-4">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] border-b border-slate-200 pb-2 w-full flex items-center justify-between">
                          <span>1. Personal Information</span>
                          <span className="text-xs font-normal text-slate-500">* Required fields</span>
                        </legend>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <Label htmlFor="full_name" required>
                              Full Name (as per Ghana Card or Official ID)
                            </Label>
                            <Input
                              id="full_name"
                              name="full_name"
                              value={formData.full_name}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. Kwame Mensah"
                              error={touched.full_name && errors.full_name}
                              disabled={isSubmitting}
                              autoComplete="name"
                            />
                          </div>

                          <div>
                            <Label htmlFor="date_of_birth" required>
                              Date of Birth
                            </Label>
                            <Input
                              type="date"
                              id="date_of_birth"
                              name="date_of_birth"
                              value={formData.date_of_birth}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              error={touched.date_of_birth && errors.date_of_birth}
                              disabled={isSubmitting}
                              autoComplete="bday"
                            />
                            {calculatedAge !== null && (
                              <p className="text-xs text-slate-500 mt-1">
                                Calculated Age: <span className="font-semibold text-slate-700">{calculatedAge} years</span> (Eligible range: 18 – 40)
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="gender">Gender</Label>
                            <Select
                              id="gender"
                              name="gender"
                              value={formData.gender}
                              onChange={handleInputChange}
                              disabled={isSubmitting}
                              options={GENDER_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                              placeholder="Select gender (optional)"
                            />
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 2: Contact Details */}
                      <fieldset className="space-y-4">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] border-b border-slate-200 pb-2 w-full">
                          2. Contact & Communications
                        </legend>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="phone_number" required>
                              Primary Phone Number (Voice & SMS)
                            </Label>
                            <Input
                              type="tel"
                              id="phone_number"
                              name="phone_number"
                              value={formData.phone_number}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. 0244123456"
                              error={touched.phone_number && errors.phone_number}
                              disabled={isSubmitting}
                              autoComplete="tel"
                            />
                          </div>

                          <div>
                            <Label htmlFor="whatsapp_number">WhatsApp Number (if different)</Label>
                            <Input
                              type="tel"
                              id="whatsapp_number"
                              name="whatsapp_number"
                              value={formData.whatsapp_number}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. 0501234567"
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <Label htmlFor="email" required>
                              Email Address
                            </Label>
                            <Input
                              type="email"
                              id="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. kwame.mensah@example.com"
                              error={touched.email && errors.email}
                              disabled={isSubmitting}
                              autoComplete="email"
                            />
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 3: Location */}
                      <fieldset className="space-y-4">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] border-b border-slate-200 pb-2 w-full">
                          3. Location & Constituency
                        </legend>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                              error={touched.region && errors.region}
                              disabled={isSubmitting}
                              options={GHANA_REGIONS.map((reg) => ({ value: reg, label: reg }))}
                              placeholder="Select Region"
                            />
                          </div>

                          <div>
                            <Label htmlFor="district_municipality" required>
                              District / Municipality
                            </Label>
                            <Input
                              id="district_municipality"
                              name="district_municipality"
                              value={formData.district_municipality}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. Ayawaso West"
                              error={touched.district_municipality && errors.district_municipality}
                              disabled={isSubmitting}
                            />
                          </div>

                          <div>
                            <Label htmlFor="town_community" required>
                              Town / Community
                            </Label>
                            <Input
                              id="town_community"
                              name="town_community"
                              value={formData.town_community}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. Dzorwulu"
                              error={touched.town_community && errors.town_community}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 4: Background */}
                      <fieldset className="space-y-4">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] border-b border-slate-200 pb-2 w-full">
                          4. Education & Vocation
                        </legend>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="occupation" required>
                              Current Occupation / Profession
                            </Label>
                            <Input
                              id="occupation"
                              name="occupation"
                              value={formData.occupation}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="e.g. Software Engineer, Farmer, Student"
                              error={touched.occupation && errors.occupation}
                              disabled={isSubmitting}
                            />
                          </div>

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
                              error={touched.education_level && errors.education_level}
                              disabled={isSubmitting}
                              options={EDUCATION_LEVELS.map((ed) => ({ value: ed.value, label: ed.label }))}
                              placeholder="Select Education Level"
                            />
                          </div>
                        </div>
                      </fieldset>

                      {/* SECTION 5: Civic Motivation */}
                      <fieldset className="space-y-4">
                        <legend className="text-base font-heading font-bold text-[#0B1F3A] border-b border-slate-200 pb-2 w-full">
                          5. Motivation & Engagement
                        </legend>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="why_join" required>
                              Why do you want to join Youth Republic Leadership? <span className="text-slate-500 font-normal text-xs">(Min 20 characters)</span>
                            </Label>
                            <Textarea
                              id="why_join"
                              name="why_join"
                              value={formData.why_join}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder="Share your vision for civic leadership and what motivates you to get involved with YRL..."
                              rows={4}
                              error={touched.why_join && errors.why_join}
                              disabled={isSubmitting}
                            />
                            <p className="text-xs text-slate-500 mt-1 flex justify-between">
                              <span>Character count: {formData.why_join.length}/1000</span>
                              {formData.why_join.length > 0 && formData.why_join.length < 20 && (
                                <span className="text-amber-600 font-medium">Need at least {20 - formData.why_join.length} more characters</span>
                              )}
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="availability" required>
                              Weekly Availability
                            </Label>
                            <Select
                              id="availability"
                              name="availability"
                              value={formData.availability}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              error={touched.availability && errors.availability}
                              disabled={isSubmitting}
                              options={AVAILABILITY_OPTIONS.map((av) => ({ value: av.value, label: av.label }))}
                              placeholder="Select Weekly Commitment"
                            />
                          </div>

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

                      {/* SECTION 6: Civic Declaration */}
                      <fieldset className="pt-2">
                        <div className="bg-amber-50/60 border border-[#C9A227]/30 rounded-lg p-5">
                          <h4 className="text-sm font-heading font-bold text-[#0B1F3A] mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
                            <span>Civic Member Declaration</span>
                          </h4>
                          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                            Youth Republic Leadership is dedicated to servant leadership, ethical civic stewardship, and community empowerment.
                            A one-time registration fee of GH₵5.00 covers administrative review and civic resource support.
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
                              aria-describedby={errors.civic_acknowledgement ? 'civic_acknowledgement-error' : undefined}
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

                      {/* Controls */}
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
                          className="w-full sm:w-auto min-w-[240px] font-bold shadow-md flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#0B1F3A]" aria-hidden="true" />
                              <span>Saving Application...</span>
                            </>
                          ) : (
                            <>
                              <span>Proceed to Payment</span>
                              <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}

            {/* STEP 2: PAYMENT INSTRUCTIONS & RECEIPT SUBMISSION */}
            {currentStep === 'payment_instructions' && applicationData && (
              <div className="animate-in fade-in duration-300 space-y-8">
                <div className="text-center mb-6">
                  <Badge variant="gold" className="mb-2 uppercase tracking-wider text-xs font-semibold">
                    Step 2 of 3 • Membership Fee Payment
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#0B1F3A]">
                    Membership Fee Payment
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
                    Please complete your membership payment using the provided payment instructions. After payment, upload a clear copy of your payment receipt or proof of payment.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left max-w-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Your payment will be reviewed by YRL before your membership is approved. Uploading a receipt does not automatically make you an official YRL member.</span>
                  </div>
                </div>

                {/* Reference Callout Card */}
                <div className="bg-[#0B1F3A] text-white rounded-lg p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#FCD116] font-semibold block">
                      Application Reference Number
                    </span>
                    <span className="text-xl sm:text-2xl font-mono font-bold select-all">
                      {applicationData.applicationNumber}
                    </span>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="text-xs uppercase tracking-wider text-slate-300 block">
                      Payment Reference
                    </span>
                    <span className="text-lg font-mono font-bold text-[#FCD116] select-all">
                      {applicationData.paymentReference}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector Tabs */}
                <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodTab('manual')}
                    className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${
                      paymentMethodTab === 'manual'
                        ? 'bg-white text-[#0B1F3A] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span>Manual Mobile Money (Upload Receipt)</span>
                    <Badge variant="default" className="text-[10px] py-0 px-1.5 ml-1 bg-amber-100 text-amber-800 border-amber-300">
                      Primary
                    </Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodTab('paystack')}
                    className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${
                      paymentMethodTab === 'paystack'
                        ? 'bg-white text-[#0B1F3A] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Pay Online (Paystack)</span>
                  </button>
                </div>

                {/* OPTION 1: PAYSTACK AUTOMATED PAYMENT */}
                {paymentMethodTab === 'paystack' && (
                  <Card className="border border-blue-200 shadow-sm bg-white">
                    <CardHeader className="bg-blue-50/60 border-b border-blue-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0B1F3A] flex items-center justify-center font-bold">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-[#0B1F3A]">
                            Paystack Instant Online Checkout
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500">
                            Instant online verification via MTN MoMo, Telecel Cash, AT Money, or Visa/Mastercard
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                      <div className="p-4 bg-blue-50/40 rounded-lg border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <span className="text-xs text-slate-500 uppercase font-semibold block">Required Membership Fee</span>
                          <span className="text-2xl font-bold text-[#0B1F3A]">
                            GH₵{applicationData.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold block text-slate-800">Authoritative Reference:</span>
                          <span className="font-mono font-bold text-[#0B1F3A]">{applicationData.paymentReference}</span>
                        </div>
                      </div>

                      {paystackError && (
                        <Alert variant="error" title="Payment Initialization Error">
                          <p className="text-xs">{paystackError}</p>
                        </Alert>
                      )}

                      <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-2 border border-slate-200">
                        <p className="font-semibold text-slate-800">How Paystack Checkout Works:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Click the checkout button below to launch the encrypted Paystack payment portal.</li>
                          <li>Select your preferred payment method: Ghanaian Mobile Money wallet or Card.</li>
                          <li>Follow the prompt on your phone or card provider to authorize GH₵{applicationData.amount.toFixed(2)}.</li>
                          <li>Your payment will be automatically verified by our gateway webhook upon completion.</li>
                        </ul>
                      </div>

                      <Button
                        type="button"
                        onClick={handlePaystackCheckout}
                        disabled={isInitializingPaystack}
                        className="w-full py-3.5 text-base font-semibold bg-[#0B1F3A] hover:bg-[#14325c] text-white flex items-center justify-center gap-2 shadow-sm"
                      >
                        {isInitializingPaystack ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Connecting to Paystack...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            <span>Pay GH₵{applicationData.amount.toFixed(2)} via Paystack</span>
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* OPTION 2: MANUAL MOBILE MONEY INSTRUCTIONS & RECEIPT */}
                {paymentMethodTab === 'manual' && (
                  <>
                    {/* Mobile Money Instructions Card */}
                    {applicationData.instructions && applicationData.instructions.isConfigured ? (
                      <Card className="border border-slate-200 shadow-sm bg-white">
                        <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-[#0B1F3A] flex items-center justify-center font-bold">
                              <CreditCard className="w-5 h-5 text-[#C9A227]" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-bold text-[#0B1F3A]">
                                Official Mobile Money Instructions
                              </CardTitle>
                              <CardDescription className="text-xs text-slate-500">
                                Send the exact registration fee to the authorized YRL account
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-200/50">
                        <div>
                          <span className="text-xs text-slate-500 uppercase font-semibold block">Required Fee</span>
                          <span className="text-xl font-bold text-[#0B1F3A]">
                            GH₵{applicationData.amount.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase font-semibold block">MoMo Number</span>
                          <span className="text-lg font-mono font-bold text-[#0B1F3A] select-all">
                            {applicationData.instructions.momoNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase font-semibold block">Account Name</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {applicationData.instructions.accountName}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-4 rounded-md border border-slate-200/60">
                        <p className="font-semibold text-slate-800">Payment Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-700">
                          <li>Open your Mobile Money wallet on your phone.</li>
                          <li>Send <strong>GH₵{applicationData.amount.toFixed(2)}</strong> to <strong>{applicationData.instructions.momoNumber}</strong> ({applicationData.instructions.accountName}).</li>
                          <li>Use your Application Number <strong>{applicationData.applicationNumber}</strong> as the payment reference or note if supported.</li>
                          <li>Wait for the SMS confirmation and copy the <strong>Transaction ID / Reference</strong>.</li>
                          <li>Take a clear screenshot of the SMS or payment confirmation receipt and upload below.</li>
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Safe Unconfigured State */
                  <Alert variant="warning" title="Payment Destination Configuration in Progress" className="bg-amber-50/90 border-[#C9A227] text-slate-800">
                    <p className="text-sm text-slate-700 leading-relaxed mt-1">
                      Your membership application (<strong>{applicationData.applicationNumber}</strong>) has been successfully recorded in our system.
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed mt-2">
                      The official YRL Mobile Money payment destination is currently being finalized by the Secretariat. Payment instructions will be made available shortly. Please save your Application Reference number to submit payment once the destination is activated.
                    </p>
                    <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                        className="text-xs font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1.5" />
                        Print / Save Reference
                      </Button>
                      <Link href="/">
                        <Button variant="ghost" size="sm" className="text-xs">
                          Return to Homepage
                        </Button>
                      </Link>
                    </div>
                  </Alert>
                )}

                {/* Receipt Upload Form */}
                <Card className="border border-[#C9A227]/30 shadow-md bg-white">
                    <CardHeader className="border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-[#C9A227]" />
                        <CardTitle className="text-lg font-bold text-[#0B1F3A]">
                          Upload Payment Receipt
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs text-slate-500">
                        Submit the transaction details and payment receipt for administrator verification
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                      {receiptErrors._server && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs sm:text-sm">
                          {receiptErrors._server}
                        </div>
                      )}

                      <form onSubmit={handleReceiptSubmit} className="space-y-6">
                        <div>
                          <Label htmlFor="transactionReference" required>
                            Mobile Money Transaction ID / SMS Reference
                          </Label>
                          <Input
                            id="transactionReference"
                            name="transactionReference"
                            value={receiptForm.transactionReference}
                            onChange={(e) =>
                              setReceiptForm((prev) => ({ ...prev, transactionReference: e.target.value }))
                            }
                            placeholder="e.g. 1729482910 or TXN-492042"
                            error={receiptErrors.transactionReference}
                            disabled={isUploadingReceipt}
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Found in the SMS confirmation from MTN, Vodafone/Telecel, or AirtelTigo.
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="claimedPaymentDate">
                            Date of Payment
                          </Label>
                          <Input
                            type="date"
                            id="claimedPaymentDate"
                            name="claimedPaymentDate"
                            value={receiptForm.claimedPaymentDate}
                            onChange={(e) =>
                              setReceiptForm((prev) => ({ ...prev, claimedPaymentDate: e.target.value }))
                            }
                            disabled={isUploadingReceipt}
                          />
                        </div>

                        <div>
                          <Label htmlFor="receipt_file" required>
                            Payment Receipt / Screenshot (JPEG, PNG, WEBP, or PDF • Max 5MB)
                          </Label>
                          <input
                            type="file"
                            id="receipt_file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="hidden"
                            disabled={isUploadingReceipt}
                          />

                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                              receiptErrors.file
                                ? 'border-red-300 bg-red-50/50'
                                : receiptForm.file
                                ? 'border-emerald-400 bg-emerald-50/30'
                                : 'border-slate-300 hover:border-[#C9A227] bg-slate-50/50'
                            }`}
                          >
                            {receiptForm.file ? (
                              <div className="flex items-center justify-center gap-3 text-emerald-800">
                                <FileCheck className="w-8 h-8 text-emerald-600" />
                                <div className="text-left">
                                  <p className="text-sm font-semibold truncate max-w-xs">{receiptForm.file.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {(receiptForm.file.size / 1024 / 1024).toFixed(2)} MB • Click to change
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                                <p className="text-sm font-semibold text-slate-700">
                                  Click or drag & drop to upload payment receipt
                                </p>
                                <p className="text-xs text-slate-500">
                                  PNG, JPG, WEBP, or PDF up to 5MB
                                </p>
                              </div>
                            )}
                          </div>
                          {receiptErrors.file && (
                            <p className="text-xs text-red-600 mt-1 font-medium">{receiptErrors.file}</p>
                          )}
                        </div>

                        {/* Critical Evidence Notice */}
                        <div className="bg-amber-50/70 border border-amber-200 rounded-md p-4 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-700 leading-relaxed">
                            <strong>Notice on Payment Verification:</strong> Submitting a transaction receipt serves as evidence of payment for review. It does <strong>not</strong> constitute automatic confirmation or immediate membership activation. The YRL Secretariat verifies all payments manually before official membership approval.
                          </p>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            onClick={() => setCurrentStep('application')}
                            disabled={isUploadingReceipt}
                            className="w-full sm:w-auto text-slate-600"
                          >
                            Back to Application
                          </Button>

                          <Button
                            type="submit"
                            variant="gold"
                            size="lg"
                            disabled={isUploadingReceipt}
                            className="w-full sm:w-auto min-w-[260px] font-bold shadow-md flex items-center justify-center gap-2"
                          >
                            {isUploadingReceipt ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-[#0B1F3A]" aria-hidden="true" />
                                <span>Uploading Receipt...</span>
                              </>
                            ) : (
                              <>
                                <span>Submit Receipt for Verification</span>
                                <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
              </>
            )}
          </div>
        )}

            {/* STEP 3: CONFIRMATION / PENDING VERIFICATION */}
            {currentStep === 'confirmation' && applicationData && (
              <div className="animate-in fade-in duration-300">
                <Card className="border-2 border-[#C9A227]/40 shadow-lg bg-white overflow-hidden">
                  <div className="h-2 w-full bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]" />

                  <CardHeader className="text-center pb-6 pt-8 bg-slate-50 border-b border-slate-100">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-4 border-2 border-amber-300 shadow-sm">
                      <Clock className="w-9 h-9 text-[#C9A227]" aria-hidden="true" />
                    </div>
                    <Badge variant="warning" className="mx-auto mb-2 text-xs uppercase tracking-wider font-semibold bg-amber-100 text-amber-800 border-amber-200">
                      Payment Submitted for Verification
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#0B1F3A]">
                      Payment Submitted for Verification
                    </h2>
                    <p className="text-sm sm:text-base font-medium text-slate-800 max-w-lg mx-auto mt-2 leading-relaxed">
                      Your payment evidence has been received and is awaiting verification by YRL.
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-1 leading-relaxed">
                      Your membership is not yet officially activated. You will be notified after the verification and membership approval process is completed.
                    </p>
                  </CardHeader>

                  <CardContent className="pt-8 space-y-6">
                    {/* References Box */}
                    <div className="bg-[#0B1F3A] text-white rounded-lg p-6 text-center relative overflow-hidden shadow-inner">
                      <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-10">
                        <Shield className="w-32 h-32" />
                      </div>
                      <p className="text-xs uppercase tracking-widest text-[#FCD116] font-semibold mb-1">
                        Application Reference Number
                      </p>
                      <p className="text-2xl sm:text-3xl font-mono font-extrabold tracking-wider text-white select-all">
                        {applicationData.applicationNumber}
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-around gap-2 text-xs text-slate-300">
                        <div>
                          Payment Reference: <span className="font-mono text-[#FCD116] font-bold">{applicationData.paymentReference}</span>
                        </div>
                        <div>
                          Transaction ID: <span className="font-mono text-white font-semibold">{receiptForm.transactionReference}</span>
                        </div>
                      </div>
                    </div>

                    {/* What Happens Next Card */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200/80 space-y-3">
                      <h4 className="text-sm font-heading font-bold text-[#0B1F3A] flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-[#C9A227]" />
                        <span>What Happens Next?</span>
                      </h4>
                      <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-700 space-y-2 leading-relaxed">
                        <li>
                          <strong>Secretariat Verification:</strong> An authorized YRL administrator will verify your Mobile Money transaction and receipt against our official accounts.
                        </li>
                        <li>
                          <strong>Membership Approval:</strong> Once the payment is verified, your membership will be officially activated.
                        </li>
                        <li>
                          <strong>Official Member ID:</strong> An official YRL Membership ID (e.g. <code>YRL-MEM-YYYY-XXXX</code>) will be generated and issued upon activation.
                        </li>
                        <li>
                          <strong>Regional Welcome:</strong> You will be connected with your assigned Regional Coordinator and local civic chapter.
                        </li>
                      </ol>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 pb-6 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => window.print()}
                      className="w-full sm:w-auto text-xs font-semibold"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print / Save Confirmation
                    </Button>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        onClick={handleReset}
                        className="w-full sm:w-auto text-xs text-slate-600"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Start New Application
                      </Button>
                      <Link href="/" className="w-full sm:w-auto">
                        <Button
                          variant="gold"
                          size="md"
                          className="w-full sm:w-auto font-bold text-xs"
                        >
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
    </div>
  );
}

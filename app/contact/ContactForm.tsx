'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
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
import { Alert } from '@/components/ui/Alert';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { contactSchema } from '@/lib/validations/contact';

interface FormStateType {
  full_name: string;
  email: string;
  message: string;
}

const initialFormData: FormStateType = {
  full_name: '',
  email: '',
  message: '',
};

export function ContactForm() {
  const [formData, setFormData] = useState<FormStateType>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    referenceId: string;
    submittedAt: string;
  }>({
    referenceId: '',
    submittedAt: '',
  });

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Field change handler
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  // Single field validation for onBlur
  const validateField = (name: keyof FormStateType): string => {
    try {
      const fieldSchema = contactSchema.shape[name];
      fieldSchema.parse(formData[name]);
      return '';
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const zErr = err as { issues: Array<{ message: string }> };
        return zErr.issues[0]?.message || 'Invalid input';
      }
      return 'Invalid input';
    }
  };

  const handleBlur = (field: keyof FormStateType) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field);
    setErrors((prev) => {
      const updated = { ...prev };
      if (errorMsg) {
        updated[field] = errorMsg;
      } else {
        delete updated[field];
      }
      return updated;
    });
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      full_name: true,
      email: true,
      message: true,
    });

    // Validate entire form with Zod
    const result = contactSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (!formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      });
      setErrors(formattedErrors);

      // Focus error summary for accessibility
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
      return;
    }

    // Clear errors and enter loading state
    setErrors({});
    setIsSubmitting(true);

    // Simulated submission delay (1,200ms per Model A specification)
    setTimeout(() => {
      const randomId = `YRL-MSG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      setConfirmationData({
        referenceId: randomId,
        submittedAt: formattedDate,
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  // Reset form handler
  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
    setTouched({});
    setIsSuccess(false);
    setConfirmationData({ referenceId: '', submittedAt: '' });
  };

  if (isSuccess) {
    return (
      <Card className="border-2 border-emerald-600/30 bg-white shadow-md">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <Badge variant="success" className="mb-1">
                Transmission Logged
              </Badge>
              <CardTitle className="text-2xl font-bold text-[#0B1F3A]">
                Message Received
              </CardTitle>
            </div>
          </div>
          <CardDescription className="text-slate-700 mt-2">
            Thank you for contacting Youth Republic Leadership. Your inquiry has been registered with our interim communications desk.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Reference Box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Inquiry Reference Number
            </div>
            <div className="font-mono text-xl font-bold text-[#0B1F3A]">
              {confirmationData.referenceId}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Please quote this reference in any follow-up correspondence.
            </div>
          </div>

          {/* Summary of Submitted Details */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Submission Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-slate-100 bg-white p-3">
                <span className="text-xs text-slate-500 block">Sender Name</span>
                <span className="font-medium text-slate-900">{formData.full_name}</span>
              </div>
              <div className="rounded border border-slate-100 bg-white p-3">
                <span className="text-xs text-slate-500 block">Email Address</span>
                <span className="font-medium text-slate-900">{formData.email}</span>
              </div>
              <div className="rounded border border-slate-100 bg-white p-3 sm:col-span-2">
                <span className="text-xs text-slate-500 block">Timestamp</span>
                <span className="font-medium text-slate-900">{confirmationData.submittedAt}</span>
              </div>
            </div>
          </div>

          {/* Response Guidance Alert */}
          <Alert variant="info" title="Response Time Expectation">
            <div className="text-xs text-slate-700 leading-relaxed">
              Our interim team reviews civic inquiries in the order received. We aim to respond within 3 to 5 business days during this interim formation phase.
            </div>
          </Alert>

          {/* Data Protection Disclaimer */}
          <div className="text-xs text-slate-500 leading-relaxed">
            Your details are handled strictly in accordance with Ghana&apos;s Data Protection Act, 2012 (Act 843). YRL does not share contact details with commercial third parties.
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 border-t border-slate-200 bg-slate-50 pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
            Send Another Message
          </Button>
          <Link href="/" className="w-full sm:w-auto sm:ml-auto">
            <Button variant="primary" className="w-full">
              Return to Home
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-5 w-5 text-[#C9A227]" aria-hidden="true" />
          <CardTitle className="text-xl sm:text-2xl font-bold text-[#0B1F3A]">
            Send an Official Message
          </CardTitle>
        </div>
        <CardDescription className="text-slate-600 text-sm">
          Please provide your details and inquiry below. All fields marked with an asterisk (<span className="text-red-600 font-bold">*</span>) are required.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Accessible Error Summary Banner */}
        {Object.keys(errors).length > 0 && (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            className="mb-6 outline-none"
          >
            <Alert
              variant="error"
              title={`Please correct the following ${Object.keys(errors).length} error${Object.keys(errors).length > 1 ? 's' : ''} before submitting:`}
            >
              <ul className="mt-1.5 list-disc list-inside text-xs space-y-1">
                {Object.entries(errors).map(([field, msg]) => (
                  <li key={field}>
                    <a
                      href={`#${field}`}
                      className="font-medium underline hover:text-red-950 focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                    >
                      {msg}
                    </a>
                  </li>
                ))}
              </ul>
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Field 1: Full Name */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="full_name" className="text-sm font-semibold text-slate-900">
                Full Name <span className="text-red-600" aria-hidden="true">*</span>
              </Label>
              <span className="text-xs text-slate-500">Required</span>
            </div>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleInputChange}
              onBlur={() => handleBlur('full_name')}
              placeholder="e.g., Kwame Mensah"
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={touched.full_name && !!errors.full_name}
              aria-describedby={errors.full_name ? 'full_name-error' : undefined}
              className={errors.full_name && touched.full_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {touched.full_name && errors.full_name && (
              <p id="full_name-error" role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {errors.full_name}
              </p>
            )}
          </div>

          {/* Field 2: Email Address */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-900">
                Email Address <span className="text-red-600" aria-hidden="true">*</span>
              </Label>
              <span className="text-xs text-slate-500">Required</span>
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={() => handleBlur('email')}
              placeholder="e.g., kwame.mensah@example.com"
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={errors.email && touched.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {touched.email && errors.email && (
              <p id="email-error" role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Field 3: Message */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="message" className="text-sm font-semibold text-slate-900">
                Message <span className="text-red-600" aria-hidden="true">*</span>
              </Label>
              <span className="text-xs text-slate-500">
                {formData.message.length} / 2000 characters
              </span>
            </div>
            <Textarea
              id="message"
              name="message"
              rows={6}
              value={formData.message}
              onChange={handleInputChange}
              onBlur={() => handleBlur('message')}
              placeholder="Please state the purpose of your inquiry, question, or civic proposal in detail..."
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={touched.message && !!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
              className={errors.message && touched.message ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {touched.message && errors.message && (
              <p id="message-error" role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {errors.message}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Minimum 20 characters required. Maximum 2,000 characters.
            </p>
          </div>

          {/* Civic Disclaimers */}
          <div className="pt-2">
            <Disclaimer
              title="Civic Communication Notice"
              variant="compact"
            >
              <p>
                Correspondence submitted through this portal is managed in accordance with the Ghana Data Protection Act, 2012 (Act 843). YRL will never ask for money, fees, or financial credentials.
              </p>
            </Disclaimer>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[180px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Sending Message...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

import { z } from 'zod';

export const GHANA_REGIONS = [
  'Ahafo',
  'Ashanti',
  'Bono',
  'Bono East',
  'Central',
  'Eastern',
  'Greater Accra',
  'North East',
  'Northern',
  'Oti',
  'Savannah',
  'Upper East',
  'Upper West',
  'Volta',
  'Western',
  'Western North',
] as const;

export const EDUCATION_LEVELS = [
  { value: 'High School / WASSCE', label: 'High School / WASSCE' },
  { value: 'Diploma / HND', label: 'Diploma / HND' },
  { value: "Bachelor's Degree", label: "Bachelor's Degree" },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'Doctorate / PhD', label: 'Doctorate / PhD' },
  { value: 'Professional Qualification', label: 'Professional Qualification' },
  { value: 'Other', label: 'Other' },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: '2-5 hours/week', label: '2 – 5 hours per week (Flexible / Community Participation)' },
  { value: '5-10 hours/week', label: '5 – 10 hours per week (Active Volunteer)' },
  { value: '10+ hours/week', label: '10+ hours per week (Dedicated Civic Champion)' },
  { value: 'Events & Projects Only', label: 'Events & Periodic Projects Only' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
] as const;

export const ENGAGEMENT_INTEREST_OPTIONS = [
  { id: 'community_projects', label: 'Grassroots Community Service & Cleanups' },
  { id: 'civic_education', label: 'Civic Education & Youth Leadership Workshops' },
  { id: 'advocacy', label: 'Youth Rights, Employment & Policy Advocacy' },
  { id: 'digital_media', label: 'Digital Campaigns & Communications' },
] as const;

export const RegionEnum = z.enum(GHANA_REGIONS, {
  message: 'Select your region from the list',
});

// Member registration validation schema (Model A client-side validation)
export const memberSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: 'Enter your full name (minimum 2 characters)' }),
  date_of_birth: z
    .string()
    .min(1, { message: 'Enter your date of birth' })
    .refine(
      (val) => {
        const birthDate = new Date(val);
        if (isNaN(birthDate.getTime())) return false;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= 18 && age <= 40;
      },
      { message: 'Members must be between 18 and 40 years of age' }
    ),
  gender: z.string().optional().nullable(),
  phone_number: z
    .string()
    .trim()
    .min(8, { message: 'Enter a valid phone number (minimum 8 digits)' }),
  whatsapp_number: z.string().trim().optional().nullable(),
  email: z
    .string()
    .trim()
    .email({ message: 'Enter a valid email address' }),
  region: RegionEnum,
  district_municipality: z
    .string()
    .trim()
    .min(2, { message: 'Enter your district or municipality' }),
  town_community: z
    .string()
    .trim()
    .min(2, { message: 'Enter your town or community' }),
  occupation: z
    .string()
    .trim()
    .min(2, { message: 'Enter your current occupation' }),
  education_level: z
    .string()
    .trim()
    .min(2, { message: 'Select your highest level of education' }),
  why_join: z
    .string()
    .trim()
    .min(20, { message: 'Please share why you want to join YRL (minimum 20 characters)' })
    .max(1000, { message: 'Motivation statement cannot exceed 1000 characters' }),
  availability: z
    .string()
    .trim()
    .min(1, { message: 'Select your weekly availability' }),
  engagement_interests: z.array(z.string()).optional(),
  civic_acknowledgement: z.literal(true, {
    message: 'You must confirm that your details are accurate and acknowledge the civic ethos of YRL',
  }),
});

// Schema for the server action with honeypot
export const memberSubmissionSchema = memberSchema.and(
  z.object({
    honeypot: z.string().max(0, { message: 'Spam detected' }).optional().or(z.literal('')),
  })
);

export type MemberFormData = z.infer<typeof memberSchema>;
export type MemberSubmissionInput = z.infer<typeof memberSubmissionSchema>;

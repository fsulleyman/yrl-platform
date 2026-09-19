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

export const YRL_POSITIONS = [
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
  'Interim Regional Minister',
] as const;

export const RegionEnum = z.enum(GHANA_REGIONS, {
  message: 'Select your region from the list',
});

export const PositionEnum = z.enum(YRL_POSITIONS, {
  message: 'Select the position you are applying for',
});

export const NominationStatusEnum = z.enum([
  'submitted',
  'screening',
  'shortlisted',
  'interview',
  'selected',
  'declined',
]);

// Base nomination schema strictly matching DB columns
export const nominationSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, { message: 'Enter your full name' }),
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
        { message: 'Applicants must be between 18 and 40 years of age' }
      ),
    gender: z.string().optional().nullable(),
    phone_number: z
      .string()
      .trim()
      .min(8, { message: 'Enter a valid phone number' }),
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
    organisation_institution: z.string().trim().optional().nullable(),
    education_level: z
      .string()
      .trim()
      .min(2, { message: 'Select or enter your highest level of education' }),
    area_of_study_profession: z
      .string()
      .trim()
      .min(2, { message: 'Enter your area of study or profession' }),
    position_applied: PositionEnum,
    region_if_regional_minister: z
      .enum(GHANA_REGIONS)
      .optional()
      .nullable()
      .or(z.literal('').transform(() => null)),
    has_leadership_experience: z.boolean().default(false),
    prior_position: z.string().trim().optional().nullable(),
    prior_organisation: z.string().trim().optional().nullable(),
    prior_duration: z.string().trim().optional().nullable(),
    prior_responsibilities: z.string().trim().optional().nullable(),
    suitability_statement: z.string().trim().optional().nullable(),
    proudest_achievement: z.string().trim().optional().nullable(),
    q1_why_serve: z
      .string()
      .trim()
      .min(20, { message: 'Please explain why you wish to serve in YRL (minimum 20 characters)' }),
    q2_leadership_as_service: z
      .string()
      .trim()
      .min(20, { message: 'Share your perspective on leadership as service (minimum 20 characters)' }),
    q3_first_90_days: z
      .string()
      .trim()
      .min(20, { message: 'Outline your priorities for the first 90 days (minimum 20 characters)' }),
    q4_recruitment_plan: z
      .string()
      .trim()
      .min(20, { message: 'Describe your grassroots recruitment plan (minimum 20 characters)' }),
    q5_recruitment_estimate: z.string().trim().optional().nullable(),
    q6_regional_building_plan: z.string().trim().optional().nullable(),
    weekly_hours: z
      .string()
      .trim()
      .min(1, { message: 'Specify the weekly hours you can dedicate to this role' }),
    willing_online_meetings: z.literal(true, {
      message: 'You must confirm willingness to attend online meetings',
    }),
    willing_physical_activities: z.literal(true, {
      message: 'You must confirm willingness to engage in physical activities',
    }),
    referee_name: z
      .string()
      .trim()
      .min(2, { message: 'Enter your referee full name' }),
    referee_relationship: z
      .string()
      .trim()
      .min(2, { message: 'Specify your relationship to the referee' }),
    referee_phone: z
      .string()
      .trim()
      .min(8, { message: 'Enter your referee phone number' }),
    declaration_agreed: z.literal(true, {
      message: 'You must agree to the declaration to submit your nomination',
    }),
  })
  .superRefine((data, ctx) => {
    // If Regional Minister is selected, region_if_regional_minister is required
    if (data.position_applied === 'Interim Regional Minister') {
      if (!data.region_if_regional_minister) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select the region you wish to serve as Interim Regional Minister',
          path: ['region_if_regional_minister'],
        });
      }
      if (!data.q5_recruitment_estimate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select an estimated number of members for your regional recruitment target',
          path: ['q5_recruitment_estimate'],
        });
      }
      if (!data.q6_regional_building_plan || data.q6_regional_building_plan.trim().length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide your regional executive building plan (minimum 20 characters)',
          path: ['q6_regional_building_plan'],
        });
      }
    }
  });

// Schema for the server action with honeypot
export const nominationSubmissionSchema = nominationSchema.and(
  z.object({
    honeypot: z.string().max(0, { message: 'Spam detected' }).optional().or(z.literal('')),
  })
);

export type NominationInput = z.infer<typeof nominationSchema>;
export type NominationSubmissionInput = z.infer<typeof nominationSubmissionSchema>;

// Member schema
export const memberSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: 'Enter your full name' }),
  phone: z
    .string()
    .trim()
    .min(8, { message: 'Enter a valid phone number' }),
  email: z
    .string()
    .trim()
    .email({ message: 'Enter a valid email address' })
    .optional()
    .or(z.literal('')),
  region: RegionEnum,
  district: z.string().trim().optional().nullable(),
  honeypot: z.string().max(0, { message: 'Spam detected' }).optional().or(z.literal('')),
});

export type MemberInput = z.infer<typeof memberSchema>;

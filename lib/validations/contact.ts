import { z } from 'zod';

export const contactSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: 'Enter your full name (minimum 2 characters)' })
    .max(100, { message: 'Name cannot exceed 100 characters' }),
  email: z
    .string()
    .trim()
    .email({ message: 'Enter a valid email address' }),
  message: z
    .string()
    .trim()
    .min(20, { message: 'Please enter a message with at least 20 characters' })
    .max(2000, { message: 'Message cannot exceed 2000 characters' }),
});

export type ContactFormData = z.infer<typeof contactSchema>;

import { z } from 'zod';

export const ContactSchema = z.object({
  name: z.string().min(1, 'Please enter your name'),
  email: z.email('Enter a valid email'),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(1, 'Please tell us about your project'),
});

export type ContactValues = z.infer<typeof ContactSchema>;

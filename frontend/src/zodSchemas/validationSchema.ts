import { z } from 'zod';

export const userFormSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    apiKey: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
});

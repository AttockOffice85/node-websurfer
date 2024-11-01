import { z } from 'zod';

export const userFormSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    ip_address: z.string().optional(),
    ip_port: z.string().optional(),
    ip_username: z.string().optional(),
    ip_password: z.string().optional(),
});

export const companyFormSchema = z.object({
    company_name: z.string().min(2, { message: 'Invalid Company Name' }),
    link: z.string().min(6, { message: `Provide a valid profile linkedin's link` }),
    fbLink: z.union([z.string().length(0, { message: `Provide a valid profile facebook's link` }), z.string().min(6)])
        .optional()
        .transform(e => e === "" ? undefined : e),
    instaLink: z.union([z.string().length(0, { message: `Provide a valid profile instagram's link` }), z.string().min(6)])
        .optional()
        .transform(e => e === "" ? undefined : e),
});

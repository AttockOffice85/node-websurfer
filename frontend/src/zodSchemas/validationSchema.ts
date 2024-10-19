import { z } from 'zod';

export const userFormSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    ip_address: z.string().min(2, { message: 'Kindly provide correct data for the ipAddress' }),
    ip_port: z.string().min(2, { message: 'Kindly provide correct data for the ipPort' }),
    ip_username: z.string().min(2, { message: 'Kindly provide correct data for the ipUsername' }),
    ip_password: z.string().min(2, { message: 'Kindly provide correct data for the ipPassword' }),
});

export const companyFormSchema = z.object({
    company_name: z.string().min(2, { message: 'Invalid Company Name' }),
    company_link: z.string().min(6, { message: `Provide a valid profile linkedin's link` }),
});

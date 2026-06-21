import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+\d{8,15}$/, 'Phone must be E.164 format like +919812345678');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .optional();

export const personNameSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().max(60).default(''),
});

export const emailSignupPayloadSchema = personNameSchema.extend({
  role: z.nativeEnum(UserRole),
  password: passwordSchema,
  phone: phoneSchema.optional(),
});

export const phoneSignupPayloadSchema = personNameSchema.extend({
  role: z.nativeEnum(UserRole),
  password: passwordSchema,
  email: emailSchema.optional(),
});

export const requestOtpSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('PHONE'),
    phone: phoneSchema,
    purpose: z.enum(['signup', 'login']).optional(),
  }),
  z.object({
    channel: z.literal('EMAIL'),
    email: emailSchema,
    purpose: z.enum(['signup', 'login']).optional(),
  }),
]);

export const verifyOtpSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('PHONE'),
    phone: phoneSchema,
    code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    signup: phoneSignupPayloadSchema.optional(),
  }),
  z.object({
    channel: z.literal('EMAIL'),
    email: emailSchema,
    code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    signup: emailSignupPayloadSchema.optional(),
  }),
]);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export type RequestOtpBody = z.infer<typeof requestOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;

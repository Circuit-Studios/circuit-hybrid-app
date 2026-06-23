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

function resolveOtpChannel(data: {
  channel?: 'PHONE' | 'EMAIL';
  phone?: string;
  email?: string;
}): 'PHONE' | 'EMAIL' | undefined {
  if (data.channel) return data.channel;
  if (data.phone && !data.email) return 'PHONE';
  if (data.email && !data.phone) return 'EMAIL';
  if (data.phone) return 'PHONE';
  return undefined;
}

const requestOtpBaseSchema = z.object({
  channel: z.enum(['PHONE', 'EMAIL']).optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  purpose: z.enum(['signup', 'login']).optional(),
});

export const requestOtpSchema = requestOtpBaseSchema
  .superRefine((data, ctx) => {
    const channel = resolveOtpChannel(data);
    if (!channel) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide channel with email/phone, or phone alone for legacy requests',
      });
      return;
    }
    if (channel === 'PHONE' && !data.phone) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Phone is required' });
    }
    if (channel === 'EMAIL' && !data.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email is required' });
    }
  })
  .transform((data) => {
    const channel = resolveOtpChannel(data)!;
    if (channel === 'PHONE') {
      return {
        channel: 'PHONE' as const,
        phone: data.phone!,
        purpose: data.purpose,
      };
    }
    return {
      channel: 'EMAIL' as const,
      email: data.email!,
      purpose: data.purpose,
    };
  });

const verifyOtpBaseSchema = z.object({
  channel: z.enum(['PHONE', 'EMAIL']).optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  signup: z.union([emailSignupPayloadSchema, phoneSignupPayloadSchema]).optional(),
});

export const verifyOtpSchema = verifyOtpBaseSchema
  .superRefine((data, ctx) => {
    const channel = resolveOtpChannel(data);
    if (!channel) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide channel with email/phone, or phone alone for legacy requests',
      });
      return;
    }
    if (channel === 'PHONE' && !data.phone) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Phone is required' });
    }
    if (channel === 'EMAIL' && !data.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email is required' });
    }
  })
  .transform((data) => {
    const channel = resolveOtpChannel(data)!;
    if (channel === 'PHONE') {
      return {
        channel: 'PHONE' as const,
        phone: data.phone!,
        code: data.code,
        signup: data.signup as z.infer<typeof phoneSignupPayloadSchema> | undefined,
      };
    }
    return {
      channel: 'EMAIL' as const,
      email: data.email!,
      code: data.code,
      signup: data.signup as z.infer<typeof emailSignupPayloadSchema> | undefined,
    };
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

/** Local-only bypass when ALLOW_DIRECT_REGISTER=true and APP_ENV=local. */
export const directRegisterSchema = personNameSchema.extend({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.nativeEnum(UserRole).default(UserRole.CREW),
  phone: phoneSchema.optional(),
});

export type RequestOtpBody = z.infer<typeof requestOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;

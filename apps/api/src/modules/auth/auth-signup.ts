import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict } from '../../lib/http.js';
import { hashPassword } from './password.service.js';
import type { VerifyOtpBody } from './auth.schemas.js';
import { signupPasswordSchema } from './auth.schemas.js';

export async function linkPendingInvites(
  userId: string,
  phone?: string | null,
  email?: string | null,
): Promise<void> {
  const or: Array<{ inviteePhone?: string; inviteeEmail?: string }> = [];
  if (phone) or.push({ inviteePhone: phone });
  if (email) or.push({ inviteeEmail: email });
  if (or.length === 0) return;

  await prisma.projectMember.updateMany({
    where: { userId: null, OR: or },
    data: { userId },
  });
}

async function assertOptionalSignupIdentifiersAvailable(
  email?: string | null,
  phone?: string | null,
): Promise<void> {
  if (phone) {
    const phoneOwner = await prisma.user.findUnique({ where: { phone } });
    if (phoneOwner) {
      throw conflict('An account with this phone number already exists');
    }
  }
  if (email) {
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner) {
      throw conflict('An account with this email already exists');
    }
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function createSignupUser(data: Prisma.UserCreateInput): Promise<User> {
  try {
    return await prisma.user.create({ data });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw conflict('An account with this email or phone number already exists');
    }
    throw err;
  }
}

/** Create a user row; maps unique-constraint races to HTTP 409. */
export async function createUserOrConflict(data: Prisma.UserCreateInput): Promise<User> {
  return createSignupUser(data);
}

/** Find existing user or create one from signup payload after OTP verification. */
export async function findOrCreateUserAfterOtp(input: VerifyOtpBody): Promise<User> {
  if (input.channel === 'EMAIL') {
    let user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      if (!input.signup) {
        throw badRequest(
          'First-time sign-in requires signup payload (firstName, lastName, role, password)',
        );
      }
      if (!input.signup.password) {
        throw badRequest('Password is required to create an account');
      }
      const signupPassword = signupPasswordSchema.parse(input.signup.password);
      const phone = input.signup && 'phone' in input.signup ? input.signup.phone : undefined;
      await assertOptionalSignupIdentifiersAvailable(undefined, phone);
      const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
      if (existingEmail) {
        throw conflict('An account with this email already exists');
      }
      const passwordHash = await hashPassword(signupPassword);
      user = await createSignupUser({
        email: input.email,
        emailVerified: true,
        phone,
        firstName: input.signup.firstName,
        lastName: input.signup.lastName,
        defaultRole: input.signup.role,
        passwordHash,
      });
      await linkPendingInvites(user.id, user.phone, user.email);
      return user;
    }
    if (input.signup) {
      throw conflict('An account with this email already exists');
    }
    return user;
  }

  let user = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (!user) {
    if (!input.signup) {
      throw badRequest(
        'First-time sign-in requires signup payload (firstName, lastName, role, password)',
      );
    }
    if (!input.signup.password) {
      throw badRequest('Password is required to create an account');
    }
    const signupPassword = signupPasswordSchema.parse(input.signup.password);
    const email = input.signup && 'email' in input.signup ? input.signup.email : undefined;
    await assertOptionalSignupIdentifiersAvailable(email, undefined);
    const existingPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existingPhone) {
      throw conflict('An account with this phone number already exists');
    }
    const passwordHash = await hashPassword(signupPassword);
    user = await createSignupUser({
      phone: input.phone,
      email,
      ...(email ? { emailVerified: true } : {}),
      firstName: input.signup.firstName,
      lastName: input.signup.lastName,
      defaultRole: input.signup.role,
      passwordHash,
    });
    await linkPendingInvites(user.id, user.phone, user.email);
    return user;
  }
  if (input.signup) {
    throw conflict('An account with this phone number already exists');
  }
  return user;
}

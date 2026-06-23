import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict } from '../../lib/http.js';
import { hashPassword } from './password.service.js';
import type { VerifyOtpBody } from './auth.schemas.js';

async function linkPendingInvites(
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

/** Find existing user or create one from signup payload after OTP verification. */
export async function findOrCreateUserAfterOtp(input: VerifyOtpBody): Promise<User> {
  if (input.channel === 'EMAIL') {
    let user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      if (!input.signup) {
        throw badRequest('First-time sign-in requires signup payload (firstName, lastName, role)');
      }
      const passwordHash = input.signup.password
        ? await hashPassword(input.signup.password)
        : undefined;
      user = await prisma.user.create({
        data: {
          email: input.email,
          emailVerified: true,
          phone: input.signup.phone,
          firstName: input.signup.firstName,
          lastName: input.signup.lastName,
          defaultRole: input.signup.role,
          passwordHash,
        },
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
      throw badRequest('First-time sign-in requires signup payload (firstName, lastName, role)');
    }
    const passwordHash = input.signup.password
      ? await hashPassword(input.signup.password)
      : undefined;
    user = await prisma.user.create({
      data: {
        phone: input.phone,
        email: input.signup.email,
        firstName: input.signup.firstName,
        lastName: input.signup.lastName,
        defaultRole: input.signup.role,
        passwordHash,
      },
    });
    await linkPendingInvites(user.id, user.phone, user.email);
    return user;
  }
  if (input.signup) {
    throw conflict('An account with this phone number already exists');
  }
  return user;
}

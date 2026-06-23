/** Mask sensitive contact info for on-screen display. */

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return trimmed;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length <= 2) return `${local[0] ?? ''}•@${domain}`;
  return `${local.slice(0, 2)}${'•'.repeat(Math.min(6, local.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return trimmed;
  const prefix = trimmed.startsWith('+') ? trimmed.slice(0, 4) : trimmed.slice(0, 3);
  const suffix = trimmed.slice(-2);
  return `${prefix} •••• ${suffix}`;
}

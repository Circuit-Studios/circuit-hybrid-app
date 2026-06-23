/** Mask sensitive contact info for on-screen display. */

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return trimmed;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const lastDot = domain.lastIndexOf('.');
  const tld = lastDot >= 0 ? domain.slice(lastDot) : '';
  const localMask = local.length <= 2 ? `${local}***` : `${local.slice(0, 2)}***`;
  return `${localMask}@***${tld}`;
}

export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 5) return trimmed;
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-2)}`;
}

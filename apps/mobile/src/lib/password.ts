export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function isValidPassword(password: string): boolean {
  const trimmed = password.trim();
  return trimmed.length >= MIN_PASSWORD_LENGTH && trimmed.length <= MAX_PASSWORD_LENGTH;
}

export function passwordTooShortHint(): string {
  return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
}

export function choosePasswordHint(): string {
  return `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`;
}

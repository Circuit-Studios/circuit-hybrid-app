import {
  choosePasswordHint,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
  passwordTooShortHint,
} from '@/lib/password';

describe('password helpers', () => {
  it('validates minimum length', () => {
    expect(isValidPassword(''.padEnd(MIN_PASSWORD_LENGTH - 1, 'a'))).toBe(false);
    expect(isValidPassword(''.padEnd(MIN_PASSWORD_LENGTH, 'a'))).toBe(true);
  });

  it('rejects whitespace-only password', () => {
    expect(isValidPassword('        ')).toBe(false);
  });

  it('returns hint strings with minimum length', () => {
    expect(passwordTooShortHint()).toContain(String(MIN_PASSWORD_LENGTH));
    expect(choosePasswordHint()).toContain(String(MIN_PASSWORD_LENGTH));
  });
});

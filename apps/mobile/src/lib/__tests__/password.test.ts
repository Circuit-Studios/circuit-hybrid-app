import {
  choosePasswordHint,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
  passwordTooShortHint,
} from '@/lib/password';

describe('password helpers', () => {
  it('validates length and returns hints with the minimum', () => {
    expect(isValidPassword(''.padEnd(MIN_PASSWORD_LENGTH - 1, 'a'))).toBe(false);
    expect(isValidPassword(''.padEnd(MIN_PASSWORD_LENGTH, 'a'))).toBe(true);
    expect(isValidPassword('        ')).toBe(false);
    expect(passwordTooShortHint()).toContain(String(MIN_PASSWORD_LENGTH));
    expect(choosePasswordHint()).toContain(String(MIN_PASSWORD_LENGTH));
  });
});

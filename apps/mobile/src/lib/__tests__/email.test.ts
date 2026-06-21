import { isValidEmail, normalizeEmail, splitFullName } from '../email';

describe('email helpers', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  User@Studio.COM ')).toBe('user@studio.com');
  });

  it('validates email', () => {
    expect(isValidEmail('you@studio.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('splits full name', () => {
    expect(splitFullName('Kiran Kumar')).toEqual({
      firstName: 'Kiran',
      lastName: 'Kumar',
    });
    expect(splitFullName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' });
  });
});

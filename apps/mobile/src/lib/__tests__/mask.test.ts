import { maskEmail, maskPhone } from '../mask';

describe('maskEmail', () => {
  it('masks local and domain while keeping TLD', () => {
    expect(maskEmail('si@gmail.com')).toBe('si***@***.com');
    expect(maskEmail('user@studio.com')).toBe('us***@***.com');
  });
});

describe('maskPhone', () => {
  it('shows country prefix and last two digits', () => {
    expect(maskPhone('+13015550101')).toBe('+13***01');
    expect(maskPhone('+919812345678')).toBe('+91***78');
  });
});

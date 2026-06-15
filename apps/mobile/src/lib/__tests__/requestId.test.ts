import { createRequestId, readResponseRequestId, withRequestId } from '@/lib/requestId';

describe('createRequestId', () => {
  it('uses timestamp-random format', () => {
    const id = createRequestId();
    expect(id).toMatch(/^\d+-[a-z0-9]+$/);
  });
});

describe('withRequestId', () => {
  it('adds x-request-id to headers', () => {
    const { requestId, headers } = withRequestId({ Authorization: 'Bearer token' });
    expect(headers.Authorization).toBe('Bearer token');
    expect(headers['x-request-id']).toBe(requestId);
  });
});

describe('readResponseRequestId', () => {
  it('reads lowercase and mixed-case headers', () => {
    expect(readResponseRequestId({ 'x-request-id': 'abc-123' })).toBe('abc-123');
    expect(readResponseRequestId({ 'X-Request-Id': 'def-456' })).toBe('def-456');
  });

  it('returns undefined for missing or blank values', () => {
    expect(readResponseRequestId(undefined)).toBeUndefined();
    expect(readResponseRequestId({ 'x-request-id': '  ' })).toBeUndefined();
  });
});

import { logger, logApiResponse } from '@/lib/logger';

describe('logger', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    logSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
  });

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs api errors at error level', () => {
    logApiResponse('GET', 'https://example.com/x', 503, Date.now() - 5, 'req-1');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs api client errors at error level', () => {
    logApiResponse('GET', 'https://example.com/x', 'ECONNABORTED', Date.now() - 5, 'req-2');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs api 4xx at warn level', () => {
    logApiResponse('POST', 'https://example.com/x', 401, Date.now() - 5, 'req-3');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('includes structured payload', () => {
    logger.info('test event', { requestId: 'abc', password: 'secret' });
    expect(logSpy).toHaveBeenCalledWith(
      '[circuit] test event',
      expect.objectContaining({
        level: 'info',
        service: 'circuit-mobile',
        requestId: 'abc',
        password: '[REDACTED]',
      }),
    );
  });
});

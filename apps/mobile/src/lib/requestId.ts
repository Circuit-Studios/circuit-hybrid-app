/** Client-generated correlation id — echoed by the API in `x-request-id`. */
export function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Attach a fresh correlation id to outgoing request headers. */
export function withRequestId(
  headers: Record<string, string> = {},
): { requestId: string; headers: Record<string, string> } {
  const requestId = createRequestId();
  return { requestId, headers: { ...headers, 'x-request-id': requestId } };
}

export function readResponseRequestId(headers: Record<string, unknown> | undefined): string | undefined {
  if (!headers) return undefined;
  const raw = headers['x-request-id'] ?? headers['X-Request-Id'];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : undefined;
}

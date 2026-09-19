import { errorResponseSchema, readyResponseSchema, type ReadyResponse } from '@hairmate/contracts';

export class ApiClientError extends Error {
  constructor(readonly code: 'NETWORK_ERROR' | 'INVALID_RESPONSE' | 'SERVICE_UNAVAILABLE', readonly requestId?: string) {
    super('暂时无法连接服务，请稍后重试。');
    this.name = 'ApiClientError';
  }
}

export function createApiClient(baseUrl: string, fetcher: typeof fetch = fetch, timeoutMs = 5_000) {
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new Error('Invalid API URL.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('API URL must be an HTTP(S) origin without credentials.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15_000) throw new Error('Invalid request timeout.');
  const endpoint = new URL('/health/ready', url).toString();
  return Object.freeze({
    async checkReady(signal?: AbortSignal): Promise<ReadyResponse> {
      const controller = new AbortController();
      const cancel = () => controller.abort();
      if (signal?.aborted) controller.abort();
      signal?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(cancel, timeoutMs);
      try {
        const response = await fetcher(endpoint, { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' }, redirect: 'error' });
        let body: unknown;
        try { body = await response.json(); } catch { throw new ApiClientError('INVALID_RESPONSE'); }
        if (!response.ok) {
          const error = errorResponseSchema.safeParse(body);
          throw new ApiClientError(error.success ? 'SERVICE_UNAVAILABLE' : 'INVALID_RESPONSE', error.success ? error.data.requestId : undefined);
        }
        const parsed = readyResponseSchema.safeParse(body);
        if (!parsed.success) throw new ApiClientError('INVALID_RESPONSE');
        return Object.freeze(parsed.data);
      } catch (error) {
        if (error instanceof ApiClientError) throw error;
        throw new ApiClientError('NETWORK_ERROR');
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
      }
    },
  });
}

import { expect, test, vi } from 'vitest';
import { ApiClientError, createApiClient } from '../../packages/api-client/src/index.js';

test('client validates ready response and sends only a read request', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ status: 'ready' }));
  const result = await createApiClient('http://localhost:3000', fetcher).checkReady();
  expect(result).toEqual({ status: 'ready' });
  expect(fetcher).toHaveBeenCalledWith('http://localhost:3000/health/ready', expect.objectContaining({ method: 'GET', redirect: 'error' }));
  expect(Object.isFrozen(result)).toBe(true);
});

test.each([{ status: 'success' }, { status: 'ready', databaseUrl: 'private' }, null])('unknown response fails closed: %j', async (body) => {
  await expect(createApiClient('https://example.invalid', vi.fn<typeof fetch>().mockResolvedValue(Response.json(body))).checkReady()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});

test('safe failure preserves request ID, discards server text and does not retry', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'sensitive upstream text', retryable: true }, requestId: 'test-request' }, { status: 503 }));
  await expect(createApiClient('http://localhost:3000', fetcher).checkReady()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', requestId: 'test-request', message: '暂时无法连接服务，请稍后重试。' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('network and invalid JSON errors are normalized without raw text', async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('private network details'));
  await expect(createApiClient('http://localhost:3000', fetcher).checkReady()).rejects.toBeInstanceOf(ApiClientError);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await expect(createApiClient('http://localhost:3000', vi.fn<typeof fetch>().mockResolvedValue(new Response('<html/>'))).checkReady()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});

test('bounded timeout aborts the request without replay', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  await expect(createApiClient('http://localhost:3000', fetcher, 5).checkReady()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test.each(['file:///tmp/api', 'https://user:pass@example.invalid', 'https://example.invalid/path', 'https://example.invalid?token=x', 'invalid'])('rejects unsafe API address %s', (url) => {
  expect(() => createApiClient(url)).toThrow();
});

import { createApiClient } from '@hairmate/api-client';

export function connectToService(signal?: AbortSignal) {
  // Expo only exposes this public address. No .env file is loaded by our commands.
  const address = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
  return createApiClient(address).checkReady(signal);
}

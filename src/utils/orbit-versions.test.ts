import { describe, test, expect } from 'bun:test';
import { resolveOrbitVersions, ORBIT_PACKAGE_FALLBACK } from './orbit-versions';

describe('resolveOrbitVersions', () => {
  test('pins the newest published versions from the registry', async () => {
    const fetchImpl = (async (url: string) => ({
      ok: true,
      json: async () => ({ version: String(url).includes('orbit-core') ? '9.9.9' : '8.8.8' }),
    })) as unknown as typeof fetch;
    expect(await resolveOrbitVersions({ fetch: fetchImpl })).toEqual({ core: '^9.9.9', common: '^8.8.8' });
  });

  test('falls back to the pinned ranges when the registry is unreachable', async () => {
    const fetchImpl = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await resolveOrbitVersions({ fetch: fetchImpl })).toEqual(ORBIT_PACKAGE_FALLBACK);
  });

  test('ignores a malformed registry response', async () => {
    const fetchImpl = (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await resolveOrbitVersions({ fetch: fetchImpl })).toEqual(ORBIT_PACKAGE_FALLBACK);
  });
});

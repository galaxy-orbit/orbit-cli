/**
 * Orbit package versions scaffolded into new projects.
 *
 * `orbit new` must not hardcode a stale range: the framework packages move
 * faster than the CLI. Resolve the newest published release from the npm
 * registry (dist-tag `latest`) and fall back to the pinned constants offline.
 */
export const ORBIT_PACKAGE_FALLBACK = Object.freeze({ core: '^0.2.1', common: '^0.1.14' });

const PACKAGES = Object.freeze({ core: '@galaxy-stack/orbit-core', common: '@galaxy-stack/orbit-common' });
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export interface OrbitVersions {
  readonly core: string;
  readonly common: string;
}

async function latestTag(name: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { version?: unknown };
    return typeof body.version === 'string' && VERSION.test(body.version) ? body.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveOrbitVersions(
  options: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<OrbitVersions> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 4000;
  const [core, common] = await Promise.all([
    latestTag(PACKAGES.core, fetchImpl, timeoutMs),
    latestTag(PACKAGES.common, fetchImpl, timeoutMs),
  ]);
  return {
    core: core === null ? ORBIT_PACKAGE_FALLBACK.core : `^${core}`,
    common: common === null ? ORBIT_PACKAGE_FALLBACK.common : `^${common}`,
  };
}

/**
 * Lightweight client-side request deduplication and short-TTL stale cache.
 * Strictly isolated by auth token scope so switching accounts never leaks cached data.
 */

const cacheStore = new Map();
const inflightStore = new Map();

function getScopePrefix() {
  try {
    const token = localStorage.getItem('mm_auth_token') || 'anon';
    return token.slice(-16);
  } catch {
    return 'anon';
  }
}

export function clearRequestCache() {
  cacheStore.clear();
  inflightStore.clear();
}

export async function cachedFetch(key, fetcher, ttlMs = 15000) {
  const scopedKey = `${getScopePrefix()}:${key}`;
  const existing = cacheStore.get(scopedKey);
  if (existing && Date.now() < existing.expiresAt) {
    return existing.data;
  }

  if (inflightStore.has(scopedKey)) {
    return inflightStore.get(scopedKey);
  }

  const promise = (async () => {
    try {
      const data = await fetcher();
      cacheStore.set(scopedKey, {
        data,
        expiresAt: Date.now() + ttlMs,
      });
      return data;
    } finally {
      inflightStore.delete(scopedKey);
    }
  })();

  inflightStore.set(scopedKey, promise);
  return promise;
}

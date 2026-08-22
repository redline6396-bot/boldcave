const PRODUCT_CACHE_TTL_MS = 60 * 1000;

const cacheStore = globalThis.__productApiCache || {
  entries: new Map(),
};

globalThis.__productApiCache = cacheStore;

export function getProductCache(key) {
  const entry = cacheStore.entries.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.entries.delete(key);
    return null;
  }

  return entry.value;
}

export function setProductCache(key, value) {
  cacheStore.entries.set(key, {
    value,
    expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS,
  });

  return value;
}

export function clearProductCache() {
  cacheStore.entries.clear();
}

export { PRODUCT_CACHE_TTL_MS };

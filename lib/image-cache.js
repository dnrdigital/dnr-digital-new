const seed = require("../data/imageCache.json");
const { DEFAULT_SOURCE, sourceId, discovery, suitablePhotos, THEMES } = require("./photo-selection");
const HOUR = 60 * 60 * 1000;

function collectionId() {
  return sourceId();
}

function usableImages(images) {
  if (!Array.isArray(images)) return [];
  const seen = new Set();
  return images.filter((image) => {
    try {
      const url = new URL(image?.urls?.full);
      if (!image.id || seen.has(image.id) || url.protocol !== "https:" ||
          url.hostname !== "images.unsplash.com" || !image.user?.name || !image.user?.username) return false;
      seen.add(image.id);
      return true;
    } catch { return false; }
  });
}

function photoStore(createStore = require("@netlify/blobs").getStore) {
  // All deploys may read the pool. Only the published production scheduler writes.
  // Native functions and the Next.js adapter supply credentials; local Next uses the seed.
  return createStore({
    name: "unsplash-photos",
    consistency: "strong",
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(2000) }),
  });
}

function poolKey(collection = collectionId()) { return `pool-${encodeURIComponent(collection)}`; }
function seedFor(collection) { return collection === DEFAULT_SOURCE ? usableImages(seed.images) : []; }

// Readers never call Unsplash, including on cold starts, timeouts and cache misses.
function createPoolReader({ store = photoStore, collection = collectionId, now = Date.now } = {}) {
  let saved = null;
  let savedCollection;
  let nextRead = 0;
  let pending;
  return async function getPool() {
    const id = collection();
    if (id !== savedCollection) {
      savedCollection = id;
      saved = seedFor(id);
      nextRead = 0;
    }
    if (!pending && now() >= nextRead) {
      nextRead = now() + 60_000;
      pending = (async () => {
        try {
          const snapshot = await store().get(poolKey(id), { type: "json" });
          const photos = usableImages(snapshot?.images);
          if (photos.length) saved = photos;
        } catch {
          // A missing local Blobs environment or storage outage retains the last good pool.
        }
      })().finally(() => { pending = null; });
    }
    if (pending) await pending;
    return saved;
  };
}

// Only the scheduled function calls this. Reserve the next attempt atomically
// before making a request, so overlapping/manual invocations cannot multiply it.
async function refreshPool({ store, collection = collectionId(), key = process.env.UNSPLASH_ACCESS_KEY,
  now = Date.now, fetchImages = fetch } = {}) {
  if (!key) return { status: "missing-key" };
  const name = poolKey(collection);
  const existing = await store.getWithMetadata(name, { type: "json" });
  const snapshot = existing?.data || {};
  const time = now();
  if (snapshot.nextAttempt > time) return { status: "backoff", nextAttempt: snapshot.nextAttempt };
  // Reserve this UTC clock hour, so small cron timing differences do not skip
  // the following hour. Failures below still receive a full elapsed-time backoff.
  const nextHour = (Math.floor(time / HOUR) + 1) * HOUR;
  const reservation = await store.setJSON(name, { ...snapshot, nextAttempt: nextHour },
    existing ? { onlyIfMatch: existing.etag } : { onlyIfNew: true });
  if (!reservation.modified) return { status: "already-refreshing" };

  let result = { ...snapshot, nextAttempt: nextHour };
  let failure = "request-failed";
  const selection = discovery(collection, snapshot);
  try {
    const response = await fetchImages(selection.url, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      signal: AbortSignal.timeout(5000),
    });
    const remaining = response.headers?.get("x-ratelimit-remaining");
    result.remaining = remaining === null || remaining === undefined ? null : Number(remaining);
    const retryAfter = response.headers?.get("retry-after");
    if (retryAfter) {
      const retryAt = /^\d+$/.test(retryAfter) ? time + Number(retryAfter) * 1000 : Date.parse(retryAfter);
      if (Number.isFinite(retryAt)) result.nextAttempt = Math.max(result.nextAttempt, retryAt);
    }
    if (!response.ok) {
      failure = `http-${response.status}`;
      throw new Error("Unsplash request failed");
    }
    failure = "invalid-response";
    const payload = await response.json();
    let images = suitablePhotos(usableImages(selection.theme ? payload.results : payload));
    if (selection.theme) {
      // Advance even if filtering removes every result, so an unsuitable query cannot stall rotation.
      result.cursor = selection.cursor + 1;
      result.searchPages = { ...snapshot.searchPages, [selection.query]: Math.max(1, Math.min(5, Number(payload.total_pages) || 1)) };
      result.query = selection.query;
      result.theme = selection.theme;
      if (images.length) {
        result.themePools = { ...snapshot.themePools, [selection.theme]: images.slice(0, 30) };
        images = usableImages(THEMES.flatMap(({ id }) => result.themePools[id] || []));
      }
    }
    if (!images.length) {
      failure = "no-usable-photos";
      throw new Error("No usable photos");
    }
    result = { ...result, images, updatedAt: time, failures: 0, failure: null, status: "fresh" };
  } catch {
    const failures = Math.min((snapshot.failures || 0) + 1, 4);
    result = { ...result, failures, failure, status: "stale",
      nextAttempt: Math.max(result.nextAttempt, time + HOUR * 2 ** (failures - 1)) };
  }
  // If this write fails, the reservation still prevents an immediate retry and
  // retains the old pool. No detached background work can be frozen by Lambda.
  await store.setJSON(name, result, { onlyIfMatch: reservation.etag });
  return { status: result.status, photos: result.images?.length || 0,
    remaining: result.remaining, nextAttempt: result.nextAttempt, theme: result.theme, query: result.query,
    failure: result.failure, themes: Object.fromEntries(THEMES.map(({ id }) => [id, result.themePools?.[id]?.length || 0])) };
}

const getPool = createPoolReader();
async function getBackground() {
  const images = await getPool();
  return images[Math.floor(Math.random() * images.length)] || null;
}
module.exports = { HOUR, usableImages, photoStore, poolKey,
  createPoolReader, refreshPool, getPool, getBackground };

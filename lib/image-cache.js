const seed = require("../data/imageCache.json");
const { DEFAULT_SOURCE, sourceId, discovery, suitablePhotos, BATCH_SIZE } = require("./photo-selection");
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

  const selections = discovery(collection);
  const batches = { ...snapshot.batches };
  let nextAttempt = nextHour;
  let remaining = null;
  let quotaBlocked = false;
  const outcomes = {};
  for (const selection of selections) {
    const old = batches[selection.id] || {};
    if (quotaBlocked || old.nextAttempt > time) {
      outcomes[selection.id] = { status: "backoff", photos: old.images?.length || 0, nextAttempt: old.nextAttempt || nextAttempt };
      continue;
    }
    let failure = "request-failed";
    let retryAt = time + HOUR;
    try {
      const response = await fetchImages(selection.url, {
        headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
        signal: AbortSignal.timeout(5000),
      });
      const quota = response.headers?.get("x-ratelimit-remaining");
      if (quota != null && Number.isFinite(Number(quota))) remaining = Number(quota);
      const retryAfter = response.headers?.get("retry-after");
      if (retryAfter) {
        const parsed = /^\d+$/.test(retryAfter) ? time + Number(retryAfter) * 1000 : Date.parse(retryAfter);
        if (Number.isFinite(parsed)) retryAt = Math.max(retryAt, parsed);
      }
      // Stop the batch sequence when the shared application quota is exhausted.
      if (remaining === 0 || response.status === 429 || response.status === 401 || response.status === 403 || retryAfter) {
        quotaBlocked = true;
        nextAttempt = Math.max(nextAttempt, retryAt);
      }
      if (!response.ok) {
        failure = `http-${response.status}`;
        throw new Error("Unsplash request failed");
      }
      failure = "invalid-response";
      const images = suitablePhotos(usableImages(await response.json()), selection.orientation).slice(0, BATCH_SIZE);
      if (!images.length) {
        failure = "no-usable-photos";
        throw new Error("No usable photos");
      }
      batches[selection.id] = { images, updatedAt: time, failures: 0, nextAttempt: nextHour, status: "fresh" };
    } catch {
      const failures = Math.min((old.failures || 0) + 1, 4);
      batches[selection.id] = { ...old, failures, failure, status: "stale",
        nextAttempt: Math.max(retryAt, time + HOUR * 2 ** (failures - 1)) };
    }
    const batch = batches[selection.id];
    outcomes[selection.id] = { status: batch.status, photos: batch.images?.length || 0,
      nextAttempt: batch.nextAttempt, failure: batch.failure || null };
  }
  // If every batch is cooling down, skip storage work until one is eligible.
  const earliest = Math.min(...selections.map(({ id }) => batches[id]?.nextAttempt || nextHour));
  nextAttempt = Math.max(nextAttempt, earliest);
  const images = usableImages(selections.flatMap(({ id }) => batches[id]?.images || []));
  const fresh = Object.values(outcomes).filter(({ status }) => status === "fresh").length;
  const result = { batches, images: images.length ? images : snapshot.images || [], nextAttempt,
    remaining, updatedAt: fresh ? time : snapshot.updatedAt || null,
    status: fresh === selections.length ? "fresh" : fresh ? "partial" : "stale" };
  // If this write fails, the reservation retains the old pool and blocks duplicates.
  const saved = await store.setJSON(name, result, { onlyIfMatch: reservation.etag });
  if (!saved.modified) return { status: "superseded" };
  return { status: result.status, photos: result.images.length, remaining, nextAttempt, batches: outcomes };
}

const getPool = createPoolReader();
async function getBackground() {
  const images = await getPool();
  return images[Math.floor(Math.random() * images.length)] || null;
}
module.exports = { HOUR, usableImages, photoStore, poolKey,
  createPoolReader, refreshPool, getPool, getBackground };

const seed = require("../data/imageCache.json");

const FETCH_INTERVAL = 5 * 60 * 1000;

function usableImages(images) {
  if (!Array.isArray(images)) return [];

  return images.filter((image) => {
    try {
      const url = new URL(image?.urls?.full);
      return url.protocol === "https:" && url.hostname === "images.unsplash.com";
    } catch {
      return false;
    }
  });
}

// Each serverless instance has its own cache. The bundled snapshot is read-only.
function createImageCache({
  images = seed.images,
  fetchImages = fetch,
  now = Date.now,
  accessKey = () => process.env.UNSPLASH_ACCESS_KEY,
  collection = () => process.env.UNSPLASH_COLLECTION_ID || "bo8jQKTaE0Y",
} = {}) {
  let cachedImages = usableImages(images);
  let imageIndex = 0;
  let lastAttempt = -Infinity;
  let pendingRefresh = null;

  async function refresh(key) {
    lastAttempt = now();
    try {
      const url = new URL("https://api.unsplash.com/photos/random");
      url.search = new URLSearchParams({
        count: "30",
        collections: collection(),
        orientation: "landscape",
      }).toString();
      const response = await fetchImages(url, {
        headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) throw new Error("Unsplash request failed");
      const nextImages = usableImages(await response.json());
      if (!nextImages.length) throw new Error("Unsplash returned no usable images");
      cachedImages = nextImages;
      imageIndex = 0;
    } catch {
      // Keep the last good snapshot, and back off on failures as well as successes.
      console.warn("Unsplash refresh unavailable; using the saved backgrounds.");
    }
  }

  return async function getBackground() {
    const key = accessKey();
    if (key && !pendingRefresh && now() - lastAttempt >= FETCH_INTERVAL) {
      pendingRefresh = refresh(key).finally(() => { pendingRefresh = null; });
    }
    // Await refreshes so serverless platforms do not freeze unfinished work.
    if (pendingRefresh) await pendingRefresh;
    if (!cachedImages.length) return null;
    const image = cachedImages[imageIndex];
    imageIndex = (imageIndex + 1) % cachedImages.length;
    return image;
  };
}

module.exports = { createImageCache, getBackground: createImageCache() };

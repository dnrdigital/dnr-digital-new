// pages/api/imageCache.js
import fs from 'fs';
import path from 'path';
import { createApi } from 'unsplash-js';

const UNSPLASH_API_KEY = "F_0fGmEHG_V2WdCGchRaTAVh06AqVjf8GVSgCgT_XLg";
const api = createApi({ accessKey: UNSPLASH_API_KEY });
const filePath = path.join(process.cwd(), 'data', 'imageCache.json');

let memoryCache = null;  // Store 30 images in memory cache
let imageIndex = 0;      // Counter to track which image to serve next

// Helper to read rate limits from response headers
const checkRateLimit = (headers) => {
  const remaining = parseInt(headers.get('X-Ratelimit-Remaining'), 10);
  const limit = parseInt(headers.get('X-Ratelimit-Limit'), 10);
  return remaining > 0 && remaining <= limit;
};

// Fetch 30 new images from Unsplash and update both caches
async function fetchAndUpdateCache() {
  try {
    const response = await api.photos.getRandom({ count: 30, collection: ['bo8jQKTaE0Y'], orientation: 'landscape'});

    // Check rate limit using headers from Unsplash
    if (!checkRateLimit(response.headers)) {
      console.warn('Rate limit reached');
      return null;
    }

    if (response.response && !response.errors) {
      const images = response.response;

      // Update memory cache and reset image index
      memoryCache = images;
      imageIndex = 0;

      // Save to file cache
      fs.writeFileSync(filePath, JSON.stringify({ images }), 'utf8');
      return images;
    }
  } catch (error) {
    console.error('Error fetching images from Unsplash:', error);
  }
  return null;
}

export default async function handler(req, res) {
  // Step 1: Serve from Memory Cache if available
  if (memoryCache && memoryCache.length > 0) {
    const imageData = memoryCache[imageIndex % memoryCache.length];
    imageIndex += 1;

    // If we’ve served all images, fetch new ones if within rate limit
    if (imageIndex >= memoryCache.length) {
      await fetchAndUpdateCache();
    }

    res.status(200).json({ data: imageData });
    return;
  }

  // Step 2: Load from File Cache if Memory Cache is empty
  if (fs.existsSync(filePath)) {
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    memoryCache = fileData.images;
    imageIndex = 0;

    // Serve the first image from the loaded cache
    const imageData = memoryCache[imageIndex];
    imageIndex += 1;

    // Fetch new images in the background if within rate limit
    await fetchAndUpdateCache();
    res.status(200).json({ data: imageData });
    return;
  }

  // Step 3: No cache available, fetch data from API if within rate limit
  const images = await fetchAndUpdateCache();
  if (images && images.length > 0) {
    res.status(200).json({ data: images[0] });
    imageIndex = 1;
    return;
  }

  // If unable to fetch new data, return error
  res.status(500).json({ error: 'Failed to retrieve data' });
}

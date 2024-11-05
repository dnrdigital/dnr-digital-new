// pages/api/imageCache.js
import fs from 'fs';
import path from 'path';
import { createApi } from 'unsplash-js';

const UNSPLASH_API_KEY = "F_0fGmEHG_V2WdCGchRaTAVh06AqVjf8GVSgCgT_XLg"

const api = createApi({
  accessKey: UNSPLASH_API_KEY,
});

// In-memory cache (useful for serverless or edge environments)
let memoryCache = null;
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 1 week
let lastCacheTime = 0;

const filePath = path.join(process.cwd(), 'data', 'imageCache.json');

async function fetchImageData() {
  const response = await api.photos.getRandom({ count: 1, collection: ['bo8jQKTaE0Y'], orientation: 'landscape' });
  
  if (!response.response || response.errors) {
    throw new Error('Failed to fetch data from Unsplash API');
  }
  
  return response.response[0];
}

async function updateCache() {
  const imageData = await fetchImageData();

  // Update both memory cache and file cache (if writable)
  memoryCache = imageData;
  lastCacheTime = Date.now();

  try {
    fs.writeFileSync(filePath, JSON.stringify(imageData), 'utf8');
  } catch (error) {
    console.error("Error saving to file cache, falling back to in-memory cache:", error);
  }
}

export default async function handler(req, res) {
  try {
    // Check if memory cache is available and not expired
    if (memoryCache && (Date.now() - lastCacheTime < CACHE_EXPIRY)) {
      return res.status(200).json({ data: memoryCache });
    }

    // Try to read from file cache if memory cache is empty
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      memoryCache = JSON.parse(fileData); // Load into memory
      lastCacheTime = Date.now();

      res.status(200).json({ data: memoryCache });
      updateCache().catch(console.error); // Asynchronously update the cache
    } else {
      // Fetch new data if no cache is available
      await updateCache();
      res.status(200).json({ data: memoryCache });
    }
  } catch (error) {
    console.error("Error in API route:", error);
    res.status(500).json({ error: 'Failed to retrieve or save data' });
  }
}

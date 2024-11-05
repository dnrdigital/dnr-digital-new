// pages/api/imageCache.js
import fs from 'fs';
import path from 'path';
import { createApi } from 'unsplash-js';

const UNSPLASH_API_KEY = "F_0fGmEHG_V2WdCGchRaTAVh06AqVjf8GVSgCgT_XLg";
const api = createApi({ accessKey: UNSPLASH_API_KEY });

const filePath = path.join(process.cwd(), 'data', 'imageCache.json');
let memoryCache = null;  // Cache for storing images in memory
let imageIndex = 0;      // Counter to track which image to serve next
let lastFetchTime = 0;   // Timestamp of the last API fetch
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to fetch new images and update caches
async function fetchAndUpdateCache() {
  const currentTime = Date.now();

  // Check if an hour has passed since the last fetch
  if (currentTime - lastFetchTime < FETCH_INTERVAL) {
    console.log("Rate limiting active. Skipping new fetch.");
    return;
  }

  try {
    const response = await api.photos.getRandom({ count: 30, collection: ['bo8jQKTaE0Y'], orientation: 'landscape' });
    if (!response.response) {
      console.error("Failed to fetch images from Unsplash");
      return;
    }

    const images = response.response;
    memoryCache = images;
    imageIndex = 0;
    lastFetchTime = currentTime;  // Update the last fetch time

    // Save images to file cache
    fs.writeFileSync(filePath, JSON.stringify({ images }), 'utf8');
    console.log('Cache updated successfully with new images.');
  } catch (error) {
    console.error('Error fetching images from Unsplash:', error);
  }
}

export default async function handler(req, res) {
  try {
    // 1. Serve from Memory Cache if available
    if (memoryCache && memoryCache.length > 0) {
      const imageData = memoryCache[imageIndex % memoryCache.length];
      imageIndex += 1;

      // Background fetch if needed
      if (imageIndex >= memoryCache.length) {
        fetchAndUpdateCache();
      }

      return res.status(200).json({ data: imageData });
    }

    // 2. Load from File Cache if Memory Cache is empty
    if (fs.existsSync(filePath)) {
      const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (fileData.images && fileData.images.length > 0) {
        memoryCache = fileData.images;
        imageIndex = 0;
        const imageData = memoryCache[imageIndex];
        imageIndex += 1;

        // Fetch new images in the background
        fetchAndUpdateCache();
        return res.status(200).json({ data: imageData });
      }
    }

    // 3. No Cache: Fetch data from API and update caches
    await fetchAndUpdateCache();
    if (memoryCache && memoryCache.length > 0) {
      const imageData = memoryCache[0];
      imageIndex = 1;
      return res.status(200).json({ data: imageData });
    }

    // 4. If unable to fetch or no data, send error response
    console.error('No images available in cache or from Unsplash API.');
    return res.status(500).json({ error: 'Failed to retrieve data' });

  } catch (error) {
    console.error('Unexpected error in handler:', error);
    res.status(500).json({ error: 'Unexpected server error' });
  }
}
// pages/api/imageCache.js
import fs from 'fs';
import path from 'path';
import { createApi } from 'unsplash-js';

const UNSPLASH_API_KEY = "F_0fGmEHG_V2WdCGchRaTAVh06AqVjf8GVSgCgT_XLg";
const api = createApi({ accessKey: UNSPLASH_API_KEY });
const filePath = path.join(process.cwd(), 'data', 'imageCache.json');

// Initialize an in-memory cache variable
let memoryCache = null;

export default async function handler(req, res) {
  try {
    // Step 1: Serve from Memory Cache if available
    if (memoryCache) {
      res.status(200).json({ data: memoryCache });
      // Update cache in the background without delaying response
      updateCache();
      return;
    }

    // Step 2: Load from File Cache if Memory Cache is empty
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      memoryCache = JSON.parse(fileData);
      res.status(200).json({ data: memoryCache });
      // Update cache in the background
      updateCache();
      return;
    }

    // Step 3: Fetch from API if no cache is available, update both memory and file cache
    const imageData = await fetchNewImageData();
    if (imageData) {
      memoryCache = imageData;
      fs.writeFileSync(filePath, JSON.stringify(imageData), 'utf8');
      res.status(200).json({ data: imageData });
      return;
    }

    // Error handling if no image data is available
    res.status(500).json({ error: 'Failed to retrieve data' });
  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
}

// Helper function to fetch new image data and update the cache
async function fetchNewImageData() {
  try {
    const response = await api.photos.getRandom({ count: 1, collection: ['bo8jQKTaE0Y'], orientation: 'landscape' });
    if (response.response && !response.errors) {
      return response.response[0];
    }
  } catch (error) {
    console.error('Error fetching image from Unsplash:', error);
  }
  return null;
}

// Asynchronous cache updater
async function updateCache() {
  const newImageData = await fetchNewImageData();
  if (newImageData) {
    memoryCache = newImageData; // Update memory cache
    try {
      fs.writeFileSync(filePath, JSON.stringify(newImageData), 'utf8'); // Update file cache if possible
    } catch (fileError) {
      console.error('Failed to write data to file cache:', fileError);
    }
  }
}

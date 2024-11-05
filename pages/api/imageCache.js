// pages/api/imageCache.js
import fs from 'fs';
import path from 'path';
import { createApi } from 'unsplash-js';

const UNSPLASH_API_KEY = "F_0fGmEHG_V2WdCGchRaTAVh06AqVjf8GVSgCgT_XLg"

const api = createApi({
  accessKey: UNSPLASH_API_KEY,
});

const filePath = path.join(process.cwd(), 'data', 'imageCache.json');

async function updateImageCache() {
  try {
    const response = await api.photos.getRandom({ count: 1, collection: ['bo8jQKTaE0Y'], orientation: 'landscape' });
    
    if (response.errors) {
      throw new Error('Error fetching data from Unsplash API');
    }

    const imageData = response.response[0];
    
    // Save new data to the cache
    fs.writeFileSync(filePath, JSON.stringify(imageData), 'utf8');
  } catch (error) {
    console.error('Failed to update image cache:', error);
  }
}

export default async function handler(req, res) {
  try {
    // Attempt to read from the cache file
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const cachedData = JSON.parse(fileData);

      // Return cached data if available
      if (cachedData) {
        res.status(200).json({ data: cachedData });

        // Update the cache asynchronously
        updateImageCache();
        return;
      }
    }

    // If no cached data, fetch new data and cache it
    await updateImageCache();
    
    // After updating cache, read and send the latest data
    const updatedFileData = fs.readFileSync(filePath, 'utf8');
    const updatedData = JSON.parse(updatedFileData);
    
    res.status(200).json({ data: updatedData });
  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ error: 'Failed to retrieve or save data' });
  }
}
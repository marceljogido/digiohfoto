const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Simplified GIF creation using Sharp (reliable fallback method)
async function createGifFromPhotos(photos) {
  const frames = [];
  const gifSize = 512;

  for (const photo of photos) {
    // Process original image
    if (photo.original) {
      const originalBuffer = await processImageToBuffer(photo.original, gifSize);
      frames.push(originalBuffer);
    }

    // Process AI result image  
    if (photo.processed) {
      const processedBuffer = await processImageToBuffer(photo.processed, gifSize);
      frames.push(processedBuffer);
    }
  }

  // Return the last processed image as a static image
  if (frames.length > 0) {
    return frames[frames.length - 1];
  }
  
  throw new Error('No valid frames to create GIF');
}

async function processImageToBuffer(imageData, size) {
  let buffer;
  
  if (imageData.startsWith('data:')) {
    // Base64 data URL
    const base64Data = imageData.split(',')[1];
    buffer = Buffer.from(base64Data, 'base64');
  } else if (imageData.startsWith('http')) {
    // URL - fetch the image
    try {
      console.log(`📥 Fetching image from URL: ${imageData}`);
      const response = await fetch(imageData);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log(`✅ Image fetched successfully (${buffer.length} bytes)`);
    } catch (error) {
      console.error('Error fetching image:', error);
      throw new Error(`Failed to fetch image from URL: ${imageData} - ${error.message}`);
    }
  } else {
    // Assume it's already a buffer or base64
    buffer = Buffer.from(imageData, 'base64');
  }

  // Validate buffer
  if (!buffer || buffer.length === 0) {
    throw new Error('Invalid image data: empty buffer');
  }

  // Resize and crop to square with high quality
  const processedBuffer = await sharp(buffer)
    .resize(size, size, { 
      fit: 'cover',
      position: 'center',
      kernel: sharp.kernel.lanczos3
    })
    .jpeg({ 
      quality: 90,
      progressive: false
    })
    .toBuffer();

  return processedBuffer;
}

// Create comparison image (reliable method)
async function createAnimatedGif(photos) {
  const gifSize = 512;
  console.log("🎬 Creating comparison image (before/after)...");

  if (!photos || photos.length === 0) {
    throw new Error('No photos provided for GIF creation');
  }

  try {
    const photo = photos[0];
    if (!photo.original || !photo.processed) {
      throw new Error('Photo missing original or processed image for comparison');
    }

    console.log("📸 Processing original image...");
    const beforeBuffer = await processImageToBuffer(photo.original, gifSize);
    
    console.log("📸 Processing processed image...");
    const afterBuffer = await processImageToBuffer(photo.processed, gifSize);
    
    // Create a side-by-side comparison image
    console.log("🖼️ Creating side-by-side comparison...");
    const combinedBuffer = await sharp({
      create: {
        width: gifSize * 2,
        height: gifSize,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      { input: beforeBuffer, left: 0, top: 0 },
      { input: afterBuffer, left: gifSize, top: 0 }
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

    console.log("✅ Comparison image created successfully");
    return combinedBuffer;

  } catch (error) {
    console.error('Error creating comparison image:', error);
    throw error;
  }
}

module.exports = {
  createGifFromPhotos,
  createAnimatedGif,
  processImageToBuffer
};

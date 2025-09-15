const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const GIFEncoder = require('gifencoder');
const { createCanvas, loadImage } = require('canvas');

// Simplified GIF creation using Sharp (since we can't use gifenc in Node.js easily)
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(imageData, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DigiOH/1.0; +https://wsaseno.de)',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
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

// Create animated GIF with before/after animation
async function createAnimatedGif(photos) {
  const gifSize = 512;
  console.log("🎬 Creating animated GIF with before/after frames...");

  if (!photos || photos.length === 0) {
    throw new Error('No photos provided for GIF creation');
  }

  try {
    const photo = photos[0];
    if (!photo.original || !photo.processed) {
      throw new Error('Photo missing original or processed image for GIF creation');
    }

    console.log("📸 Processing images for animated GIF...");
    
    // Process original and processed images
    const beforeBuffer = await processImageToBuffer(photo.original, gifSize);
    const afterBuffer = await processImageToBuffer(photo.processed, gifSize);
    
    // Add watermark to BOTH images for consistent positioning
    console.log("🏷️ Adding watermark to original frame only...");
    const watermarkedBeforeBuffer = await addWatermarkToBuffer(beforeBuffer, gifSize);

    const watermarkedAfterBuffer = await addWatermarkToBuffer(afterBuffer, gifSize);
    
    // Create animated GIF using gifencoder (exactly like your example)
    const encoder = new GIFEncoder(gifSize, gifSize);
    encoder.start();
    encoder.setRepeat(0); // 0 = repeat indefinitely
    encoder.setDelay(1000); // 1 second delay
    encoder.setQuality(10); // 1-20, lower is better quality

    const canvas = createCanvas(gifSize, gifSize);
    const ctx = canvas.getContext('2d');

    // Frame 1: Original (before) - 333ms
    console.log("🖼️ Adding original frame...");
    const beforeImg = await loadImage(watermarkedBeforeBuffer);
    ctx.drawImage(beforeImg, 0, 0, gifSize, gifSize);
    encoder.addFrame(ctx);

    // Frame 2: Processed (after) - 833ms  
    console.log("🖼️ Adding processed frame...");
    const afterImg = await loadImage(watermarkedAfterBuffer);
    ctx.drawImage(afterImg, 0, 0, gifSize, gifSize);
    encoder.addFrame(ctx);

    encoder.finish();
    const buffer = encoder.out.getData();
    
    if (!buffer || buffer.length === 0) {
      throw new Error('Generated GIF buffer is empty');
    }

    console.log(`✅ Animated GIF created successfully (${buffer.length} bytes)`);
    return Buffer.from(buffer);

  } catch (error) {
    console.error('Error creating animated GIF:', error);
    throw error;
  }
}

// Add watermark to buffer
async function addWatermarkToBuffer(imageBuffer, size) {
  try {
    const watermarkPath = "watermarkdigioh.png";
    
    // Get image metadata
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();

    // Resize watermark to 30% of image width
    const watermark = await sharp(watermarkPath)
      .resize(Math.round(width * 0.3))
      .png()
      .toBuffer();

    // Add watermark to image
    const watermarkedBuffer = await image
      .composite([
        {
          input: watermark,
          gravity: "southeast", // bottom-right
          blend: "over",
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    return watermarkedBuffer;
  } catch (error) {
    console.error('Error adding watermark to buffer:', error);
    // Return original buffer if watermark fails
    return imageBuffer;
  }
}


module.exports = {
  createGifFromPhotos,
  createAnimatedGif,
  processImageToBuffer
};

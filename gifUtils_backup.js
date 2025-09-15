const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

// Simplified GIF creation using Sharp (since we can't use gifenc in Node.js easily)
async function createGifFromPhotos(photos) {
  const frames = [];
  const gifSize = 512;
  const inputDelay = 333; // ms for input image
  const outputDelay = 833; // ms for output image

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

  // For now, return the first processed image as a static image
  // Full GIF implementation would require additional libraries
  if (frames.length > 0) {
    return frames[frames.length - 1]; // Return last frame as JPEG
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
      kernel: sharp.kernel.lanczos3  // Use high-quality resampling
    })
    .png({ 
      compressionLevel: 6,   // Good balance between size and speed
      quality: 100,          // Maximum quality for PNG
      progressive: false     // PNG doesn't need progressive
    })
    .toBuffer();

  return processedBuffer;
}

// Create true animated GIF with before/after animation
async function createAnimatedGif(photos) {
  const gifSize = 512;
  console.log("🎬 Creating animated GIF with before/after frames...");

  if (!photos || photos.length === 0) {
    throw new Error('No photos provided for GIF creation');
  }

  try {
    // Try to create animated GIF with gifenc first
    try {
      const gif = new GIFEncoder();
      let frameCount = 0;

      // Process each photo to create before/after animation
      for (const photo of photos) {
        if (photo.original && photo.processed) {
          console.log(`📸 Processing photo ${frameCount + 1} for GIF...`);
          
          // Frame 1: Original (before) - show for 1 second
          const originalImageData = await processImageToGifFrame(photo.original, gifSize);
          addFrameToGif(gif, originalImageData, gifSize, 1000); // 1 second
          frameCount++;

          // Frame 2: Processed (after) - show for 2 seconds  
          const processedImageData = await processImageToGifFrame(photo.processed, gifSize);
          addFrameToGif(gif, processedImageData, gifSize, 2000); // 2 seconds
          frameCount++;
        }
      }

      if (frameCount === 0) {
        throw new Error('No valid photo pairs found for GIF creation');
      }

      console.log(`✅ GIF created with ${frameCount} frames`);
      const bytes = gif.finish();
      
      if (!bytes || (bytes.length !== undefined && bytes.length === 0)) {
        console.warn('⚠️ gifenc returned empty buffer, falling back to comparison image');
        throw new Error('Encoded GIF is empty');
      }
      
      console.log(`✅ Animated GIF created successfully (${bytes.length} bytes)`);
      return Buffer.from(bytes);

    } catch (gifencError) {
      console.warn('⚠️ gifenc failed, using fallback comparison image:', gifencError.message);
      
      // Fallback: Create a side-by-side comparison image
      const photo = photos[0];
      if (!photo.original || !photo.processed) {
        throw new Error('Photo missing original or processed image for fallback');
      }

      console.log("📸 Creating fallback comparison image...");
      
      // Create before image
      const beforeBuffer = await processImageToBuffer(photo.original, gifSize);
      
      // Create after image  
      const afterBuffer = await processImageToBuffer(photo.processed, gifSize);
      
      // Create a side-by-side comparison image
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

      console.log("✅ Fallback comparison image created");
      return combinedBuffer;
    }

  } catch (error) {
    console.error('Error creating animated GIF:', error);
    throw error;
  }
}

// Convert image to ImageData format for GIF encoder
async function processImageToGifFrame(imageData, size) {
  const buffer = await processImageToBuffer(imageData, size);
  
  // Convert buffer to ImageData-like object
  const { data, info } = await sharp(buffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
    
  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height
  };
}

// Add frame to GIF encoder
function addFrameToGif(gif, imageData, size, delay) {
  const palette = quantize(imageData.data, 256);
  const indexed = applyPalette(imageData.data, palette);

  gif.writeFrame(indexed, size, size, {
    palette,
    delay: Math.floor(delay / 10) // Convert ms to centiseconds
  });
}

module.exports = {
  createGifFromPhotos,
  createAnimatedGif,
  processImageToBuffer
};

const { createAnimatedGif } = require('./gifUtils');
const { uploadFile } = require('./ftpUtils');
const fs = require('fs');
const path = require('path');

// Test data dengan gambar sederhana
const testPhotos = [
  {
    original: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    processed: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    mode: 'test',
    timestamp: new Date().toISOString()
  }
];

async function testGifUpload() {
  try {
    console.log('🧪 Testing GIF creation and upload...');
    
    // Step 1: Create GIF
    console.log('📸 Creating comparison image...');
    const gifBuffer = await createAnimatedGif(testPhotos);
    console.log(`✅ GIF created successfully (${gifBuffer.length} bytes)`);
    
    // Step 2: Save locally
    const gifFilename = `DigiOH_GIF_${Date.now()}.gif`;
    const gifPath = path.join(__dirname, 'uploads', gifFilename);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    await fs.promises.writeFile(gifPath, gifBuffer);
    console.log(`✅ GIF saved locally: ${gifPath}`);
    
    // Step 3: Upload to FTP
    console.log('📤 Uploading to FTP folder /gif/...');
    const gifUrl = await uploadFile(gifPath, `/gif/${gifFilename}`);
    console.log(`✅ GIF uploaded successfully!`);
    console.log(`🔗 URL: ${gifUrl}`);
    
    // Step 4: Cleanup local file
    try {
      fs.unlinkSync(gifPath);
      console.log('🧹 Local file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up local file:', cleanupError.message);
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testGifUpload();

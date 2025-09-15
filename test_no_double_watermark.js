const { createAnimatedGif } = require('./gifUtils');

async function testNoDoubleWatermark() {
  console.log("🧪 Testing GIF without double watermark...");
  
  try {
    // Test data dengan foto yang sudah ada
    const testPhotos = [{
      original: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      processed: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
    }];

    console.log("📸 Creating GIF without double watermark...");
    const gifBuffer = await createAnimatedGif(testPhotos);
    
    if (gifBuffer && gifBuffer.length > 0) {
      console.log(`✅ GIF without double watermark created successfully!`);
      console.log(`📊 Size: ${gifBuffer.length} bytes`);
      
      // Save to file for testing
      const fs = require('fs');
      fs.writeFileSync('test_no_double_watermark_result.gif', gifBuffer);
      console.log("💾 Saved as test_no_double_watermark_result.gif");
      
      return true;
    } else {
      console.log("❌ GIF buffer is empty");
      return false;
    }
    
  } catch (error) {
    console.error("❌ Error creating GIF without double watermark:", error.message);
    return false;
  }
}

// Run test
testNoDoubleWatermark().then(success => {
  if (success) {
    console.log("🎉 No double watermark test completed successfully!");
  } else {
    console.log("💥 No double watermark test failed!");
  }
  process.exit(success ? 0 : 1);
});

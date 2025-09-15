const { GoogleGenAI, Modality } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const {
  uploadToFTP,
  uploadFile,
  copyFile,
  downloadFile,
} = require("./ftpUtils");

const {
  sleep,
  getLightxConfig,
  addWatermark,
  getFtpConfig,
  getGeminiConfig,
} = require("./utils");

const subFolderOriImage = ""; // "DigiOH_capture_images/";

////////////////////////////////
// Uplolad photos to local server
////////////////////////////////
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

function getLightboxApi() {
  const config = getGeminiConfig();
  return config;
}

async function processImageWithGemini(base64Image) {
  const geminiConfig = getLightboxApi();
  const ai = new GoogleGenAI({apiKey: geminiConfig.geminiApi});

  const timestamp = Date.now();
  const filename = `DigiOH_GambarRobot_${timestamp}.png`;
  const filepath = path.join(`${uploadDir}/`, filename);
  const watermarkedFilename = `watermarked_DigiOH_GambarRobot_${timestamp}.png`;
  const oriImageUrl = subFolderOriImage + watermarkedFilename;
  
  try {

    // Prepare the content parts
    const contents = [
      { 
        text: geminiConfig.textprompt_for_gemini
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image,
        },
      },
    ];

    // Tentukan model dari konfigurasi; fallback ke default jika kosong
    const selectedModel = geminiConfig.geminiModel && geminiConfig.geminiModel.trim() !== ""
      ? geminiConfig.geminiModel
      : "gemini-2.0-flash-preview-image-generation";

    // Set responseModalities untuk menghasilkan gambar (TEXT + IMAGE)
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });
    for (const part of response.candidates[0].content.parts) {
      // Based on the part type, either show the text or save the image
      if (part.text) {
        console.log(part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        fs.writeFileSync("gemini-native-image.png", buffer);
        console.log("Image saved as gemini-native-image.png");

        // Save with high quality using Sharp
        console.log("💾 Processing and saving high-quality PNG image...");
        await sharp(buffer)
          .png({ 
            compressionLevel: 6,   // Good balance between size and speed
            quality: 100,          // Maximum quality for PNG
            progressive: false     // PNG doesn't need progressive
          })
          .toFile(filepath);
        console.log(`✅ High-quality PNG image saved to: ${filepath}`);

        const watermarkPath = path.join(uploadDir, "watermarkdigioh.png"); // Path to your watermark image
        const watermarkedFile = watermarkedFilename;

        //add watermark
        try {
          await addWatermark(filepath, watermarkPath, watermarkedFile);
          console.log(`>> Watermark added: ${watermarkedFile}`);
        } catch (watermarkError) {
          console.error("Watermark error:", watermarkError);
          // Continue without watermark if it fails
          try {
            const oriImageUrlComplete = await uploadFile(filepath, oriImageUrl);
            console.log(`remoteFile (no watermark): ${oriImageUrlComplete}`);
            return oriImageUrlComplete;
          } catch (uploadError) {
            console.error("FTP upload failed:", uploadError);
            const localUrl = `/uploads/${path.basename(filepath)}`;
            console.log(`Using local URL: ${localUrl}`);
            return localUrl;
          }
        }

        try {
          const oriImageUrlComplete = await uploadFile(watermarkedFile, oriImageUrl);
          console.log(`remoteFile: ${oriImageUrlComplete}`);
          return oriImageUrlComplete;
        } catch (uploadError) {
          console.error("FTP upload failed:", uploadError);
          const localUrl = `/uploads/${watermarkedFile}`;
          console.log(`Using local URL: ${localUrl}`);
          return localUrl;
        }
      }
    }

  } catch (err) {
    return err.message;
  }
}

async function processImageWithGeminiCustom(base64Image, customPrompt) {
  console.log("🔧 === GEMINI PROCESSING START ===");
  
  const geminiConfig = getLightboxApi();
  console.log("📋 Gemini config loaded:", {
    hasApiKey: !!geminiConfig.geminiApi,
    model: geminiConfig.geminiModel
  });
  
  const ai = new GoogleGenAI({apiKey: geminiConfig.geminiApi});

  const timestamp = Date.now();
  const filename = `DigiOH_GambarRobot_${timestamp}.png`;
  const filepath = path.join(`${uploadDir}/`, filename);
  const watermarkedFilename = `watermarked_DigiOH_GambarRobot_${timestamp}.png`;
  const oriImageUrl = subFolderOriImage + watermarkedFilename;
  
  console.log("📁 File paths:");
  console.log("   - Original file:", filename);
  console.log("   - Watermarked file:", watermarkedFilename);
  console.log("   - Target URL:", oriImageUrl);
  
  try {
    // Use custom prompt instead of config prompt
    const contents = [
      { 
        text: customPrompt || geminiConfig.textprompt_for_gemini
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
    ];

    const selectedModel = geminiConfig.geminiModel && geminiConfig.geminiModel.trim() !== ""
      ? geminiConfig.geminiModel
      : "gemini-2.0-flash-preview-image-generation";
      
    console.log("🤖 Calling Gemini API with model:", selectedModel);
    console.log("📝 Prompt:", customPrompt ? customPrompt.substring(0, 100) + "..." : geminiConfig.textprompt_for_gemini);

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });
    
    console.log("✅ Gemini API response received");

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('Gemini API tidak mengembalikan hasil. Periksa konfigurasi API key.');
    }

    if (!response.candidates[0].content || !response.candidates[0].content.parts) {
      throw new Error('Gemini API mengembalikan response yang tidak valid.');
    }

    console.log("🔍 Processing response parts...");
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        console.log("📄 Text response:", part.text);
      } else if (part.inlineData) {
        console.log("🖼️  Image data found, processing...");
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        
        console.log("💾 Saving original image...");
        fs.writeFileSync("gemini-native-image.png", buffer);
        console.log("✅ Original image saved as gemini-native-image.png");

        // Save with high quality using Sharp to maintain quality
        console.log("💾 Processing and saving high-quality PNG image...");
        await sharp(buffer)
          .png({ 
            compressionLevel: 6,   // Good balance between size and speed
            quality: 100,          // Maximum quality for PNG
            progressive: false     // PNG doesn't need progressive
          })
          .toFile(filepath);
        console.log(`✅ High-quality PNG image saved to: ${filepath}`);

        const watermarkPath = path.join(uploadDir, "watermarkdigioh.png");
        const watermarkedFile = watermarkedFilename;

        console.log("🎨 Adding watermark...");
        try {
          await addWatermark(filepath, watermarkPath, watermarkedFile);
          console.log(`✅ Watermark added: ${watermarkedFile}`);
        } catch (watermarkError) {
          console.error("❌ Watermark error:", watermarkError.message);
          // Continue without watermark if it fails
          console.log("⚠️  Continuing without watermark...");
          try {
            console.log("📤 Uploading original file to FTP...");
            const oriImageUrlComplete = await uploadFile(filepath, oriImageUrl);
            console.log(`✅ FTP upload successful (no watermark): ${oriImageUrlComplete}`);
            return oriImageUrlComplete;
          } catch (uploadError) {
            console.error("❌ FTP upload failed:", uploadError.message);
            // Return local URL as fallback
            const localUrl = `/uploads/${path.basename(filepath)}`;
            console.log(`⚠️  Using local URL fallback: ${localUrl}`);
            return localUrl;
          }
        }
        
        console.log("📤 Uploading watermarked file to FTP...");
        try {
          const oriImageUrlComplete = await uploadFile(watermarkedFile, oriImageUrl);
          console.log(`✅ FTP upload successful: ${oriImageUrlComplete}`);
          return oriImageUrlComplete;
        } catch (uploadError) {
          console.error("❌ FTP upload failed:", uploadError.message);
          // Return local URL as fallback
          const localUrl = `/uploads/${watermarkedFile}`;
          console.log(`⚠️  Using local URL fallback: ${localUrl}`);
          return localUrl;
        }
      }
    }

    // If we get here, no inlineData was found
    throw new Error('Gemini API tidak mengembalikan gambar. Coba mode lain atau periksa prompt.');

  } catch (err) {
    console.log("💥 === GEMINI ERROR ===");
    console.error('❌ Error type:', err.constructor.name);
    console.error('❌ Error message:', err.message);
    console.error('❌ Stack trace:', err.stack);
    console.log("💥 === END GEMINI ERROR ===");
    throw new Error(err.message);
  }
}

module.exports = {
  processImageWithGemini,
  processImageWithGeminiCustom,
};
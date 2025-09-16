const express = require("express");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const bodyParser = require("body-parser");
const configPathFtp = path.join(__dirname, "digiOH_PhotoBox_config_ftp.json");
const configPathLightX = path.join( __dirname, "digiOH_PhotoBox_config_lightx.json", );
const configPathGemini = path.join( __dirname, "digiOH_PhotoBox_config_gemini.json", );

const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

const app = express();
const PORT = process.env.PORT || 3000;

const displayUrl = "https://wsaseno.de/digiOH_files/";
const imageLocation = "_sfpg_data/image/";
const subFolderOriImage = ""; // "DigiOH_capture_images/";

const QRCode = require("qrcode");

const {
  uploadToFTP,
  uploadFile,
  copyFile,
  downloadFile,
} = require("./ftpUtils");

const { generatedImage, LightXEditorAiType } = require("./LightXstudio");
const { processImageWithGemini, processImageWithGeminiCustom } = require("./gemini");
const modes = require('./modes');
const { createGifFromPhotos, createAnimatedGif } = require('./gifUtils');

////////////////////////////////
// Uplolad photos to local server
////////////////////////////////
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(express.json({ limit: "200mb" }));

// Serve static files in /public
app.use(express.static("public"));
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Helper: normalize asset URL to prefer remote FTP URL; fallback to absolute local URL
function isHttpUrl(u) {
  return /^https?:\/\//i.test(u || "");
}

async function ensureRemoteUrl(url, req) {
  try {
    if (isHttpUrl(url)) return url;
    if (typeof url === 'string' && url.startsWith('/uploads/')) {
      const filename = path.basename(url);
      const localPath = path.join(uploadDir, filename);
      try {
        // Try uploading the local file now to obtain the public display URL
        const remoteUrl = await uploadFile(localPath, `/${filename}`);
        return remoteUrl;
      } catch (_) {
        // Fallback to absolute local URL if FTP not available
        return `${req.protocol}://${req.get('host')}${url}`;
      }
    }
    // Any other relative path → absolute local URL
    return `${req.protocol}://${req.get('host')}${url}`;
  } catch (_) {
    return url;
  }
}

////////////////////////////////
// create avatar from uploaded image
////////////////////////////////
app.post("/upload", express.json({ limit: "200mb" }), async (req, res) => {
  console.log("Received image upload request");
  console.log("------------------------------");

  //---- START - get picture data from camera, base64 encoded
  const { base64data, imageName, selectedApi } = req.body;
  if (!base64data || !imageName || !selectedApi) {
    return res
      .status(400)
      .json({ error: "Missing base64data or imageName or selectedApi" });
  }

  const matches = base64data.match(/^data:(.+);base64,(.+)$/);
  let buffer, extension;
  if (matches) {
    extension = matches[1].split("/")[1];
    buffer = Buffer.from(matches[2], "base64");
  } else {
    // No data URL prefix, assume plain base64
    extension = "bin";
    buffer = Buffer.from(base64data, "base64");
  }
  //---- END - get picture data from camera, base64 encoded

  const filename = `DigiOH_GambarRobot_${Date.now()}.${extension}`;
  const filepath = path.join(`${uploadDir}/`, filename);
  const oriImageUrl =
    subFolderOriImage +
    "DigiOH_PhotoBox_" +
    new Date().toISOString().split(".")[0].replace(/[^\d]/gi, "") +
    ".jpeg";
  
  console.log("Constructed oriImageUrl:", oriImageUrl);

  try {
    await fs.promises.writeFile(filepath, buffer);
    console.log(`>> Saving file to local ${filepath}`);

    let oriImageUrlComplete;
    try {
      oriImageUrlComplete = await uploadFile(filepath, oriImageUrl);
      console.log(`remoteFile (FTP): ${oriImageUrlComplete}`);
      // Clean local original only if uploaded successfully (keep for fallback otherwise)
      try { fs.unlinkSync(filepath); } catch (_) {}
    } catch (ftpErr) {
      console.warn('FTP upload failed for original image, using local URL:', ftpErr.message);
      oriImageUrlComplete = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
      console.log(`remoteFile (LOCAL): ${oriImageUrlComplete}`);
    }

    console.log(">>generatedImage ... using uploaded URL:", oriImageUrlComplete
    );
    console.log("Selected API:", selectedApi);
    
    // IMPORTANT: Use the actual uploaded URL returned by uploadFile
    const generatedImageResult = await generatedImage(
      oriImageUrlComplete,
      selectedApi,
    );
    console.log("Generated image result:", generatedImageResult);

    // Debug: Cek apakah generatedImageResult valid
    if (!generatedImageResult) {
      console.error("generatedImage returned null/undefined");
      return res.status(500).json({ 
        error: "Failed to generate image", 
        details: "LightX Studio API returned no result" 
      });
    }

    // Create GIF comparison image
    let gifUrl = null;
    try {
      console.log("🎬 Creating GIF comparison image...");
      const gifBuffer = await createAnimatedGif([{
        original: base64data,
        processed: generatedImageResult,
        mode: selectedApi,
        timestamp: new Date().toISOString()
      }]);
      
      // Save GIF locally
      const gifFilename = `DigiOH_GIF_${Date.now()}.gif`;
      const gifPath = path.join(uploadDir, gifFilename);
      await fs.promises.writeFile(gifPath, gifBuffer);
      
      // Try upload to FTP; if fails, fallback to local URL
      try {
        gifUrl = await uploadFile(gifPath, `/gif/${gifFilename}`);
        console.log(`✅ GIF uploaded: ${gifUrl}`);
        // Cleanup local GIF file only when remote upload succeeded
        try {
          fs.unlinkSync(gifPath);
        } catch (cleanupError) {
          console.warn('Could not clean up GIF file:', cleanupError.message);
        }
      } catch (ftpError) {
        console.warn('FTP upload failed, serving GIF locally:', ftpError.message);
        gifUrl = `${req.protocol}://${req.get('host')}/uploads/${gifFilename}`;
        console.log(`➡️ Local GIF URL: ${gifUrl}`);
      }
    } catch (gifError) {
      console.warn('GIF creation failed:', gifError.message);
      // Attach details to response so UI can show meaningful info
      res.locals.gifError = gifError.message;
      // Continue without GIF if it fails
    }

    const normalizedImageUrl = await ensureRemoteUrl(generatedImageResult, req);
    const normalizedGifUrl = gifUrl ? await ensureRemoteUrl(gifUrl, req) : null;
    const qrDataUrl = await QRCode.toDataURL(normalizedImageUrl);
    const gifQrDataUrl = normalizedGifUrl ? await QRCode.toDataURL(normalizedGifUrl) : null; // QR untuk GIF
    
    res.json({
      status: "ok",
      imageUrl: normalizedImageUrl,
      qr: qrDataUrl,           // QR untuk foto AI
      gifUrl: normalizedGifUrl || null,          // URL GIF
      gifQr: gifQrDataUrl || null,     // QR untuk GIF (BARU)
      gifError: res.locals.gifError || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Error saving file", details: err.message });
  }
});

////////////////////////////////
// process image with Gemini
////////////////////////////////
app.post("/processWithGemini", express.json({ limit: "200mb" }), async (req, res) => {
  console.log("Received image upload request");
  console.log("------------------------------");

  //---- START - get picture data from camera, base64 encoded
  const { base64data, imageName, selectedApi } = req.body;
  if (!base64data || !imageName || !selectedApi) {
    return res
      .status(400)
      .json({ error: "Missing base64data or imageName or selectedApi" });
  }

  const matches = base64data.match(/^data:(.+);base64,(.+)$/);
  let buffer, extension;
  if (matches) {
    extension = matches[1].split("/")[1];
    buffer = Buffer.from(matches[2], "base64");
  } else {
    // No data URL prefix, assume plain base64
    extension = "bin";
    buffer = Buffer.from(base64data, "base64");
  }
  //---- END - get picture data from camera, base64 encoded

  const generatedImageResult = await processImageWithGemini(buffer.toString("base64"));
  const normalizedImageUrl = await ensureRemoteUrl(generatedImageResult, req);
  const qrDataUrl = await QRCode.toDataURL(normalizedImageUrl); // Always respond with JSON

  res.json({
      status: "ok",
      imageUrl: normalizedImageUrl,
      qr: qrDataUrl,
    });

});

////////////////////////////////
// Multiple AI Modes dengan Gemini
////////////////////////////////
app.post("/processWithGeminiModes", express.json({ limit: "200mb" }), async (req, res) => {
  console.log("\n🎯 === PROCESSING AI MODES REQUEST ===");
  console.log("📅 Time:", new Date().toISOString());
  console.log("------------------------------");

  const { base64data, imageName, mode, customPrompt } = req.body;
  
  console.log("📝 Request data:");
  console.log("   - Mode:", mode);
  console.log("   - Image name:", imageName);
  console.log("   - Has base64data:", !!base64data);
  console.log("   - Base64 length:", base64data ? base64data.length : 0);
  console.log("   - Custom prompt:", customPrompt || "(none)");
  
  if (!base64data || !imageName || !mode) {
    console.log("❌ Missing required fields!");
    return res
      .status(400)
      .json({ error: "Missing base64data, imageName, or mode" });
  }

  const matches = base64data.match(/^data:(.+);base64,(.+)$/);
  let buffer, extension;
  if (matches) {
    extension = matches[1].split("/")[1];
    buffer = Buffer.from(matches[2], "base64");
  } else {
    extension = "bin";
    buffer = Buffer.from(base64data, "base64");
  }

  try {
    console.log("🔄 Processing image...");
    
    // Get the prompt based on mode
    let prompt;
    if (mode === 'custom' && customPrompt) {
      prompt = customPrompt;
      console.log("📝 Using custom prompt:", prompt.substring(0, 100) + "...");
    } else if (modes[mode]) {
      prompt = modes[mode].prompt;
      console.log("📝 Using mode prompt for", modes[mode].name + ":", prompt.substring(0, 100) + "...");
    } else {
      console.log("❌ Invalid mode:", mode);
      return res.status(400).json({ error: "Invalid mode specified" });
    }

    console.log("🤖 Calling Gemini API...");
    const generatedImageResult = await processImageWithGeminiCustom(
      buffer.toString("base64"), 
      prompt
    );
    
    console.log("✅ Gemini processing completed!");
    console.log("🔗 Generated image URL:", generatedImageResult);
    
    // Create GIF comparison image
    let gifUrl = null;
    let gifQrDataUrl = null;
    try {
      console.log("🎬 Creating GIF comparison image...");
      const gifBuffer = await createAnimatedGif([{
        original: base64data,
        processed: generatedImageResult,
        mode: mode,
        timestamp: new Date().toISOString()
      }]);
      
      // Save GIF locally
      const gifFilename = `DigiOH_GIF_${Date.now()}.gif`;
      const gifPath = path.join(uploadDir, gifFilename);
      await fs.promises.writeFile(gifPath, gifBuffer);
      
      // Upload GIF to FTP
      gifUrl = await uploadFile(gifPath, `/gif/${gifFilename}`);
      console.log(`✅ GIF uploaded: ${gifUrl}`);
      
      // Generate QR code for GIF
      gifQrDataUrl = await QRCode.toDataURL(gifUrl);
      console.log("✅ GIF QR code generated");
      
      // Cleanup local GIF file
      try {
        fs.unlinkSync(gifPath);
      } catch (cleanupError) {
        console.warn('Could not clean up GIF file:', cleanupError.message);
      }
    } catch (gifError) {
      console.warn('GIF creation failed:', gifError.message);
      // Continue without GIF if it fails
    }
    
    console.log("📱 Generating QR code...");
    const normalizedImageUrl = await ensureRemoteUrl(generatedImageResult, req);
    const normalizedGifUrl = gifUrl ? await ensureRemoteUrl(gifUrl, req) : null;
    const qrDataUrl = await QRCode.toDataURL(normalizedImageUrl);
    console.log("✅ QR code generated");
    
    console.log("📤 Sending response to client...");
    res.json({
      status: "ok",
      imageUrl: normalizedImageUrl,
      qr: qrDataUrl,           // QR untuk foto AI
      gifUrl: normalizedGifUrl,          // URL GIF
      gifQr: gifQrDataUrl,     // QR untuk GIF
      mode: mode,
      originalImage: base64data
    });
    
    console.log("🎉 === AI MODES REQUEST COMPLETED SUCCESSFULLY ===\n");

  } catch (error) {
    console.log("💥 === ERROR IN AI MODES PROCESSING ===");
    console.error("❌ Error type:", error.constructor.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Full error:", error);
    console.log("💥 === END ERROR ===\n");
    
    res.status(500).json({ 
      error: "Failed to process image", 
      details: error.message 
    });
  }
});

////////////////////////////////
// GIF Creation Endpoint
////////////////////////////////
app.post("/createGif", express.json({ limit: "200mb" }), async (req, res) => {
  console.log("Received GIF creation request");
  console.log("------------------------------");

  const { photos } = req.body; // Array of {original, processed, mode}
  
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: "No photos provided for GIF creation" });
  }

  try {
    console.log("📊 Photos received:", photos.length);
    console.log("📸 First photo structure:", {
      hasOriginal: !!photos[0]?.original,
      hasProcessed: !!photos[0]?.processed,
      originalType: typeof photos[0]?.original,
      processedType: typeof photos[0]?.processed,
      originalLength: photos[0]?.original?.length || 0,
      processedLength: photos[0]?.processed?.length || 0
    });

    // Ensure processed URL is absolute for fetch
    const normalized = photos.map(p => ({
      ...p,
      processed: p.processed && p.processed.startsWith('http')
        ? p.processed
        : `${req.protocol}://${req.get('host')}${p.processed}`
    }));

    const gifBuffer = await createAnimatedGif(normalized);
    
    if (!gifBuffer || gifBuffer.length === 0) {
      throw new Error('Generated GIF buffer is empty');
    }
    
    console.log(`✅ GIF buffer created successfully (${gifBuffer.length} bytes)`);
    
    // Save GIF to uploads folder  
    const gifFilename = `DigiOH_GIF_${Date.now()}.gif`; // True animated GIF
    const gifPath = path.join(uploadDir, gifFilename);
    
    await fs.promises.writeFile(gifPath, gifBuffer);
    console.log(`✅ GIF saved to: ${gifPath}`);
    
    // Try to upload; fallback to local URL when FTP not available
    let gifUrl;
    try {
      gifUrl = await uploadFile(gifPath, `/gif/${gifFilename}`);
      console.log(`✅ GIF uploaded to: ${gifUrl}`);
      // Remove local when remote succeeded
      try {
        fs.unlinkSync(gifPath);
      } catch (cleanupError) {
        console.warn('Could not clean up GIF file:', cleanupError.message);
      }
    } catch (ftpError) {
      console.warn('FTP upload failed, serving GIF locally:', ftpError.message);
      gifUrl = `${req.protocol}://${req.get('host')}/uploads/${gifFilename}`;
      console.log(`➡️ Local GIF URL: ${gifUrl}`);
    }
    
    // Generate QR code for GIF
    const gifQrDataUrl = await QRCode.toDataURL(gifUrl);
    
    res.json({
      status: "ok",
      gifUrl: gifUrl,
      gifQr: gifQrDataUrl,  // QR untuk GIF
      localPath: gifPath
    });

  } catch (error) {
    console.error("Error creating GIF:", error);
    res.status(500).json({ 
      error: "Failed to create GIF", 
      details: error.message 
    });
  }
});

////////////////////////////////
// Get Available AI Modes
////////////////////////////////
app.get("/api/modes", (req, res) => {
  res.json(modes);
});

app.get("/api/qrcode", async (req, res) => {
  try {
    const url = "https://www.saseno.de";
    const qrDataUrl = await QRCode.toDataURL(url);
    res.json({ qr: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

////////////////////////////////
// Generate QR Code for any URL
////////////////////////////////
app.post("/api/generate-qr", express.json(), async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    console.log("📱 Generating QR code for URL:", url);
    const qrDataUrl = await QRCode.toDataURL(url, options);
    
    res.json({
      status: "ok",
      qr: qrDataUrl,
      url: url,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ 
      error: "Failed to generate QR code", 
      details: error.message 
    });
  }
});

////////////////////////////////
// Generate QR Code for GIF by ID
////////////////////////////////
app.get("/api/gif-qr/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }
    
    // Construct GIF URL
    const gifUrl = `${displayUrl}/gif/${filename}`;
    
    console.log("🎬 Generating QR code for GIF:", gifUrl);
    const qrDataUrl = await QRCode.toDataURL(gifUrl);
    
    res.json({
      status: "ok",
      qr: qrDataUrl,
      gifUrl: gifUrl,
      filename: filename,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating GIF QR code:", error);
    res.status(500).json({ 
      error: "Failed to generate GIF QR code", 
      details: error.message 
    });
  }
});

////////////////////////////////
// Generate QR Code for Image by ID
////////////////////////////////
app.get("/api/image-qr/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }
    
    // Construct image URL
    const imageUrl = `${displayUrl}/${filename}`;
    
    console.log("📱 Generating QR code for image:", imageUrl);
    const qrDataUrl = await QRCode.toDataURL(imageUrl);
    
    res.json({
      status: "ok",
      qr: qrDataUrl,
      imageUrl: imageUrl,
      filename: filename,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating image QR code:", error);
    res.status(500).json({ 
      error: "Failed to generate image QR code", 
      details: error.message 
    });
  }
});

////////////////////////////////
// Start the server
////////////////////////////////
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Visit http://localhost:${PORT} in your browser`);
  console.log("Press Ctrl+C to stop the server");
});

////////////////////////////////
// Save config FTP
////////////////////////////////
app.post("/api/config_ftp", express.json({ limit: "5mb" }), (req, res) => {
  fs.writeFileSync(configPathFtp, JSON.stringify(req.body, null, 2), "utf8");
  res.json({ status: "ok" });
});

// Load config
app.get("/api/config_ftp", (req, res) => {
  if (fs.existsSync(configPathFtp)) {
    res.json(JSON.parse(fs.readFileSync(configPathFtp, "utf8")));
  } else {
    res.json({});
  }
});
////////////////////////////////
// Save config LightX
////////////////////////////////
app.post("/api/config_lightx", express.json({ limit: "5mb" }), (req, res) => {
  fs.writeFileSync(configPathLightX, JSON.stringify(req.body, null, 2), "utf8");
  res.json({ status: "ok" });
});

// Load config
app.get("/api/config_lightx", (req, res) => {
  if (fs.existsSync(configPathLightX)) {
    res.json(JSON.parse(fs.readFileSync(configPathLightX, "utf8")));
  } else {
    res.json({});
  }
});

////////////////////////////////
// Google - Gemini API config
////////////////////////////////
app.post("/api/config_gemini", express.json({ limit: "5mb" }), (req, res) => {
  fs.writeFileSync(configPathGemini, JSON.stringify(req.body, null, 2), "utf8");
  res.json({ status: "ok" });
});
app.get("/api/config_gemini", (req, res) => {
  if (fs.existsSync(configPathGemini)) {
    res.json(JSON.parse(fs.readFileSync(configPathGemini, "utf8")));
  } else {
    res.json({});
  }
});
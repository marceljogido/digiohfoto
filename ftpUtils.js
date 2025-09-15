const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

const displayUrl = "https://wsaseno.de/digiOH_files/";

const {
  sleep,
  getLightxConfig,
  addWatermark,
  getFtpConfig,
} = require("./utils");

function getConfig() {
  const config = getFtpConfig();
  return {
    host: config.ftpAddress,
    user: config.ftpUsername,
    password: config.ftpPassword,
    secure: false, // true if FTPS
  };
}

async function uploadToFTP(localPath, remotePath) {
  const client = new ftp.Client();
  try {
    const ftpConfig = getConfig();
    await client.access(ftpConfig);

    // Ensure the remote directory exists
    const remoteDir = path.dirname(remotePath).replace(/\\/g, "/");
    console.log(`📁 Creating remote directory: ${remoteDir}`);
    
    // Create directory recursively
    await client.ensureDir(remoteDir);
    console.log(`✅ Remote directory created/verified: ${remoteDir}`);

    console.log(`📤 Uploading file: ${localPath} -> ${remotePath}`);
    await client.uploadFrom(localPath, remotePath);
    console.log("[uploadToFTP] Upload successful!");
  } catch (err) {
    console.error("FTP error:", err);
    throw err; // Re-throw error so calling function knows it failed
  } finally {
    client.close();
  }
}

async function copyFile(fileUrl, remoteFile) {
  const localFile = path.basename(fileUrl);
  console.log(`localFile : ${localFile}`);

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Set paths to uploads folder
  const localFilePath = path.join(uploadsDir, localFile);
  const watermarkedFilePath = path.join(uploadsDir, "watermarked_" + localFile);
  const watermarkPath = "watermarkdigioh.png"; // Path to your watermark image

  try {
    console.log(">> Downloading file...");
    await downloadFile(fileUrl, localFilePath);

    //add watermark
    await addWatermark(localFilePath, watermarkPath, watermarkedFilePath);

    console.log(">> Uploading to FTP...");
    const result = await uploadFile(watermarkedFilePath, remoteFile);
    
    // Clean up files with better error handling
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`>> Cleaned up: ${localFilePath}`);
      }
    } catch (unlinkErr) {
      console.warn(`Warning: Could not delete ${localFilePath}:`, unlinkErr.message);
    }
    
    try {
      if (fs.existsSync(watermarkedFilePath)) {
        fs.unlinkSync(watermarkedFilePath);
        console.log(`>> Cleaned up: ${watermarkedFilePath}`);
      }
    } catch (unlinkErr) {
      console.warn(`Warning: Could not delete ${watermarkedFilePath}:`, unlinkErr.message);
    }
    
    return result;
  } catch (err) {
    console.error("Error in copyFile:", err);
    throw err; // Re-throw error so calling function knows it failed
  }
}

async function uploadFile(localFile, remoteFile) {
  console.log("📤 === FTP UPLOAD START ===");
  console.log(`📁 Local file: ${localFile}`);
  console.log(`🌐 Remote file: ${remoteFile}`);
  console.log(`🔗 Final URL will be: ${displayUrl}${remoteFile}`);

  try {
    console.log("🔄 Starting FTP upload...");
    await uploadToFTP(localFile, remoteFile);
    console.log("✅ FTP upload completed successfully!");

    const finalUrl = `${displayUrl}${remoteFile}`;
    console.log("🎉 Final URL:", finalUrl);
    return finalUrl;
  } catch (err) {
    console.log("💥 === FTP UPLOAD ERROR ===");
    console.error("❌ FTP Error:", err.message);
    console.error("❌ Full error:", err);
    console.log("💥 === END FTP ERROR ===");
    throw err; // Re-throw error
  }
  // Note: File cleanup is now handled in copyFile function
}

async function downloadFile(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`>>>Failed to fetch: ${res.statusText}`);

  // Convert Web Stream to Node Stream
  const nodeStream = require("stream").Readable.fromWeb(res.body);
  await streamPipeline(nodeStream, fs.createWriteStream(outputPath));
}

module.exports = {
  uploadToFTP,
  uploadFile,
  copyFile,
  downloadFile,
};

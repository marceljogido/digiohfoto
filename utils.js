const fs = require("fs");

const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

const path = require("path");
const sharp = require("sharp");

const configPathFtp = path.join(__dirname, "digiOH_PhotoBox_config_ftp.json");
const configPathLightX = path.join( __dirname, "digiOH_PhotoBox_config_lightx.json", );
const configPathGemini = path.join( __dirname, "digiOH_PhotoBox_config_gemini.json", );

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLightxConfig() {
  const fileCfg = fs.existsSync(configPathLightX)
    ? JSON.parse(fs.readFileSync(configPathLightX, "utf8"))
    : {};
  // Allow overriding via environment variables (persists across deploys)
  const envCfg = {
    lightXApi: process.env.LIGHTX_API_KEY || fileCfg.lightXApi,
    // Optional: allow some prompts/style URLs via env if desired later
  };
  return { ...fileCfg, ...envCfg };
}

function getGeminiConfig() {
  const fileCfg = fs.existsSync(configPathGemini)
    ? JSON.parse(fs.readFileSync(configPathGemini, "utf8"))
    : {};
  const envCfg = {
    geminiApi: process.env.GEMINI_API_KEY || fileCfg.geminiApi,
  };
  return { ...fileCfg, ...envCfg };
}

function getFtpConfig() {
  const fileCfg = fs.existsSync(configPathFtp)
    ? JSON.parse(fs.readFileSync(configPathFtp, "utf8"))
    : {};
  // Env overrides for reliability in Railway
  const envCfg = {
    host: process.env.FTP_HOST,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    port: process.env.FTP_PORT ? Number(process.env.FTP_PORT) : undefined,
    secure: typeof process.env.FTP_SECURE !== 'undefined' ? process.env.FTP_SECURE === 'true' : undefined,
    remotePath: process.env.FTP_REMOTE_PATH,
    displayUrl: process.env.FTP_DISPLAY_URL,
    // Back-compat keys expected elsewhere
    ftpAddress: process.env.FTP_HOST,
    ftpUsername: process.env.FTP_USER,
    ftpPassword: process.env.FTP_PASSWORD,
  };
  return { ...fileCfg, ...envCfg };
}

async function addWatermark(inputPath, watermarkPath, outputPath) {
  const image = sharp(inputPath);
  const { width, height } = await image.metadata();

  // Resize watermark to 30% of image width
  const watermark = await sharp(watermarkPath)
    .resize(Math.round(width * 0.3))
    .png()
    .toBuffer();

  await image
    .composite([
      {
        input: watermark,
        gravity: "southeast", // bottom-right
        blend: "over",
      },
    ])
    .toFile(outputPath);
}

module.exports = {
  sleep,
  getLightxConfig,
  getFtpConfig,
  addWatermark,
  getGeminiConfig,
};

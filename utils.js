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
  if (fs.existsSync(configPathLightX)) {
    const config = JSON.parse(fs.readFileSync(configPathLightX, "utf8"));
    return config;
  }
}

function getGeminiConfig() {
  if (fs.existsSync(configPathGemini)) {
    const config = JSON.parse(fs.readFileSync(configPathGemini, "utf8"));
    return config;
  }
}

function getFtpConfig() {
  if (fs.existsSync(configPathFtp)) {
    const config = JSON.parse(fs.readFileSync(configPathFtp, "utf8"));
    return config;
  }
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

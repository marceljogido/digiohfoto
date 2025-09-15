const { sleep, getLightxConfig, getFtpConfig } = require("./utils");

const {
  uploadToFTP,
  uploadFile,
  copyFile,
  downloadFile,
} = require("./ftpUtils");

const displayUrl = "https://wsaseno.de/digiOH_files/";
const imageLocation = ""; //"_sfpg_data/image/";

const path = require("path");
const filePrefix = "Gambar_robot_";
const subFolderGeneratedImage = ""; // "DigiOH_generated_images/";

function getLightboxApi() {
  const config = getLightxConfig();
  return config.lightXApi;
}

const LightXEditorAiType = Object.freeze({
  CARTOON: "https://api.lightxeditor.com/external/api/v1/cartoon",
  CARICATURE: "https://api.lightxeditor.com/external/api/v1/caricature",
  AVATAR: "https://api.lightxeditor.com/external/api/v1/avatar",
  AVATAR2: "https://api.lightxeditor.com/external/api/v1/avatar",
  PRODUCT_PHOTOSHOOT:
    "https://api.lightxeditor.com/external/api/v1/product-photoshoot",
  BACKGROUND_GENERATOR:
    "https://api.lightxeditor.com/external/api/v1/background-generator",
  TEXT2IMAGE: "https://api.lightxeditor.com/external/api/v1/text2image",
  PORTRAIT: "https://api.lightxeditor.com/external/api/v1/portrait",
  FACE_SWAP: "https://api.lightxeditor.com/external/api/v1/face-swap",
  OUTFIT: "https://api.lightxeditor.com/external/api/v1/outfit",
  //IMAGE2IMAGE:          'https://api.lightxeditor.com/external/api/v1/image2image',
  //SKETCH2IMAGE:         'https://api.lightxeditor.com/external/api/v1/sketch2image',
  HAIRSTYLE: "https://api.lightxeditor.com/external/api/v1/hairstyle",
  AIFILTER: "https://api.lightxeditor.com/external/api/v2/aifilter",
  AIVIRTUALTRYON: "https://api.lightxeditor.com/external/api/v2/aivirtualtryon",
  HEADSHOT: "https://api.lightxeditor.com/external/api/v2/headshot",
  REMOVE_BACKGROUND:
    "https://api.lightxeditor.com/external/api/v1/remove-background",
});

function getDataForLightX(imageUrl, aiTypeKey) {
  const config = getLightxConfig();
  switch (aiTypeKey) {
    //////////////////////////////////////////
    /////// only styleImageUrl needed
    //////////////////////////////////////////
    case "CARTOON":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_cartoon,
        textPrompt: config.textprompt_cartoon,
      };
    case "CARICATURE":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_caricature,
        textPrompt: config.textprompt_caricature,
      };
    case "AVATAR":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_avatar,
        textPrompt: config.textprompt_avatar,
      };
    case "AVATAR2":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_avatar2,
        textPrompt: config.textprompt_avatar2,
      };
    case "PRODUCT_PHOTOSHOOT":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_product_photoshoot,
        textPrompt: config.textprompt_product_photoshoot,
      };
    case "PORTRAIT":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_portrait,
        textPrompt: config.textprompt_portrait,
      };
    case "AIFILTER":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_aifilter,
        textPrompt: config.textprompt_aifilter,
      };

    //////////////////////////////////////////
    /////// only styleImageUrl needed
    //////////////////////////////////////////
    case "AIVIRTUALTRYON":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_aivirtualtryon,
      };
    case "FACE_SWAP":
      return {
        imageUrl: imageUrl,
        styleImageUrl: config.styleimageurl_face_swap,
      };

    //////////////////////////////////////////
    /////// only text prompt needed
    //////////////////////////////////////////
    case "BACKGROUND_GENERATOR":
      return {
        imageUrl: imageUrl,
        textPrompt: config.textprompt_background_generator,
      };
    case "TEXT2IMAGE":
      return {
        imageUrl: imageUrl,
        textPrompt: config.textprompt_image_generator,
      };
    case "OUTFIT":
      return {
        imageUrl: imageUrl,
        textPrompt: config.textprompt_outfit,
      };
    case "HAIRSTYLE":
      return {
        imageUrl: imageUrl,
        textPrompt: config.textprompt_hairstyle,
      };
    case "HEADSHOT":
      return {
        imageUrl: imageUrl,
        textPrompt: config.textprompt_headshot,
      };

    //case "IMAGE2IMAGE":
    //case "SKETCH2IMAGE":
    //break
    case "REMOVE_BACKGROUND":
    default: //default to REMOVE_BACKGROUND
      return {
        imageUrl: imageUrl,
        background: "eaeaea", // default background color
      };
  }
}

function getAiTypeKeyByValue(value) {
  return Object.keys(LightXEditorAiType).find(
    (key) => LightXEditorAiType[key] === value,
  );
}

async function generatedImage(imageUrl, selectedApiKey) {
  console.log(`Generated Image With: ${imageUrl}`);
  console.log(`Generated Image With: ${selectedApiKey}`);
  console.log("------------------------------");

  const url = LightXEditorAiType[selectedApiKey];
  const data = getDataForLightX(imageUrl, selectedApiKey);
  const options = getFetchOptions(data);

  console.log("url    : ");
  console.log(url);
  console.log("options:");
  console.log(options);
  console.log("data   : ");
  console.log(data);

  const response = await fetch(url, options)
    .then((response) => {
      if (!response.ok) {
        console.log(response);
        throw new Error(
          `>>>>Request failed with status code ${response.status}`,
        );
      }
      return response.json();
    })
    .then((data) => {
      console.log("Create avatar - Request was successful!");
      console.log(data);
      return data;
    })
    .catch((error) => {
      console.error("Error:", error);
    });

  try {
    const statusCode = response.statusCode;
    if (statusCode === 5040) {
      console.log("5040, API_CREDITS_CONSUMED...");
      return "API credits consumed, please check your API key and balance.";
    } else {
      const orderId = response.body.orderId;
      console.log(`OrderId: ${orderId}`);

      ////////////////////////////////
      // get generated image URL based on orderId
      ////////////////////////////////
      const generatedImageUrl = await tryGetImageUrl(orderId).then(
        async (imageUrl) => {
          if (imageUrl) {
            const remoteFile =
              subFolderGeneratedImage +
              filePrefix +
              selectedApiKey +
              getFileNameFromImageUrl(imageUrl);

            console.log("-->Found:", imageUrl);
            console.log("-->Found:", remoteFile);

            /////////////////////////////////////////////////////////
            try {
              const location = await copyFile(imageUrl, remoteFile);
              const generatedImageLocation = `${displayUrl}${imageLocation}${remoteFile}`;
              console.log(`-->after copy1: ${location}`);
              console.log(`-->after copy2: ${generatedImageLocation}`);
              return location;
            } catch (copyError) {
              console.error("Error in copyFile:", copyError);
              // Even if cleanup fails, we still have the file uploaded to FTP
              // Return the expected URL format
              return `${displayUrl}${remoteFile}`;
            }
            /////////////////////////////////////////////////////////
          } else {
            console.log("Image URL not found after max tries");
            return null; // ← TAMBAHKAN RETURN NULL
          }
        },
      );
      console.log("Final generatedImageUrl:", generatedImageUrl);
      return generatedImageUrl;
    }
  } catch (error) {
    console.error("Error in createAvatar:", error);
    return false;
  }
}

async function tryGetImageUrl(orderId, maxTry = 10) {
  let tried = 0;
  let imageUrl = null;

  while (tried++ < maxTry) {
    console.log("tryGetImageUrl - get...");
    imageUrl = await getImageUrl(orderId);
    if (imageUrl != null) break;
    console.log("tryGetImageUrl - break...");
    await sleep(3000); // sleep ms
  }
  return imageUrl;
}

async function getImageUrl(orderId) {
  const url = "https://api.lightxeditor.com/external/api/v1/order-status"; //alwasys use this URL for order status

  console.log(`getImageUrl - orderId: ${orderId}`);
  const options = getFetchOptions({ orderId: orderId });

  const response = await fetch(url, options)
    .then((response) => {
      if (!response.ok) {
        console.log(response);
        throw new Error(`Request failed with status code ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("getImageUrl - Request was successful!");
      console.log(data);
      return data;
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });

  const responsestatusCode = response.statusCode;
  if (responsestatusCode === 2000) {
    const status = response.body.status;
    if (status === "active") {
      const imageUrl = response.body.output;
      return imageUrl;
    }
  }
}

function getFileNameFromImageUrl(imageUrl) {
  const pathname = new URL(imageUrl).pathname;
  const filename = path.basename(pathname);
  return filename;
}

function getFetchOptions(data) {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getLightboxApi(),
    },
    body: JSON.stringify(data),
  };
  return options;
}

module.exports = {
  generatedImage,
  LightXEditorAiType,
};

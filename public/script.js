// Global variables
let photoHistory = [];
let currentProgress = 0;
let currentPhoto = null;
let processedPhotos = []; // Store processed photos for GIF creation
let currentPhotoForGif = null; // Store current photo pair for individual GIF
let aiModes = {}; // Store available AI modes
let currentQRData = { photo: null, gif: null }; // Store QR codes for photo and GIF
let currentQRType = 'photo'; // Current QR type being displayed
let cameraStarted = false; // Track camera state
let lastCustomPrompt = '';

// Preview system variables
let currentPreviewPhoto = null;
let currentAIMode = null;
let isPreviewMode = false;

// Initialize photo history on page load
document.addEventListener("DOMContentLoaded", function() {
  loadPhotoHistory();
  updateProgressBar(0);
  loadAiModes(); // Load AI transformation modes
  setupCustomPromptHandlers(); // Setup custom prompt event handlers
  
  // JANGAN langsung attach kamera - tunggu user click
  // Webcam.attach("#my_camera"); // ❌ HAPUS INI
  
  // Hide unconfigured filters based on LightX config
  try {
    fetch('/api/config_lightx')
      .then(r => r.json())
      .then(cfg => hideUnavailableFilters(cfg))
      .catch(() => {/* ignore */});
  } catch (_) {}
  // Explicitly hide Virtual Try-On for now
  var vto = document.getElementById('virtual_tryon');
  if (vto) {
    vto.style.display = 'none';
    vto.title = 'Disembunyikan sementara';
  }
});

// Fungsi untuk start kamera setelah user click
function startCamera() {
  console.log('🎬 Starting camera...');
  
  // Show loading state
  const startButton = document.querySelector('.start-button');
  startButton.innerHTML = `
    <div class="camera-icon">⏳</div>
    <h1>Memulai Kamera...</h1>
    <p>Mohon tunggu sebentar</p>
  `;
  
  try {
    // Configure webcam
    Webcam.set({
      width: 1280,
      height: 720,
      image_format: "jpeg",
      flip_horiz: true,
      jpeg_quality: 85,
    });
    
    // Attach camera
    Webcam.attach("#my_camera");
    
    // Hide start screen and show camera
    setTimeout(() => {
      document.getElementById('startScreen').style.display = 'none';
      document.getElementById('my_camera').style.display = 'block';
      cameraStarted = true;
      
      console.log('✅ Camera started successfully');
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error starting camera:', error);
    
    // Show error state
    startButton.innerHTML = `
      <div class="camera-icon">❌</div>
      <h1>Gagal Memulai Kamera</h1>
      <p>Silakan refresh halaman dan coba lagi</p>
      <button onclick="location.reload()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid white; padding: 10px 20px; border-radius: 10px; margin-top: 15px; cursor: pointer;">
        Refresh Halaman
      </button>
    `;
  }
}

// Event listeners for AI style buttons
document.getElementById("create_avatar").onclick = async function () {
  await take_snapshot("AVATAR");
};
document.getElementById("create_cartoon").onclick = async function () {
  await take_snapshot("CARTOON");
};
document.getElementById("background_generator").onclick = async function () {
  await take_snapshot("BACKGROUND_GENERATOR");
};
document.getElementById("outfit").onclick = async function () {
  await take_snapshot("OUTFIT");
};
document.getElementById("face_swap").onclick = async function () {
  await take_snapshot("FACE_SWAP");
};
document.getElementById("portrait").onclick = async function () {
  await take_snapshot("PORTRAIT");
};
document.getElementById("ai_filter").onclick = async function () {
  await take_snapshot("AIFILTER");
};
document.getElementById("hairstyle").onclick = async function () {
  await take_snapshot("HAIRSTYLE");
};
document.getElementById("headshot").onclick = async function () {
  await take_snapshot("HEADSHOT");
};
document.getElementById("virtual_tryon").onclick = async function () {
  await take_snapshot("AIVIRTUALTRYON");
};
document.getElementById("product_photoshoot").onclick = async function () {
  await take_snapshot("PRODUCT_PHOTOSHOOT");
};
document.getElementById("caricature").onclick = async function () {
  await take_snapshot("CARICATURE");
};
document.getElementById("create_avatar2").onclick = async function () {
  await take_snapshot("AVATAR2");
};
document.getElementById("gemini_generator").onclick = async function () {
  await take_snapshot_with_gemini();
};

document.getElementById("backButtonId").onclick = async function () {
  document.getElementById("results").innerHTML = "";
  document.getElementById("backButton").style.display = "none";
  document.getElementById("qrcode_viewer").style.display = "none";
  
  // Reset QR data
  currentQRData = { photo: null, gif: null };
  currentQRType = 'photo';
};

async function take_snapshot(selectedApi = LightXEditorAiType.CARTOON) {
  if (!cameraStarted) {
    alert('Silakan klik "Mari Berfoto!" terlebih dahulu untuk memulai kamera');
    return;
  }
  
  await showCountdown(3); // Show countdown from 3
  return new Promise((resolve, reject) => {
    Webcam.snap(function (data_uri) {
      resolve(data_uri);
    });
  }).then((data_uri) => {
    // Simpan data untuk preview
    currentPreviewPhoto = data_uri;
    currentAIMode = selectedApi;
    isPreviewMode = true;
    
    // Show preview dengan retake/lanjutkan
    showPhotoPreview(data_uri, selectedApi);
  });
}

async function take_snapshot_with_gemini() {
  if (!cameraStarted) {
    alert('Silakan klik "Mari Berfoto!" terlebih dahulu untuk memulai kamera');
    return;
  }
  
  await showCountdown(3); // Show countdown from 3
  return new Promise((resolve, reject) => {
    Webcam.snap(function (data_uri) {
      resolve(data_uri);
    });
  }).then((data_uri) => {
    // Simpan data untuk preview
    currentPreviewPhoto = data_uri;
    currentAIMode = 'GEMINI';
    isPreviewMode = true;
    
    // Show preview dengan retake/lanjutkan
    showPhotoPreview(data_uri, 'GEMINI');
  });
}

async function processWithGeminiApi(data_uri){
var imageName = new Date().toISOString().split(".")[0].replace(/[^\d]/gi, "");

  const data = {
    base64data: data_uri,
    imageName: imageName,
    selectedApi: "gemini",
  };

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };

  document.getElementById("spinner").style.display = "flex"; // Show spinner
  const progressInterval = simulateProgress(); // Start progress simulation

  try {
    const response = await fetch("/processWithGemini", options);
    let result;
    const contentType = response.headers.get("content-type");
    console.log(contentType);

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    console.log("Image generated successfully:");
    console.log(result);

    // Debug: Cek apakah imageUrl valid
    if (!result.imageUrl) {
      console.error("No imageUrl in Gemini response:", result);
      console.error("Response type:", typeof result);
      console.error("Response keys:", Object.keys(result || {}));
      
      let errorMessage = "Error: Tidak ada URL gambar yang diterima dari Gemini API";
      if (result && result.error) {
        errorMessage += `<br><small>Detail: ${result.error}</small>`;
      } else if (result && result.message) {
        errorMessage += `<br><small>Detail: ${result.message}</small>`;
      }
      
      clearInterval(progressInterval);
      document.getElementById("results").innerHTML = 
        `<div style='text-align: center; padding: 20px;'>
          <i class='fas fa-exclamation-triangle' style='font-size: 3rem; color: #ff6b6b; margin-bottom: 10px;'></i>
          <p>${errorMessage}</p>
          <button onclick="retakePhoto()" style="background: linear-gradient(145deg, #6c757d, #5a6268); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 10px;">
            <i class="fas fa-redo"></i> Coba Lagi
          </button>
        </div>`;
      return;
    }

    // Complete progress bar
    clearInterval(progressInterval);
    completeProgress();

    // Add to photo history
    addToPhotoHistory(result.imageUrl, "GEMINI", new Date().toISOString());

    // Show preview of result
    showPreview(result.imageUrl, "GEMINI", 'result');

    // Display result with better styling
    document.getElementById("results").innerHTML =
      `<div style="text-align: center;">
        <img src="${result.imageUrl}" alt="Result Image" style="max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" />
        <div style="margin-top: 15px;">
          <button onclick="showPreview('${result.imageUrl}', 'GEMINI', 'result')" style="background: linear-gradient(145deg, #28a745, #20c997); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-eye"></i> Preview
          </button>
          <button onclick="showQRDownloadModal()" style="background: linear-gradient(145deg, #667eea, #764ba2); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-download"></i> Download
          </button>
          <button onclick="shareImage('${result.imageUrl}')" style="background: linear-gradient(145deg, #ff6b6b, #ee5a52); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-share"></i> Share
          </button>
        </div>
      </div>`;
    
    // Show QR viewer with both photo and GIF QR
    showQRViewer(result.qr, result.gifQr);
    document.getElementById("backButton").style.display = "flex";

    // If server already created a GIF (LightX flow), render it inline
    try {
      if (result.gifUrl) {
        const resultsDiv = document.getElementById("results");
        const gifBlock = document.createElement('div');
        gifBlock.style.marginTop = '30px';
        gifBlock.style.padding = '20px';
        gifBlock.style.background = '#f0f8ff';
        gifBlock.style.borderRadius = '15px';
        gifBlock.style.border = '2px solid #e6f3ff';
        gifBlock.innerHTML = `
          <h4 style="color: #333; margin-bottom: 15px;">
            <i class="fas fa-film"></i> GIF Before/After (Server)
          </h4>
          <img src="${result.gifUrl}" alt="Before/After GIF" style="max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" />
          <div style="margin-top: 15px;">
            <button onclick="showQRDownloadModal()" style="background: linear-gradient(145deg, #667eea, #764ba2); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
              <i class="fas fa-download"></i> Download GIF
            </button>
            <button onclick="shareImage('${result.gifUrl}')" style="background: linear-gradient(145deg, #ff6b6b, #ee5a52); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
              <i class="fas fa-share"></i> Share GIF
            </button>
          </div>
        `;
        resultsDiv.appendChild(gifBlock);
      }
    } catch (_) {}
  } catch (error) {
    console.error("Error generating image:", error);
    clearInterval(progressInterval);
    document.getElementById("results").innerHTML = 
      "<div style='text-align: center; padding: 20px;'><i class='fas fa-exclamation-triangle' style='font-size: 3rem; color: #ff6b6b; margin-bottom: 10px;'></i><p>Terjadi kesalahan saat memproses foto dengan Gemini. Silakan coba lagi.</p></div>";
  } finally {
    document.getElementById("spinner").style.display = "none"; // Hide spinner
  }

}

async function generateAiImage(data_uri, selectedApi) {
  var imageName = new Date().toISOString().split(".")[0].replace(/[^\d]/gi, "");

  const data = {
    base64data: data_uri,
    imageName: imageName,
    selectedApi: selectedApi,
  };

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };

  document.getElementById("spinner").style.display = "flex"; // Show spinner
  const progressInterval = simulateProgress(); // Start progress simulation

  try {
    const response = await fetch("/upload", options);
    let result;
    const contentType = response.headers.get("content-type");
    console.log(contentType);

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    console.log("Image generated successfully:");
    console.log(result);
    console.log("Image URL:", result.imageUrl);

    // Debug: Cek apakah imageUrl valid
    if (!result.imageUrl) {
      console.error("No imageUrl in response:", result);
      console.error("Response type:", typeof result);
      console.error("Response keys:", Object.keys(result || {}));
      
      let errorMessage = "Error: Tidak ada URL gambar yang diterima dari server";
      if (result && result.error) {
        errorMessage += `<br><small>Detail: ${result.error}</small>`;
      } else if (result && result.message) {
        errorMessage += `<br><small>Detail: ${result.message}</small>`;
      }
      
      document.getElementById("results").innerHTML = 
        `<div style='text-align: center; padding: 20px;'>
          <i class='fas fa-exclamation-triangle' style='font-size: 3rem; color: #ff6b6b; margin-bottom: 10px;'></i>
          <p>${errorMessage}</p>
          <button onclick="retakePhoto()" style="background: linear-gradient(145deg, #6c757d, #5a6268); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 10px;">
            <i class="fas fa-redo"></i> Coba Lagi
          </button>
        </div>`;
      return;
    }

    // Complete progress bar
    clearInterval(progressInterval);
    completeProgress();

    // Add to photo history
    addToPhotoHistory(result.imageUrl, selectedApi, new Date().toISOString());

    // Show preview of result
    showPreview(result.imageUrl, selectedApi, 'result');

    // Display result with better styling
    document.getElementById("results").innerHTML =
      `<div style="text-align: center;">
        <img src="${result.imageUrl}" alt="Result Image" style="max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" onerror="console.error('Failed to load image:', this.src)" />
        <div style="margin-top: 15px;">
          <button onclick="showPreview('${result.imageUrl}', '${selectedApi}', 'result')" style="background: linear-gradient(145deg, #28a745, #20c997); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-eye"></i> Preview
          </button>
          <button onclick="showQRDownloadModal()" style="background: linear-gradient(145deg, #667eea, #764ba2); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-download"></i> Download
          </button>
          <button onclick="shareImage('${result.imageUrl}')" style="background: linear-gradient(145deg, #ff6b6b, #ee5a52); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-share"></i> Share
          </button>
        </div>
      </div>`;
    
    // Show QR viewer with both photo and GIF QR
    showQRViewer(result.qr, result.gifQr);
    document.getElementById("backButton").style.display = "flex";
  } catch (error) {
    console.error("Error generating image:", error);
    clearInterval(progressInterval);
    document.getElementById("results").innerHTML = 
      "<div style='text-align: center; padding: 20px;'><i class='fas fa-exclamation-triangle' style='font-size: 3rem; color: #ff6b6b; margin-bottom: 10px;'></i><p>Terjadi kesalahan saat memproses foto. Silakan coba lagi.</p></div>";
  } finally {
    document.getElementById("spinner").style.display = "none"; // Hide spinner
  }
}

// Photo History Functions
function loadPhotoHistory() {
  // Load from localStorage or make API call to get history
  const savedHistory = localStorage.getItem('photoHistory');
  if (savedHistory) {
    photoHistory = JSON.parse(savedHistory);
    displayPhotoHistory();
  }
}

function addToPhotoHistory(imageUrl, style, timestamp) {
  const photoItem = {
    id: Date.now(),
    imageUrl: imageUrl,
    style: style,
    timestamp: timestamp || new Date().toISOString()
  };
  
  photoHistory.unshift(photoItem); // Add to beginning
  if (photoHistory.length > 20) { // Keep only last 20 photos
    photoHistory = photoHistory.slice(0, 20);
  }
  
  localStorage.setItem('photoHistory', JSON.stringify(photoHistory));
  displayPhotoHistory();
}

function displayPhotoHistory() {
  const historyContainer = document.getElementById('photoHistory');
  if (!historyContainer) return;
  
  if (photoHistory.length === 0) {
    historyContainer.innerHTML = '<p style="text-align: center; color: white; opacity: 0.7;">Belum ada foto yang diproses</p>';
    return;
  }
  
  historyContainer.innerHTML = photoHistory.map(photo => `
    <div class="history-item" onclick="viewPhoto('${photo.imageUrl}')" title="${photo.style} - ${new Date(photo.timestamp).toLocaleString()}">
      <img src="${photo.imageUrl}" alt="${photo.style}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyb3I8L3RleHQ+PC9zdmc+'">
    </div>
  `).join('');
}

// Clear all saved photo history
function clearPhotoHistory() {
  try {
    photoHistory = [];
    localStorage.removeItem('photoHistory');
    displayPhotoHistory();
    // Optional UI feedback
    const historyContainer = document.getElementById('photoHistory');
    if (historyContainer) {
      historyContainer.innerHTML = '<p style="text-align: center; color: #333;">Riwayat foto telah dihapus.</p>';
    }
  } catch (e) {
    console.error('Gagal menghapus riwayat foto:', e);
    alert('Gagal menghapus riwayat. Coba lagi.');
  }
}

function viewPhoto(imageUrl) {
  document.getElementById("results").innerHTML = `<img src="${imageUrl}" alt="History Photo" style="max-width: 100%; height: auto; border-radius: 15px;" />`;
  document.getElementById("backButton").style.display = "flex";
}

// Progress Bar Functions
function updateProgressBar(percentage) {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = percentage + '%';
  }
}

function simulateProgress() {
  currentProgress = 0;
  updateProgressBar(0);
  
  const interval = setInterval(() => {
    currentProgress += Math.random() * 15;
    if (currentProgress > 90) {
      currentProgress = 90;
      clearInterval(interval);
    }
    updateProgressBar(currentProgress);
  }, 200);
  
  return interval;
}

function completeProgress() {
  updateProgressBar(100);
  setTimeout(() => {
    updateProgressBar(0);
  }, 1000);
}

// Enhanced Countdown with better animations
function showCountdown(seconds) {
  return new Promise((resolve) => {
    const countdownDiv = document.getElementById("countdown");
    countdownDiv.style.display = "block";
    let current = seconds;
    
    const updateCountdown = () => {
      if (current > 0) {
        countdownDiv.textContent = current;
        countdownDiv.style.animation = 'none';
        setTimeout(() => {
          countdownDiv.style.animation = 'countdownPulse 1s ease';
        }, 10);
        current--;
        setTimeout(updateCountdown, 1000);
      } else {
        countdownDiv.textContent = "😊";
        countdownDiv.style.fontSize = "6rem";
        setTimeout(() => {
          countdownDiv.style.display = "none";
          countdownDiv.style.fontSize = "8rem";
          resolve();
        }, 500);
      }
    };
    
    updateCountdown();
  });
}

// Download and Share Functions
function downloadImage(imageUrl) {
  if (!imageUrl) {
    alert('URL gambar tidak tersedia');
    return;
  }
  
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `DigiOH_Photo_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Show QR Download Modal
function showQRDownloadModal() {
  const modal = document.getElementById('qrDownloadModal');
  const qrPhotoDisplay = document.getElementById('qrPhotoDisplay');
  const qrGifDisplay = document.getElementById('qrGifDisplay');
  
  // Display QR Code Foto
  if (currentQRData.photo) {
    qrPhotoDisplay.innerHTML = `<img src="${currentQRData.photo}" alt="QR Foto" style="max-width: 200px; max-height: 200px; border-radius: 10px;" />`;
  } else {
    qrPhotoDisplay.innerHTML = '<p style="color: #999; font-style: italic;">QR Code foto tidak tersedia</p>';
  }
  
  // Display QR Code GIF
  if (currentQRData.gif) {
    qrGifDisplay.innerHTML = `<img src="${currentQRData.gif}" alt="QR GIF" style="max-width: 200px; max-height: 200px; border-radius: 10px;" />`;
  } else {
    qrGifDisplay.innerHTML = '<p style="color: #999; font-style: italic;">QR Code GIF tidak tersedia</p>';
  }
  
  // Show modal
  modal.style.display = 'flex';
}

// Close QR Download Modal
function closeQRDownloadModal() {
  document.getElementById('qrDownloadModal').style.display = 'none';
}

function shareImage(imageUrl) {
  if (navigator.share) {
    navigator.share({
      title: 'DigiOH AI Photobox',
      text: 'Lihat foto keren yang dibuat dengan AI!',
      url: imageUrl
    }).catch(console.error);
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(imageUrl).then(() => {
      alert('Link foto telah disalin ke clipboard!');
    }).catch(() => {
      // Fallback: show URL
      prompt('Salin link ini:', imageUrl);
    });
  }
}

// Touch gestures for mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', function(e) {
  if (!touchStartX || !touchStartY) return;
  
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  
  const diffX = touchStartX - touchEndX;
  const diffY = touchStartY - touchEndY;
  
  // Swipe left/right to change AI styles
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
    const aiButtons = document.querySelectorAll('.aiStyles button');
    const currentActive = document.querySelector('.aiStyles button:focus');
    
    if (currentActive) {
      const currentIndex = Array.from(aiButtons).indexOf(currentActive);
      let nextIndex;
      
      if (diffX > 0) { // Swipe left - next
        nextIndex = (currentIndex + 1) % aiButtons.length;
      } else { // Swipe right - previous
        nextIndex = (currentIndex - 1 + aiButtons.length) % aiButtons.length;
      }
      
      aiButtons[nextIndex].focus();
    }
  }
  
  touchStartX = 0;
  touchStartY = 0;
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.key >= '1' && e.key <= '7') {
    const aiButtons = document.querySelectorAll('.aiStyles button');
    const index = parseInt(e.key) - 1;
    if (aiButtons[index]) {
      aiButtons[index].click();
    }
  }
  
  if (e.key === 'Escape') {
    document.getElementById('backButtonId').click();
  }
  
  if (e.key === ' ') { // Spacebar
    e.preventDefault();
    // Take photo with first available style
    document.querySelector('.aiStyles button').click();
  }
});

// Hide filters that are not configured
function hideUnavailableFilters(config){
  const isFilled = (v) => typeof v === 'string' && v.trim().length > 0;

  const requirements = [
    { id: 'create_avatar', ok: isFilled(config.styleimageurl_avatar) || isFilled(config.textprompt_avatar) },
    { id: 'create_avatar2', ok: isFilled(config.styleimageurl_avatar2) || isFilled(config.textprompt_avatar2) },
    { id: 'create_cartoon', ok: isFilled(config.styleimageurl_cartoon) || isFilled(config.textprompt_cartoon) },
    { id: 'background_generator', ok: isFilled(config.textprompt_background_generator) },
    { id: 'outfit', ok: isFilled(config.textprompt_outfit) },
    { id: 'face_swap', ok: isFilled(config.styleimageurl_face_swap) },
    { id: 'portrait', ok: isFilled(config.styleimageurl_portrait) || isFilled(config.textprompt_portrait) },
    { id: 'ai_filter', ok: isFilled(config.styleimageurl_aifilter) || isFilled(config.textprompt_aifilter) },
    { id: 'hairstyle', ok: isFilled(config.textprompt_hairstyle) },
    { id: 'headshot', ok: isFilled(config.textprompt_headshot) },
    { id: 'virtual_tryon', ok: isFilled(config.styleimageurl_aivirtualtryon) },
    { id: 'product_photoshoot', ok: isFilled(config.styleimageurl_product_photoshoot) || isFilled(config.textprompt_product_photoshoot) },
    { id: 'caricature', ok: isFilled(config.styleimageurl_caricature) || isFilled(config.textprompt_caricature) },
  ];

  requirements.forEach(({id, ok}) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!ok) {
      el.style.display = 'none';
      el.title = 'Sembunyikan: belum dikonfigurasi di LightX Config';
    } else {
      el.style.display = '';
    }
  });

  // Force hide Virtual Try-On regardless of config
  const vto = document.getElementById('virtual_tryon');
  if (vto) {
    vto.style.display = 'none';
    vto.title = 'Disembunyikan sementara';
  }
}

// Preview Functions
function showPreview(imageUrl, style, type) {
  const modal = document.getElementById('previewModal');
  const content = document.getElementById('previewContent');
  
  const styleNames = {
    'AVATAR': 'Avatar',
    'AVATAR2': 'Avatar 2',
    'CARTOON': 'Kartun',
    'OUTFIT': 'Ganti Baju',
    'BACKGROUND_GENERATOR': 'Background',
    'FACE_SWAP': 'Tukar Wajah',
    'GEMINI': 'Gemini AI'
  };
  
  const typeNames = {
    'original': 'Foto Asli',
    'result': 'Hasil AI'
  };
  
  content.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #333; margin-bottom: 10px;">
        <i class="fas fa-${type === 'original' ? 'camera' : 'magic'}"></i> 
        ${typeNames[type]} - ${styleNames[style] || style}
      </h3>
      <p style="color: #666; font-size: 14px;">
        ${type === 'original' ? 'Foto yang baru saja diambil' : 'Hasil pemrosesan AI'}
      </p>
    </div>
    <div style="max-height: 60vh; overflow: hidden; border-radius: 15px;">
      <img src="${imageUrl}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" />
    </div>
    <div style="margin-top: 20px;">
      <button onclick="showQRDownloadModal()" style="background: linear-gradient(145deg, #667eea, #764ba2); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin: 5px; font-size: 14px;">
        <i class="fas fa-download"></i> Download
      </button>
      <button onclick="shareImage('${imageUrl}')" style="background: linear-gradient(145deg, #ff6b6b, #ee5a52); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin: 5px; font-size: 14px;">
        <i class="fas fa-share"></i> Share
      </button>
      <button onclick="closePreview()" style="background: linear-gradient(145deg, #6c757d, #5a6268); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin: 5px; font-size: 14px;">
        <i class="fas fa-times"></i> Tutup
      </button>
    </div>
  `;
  
  modal.style.display = 'flex';
  currentPhoto = { imageUrl, style, type };
}

function closePreview() {
  document.getElementById('previewModal').style.display = 'none';
  currentPhoto = null;
  
  // Reset preview data jika dalam preview mode
  if (isPreviewMode) {
    currentPreviewPhoto = null;
    currentAIMode = null;
    isPreviewMode = false;
  }
}

// Fungsi untuk show preview foto dengan retake/lanjutkan
function showPhotoPreview(data_uri, aiMode) {
  const modal = document.getElementById('photoPreviewModal');
  const content = document.getElementById('photoPreviewContent');
  const imageContainer = document.getElementById('photoPreviewImageContainer');
  const actions = document.getElementById('photoPreviewActions');
  
  const modeNames = {
    'AVATAR': 'Avatar',
    'AVATAR2': 'Avatar 2',
    'CARTOON': 'Kartun',
    'OUTFIT': 'Ganti Baju',
    'BACKGROUND_GENERATOR': 'Background',
    'FACE_SWAP': 'Tukar Wajah',
    'GEMINI': 'Gemini AI',
    'renaissance': 'Renaissance',
    'cartoon': 'Cartoon',
    'anime': 'Anime',
    'custom': 'Custom'
  };
  
  // Update header content
  content.innerHTML = `
    <h3 style="color: #333; margin-bottom: 10px; font-size: 1.5rem; font-weight: 600;">
      <i class="fas fa-camera" style="margin-right: 8px; color: #667eea;"></i> Preview Foto
    </h3>
    <p style="color: #666; font-size: 14px; margin: 0;">
      Mode: <strong>${modeNames[aiMode] || aiMode}</strong>
    </p>
  `;
  
  // Update image container
  imageContainer.innerHTML = `
    <img src="${data_uri}" alt="Preview Foto" style="max-width: 100%; max-height: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); object-fit: contain;" />
  `;
  
  // Show retake/lanjutkan buttons
  actions.style.display = 'block';
  
  // Show modal
  modal.style.display = 'flex';
}

// Fungsi close photo preview modal
function closePhotoPreview() {
  document.getElementById('photoPreviewModal').style.display = 'none';
  
  // Reset preview data
  currentPreviewPhoto = null;
  currentAIMode = null;
  isPreviewMode = false;
}

// Fungsi retake - kembali ke kamera
function retakePhoto() {
  console.log('🔄 Retaking photo...');
  
  // Hide photo preview modal
  document.getElementById('photoPreviewModal').style.display = 'none';
  
  // Reset preview data
  currentPreviewPhoto = null;
  currentAIMode = null;
  isPreviewMode = false;
  
  // Show camera again
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('my_camera').style.display = 'block';
  
  // Clear results
  document.getElementById('results').innerHTML = '';
  document.getElementById('backButton').style.display = 'none';
  document.getElementById('qrcode_viewer').style.display = 'none';
}

// Fungsi lanjutkan - proses ke AI
function continueToAI() {
  console.log('➡️ Continuing to AI processing...');
  
  // Hide photo preview modal
  document.getElementById('photoPreviewModal').style.display = 'none';
  
  // Process dengan AI berdasarkan mode
  if (currentAIMode === 'GEMINI') {
    processWithGeminiApi(currentPreviewPhoto);
  } else if (currentAIMode === 'custom') {
    if (!lastCustomPrompt || !lastCustomPrompt.trim()) {
      alert('Prompt custom kosong. Silakan isi terlebih dahulu.');
      document.getElementById('customPromptSection').style.display = 'block';
      return;
    }
    processWithAiMode(currentPreviewPhoto, 'custom', lastCustomPrompt);
  } else if (currentAIMode && aiModes[currentAIMode]) {
    // AI Modes (Gemini)
    processWithAiMode(currentPreviewPhoto, currentAIMode);
  } else {
    // LightX modes
    generateAiImage(currentPreviewPhoto, currentAIMode);
  }
  
  // Reset preview data
  currentPreviewPhoto = null;
  currentAIMode = null;
  isPreviewMode = false;
}

// Close modal when clicking outside
document.getElementById('previewModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closePreview();
  }
});

// Close photo preview modal when clicking outside
document.getElementById('photoPreviewModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closePhotoPreview();
  }
});

// Close QR download modal when clicking outside
document.getElementById('qrDownloadModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeQRDownloadModal();
  }
});

////////////////////////////////
// AI Modes Functions
////////////////////////////////

// Load available AI transformation modes
async function loadAiModes() {
  try {
    console.log('Loading AI modes...');
    const response = await fetch('/api/modes');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch modes: ${response.status}`);
    }
    
    aiModes = await response.json();
    console.log('AI modes loaded:', Object.keys(aiModes));
    displayAiModes();
  } catch (error) {
    console.error('Error loading AI modes:', error);
  }
}

// Display AI modes as buttons
function displayAiModes() {
  const container = document.getElementById('aiModesContainer');
  if (!container) {
    console.error('AI modes container not found!');
    return;
  }
  
  console.log('Displaying AI modes, container found:', container);
  container.innerHTML = '';
  
  Object.keys(aiModes).forEach(modeKey => {
    const mode = aiModes[modeKey];
    const button = document.createElement('button');
    button.id = `aiMode_${modeKey}`;
    button.title = `${mode.name} - ${mode.prompt.substring(0, 100)}...`;
    
    if (modeKey === 'custom') {
      button.onclick = () => showCustomPromptDialog();
    } else {
      button.onclick = () => takeSnapshotWithAiMode(modeKey);
    }
    
    button.innerHTML = `
      <div class="emoji">${mode.emoji}</div>
      <div>${mode.name}</div>
    `;
    
    container.appendChild(button);
  });
}

// Take snapshot with specific AI mode
async function takeSnapshotWithAiMode(modeKey) {
  if (!cameraStarted) {
    alert('Silakan klik "Mari Berfoto!" terlebih dahulu untuk memulai kamera');
    return;
  }
  
  await showCountdown(3);
  
  return new Promise((resolve, reject) => {
    Webcam.snap(function (data_uri) {
      resolve(data_uri);
    });
  }).then((data_uri) => {
    // Simpan data untuk preview
    currentPreviewPhoto = data_uri;
    currentAIMode = modeKey;
    isPreviewMode = true;
    
    // Show preview dengan retake/lanjutkan
    showPhotoPreview(data_uri, modeKey);
  });
}

// Process image with specific AI mode
async function processWithAiMode(data_uri, modeKey, customPrompt = null) {
  var imageName = new Date().toISOString().split(".")[0].replace(/[^\d]/gi, "");

  const data = {
    base64data: data_uri,
    imageName: imageName,
    mode: modeKey,
    customPrompt: customPrompt
  };

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };

  document.getElementById("spinner").style.display = "flex";
  const progressInterval = simulateProgress();

  try {
    const response = await fetch("/processWithGeminiModes", options);
    
    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log("AI Mode processing successful:", result);
    console.log("Image URL received:", result.imageUrl);
    
    // Check if result has required fields
    if (!result.imageUrl) {
      throw new Error("Server tidak mengembalikan URL gambar");
    }
    
    // Test if image URL is accessible
    const testImg = new Image();
    testImg.onload = () => console.log("✅ Image URL is accessible");
    testImg.onerror = () => console.error("❌ Image URL cannot be loaded:", result.imageUrl);
    testImg.src = result.imageUrl;

    clearInterval(progressInterval);
    completeProgress();

    // Store current photo for individual GIF creation
    currentPhotoForGif = {
      original: data_uri,
      processed: result.imageUrl,
      mode: modeKey,
      timestamp: new Date().toISOString()
    };
    
    // Also store in history for bulk GIF creation (optional)
    processedPhotos.push(currentPhotoForGif);

    // Add to photo history
    addToPhotoHistory(result.imageUrl, `AI-${modeKey}`, new Date().toISOString());

    // Show preview of result
    showPreview(result.imageUrl, modeKey, 'result');

    // Automatically create GIF with countdown
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      const autoGifStatus = document.getElementById('autoGifStatus');
      if (autoGifStatus && countdown > 0) {
        autoGifStatus.innerHTML = `
          <i class="fas fa-clock"></i> 
          <span style="color: #856404;">GIF before/after akan dibuat dalam ${countdown} detik...</span>
        `;
        countdown--;
      } else {
        clearInterval(countdownInterval);
        const autoGifStatus = document.getElementById('autoGifStatus');
        if (autoGifStatus) {
          autoGifStatus.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i> 
            <span style="color: #856404;">Membuat GIF animasi...</span>
          `;
        }
        console.log("🎬 Auto-creating GIF for current photo...");
        createCurrentPhotoGifAuto();
      }
    }, 1000);

    // Display result
    document.getElementById("results").innerHTML =
      `<div style="text-align: center;">
        <img src="${result.imageUrl}" alt="AI Result" style="max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" 
             onerror="console.error('Failed to load image:', this.src); this.style.border='2px solid red'; this.alt='❌ Gambar tidak dapat dimuat: ' + this.src;" />
        <div style="margin-top: 15px;">
          <button onclick="showPreview('${result.imageUrl}', '${modeKey}', 'result')" style="background: linear-gradient(145deg, #28a745, #20c997); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-eye"></i> Preview
          </button>
          <button onclick="showQRDownloadModal()" style="background: linear-gradient(145deg, #667eea, #764ba2); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-download"></i> Download
          </button>
          <button onclick="shareImage('${result.imageUrl}')" style="background: linear-gradient(145deg, #ff6b6b, #ee5a52); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
            <i class="fas fa-share"></i> Share
          </button>
          <div id="autoGifStatus" style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 10px; border: 1px solid #ffeaa7;">
            <i class="fas fa-clock"></i> <span style="color: #856404;">GIF before/after akan dibuat dalam 2 detik...</span>
          </div>
        </div>
      </div>`;
    
    // Show QR viewer with both photo and GIF QR
    showQRViewer(result.qr, result.gifQr);
    document.getElementById("backButton").style.display = "flex";

  } catch (error) {
    console.error("Error processing with AI mode:", error);
    clearInterval(progressInterval);
    
    // Show detailed error message
    let errorMessage = "Terjadi kesalahan saat memproses foto.";
    if (error.message) {
      errorMessage += " Detail: " + error.message;
    }
    
    document.getElementById("results").innerHTML = 
      `<div style='text-align: center; padding: 20px;'>
        <i class='fas fa-exclamation-triangle' style='font-size: 3rem; color: #ff6b6b; margin-bottom: 10px;'></i>
        <p>${errorMessage}</p>
        <p style='margin-top: 10px; color: #666;'>Silakan coba lagi atau periksa konfigurasi Gemini.</p>
      </div>`;
      
    // Also show alert for immediate feedback
    alert(errorMessage);
  } finally {
    document.getElementById("spinner").style.display = "none";
  }
}

// Show custom prompt dialog
function showCustomPromptDialog() {
  document.getElementById('customPromptSection').style.display = 'block';
  document.getElementById('customPromptInput').focus();
}

// Setup custom prompt event handlers
function setupCustomPromptHandlers() {
  const executeBtn = document.getElementById('executeCustomPrompt');
  const cancelBtn = document.getElementById('cancelCustomPrompt');
  
  if (executeBtn) {
    executeBtn.onclick = async function() {
      const customPrompt = document.getElementById('customPromptInput').value.trim();
      if (!customPrompt) {
        alert('Silakan masukkan prompt custom terlebih dahulu.');
        return;
      }
      // Remember last custom prompt for later processing
      lastCustomPrompt = customPrompt;
      
      document.getElementById('customPromptSection').style.display = 'none';
      
      if (!cameraStarted) {
        alert('Silakan klik "Mari Berfoto!" terlebih dahulu untuk memulai kamera');
        return;
      }
      
      await showCountdown(3);
      
      return new Promise((resolve, reject) => {
        Webcam.snap(function (data_uri) {
          resolve(data_uri);
        });
      }).then((data_uri) => {
        // Simpan data untuk preview
        currentPreviewPhoto = data_uri;
        currentAIMode = 'custom';
        isPreviewMode = true;
        
        // Show preview dengan retake/lanjutkan
        showPhotoPreview(data_uri, 'custom');
      });
    };
  }
  
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      document.getElementById('customPromptSection').style.display = 'none';
      document.getElementById('customPromptInput').value = '';
    };
  }
}

////////////////////////////////
// GIF Creation Functions
////////////////////////////////

// Setup GIF creator - REMOVED (GIF dibuat otomatis)

// Create GIF from current photo automatically (no extra spinner)
async function createCurrentPhotoGifAuto() {
  if (!currentPhotoForGif) {
    console.log("No current photo for GIF creation");
    return;
  }

  try {
    console.log("🎬 Auto-creating GIF for current photo...");
    
    const response = await fetch('/createGif', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: [currentPhotoForGif] })
    });

    const result = await response.json();

    if (result.status === 'ok') {
      // Update the auto GIF status to show success
      const autoGifStatus = document.getElementById('autoGifStatus');
      if (autoGifStatus) {
        autoGifStatus.innerHTML = `
          <div style="text-align: center;">
            <p style="color: #28a745; margin-bottom: 10px;">
              <i class="fas fa-check-circle"></i> GIF Before/After berhasil dibuat!
            </p>
            <img src="${result.gifUrl}" alt="Auto GIF" style="max-width: 300px; height: auto; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);" />
            <div style="margin-top: 10px;">
              <button onclick="showQRDownloadModal()" style="background: linear-gradient(145deg, #667eea, #764ba2); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px; margin: 3px;">
                <i class="fas fa-download"></i> Download GIF
              </button>
              <button onclick="shareImage('${result.gifUrl}')" style="background: linear-gradient(145deg, #ff6b6b, #ee5a52); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px; margin: 3px;">
                <i class="fas fa-share"></i> Share GIF
              </button>
            </div>
          </div>
        `;
      }
      
      // Add to photo history
      addToPhotoHistory(result.gifUrl, `GIF-${currentPhotoForGif.mode}`, new Date().toISOString());
      
      console.log("✅ Auto GIF creation completed:", result.gifUrl);
    } else {
      throw new Error(result.error || 'Failed to create GIF');
    }

  } catch (error) {
    console.error('Error creating auto GIF:', error);
    
    // Update status to show error
    const autoGifStatus = document.getElementById('autoGifStatus');
    if (autoGifStatus) {
      autoGifStatus.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i> 
        <span style="color: #dc3545;">GIF gagal dibuat: ${error.message}</span>
      `;
    }
  }
}

// Create GIF from current photo only (manual trigger)
async function createCurrentPhotoGif() {
  if (!currentPhotoForGif) {
    alert('Belum ada foto yang diproses untuk membuat GIF. Silakan ambil foto dengan AI Mode terlebih dahulu.');
    return;
  }

  document.getElementById("spinner").style.display = "flex";
  const progressInterval = simulateProgress();

  try {
    console.log("Creating GIF for current photo:", currentPhotoForGif);
    
    const response = await fetch('/createGif', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: [currentPhotoForGif] }) // Only current photo
    });

    const result = await response.json();

    clearInterval(progressInterval);
    completeProgress();

    if (result.status === 'ok') {
      // Show GIF result in the results section
      document.getElementById("results").innerHTML += `
        <div style="margin-top: 30px; padding: 20px; background: #f0f8ff; border-radius: 15px; border: 2px solid #e6f3ff;">
          <h4 style="color: #333; margin-bottom: 15px;">
            <i class="fas fa-film"></i> GIF Before/After Animation
          </h4>
          <img src="${result.gifUrl}" alt="Before/After GIF" style="max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" />
          <div style="margin-top: 15px;">
            <button onclick="showQRDownloadModal()" style="background: linear-gradient(145deg, #667eea, #764ba2); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
              <i class="fas fa-download"></i> Download GIF
            </button>
            <button onclick="shareImage('${result.gifUrl}')" style="background: linear-gradient(145deg, #ff6b6b, #ee5a52); color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; margin: 5px;">
              <i class="fas fa-share"></i> Share GIF
            </button>
          </div>
        </div>
      `;
      
      // Add to photo history
      addToPhotoHistory(result.gifUrl, `GIF-${currentPhotoForGif.mode}`, new Date().toISOString());
    } else {
      throw new Error(result.error || 'Failed to create GIF');
    }

  } catch (error) {
    console.error('Error creating current photo GIF:', error);
    clearInterval(progressInterval);
    alert('Gagal membuat GIF: ' + error.message);
  } finally {
    document.getElementById("spinner").style.display = "none";
  }
}

// REMOVED: createGifFromProcessedPhotos - GIF dibuat otomatis per foto

// Clear processed photos (utility function)
function clearProcessedPhotos() {
  processedPhotos = [];
}

////////////////////////////////
// QR Code Switch Functions
////////////////////////////////

// Switch between photo QR and GIF QR
function switchQR(type) {
  console.log('🔄 Switching QR to:', type);
  
  if (!currentQRData[type]) {
    console.warn('No QR data available for type:', type);
    return;
  }
  
  currentQRType = type;
  
  // Update button states
  document.getElementById('qrPhotoBtn').classList.toggle('active', type === 'photo');
  document.getElementById('qrGifBtn').classList.toggle('active', type === 'gif');
  
  // Update QR display
  updateQRDisplay();
}

// Update QR display based on current type
function updateQRDisplay() {
  const qrDisplay = document.getElementById('qrDisplay');
  const qrData = currentQRData[currentQRType];
  
  if (qrData) {
    qrDisplay.innerHTML = `<img src="${qrData}" alt="QR Code" style="border-radius: 10px; max-width: 150px; max-height: 150px;" />`;
  } else {
    qrDisplay.innerHTML = '<p style="color: #666; font-size: 12px;">QR tidak tersedia</p>';
  }
}

// Show QR viewer with both photo and GIF QR
function showQRViewer(photoQR, gifQR = null) {
  console.log('📱 Showing QR viewer:', { photoQR: !!photoQR, gifQR: !!gifQR });
  
  // Store QR data
  currentQRData.photo = photoQR;
  currentQRData.gif = gifQR;
  
  // Show/hide switch buttons based on available QR codes
  const switchButtons = document.getElementById('qrSwitchButtons');
  if (gifQR) {
    switchButtons.style.display = 'block';
    // Set default to photo QR
    currentQRType = 'photo';
    document.getElementById('qrPhotoBtn').classList.add('active');
    document.getElementById('qrGifBtn').classList.remove('active');
  } else {
    switchButtons.style.display = 'none';
    currentQRType = 'photo';
  }
  
  // Update display
  updateQRDisplay();
  
  // Show QR viewer
  document.getElementById('qrcode_viewer').style.display = 'flex';
}

# DigiOH AI Photobox

Aplikasi photobox berbasis AI yang menggunakan LightX Studio dan Google Gemini untuk menghasilkan gambar kreatif.

## Fitur Utama

- 📸 **Capture Foto**: Ambil foto menggunakan webcam
- 🤖 **AI Image Generation**: Buat avatar, cartoon, dan efek kreatif dengan LightX Studio
- 🧠 **Gemini AI Processing**: Proses gambar dengan Google Gemini AI
- 📁 **FTP Upload**: Upload gambar ke server FTP
- ⚙️ **Konfigurasi Lengkap**: Panel konfigurasi untuk semua layanan

## Fitur Konfigurasi

### 1. Konfigurasi LightX Studio
- **File**: `public/lightxconfig.html`
- **Fitur**:
  - API Key LightX
  - Prompt untuk berbagai style (avatar, cartoon, outfit, background)
  - URL gambar style untuk referensi
  - Konfigurasi untuk face swap dan virtual try-on

### 2. Konfigurasi Google Gemini
- **File**: `public/geminiconfig.html`
- **Fitur**:
  - API Key Gemini
  - Custom prompt untuk pemrosesan gambar
  - Link ke Google AI Studio untuk mendapatkan API key

### 3. Konfigurasi FTP Server
- **File**: `public/ftpconfig.html`
- **Fitur**:
  - Host dan port FTP
  - Username dan password
  - Opsi koneksi aman (FTPS/SFTP)
  - Path remote untuk upload

## Cara Penggunaan

1. **Jalankan Server**:
   ```bash
   npm start
   ```

2. **Buka Browser**: Kunjungi `http://localhost:3000`

3. **Konfigurasi**:
   - Klik tombol konfigurasi di halaman utama
   - Isi parameter yang diperlukan
   - Simpan konfigurasi

4. **Gunakan Photobox**:
   - Pilih style AI yang diinginkan
   - Ambil foto dengan webcam
   - Tunggu proses AI selesai
   - Download hasil atau scan QR code

## Struktur File

```
photobooth/
├── public/
│   ├── index.html          # Halaman utama photobox
│   ├── lightxconfig.html   # Konfigurasi LightX
│   ├── geminiconfig.html   # Konfigurasi Gemini
│   ├── ftpconfig.html      # Konfigurasi FTP
│   ├── script.js           # JavaScript utama
│   └── webcam.js           # Library webcam
├── server.js               # Server Express
├── LightXstudio.js         # Integrasi LightX
├── gemini.js               # Integrasi Gemini
├── ftpUtils.js             # Utilitas FTP
└── *.json                  # File konfigurasi
```

## Dependencies

- Express.js - Web server
- Multer - File upload handling
- Sharp - Image processing
- Basic-FTP - FTP client
- @google/genai - Google Gemini API
- QRCode - QR code generation

## Lisensi

Proyek ini dikembangkan untuk DigiOH.

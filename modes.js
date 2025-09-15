// AI Transformation Modes untuk DigiOH Photobooth
const modes = {
  renaissance: {
    name: 'Renaissance',
    emoji: '🎨',
    prompt: 'Ubah orang dalam foto ini menjadi seperti lukisan Renaissance klasik dengan gaya seni yang elegan dan detail yang halus.'
  },

  cartoon: {
    name: 'Cartoon',
    emoji: '😃',
    prompt: 'Transformasikan gambar ini menjadi kartun yang lucu dan sederhana. Gunakan garis minimal dan warna solid yang cerah.'
  },

  statue: {
    name: 'Statue',
    emoji: '🏛️',
    prompt: 'Buat orang dalam foto terlihat seperti patung marmer klasik, termasuk pakaian dan mata dengan tekstur batu yang realistis.'
  },

  banana: {
    name: 'Banana',
    emoji: '🍌',
    prompt: 'Buat orang dalam foto mengenakan kostum pisang yang lucu dan menggemaskan.'
  },

  '80s': {
    name: '80s',
    emoji: '✨',
    prompt: 'Buat orang dalam foto terlihat seperti foto yearbook tahun 1980an. Ubah gaya rambut dan pakaian sesuai era tersebut.'
  },

  '19century': {
    name: '19th Century',
    emoji: '🎩',
    prompt: 'Buat foto terlihat seperti daguerreotype abad ke-19. Ubah latar belakang agar sesuai periode dan tambahkan pakaian Victoria. Pertahankan perspektif yang sama.'
  },

  anime: {
    name: 'Anime',
    emoji: '🍣',
    prompt: 'Buat orang dalam foto terlihat seperti karakter anime photorealistic dengan fitur yang dilebih-lebihkan.'
  },

  psychedelic: {
    name: 'Psychedelic',
    emoji: '🌈',
    prompt: 'Buat ilustrasi poster bergaya psikedelik tahun 1960an yang digambar tangan berdasarkan gambar ini dengan warna-warna cerah dan bentuk bergelombang. Jangan tambahkan teks apapun.'
  },

  '8bit': {
    name: '8-bit',
    emoji: '🎮',
    prompt: 'Transformasikan gambar ini menjadi seni pixel minimalis 8-bit berwarna cerah yang lucu dalam grid 80x80 pixel.'
  },

  beard: {
    name: 'Big Beard',
    emoji: '🧔🏻',
    prompt: 'Buat orang dalam foto memiliki janggut yang sangat besar dan lebat.'
  },

  comic: {
    name: 'Comic Book',
    emoji: '💥',
    prompt: 'Transformasikan foto menjadi panel buku komik dengan garis tebal, titik halftone, dan balon ucapan.'
  },

  old: {
    name: 'Old',
    emoji: '👵🏻',
    prompt: 'Buat orang dalam foto terlihat sangat tua dengan kerutan dan rambut putih.'
  },

  custom: {
    name: 'Custom',
    emoji: '✏️',
    prompt: 'Custom prompt yang akan diisi user'
  }
};

module.exports = modes;


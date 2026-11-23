# Suara Bintang

Semua kalimat Bintang ada di `src/data/voiceLines.ts` dan direkam ke folder ini:
- `salam.mp3`: salam di halaman pertama
- `v-<kode>.mp3`: satu file per kalimat (kodenya dibuat otomatis dari teks kalimat)

Kalau sebuah kalimat belum punya rekaman, aplikasi memakai suara mesin (TTS) HP.

## Membuat ulang rekaman (butuh internet, `pip install edge-tts`)
    node scripts/make-voice.mjs              # rekam kalimat yang belum ada
    node scripts/make-voice.mjs --force      # rekam ulang semuanya
    node scripts/make-voice.mjs --voice id-ID-ArdiNeural --pitch +60Hz --rate +5%

Setelah menambah atau mengubah kalimat di `voiceLines.ts`, jalankan `node scripts/make-voice.mjs`
lalu `bash start.sh --build`.

Suara saat ini: Microsoft Edge TTS (id-ID-GadisNeural, nada dinaikkan) via `edge-tts`.
Sebelum rilis publik, ganti dengan rekaman suara asli atau TTS berlisensi.

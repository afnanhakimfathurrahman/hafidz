import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const AUDIO_HOSTS = /^https:\/\/(mirrors\.quranicaudio\.com|verses\.quran\.com)\/.*\.mp3$/i;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Workbox's terser step hangs on Android/Termux; elsewhere (e.g. Cloudflare CI) build normally
      mode: process.env.TERMUX_VERSION ? 'development' : 'production',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Petualangan Hafiz Kecil - Game Juz 30',
        short_name: 'Hafiz Kecil',
        description: 'Game edukasi gratis untuk membantu anak menghafal Juz 30 beserta artinya.',
        lang: 'id',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        background_color: '#E0F2FE',
        theme_color: '#3B82F6',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,mp3,m4a,ogg,wav}'],
        // Bintang's 340+ recorded lines (~7 MB) are cached on first play / via "Unduh" instead
        globIgnores: ['**/voice/v-*'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/voice/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'voice-cache',
              expiration: { maxEntries: 500 },
              cacheableResponse: { statuses: [200] },
              rangeRequests: true,
            },
          },
          {
            urlPattern: AUDIO_HOSTS,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-audio-cache',
              // Juz 30 = 564 ayahs per Qori; room for all 3 reciters
              expiration: { maxEntries: 1800, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              // iOS/Safari requests audio with Range headers
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
});

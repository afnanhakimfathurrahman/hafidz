# Technical Specification & System Design: "Petualangan Hafiz Kecil" (Juz 30 PWA Game)

## 1. Project Overview & Target Audience
* **Project Name:** Petualangan Hafiz Kecil (Juz 30 Interactive PWA Game)
* **Goal:** Gamified web application to help children (ages 5–12) memorize Surahs from Juz 30 along with their Indonesian translation, vocabulary, and audio pronunciation.
* **Target Platforms:** Cross-platform Web App / PWA (Android, iOS, iPadOS, Desktop). Must work fully offline after initial load.
* **Core Philosophy:** Low latency, high visual engagement, zero-latency feedback, child-safe (no ads/trackers), and strict adherence to SEO best practices for high organic discovery.

---

## 2. Tech Stack Architecture

| Layer | Technology Selected | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Vite + React (TypeScript)** | Extremely fast build, type safety, optimal DX for AI Agents. |
| **PWA Engine** | `vite-plugin-pwa` (Workbox) | Offline-first Service Worker, asset caching, runtime API caching. |
| **Styling** | **Tailwind CSS + Lucide Icons** | Utility-first, responsive, lightweight vector graphics. |
| **Animations** | **Framer Motion + Canvas-Confetti** | Fluid child-friendly motion (springs, bounces, reward visual effects). |
| **Sound & Audio** | **Howler.js / Web Audio API** | Zero-latency audio playback for games, sound effect layering. |
| **State & Storage** | **Zustand + `idb-keyval` (IndexedDB)** | Lightweight state management with persistent offline storage for progress. |
| **Quran Data Source** | **Al Quran Cloud REST API** (Fallback: Local JSON) | Teks Uthmani, Indonesian translations, high-quality Qori audio per ayah. |
| **SEO & Head Management** | **React Helmet Async + Schema.org (JSON-LD)** | SSR-like metadata injection, Open Graph, and Structured Data for educational apps. |
| **Hosting & Infra** | **Cloudflare Pages** | Unlimited bandwidth, fast Edge CDN in Indonesia, free SSL. |

---

## 3. SEO & Discoverability Architecture

To maximize organic search ranking for keywords like *"game hafalan juz 30"*, *"belajar juz 30 anak"*, *"tebak ayat juz 30 online"*:

### 3.1 Head Metadata & Dynamic Tag Management
* Static metadata defined in `index.html`.
* Dynamic page titles and descriptions via `react-helmet-async`:
  * Main Page: `Petualangan Hafiz Kecil - Game Edukasi Hafalan Juz 30 Anak`
  * Surah Level Page: `Belajar Surah {NamaSurah} (Juz 30) - Game Hafalan Anak`

### 3.2 Structured Data (Schema.org / JSON-LD)
Inject JSON-LD into `<head>`:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Petualangan Hafiz Kecil",
  "operatingSystem": "All",
  "applicationCategory": "EducationalApplication",
  "genre": "Educational Game",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "IDR"
  },
  "inLanguage": "id",
  "description": "Game edukasi interaktif PWA gratis untuk membantu anak-anak menghafal Al-Qur'an Juz 30 beserta artinya."
}
```

### 3.3 Static Crawlability & PWA Manifest
* **`sitemap.xml`**: Pre-generated routes for index and all 37 Surah levels (Surah 78 to 114).
* **`robots.txt`**: Allow all user agents.
* **`manifest.webmanifest`**:
  * `name`: "Petualangan Hafiz Kecil - Game Juz 30"
  * `short_name`: "HafizKecil"
  * `display`: "standalone"
  * `background_color`: "#4F46E5"
  * `theme_color`: "#3B82F6"

---

## 4. UI/UX Design System for Children

### 4.1 Visual Theme & Color Palette
* **Theme:** Bright, vibrant "Islamic Fantasy Island" with cute mascots (e.g., *Bintang Hafiz* or *Zayd the Explorer*).
* **Color Palette:**
  * **Primary (Playful Blue):** `#3B82F6` / `bg-blue-500`
  * **Secondary (Sunny Yellow):** `#FBBF24` / `bg-amber-400`
  * **Success/Reward (Bright Mint Green):** `#10B981` / `bg-emerald-500`
  * **Accent/Magic (Soft Purple):** `#8B5CF6` / `bg-purple-500`
  * **Background:** Playful warm gradient (`bg-gradient-to-b from-sky-200 via-blue-100 to-amber-50`).

### 4.2 Typography & Elements
* **Font Family:** `Fredoka` or `Nunito` (rounded, ultra-readable for kids) + `KFGQPC Uthman Taha Naskh` / `Amiri` for Arabic script.
* **Touch Targets:** Minimum **56px x 56px** for buttons to accommodate children's motor skills.
* **Micro-Interactions:**
  * Card tap: Squishy scale down (`scale-95`) + spring release.
  * Correct Answer: Floating stars, confetti explosion, cheerful audio chime ("Ding!").
  * Incorrect Answer: Gentle wobble animation, soft low chord (no harsh penalty sounds).

---

## 5. Core Game Modes & Mechanics

### Mode 1: Sambung Ayat (Ayah Puzzle)
1. Player listens to Audio Ayah $N$.
2. Displays 3–4 interactive cards showing Ayah $N+1$ fragments or full text in randomized order.
3. Player taps the correct next Ayah to advance.

### Mode 2: Jodohkan Makna (Memory Match Translation)
1. Grid of 4–6 cards (facedown or turned).
2. Pair Arabic Ayah audio/text with its Indonesian translation card.
3. Visual hint mechanism after 2 wrong attempts.

### Mode 3: Tebak Qori / Voice Quiz
1. Plays audio clip without showing text.
2. Player picks the correct Surah name from 4 visual island choices.

---

## 6. Data Architecture & External APIs

### 6.1 Al-Quran Cloud API Integration
* **Base Endpoint:** `https://api.alquran.cloud/v1`
* **Surah List (Juz 30):** `GET /juz/30/ar.alafasy`
* **Indonesian Translation:** `GET /juz/30/id.indonesian`
* **Qori Options for Kids:** 
  * Default Audio Edition: `ar.alafasy` or `ar.muhammadayyoub`
  * Audio Ayah URL Structure: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/{ayah_global_index}.mp3`

### 6.2 Data Model Schema (TypeScript Interfaces)

```typescript
// types/quran.ts

export interface Ayah {
  number: number;           // Global Ayah number
  numberInSurah: number;    // Number inside the Surah
  text: string;             // Arabic Uthmani text
  translation: string;      // Indonesian translation
  audioUrl: string;         // MP3 URL
}

export interface Surah {
  number: number;           // Surah Number (78 to 114)
  name: string;             // Arabic Name (e.g., "النبإ")
  englishName: string;      // Transliteration (e.g., "An-Naba")
  englishNameTranslation: string; // Indonesian meaning
  numberOfAyahs: number;
  ayahs: Ayah[];
}

export interface UserProgress {
  unlockedSurahs: number[]; // Array of unlocked Surah numbers
  starsEarned: Record<number, number>; // Surah Number -> Stars (1-3)
  totalCoins: number;
  badges: string[];
}
```

---

## 7. Progressive Web App (PWA) & Offline Strategy

### 7.1 Service Worker Caching (Workbox Configuration)
```javascript
// vite.config.ts (PWA Plugin excerpt)
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'robots.txt', 'sounds/*.mp3', 'images/*.svg'],
  workbox: {
    runtimeCaching: [
      {
        // Cache Quran API JSON responses
        urlPattern: /^https:\/\/api\.alquran\.cloud\/v1\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'quran-api-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 } // 30 Days
        }
      },
      {
        // Cache MP3 Audio Files
        urlPattern: /^https:\/\/cdn\.islamic\.network\/quran\/audio\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'quran-audio-cache',
          expiration: { maxEntries: 600, maxAgeSeconds: 60 * 24 * 60 * 60 } // 60 Days
        }
      }
    ]
  }
})
```

### 7.2 Storage Flow
* All user progress (`UserProgress`) is auto-synced to IndexedDB using `idb-keyval`.
* App works entirely without internet connection once a Surah's data and audio have been cached upon first play.

---

## 8. Directory & Project Structure

```text
hafiz-kecil-game/
├── public/
│   ├── audio/              # UI Sound effects (correct.mp3, click.mp3, fan-fare.mp3)
│   ├── images/             # Mascots, badges, map icons
│   ├── manifest.webmanifest
│   └── robots.txt
├── src/
│   ├── assets/             # SVGs and static assets
│   ├── components/
│   │   ├── common/         # Button, Modal, Card, Badge, ProgressBar
│   │   ├── game/           # AyahPuzzle, MatchingGame, AudioQuiz, RewardModal
│   │   ├── layout/         # Header, MapContainer, AudioPlayerBar
│   │   └── seo/            # HeadSEO.tsx (Helmet wrapper)
│   ├── hooks/              # useQuranData.ts, useAudioPlayer.ts, useProgress.ts
│   ├── pages/              # MapView.tsx, LevelView.tsx, AchievementsView.tsx
│   ├── store/              # useGameStore.ts (Zustand state management)
│   ├── services/           # api.ts (Al Quran Cloud fetcher & IndexedDB cache)
│   ├── utils/              # helpers.ts, constants.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 9. Implementation Roadmap & Agent Instructions

When handing this specification to an AI Agent (Claude Code / AI Studio / Cursor):

1. **Step 1: Bootstrap Project**
   * Execute `npm create vite@latest . -- --template react-ts`
   * Install dependencies: `tailwindcss`, `framer-motion`, `lucide-react`, `zustand`, `idb-keyval`, `howler`, `canvas-confetti`, `react-helmet-async`, `vite-plugin-pwa`.
2. **Step 2: Core Infrastructure**
   * Build `HeadSEO.tsx` with dynamic Open Graph & JSON-LD injection.
   * Configure Tailwind theme with playful colors and Google Fonts (`Fredoka`, `Amiri`).
   * Setup `api.ts` to fetch Juz 30 data from Al Quran Cloud with local storage fallback.
3. **Step 3: Game Mechanics & State**
   * Create `useGameStore` to manage levels, scores, active audio, and unlocked badges.
   * Develop sound synthesis / Howler manager for reward audio feedback.
4. **Step 4: UI Development (Kid-Friendly Screens)**
   * **Main Map Screen:** Scrollable island world showing Surah 114 (An-Nas) up to Surah 78 (An-Naba). Locked/Unlocked indicators.
   * **Gameplay Modal/Screen:** Cards with large text, sound playback triggers, animated star progress meter.
   * **Reward Popup:** Celebration screen with 1–3 stars, confetti, and button to progress to next Surah.
5. **Step 5: PWA Audit & Offline Polish**
   * Test Service Worker caching behavior.
   * Verify Lighthouse SEO & PWA audit score ($\ge 95$ target).
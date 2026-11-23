# Technical Specification & System Design: "Petualangan Hafiz Kecil" (Juz 30 PWA Game)

## 1. Project Overview & Target Audience
* **Project Name:** Petualangan Hafiz Kecil (Juz 30 Interactive PWA Game)
* **Goal:** Gamified web application to help children (ages 5–12) **actually memorize** (not just recognize) Surahs from Juz 30, understand their meaning in Indonesian, and learn key vocabulary, guided by correct audio recitation.
* **Target Platforms:** Cross-platform Web App / PWA (Android, iOS, iPadOS, Desktop). Must work fully offline for any Surah the child has downloaded.
* **Core Philosophy:** Audio-first, zero-latency feedback, short sessions, praise effort over speed, child-safe (no ads, trackers, accounts, chat, or external links without a parent gate), respectful of the Qur'an (adab), and SEO-friendly for organic discovery.

### 1.1 Age Bands (Selected on First Launch, Changeable in Parent Area)
The 5–12 range is too wide for a single UX. Most 5–7 year olds cannot read Arabic or Indonesian fluently yet.

| Band | Name | Ages | UX Rules |
| :--- | :--- | :--- | :--- |
| **A** | **Pemula (Little Explorer)** | 5–7 | Audio-first. Every instruction is spoken by the mascot. Icons over text. No timers. Max 3 answer choices. Arabic shown large; translation is read aloud, not required reading. |
| **B** | **Penjelajah (Explorer)** | 8–12 | Reading expected. 4 choices, optional "Tantangan Waktu" (timed challenge), word-level puzzles, vocabulary mode, similar-ayah distractors. |

### 1.2 Pedagogy: How Kids Actually Memorize
The games must follow the traditional *talaqqi → takrir → murojaah* cycle. Multiple-choice games alone build recognition, not memorization.
1. **Dengar (Listen):** Hear the ayah from a clear, slow Qori, with word-by-word highlighting.
2. **Ulangi (Repeat):** Child recites along, then alone. Chunk long ayahs into 2–4 word segments.
3. **Uji (Test):** Game modes check recall with progressively less help.
4. **Murojaah (Review):** Spaced repetition brings back learned Surahs (1 day → 3 days → 7 days → 14 days → 30 days).

---

## 2. Tech Stack Architecture

| Layer | Technology Selected | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Vite + React (TypeScript)** | Extremely fast build, type safety, optimal DX for AI Agents. |
| **PWA Engine** | `vite-plugin-pwa` (Workbox) | Offline-first Service Worker, asset caching, runtime API caching. |
| **Styling** | **Tailwind CSS + Lucide Icons** | Utility-first, responsive, lightweight vector graphics. |
| **Animations** | **Framer Motion + Canvas-Confetti** | Fluid child-friendly motion (springs, bounces, reward visual effects). |
| **Sound & Audio** | **Howler.js / Web Audio API** | Zero-latency audio playback, sound effect layering, playback-rate control (0.75x for learning). |
| **Voice Recording** | **MediaRecorder API** (local only) | "Rekam Suaraku": child records and replays their own recitation. Never uploaded. |
| **State & Storage** | **Zustand + `idb-keyval` (IndexedDB)** | Lightweight state management with persistent offline storage for progress. |
| **Quran Data Source** | **Bundled local JSON** (Primary) + **Al Quran Cloud REST API** (refresh) | Juz 30 text + translation is small (~200 KB); bundle it so the app works on first launch offline. Audio streamed and cached. |
| **SEO & Head Management** | **React Helmet Async + Schema.org (JSON-LD)** | Metadata injection, Open Graph, and Structured Data for educational apps. |
| **Hosting & Infra** | **Cloudflare Pages** | Unlimited bandwidth, fast Edge CDN in Indonesia, free SSL. |

---

## 3. SEO & Discoverability Architecture

To maximize organic search ranking for keywords like *"game hafalan juz 30"*, *"belajar juz 30 anak"*, *"tebak ayat juz 30 online"*:

### 3.1 Head Metadata & Dynamic Tag Management
* Static metadata defined in `index.html`.
* Dynamic page titles and descriptions via `react-helmet-async`:
  * Main Page: `Petualangan Hafiz Kecil - Game Edukasi Hafalan Juz 30 Anak`
  * Surah Level Page: `Belajar Surah {NamaSurah} (Juz 30) - Game Hafalan Anak`
* **Note:** Since this is an SPA, pre-render the 38 public routes (index + 37 Surahs) at build time (e.g., `vite-plugin-prerender` or a static Surah info page per route) so crawlers see real content.
* SEO targets **parents and teachers** (landing/Surah info pages). Game screens themselves stay text-light for kids.

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
  "audience": {
    "@type": "EducationalAudience",
    "educationalRole": "student",
    "suggestedMinAge": 5,
    "suggestedMaxAge": 12
  },
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
  * `short_name`: "Hafiz Kecil"
  * `display`: "standalone"
  * `orientation`: "any"
  * `background_color`: "#E0F2FE"
  * `theme_color`: "#3B82F6"

---

## 4. UI/UX Design System for Children

### 4.1 Visual Theme & World
* **Theme:** "Kepulauan Juz 30" — a bright archipelago (fits Indonesian kids). **Each Surah is its own island, themed on the Surah's content**, so the map itself teaches meaning:

| Surah | Island Theme Idea |
| :--- | :--- |
| 114 An-Nas / 113 Al-Falaq | Safe lighthouse island; dawn-break beach |
| 112 Al-Ikhlas | Single tall shining mountain ("Allah Maha Esa") |
| 111 Al-Lahab | Volcano island (seen from a safe distance, not scary) |
| 110 An-Nasr | Gate with crowds of people welcoming |
| 108 Al-Kautsar | River & waterfall island |
| 106 Quraisy | Caravan of camels, winter/summer paths |
| 105 Al-Fil | Elephant island with flocks of birds (Ababil) |
| 103 Al-'Asr | Giant sundial / clock tower |
| 100 Al-'Adiyat | Running horses island |
| 95 At-Tin | Fig & olive orchard |
| 93 Ad-Duha / 92 Al-Lail / 91 Asy-Syams | Sunrise / night sky / sun-and-moon islands |
| 89 Al-Fajr | Dawn island |
| 85 Al-Buruj / 86 At-Tariq | Star constellation island |
| 78 An-Naba | Final big island: mountains, rain clouds, gardens (the "grand finale") |

* **Mascot:** One mascot with a clear personality — **"Bintang"**, a friendly little star companion (or a cat/bird). Use a non-human mascot to avoid depicting Prophets, Companions, or angels. Bintang speaks every instruction (Band A), cheers, and gives hints.
* **Color Palette:**
  * **Primary (Playful Blue):** `#3B82F6` / `bg-blue-500`
  * **Secondary (Sunny Yellow):** `#FBBF24` / `bg-amber-400`
  * **Success/Reward (Bright Mint Green):** `#10B981` / `bg-emerald-500`
  * **Accent (Soft Purple):** `#8B5CF6` / `bg-purple-500`
  * **Background:** Playful warm gradient (`bg-gradient-to-b from-sky-200 via-blue-100 to-amber-50`).
* **Contrast:** Arabic text always sits on a calm, solid light panel (never on busy gradients or moving backgrounds).

### 4.2 Typography & Elements
* **Font Family:** `Fredoka` or `Nunito` (rounded, ultra-readable for kids) + `KFGQPC Uthman Taha Naskh` / `Amiri Quran` for Arabic script with full harakat.
* **Arabic Size:** Minimum 32px (Band A: 40px+). Generous line-height so harakat never collide.
* **Touch Targets:** Minimum **56px x 56px** for buttons to accommodate children's motor skills; 12px+ spacing between targets.
* **Navigation:** Max 2 taps deep from map to gameplay. Always-visible big "Home" and "Dengar Lagi" (replay audio) buttons.
* **Micro-Interactions:**
  * Card tap: Squishy scale down (`scale-95`) + spring release.
  * Correct Answer: Floating stars, cheerful voice line from Bintang ("MasyaAllah, hebat!", "Barakallah!"), soft non-musical chime.
  * Incorrect Answer: Card gently glows, Bintang says "Hampir! Yuk, dengar lagi" and **replays the audio**. No lives lost, no red X, no harsh sounds.
* **Encouraging Voice Lines (rotate to avoid repetition):** "MasyaAllah!", "Hebat sekali!", "Barakallah!", "Kamu makin pintar!", "Ayo coba lagi, kamu pasti bisa!"

### 4.3 Adab & Content Guidelines (Mandatory)
Parents and ustadz/ustadzah will judge the app on this first.
* **Respect the Mushaf text:** Qur'anic text is never thrown, exploded, shaken, flipped upside-down, stepped on, or covered by confetti. Wrong-answer animations apply to the **card frame**, not the Arabic text. Celebrations happen *around* the text, not on it.
* **No musical instruments** in SFX or background by default (many Muslim families avoid music). Use voice, nature sounds, and soft chimes/bells. Provide a "Suara Efek" toggle in the Parent Area.
* **Audio ducking:** All SFX and background ambience are muted while a Qur'an recitation is playing.
* **Correct Qur'an text:** Use the Uthmani edition (`quran-uthmani`) and the Kemenag Indonesian translation (`id.indonesian`). Never paraphrase the Arabic. Optional "Makna untuk Anak" (simplified meaning) must be clearly labeled as an explanation, not a translation, and be reviewed by a qualified ustadz.
* **No "magic" (sihir) framing:** the world is about adventure, light, and nature, not wizards or spells.
* **Avoid fear:** Surahs about the Day of Judgment or punishment (e.g., Al-Lahab, Al-Humazah, Al-Ghasyiyah) are illustrated gently. No scary imagery.
* **Content review:** All Arabic text, audio mapping, and "Makna untuk Anak" text must be verified by a qualified teacher before release.

---

## 5. Core Game Modes & Mechanics

Each Surah island has a fixed learning path: **Dengar & Ulangi → Sambung Ayat → Jodohkan Makna → Tebak Surah (review)**. Every activity is 1–3 minutes.

### Mode 0: Dengar & Ulangi (Listen & Repeat) — the Core Memorization Mode
1. Qori recites one ayah (or a 2–4 word chunk for long ayahs) with **word-by-word highlighting** (karaoke style).
2. Repeats 3x by default (configurable 1–5x). Speed control: 0.75x / 1x.
3. "Giliranmu!" (Your turn): child recites along, then recites alone with a pause.
4. **Gradual Hide (Hilang Perlahan):** each round fades out more words (full text → first letters only → blank) so the child recalls from memory.
5. **Rekam Suaraku:** optional record & replay of their own recitation (stored locally, auto-deleted after 7 days). Kids love hearing themselves; parents can listen in the Parent Area.
6. No automatic grading of recitation (Arabic speech recognition is not reliable enough for kids). The child (or parent) taps "Sudah Hafal!" to continue.

### Mode 1: Sambung Ayat (Ayah Puzzle)
1. Player listens to Ayah $N$ (text optionally shown).
2. **Band A:** pick the correct Ayah $N+1$ from 3 cards; each card has a 🔊 button so non-readers can listen to options.
3. **Band B:** drag-and-drop word blocks to build Ayah $N+1$ in order (great for long ayahs in An-Naba, Abasa, etc.).
4. **Distractors:** For short Surahs (e.g., Al-Kautsar has only 3 ayahs) borrow ayahs from neighboring Surahs. Band B uses similar-sounding ayahs (*mutasyabihat*) as harder distractors.
5. **Bismillah handling:** Strip the Basmalah prefix from Ayah 1 text in API data (Al Quran Cloud includes it in the first ayah of each Surah) so it doesn't make the puzzle confusing.

### Mode 2: Jodohkan Makna (Memory Match)
1. Grid of 4 cards (Band A) or 6–8 cards (Band B), face-down flip game.
2. **Band A:** match a **key word** (Arabic + audio) to a **picture**, e.g., الْفِيلِ ↔ 🐘 gajah, الشَّمْسِ ↔ ☀️ matahari, التِّينِ ↔ fig, الْخَيْلِ / الْعَادِيَاتِ ↔ 🐎 horse. Short ayah-to-translation matching is too much reading for 5–7 year olds.
3. **Band B:** match a short ayah to its Indonesian translation.
4. Hint after 2 wrong attempts: the correct pair briefly sparkles.

### Mode 3: Tebak Surah (Guess the Surah) — Review Mode
*(Renamed from "Tebak Qori": the player guesses the Surah, not the reciter.)*
1. Plays an ayah audio clip without showing text.
2. Player picks the correct Surah from 3–4 **island pictures** with names (big icons for Band A).
3. Pulls from all Surahs the child has learned, so it doubles as **murojaah** (spaced review).

### 5.1 Session Design
* **Daily session goal:** ~10 minutes ("Misi Harian": 1 new activity + 1 review). Bintang gently suggests a break after 15 minutes.
* **No timers or game over in Band A.** Band B "Tantangan Waktu" is opt-in.
* **First-launch experience:** Bintang introduces itself, the child picks a name + avatar color (no real name or photo needed), then starts directly on **An-Nas** with a guided tutorial of Mode 0. First reward within 60 seconds.

---

## 6. Engagement & Reward Loop

### 6.1 Progression (Open, Not Strictly Locked)
* The map is ordered An-Nas (114) → An-Naba (78), the traditional order of memorization.
* **Don't hard-lock Surahs:** many kids already memorized some Surahs at school/TPA, and schools use different orders. All islands are visitable; the *suggested next* island glows and Bintang points to it. Stars show mastery.
* **Stars per Surah (1–3):**
  * ⭐ Completed Dengar & Ulangi
  * ⭐⭐ Passed Sambung Ayat + Jodohkan Makna
  * ⭐⭐⭐ Passed Murojaah review after 3+ days (rewards real retention, not one-time play)
* Stars never decrease. A Surah that is "due for review" gets a small "rindu" (missing you) bubble instead of a penalty.

### 6.2 Rewards Kids Care About
* **Island restoration:** Each finished Surah makes its island bloom (trees grow, animals appear, lights turn on). The map visibly becomes alive over time; this is the main long-term motivator.
* **Koin Bintang:** earned from activities, spent in a **cosmetic shop**: mascot outfits (peci, scarf), boat for sailing between islands, island decorations. No loot boxes, no random rewards, no real money purchases.
* **Badges (Lencana):** e.g., "Penjaga Pagi" (played after Subuh), "Hafal 3 Qul" (Al-Ikhlas, Al-Falaq, An-Nas), "Sahabat Gajah" (Al-Fil), "10 Surah Hafal", "Murojaah 7 Hari".
* **Story Cards (Kisah):** short illustrated & narrated story unlocked per Surah when relevant (Pasukan Gajah for Al-Fil, Quraisy caravans, Abu Lahab, etc.). Connects memorization to meaning.
* **Gentle streak ("Taman Harian"):** a plant that grows on days the child practices. Missing a day doesn't kill it; it just pauses. No guilt mechanics.
* **Sertifikat Hafalan:** printable/shareable certificate (generated locally as PNG/PDF) when a Surah gets 3 stars and when milestones are reached. Great for parents to share with family and TPA teachers (organic growth).

### 6.3 What We Deliberately Avoid
Lives/hearts, countdown pressure for young kids, leaderboards against strangers, ads, push notifications aimed at kids, dark patterns ("your streak will die!"), chat, and user-generated content.

---

## 7. Parent & Teacher Area

* **Parent Gate:** simple adult check (e.g., "Tulis angka: tiga ratus dua puluh lima" → 325) before entering settings or opening any external link.
* **Settings:** age band, Qori choice, repeat count, playback speed, SFX on/off, daily time limit, translation on/off.
* **Progress Report:** Surahs memorized, stars, time spent per day, Surahs due for murojaah, listen to child's recordings.
* **Multiple child profiles** on one device (siblings), stored locally. No login required.
* **Data Export/Import:** JSON backup of progress (for device changes), since there is no account.

---

## 8. Data Architecture & External APIs

### 8.1 Al-Quran Cloud API Integration
* **Base Endpoint:** `https://api.alquran.cloud/v1`
* **Juz 30 text (Uthmani):** `GET /juz/30/quran-uthmani`
* **Indonesian Translation (Kemenag):** `GET /juz/30/id.indonesian`
* **Audio edition:** `GET /juz/30/ar.alafasy` (returns per-ayah audio URLs)
* **Qori Options for Kids** (clear, measured pace is best for learning):
  * Default: `ar.husary` (Mahmoud Khalil Al-Husary — very clear, slow, standard for teaching)
  * Alternatives: `ar.minshawi`, `ar.alafasy` (popular, kids often recognize it)
* **Audio Ayah URL Structure:** `https://cdn.islamic.network/quran/audio/128/{edition}/{ayah_global_index}.mp3`
* **Word-by-word timings/data** (for karaoke highlighting and word puzzles): use a source with word segments and timings (e.g., Quran.com API v4 `/verses/by_chapter/{id}?words=true` + recitation segments), pre-processed at build time into local JSON.
* **Build-time snapshot:** fetch all of the above once at build time into `src/data/juz30.json` so text never depends on the network at runtime.

### 8.2 Data Model Schema (TypeScript Interfaces)

```typescript
// types/quran.ts

export interface Word {
  position: number;         // 1-based index in ayah
  text: string;             // Arabic word (Uthmani)
  translation?: string;     // Indonesian word meaning (vocabulary)
  imageKey?: string;        // e.g. "elephant" for picture-matching in Band A
  startMs?: number;         // timing for highlight (per Qori)
  endMs?: number;
}

export interface Ayah {
  number: number;           // Global Ayah number
  numberInSurah: number;    // Number inside the Surah
  text: string;             // Arabic Uthmani text (Basmalah stripped)
  translation: string;      // Indonesian translation (Kemenag)
  kidsMeaning?: string;     // Optional reviewed simplified explanation
  words: Word[];
  audioUrl: string;         // MP3 URL for selected Qori
}

export interface Surah {
  number: number;           // Surah Number (78 to 114)
  name: string;             // Arabic Name (e.g., "النبإ")
  latinName: string;        // Indonesian transliteration (e.g., "An-Naba'")
  meaning: string;          // Indonesian meaning (e.g., "Berita Besar")
  numberOfAyahs: number;
  islandTheme: string;      // Key for island artwork
  ayahs: Ayah[];
}

export type AgeBand = 'A' | 'B';

export interface AyahMastery {
  repetitions: number;      // successful recalls
  nextReviewAt: number;     // timestamp (spaced repetition)
  intervalDays: number;     // 1, 3, 7, 14, 30
}

export interface ChildProfile {
  id: string;
  nickname: string;         // no real name required
  avatar: string;
  ageBand: AgeBand;
  createdAt: number;
}

export interface UserProgress {
  profileId: string;
  starsEarned: Record<number, 0 | 1 | 2 | 3>;       // Surah Number -> Stars
  ayahMastery: Record<number, AyahMastery>;         // Global ayah number -> mastery
  completedActivities: Record<number, string[]>;    // Surah -> activity ids
  totalCoins: number;
  ownedItems: string[];     // cosmetic shop items
  badges: string[];
  dailyGarden: { lastPlayedDate: string; daysGrown: number };
  minutesPlayedToday: number;
}
```

---

## 9. Progressive Web App (PWA) & Offline Strategy

### 9.1 Service Worker Caching (Workbox Configuration)
```javascript
// vite.config.ts (PWA Plugin excerpt)
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'robots.txt', 'audio/*.mp3', 'images/*.svg', 'voice/*.mp3'],
  workbox: {
    runtimeCaching: [
      {
        // Cache Quran API JSON responses (refresh only; text is bundled)
        urlPattern: /^https:\/\/api\.alquran\.cloud\/v1\/.*/i,
        handler: 'StaleWhileRevalidate',
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
          // Juz 30 = 564 ayahs per Qori; allow 2 Qori
          expiration: { maxEntries: 1200, maxAgeSeconds: 180 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
          // Required for iOS/Safari, which requests audio with Range headers
          rangeRequests: true
        }
      }
    ]
  }
})
```

### 9.2 Storage & Offline Flow
* Quran text, translation, and word data are **bundled**; the app is usable offline from first launch (except recitation audio).
* **"Unduh Pulau" (Download Island) button** per Surah, plus "Unduh Semua Juz 30" in the Parent Area (~25–35 MB per Qori at 64–128 kbps), with a progress bar. Islands that are available offline show a small ✓ badge.
* Call `navigator.storage.persist()` so the browser doesn't evict cached audio.
* All `UserProgress` is auto-synced to IndexedDB using `idb-keyval`.
* **iOS audio unlock:** browsers block autoplay; the first screen needs a big "Ayo Mulai!" tap that unlocks the audio context.

---

## 10. Directory & Project Structure

```text
hafiz-kecil-game/
├── public/
│   ├── audio/              # UI SFX (non-musical): correct.mp3, tap.mp3, bloom.mp3
│   ├── voice/              # Mascot voice lines (Indonesian): instructions & praise
│   ├── images/             # Mascot, islands, badges, vocabulary pictures
│   ├── manifest.webmanifest
│   └── robots.txt
├── scripts/
│   └── build-quran-data.ts # Build-time fetch → src/data/juz30.json
├── src/
│   ├── assets/             # SVGs and static assets
│   ├── data/               # juz30.json, islands.ts, vocabulary.ts, stories.ts
│   ├── components/
│   │   ├── common/         # Button, Modal, Card, Badge, ProgressBar, ParentGate
│   │   ├── game/           # ListenRepeat, AyahPuzzle, WordBuilder, MatchingGame, SurahQuiz, RewardModal
│   │   ├── mascot/         # Bintang.tsx (animations + voice lines)
│   │   ├── layout/         # Header, MapContainer, AudioPlayerBar
│   │   └── seo/            # HeadSEO.tsx (Helmet wrapper)
│   ├── hooks/              # useQuranData.ts, useAudioPlayer.ts, useProgress.ts, useRecorder.ts, useReviewQueue.ts
│   ├── pages/              # Onboarding.tsx, MapView.tsx, IslandView.tsx, ShopView.tsx, AchievementsView.tsx, ParentArea.tsx
│   ├── store/              # useGameStore.ts (Zustand state management)
│   ├── services/           # api.ts, audioCache.ts, spacedRepetition.ts, certificate.ts
│   ├── utils/              # helpers.ts, constants.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 11. Implementation Roadmap & Agent Instructions

When handing this specification to an AI Agent (Claude Code / AI Studio / Cursor):

1. **Step 1: Bootstrap Project**
   * Execute `npm create vite@latest . -- --template react-ts`
   * Install dependencies: `tailwindcss`, `framer-motion`, `lucide-react`, `zustand`, `idb-keyval`, `howler`, `canvas-confetti`, `react-helmet-async`, `vite-plugin-pwa`.
2. **Step 2: Data & Core Infrastructure**
   * Write `scripts/build-quran-data.ts` to produce `juz30.json` (Uthmani text, Kemenag translation, word data, Basmalah stripped from Ayah 1).
   * Build `HeadSEO.tsx` with dynamic Open Graph & JSON-LD injection; pre-render Surah routes.
   * Configure Tailwind theme with playful colors and Google Fonts (`Fredoka`, `Amiri Quran`).
3. **Step 3: Audio & Learning Engine**
   * Howler audio manager: Qori playback, speed control, word highlighting, SFX ducking during recitation.
   * `spacedRepetition.ts` review scheduler and `useReviewQueue`.
4. **Step 4: MVP Gameplay (ship this first, test with real kids)**
   * Onboarding (age band, nickname, audio unlock tap) + Bintang mascot voice lines.
   * **Mode 0 Dengar & Ulangi** and **Mode 1 Sambung Ayat** for the last 10 Surahs (An-Nas → Al-Fil).
   * Map with island bloom effect, stars, and reward popup.
5. **Step 5: Engagement Layer**
   * Mode 2 Jodohkan Makna (picture vocabulary), Mode 3 Tebak Surah, coins & cosmetic shop, badges, story cards, Taman Harian, certificate.
6. **Step 6: Parent Area**
   * Parent gate, settings, progress report, profiles, backup export/import.
7. **Step 7: Content Review, PWA Audit & Offline Polish**
   * Ustadz review of all Qur'anic text/audio mapping and kids' explanations.
   * Test offline download, iOS Safari audio (Range requests), storage persistence.
   * **Playtest with 5+ children from each age band**; watch where they get stuck without helping. Fix confusion before adding features.
   * Verify Lighthouse SEO & PWA audit score ($\ge 95$ target) and accessibility (contrast, tap target size).

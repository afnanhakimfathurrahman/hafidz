// Text-to-speech mode can say anything, so Bintang talks to the child by name and
// mentions their progress (stars, coins, garden, islands). Recorded clips can't do
// this, so it only runs when the parent picked "Suara HP".
import { L, voiceKey } from '../data/voiceLines';
import { PRAISE, RETRY } from './lines';
import { SURAHS } from '../data/quran';
import { islandOf } from '../data/islands';
import { useGameStore, isDue } from '../store/useGameStore';

interface Ctx {
  name: string;
  stars: number;
  coins: number;
  garden: number;
  learned: number;
  due: string | undefined; // island waiting for murojaah
  next: string | undefined; // suggested island
  hour: number;
}

function context(): Ctx | null {
  const s = useGameStore.getState();
  const profile = s.profiles.find((p) => p.id === s.activeId);
  const p = s.activeId ? s.progress[s.activeId] : undefined;
  if (!profile || !p) return null;
  const due = SURAHS.find((x) => isDue(p.review[x.number]));
  const next = SURAHS.find((x) => (p.stars[x.number] ?? 0) < 2);
  return {
    name: profile.nickname,
    stars: Object.values(p.stars).reduce((a, b) => a + b, 0),
    coins: p.coins,
    garden: p.garden.days,
    learned: SURAHS.filter((x) => (p.stars[x.number] ?? 0) >= 1).length,
    due: due && islandOf(due.number).latin,
    next: next && islandOf(next.number).latin,
    hour: new Date().getHours(),
  };
}

const any = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const sometimes = () => Math.random() < 0.5;

const timeOfDay = (h: number) => (h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam');

// Fixed sentences → personalized variants
const TEMPLATES: Record<string, (c: Ctx) => string[]> = {
  [L.hello]: (c) => [
    `Assalamu'alaikum, ${c.name}! Selamat ${timeOfDay(c.hour)}!` +
      (c.hour < 7 ? ' MasyaAllah, kamu belajar pagi sekali!' : c.hour >= 20 ? ' Sebentar saja ya, nanti jangan tidur terlalu malam.' : ''),
    `Assalamu'alaikum, ${c.name}! Aku senang kamu datang lagi.`,
  ],
  [L.voiceTest]: (c) => [`Halo ${c.name}! Aku Bintang. Ayo belajar bersama!`],
  [L.missYou]: (c) => [
    c.due ? `${c.name}, pulau ${c.due} rindu kamu. Ayo murojaah!` : `${c.name}, ada pulau yang rindu kamu. Ayo murojaah!`,
  ],
  [L.garden]: (c) => [
    c.garden > 0
      ? `Tamanmu sudah tumbuh ${c.garden} hari, ${c.name}! Belajar setiap hari supaya makin rindang ya.`
      : `${c.name}, ayo belajar hari ini supaya tamanmu mulai tumbuh!`,
  ],
  [L.listenFirst]: (c) => [`${c.name}, ayo dengarkan baik-baik ya!`, 'Ayo dengarkan baik-baik ya!'],
  [L.together]: (c) => [`Sekarang giliranmu, ${c.name}! Baca bersama-sama.`],
  [L.alone]: (c) => [`Sekarang coba baca sendiri. ${c.name} pasti bisa!`, `Coba baca sendiri ya, ${c.name}. Bintang mendengarkan!`],
  [L.myVoice]: (c) => [`MasyaAllah ${c.name}, ayo dengarkan suaramu!`],
  [L.almost]: (c) => [`Hampir berhasil, ${c.name}! Yuk dengarkan lagi lalu coba sekali lagi.`],
  [L.newStar]: (c) => [`Kamu dapat bintang baru! Sekarang bintangmu ada ${c.stars}.`, `Bintang baru untuk ${c.name}! Totalnya sekarang ${c.stars}.`],
  [L.allDone]: (c) => [`MasyaAllah, hebat sekali, ${c.name}!`],
  [L.partDone]: (c) => [`Bagian ini selesai, ${c.name}! Koinmu sekarang ${c.coins}.`],
  [L.reviewDone]: (c) => [`Murojaah berhasil! Hafalanmu makin kuat, ${c.name}.`],
  [L.sambungDone]: (c) => [`Sambung Ayat selesai! Hebat, ${c.name}!`],
  [L.jodohDone]: (c) => [`Semua cocok! ${c.name} sudah tahu artinya.`],
  [L.takeBreak]: (c) => [`MasyaAllah ${c.name}, kamu sudah belajar lama! Yuk istirahat sebentar, minum air, dan gerakkan badanmu.`],
  [L.dayLimit]: (c) => [`Waktunya istirahat untuk hari ini, ${c.name}. Sampai jumpa besok ya!`],
  [L.who]: () => ['Bismillah! Siapa yang mau belajar hari ini?'],
};

// Sentences built from a variable part, matched by pattern
const PATTERNS: [RegExp, (c: Ctx, m: RegExpMatchArray) => string[]][] = [
  [
    /^Ayo berlayar ke pulau (.+)!$/,
    (c, m) => [
      `${c.name}, ayo berlayar ke pulau ${m[1]}!`,
      c.learned > 0
        ? `Kamu sudah menjelajah ${c.learned} pulau, ${c.name}. Berikutnya pulau ${m[1]}!`
        : `${c.name}, petualangan kita dimulai dari pulau ${m[1]}!`,
    ],
  ],
  [/^Alhamdulillah! Kamu dapat lencana baru: (.+)!$/, (c, m) => [`Alhamdulillah, ${c.name}! Kamu dapat lencana baru: ${m[1]}!`]],
  [/^Asyik! Kamu dapat (.+)!$/, (c, m) => [`Asyik! ${c.name} dapat ${m[1]}! Koinmu sisa ${c.coins}.`]],
  [
    /^Benar (\d+) dari (\d+)!$/,
    (c, m) => [
      Number(m[1]) === Number(m[2])
        ? `MasyaAllah ${c.name}, semuanya benar! ${m[1]} dari ${m[2]}!`
        : `Benar ${m[1]} dari ${m[2]}! Terus berlatih ya, ${c.name}.`,
    ],
  ],
];

const PRAISE_KEYS = new Set(PRAISE.map(voiceKey));
const RETRY_KEYS = new Set(RETRY.map(voiceKey));

/** The sentence Bintang actually speaks in TTS mode. */
export function personalize(text: string): string {
  const c = context();
  if (!c) return text;
  const key = voiceKey(text);
  const t = TEMPLATES[key];
  if (t) return any(t(c));
  for (const [re, f] of PATTERNS) {
    const m = key.match(re);
    if (m) return any(f(c, m));
  }
  if (PRAISE_KEYS.has(key)) return sometimes() ? `${key.replace(/!$/, '')}, ${c.name}!` : key;
  if (RETRY_KEYS.has(key)) return sometimes() ? `${c.name}, ${key.charAt(0).toLowerCase()}${key.slice(1)}` : key;
  return text;
}

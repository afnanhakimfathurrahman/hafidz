// Every fixed sentence Bintang says. scripts/make-voice.mjs records each one to
// public/voice/v-<hash>.mp3; say() plays the recording when the text matches.
// Imports use .ts extensions so the Node generator script can load this file too.
import { ISLANDS } from './islands.ts';
import { VOCAB } from './vocab.ts';
import { BADGES } from './badges.ts';
import { SHOP } from './shop.ts';
import { PRAISE, RETRY } from '../services/lines.ts';

export const WELCOME =
  "Assalamu'alaikum! Selamat datang di Petualangan Hafiz Kecil. Aku Bintang. Ayo ketuk tombol hijau, Ayo Mulai!";

export const L = {
  // Onboarding
  who: 'Bismillah! Siapa yang mau belajar hari ini?',
  askName: "Assalamu'alaikum! Aku Bintang. Siapa namamu?",
  askAge: 'Berapa umurmu?',
  // Dengar & Ulangi
  listenFirst: 'Ayo dengarkan baik-baik ya!',
  listenAgain: 'Dengarkan lagi ya!',
  together: 'Sekarang giliranmu! Baca bersama-sama.',
  alone: 'Sekarang coba baca sendiri. Kamu pasti bisa!',
  helpListen: 'Dengarkan lagi, lalu ikuti ya!',
  helpAlone: 'Sekarang coba baca sendiri!',
  recording: 'Merekam. Ayo baca! Ketuk Stop kalau sudah.',
  myVoice: 'MasyaAllah, ayo dengarkan suaramu!',
  // Sambung Ayat
  sambungBuild: 'Dengarkan, lalu susun kata-kata ayat berikutnya!',
  sambungPick: 'Dengarkan, lalu pilih ayat berikutnya!',
  sambungNext: 'Ayat apa selanjutnya?',
  almost: 'Hampir berhasil! Yuk dengarkan lagi lalu coba sekali lagi.',
  // Jodohkan Makna
  jodohStart: 'Balik kartunya, lalu cari pasangannya!',
  jodohHint: 'Lihat kartu yang berkilau!',
  // Tebak Surah
  tebakStart: 'Dengarkan, ini surah apa?',
  // Rewards
  partDone: 'Bagian ini selesai!',
  allDone: 'MasyaAllah, hebat!',
  reviewDone: 'Murojaah berhasil!',
  sambungDone: 'Sambung Ayat selesai!',
  jodohDone: 'Semua cocok!',
  newStar: 'Kamu dapat bintang baru!',
  // Island & map
  locked: 'Selesaikan Dengar & Ulangi dulu ya!',
  notDue: 'Belum waktunya murojaah. Kembali lagi nanti ya!',
  offlineReady: 'Alhamdulillah, pulau ini bisa didengar offline!',
  hello: "Assalamu'alaikum!",
  missYou: 'Ada pulau yang rindu kamu. Ayo murojaah!',
  garden: 'Belajar setiap hari supaya tamanmu makin rindang!',
  // App
  takeBreak: 'MasyaAllah, kamu sudah belajar lama! Yuk istirahat sebentar, minum air, dan gerakkan badanmu.',
  dayLimit: 'Waktunya istirahat untuk hari ini. Sampai jumpa besok ya!',
  voiceTest: 'Halo! Aku Bintang. Ayo belajar bersama!',
};

export const itu = (latin: string) => `Itu ${latin}!`;
export const sailTo = (latin: string) => `Ayo berlayar ke pulau ${latin}!`;
export const scoreLine = (n: number, of: number) => `Benar ${n} dari ${of}!`;
export const badgeInfo = (name: string, desc: string) => `${name}. ${desc}`;
export const badgeLocked = (desc: string) => `Belum didapat. ${desc}`;
export const badgeNew = (name: string) => `Alhamdulillah! Kamu dapat lencana baru: ${name}!`;
export const bought = (name: string) => `Asyik! Kamu dapat ${name}!`;

/** Text used as the lookup key (emoji and extra spaces don't matter). */
export const voiceKey = (text: string) =>
  text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

/** How the text should be pronounced by the TTS generator. */
export const spoken = (text: string) =>
  voiceKey(text)
    .replace(/Assalamu'alaikum/g, 'Assalamualaikum')
    .replace(/ﷺ/g, 'shallallahu alaihi wa sallam')
    .replace(/&/g, 'dan')
    .replace(/['‘’]/g, '')
    .replace(/\bMasyaAllah\b/g, 'Masya Allah')
    .replace(/\bBarakallah\b/g, 'Baarakallah')
    .replace(/\binsyaAllah\b/g, 'insya Allah')
    .replace(/^Hmm, /, 'Hmmm... ')
    // single words/phrases (vocabulary) get a full stop so they end with a falling tone
    .replace(/([^.!?])$/, '$1.');

/** Short stable file id for a sentence (FNV-1a). */
export function voiceId(text: string) {
  let h = 0x811c9dc5;
  for (const ch of voiceKey(text)) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'v-' + h.toString(36);
}

/** Sentences that belong to one island (downloaded with "Unduh Pulau"). */
export function islandVoiceLines(n: number): string[] {
  const i = ISLANDS.find((x) => x.number === n)!;
  const out = [i.about, itu(i.latin), sailTo(i.latin), ...(VOCAB[n] ?? []).map((v) => v[3])];
  if (i.story) out.push(i.story);
  return out.map(voiceKey);
}

/** Sentences used on every island (instructions, praise, rewards). */
export const commonVoiceLines = () => [...Object.values(L), ...PRAISE, ...RETRY].map(voiceKey);

/** Sentence type decides intonation when recording (see scripts/make-voice.mjs). */
export type VoiceKind = 'cheer' | 'guide' | 'story' | 'word';

const CHEER = new Set<string>([L.myVoice, L.partDone, L.allDone, L.reviewDone, L.sambungDone, L.jodohDone, L.newStar, L.offlineReady, L.hello, L.voiceTest]);

export function voiceKind(text: string): VoiceKind {
  const t = voiceKey(text);
  if (ISLANDS.some((i) => voiceKey(i.about) === t || (i.story && voiceKey(i.story) === t))) return 'story';
  if (Object.values(VOCAB).some((list) => list.some((v) => voiceKey(v[3]) === t))) return 'word';
  if (
    CHEER.has(t) ||
    PRAISE.includes(t) ||
    /^(Itu |Benar \d|Asyik!|Alhamdulillah! Kamu dapat lencana)/.test(t)
  )
    return 'cheer';
  return 'guide';
}

export function allVoiceLines(): string[] {
  const out = new Set<string>([...Object.values(L), ...PRAISE, ...RETRY]);
  for (let n = 0; n <= 6; n++) out.add(scoreLine(n, 6));
  for (const i of ISLANDS) {
    out.add(i.about);
    if (i.story) out.add(i.story);
    out.add(itu(i.latin));
    out.add(sailTo(i.latin));
  }
  for (const list of Object.values(VOCAB)) for (const [, , , meaning] of list) out.add(meaning);
  for (const b of BADGES) {
    out.add(badgeInfo(b.name, b.desc));
    out.add(badgeLocked(b.desc));
    out.add(badgeNew(b.name));
  }
  for (const item of SHOP) out.add(bought(item.name));
  return [...out].map(voiceKey).filter(Boolean);
}

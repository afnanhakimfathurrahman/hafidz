import raw from './juz30.json';
import timingsRaw from './timings.json';
import { islandOf } from './islands';

export interface Word {
  t: string; // Arabic (Uthmani)
  m: string; // Indonesian meaning
}

export interface Ayah {
  n: number; // number in surah
  id: number; // global ayah number
  words: Word[];
  tr: string; // Kemenag translation
}

export interface Surah {
  number: number;
  name: string;
  latin: string;
  meaning: string;
  count: number;
  ayahs: Ayah[];
}

export type QoriId = 'husary' | 'muallim' | 'alafasy';

export const QORI: Record<QoriId, { label: string; note: string; base: string }> = {
  husary: {
    label: 'Syaikh Al-Husary',
    note: 'Jelas dan tenang',
    base: 'https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/',
  },
  muallim: {
    label: 'Al-Husary (Muallim)',
    note: 'Pelan, cocok untuk belajar',
    base: 'https://mirrors.quranicaudio.com/everyayah/Husary_Muallim_128kbps/',
  },
  alafasy: {
    label: 'Syaikh Mishary Alafasy',
    note: 'Merdu dan populer',
    base: 'https://verses.quran.com/Alafasy/mp3/',
  },
};

// [wordPosition, startMs, endMs]
type Segment = [number, number, number];
const TIMINGS = timingsRaw as unknown as Record<QoriId, Record<string, Segment[]>>;

export const SURAHS: Surah[] = (raw as Surah[])
  .map((s) => ({ ...s, latin: islandOf(s.number).latin }))
  .sort((a, b) => b.number - a.number); // An-Nas first: traditional memorization order

export const surahOf = (n: number) => SURAHS.find((s) => s.number === n)!;

export const ayahText = (a: Ayah) => a.words.map((w) => w.t).join(' ');

const pad = (n: number) => String(n).padStart(3, '0');

export const audioUrl = (qori: QoriId, surah: number, ayah: number) =>
  `${QORI[qori].base}${pad(surah)}${pad(ayah)}.mp3`;

export const wordTimings = (qori: QoriId, surah: number, ayah: number): Segment[] =>
  TIMINGS[qori][`${surah}:${ayah}`] ?? [];

/** Split long ayahs into chunks of words for Dengar & Ulangi. */
export function chunksOf(a: Ayah, maxWords: number): [number, number][] {
  const n = a.words.length;
  if (n <= maxWords) return [[0, n]];
  const parts = Math.ceil(n / maxWords);
  const size = Math.ceil(n / parts);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i += size) out.push([i, Math.min(n, i + size)]);
  return out;
}

export const BASMALAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

/** Dengar & Ulangi is split into short parts so a session stays 1–3 minutes. */
export function partsOf(s: Surah, band: 'A' | 'B'): [number, number][] {
  const size = band === 'A' ? 4 : 6;
  if (s.count <= size + 2) return [[1, s.count]];
  const n = Math.ceil(s.count / size);
  const per = Math.ceil(s.count / n);
  const out: [number, number][] = [];
  for (let a = 1; a <= s.count; a += per) out.push([a, Math.min(s.count, a + per - 1)]);
  return out;
}

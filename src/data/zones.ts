import type { Progress } from '../store/useGameStore';

export interface Zone {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  theme: string;
  accent: string;
  /** Inclusive range of surah numbers (remember Juz 30 goes 114 down to 78). */
  from: number;
  to: number;
}

export const ZONES: Zone[] = [
  {
    id: 'teluk-cahaya',
    name: 'Teluk Cahaya',
    emoji: '🌅',
    desc: 'Surah-surah pendek pelindung diri',
    theme: 'from-sky-100 to-cyan-100 border-sky-200',
    accent: 'text-sky-700',
    from: 114,
    to: 109,
  },
  {
    id: 'lembah-kisah',
    name: 'Lembah Kisah',
    emoji: '🐪',
    desc: 'Kisah nyata dan teladan mulia',
    theme: 'from-amber-100 to-orange-100 border-amber-200',
    accent: 'text-amber-800',
    from: 108,
    to: 103,
  },
  {
    id: 'bukit-waktu',
    name: 'Bukit Waktu',
    emoji: '⏳',
    desc: 'Mengingat waktu, amal, dan malam mulia',
    theme: 'from-violet-100 to-indigo-100 border-violet-200',
    accent: 'text-violet-800',
    from: 102,
    to: 97,
  },
  {
    id: 'hutan-bintang',
    name: 'Hutan Bintang',
    emoji: '🌿',
    desc: 'Wahyu pertama hingga fajar menyingsing',
    theme: 'from-emerald-100 to-teal-100 border-emerald-200',
    accent: 'text-emerald-800',
    from: 96,
    to: 89,
  },
  {
    id: 'samudra-awan',
    name: 'Samudra Awan',
    emoji: '⛵',
    desc: 'Tantangan surah panjang menuju Puncak An-Naba!',
    theme: 'from-blue-100 to-indigo-100 border-blue-200',
    accent: 'text-blue-800',
    from: 88,
    to: 78,
  },
];

export function zoneOf(surahNo: number): Zone {
  return ZONES.find((z) => surahNo <= z.from && surahNo >= z.to) ?? ZONES[0];
}

export function zoneSurahNumbers(z: Zone): number[] {
  const nums: number[] = [];
  for (let n = z.from; n >= z.to; n--) nums.push(n);
  return nums;
}

export function zoneStats(p: Progress, z: Zone) {
  const nums = zoneSurahNumbers(z);
  const learned = nums.filter((n) => (p.stars[n] ?? 0) >= 2).length;
  const stars = nums.reduce((sum, n) => sum + (p.stars[n] ?? 0), 0);
  return { total: nums.length, learned, stars, maxStars: nums.length * 3, complete: learned === nums.length };
}

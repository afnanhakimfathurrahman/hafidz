import type { Progress } from '../store/useGameStore';

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  check: (p: Progress) => boolean;
}

const learned = (p: Progress, ...surahs: number[]) => surahs.every((s) => (p.stars[s] ?? 0) >= 2);
const countLearned = (p: Progress) => Object.values(p.stars).filter((s) => s >= 2).length;

export const BADGES: Badge[] = [
  { id: 'first', emoji: '🌱', name: 'Langkah Pertama', desc: 'Menyelesaikan kegiatan pertama', check: (p) => Object.keys(p.done).length > 0 },
  { id: 'nas', emoji: '🛡️', name: 'Sahabat An-Nas', desc: 'Hafal Surah An-Nas', check: (p) => learned(p, 114) },
  { id: 'qul3', emoji: '✋', name: 'Hafal 3 Qul', desc: 'Hafal Al-Ikhlas, Al-Falaq, An-Nas', check: (p) => learned(p, 112, 113, 114) },
  { id: 'fil', emoji: '🐘', name: 'Sahabat Gajah', desc: 'Hafal Surah Al-Fil', check: (p) => learned(p, 105) },
  { id: 'five', emoji: '🖐️', name: '5 Surah Hafal', desc: 'Hafal 5 surah', check: (p) => countLearned(p) >= 5 },
  { id: 'ten', emoji: '🔟', name: '10 Surah Hafal', desc: 'Hafal 10 surah', check: (p) => countLearned(p) >= 10 },
  { id: 'twenty', emoji: '🏅', name: '20 Surah Hafal', desc: 'Hafal 20 surah', check: (p) => countLearned(p) >= 20 },
  { id: 'juz30', emoji: '👑', name: 'Hafiz Juz 30', desc: 'Hafal semua 37 surah Juz 30!', check: (p) => countLearned(p) >= 37 },
  { id: 'star3', emoji: '🌟', name: 'Bintang Tiga', desc: 'Dapat 3 bintang pertama (murojaah)', check: (p) => Object.values(p.stars).some((s) => s >= 3) },
  { id: 'garden7', emoji: '🌳', name: 'Taman Rindang', desc: 'Belajar di 7 hari berbeda', check: (p) => p.garden.days >= 7 },
  { id: 'garden30', emoji: '🌴', name: 'Hutan Hafalan', desc: 'Belajar di 30 hari berbeda', check: (p) => p.garden.days >= 30 },
  { id: 'dawn', emoji: '🌅', name: 'Penjaga Pagi', desc: 'Belajar sebelum jam 7 pagi', check: (p) => p.stats.dawn > 0 },
  { id: 'tebak20', emoji: '🎧', name: 'Telinga Tajam', desc: 'Benar 20x di Tebak Surah', check: (p) => p.stats.tebak >= 20 },
  { id: 'correct100', emoji: '💯', name: 'Seratus Benar', desc: 'Menjawab benar 100 kali', check: (p) => p.stats.correct >= 100 },
];

export const badgeOf = (id: string) => BADGES.find((b) => b.id === id);

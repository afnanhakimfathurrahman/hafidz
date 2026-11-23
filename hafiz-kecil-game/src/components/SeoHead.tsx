import { useEffect } from 'react';
import { surahOf } from '../data/quran';

const SITE = 'Petualangan Hafiz Kecil';

/** Keeps <title> and meta description in sync. Pre-rendered HTML carries the same tags for crawlers. */
export function SeoHead({ surah }: { surah?: number }) {
  useEffect(() => {
    let title = `${SITE} - Game Edukasi Hafalan Juz 30 Anak`;
    let desc = 'Game edukasi gratis untuk membantu anak menghafal Juz 30 beserta artinya. Tanpa iklan, bisa offline.';
    if (surah) {
      const s = surahOf(surah);
      title = `Belajar Surah ${s.latin} (Juz 30) - Game Hafalan Anak | ${SITE}`;
      desc = `Hafalan Surah ${s.latin} (${s.meaning}, ${s.count} ayat) untuk anak: dengar & ulangi, sambung ayat, dan jodohkan makna. Gratis, tanpa iklan.`;
    }
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
  }, [surah]);
  return null;
}

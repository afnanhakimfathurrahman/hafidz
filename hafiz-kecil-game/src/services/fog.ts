import { SURAHS } from '../data/quran';
import { useGameStore, useProgress, type Progress } from '../store/useGameStore';

/**
 * Islands are explored in order (An-Nas → An-Naba). The island being learned and the
 * one right after it are open; islands further ahead are covered in fog until the
 * frontier island has ⭐⭐. Started islands stay open. Parents can lift all fog, and
 * children who already memorized a surah can clear its fog with Tes Lompat Pulau.
 */
export function frontierOf(p: Progress): number | undefined {
  return SURAHS.find((s) => (p.stars[s.number] ?? 0) < 2)?.number;
}

export function isFoggy(p: Progress, surah: number, unlockAll: boolean): boolean {
  if (unlockAll || (p.stars[surah] ?? 0) > 0 || (p.parts[surah]?.length ?? 0) > 0) return false;
  const frontier = SURAHS.findIndex((s) => (p.stars[s.number] ?? 0) < 2);
  if (frontier === -1) return false;
  return SURAHS.findIndex((s) => s.number === surah) > frontier + 1;
}

export function useFoggy(surah: number): boolean {
  const p = useProgress();
  const unlockAll = useGameStore((s) => s.settings.unlockAll);
  return isFoggy(p, surah, unlockAll);
}

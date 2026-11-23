import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, RotateCcw } from 'lucide-react';
import { surahOf, ayahText, type Ayah } from '../../data/quran';
import { BintangSays, type Mood } from '../../components/Bintang';
import { Button, ProgressDots, TopBar } from '../../components/ui';
import { RewardModal } from '../../components/RewardModal';
import { ComboBanner } from '../../components/ComboBanner';
import { playAyah, say, sfx, stopAll } from '../../services/audio';
import { praise, retry, shuffle } from '../../services/lines';
import { useGameStore, useProfile } from '../../store/useGameStore';
import { navigate } from '../../hooks/useRoute';

interface TrainRound {
  ordered: Ayah[];
  shuffled: Ayah[];
}

function buildRounds(surahNo: number, band: 'A' | 'B'): TrainRound[] {
  const surah = surahOf(surahNo);
  const size = band === 'A' ? 3 : 4;
  if (surah.count <= size) {
    return [{ ordered: surah.ayahs, shuffled: shuffle(surah.ayahs) }];
  }
  const starts: number[] = [];
  for (let i = 0; i <= surah.count - size; i += Math.max(2, size - 1)) starts.push(i);
  const pickedStarts = shuffle(starts).slice(0, 3).sort((a, b) => a - b);
  return pickedStarts.map((start) => {
    const ordered = surah.ayahs.slice(start, start + size);
    let shuffled = shuffle(ordered);
    // Avoid presenting already in exact order
    if (shuffled.every((a, i) => a.n === ordered[i].n) && shuffled.length > 1) {
      shuffled = [shuffled[1], shuffled[0], ...shuffled.slice(2)];
    }
    return { ordered, shuffled };
  });
}

/** Mini-Game: Kereta Ayat — arrange consecutive ayahs into their correct sequence. */
export default function SusunAyat({ surahNo }: { surahNo: number }) {
  const surah = surahOf(surahNo);
  const profile = useProfile()!;
  const completeActivity = useGameStore((s) => s.completeActivity);
  const recordCorrect = useGameStore((s) => s.recordCorrect);
  const recordCombo = useGameStore((s) => s.recordCombo);
  const addCoins = useGameStore((s) => s.addCoins);

  const rounds = useMemo(() => buildRounds(surahNo, profile.ageBand), [surahNo, profile.ageBand]);
  const [ri, setRi] = useState(0);
  const [placed, setPlaced] = useState<Ayah[]>([]);
  const [hadMistake, setHadMistake] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [locked, setLocked] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; mood: Mood }>({
    text: 'Susun gerbong ayat dari urutan yang paling awal!',
    mood: 'happy',
  });
  const [reward, setReward] = useState<{ stars: number; gained: number; coins: number } | null>(null);

  const r = rounds[ri];

  useEffect(() => {
    setPlaced([]);
    setHadMistake(false);
    setLocked(false);
    if (ri === 0) say('Susun gerbong ayat dari urutan yang paling awal!');
    else setBubble({ text: 'Ayo susun kereta ayat berikutnya!', mood: 'happy' });
    return stopAll;
  }, [ri]);

  const pickCar = async (a: Ayah) => {
    if (locked || placed.some((x) => x.n === a.n)) return;
    const expected = r.ordered[placed.length];
    if (a.n === expected.n) {
      sfx('tap');
      const next = [...placed, a];
      setPlaced(next);
      await playAyah(surahNo, a.n);

      if (next.length === r.ordered.length) {
        setLocked(true);
        const clean = !hadMistake;
        const nextCombo = clean ? combo + 1 : 0;
        setCombo(nextCombo);
        if (nextCombo >= 2) recordCombo(nextCombo);
        const stepBonus = nextCombo >= 2 ? 3 : 0;
        const nextBonus = bonusCoins + stepBonus;
        if (stepBonus > 0) setBonusCoins(nextBonus);

        sfx(nextCombo >= 2 ? 'combo' : 'correct');
        recordCorrect();
        const pr = praise();
        setBubble({ text: pr, mood: 'cheer' });
        await say(pr);

        if (ri + 1 < rounds.length) {
          setRi(ri + 1);
        } else {
          if (nextBonus > 0) addCoins(nextBonus);
          const res = completeActivity(surahNo, 'susun', 15);
          setReward({ stars: res.newStars, gained: res.gained, coins: 15 + nextBonus });
        }
      }
    } else {
      setHadMistake(true);
      setCombo(0);
      sfx('gentle');
      setBubble({ text: retry(), mood: 'think' });
      say(retry());
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar back={`/pulau/${surahNo}`} title={`🚂 Kereta Ayat · ${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <ProgressDots total={rounds.length} current={ri} />
        <ComboBanner combo={combo} bonusCoins={bonusCoins} />
        <BintangSays text={bubble.text} mood={bubble.mood} size={70} />

        {/* Assembled train track */}
        <section className="rounded-[2rem] border-4 border-dashed border-sky-300 bg-white/80 p-3 shadow-inner">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-sky-700">
              🚂 Urutan Kereta ({placed.length}/{r.ordered.length})
            </span>
            {placed.length > 0 && !locked && (
              <button
                type="button"
                onClick={() => setPlaced([])}
                className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                <RotateCcw size={16} /> Ulang
              </button>
            )}
          </div>
          {placed.length === 0 ? (
            <p className="py-4 text-center text-slate-400">Ketuk kartu ayat di bawah mulai dari urutan pertama...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {placed.map((a, idx) => (
                <motion.div
                  key={a.n}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 shadow-xs"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
                    {idx + 1}
                  </span>
                  <span className="font-quran flex-1 text-right text-2xl leading-relaxed text-slate-900">{ayahText(a)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Remaining train cars */}
        <div className="flex flex-col gap-2.5 pb-6">
          {r.shuffled.map((a) => {
            const used = placed.some((x) => x.n === a.n);
            if (used) return null;
            return (
              <div key={a.n} className="flex items-center gap-2 rounded-3xl bg-white p-2 shadow">
                <Button color="yellow" label="Dengar ayat" onClick={() => playAyah(surahNo, a.n)}>
                  <Volume2 size={22} />
                </Button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  disabled={locked}
                  onClick={() => pickCar(a)}
                  className="font-quran flex-1 px-2 py-1 text-right text-2xl leading-[2] text-slate-900"
                >
                  {ayahText(a)}
                </motion.button>
              </div>
            );
          })}
        </div>
      </main>

      <RewardModal
        open={!!reward}
        stars={reward?.stars ?? 0}
        gained={reward?.gained ?? 0}
        coins={reward?.coins ?? 15}
        message="Kereta Ayat melaju!"
        onNext={() => navigate(`/pulau/${surahNo}`, true)}
      />
    </div>
  );
}

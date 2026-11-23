import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { SURAHS } from '../data/quran';
import { islandOf } from '../data/islands';
import { Button, TopBar, ProgressDots } from '../components/ui';
import { BintangSays, type Mood } from '../components/Bintang';
import { RewardModal } from '../components/RewardModal';
import { playAyah, say, sfx, stopAll, preloadVoices } from '../services/audio';
import { pick, praise, retry, shuffle } from '../services/lines';
import { useGameStore, useProfile, useProgress } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { L, itu, scoreLine } from '../data/voiceLines';

const ROUNDS = 6;

/** Mode 3: Tebak Surah — hear an ayah, pick its island. Reviews every learned Surah. */
export default function TebakSurah() {
  const profile = useProfile()!;
  const p = useProgress();
  const recordCorrect = useGameStore((s) => s.recordCorrect);
  const addCoins = useGameStore((s) => s.addCoins);
  const nChoices = profile.ageBand === 'A' ? 3 : 4;

  const learned = SURAHS.filter((s) => (p.stars[s.number] ?? 0) >= 1);
  // Before 2 surahs are learned, use the first few islands so the game is still playable
  const pool = learned.length >= 2 ? learned : SURAHS.slice(0, 3);

  const rounds = useMemo(
    () =>
      Array.from({ length: ROUNDS }, () => {
        const target = pick(pool, 1)[0];
        const ayah = 1 + Math.floor(Math.random() * Math.min(target.count, 5)); // opening ayahs are most recognizable
        const others = pick(
          (pool.length >= nChoices ? pool : SURAHS.slice(0, 6)).filter((s) => s.number !== target.number),
          nChoices - 1,
        );
        return { target, ayah, options: shuffle([target, ...others]) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    preloadVoices([L.tebakStart, ...new Set(rounds.map((r) => itu(islandOf(r.target.number).latin)))]);
  }, [rounds]);

  const [ri, setRi] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [bubble, setBubble] = useState<{ text: string; mood: Mood }>({ text: 'Dengarkan, ini surah apa?', mood: 'happy' });
  const [done, setDone] = useState(false);
  const [locked, setLocked] = useState(false);
  const r = rounds[ri];

  const play = () => playAyah(r.target.number, r.ayah);

  useEffect(() => {
    setWrong([]);
    setLocked(false);
    (async () => {
      if (ri === 0) await say(bubble.text);
      await play();
    })();
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ri]);

  const choose = async (n: number) => {
    if (locked) return;
    if (n === r.target.number) {
      setLocked(true);
      sfx('correct');
      recordCorrect('tebak');
      const total = score + (wrong.length === 0 ? 1 : 0);
      setScore(total);
      const p = praise();
      setBubble({ text: `${p} ${itu(islandOf(n).latin)}`, mood: 'cheer' });
      await Promise.race([say([p, itu(islandOf(n).latin)]), new Promise((res) => setTimeout(res, 3000))]);
      if (ri + 1 < ROUNDS) setRi(ri + 1);
      else {
        addCoins(10 + total * 2);
        setDone(true);
      }
    } else {
      sfx('gentle');
      setWrong((w) => [...w, n]);
      const t = retry();
      setBubble({ text: t, mood: 'think' });
      await say(t);
      play();
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="🎧 Tebak Surah" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <ProgressDots total={ROUNDS} current={ri} />
        <BintangSays text={bubble.text} mood={bubble.mood} size={80} />
        <div className="flex justify-center">
          <Button big color="yellow" onClick={play} label="Putar lagi">
            <Volume2 size={40} /> Dengar
          </Button>
        </div>
        <div className={`grid gap-3 ${nChoices === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {r.options.map((s) => {
            const isl = islandOf(s.number);
            const isWrong = wrong.includes(s.number);
            return (
              <motion.button
                key={s.number}
                type="button"
                whileTap={{ scale: 0.92 }}
                disabled={isWrong || locked}
                onClick={() => choose(s.number)}
                className={`flex flex-col items-center rounded-3xl bg-linear-to-br ${isl.color} p-3 shadow-md ${isWrong ? 'opacity-40' : ''}`}
              >
                <span className="text-6xl">{isl.emoji}</span>
                <span className="font-quran text-2xl leading-normal">{s.name}</span>
                <span className="text-lg font-semibold">{isl.latin}</span>
              </motion.button>
            );
          })}
        </div>
      </main>
      <RewardModal
        open={done}
        stars={Math.min(3, Math.ceil(score / 2))}
        gained={0}
        coins={10 + score * 2}
        message={scoreLine(score, ROUNDS)}
        onNext={() => navigate('/', true)}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { SURAHS } from '../data/quran';
import { islandOf } from '../data/islands';
import { surahRpgOf } from '../data/rpg';
import { Button, TopBar, ProgressDots } from '../components/ui';
import { BintangSays, type Mood } from '../components/Bintang';
import { RewardModal } from '../components/RewardModal';
import { ComboBanner } from '../components/ComboBanner';
import { playAyah, say, sfx, stopAll, preloadVoices } from '../services/audio';
import { pick, praise, retry, shuffle } from '../services/lines';
import { useGameStore, useProfile, useProgress } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { L, itu, scoreLine } from '../data/voiceLines';

const ROUNDS = 6;
type ArenaMode = 'audio' | 'arti';

/** Mode 3: Arena Murojaah — Audio Guess OR Surah Meaning Guess to earn XP & Debu Bintang. */
export default function TebakSurah() {
  const profile = useProfile()!;
  const p = useProgress();
  const recordCorrect = useGameStore((s) => s.recordCorrect);
  const recordCombo = useGameStore((s) => s.recordCombo);
  const grantRpgRewards = useGameStore((s) => s.grantRpgRewards);
  const nChoices = profile.ageBand === 'A' ? 3 : 4;

  const learned = SURAHS.filter((s) => (p.stars[s.number] ?? 0) >= 1);
  const pool = learned.length >= 2 ? learned : SURAHS.slice(0, 4);

  const [mode, setMode] = useState<ArenaMode>('audio');
  const [gameKey, setGameKey] = useState(0);

  const rounds = useMemo(
    () =>
      Array.from({ length: ROUNDS }, () => {
        const target = pick(pool, 1)[0];
        const ayah = 1 + Math.floor(Math.random() * Math.min(target.count, 5));
        const candidatePool = (pool.length >= nChoices ? pool : SURAHS.slice(0, 8)).filter(
          (s) => s.number !== target.number && s.meaning !== target.meaning,
        );
        const others = pick(candidatePool, nChoices - 1);
        return { target, ayah, options: shuffle([target, ...others]) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameKey, mode],
  );

  useEffect(() => {
    preloadVoices([L.tebakStart, ...new Set(rounds.map((r) => itu(islandOf(r.target.number).latin)))]);
  }, [rounds]);

  const [ri, setRi] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [bubble, setBubble] = useState<{ text: string; mood: Mood }>({ text: 'Dengarkan, ini surah apa?', mood: 'happy' });
  const [done, setDone] = useState(false);
  const [locked, setLocked] = useState(false);
  const r = rounds[ri];

  const play = () => playAyah(r.target.number, r.ayah);

  useEffect(() => {
    setWrong([]);
    setLocked(false);
    (async () => {
      if (mode === 'audio') {
        if (ri === 0) await say('Dengarkan, ini surah apa?');
        await play();
      } else {
        const prompt = `Apa arti nama Surah ${islandOf(r.target.number).latin}?`;
        setBubble({ text: prompt, mood: 'happy' });
        await say(prompt);
      }
    })();
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ri, gameKey, mode]);

  const switchMode = (m: ArenaMode) => {
    if (m === mode) return;
    stopAll();
    setMode(m);
    setRi(0);
    setScore(0);
    setCombo(0);
    setBonusCoins(0);
    setWrong([]);
    setDone(false);
    setBubble({ text: m === 'audio' ? 'Dengarkan, ini surah apa?' : 'Pilih arti nama surah yang tepat!', mood: 'happy' });
    setGameKey((k) => k + 1);
  };

  const choose = async (n: number) => {
    if (locked) return;
    if (n === r.target.number) {
      setLocked(true);
      const firstAttempt = wrong.length === 0;
      const nextCombo = firstAttempt ? combo + 1 : 0;
      setCombo(nextCombo);
      if (nextCombo >= 2) recordCombo(nextCombo);
      const stepBonus = nextCombo >= 2 ? 2 : 0;
      const nextBonus = bonusCoins + stepBonus;
      if (stepBonus > 0) setBonusCoins(nextBonus);
      sfx(nextCombo >= 2 ? 'combo' : 'correct');
      recordCorrect('tebak');
      const total = score + (firstAttempt ? 1 : 0);
      setScore(total);
      const pr = praise();
      setBubble({
        text: mode === 'audio' ? `${pr} ${itu(islandOf(n).latin)}` : `${pr} ${r.target.latin} artinya ${r.target.meaning}!`,
        mood: 'cheer',
      });
      await Promise.race([
        say(mode === 'audio' ? [pr, itu(islandOf(n).latin)] : pr),
        new Promise((res) => setTimeout(res, 2600)),
      ]);
      if (ri + 1 < ROUNDS) setRi(ri + 1);
      else {
        grantRpgRewards({
          coins: 10 + total * 2 + nextBonus,
          xp: 20 + total * 3,
          bintang: total >= 4 ? 1 : 0,
          daun: mode === 'arti' ? 1 : 0,
        });
        setDone(true);
      }
    } else {
      sfx('gentle');
      setCombo(0);
      setWrong((w) => [...w, n]);
      const t = retry();
      setBubble({ text: t, mood: 'think' });
      await say(t);
      if (mode === 'audio') play();
    }
  };

  const replay = () => {
    setDone(false);
    setRi(0);
    setScore(0);
    setCombo(0);
    setBonusCoins(0);
    setWrong([]);
    setBubble({ text: mode === 'audio' ? 'Dengarkan, ini surah apa?' : 'Pilih arti nama surah yang tepat!', mood: 'happy' });
    setGameKey((k) => k + 1);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="⚔️ Arena Murojaah" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        {/* Arena Mode Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button color={mode === 'audio' ? 'blue' : 'white'} onClick={() => switchMode('audio')}>
            🎧 Tebak Bunyi Surah
          </Button>
          <Button color={mode === 'arti' ? 'purple' : 'white'} onClick={() => switchMode('arti')}>
            📖 Tebak Arti Surah
          </Button>
        </div>

        <ProgressDots total={ROUNDS} current={ri} />
        <ComboBanner combo={combo} bonusCoins={bonusCoins} />
        <BintangSays text={bubble.text} mood={bubble.mood} size={76} />

        {mode === 'audio' ? (
          <div className="flex justify-center">
            <Button big color="yellow" onClick={play} label="Putar lagi">
              <Volume2 size={40} /> Dengar Ayat
            </Button>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-4 text-center shadow">
            <div className="text-5xl">{surahRpgOf(r.target.number).companionEmoji}</div>
            <p className="font-quran mt-1 text-4xl text-slate-900">{r.target.name}</p>
            <p className="text-2xl font-semibold text-purple-700">{islandOf(r.target.number).latin}</p>
          </div>
        )}

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
                className={`flex flex-col items-center justify-center rounded-3xl bg-linear-to-br ${isl.color} p-3 text-center shadow-md ${
                  isWrong ? 'opacity-40' : ''
                }`}
              >
                <span className="text-5xl">{isl.emoji}</span>
                {mode === 'audio' ? (
                  <>
                    <span className="font-quran text-2xl leading-normal">{s.name}</span>
                    <span className="text-lg font-semibold">{isl.latin}</span>
                  </>
                ) : (
                  <span className="mt-1 text-lg font-semibold text-slate-900">{s.meaning}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </main>
      <RewardModal
        open={done}
        stars={Math.min(3, Math.ceil(score / 2))}
        gained={0}
        coins={10 + score * 2 + bonusCoins}
        message={`${scoreLine(score, ROUNDS)}${score >= 4 ? ' (+1 🌟 Debu Bintang!)' : ''}`}
        nextLabel="Main Lagi 🔄"
        onNext={replay}
        secondaryAction={{ label: 'Kembali ke Markas', onClick: () => navigate('/', true) }}
      />
    </div>
  );
}

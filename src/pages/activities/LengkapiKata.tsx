import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { SURAHS, surahOf, type Ayah } from '../../data/quran';
import { QuranPanel } from '../../components/AyahText';
import { BintangSays, type Mood } from '../../components/Bintang';
import { Button, ProgressDots, TopBar } from '../../components/ui';
import { RewardModal } from '../../components/RewardModal';
import { ComboBanner } from '../../components/ComboBanner';
import { playAyah, playWord, say, sfx, stopAll } from '../../services/audio';
import { praise, retry, shuffle } from '../../services/lines';
import { useGameStore, useProfile } from '../../store/useGameStore';
import { navigate } from '../../hooks/useRoute';

interface BlankQuestion {
  ayah: Ayah;
  blankIdx: number;
  options: { surah: number; ayah: number; wordIdx: number; text: string; correct: boolean }[];
}

function buildQuestions(surahNo: number, band: 'A' | 'B'): BlankQuestion[] {
  const surah = surahOf(surahNo);
  const candidates = surah.ayahs.filter((a) => a.words.length >= 2);
  const picked = shuffle(candidates).slice(0, band === 'A' ? 5 : 6).sort((a, b) => a.n - b.n);
  const nChoices = band === 'A' ? 3 : 4;

  const surahIdx = SURAHS.findIndex((s) => s.number === surahNo);
  const neighborSurahs = [SURAHS[surahIdx - 1], SURAHS[surahIdx + 1], SURAHS[surahIdx + 2]].filter(Boolean);

  return picked.map((ayah) => {
    // Prefer picking a non-trivial word (not index 0 when length > 2)
    const indices = ayah.words.map((_, i) => i).filter((i) => ayah.words.length <= 2 || i > 0);
    const blankIdx = indices[Math.floor(Math.random() * indices.length)];
    const targetWord = ayah.words[blankIdx].t;

    const seen = new Set([targetWord]);
    const pool: { surah: number; ayah: number; wordIdx: number; text: string }[] = [];
    const collect = (sNo: number, list: Ayah[]) => {
      for (const a of shuffle(list)) {
        a.words.forEach((w, wi) => {
          if (!seen.has(w.t)) {
            seen.add(w.t);
            pool.push({ surah: sNo, ayah: a.n, wordIdx: wi, text: w.t });
          }
        });
      }
    };
    collect(surahNo, surah.ayahs);
    if (pool.length < nChoices - 1) neighborSurahs.forEach((ns) => collect(ns.number, ns.ayahs));

    const distractors = shuffle(pool)
      .slice(0, nChoices - 1)
      .map((d) => ({ ...d, correct: false }));

    const options = shuffle([
      { surah: surahNo, ayah: ayah.n, wordIdx: blankIdx, text: targetWord, correct: true },
      ...distractors,
    ]);
    return { ayah, blankIdx, options };
  });
}

/** Mini-Game: Lengkapi Kata — fill in the missing Arabic word in an ayah. */
export default function LengkapiKata({ surahNo }: { surahNo: number }) {
  const surah = surahOf(surahNo);
  const profile = useProfile()!;
  const completeActivity = useGameStore((s) => s.completeActivity);
  const recordCorrect = useGameStore((s) => s.recordCorrect);
  const recordCombo = useGameStore((s) => s.recordCombo);
  const addCoins = useGameStore((s) => s.addCoins);
  const showTranslation = useGameStore((s) => s.settings.showTranslation);

  const questions = useMemo(() => buildQuestions(surahNo, profile.ageBand), [surahNo, profile.ageBand]);
  const [qi, setQi] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [hl, setHl] = useState(-1);
  const [combo, setCombo] = useState(0);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [bubble, setBubble] = useState<{ text: string; mood: Mood }>({
    text: 'Pilih kata yang tepat untuk melengkapi ayat!',
    mood: 'happy',
  });
  const [reward, setReward] = useState<{ stars: number; gained: number; coins: number } | null>(null);

  const q = questions[qi];

  useEffect(() => {
    setWrong([]);
    setSolved(false);
    setHl(-1);
    (async () => {
      if (qi === 0) await say('Pilih kata yang tepat untuk melengkapi ayat!');
      await playAyah(surahNo, q.ayah.n, { onWord: setHl });
    })();
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi]);

  const choose = async (idx: number) => {
    if (solved) return;
    const opt = q.options[idx];
    if (opt.correct) {
      setSolved(true);
      const clean = wrong.length === 0;
      const nextCombo = clean ? combo + 1 : 0;
      setCombo(nextCombo);
      if (nextCombo >= 2) recordCombo(nextCombo);
      const stepBonus = nextCombo >= 2 ? 2 : 0;
      const nextBonus = bonusCoins + stepBonus;
      if (stepBonus > 0) setBonusCoins(nextBonus);

      sfx(nextCombo >= 2 ? 'combo' : 'correct');
      recordCorrect();
      const pr = praise();
      setBubble({ text: `${pr}`, mood: 'cheer' });
      await say(pr);
      await playAyah(surahNo, q.ayah.n, { onWord: setHl });
      await new Promise((r) => setTimeout(r, 400));

      if (qi + 1 < questions.length) {
        setQi(qi + 1);
      } else {
        if (nextBonus > 0) addCoins(nextBonus);
        const r = completeActivity(surahNo, 'lengkapi', 15);
        setReward({ stars: r.newStars, gained: r.gained, coins: 15 + nextBonus });
      }
    } else {
      setCombo(0);
      setWrong((w) => [...w, idx]);
      sfx('gentle');
      setBubble({ text: retry(), mood: 'think' });
      await say(retry());
      playAyah(surahNo, q.ayah.n, { onWord: setHl });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar back={`/pulau/${surahNo}`} title={`✏️ Lengkapi Kata · ${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <ProgressDots total={questions.length} current={qi} />
        <ComboBanner combo={combo} bonusCoins={bonusCoins} />
        <BintangSays text={bubble.text} mood={bubble.mood} size={70} />

        <QuranPanel>
          <p className="font-quran text-center text-4xl leading-[2.3] text-slate-900">
            {q.ayah.words.map((w, i) => {
              const isBlank = i === q.blankIdx && !solved;
              return (
                <span
                  key={i}
                  className={`mx-1 inline-block rounded-2xl px-2 transition-colors ${
                    isBlank
                      ? 'border-2 border-dashed border-amber-400 bg-amber-100/70 text-amber-700'
                      : i === hl
                        ? 'bg-amber-200 text-blue-800'
                        : i === q.blankIdx && solved
                          ? 'bg-emerald-100 text-emerald-800'
                          : ''
                  }`}
                >
                  {isBlank ? '  ؟  ' : w.t}
                </span>
              );
            })}
            <span className="mx-1 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500 align-middle font-sans text-base text-emerald-700">
              {q.ayah.n.toLocaleString('ar-EG')}
            </span>
          </p>
          {showTranslation && <p className="mt-2 text-center text-base text-slate-500">{q.ayah.tr}</p>}
          <div className="mt-3 flex justify-center">
            <Button color="yellow" onClick={() => playAyah(surahNo, q.ayah.n, { onWord: setHl })} label="Dengar ayat">
              <Volume2 size={22} /> Dengar Ayat
            </Button>
          </div>
        </QuranPanel>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {q.options.map((opt, idx) => {
            const isWrong = wrong.includes(idx);
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 rounded-3xl border-4 bg-white p-2 shadow transition-opacity ${
                  isWrong ? 'border-orange-200 opacity-45' : 'border-white'
                }`}
              >
                <Button
                  color="yellow"
                  label="Dengar kata"
                  onClick={() => playWord(opt.surah, opt.ayah, opt.wordIdx)}
                >
                  <Volume2 size={22} />
                </Button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={isWrong || solved}
                  onClick={() => choose(idx)}
                  className="font-quran flex-1 py-2 text-center text-3xl text-slate-900"
                >
                  {opt.text}
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
        message="Kata lengkap sempurna!"
        nextLabel="Mainkan Jodohkan Makna 🃏"
        onNext={() => navigate(`/pulau/${surahNo}/jodoh`, true)}
        secondaryAction={{
          label: 'Kembali ke Pulau',
          onClick: () => navigate(`/pulau/${surahNo}`, true),
        }}
      />
    </div>
  );
}

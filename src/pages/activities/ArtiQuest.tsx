import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, BookOpen } from 'lucide-react';
import { SURAHS, partsOf, surahOf, type Ayah } from '../../data/quran';
import { islandOf } from '../../data/islands';
import { QuranPanel, AyahText } from '../../components/AyahText';
import { BintangSays, type Mood } from '../../components/Bintang';
import { Button, ProgressDots, TopBar } from '../../components/ui';
import { RewardModal } from '../../components/RewardModal';
import { ComboBanner } from '../../components/ComboBanner';
import { playAyah, say, sfx, stopAll } from '../../services/audio';
import { praise, retry, shuffle } from '../../services/lines';
import { useGameStore, useProfile } from '../../store/useGameStore';
import { navigate } from '../../hooks/useRoute';

interface ArtiQuestion {
  title: string;
  ayah?: Ayah;
  options: { label: string; emoji?: string; correct: boolean }[];
}

function buildArtiQuestions(surahNo: number, band: 'A' | 'B', range?: [number, number]): ArtiQuestion[] {
  const surah = surahOf(surahNo);
  const isl = islandOf(surahNo);
  const nChoices = band === 'A' ? 3 : 4;
  const idx = SURAHS.findIndex((s) => s.number === surahNo);
  const neighbors = SURAHS.filter((_, i) => i !== idx && Math.abs(i - idx) <= 4);

  // Q1: Arti nama Surah
  const wrongMeanings = shuffle(neighbors.filter((s) => s.meaning !== surah.meaning)).slice(0, nChoices - 1);
  const nameQ: ArtiQuestion = {
    title: `Apa arti nama Surah ${surah.latin}?`,
    options: shuffle([
      { label: surah.meaning, emoji: isl.emoji, correct: true },
      ...wrongMeanings.map((s) => ({ label: s.meaning, emoji: islandOf(s.number).emoji, correct: false })),
    ]),
  };

  // Q2..Qn: Terjemahan ayat (scoped to selected part if chosen)
  const pool = range ? surah.ayahs.filter((a) => a.n >= range[0] && a.n <= range[1]) : surah.ayahs;
  const pickedAyahs = shuffle(pool).slice(0, band === 'A' ? 3 : 4).sort((a, b) => a.n - b.n);
  const ayahQs: ArtiQuestion[] = pickedAyahs.map((a) => {
    const wrongTrs = shuffle(
      [...surah.ayahs, ...neighbors.flatMap((ns) => ns.ayahs)]
        .map((x) => x.tr)
        .filter((tr) => tr !== a.tr),
    ).slice(0, nChoices - 1);
    return {
      title: `Apa arti Ayat ${a.n} Surah ${surah.latin}?`,
      ayah: a,
      options: shuffle([
        { label: a.tr, correct: true },
        ...wrongTrs.map((tr) => ({ label: tr, correct: false })),
      ]),
    };
  });

  return [nameQ, ...ayahQs];
}

/** Mode ArtiQuest: dedicated mastery of Surah name meaning + verse translations. */
export default function ArtiQuest({ surahNo }: { surahNo: number }) {
  const surah = surahOf(surahNo);
  const island = islandOf(surahNo);
  const profile = useProfile()!;
  const completeActivity = useGameStore((s) => s.completeActivity);
  const recordCorrect = useGameStore((s) => s.recordCorrect);
  const recordCombo = useGameStore((s) => s.recordCombo);
  const addCoins = useGameStore((s) => s.addCoins);

  const parts = partsOf(surah, profile.ageBand);
  const [partIdx, setPartIdx] = useState<number | null>(null);
  const selectedRange = partIdx !== null ? parts[partIdx] : undefined;

  const questions = useMemo(
    () => buildArtiQuestions(surahNo, profile.ageBand, selectedRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [surahNo, profile.ageBand, partIdx],
  );
  const [qi, setQi] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [bubble, setBubble] = useState<{ text: string; mood: Mood }>({
    text: `Ayo kuasai arti Surah ${surah.latin}!`,
    mood: 'happy',
  });
  const [reward, setReward] = useState<{ stars: number; gained: number; coins: number } | null>(null);

  const q = questions[qi] ?? questions[0];

  useEffect(() => {
    setWrong([]);
    setSolved(false);
    setBubble({ text: q.title, mood: 'happy' });
    (async () => {
      await say(q.title);
      if (q.ayah) await playAyah(surahNo, q.ayah.n);
    })();
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, partIdx]);

  const selectPart = (idx: number | null) => {
    setPartIdx(idx);
    setQi(0);
    setWrong([]);
    setSolved(false);
    setCombo(0);
    setBonusCoins(0);
  };

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
      setBubble({ text: `${pr} ${opt.label}`, mood: 'cheer' });
      await say(pr);
      await new Promise((r) => setTimeout(r, 400));

      if (qi + 1 < questions.length) {
        setQi(qi + 1);
      } else {
        if (nextBonus > 0) addCoins(nextBonus);
        const res = completeActivity(surahNo, 'arti', 15);
        setReward({ stars: res.newStars, gained: res.gained, coins: 15 + nextBonus });
      }
    } else {
      setCombo(0);
      setWrong((w) => [...w, idx]);
      sfx('gentle');
      setBubble({ text: retry(), mood: 'think' });
      await say(retry());
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar back={`/pulau/${surahNo}`} title={`📖 Arti Surah & Ayat · ${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        {parts.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => selectPart(null)}
              className={`rounded-2xl px-3 py-1.5 text-xs font-bold shadow-sm ${
                partIdx === null ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'
              }`}
            >
              Semua Ayat
            </button>
            {parts.map(([from, to], idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectPart(idx)}
                className={`rounded-2xl px-3 py-1.5 text-xs font-bold shadow-sm ${
                  partIdx === idx ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'
                }`}
              >
                Bagian {idx + 1} ({from}–{to})
              </button>
            ))}
          </div>
        )}
        <ProgressDots total={questions.length} current={qi} />
        <ComboBanner combo={combo} bonusCoins={bonusCoins} />
        <BintangSays text={bubble.text} mood={bubble.mood} size={70} />

        {q.ayah ? (
          <QuranPanel>
            <AyahText words={q.ayah.words} ayahNo={q.ayah.n} size="text-3xl" />
            <div className="mt-2 flex justify-center">
              <Button color="yellow" onClick={() => playAyah(surahNo, q.ayah!.n)}>
                <Volume2 size={20} /> Dengar Ayat
              </Button>
            </div>
          </QuranPanel>
        ) : (
          <section className={`rounded-3xl bg-linear-to-br ${island.color} p-5 text-center shadow`}>
            <div className="text-6xl">{island.emoji}</div>
            <p className="font-quran mt-1 text-4xl text-slate-900">{surah.name}</p>
            <p className="text-2xl font-semibold text-slate-800">{surah.latin}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-slate-700">
              <BookOpen size={16} /> {island.about}
            </p>
          </section>
        )}

        <div className="flex flex-col gap-2.5 pb-6">
          {q.options.map((opt, idx) => {
            const isWrong = wrong.includes(idx);
            return (
              <motion.button
                key={idx}
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={isWrong || solved}
                onClick={() => choose(idx)}
                className={`flex min-h-16 items-center gap-3 rounded-3xl border-4 bg-white px-4 py-3 text-left shadow transition-opacity ${
                  isWrong ? 'border-orange-200 opacity-45' : 'border-white hover:border-emerald-300'
                }`}
              >
                {opt.emoji && <span className="text-4xl">{opt.emoji}</span>}
                <span className="flex-1 text-lg font-semibold text-slate-800">{opt.label}</span>
              </motion.button>
            );
          })}
        </div>
      </main>

      <RewardModal
        open={!!reward}
        stars={reward?.stars ?? 0}
        gained={reward?.gained ?? 0}
        coins={reward?.coins ?? 15}
        message={`Kamu hafal arti ${surah.latin}! (+1 🌿)`}
        nextLabel="⚔️ Tantang Penjaga Surah!"
        onNext={() => navigate(`/pulau/${surahNo}/battle`, true)}
        secondaryAction={{ label: 'Kembali ke Pulau', onClick: () => navigate(`/pulau/${surahNo}`, true) }}
      />
    </div>
  );
}

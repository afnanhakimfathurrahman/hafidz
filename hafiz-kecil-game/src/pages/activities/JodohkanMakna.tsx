import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { surahOf } from '../../data/quran';
import { VOCAB } from '../../data/vocab';
import { BintangSays, type Mood } from '../../components/Bintang';
import { TopBar } from '../../components/ui';
import { RewardModal } from '../../components/RewardModal';
import { playWord, say, sfx, stopAll, preloadVoices } from '../../services/audio';
import { islandVoiceLines } from '../../data/voiceLines';
import { pick, praise, retry, shuffle } from '../../services/lines';
import { useGameStore, useProfile } from '../../store/useGameStore';
import { navigate } from '../../hooks/useRoute';

interface Card {
  key: string;
  pair: number;
  kind: 'arab' | 'meaning';
  ayah: number;
  word: number;
  text: string;
  emoji: string;
}

/** Mode 2: Jodohkan Makna — memory match: Arabic word ↔ picture + meaning. */
export default function JodohkanMakna({ surahNo }: { surahNo: number }) {
  const surah = surahOf(surahNo);
  const profile = useProfile()!;
  const completeActivity = useGameStore((s) => s.completeActivity);
  const recordCorrect = useGameStore((s) => s.recordCorrect);
  const band = profile.ageBand;

  const cards = useMemo(() => {
    const entries = pick(VOCAB[surahNo] ?? [], band === 'A' ? 3 : 4);
    const out: Card[] = [];
    entries.forEach(([ayah, word, emoji, meaning], pair) => {
      const w = surah.ayahs[ayah - 1].words[word - 1];
      out.push({ key: `a${pair}`, pair, kind: 'arab', ayah, word: word - 1, text: w.t, emoji });
      out.push({ key: `m${pair}`, pair, kind: 'meaning', ayah, word: word - 1, text: meaning, emoji });
    });
    return shuffle(out);
  }, [surahNo, band, surah]);

  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [bubble, setBubble] = useState<{ text: string; mood: Mood }>({
    text: 'Balik kartunya, lalu cari pasangannya!',
    mood: 'happy',
  });
  const [reward, setReward] = useState<{ stars: number; gained: number } | null>(null);

  useEffect(() => {
    preloadVoices(islandVoiceLines(surahNo));
    say(bubble.text);
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = (text: string, mood: Mood = 'happy') => {
    setBubble({ text, mood });
    say(text);
  };

  const flip = (c: Card) => {
    if (open.length >= 2 || open.includes(c.key) || matched.includes(c.pair)) return;
    sfx('tap');
    if (c.kind === 'arab') playWord(surahNo, c.ayah, c.word);
    else say(c.text);
    const next = [...open, c.key];
    setOpen(next);
    if (next.length < 2) return;

    const [a, b] = next.map((k) => cards.find((x) => x.key === k)!);
    if (a.pair === b.pair) {
      setTimeout(() => {
        sfx('correct');
        recordCorrect();
        const m = [...matched, a.pair];
        setMatched(m);
        setOpen([]);
        setWrongStreak(0);
        setHint(null);
        if (m.length * 2 === cards.length) {
          const r = completeActivity(surahNo, 'jodoh', 15);
          setTimeout(() => setReward({ stars: r.newStars, gained: r.gained }), 600);
        } else {
          const p = praise();
          const meaning = a.kind === 'meaning' ? a.text : b.text;
          setBubble({ text: `${p} ${meaning}!`, mood: 'cheer' });
          say([p, meaning]);
        }
      }, 700);
    } else {
      setTimeout(() => {
        sfx('gentle');
        setOpen([]);
        const streak = wrongStreak + 1;
        setWrongStreak(streak);
        // Hint after 2 wrong attempts: a correct pair sparkles
        if (streak >= 2) {
          const unmatched = cards.find((x) => !matched.includes(x.pair))!;
          setHint(unmatched.pair);
          speak('Lihat kartu yang berkilau!', 'think');
        } else speak(retry(), 'think');
      }, 1100);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar back={`/pulau/${surahNo}`} title={`🃏 Jodohkan Makna · ${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <BintangSays text={bubble.text} mood={bubble.mood} size={70} />
        <div className={`grid gap-3 ${band === 'A' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {cards.map((c) => {
            const shown = open.includes(c.key) || matched.includes(c.pair);
            const done = matched.includes(c.pair);
            return (
              <motion.button
                key={c.key}
                type="button"
                onClick={() => flip(c)}
                whileTap={{ scale: 0.94 }}
                animate={hint === c.pair && !shown ? { boxShadow: ['0 0 0 0 #FBBF24', '0 0 0 10px #FBBF2400'] } : {}}
                transition={hint === c.pair ? { repeat: Infinity, duration: 1 } : {}}
                className={`flex aspect-[4/5] flex-col items-center justify-center rounded-3xl border-4 p-2 shadow-md transition-colors ${
                  done
                    ? 'border-emerald-400 bg-emerald-50'
                    : shown
                      ? 'border-amber-300 bg-white'
                      : 'border-blue-300 bg-linear-to-br from-blue-400 to-purple-500'
                }`}
              >
                {!shown ? (
                  <span className="text-5xl">⭐</span>
                ) : c.kind === 'arab' ? (
                  <span className="font-quran text-4xl leading-normal text-slate-900">{c.text}</span>
                ) : (
                  <>
                    <span className="text-6xl">{c.emoji}</span>
                    <span className="mt-1 text-lg font-semibold text-slate-700">{c.text}</span>
                  </>
                )}
              </motion.button>
            );
          })}
        </div>
      </main>
      <RewardModal
        open={!!reward}
        stars={reward?.stars ?? 0}
        gained={reward?.gained ?? 0}
        coins={15}
        message="Semua cocok!"
        onNext={() => navigate(`/pulau/${surahNo}`, true)}
      />
    </div>
  );
}

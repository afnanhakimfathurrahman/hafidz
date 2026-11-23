import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { SURAHS, surahOf, ayahText, chunksOf, partsOf, type Ayah, type Word } from '../../data/quran';
import { AyahText, QuranPanel } from '../../components/AyahText';
import { BintangSays, type Mood } from '../../components/Bintang';
import { Button, Modal, TopBar, ProgressDots } from '../../components/ui';
import { RewardModal } from '../../components/RewardModal';
import { playAyah, say, sfx, stopAll } from '../../services/audio';
import { praise, retry, shuffle } from '../../services/lines';
import { useGameStore, useProfile } from '../../store/useGameStore';
import { navigate } from '../../hooks/useRoute';

interface Option {
  surah: number;
  ayah: Ayah;
}
interface Question {
  n: number; // prompt ayah
  answer: Ayah;
  options: Option[];
  build: boolean; // word-builder (Band B)
}

// Compare Arabic words without harakat / Qur'anic marks / alif variants
const norm = (w: string) =>
  w
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');

/** How much `b` looks/sounds like `a`: shared words, same fasilah (ending sound), similar length. */
function similarity(a: Ayah, b: Ayah): number {
  const wa = a.words.map((w) => norm(w.t));
  const wb = b.words.map((w) => norm(w.t));
  const setB = new Set(wb);
  const shared = wa.filter((w) => setB.has(w)).length / Math.max(wa.length, wb.length);
  const end = (ws: string[]) => ws[ws.length - 1]?.slice(-2) ?? '';
  const rhyme = end(wa) === end(wb) ? 0.4 : 0;
  const len = Math.abs(wa.length - wb.length) / Math.max(wa.length, wb.length);
  return shared + rhyme - 0.5 * len;
}

const BUILD_CHUNK = 5; // words per builder step, so long ayahs stay manageable

function buildQuestions(surahNo: number, band: 'A' | 'B', review: boolean, timed: boolean): Question[] {
  const surah = surahOf(surahNo);
  const text = (a: Ayah) => ayahText(a);
  const total = timed ? 8 : review ? 5 : band === 'A' ? 5 : 6;
  const nChoices = band === 'A' ? 3 : 4;

  // Skip prompts whose text repeats elsewhere with a different continuation (e.g. Al-Kafirun 3 & 5)
  const candidates = surah.ayahs.slice(0, -1).filter((a) =>
    surah.ayahs.every(
      (b, i) => b.n === a.n || text(b) !== text(a) || text(surah.ayahs[i + 1] ?? b) === text(surah.ayahs[a.n]),
    ),
  );
  const prompts = shuffle(candidates).slice(0, total).sort((a, b) => a.n - b.n);

  // Band A: neighbouring surahs supply distractors for short surahs.
  // Band B: the whole Juz is the pool, ranked by similarity (mutasyabihat) for a real challenge.
  const idx = SURAHS.findIndex((s) => s.number === surahNo);
  const others = band === 'B' ? SURAHS.filter((s) => s.number !== surahNo) : [SURAHS[idx - 1], SURAHS[idx + 1], SURAHS[idx + 2], SURAHS[idx - 2]].filter(Boolean);

  return prompts.map((p) => {
    const answer = surah.ayahs[p.n];
    const seen = new Set([text(answer), text(p)]);
    const pool: Option[] = [];
    const add = (surahN: number, a: Ayah) => {
      if (seen.has(text(a))) return;
      seen.add(text(a));
      pool.push({ surah: surahN, ayah: a });
    };
    shuffle(surah.ayahs).forEach((a) => add(surahNo, a));
    if (band === 'B' || pool.length < nChoices - 1) others.forEach((s) => shuffle(s.ayahs).forEach((a) => add(s.number, a)));
    let distractors: Option[];
    if (band === 'B') {
      distractors = pool
        .map((o) => ({ o, score: similarity(answer, o.ayah) + (o.surah === surahNo ? 0.15 : 0) + Math.random() * 0.1 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, nChoices - 1)
        .map((x) => x.o);
    } else {
      // Prefer distractors of similar length so the answer doesn't stand out
      const len = answer.words.length;
      distractors = shuffle(
        pool
          .sort((a, b) => Math.abs(a.ayah.words.length - len) - Math.abs(b.ayah.words.length - len))
          .slice(0, nChoices + 1),
      ).slice(0, nChoices - 1);
    }
    const options = shuffle([{ surah: surahNo, ayah: answer }, ...distractors]);
    const build = band === 'B' && !review && answer.words.length >= 2 && (!timed || answer.words.length <= 10);
    return { n: p.n, answer, options, build };
  });
}

/** A word block that can be tapped or dragged into the drop zone. */
function WordChip({ word, onPick, dropRef }: { word: Word; onPick: () => void; dropRef: RefObject<HTMLDivElement | null> }) {
  const dragged = useRef(false);
  return (
    <motion.button
      type="button"
      drag
      dragSnapToOrigin
      dragElastic={0.8}
      whileTap={{ scale: 0.92 }}
      whileDrag={{ scale: 1.1, zIndex: 20 }}
      style={{ touchAction: 'none' }}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={(e) => {
        const pt = 'changedTouches' in e ? e.changedTouches[0] : (e as PointerEvent);
        const r = dropRef.current?.getBoundingClientRect();
        if (pt && r && pt.clientX >= r.left && pt.clientX <= r.right && pt.clientY >= r.top && pt.clientY <= r.bottom) onPick();
        setTimeout(() => (dragged.current = false), 0);
      }}
      onClick={() => !dragged.current && onPick()}
      className="relative flex min-h-14 min-w-14 cursor-grab items-center justify-center rounded-3xl bg-white px-5 py-2 shadow-[0_5px_0] shadow-slate-400/40"
    >
      <span className="font-quran text-3xl leading-normal">{word.t}</span>
    </motion.button>
  );
}

/**
 * Mode 1: Sambung Ayat. With `review`, the prompt is audio-only (murojaah).
 * With `timed` (Band B, opt-in "Tantangan Waktu"), each question has a calm countdown; no stars at stake.
 * With `skip` ("Tes Lompat Pulau"), an audio-only test that clears a foggy island for kids who already know it.
 */
export default function SambungAyat({
  surahNo,
  review: reviewMode = false,
  timed = false,
  skip = false,
}: {
  surahNo: number;
  review?: boolean;
  timed?: boolean;
  skip?: boolean;
}) {
  const review = reviewMode || skip; // audio-only prompt
  const surah = surahOf(surahNo);
  const profile = useProfile()!;
  const completeActivity = useGameStore((s) => s.completeActivity);
  const failReview = useGameStore((s) => s.failReview);
  const recordCorrect = useGameStore((s) => s.recordCorrect);
  const addCoins = useGameStore((s) => s.addCoins);
  const recordChallenge = useGameStore((s) => s.recordChallenge);
  const passSkipTest = useGameStore((s) => s.passSkipTest);
  const showWordMeaning = useGameStore((s) => s.settings.showWordMeaning);

  const [round, setRound] = useState(0);
  const questions = useMemo(() => buildQuestions(surahNo, profile.ageBand, review, timed), [surahNo, profile.ageBand, review, timed, round]);
  const [qi, setQi] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [wrongPick, setWrongPick] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [hl, setHl] = useState(-1);
  const [built, setBuilt] = useState<number[]>([]);
  const [bubble, setBubble] = useState<{ text: string; mood: Mood }>({ text: '', mood: 'happy' });
  const [end, setEnd] = useState<null | { pass: boolean; stars: number; gained: number }>(null);
  const [challengeEnd, setChallengeEnd] = useState<null | { score: number; best: number; coins: number }>(null);
  const [deadline, setDeadline] = useState<{ at: number; ms: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const dropRef = useRef<HTMLDivElement>(null);

  const q = questions[qi];
  // Builder works chunk by chunk: only the words of the current chunk are offered
  const chunks = useMemo(() => chunksOf(q.answer, BUILD_CHUNK), [q]);
  const chunkIdx = chunks.findIndex(([, to]) => built.length < to);
  const chips = useMemo(() => {
    const [from, to] = chunks[Math.max(0, chunkIdx)];
    return shuffle(Array.from({ length: to - from }, (_, i) => from + i));
  }, [chunks, chunkIdx]);

  const speak = (text: string, mood: Mood = 'happy') => {
    setBubble({ text, mood });
    return say(text);
  };

  const playPrompt = () => playAyah(surahNo, q.n, { onWord: setHl });

  useEffect(() => {
    setMistakes(0);
    setWrongPick([]);
    setSolved(false);
    setBuilt([]);
    setDeadline(null);
    let live = true;
    (async () => {
      await speak(
        qi === 0
          ? q.build
            ? 'Dengarkan, lalu susun kata-kata ayat berikutnya!'
            : 'Dengarkan, lalu pilih ayat berikutnya!'
          : 'Ayat apa selanjutnya?',
      );
      await playPrompt();
      if (live && timed) {
        const ms = (q.build ? 6 + 2 * q.answer.words.length : 8 + 1.2 * q.answer.words.length) * 1000;
        setDeadline({ at: Date.now() + ms, ms });
      }
    })();
    return () => {
      live = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const advance = async (score: number) => {
    await new Promise((r) => setTimeout(r, 500));
    if (qi + 1 < questions.length) setQi(qi + 1);
    else finish(score);
  };

  const onCorrect = async () => {
    setSolved(true);
    setDeadline(null);
    const score = firstTry + (mistakes === 0 ? 1 : 0);
    if (mistakes === 0) setFirstTry(score);
    recordCorrect();
    sfx('correct');
    await speak(praise(), 'cheer');
    await playAyah(surahNo, q.answer.n, { onWord: setHl });
    await advance(score);
  };

  const onWrong = (i?: number) => {
    setMistakes((m) => m + 1);
    if (i !== undefined) setWrongPick((w) => [...w, i]);
    sfx('gentle');
    // In the challenge the clock keeps running, so don't spend it on a replay
    if (timed) setBubble({ text: retry(), mood: 'think' });
    else speak(retry(), 'think').then(playPrompt);
  };

  const onTimeUp = async () => {
    setSolved(true);
    setDeadline(null);
    sfx('gentle');
    await speak('Waktunya habis! Tidak apa-apa, ini jawabannya.', 'think');
    await playAyah(surahNo, q.answer.n, { onWord: setHl });
    await advance(firstTry);
  };

  // Countdown tick
  useEffect(() => {
    if (!deadline || solved) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [deadline, solved]);
  useEffect(() => {
    if (deadline && !solved && now >= deadline.at) onTimeUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const finish = (score: number) => {
    if (timed) {
      const coins = score * 3;
      addCoins(coins);
      const best = recordChallenge(surahNo, score);
      setChallengeEnd({ score, best, coins });
      sfx('coin');
      speak(score > best ? 'MasyaAllah, rekor baru!' : score >= questions.length / 2 ? praise() : 'Bagus! Ayo coba lagi supaya makin cepat.', 'cheer');
      return;
    }
    const ratio = score / questions.length;
    if (skip) {
      const pass = ratio >= 0.8;
      if (pass) {
        const r = passSkipTest(surahNo, partsOf(surah, profile.ageBand).length);
        setEnd({ pass, stars: r.newStars, gained: r.gained });
      } else {
        addCoins(5);
        setEnd({ pass, stars: 0, gained: 0 });
        speak('Belum lulus, tidak apa-apa! Yuk pelajari pulau sebelumnya dulu.', 'think');
      }
      return;
    }
    const pass = ratio >= (review ? 0.6 : 0.5);
    if (pass) {
      const r = completeActivity(surahNo, review ? 'review' : 'sambung', review ? 20 : 15);
      setEnd({ pass, stars: r.newStars, gained: r.gained });
    } else {
      if (review) failReview(surahNo);
      addCoins(5);
      setEnd({ pass, stars: 0, gained: 0 });
      speak('Hampir berhasil! Yuk dengarkan lagi lalu coba sekali lagi.', 'think');
    }
  };

  const pickChip = (wordIdx: number) => {
    if (solved) return;
    const expected = built.length;
    // Accept any chip whose word equals the expected word (repeated words are interchangeable)
    if (q.answer.words[wordIdx].t === q.answer.words[expected].t) {
      sfx('tap');
      const next = [...built, wordIdx];
      setBuilt(next);
      if (next.length === q.answer.words.length) onCorrect();
    } else onWrong();
  };

  const restart = () => {
    setEnd(null);
    setChallengeEnd(null);
    setQi(0);
    setFirstTry(0);
    setRound((r) => r + 1);
  };

  const promptAyah = surah.ayahs[q.n - 1];
  const big = profile.ageBand === 'A';

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar back={`/pulau/${surahNo}`} title={`${skip ? '🚀 Tes Lompat Pulau' : timed ? '⏱️ Tantangan Waktu' : review ? '💭 Murojaah' : '🧩 Sambung Ayat'} · ${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 p-4">
        <ProgressDots total={questions.length} current={qi} />
        {timed && (
          <div className="h-4 w-full overflow-hidden rounded-full bg-white/80 shadow-inner" aria-label="Sisa waktu">
            {deadline && !solved && (
              <div
                className={`h-full rounded-full transition-[width] duration-100 ${deadline.at - now < deadline.ms * 0.3 ? 'bg-amber-400' : 'bg-sky-400'}`}
                style={{ width: `${Math.max(0, Math.min(100, ((deadline.at - now) / deadline.ms) * 100))}%` }}
              />
            )}
          </div>
        )}
        {bubble.text && <BintangSays text={bubble.text} mood={bubble.mood} size={70} />}

        <QuranPanel>
          {review && !solved ? (
            <div className="flex justify-center">
              <Button big color="yellow" onClick={playPrompt} label="Putar ayat">
                <Volume2 size={36} /> Ayat {q.n}
              </Button>
            </div>
          ) : (
            <AyahText
              words={solved ? q.answer.words : promptAyah.words}
              ayahNo={solved ? q.answer.n : q.n}
              highlight={hl}
              meanings={showWordMeaning}
              size={big ? 'text-4xl' : 'text-3xl'}
            />
          )}
          {!review && !solved && (
            <div className="mt-2 flex justify-center">
              <Button color="yellow" onClick={playPrompt} label="Dengar lagi">
                <Volume2 size={24} /> Dengar lagi
              </Button>
            </div>
          )}
        </QuranPanel>

        {!solved && q.build && (
          <>
            <div ref={dropRef} className="min-h-20 rounded-3xl border-4 border-dashed border-emerald-300 bg-white/70 p-3">
              <p className="font-quran text-center text-3xl">{built.map((i) => q.answer.words[i].t).join(' ') || ' '}</p>
              {chunks.length > 1 && (
                <p className="text-center text-sm text-slate-500">
                  Bagian {chunkIdx + 1} dari {chunks.length}
                </p>
              )}
            </div>
            <p className="text-center text-sm text-slate-500">Ketuk atau seret kata ke kotak di atas</p>
            <div dir="rtl" className="flex flex-wrap justify-center gap-2">
              {chips.map((i) =>
                built.includes(i) ? null : <WordChip key={i} word={q.answer.words[i]} dropRef={dropRef} onPick={() => pickChip(i)} />,
              )}
            </div>
          </>
        )}

        {!solved && !q.build && (
          <div className="flex flex-col gap-3 pb-4">
            {q.options.map((o, i) => {
              const wrong = wrongPick.includes(i);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-3xl border-4 bg-white p-2 shadow transition-colors ${
                    wrong ? 'border-orange-200 opacity-50' : 'border-white'
                  }`}
                >
                  <Button
                    color="yellow"
                    label="Dengar pilihan"
                    onClick={() => playAyah(o.surah, o.ayah.n)}
                  >
                    <Volume2 size={24} />
                  </Button>
                  <button
                    type="button"
                    disabled={wrong}
                    onClick={() => (o.ayah === q.answer ? onCorrect() : onWrong(i))}
                    className={`font-quran flex-1 px-2 text-center leading-[2] text-slate-900 ${
                      o.ayah.words.length > 12 ? 'text-xl' : 'text-3xl'
                    }`}
                  >
                    {ayahText(o.ayah)}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <RewardModal
        open={!!end?.pass}
        stars={end?.stars ?? 0}
        gained={end?.gained ?? 0}
        coins={skip ? 20 : review ? 20 : 15}
        message={skip ? 'MasyaAllah, kamu sudah hafal! Kabutnya hilang.' : review ? 'Murojaah berhasil!' : 'Sambung Ayat selesai!'}
        onNext={() => navigate(`/pulau/${surahNo}`, true)}
      />
      <Modal open={!!challengeEnd}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-6xl">⏱️</div>
          <h2 className="text-2xl font-semibold">
            {challengeEnd && challengeEnd.score > challengeEnd.best ? 'Rekor baru!' : 'Tantangan selesai!'}
          </h2>
          <p className="text-xl text-slate-700">
            {challengeEnd?.score} / {questions.length} benar tepat waktu
          </p>
          <p className="text-slate-500">Rekor: {Math.max(challengeEnd?.score ?? 0, challengeEnd?.best ?? 0)} / {questions.length}</p>
          <p className="text-xl font-semibold text-amber-500">+{challengeEnd?.coins} 🪙</p>
          <Button big color="green" className="w-full" onClick={restart}>
            Main Lagi
          </Button>
          <Button color="white" className="w-full" onClick={() => navigate(`/pulau/${surahNo}`, true)}>
            Kembali ke Pulau
          </Button>
        </div>
      </Modal>
      <Modal open={!!end && !end.pass}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-6xl">💪</div>
          <h2 className="text-2xl font-semibold">{skip ? 'Belum lulus' : 'Hampir berhasil!'}</h2>
          <p className="text-slate-600">
            {skip
              ? 'Tidak apa-apa! Pelajari dulu pulau sebelumnya, nanti kabutnya hilang sendiri.'
              : 'Yuk, dengarkan lagi lalu coba sekali lagi. Kamu pasti bisa!'}
          </p>
          <p className="text-xl font-semibold text-amber-500">+5 🪙</p>
          <Button big color="green" className="w-full" onClick={restart}>
            Coba Lagi
          </Button>
          <Button color="white" className="w-full" onClick={() => navigate(skip ? '/' : `/pulau/${surahNo}`, true)}>
            {skip ? 'Kembali ke Peta' : 'Kembali ke Pulau'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

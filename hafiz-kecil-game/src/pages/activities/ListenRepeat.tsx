import { useEffect, useRef, useState } from 'react';
import { Volume2, Mic, Square, Play, Check } from 'lucide-react';
import { surahOf, chunksOf, partsOf, BASMALAH } from '../../data/quran';
import { AyahText, QuranPanel, type HideLevel, type KeyWord } from '../../components/AyahText';
import { VOCAB } from '../../data/vocab';
import { BintangSays, type Mood } from '../../components/Bintang';
import { Button, TopBar, ProgressDots } from '../../components/ui';
import { RewardModal } from '../../components/RewardModal';
import { playAyah, playWord, say, stopAll, sfx, toast } from '../../services/audio';
import { L } from '../../data/voiceLines';
import { canRecord, startRecording, saveRecording, playBlob } from '../../services/recorder';
import { praise } from '../../services/lines';
import { useGameStore, useProfile, useProgress } from '../../store/useGameStore';
import { navigate } from '../../hooks/useRoute';

type Phase = 'listen' | 'together' | 'alone';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Mode 0: Dengar & Ulangi — talaqqi style listen, repeat, then recall with words fading away. */
export default function ListenRepeat({ surahNo, part: partParam }: { surahNo: number; part?: number }) {
  const surah = surahOf(surahNo);
  const profile = useProfile()!;
  const progress = useProgress();
  const settings = useGameStore((s) => s.settings);
  const completePart = useGameStore((s) => s.completePart);

  const parts = partsOf(surah, profile.ageBand);
  const firstOpen = parts.findIndex((_, i) => !(progress.parts[surahNo] ?? []).includes(i));
  const [partIdx] = useState(() => partParam ?? (firstOpen === -1 ? 0 : firstOpen));
  const [from, to] = parts[partIdx];

  // Steps: every chunk of every ayah in this part
  const maxWords = profile.ageBand === 'A' ? 4 : 7;
  const steps = [];
  for (let n = from; n <= to; n++) for (const c of chunksOf(surah.ayahs[n - 1], maxWords)) steps.push({ n, c });

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('listen');
  const [hl, setHl] = useState(-1);
  const [bubble, setBubble] = useState<{ text: string; mood: Mood }>({ text: 'Dengarkan baik-baik ya!', mood: 'happy' });
  const [rec, setRec] = useState<null | (() => Promise<Blob>)>(null);
  const [myVoice, setMyVoice] = useState<Blob | null>(null);
  const [reward, setReward] = useState<{ stars: number; gained: number } | null>(null);
  // Each guided sequence gets an id; tapping any button starts a new one, which silently ends the old one
  const runId = useRef(0);

  const cur = steps[step];
  const ayah = surah.ayahs[cur.n - 1];
  const isWhole = cur.c[0] === 0 && cur.c[1] === ayah.words.length;
  const hide: HideLevel = phase === 'listen' ? 0 : phase === 'together' ? 1 : 2;

  // Words from this step that later appear as cards in Jodohkan Makna
  const keyWords: Record<number, KeyWord> = {};
  for (const [a, w, emoji, meaning] of VOCAB[surahNo] ?? [])
    if (a === cur.n && w - 1 >= cur.c[0] && w - 1 < cur.c[1]) keyWords[w - 1] = { emoji, meaning };
  const keyList = Object.entries(keyWords).map(([i, k]) => ({ i: Number(i), ...k }));

  const hearKeyWord = async (i: number, k: KeyWord) => {
    const id = interrupt();
    setBubble({ text: `${k.emoji} ${ayah.words[i].t} artinya ${k.meaning}`, mood: 'happy' });
    setHl(i);
    await playWord(surahNo, cur.n, i);
    if (runId.current !== id) return;
    setHl(-1);
    await say(`Artinya ${k.meaning}`);
  };

  const speak = async (text: string, mood: Mood = 'happy') => {
    setBubble({ text, mood });
    await say(text);
  };

  const play = async (id: number, times = 1) => {
    for (let i = 0; i < times && runId.current === id; i++) {
      const ok = await playAyah(surahNo, cur.n, { from: cur.c[0], to: cur.c[1], onWord: setHl });
      if (!ok) return false;
      await wait(700);
    }
    return true;
  };

  const interrupt = () => {
    runId.current++;
    stopAll();
    setHl(-1);
    return runId.current;
  };

  // Guided sequence for each step: listen N times, read together, then alone
  useEffect(() => {
    const id = interrupt();
    const live = () => runId.current === id;
    (async () => {
      setPhase('listen');
      setMyVoice(null);
      await speak(step === 0 ? L.listenFirst : L.listenAgain);
      if (!live()) return;
      await play(id, settings.repeat);
      if (!live()) return;
      setPhase('together');
      await speak('Sekarang giliranmu! Baca bersama-sama.');
      if (!live()) return;
      await play(id, 1);
      if (!live()) return;
      setPhase('alone');
      await speak('Sekarang coba baca sendiri. Kamu pasti bisa!', 'think');
    })();
    return () => {
      runId.current++;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const help = async () => {
    const id = interrupt();
    setPhase('together');
    setBubble({ text: 'Dengarkan lagi, lalu ikuti ya!', mood: 'happy' });
    await play(id, 1);
    if (runId.current === id) {
      setPhase('alone');
      setBubble({ text: 'Sekarang coba baca sendiri!', mood: 'think' });
    }
  };

  const toggleRecord = async () => {
    if (rec) {
      await stopRecording();
      speak('MasyaAllah, ayo dengarkan suaramu!', 'cheer');
    } else {
      try {
        interrupt();
        const stop = await startRecording();
        setRec(() => stop);
        setBubble({ text: 'Merekam... Ayo baca! Ketuk Stop kalau sudah.', mood: 'happy' });
      } catch {
        setRec(null);
        toast('Mikrofon tidak bisa dipakai. Izinkan mikrofon di browser ya.');
      }
    }
  };

  const stopRecording = async () => {
    if (!rec) return;
    const blob = await rec();
    setRec(null);
    setMyVoice(blob);
    saveRecording(profile.id, surahNo, cur.n, blob);
  };

  const next = async () => {
    await stopRecording();
    interrupt();
    sfx('correct');
    if (step + 1 < steps.length) {
      setBubble({ text: praise(), mood: 'cheer' });
      setStep(step + 1);
      return;
    }
    const r = completePart(surahNo, partIdx, parts.length);
    setReward({ stars: r.newStars, gained: r.gained });
  };

  const showBasmalah = step === 0 && cur.n === 1 && cur.c[0] === 0;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar back={`/pulau/${surahNo}`} title={`🎧 ${surah.latin}${parts.length > 1 ? ` · Bagian ${partIdx + 1}` : ''}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <ProgressDots total={steps.length} current={step} />
        <BintangSays text={bubble.text} mood={bubble.mood} />

        <QuranPanel>
          {showBasmalah && <p className="font-quran mb-2 text-center text-2xl text-slate-500">{BASMALAH}</p>}
          <AyahText
            words={ayah.words}
            range={isWhole ? undefined : cur.c}
            highlight={hl}
            hide={hide}
            ayahNo={cur.n}
            meanings={settings.showWordMeaning}
            keyWords={keyWords}
            size={profile.ageBand === 'A' ? 'text-5xl' : 'text-4xl'}
          />
          {settings.showTranslation && (
            <p className="mt-3 text-center text-base text-slate-500">{ayah.tr}</p>
          )}
        </QuranPanel>

        {keyList.length > 0 && (
          <section className="rounded-3xl bg-purple-50 p-3 shadow-inner">
            <p className="mb-2 text-center font-semibold text-purple-700">🃏 Kata kunci (nanti ada di Jodohkan Makna)</p>
            <div className="flex flex-wrap justify-center gap-2">
              {keyList.map((k) => (
                <Button key={k.i} color="white" onClick={() => hearKeyWord(k.i, k)} label={`Dengar kata ${k.meaning}`}>
                  <span className="text-3xl">{k.emoji}</span>
                  <span className="font-quran text-2xl leading-normal">{ayah.words[k.i].t}</span>
                  <span className="text-base text-purple-700">{k.meaning}</span>
                </Button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-auto grid grid-cols-2 gap-3 pb-4">
          <Button big color="yellow" onClick={help} label="Dengar lagi">
            <Volume2 size={30} /> Dengar
          </Button>
          {canRecord() && (
            <Button big color={rec ? 'rose' : 'purple'} onClick={toggleRecord} label="Rekam suaraku">
              {rec ? <Square size={28} /> : <Mic size={30} />} {rec ? 'Stop' : 'Rekam'}
            </Button>
          )}
          {myVoice && (
            <Button color="white" className="col-span-2" onClick={() => (interrupt(), playBlob(myVoice))}>
              <Play size={24} /> Dengar suaraku
            </Button>
          )}
          <Button big color="green" className="col-span-2" onClick={next}>
            <Check size={32} /> Sudah Hafal!
          </Button>
        </div>
      </main>
      <RewardModal
        open={!!reward}
        stars={reward?.stars ?? 0}
        gained={reward?.gained ?? 0}
        coins={10}
        message={partIdx + 1 < parts.length ? L.partDone : L.allDone}
        onNext={() => navigate(`/pulau/${surahNo}`, true)}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Play, Square, Eye, EyeOff, Volume2, Repeat } from 'lucide-react';
import { surahOf, partsOf, BASMALAH } from '../../data/quran';
import { islandOf } from '../../data/islands';
import { AyahText, QuranPanel } from '../../components/AyahText';
import { BintangSays } from '../../components/Bintang';
import { Button, TopBar } from '../../components/ui';
import { playAyah, playWord, stopAll, say } from '../../services/audio';
import { useGameStore, useProfile } from '../../store/useGameStore';

/** Mode Mushaf & Tasmi': full Surah reader with synchronized word highlight, part selector, and blur-to-recite self-test. */
export default function MushafTasmi({ surahNo }: { surahNo: number }) {
  const surah = surahOf(surahNo);
  const island = islandOf(surahNo);
  const profile = useProfile()!;
  const settings = useGameStore((s) => s.settings);
  const parts = partsOf(surah, profile.ageBand);

  const [partIdx, setPartIdx] = useState<number | 'all'>('all');
  const [tasmi, setTasmi] = useState(false);
  const [peek, setPeek] = useState<Record<number, boolean>>({});
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [hlWord, setHlWord] = useState(-1);
  const [loop, setLoop] = useState(false);
  const [hintText, setHintText] = useState(`Baca atau aktifkan Mode Tasmi' untuk menguji hafalan ${surah.latin}!`);

  const runId = useRef(0);
  const loopRef = useRef(false);
  loopRef.current = loop;
  const ayahRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [from, to] = partIdx === 'all' ? [1, surah.count] : parts[partIdx];
  const visibleAyahs = surah.ayahs.filter((a) => a.n >= from && a.n <= to);

  useEffect(() => () => {
    runId.current++;
    stopAll();
  }, []);

  const stopPlay = () => {
    runId.current++;
    setActiveAyah(null);
    setHlWord(-1);
    stopAll();
  };

  const playRange = async () => {
    if (activeAyah !== null) {
      stopPlay();
      return;
    }
    const id = ++runId.current;
    do {
      for (const a of visibleAyahs) {
        if (runId.current !== id) return;
        setActiveAyah(a.n);
        setHlWord(-1);
        ayahRefs.current[a.n]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const ok = await playAyah(surahNo, a.n, { onWord: setHlWord });
        if (!ok || runId.current !== id) {
          if (runId.current === id) {
            setActiveAyah(null);
            setHlWord(-1);
          }
          return;
        }
      }
    } while (loopRef.current && runId.current === id);
    if (runId.current === id) {
      setActiveAyah(null);
      setHlWord(-1);
    }
  };

  const playSingle = async (ayahNo: number) => {
    if (activeAyah === ayahNo) {
      stopPlay();
      return;
    }
    const id = ++runId.current;
    setActiveAyah(ayahNo);
    setHlWord(-1);
    await playAyah(surahNo, ayahNo, { onWord: setHlWord });
    if (runId.current === id) {
      setActiveAyah(null);
      setHlWord(-1);
    }
  };

  const hearWord = async (ayahNo: number, wordIdx: number) => {
    const id = ++runId.current;
    setActiveAyah(ayahNo);
    setHlWord(wordIdx);
    const w = surah.ayahs[ayahNo - 1].words[wordIdx];
    if (w.m) setHintText(`${w.t} — ${w.m}`);
    await playWord(surahNo, ayahNo, wordIdx);
    if (runId.current === id) {
      setActiveAyah(null);
      setHlWord(-1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar back={`/pulau/${surahNo}`} title={`📖 Mushaf & Tasmi' · ${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 pb-10">
        <section className={`rounded-3xl bg-linear-to-r ${island.color} p-4 text-center shadow`}>
          <p className="font-quran text-4xl text-slate-900">{surah.name}</p>
          <h1 className="text-xl font-bold text-slate-800">
            {surah.latin} · Arti: {surah.meaning} ({surah.count} ayat)
          </h1>
          <p className="mt-1 text-sm text-slate-700">{BASMALAH}</p>
        </section>

        <BintangSays text={hintText} size={62} />

        {/* Controls: Play Sequence, Loop, Tasmi' Toggle */}
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-white p-3 shadow">
          <Button color={activeAyah !== null ? 'rose' : 'blue'} onClick={playRange}>
            {activeAyah !== null ? <Square size={20} /> : <Play size={20} />}
            <span>{activeAyah !== null ? `Stop (Ayat ${activeAyah})` : partIdx === 'all' ? 'Putar Semua' : `Putar Ayat ${from}–${to}`}</span>
          </Button>

          <Button color={loop ? 'green' : 'white'} onClick={() => setLoop((v) => !v)} label="Ulang terus">
            <Repeat size={18} /> {loop ? 'Ulang: Ya' : '1x'}
          </Button>

          <Button
            color={tasmi ? 'purple' : 'yellow'}
            onClick={() => {
              const next = !tasmi;
              setTasmi(next);
              setPeek({});
              const msg = next
                ? "Mode Tasmi' aktif! Coba baca sendiri ayat yang disembunyikan, lalu ketuk Intip untuk mengecek."
                : 'Mode Mushaf aktif! Ketuk kata Arab mana saja untuk dengar arti dan pengucapannya.';
              setHintText(msg);
              say(msg);
            }}
          >
            {tasmi ? <Eye size={20} /> : <EyeOff size={20} />}
            <span>{tasmi ? 'Tampilkan Teks' : "Mode Tasmi' (Tes Hafalan)"}</span>
          </Button>
        </section>

        {/* Part Filter for Multi-Part Surahs */}
        {parts.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Button
              color={partIdx === 'all' ? 'blue' : 'white'}
              onClick={() => {
                stopPlay();
                setPartIdx('all');
              }}
            >
              Semua ({surah.count} ayat)
            </Button>
            {parts.map(([f, t], i) => (
              <Button
                key={i}
                color={partIdx === i ? 'blue' : 'white'}
                onClick={() => {
                  stopPlay();
                  setPartIdx(i);
                }}
              >
                Bagian {i + 1} ({f}–{t})
              </Button>
            ))}
          </div>
        )}

        {/* Ayahs List */}
        <div className="flex flex-col gap-3">
          {visibleAyahs.map((a) => {
            const isPlaying = activeAyah === a.n;
            const isHidden = tasmi && !peek[a.n];
            return (
              <div
                key={a.n}
                ref={(el) => {
                  ayahRefs.current[a.n] = el;
                }}
                className={`transition-all ${isPlaying ? 'rounded-[2rem] ring-4 ring-amber-400' : ''}`}
              >
                <QuranPanel>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      Ayat {a.n}
                    </span>
                    <div className="flex items-center gap-2">
                      {tasmi && (
                        <Button
                          color={peek[a.n] ? 'green' : 'white'}
                          className="min-h-10 px-3 py-1 text-sm"
                          onClick={() => setPeek((pk) => ({ ...pk, [a.n]: !pk[a.n] }))}
                        >
                          {peek[a.n] ? <EyeOff size={16} /> : <Eye size={16} />}
                          <span>{peek[a.n] ? 'Sembunyi' : 'Intip'}</span>
                        </Button>
                      )}
                      <Button
                        color={isPlaying ? 'rose' : 'yellow'}
                        className="min-h-10 px-3 py-1 text-sm"
                        onClick={() => playSingle(a.n)}
                      >
                        {isPlaying ? <Square size={16} /> : <Volume2 size={16} />}
                        <span>{isPlaying ? 'Stop' : 'Dengar'}</span>
                      </Button>
                    </div>
                  </div>

                  <AyahText
                    words={a.words}
                    ayahNo={a.n}
                    highlight={isPlaying ? hlWord : -1}
                    hide={isHidden ? 2 : 0}
                    onWord={isHidden ? undefined : (wi) => hearWord(a.n, wi)}
                    meanings={!isHidden && settings.showWordMeaning}
                    size={profile.ageBand === 'A' ? 'text-4xl' : 'text-3xl'}
                  />

                  {settings.showTranslation && (
                    <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-center text-sm text-slate-600">
                      {a.tr}
                    </p>
                  )}
                </QuranPanel>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

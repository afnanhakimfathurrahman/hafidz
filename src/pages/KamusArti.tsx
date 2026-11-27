import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, RotateCw, BookOpen, Layers } from 'lucide-react';
import { SURAHS } from '../data/quran';
import { islandOf } from '../data/islands';
import { VOCAB } from '../data/vocab';
import { ZONES, zoneOf } from '../data/zones';
import { Button, TopBar } from '../components/ui';
import { BintangSays } from '../components/Bintang';
import { useProgress } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { playAyah, playWord, say, sfx } from '../services/audio';

type ViewMode = 'flashcard' | 'list';

/** Kamus & Flashcard Arti 37 Surah Juz 30 + Kosakata Kunci. */
export default function KamusArti() {
  const p = useProgress();
  const [mode, setMode] = useState<ViewMode>('flashcard');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const filtered = useMemo(
    () => (zoneFilter === 'all' ? SURAHS : SURAHS.filter((s) => zoneOf(s.number).id === zoneFilter)),
    [zoneFilter],
  );

  const safeIdx = Math.min(cardIdx, Math.max(0, filtered.length - 1));
  const cur = filtered[safeIdx] ?? SURAHS[0];
  const isl = islandOf(cur.number);
  const words = VOCAB[cur.number] ?? [];

  const switchZone = (zId: string) => {
    setZoneFilter(zId);
    setCardIdx(0);
    setFlipped(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="📚 Kamus Arti Juz 30" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 pb-10">
        <BintangSays
          text="Ketuk kartu untuk melihat arti surat, hikmah, dan kosakata kuncinya!"
          size={64}
        />

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button color={mode === 'flashcard' ? 'blue' : 'white'} onClick={() => setMode('flashcard')}>
            <Layers size={20} /> Flashcard Arti
          </Button>
          <Button color={mode === 'list' ? 'blue' : 'white'} onClick={() => setMode('list')}>
            <BookOpen size={20} /> Daftar 37 Surah
          </Button>
        </div>

        {/* Zone Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => switchZone('all')}
            className={`shrink-0 rounded-2xl px-3 py-1.5 text-sm font-semibold shadow-sm ${
              zoneFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-700'
            }`}
          >
            Semua (37)
          </button>
          {ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => switchZone(z.id)}
              className={`shrink-0 rounded-2xl px-3 py-1.5 text-sm font-semibold shadow-sm ${
                zoneFilter === z.id ? 'bg-blue-500 text-white' : 'bg-white text-slate-700'
              }`}
            >
              {z.emoji} {z.name}
            </button>
          ))}
        </div>

        {mode === 'flashcard' ? (
          <div className="flex flex-col gap-3">
            <div className="text-center text-sm font-semibold text-slate-600 tabular-nums">
              Kartu {safeIdx + 1} dari {filtered.length} · Surah ke-{cur.number}
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sfx('tap');
                setFlipped((f) => !f);
              }}
              className={`flex min-h-72 w-full flex-col items-center justify-center gap-3 rounded-[2rem] bg-linear-to-br ${isl.color} p-6 text-center shadow-xl`}
            >
              {!flipped ? (
                <>
                  <span className="text-7xl">{isl.emoji}</span>
                  <p className="font-quran text-5xl text-slate-900">{cur.name}</p>
                  <h2 className="text-3xl font-bold text-slate-800">{isl.latin}</h2>
                  <p className="text-sm font-semibold text-slate-700">{cur.count} ayat · Ketuk untuk lihat arti ↻</p>
                </>
              ) : (
                <>
                  <span className="rounded-full bg-white/85 px-4 py-1 text-sm font-bold text-emerald-800 shadow-sm">
                    Arti Nama Surah
                  </span>
                  <h2 className="text-3xl font-bold text-slate-900">“{cur.meaning}”</h2>
                  <p className="max-w-md rounded-2xl bg-white/80 p-3 text-base font-medium text-slate-700">
                    {isl.about}
                  </p>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <RotateCw size={14} /> Ketuk untuk balik kartu
                  </span>
                </>
              )}
            </motion.button>

            <div className="grid grid-cols-2 gap-2">
              <Button color="yellow" onClick={() => playAyah(cur.number, 1)}>
                <Volume2 size={20} /> Dengar Ayat 1
              </Button>
              <Button color="purple" onClick={() => say(`${isl.latin} artinya ${cur.meaning}. ${isl.about}`)}>
                <Volume2 size={20} /> Bacakan Arti
              </Button>
            </div>

            {words.length > 0 && (
              <section className="rounded-3xl bg-white p-4 shadow">
                <h3 className="mb-2 text-base font-bold text-slate-700">🃏 Kosakata Kunci {isl.latin}</h3>
                <div className="flex flex-wrap gap-2">
                  {words.map(([ayah, wordPos, emoji, meaning], idx) => {
                    const arab = cur.ayahs[ayah - 1]?.words[wordPos - 1]?.t ?? '';
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          playWord(cur.number, ayah, wordPos - 1);
                        }}
                        className="flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-2 text-left shadow-xs active:scale-95"
                      >
                        <span className="text-2xl">{emoji}</span>
                        <span className="font-quran text-2xl text-slate-900">{arab}</span>
                        <span className="text-sm font-semibold text-slate-700">{meaning}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="flex gap-2">
              <Button
                color="white"
                className="flex-1"
                disabled={safeIdx === 0}
                onClick={() => {
                  setCardIdx((i) => Math.max(0, i - 1));
                  setFlipped(false);
                }}
              >
                ⬅️ Sebelumnya
              </Button>
              <Button
                color="green"
                className="flex-1"
                onClick={() => navigate(`/pulau/${cur.number}/arti`)}
              >
                📖 Uji Arti Ini
              </Button>
              <Button
                color="white"
                className="flex-1"
                disabled={safeIdx >= filtered.length - 1}
                onClick={() => {
                  setCardIdx((i) => Math.min(filtered.length - 1, i + 1));
                  setFlipped(false);
                }}
              >
                Berikutnya ➡️
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {filtered.map((s) => {
              const sIsl = islandOf(s.number);
              const artiDone = !!p.done[s.number]?.arti;
              return (
                <div
                  key={s.number}
                  className="flex items-center gap-3 rounded-3xl bg-white p-3.5 shadow"
                >
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${sIsl.color} text-3xl`}>
                    {sIsl.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-800">{sIsl.latin}</span>
                      <span className="font-quran text-xl text-slate-600">{s.name}</span>
                      {artiDone && <span className="rounded-lg bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700">✓ Hafal Arti</span>}
                    </div>
                    <p className="text-sm font-bold text-emerald-700">Arti: {s.meaning} ({s.count} ayat)</p>
                    <p className="text-xs text-slate-500">{sIsl.about}</p>
                  </div>
                  <Button color="yellow" className="min-h-11 px-3" onClick={() => navigate(`/pulau/${s.number}/mushaf`)}>
                    📖
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

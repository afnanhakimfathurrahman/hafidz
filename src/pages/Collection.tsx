import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { SURAHS } from '../data/quran';
import { islandOf } from '../data/islands';
import { companionStage, STAGE_LABEL, surahRpgOf } from '../data/rpg';
import { Button, TopBar } from '../components/ui';
import { BintangSays } from '../components/Bintang';
import { useGameStore, useProgress } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { sfx } from '../services/audio';

type Filter = 'all' | 'owned' | 'legend';

/** Koleksi Sahabat Surah (Hafizdex 0/37): tracks all 37 companions, meanings, and 3 evolution stages. */
export default function Collection() {
  const p = useProgress();
  const setCompanion = useGameStore((s) => s.setCompanion);
  const [filter, setFilter] = useState<Filter>('all');

  const ownedCount = SURAHS.filter((s) => companionStage(p, s.number) >= 2).length;
  const legendCount = SURAHS.filter((s) => companionStage(p, s.number) === 3).length;
  const activeId = p.rpgEquipped?.companion;

  const list = SURAHS.filter((s) => {
    const st = companionStage(p, s.number);
    if (filter === 'owned') return st >= 1;
    if (filter === 'legend') return st === 3;
    return true;
  });

  return (
    <div className="min-h-screen pb-10">
      <TopBar title="🐾 Koleksi Sahabat Surah" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
        <BintangSays
          text={`Sahabat Terkumpul: ${ownedCount}/37 · Legendaris: ${legendCount}/37`}
          size={72}
        />

        <div className="grid grid-cols-3 gap-2">
          <Button color={filter === 'all' ? 'blue' : 'white'} onClick={() => setFilter('all')}>
            Semua (37)
          </Button>
          <Button color={filter === 'owned' ? 'blue' : 'white'} onClick={() => setFilter('owned')}>
            Terbuka
          </Button>
          <Button color={filter === 'legend' ? 'blue' : 'white'} onClick={() => setFilter('legend')}>
            ✨ Legendaris
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((s) => {
            const isl = islandOf(s.number);
            const rpg = surahRpgOf(s.number);
            const st = companionStage(p, s.number);
            const isPartner = activeId === s.number;

            return (
              <motion.div
                key={s.number}
                whileTap={{ scale: 0.99 }}
                className={`flex flex-col justify-between gap-3 rounded-3xl bg-white p-4 shadow ${
                  isPartner ? 'ring-4 ring-amber-400' : ''
                } ${st === 0 ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${isl.color} text-4xl shadow-inner ${
                      st === 0 ? 'grayscale' : ''
                    }`}
                  >
                    {st === 0 ? '🥚' : rpg.companionEmoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-semibold text-slate-800">
                        {st === 0 ? '???' : rpg.companionName}
                      </span>
                      {st === 3 && <Sparkles size={16} className="text-amber-500" />}
                    </div>
                    <div className="text-sm font-semibold text-blue-700">
                      {isl.latin} · {s.meaning}
                    </div>
                    <p className="text-xs text-slate-500">{st === 0 ? 'Pelajari surahnya untuk menetaskan!' : rpg.companionDesc}</p>
                    <div className="mt-1 text-xs font-semibold text-emerald-700">{STAGE_LABEL[st]}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {st >= 1 && (
                    <Button
                      color={isPartner ? 'green' : 'yellow'}
                      className="flex-1"
                      onClick={() => {
                        sfx('tap');
                        setCompanion(isPartner ? undefined : s.number);
                      }}
                    >
                      {isPartner ? (
                        <>
                          <Check size={18} /> Partner Aktif
                        </>
                      ) : (
                        'Jadikan Partner'
                      )}
                    </Button>
                  )}
                  <Button color="white" className="flex-1" onClick={() => navigate(`/pulau/${s.number}`)}>
                    {st === 0 ? 'Buka Quest' : st < 3 ? 'Evolusi ➜' : 'Lihat Surah'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

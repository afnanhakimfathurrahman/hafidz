import { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, ShoppingBag } from 'lucide-react';
import { SURAHS } from '../data/quran';
import { islandOf } from '../data/islands';
import { SHOP, itemOf } from '../data/shop';
import { Button, TopBar } from '../components/ui';
import { BintangSays } from '../components/Bintang';
import { useGameStore, useProgress } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { notify, sfx } from '../services/audio';
import { celebrate } from '../services/celebrate';
import { todayStr } from '../services/srs';
import { gardenPlant } from './MapView';

/** Interactive Kebun Hafiz: grows landmarks from memorized surahs + bought shop decorations. */
export default function Garden() {
  const p = useProgress();
  const waterGarden = useGameStore((s) => s.waterGarden);
  const toggleGardenItem = useGameStore((s) => s.toggleGardenItem);
  const [wateredNow, setWateredNow] = useState(false);

  const alreadyWatered = p.gardenWaterDate === todayStr() || wateredNow;
  const learnedIslands = SURAHS.filter((s) => (p.stars[s.number] ?? 0) >= 2).map((s) => islandOf(s.number));
  const ownedDecor = SHOP.filter((i) => i.slot === 'garden' && p.owned.includes(i.id));
  const placedDecor = p.gardenPlaced ?? [];

  const handleWater = () => {
    if (waterGarden()) {
      setWateredNow(true);
      sfx('bloom');
      celebrate(false);
      notify('Segarnya! Tamanmu disiram hari ini (+5 🪙)');
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title="🌱 Kebun Hafiz" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-10">
        <BintangSays
          text={
            learnedIslands.length > 0
              ? `MasyaAllah! Ada ${learnedIslands.length} pulau mekar di kebunmu!`
              : 'Hafalkan surah hingga 2 bintang untuk menumbuhkan kebunmu!'
          }
          size={75}
        />

        {/* Hero garden canvas */}
        <section className="rounded-[2rem] bg-linear-to-b from-sky-100 via-lime-100 to-emerald-200 p-5 text-center shadow-lg">
          <motion.div
            animate={wateredNow ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="bob text-8xl"
          >
            {gardenPlant(p.garden.days)}
          </motion.div>
          <h2 className="mt-2 text-2xl font-semibold text-emerald-900">Taman Hari ke-{p.garden.days}</h2>
          <p className="text-sm text-emerald-800">
            Belajar setiap hari agar pohon utama tumbuh makin rindang. Tidak pernah layu!
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button color={alreadyWatered ? 'white' : 'blue'} disabled={alreadyWatered} onClick={handleWater}>
              <Droplets size={20} /> {alreadyWatered ? 'Sudah disiram hari ini ✓' : 'Siram Kebun (+5 🪙)'}
            </Button>
            <Button color="yellow" onClick={() => navigate('/toko')}>
              <ShoppingBag size={20} /> Beli Dekorasi
            </Button>
          </div>

          {/* Placed decorations */}
          {placedDecor.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-3 rounded-3xl bg-white/60 p-3">
              {placedDecor.map((id) => {
                const it = itemOf(id);
                if (!it) return null;
                return (
                  <motion.button
                    key={id}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => notify(`${it.name} menghiasi Kebun Hafiz!`)}
                    className="flex flex-col items-center rounded-2xl bg-white px-3 py-2 shadow-sm"
                  >
                    <span className="text-4xl">{it.preview}</span>
                    <span className="text-xs font-semibold text-slate-600">{it.name}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        {/* Owned decorations inventory */}
        {ownedDecor.length > 0 && (
          <section className="rounded-3xl bg-white p-4 shadow">
            <h3 className="mb-2 text-lg font-semibold text-slate-700">✨ Dekorasi Milikmu (Ketuk untuk pasang/lepas)</h3>
            <div className="flex flex-wrap gap-2">
              {ownedDecor.map((it) => {
                const active = placedDecor.includes(it.id);
                return (
                  <Button
                    key={it.id}
                    color={active ? 'green' : 'white'}
                    onClick={() => toggleGardenItem(it.id)}
                  >
                    <span className="text-2xl">{it.preview}</span>
                    <span>{it.name}</span>
                  </Button>
                );
              })}
            </div>
          </section>
        )}

        {/* Blooming Surah Collection */}
        <section className="rounded-3xl bg-white p-4 shadow">
          <h3 className="mb-3 text-lg font-semibold text-slate-700">
            🌺 Koleksi Surah Mekar ({learnedIslands.length}/37)
          </h3>
          {learnedIslands.length === 0 ? (
            <p className="text-slate-500">
              Belum ada surah mekar. Selesaikan Dengar & Ulangi + 2 mini-game di Pulau An-Nas untuk menumbuhkan bunga pertamamu!
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {learnedIslands.map((isl) => (
                <motion.button
                  key={isl.number}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => navigate(`/pulau/${isl.number}`)}
                  className={`flex flex-col items-center rounded-2xl bg-linear-to-br ${isl.color} p-3 text-center shadow`}
                >
                  <span className="text-4xl">{isl.bloom[0] ?? isl.emoji}</span>
                  <span className="mt-1 text-sm font-semibold text-slate-800">{isl.latin}</span>
                </motion.button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

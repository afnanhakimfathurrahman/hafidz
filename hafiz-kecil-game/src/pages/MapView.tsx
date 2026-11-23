import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, ShoppingBag, Medal, Headphones } from 'lucide-react';
import { SURAHS } from '../data/quran';
import { islandOf } from '../data/islands';
import { itemOf } from '../data/shop';
import { Button, Stars } from '../components/ui';
import { Bintang } from '../components/Bintang';
import { BadgeToast } from '../components/BadgeToast';
import { InstallButton } from '../components/InstallButton';
import { ParentGate } from '../components/ParentGate';
import { SeoHead } from '../components/SeoHead';
import { useProfile, useProgress, isDue } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { L, sailTo } from '../data/voiceLines';
import { notify, say, sfx, preloadVoices } from '../services/audio';
import { isFoggy } from '../services/fog';
import { useGameStore } from '../store/useGameStore';

const ROW = 150;
const XS = [50, 76, 50, 24];

export const gardenPlant = (days: number) => (days < 3 ? '🌱' : days < 7 ? '🌿' : days < 14 ? '🪴' : days < 30 ? '🌳' : '🌴');

export default function MapView() {
  const profile = useProfile()!;
  const p = useProgress();
  const [gate, setGate] = useState(false);
  const nextRef = useRef<HTMLDivElement>(null);

  const suggested = SURAHS.find((s) => (p.stars[s.number] ?? 0) < 2)?.number;
  const due = SURAHS.filter((s) => isDue(p.review[s.number]));
  const learned = SURAHS.filter((s) => (p.stars[s.number] ?? 0) >= 1).length;
  const unlockAll = useGameStore((s) => s.settings.unlockAll);
  const boat = itemOf(p.equipped.boat)?.preview ?? '🛶';

  useEffect(() => {
    if (suggested) preloadVoices([sailTo(islandOf(suggested).latin)]);
    nextRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => {
      if (due.length) say([L.hello, L.missYou]);
      else if (suggested) say([L.hello, sailTo(islandOf(suggested).latin)]);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const height = SURAHS.length * ROW + 80;
  const points = SURAHS.map((_, i) => `${XS[i % 4]},${i * ROW + 70}`).join(' ');

  return (
    <div className="min-h-screen">
      <SeoHead />
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-sky-200/85 px-3 py-2 backdrop-blur">
        <Bintang size={52} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-semibold">{profile.nickname}</div>
          <div className="text-sm text-slate-600">⭐ {Object.values(p.stars).reduce((a, b) => a + b, 0)} · 🏝️ {learned}/37</div>
        </div>
        <button
          type="button"
          onClick={() => notify(`Taman harianmu sudah tumbuh ${p.garden.days} hari. Belajar setiap hari supaya makin rindang!`, L.garden)}
          className="flex min-h-14 items-center gap-1 rounded-3xl bg-white px-3 text-lg font-semibold shadow"
          aria-label="Taman harian"
        >
          <span className="text-2xl">{gardenPlant(p.garden.days)}</span> {p.garden.days}
        </button>
        <div className="flex min-h-14 items-center rounded-3xl bg-white px-3 text-lg font-semibold text-amber-600 shadow">🪙 {p.coins}</div>
      </header>

      <nav className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 pt-3">
        <Button color="green" onClick={() => navigate('/murojaah')} label="Tebak Surah">
          <Headphones size={26} />
        </Button>
        <Button color="yellow" onClick={() => navigate('/toko')} label="Toko">
          <ShoppingBag size={26} />
        </Button>
        <Button color="purple" onClick={() => navigate('/lencana')} label="Lencana">
          <Medal size={26} />
        </Button>
        <Button color="white" onClick={() => setGate(true)} label="Orang tua">
          <Settings size={26} />
        </Button>
      </nav>

      <div className="mx-auto max-w-md px-3 pt-3 empty:hidden">
        <InstallButton className="w-full" />
      </div>

      {(due.length > 0 || suggested) && (
        <div className="mx-auto mt-3 max-w-md px-3">
          <div className="rounded-3xl bg-white/90 p-3 shadow">
            <p className="font-semibold text-slate-500">🎯 Misi Hari Ini</p>
            <div className="mt-2 flex flex-col gap-2">
              {suggested && (
                <Button color="blue" onClick={() => navigate(`/pulau/${suggested}`)}>
                  {islandOf(suggested).emoji} Belajar {islandOf(suggested).latin}
                </Button>
              )}
              {due[0] && (
                <Button color="green" onClick={() => navigate(`/pulau/${due[0].number}/review`)}>
                  💭 Murojaah {islandOf(due[0].number).latin}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative mx-auto mt-4 max-w-md" style={{ height }}>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
          <polyline
            points={points}
            fill="none"
            stroke="#ffffff"
            strokeWidth="6"
            strokeDasharray="2 14"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {SURAHS.map((s, i) => {
          const isl = islandOf(s.number);
          const stars = p.stars[s.number] ?? 0;
          const isNext = s.number === suggested;
          const rindu = isDue(p.review[s.number]);
          const fog = isFoggy(p, s.number, unlockAll);
          const misty = stars === 0 && !isNext && !fog;
          return (
            <div
              key={s.number}
              ref={isNext ? nextRef : undefined}
              className="absolute -translate-x-1/2"
              style={{ left: `${XS[i % 4]}%`, top: i * ROW }}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  sfx('tap');
                  navigate(`/pulau/${s.number}`);
                }}
                className="relative flex flex-col items-center"
                aria-label={`Pulau ${isl.latin}`}
              >
                <div
                  className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br ${isl.color} shadow-lg ring-4 ${
                    isNext ? 'ring-amber-300 ring-offset-4 ring-offset-sky-100' : 'ring-white'
                  } ${misty ? 'opacity-60 saturate-50' : ''} ${fog ? 'opacity-50 grayscale' : ''}`}
                >
                  <span className={`text-6xl ${isNext ? 'bob' : ''} ${fog ? 'blur-[3px]' : ''}`}>{isl.emoji}</span>
                  {fog && <span className="absolute text-6xl">🌫️</span>}
                  {isl.bloom.slice(0, stars).map((b, j) => (
                    <span key={j} className="absolute text-2xl" style={[{ top: -6, left: -4 }, { top: -6, right: -4 }, { bottom: -2, right: -10 }][j]}>
                      {b}
                    </span>
                  ))}
                  {rindu && <span className="bob absolute -top-4 left-1/2 -translate-x-1/2 text-3xl">💭</span>}
                  {isNext && <span className="bob absolute -left-12 bottom-0 text-4xl">{boat}</span>}
                </div>
                <span className="mt-1 rounded-full bg-white/90 px-3 text-base font-semibold shadow">{isl.latin}</span>
                {stars > 0 && <Stars n={stars} size="text-sm" />}
              </motion.button>
            </div>
          );
        })}
      </div>

      <ParentGate open={gate} onClose={() => setGate(false)} onPass={() => navigate('/orang-tua')} />
      <BadgeToast />
    </div>
  );
}

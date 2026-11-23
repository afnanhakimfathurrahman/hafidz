import { BADGES } from '../data/badges';
import { TopBar } from '../components/ui';
import { useProgress } from '../store/useGameStore';
import { notify, preloadVoices } from '../services/audio';
import { useEffect } from 'react';
import { gardenPlant } from './MapView';
import { badgeInfo, badgeLocked } from '../data/voiceLines';

export default function Badges() {
  const p = useProgress();
  useEffect(() => {
    preloadVoices(BADGES.map((b) => (p.badges.includes(b.id) ? badgeInfo(b.name, b.desc) : badgeLocked(b.desc))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="min-h-screen">
      <TopBar title="🏅 Lencanaku" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
        <section className="rounded-3xl bg-linear-to-br from-lime-200 to-emerald-300 p-4 text-center shadow">
          <div className="bob text-7xl">{gardenPlant(p.garden.days)}</div>
          <h2 className="text-2xl font-semibold">Taman Harian</h2>
          <p className="text-slate-700">
            Tumbuh {p.garden.days} hari. Setiap hari kamu belajar, tamanmu bertambah besar. Kalau libur, tamannya hanya menunggu, tidak layu. 🌱
          </p>
        </section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map((b) => {
            const has = p.badges.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => notify(has ? badgeInfo(b.name, b.desc) : badgeLocked(b.desc))}
                className={`flex flex-col items-center gap-1 rounded-3xl bg-white p-3 text-center shadow ${has ? '' : 'opacity-50'}`}
              >
                <span className={`text-5xl ${has ? '' : 'grayscale'}`}>{has ? b.emoji : '🔒'}</span>
                <span className="font-semibold">{b.name}</span>
                <span className="text-sm text-slate-500">{b.desc}</span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

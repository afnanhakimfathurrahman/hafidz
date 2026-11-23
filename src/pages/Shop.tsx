import { useEffect, useState } from 'react';
import { SHOP, type Slot } from '../data/shop';
import { Button, TopBar } from '../components/ui';
import { Bintang } from '../components/Bintang';
import { useGameStore, useProgress } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { notify, sfx, preloadVoices } from '../services/audio';
import { bought } from '../data/voiceLines';

const TABS: { slot: Slot; label: string }[] = [
  { slot: 'color', label: '🎨 Warna' },
  { slot: 'hat', label: '🧢 Topi' },
  { slot: 'scarf', label: '🧣 Syal' },
  { slot: 'boat', label: '⛵ Perahu' },
  { slot: 'garden', label: '🌱 Kebun' },
];

/** Cosmetic & garden shop: no random rewards, no real money. */
export default function Shop() {
  const p = useProgress();
  const buy = useGameStore((s) => s.buy);
  const equip = useGameStore((s) => s.equip);
  const toggleGardenItem = useGameStore((s) => s.toggleGardenItem);
  const [tab, setTab] = useState<Slot>('color');
  useEffect(() => {
    preloadVoices(SHOP.map((i) => bought(i.name)));
  }, []);

  const owned = (id: string, price: number) => price === 0 || p.owned.includes(id);

  return (
    <div className="min-h-screen">
      <TopBar title="🛍️ Toko Bintang" />
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 p-4">
        <div className="flex items-end gap-4">
          <Bintang size={140} />
          <span className="mb-4 text-6xl">{SHOP.find((i) => i.id === p.equipped.boat)?.preview ?? '🛶'}</span>
        </div>
        <div className="grid w-full grid-cols-5 gap-1.5">
          {TABS.map((t) => (
            <Button key={t.slot} color={tab === t.slot ? 'blue' : 'white'} className="px-2" onClick={() => setTab(t.slot)}>
              <span className="truncate text-sm sm:text-base">{t.label}</span>
            </Button>
          ))}
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {SHOP.filter((i) => i.slot === tab).map((item) => {
            const has = owned(item.id, item.price);
            const slot = item.slot;
            const on =
              slot === 'garden'
                ? (p.gardenPlaced ?? []).includes(item.id)
                : p.equipped[slot] === item.id || (!p.equipped[slot] && item.price === 0);
            return (
              <div key={item.id} className={`flex flex-col items-center gap-2 rounded-3xl bg-white p-3 shadow ${on ? 'ring-4 ring-emerald-400' : ''}`}>
                {slot === 'color' ? (
                  <span className="h-14 w-14 rounded-full" style={{ background: item.preview }} />
                ) : (
                  <span className="text-5xl">{item.preview}</span>
                )}
                <span className="text-center font-semibold">{item.name}</span>
                {has ? (
                  <Button
                    color={on ? 'green' : 'white'}
                    className="w-full"
                    onClick={() =>
                      slot === 'garden'
                        ? toggleGardenItem(item.id)
                        : equip(slot, on && slot !== 'color' && slot !== 'boat' ? undefined : item.id)
                    }
                  >
                    {slot === 'garden' ? (on ? 'Di Kebun ✓' : 'Pasang') : on ? 'Dipakai ✓' : 'Pakai'}
                  </Button>
                ) : (
                  <Button
                    color="yellow"
                    className="w-full"
                    disabled={p.coins < item.price}
                    onClick={() => {
                      if (buy(item.id, item.price, item.slot)) {
                        sfx('coin');
                        notify(bought(item.name));
                      }
                    }}
                  >
                    🪙 {item.price}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {tab === 'garden' && (
          <Button color="green" onClick={() => navigate('/kebun')}>
            🌱 Lihat Kebun Hafiz
          </Button>
        )}
        <p className="pb-6 text-center text-slate-500">Kumpulkan koin dengan belajar dan murojaah setiap hari!</p>
      </main>
    </div>
  );
}

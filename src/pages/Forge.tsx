import { useState } from 'react';
import { motion } from 'framer-motion';
import { Hammer, Check, Sparkles } from 'lucide-react';
import { CRAFT_ITEMS, ELEMENT_INFO, MATERIALS, canCraft, heroStats, type RpgSlot } from '../data/rpg';
import { Button, TopBar } from '../components/ui';
import { Bintang } from '../components/Bintang';
import { useGameStore, useProgress } from '../store/useGameStore';
import { celebrate } from '../services/celebrate';
import { notify, sfx } from '../services/audio';

const TABS: { slot: RpgSlot; label: string }[] = [
  { slot: 'weapon', label: '⚔️ Senjata' },
  { slot: 'shield', label: '🛡️ Perisai' },
  { slot: 'cloak', label: '🧥 Jubah' },
  { slot: 'accessory', label: '💍 Aksesoris' },
];

/** Bengkel Cahaya: Craft & equip RPG weapons, shields, and cloaks from earned materials. */
export default function Forge() {
  const p = useProgress();
  const craftItem = useGameStore((s) => s.craftItem);
  const equipRpg = useGameStore((s) => s.equipRpg);
  const [tab, setTab] = useState<RpgSlot>('weapon');

  const stats = heroStats(p);
  const mat = p.materials ?? { kristal: 0, daun: 0, bintang: 0 };
  const crafted = p.crafted ?? ['weapon-wood'];
  const activeCompanion = stats.partner.companion;

  return (
    <div className="min-h-screen pb-10">
      <TopBar title="🔨 Bengkel Cahaya" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
        {/* Hero Equipment & Stats Preview */}
        <section className="rounded-[2rem] bg-linear-to-br from-indigo-900 via-slate-800 to-blue-950 p-4 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="relative flex items-end">
              <Bintang size={120} mood="happy" />
              {activeCompanion && (
                <span className="bob -ml-4 mb-2 text-4xl" title={activeCompanion.companionName}>
                  {activeCompanion.companionEmoji}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-lg font-semibold text-amber-300">Level {stats.level} Penjaga Cahaya</div>
              <div className="grid grid-cols-2 gap-1.5 text-sm font-semibold">
                <span className="rounded-xl bg-white/10 px-2.5 py-1 tabular-nums">⚔️ Serangan: {stats.atk}</span>
                <span className="rounded-xl bg-white/10 px-2.5 py-1 tabular-nums">❤️ HP Maks: {stats.maxHp}</span>
                <span className="rounded-xl bg-white/10 px-2.5 py-1 tabular-nums">⚡ Bonus EXP: +{stats.xpPct}%</span>
                <span className="rounded-xl bg-white/10 px-2.5 py-1 tabular-nums">🪙 Bonus Koin: +{stats.coinBonus}</span>
              </div>
              {activeCompanion && (
                <div className="rounded-xl bg-white/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                  {ELEMENT_INFO[activeCompanion.element].emoji} Skill {activeCompanion.companionName}: {stats.partner.summary}
                </div>
              )}
            </div>
          </div>

          {/* Material Pouch */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
            {MATERIALS.map((m) => (
              <div key={m.id} className="rounded-2xl bg-white/10 px-2 py-2">
                <div className="text-2xl">
                  {m.emoji} <span className="tabular-nums">{mat[m.id]}</span>
                </div>
                <div className="text-xs text-slate-200">{m.name}</div>
                <div className="text-[10px] text-slate-400">{m.from}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Slot Filter */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TABS.map((t) => (
            <Button key={t.slot} color={tab === t.slot ? 'blue' : 'white'} onClick={() => setTab(t.slot)} className="px-2 text-base">
              {t.label}
            </Button>
          ))}
        </div>

        {/* Crafting Recipes */}
        <div className="grid gap-3">
          {CRAFT_ITEMS.filter((i) => i.slot === tab).map((item) => {
            const owned = crafted.includes(item.id);
            const equipped = p.rpgEquipped?.[item.slot] === item.id;
            const craftable = canCraft(p, item);

            return (
              <motion.div
                key={item.id}
                layout
                className={`flex flex-col gap-3 rounded-3xl bg-white p-4 shadow ${equipped ? 'ring-4 ring-emerald-400' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-4xl shadow-inner">
                    {item.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold text-slate-800">{item.name}</h3>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-indigo-700">
                      {item.atkBonus > 0 && <span>⚔️ +{item.atkBonus} DMG</span>}
                      {item.hpBonus > 0 && <span>❤️ +{item.hpBonus} HP</span>}
                      {item.xpPct > 0 && <span>⚡ +{item.xpPct}% EXP</span>}
                      {item.coinBonus > 0 && <span>🪙 +{item.coinBonus} Koin</span>}
                    </div>
                  </div>
                </div>

                {!owned && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold">
                    <span className="text-slate-500">Bahan:</span>
                    {item.cost.kristal > 0 && (
                      <span className={mat.kristal >= item.cost.kristal ? 'text-emerald-700' : 'text-rose-600'}>
                        💎 {mat.kristal}/{item.cost.kristal}
                      </span>
                    )}
                    {item.cost.daun > 0 && (
                      <span className={mat.daun >= item.cost.daun ? 'text-emerald-700' : 'text-rose-600'}>
                        🌿 {mat.daun}/{item.cost.daun}
                      </span>
                    )}
                    {item.cost.bintang > 0 && (
                      <span className={mat.bintang >= item.cost.bintang ? 'text-emerald-700' : 'text-rose-600'}>
                        🌟 {mat.bintang}/{item.cost.bintang}
                      </span>
                    )}
                    {item.cost.coins > 0 && (
                      <span className={p.coins >= item.cost.coins ? 'text-amber-700' : 'text-rose-600'}>
                        🪙 {item.cost.coins}
                      </span>
                    )}
                  </div>
                )}

                {owned ? (
                  <Button
                    color={equipped ? 'green' : 'white'}
                    className="w-full"
                    onClick={() => equipRpg(item.slot, equipped && item.id !== 'weapon-wood' ? undefined : item.id)}
                  >
                    {equipped ? (
                      <>
                        <Check size={20} /> Dipakai
                      </>
                    ) : (
                      'Pakai Perlengkapan'
                    )}
                  </Button>
                ) : (
                  <Button
                    color={craftable ? 'yellow' : 'white'}
                    disabled={!craftable}
                    className="w-full"
                    onClick={() => {
                      if (craftItem(item)) {
                        sfx('bloom');
                        celebrate(true);
                        notify(`Berhasil menempa ${item.name}! Kekuatanmu bertambah!`);
                      }
                    }}
                  >
                    <Hammer size={20} /> {craftable ? 'Tempa Sekarang!' : 'Kumpulkan Bahan dari Duel & Arti'}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="flex items-center justify-center gap-1 text-center text-sm text-slate-600">
          <Sparkles size={16} /> Tips: Hafalan surat memberi 💎, hafal arti memberi 🌿, combo & murojaah memberi 🌟!
        </p>
      </main>
    </div>
  );
}

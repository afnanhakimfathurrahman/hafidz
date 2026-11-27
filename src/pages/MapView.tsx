import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, ShoppingBag, Medal, Swords, Hammer, Sparkles, CheckCircle2, Circle, Gift, BookOpen } from 'lucide-react';
import { SURAHS } from '../data/quran';
import { islandOf } from '../data/islands';
import { ZONES, zoneStats } from '../data/zones';
import { itemOf } from '../data/shop';
import { CRAFT_ITEMS, STAGE_LABEL, canCraft, companionStage, heroStats, levelOf, surahRpgOf } from '../data/rpg';
import { Button, Stars } from '../components/ui';
import { Bintang } from '../components/Bintang';
import { BadgeToast } from '../components/BadgeToast';
import { InstallButton } from '../components/InstallButton';
import { ParentGate } from '../components/ParentGate';
import { SeoHead } from '../components/SeoHead';
import { useProfile, useProgress, isDue, useGameStore, currentDailyQuest } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { L, sailTo } from '../data/voiceLines';
import { notify, say, sfx, preloadVoices } from '../services/audio';
import { isFoggy } from '../services/fog';
import { celebrate } from '../services/celebrate';

const XS = [50, 72, 50, 28];

export const gardenPlant = (days: number) => (days < 3 ? '🌱' : days < 7 ? '🌿' : days < 14 ? '🪴' : days < 30 ? '🌳' : '🌴');

export default function MapView() {
  const profile = useProfile()!;
  const p = useProgress();
  const claimDailyQuest = useGameStore((s) => s.claimDailyQuest);
  const [gate, setGate] = useState(false);
  const nextRef = useRef<HTMLDivElement>(null);
  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const suggested = SURAHS.find((s) => (p.stars[s.number] ?? 0) < 2)?.number;
  const due = SURAHS.filter((s) => isDue(p.review[s.number]));
  const learned = SURAHS.filter((s) => (p.stars[s.number] ?? 0) >= 2).length;
  const totalStars = Object.values(p.stars).reduce((a, b) => a + b, 0);
  const unlockAll = useGameStore((s) => s.settings.unlockAll);
  const boat = itemOf(p.equipped.boat)?.preview ?? '🛶';
  const dq = currentDailyQuest(p);
  const dqCount = [dq.listen, dq.play, dq.review].filter(Boolean).length;

  const lv = levelOf(p.xp ?? 0);
  const stats = heroStats(p);
  const mat = p.materials ?? { kristal: 0, daun: 0, bintang: 0 };
  const unlockedCompanions = SURAHS.filter((s) => companionStage(p, s.number) > 0).length;
  const activeCompanion = p.rpgEquipped?.companion ? surahRpgOf(p.rpgEquipped.companion) : null;
  const hasCraftable = CRAFT_ITEMS.some((i) => canCraft(p, i));

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

  const claimQuest = () => {
    if (claimDailyQuest()) {
      sfx('bloom');
      celebrate(true);
      notify('MasyaAllah! Peti Misi Harian terbuka: +25 🪙, +30 EXP & +1 🌟!');
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <SeoHead />
      {/* Compact Sticky Header (<12% viewport height) */}
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-sky-200/90 px-3 py-1.5 backdrop-blur">
        <Bintang size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-lg font-bold text-slate-800">{profile.nickname}</span>
            <span className="rounded-lg bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-amber-950">Lv.{lv.level}</span>
          </div>
          <div className="text-xs font-medium text-slate-600 tabular-nums">
            ⭐ {totalStars} · 🏝️ {learned}/37 · 👾 {unlockedCompanions}/37
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/kebun')}
          className="flex min-h-11 items-center gap-1 rounded-2xl bg-white px-2.5 text-sm font-semibold shadow transition-transform active:scale-95"
          aria-label="Kebun Hafiz"
        >
          <span className="text-xl">{gardenPlant(p.garden.days)}</span> {p.garden.days}
        </button>
        <div className="flex min-h-11 items-center rounded-2xl bg-white px-2.5 text-sm font-bold text-amber-600 shadow tabular-nums">
          🪙 {p.coins}
        </div>
      </header>

      {/* RPG Hero Status Banner */}
      <div className="mx-auto max-w-md px-3 pt-3">
        <div className="rounded-3xl bg-linear-to-br from-indigo-600 via-purple-600 to-sky-600 p-3.5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/koleksi')}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/15 p-1 backdrop-blur transition-transform active:scale-95"
              aria-label="Pilih Partner Surah"
            >
              {activeCompanion ? (
                <>
                  <span className="text-3xl leading-none">{activeCompanion.companionEmoji}</span>
                  <span className="mt-0.5 max-w-full truncate text-[10px] font-semibold text-amber-200">{activeCompanion.companionName}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl leading-none">🥚</span>
                  <span className="mt-0.5 text-[10px] font-semibold text-white/90">Partner</span>
                </>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Hafiz Quest · Level {lv.level}</span>
                <span className="text-amber-200 tabular-nums">
                  {lv.curXp}/{lv.nextXp} EXP
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-black/25">
                <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${lv.pct}%` }} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <span className="rounded-lg bg-white/15 px-2 py-0.5 tabular-nums">⚔️ ATK {stats.atk}</span>
                <span className="rounded-lg bg-white/15 px-2 py-0.5 tabular-nums">❤️ HP {stats.maxHp}</span>
                <span className="rounded-lg bg-white/15 px-2 py-0.5">
                  {stats.weapon?.emoji ?? '🪄'}
                  {stats.shield ? ` ${stats.shield.emoji}` : ''}
                  {stats.cloak ? ` ${stats.cloak.emoji}` : ''}
                  {stats.accessory ? ` ${stats.accessory.emoji}` : ''}
                </span>
              </div>
              {activeCompanion && (
                <p className="mt-1 truncate text-[11px] font-medium text-amber-100">
                  {activeCompanion.companionEmoji} {stats.partner.summary}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-black/20 px-3 py-1.5 text-xs font-semibold">
            <span className="text-white/80">Bahan Tempa:</span>
            <div className="flex items-center gap-3 tabular-nums">
              <span title="Kristal Ayat">💎 {mat.kristal}</span>
              <span title="Daun Hikmah">🌿 {mat.daun}</span>
              <span title="Debu Bintang">🌟 {mat.bintang}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary RPG & Utility Navigation */}
      <nav className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 pt-3">
        <Button color="rose" onClick={() => navigate('/murojaah')} label="Arena Murojaah" className="flex-col gap-0.5 px-2 py-2">
          <Swords size={22} />
          <span className="text-[11px] font-bold">Arena</span>
        </Button>
        <Button color="blue" onClick={() => navigate('/koleksi')} label="Koleksi Partner" className="relative flex-col gap-0.5 px-2 py-2">
          <Sparkles size={22} />
          <span className="text-[11px] font-bold">Koleksi {unlockedCompanions}/37</span>
        </Button>
        <Button color="yellow" onClick={() => navigate('/bengkel')} label="Bengkel Tempa" className="relative flex-col gap-0.5 px-2 py-2">
          <Hammer size={22} />
          <span className="text-[11px] font-bold">Bengkel</span>
          {hasCraftable && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-rose-500 ring-2 ring-white" />
            </span>
          )}
        </Button>
        <Button color="green" onClick={() => navigate('/toko')} label="Toko Kostum" className="flex-col gap-0.5 px-2 py-2">
          <ShoppingBag size={22} />
          <span className="text-[11px] font-bold">Toko</span>
        </Button>
      </nav>

      <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 pt-2">
        <Button color="white" onClick={() => navigate('/kamus')} label="Kamus Arti" className="min-h-11 px-1.5 py-1.5 text-xs sm:text-sm">
          <BookOpen size={17} /> Kamus
        </Button>
        <Button color="white" onClick={() => navigate('/kebun')} label="Kebun Hafiz" className="min-h-11 px-1.5 py-1.5 text-xs sm:text-sm">
          <span>{gardenPlant(p.garden.days)}</span> Kebun
        </Button>
        <Button color="purple" onClick={() => navigate('/lencana')} label="Lencana" className="min-h-11 px-1.5 py-1.5 text-xs sm:text-sm">
          <Medal size={17} /> Lencana
        </Button>
        <Button color="white" onClick={() => setGate(true)} label="Area Orang tua" className="min-h-11 px-1.5 py-1.5 text-xs sm:text-sm">
          <Settings size={17} /> Ortu
        </Button>
      </div>

      <div className="mx-auto max-w-md px-3 pt-3 empty:hidden">
        <InstallButton className="w-full" />
      </div>

      {/* 3-Step Daily Quest Card */}
      <div className="mx-auto mt-3 max-w-md px-3">
        <div className="rounded-3xl bg-white/95 p-3.5 shadow">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-700">🎯 Misi Harian ({dqCount}/3)</p>
            <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(dqCount / 3) * 100}%` }} />
            </div>
          </div>

          <div className="mt-2.5 grid gap-1.5 text-sm">
            {[
              { ok: dq.listen, label: 'Dengar & Ulangi 1 bagian surah' },
              { ok: dq.play, label: 'Menang Duel Penjaga / Ujian Arti / Mini-game' },
              { ok: dq.review, label: 'Murojaah atau Arena Tebak Surah & Arti' },
            ].map((item, idx) => (
              <div key={idx} className={`flex items-center gap-2 ${item.ok ? 'font-semibold text-emerald-700' : 'text-slate-600'}`}>
                {item.ok ? <CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> : <Circle size={18} className="shrink-0 text-slate-300" />}
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {dqCount === 3 && !dq.claimed && (
            <Button color="yellow" className="mt-3 w-full" onClick={claimQuest}>
              <Gift size={20} /> Buka Peti Harian (+25 🪙 · +1 🌟)
            </Button>
          )}
          {dq.claimed && <p className="mt-2 text-center text-sm font-semibold text-emerald-600">Peti Harian hari ini sudah dibuka ✓</p>}

          <div className="mt-3 flex flex-col gap-2">
            {suggested && (
              <Button color="blue" onClick={() => navigate(`/pulau/${suggested}`)}>
                {islandOf(suggested).emoji} Lanjut Pulau {islandOf(suggested).latin}
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

      {/* 5 World Zone Quick Jump Pills */}
      <div className="mx-auto mt-3 flex max-w-md gap-1.5 overflow-x-auto px-3 pb-1">
        {ZONES.map((z) => {
          const zs = zoneStats(p, z);
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => zoneRefs.current[z.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-95"
            >
              <span>{z.emoji}</span>
              <span className="whitespace-nowrap">{z.name}</span>
              <span className="text-xs text-slate-500 tabular-nums">
                {zs.learned}/{zs.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5 Adventure Zones & Islands */}
      <div className="mx-auto mt-4 flex max-w-md flex-col gap-6 px-3">
        {ZONES.map((z) => {
          const zs = zoneStats(p, z);
          const surahsInZone = SURAHS.filter((s) => s.number <= z.from && s.number >= z.to);
          return (
            <section
              key={z.id}
              ref={(el) => {
                zoneRefs.current[z.id] = el as HTMLDivElement | null;
              }}
              className="flex flex-col items-center"
            >
              <div className={`w-full rounded-3xl border bg-linear-to-r ${z.theme} px-4 py-3 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{z.emoji}</span>
                    <div>
                      <h2 className={`text-lg font-semibold ${z.accent}`}>{z.name}</h2>
                      <p className="text-xs text-slate-600">{z.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700 tabular-nums">
                      {zs.complete ? '🏆 Tamat!' : `${zs.learned}/${zs.total} hafal`}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      ⭐ {zs.stars}/{zs.maxStars}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative mt-4 flex w-full flex-col items-center gap-8 py-2">
                {surahsInZone.map((s, idx) => {
                  const isl = islandOf(s.number);
                  const rpg = surahRpgOf(s.number);
                  const stage = companionStage(p, s.number);
                  const stars = p.stars[s.number] ?? 0;
                  const isNext = s.number === suggested;
                  const rindu = isDue(p.review[s.number]);
                  const fog = isFoggy(p, s.number, unlockAll);
                  const misty = stars === 0 && !isNext && !fog;
                  const approved = p.setoran?.[s.number]?.status === 'approved';
                  const battleCleared = !!p.done[s.number]?.battle;
                  const offsetX = XS[idx % 4] - 50;

                  return (
                    <div
                      key={s.number}
                      ref={isNext ? nextRef : undefined}
                      style={{ transform: `translateX(${offsetX}%)` }}
                      className="relative"
                    >
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          sfx('tap');
                          navigate(`/pulau/${s.number}`);
                        }}
                        className="relative flex flex-col items-center"
                        aria-label={`Pulau ${isl.latin} (${s.meaning})`}
                      >
                        <div
                          className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br ${isl.color} shadow-lg ring-4 ${
                            isNext ? 'ring-amber-300 ring-offset-4 ring-offset-sky-100' : 'ring-white'
                          } ${misty ? 'opacity-60 saturate-50' : ''} ${fog ? 'opacity-50 grayscale' : ''}`}
                        >
                          <span className={`text-6xl ${isNext ? 'bob' : ''} ${fog ? 'blur-[3px]' : ''}`}>{isl.emoji}</span>
                          {fog && <span className="absolute text-6xl">🌫️</span>}
                          {isl.bloom.slice(0, stars).map((b, j) => (
                            <span
                              key={j}
                              className="absolute text-2xl"
                              style={[{ top: -6, left: -4 }, { top: -6, right: -4 }, { bottom: -2, right: -10 }][j]}
                            >
                              {b}
                            </span>
                          ))}
                          {rindu && <span className="bob absolute -top-4 left-1/2 -translate-x-1/2 text-3xl">💭</span>}
                          {!fog && !battleCleared && (
                            <span
                              className="absolute -bottom-1 -right-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-bold text-white shadow"
                              title={`Penjaga: ${rpg.bossName}`}
                            >
                              ⚔️ {rpg.bossEmoji}
                            </span>
                          )}
                          {stage > 0 && (
                            <span
                              className={`absolute -bottom-1 -left-2 rounded-full px-1.5 py-0.5 text-xs font-bold shadow ${
                                stage === 3 ? 'bg-amber-400 text-amber-950' : 'bg-white text-slate-700'
                              }`}
                              title={STAGE_LABEL[stage]}
                            >
                              {rpg.companionEmoji}
                              {stage === 3 ? '✨' : ''}
                            </span>
                          )}
                          {approved && (
                            <span className="absolute -top-2 right-0 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 shadow">
                              🏅 Sah
                            </span>
                          )}
                          {isNext && <span className="bob absolute -left-12 bottom-0 text-4xl">{boat}</span>}
                        </div>
                        <span className="mt-1.5 rounded-full bg-white/95 px-3 py-0.5 text-base font-bold text-slate-800 shadow">
                          {isl.latin}
                        </span>
                        <span className="mt-0.5 rounded-full bg-sky-50/90 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Arti: {s.meaning}
                        </span>
                        {stars > 0 && <Stars n={stars} size="text-sm" />}
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <ParentGate open={gate} onClose={() => setGate(false)} onPass={() => navigate('/orang-tua')} />
      <BadgeToast />
    </div>
  );
}


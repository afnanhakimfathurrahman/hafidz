import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { QoriId } from '../data/quran';
import type { Slot } from '../data/shop';
import type { CraftItem, RpgSlot } from '../data/rpg';
import { BADGES } from '../data/badges';
import { nextReview, todayStr } from '../services/srs';

export type AgeBand = 'A' | 'B';
export type ActivityId = 'listen' | 'sambung' | 'jodoh' | 'lengkapi' | 'susun' | 'arti' | 'battle' | 'review';

export interface Profile {
  id: string;
  nickname: string;
  avatar: string; // mascot color id
  ageBand: AgeBand;
  createdAt: number;
}

export interface Review {
  intervalDays: number;
  nextAt: number;
  passes: number;
}

export interface DailyQuest {
  date: string;
  listen: boolean;
  play: boolean;
  review: boolean;
  claimed: boolean;
}

export interface SetoranEntry {
  status: 'pending' | 'approved';
  at: number;
}

export interface Materials {
  kristal: number;
  daun: number;
  bintang: number;
}

export interface RpgEquipped {
  weapon?: string;
  shield?: string;
  cloak?: string;
  accessory?: string;
  companion?: number; // surahNo
}

export interface Progress {
  stars: Record<number, number>;
  done: Record<number, Partial<Record<ActivityId, number>>>; // activity -> timestamp
  review: Record<number, Review>;
  parts: Record<number, number[]>; // Dengar & Ulangi: completed part indexes
  coins: number;
  owned: string[];
  equipped: { hat?: string; scarf?: string; boat?: string; color?: string };
  gardenPlaced: string[];
  gardenWaterDate: string;
  badges: string[];
  garden: { lastDate: string; days: number };
  challenge: Record<number, number>; // Tantangan Waktu best score per surah
  today: { date: string; seconds: number };
  stats: { correct: number; tebak: number; dawn: number };
  dailyQuest: DailyQuest;
  comboBest: number;
  setoran: Record<number, SetoranEntry>;
  voiceBonusParts: string[];
  xp: number;
  materials: Materials;
  crafted: string[];
  rpgEquipped: RpgEquipped;
}

export interface Settings {
  qori: QoriId;
  repeat: number; // 1..5
  rate: number; // 0.75 | 1
  sfx: boolean;
  voice: boolean;
  voiceSource: 'asset' | 'tts';
  childVoice: boolean;
  showTranslation: boolean;
  showWordMeaning: boolean;
  dailyLimitMin: number; // 0 = none
  unlockAll: boolean;
}

interface GameState {
  profiles: Profile[];
  activeId: string | null;
  progress: Record<string, Progress>;
  settings: Settings;
  pendingBadges: string[];

  addProfile: (p: Omit<Profile, 'id' | 'createdAt'>) => string;
  removeProfile: (id: string) => void;
  switchProfile: (id: string | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  completeActivity: (surah: number, activity: ActivityId, coins: number) => { newStars: number; gained: number };
  completePart: (surah: number, part: number, totalParts: number) => { newStars: number; gained: number };
  claimVoiceBonus: (surah: number, part: number, coins?: number) => boolean;
  failReview: (surah: number) => void;
  addCoins: (n: number) => void;
  grantRpgRewards: (r: { xp?: number; coins?: number; kristal?: number; daun?: number; bintang?: number }) => void;
  craftItem: (item: CraftItem) => boolean;
  equipRpg: (slot: RpgSlot, itemId: string | undefined) => void;
  setCompanion: (surahNo: number | undefined) => void;
  recordCorrect: (kind?: 'tebak') => void;
  recordCombo: (combo: number) => void;
  claimDailyQuest: () => boolean;
  waterGarden: () => boolean;
  toggleGardenItem: (itemId: string) => void;
  submitSetoran: (surah: number) => void;
  approveSetoran: (surah: number) => void;
  recordChallenge: (surah: number, score: number) => number;
  passSkipTest: (surah: number, totalParts: number) => { newStars: number; gained: number };
  buy: (itemId: string, price: number, slot: Slot) => boolean;
  equip: (slot: keyof Progress['equipped'], itemId: string | undefined) => void;
  tickTime: (seconds: number) => void;
  popBadge: () => void;
  importData: (json: string) => boolean;
}

export const emptyDailyQuest = (): DailyQuest => ({
  date: todayStr(),
  listen: false,
  play: false,
  review: false,
  claimed: false,
});

export const emptyProgress = (): Progress => ({
  stars: {},
  done: {},
  review: {},
  parts: {},
  coins: 0,
  owned: [],
  equipped: {},
  gardenPlaced: [],
  gardenWaterDate: '',
  badges: [],
  garden: { lastDate: '', days: 0 },
  challenge: {},
  today: { date: todayStr(), seconds: 0 },
  stats: { correct: 0, tebak: 0, dawn: 0 },
  dailyQuest: emptyDailyQuest(),
  comboBest: 0,
  setoran: {},
  voiceBonusParts: [],
  xp: 0,
  materials: { kristal: 0, daun: 0, bintang: 0 },
  crafted: ['weapon-wood'],
  rpgEquipped: { weapon: 'weapon-wood' },
});

const idbStorage: StateStorage = {
  getItem: async (k) => (await idbGet<string>(k)) ?? null,
  setItem: (k, v) => idbSet(k, v),
  removeItem: (k) => idbDel(k),
};

const DAY = 24 * 60 * 60 * 1000;

function starsFor(p: Progress, surah: number): number {
  const d = p.done[surah] ?? {};
  let s = 0;
  if (d.listen) s = 1;
  const hasHafalan = Boolean(d.sambung || d.lengkapi || d.susun);
  const hasArti = Boolean(d.arti || d.jodoh);
  if (d.listen && (d.battle || (hasHafalan && hasArti))) s = 2;
  // 3rd star only for a successful review at least 3 days after learning
  if (s === 2 && (p.review[surah]?.passes ?? 0) > 0) s = 3;
  return s;
}

function touchGarden(p: Progress): Progress['garden'] {
  const t = todayStr();
  if (p.garden.lastDate === t) return p.garden;
  return { lastDate: t, days: p.garden.days + 1 };
}

export function currentDailyQuest(p: Progress): DailyQuest {
  const t = todayStr();
  if (p.dailyQuest?.date === t) return p.dailyQuest;
  return emptyDailyQuest();
}

function checkBadges(p: Progress): string[] {
  return BADGES.filter((b) => !p.badges.includes(b.id) && b.check(p)).map((b) => b.id);
}

function activityRewards(activity: ActivityId): { xp: number; kristal: number; daun: number; bintang: number } {
  switch (activity) {
    case 'listen':
      return { xp: 15, kristal: 1, daun: 0, bintang: 0 };
    case 'sambung':
    case 'lengkapi':
    case 'susun':
      return { xp: 20, kristal: 1, daun: 0, bintang: 0 };
    case 'jodoh':
    case 'arti':
      return { xp: 20, kristal: 0, daun: 1, bintang: 0 };
    case 'battle':
      return { xp: 35, kristal: 2, daun: 2, bintang: 0 };
    case 'review':
      return { xp: 25, kristal: 0, daun: 0, bintang: 1 };
  }
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      const mutate = (fn: (p: Progress) => Progress) => {
        const { activeId, progress } = get();
        if (!activeId) return;
        let next = fn(progress[activeId] ?? emptyProgress());
        const earned = checkBadges(next);
        if (earned.length) next = { ...next, badges: [...next.badges, ...earned], coins: next.coins + 20 * earned.length };
        set((s) => ({
          progress: { ...s.progress, [activeId]: next },
          pendingBadges: [...s.pendingBadges, ...earned],
        }));
      };

      return {
        profiles: [],
        activeId: null,
        progress: {},
        pendingBadges: [],
        settings: {
          qori: 'husary',
          repeat: 2,
          rate: 1,
          sfx: true,
          voice: true,
          voiceSource: 'asset',
          childVoice: true,
          showTranslation: true,
          showWordMeaning: true,
          dailyLimitMin: 0,
          unlockAll: false,
        },

        addProfile: (p) => {
          const id = Math.random().toString(36).slice(2, 10);
          set((s) => ({
            profiles: [...s.profiles, { ...p, id, createdAt: Date.now() }],
            progress: { ...s.progress, [id]: emptyProgress() },
            activeId: id,
          }));
          return id;
        },
        removeProfile: (id) =>
          set((s) => {
            const progress = { ...s.progress };
            delete progress[id];
            return {
              profiles: s.profiles.filter((p) => p.id !== id),
              progress,
              activeId: s.activeId === id ? null : s.activeId,
            };
          }),
        switchProfile: (id) => set({ activeId: id }),
        updateProfile: (patch) =>
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === s.activeId ? { ...p, ...patch } : p)) })),
        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        completeActivity: (surah, activity, coins) => {
          const { activeId, progress } = get();
          const before = activeId ? starsFor(progress[activeId] ?? emptyProgress(), surah) : 0;
          let after = before;
          mutate((p) => {
            const now = Date.now();
            const done = { ...p.done, [surah]: { ...p.done[surah], [activity]: now } };
            const review = { ...p.review };
            const prev = review[surah];
            if (activity === 'review' && prev && prev.nextAt <= now) {
              review[surah] = nextReview(prev, true);
            }
            const dq = currentDailyQuest(p);
            const nextQuest: DailyQuest = {
              ...dq,
              listen: dq.listen || activity === 'listen',
              play:
                dq.play ||
                activity === 'sambung' ||
                activity === 'jodoh' ||
                activity === 'lengkapi' ||
                activity === 'susun' ||
                activity === 'arti' ||
                activity === 'battle',
              review: dq.review || activity === 'review',
            };
            const rw = activityRewards(activity);
            const mat = p.materials ?? { kristal: 0, daun: 0, bintang: 0 };
            let next: Progress = {
              ...p,
              done,
              review,
              coins: p.coins + coins,
              xp: (p.xp ?? 0) + rw.xp,
              materials: {
                kristal: mat.kristal + rw.kristal,
                daun: mat.daun + rw.daun,
                bintang: mat.bintang + rw.bintang,
              },
              garden: touchGarden(p),
              dailyQuest: nextQuest,
            };
            // Auto-equip first earned companion if none equipped yet
            if (!next.rpgEquipped?.companion && starsFor(next, surah) >= 1) {
              next.rpgEquipped = { ...next.rpgEquipped, companion: surah };
            }
            if (new Date().getHours() < 7) next.stats = { ...next.stats, dawn: next.stats.dawn + 1 };
            // Learned for the first time: schedule first review in 3 days
            if (!review[surah] && starsFor(next, surah) >= 2) {
              next.review = { ...review, [surah]: { intervalDays: 3, nextAt: now + 3 * DAY, passes: 0 } };
            }
            after = Math.max(p.stars[surah] ?? 0, starsFor(next, surah));
            next = { ...next, stars: { ...next.stars, [surah]: after } };
            return next;
          });
          return { newStars: after, gained: after - before };
        },
        completePart: (surah, part, totalParts) => {
          const { activeId, progress } = get();
          const p = (activeId && progress[activeId]) || emptyProgress();
          const parts = [...new Set([...(p.parts[surah] ?? []), part])];
          mutate((q) => {
            const dq = currentDailyQuest(q);
            return {
              ...q,
              parts: { ...q.parts, [surah]: parts },
              dailyQuest: { ...dq, listen: true },
            };
          });
          if (parts.length >= totalParts) return get().completeActivity(surah, 'listen', 10);
          mutate((q) => {
            const mat = q.materials ?? { kristal: 0, daun: 0, bintang: 0 };
            return {
              ...q,
              coins: q.coins + 10,
              xp: (q.xp ?? 0) + 10,
              materials: { ...mat, kristal: mat.kristal + 1 },
              garden: touchGarden(q),
            };
          });
          return { newStars: p.stars[surah] ?? 0, gained: 0 };
        },
        claimVoiceBonus: (surah, part, coins = 5) => {
          const { activeId, progress } = get();
          const p = activeId ? progress[activeId] : undefined;
          const k = `${surah}:${part}`;
          if (!p || (p.voiceBonusParts ?? []).includes(k)) return false;
          mutate((q) => ({
            ...q,
            coins: q.coins + coins,
            xp: (q.xp ?? 0) + 10,
            voiceBonusParts: [...(q.voiceBonusParts ?? []), k],
          }));
          return true;
        },
        failReview: (surah) =>
          mutate((p) => (p.review[surah] ? { ...p, review: { ...p.review, [surah]: nextReview(p.review[surah], false) } } : p)),
        addCoins: (n) => mutate((p) => ({ ...p, coins: p.coins + n })),
        grantRpgRewards: (r) =>
          mutate((p) => {
            const mat = p.materials ?? { kristal: 0, daun: 0, bintang: 0 };
            return {
              ...p,
              xp: (p.xp ?? 0) + (r.xp ?? 0),
              coins: p.coins + (r.coins ?? 0),
              materials: {
                kristal: mat.kristal + (r.kristal ?? 0),
                daun: mat.daun + (r.daun ?? 0),
                bintang: mat.bintang + (r.bintang ?? 0),
              },
            };
          }),
        craftItem: (item) => {
          const { activeId, progress } = get();
          const p = activeId ? progress[activeId] : undefined;
          if (!p) return false;
          const mat = p.materials ?? { kristal: 0, daun: 0, bintang: 0 };
          if (
            (p.crafted ?? []).includes(item.id) ||
            mat.kristal < item.cost.kristal ||
            mat.daun < item.cost.daun ||
            mat.bintang < item.cost.bintang ||
            p.coins < item.cost.coins
          ) {
            return false;
          }
          mutate((q) => {
            const qMat = q.materials ?? { kristal: 0, daun: 0, bintang: 0 };
            return {
              ...q,
              coins: q.coins - item.cost.coins,
              materials: {
                kristal: qMat.kristal - item.cost.kristal,
                daun: qMat.daun - item.cost.daun,
                bintang: qMat.bintang - item.cost.bintang,
              },
              crafted: [...(q.crafted ?? ['weapon-wood']), item.id],
              rpgEquipped: { ...(q.rpgEquipped ?? {}), [item.slot]: item.id },
              xp: (q.xp ?? 0) + 15,
            };
          });
          return true;
        },
        equipRpg: (slot, itemId) =>
          mutate((p) => ({
            ...p,
            rpgEquipped: { ...(p.rpgEquipped ?? {}), [slot]: itemId },
          })),
        setCompanion: (surahNo) =>
          mutate((p) => ({
            ...p,
            rpgEquipped: { ...(p.rpgEquipped ?? {}), companion: surahNo },
          })),
        recordCorrect: (kind) =>
          mutate((p) => {
            const dq = currentDailyQuest(p);
            return {
              ...p,
              stats: { ...p.stats, correct: p.stats.correct + 1, tebak: p.stats.tebak + (kind === 'tebak' ? 1 : 0) },
              dailyQuest: kind === 'tebak' ? { ...dq, review: true } : dq,
            };
          }),
        recordCombo: (combo) =>
          mutate((p) => (combo > (p.comboBest ?? 0) ? { ...p, comboBest: combo } : p)),
        claimDailyQuest: () => {
          const { activeId, progress } = get();
          const p = activeId ? progress[activeId] : undefined;
          if (!p) return false;
          const dq = currentDailyQuest(p);
          if (dq.claimed || !dq.listen || !dq.play || !dq.review) return false;
          mutate((q) => {
            const mat = q.materials ?? { kristal: 0, daun: 0, bintang: 0 };
            return {
              ...q,
              coins: q.coins + 25,
              xp: (q.xp ?? 0) + 30,
              materials: { ...mat, bintang: mat.bintang + 1 },
              dailyQuest: { ...currentDailyQuest(q), claimed: true },
            };
          });
          return true;
        },
        waterGarden: () => {
          const { activeId, progress } = get();
          const p = activeId ? progress[activeId] : undefined;
          const t = todayStr();
          if (!p || p.gardenWaterDate === t) return false;
          mutate((q) => {
            const mat = q.materials ?? { kristal: 0, daun: 0, bintang: 0 };
            return {
              ...q,
              coins: q.coins + 5,
              materials: { ...mat, daun: mat.daun + 1 },
              gardenWaterDate: t,
              garden: touchGarden(q),
            };
          });
          return true;
        },
        toggleGardenItem: (itemId) =>
          mutate((q) => {
            const cur = q.gardenPlaced ?? [];
            const exists = cur.includes(itemId);
            return { ...q, gardenPlaced: exists ? cur.filter((x) => x !== itemId) : [...cur, itemId] };
          }),
        submitSetoran: (surah) =>
          mutate((q) => ({
            ...q,
            setoran: { ...q.setoran, [surah]: { status: 'pending', at: Date.now() } },
          })),
        approveSetoran: (surah) =>
          mutate((q) => {
            const alreadyApproved = q.setoran?.[surah]?.status === 'approved';
            const mat = q.materials ?? { kristal: 0, daun: 0, bintang: 0 };
            return {
              ...q,
              coins: q.coins + (alreadyApproved ? 0 : 30),
              xp: (q.xp ?? 0) + (alreadyApproved ? 0 : 40),
              materials: alreadyApproved ? mat : { ...mat, bintang: mat.bintang + 2 },
              setoran: { ...q.setoran, [surah]: { status: 'approved', at: Date.now() } },
            };
          }),
        passSkipTest: (surah, totalParts) => {
          const { activeId, progress } = get();
          const before = (activeId && progress[activeId]?.stars[surah]) || 0;
          const parts = Array.from({ length: totalParts }, (_, i) => i);
          mutate((q) => ({ ...q, parts: { ...q.parts, [surah]: parts } }));
          get().completeActivity(surah, 'listen', 0);
          get().completeActivity(surah, 'arti', 0);
          const r = get().completeActivity(surah, 'sambung', 20);
          return { newStars: r.newStars, gained: r.newStars - before };
        },
        recordChallenge: (surah, score) => {
          const { activeId, progress } = get();
          const best = (activeId && progress[activeId]?.challenge[surah]) || 0;
          if (score > best) mutate((p) => ({ ...p, challenge: { ...p.challenge, [surah]: score } }));
          return best;
        },
        buy: (itemId, price, slot) => {
          const { activeId, progress } = get();
          const p = activeId ? progress[activeId] : undefined;
          if (!p || p.coins < price || p.owned.includes(itemId)) return false;
          mutate((q) => {
            if (slot === 'garden') {
              return {
                ...q,
                coins: q.coins - price,
                owned: [...q.owned, itemId],
                gardenPlaced: [...(q.gardenPlaced ?? []), itemId],
              };
            }
            return {
              ...q,
              coins: q.coins - price,
              owned: [...q.owned, itemId],
              equipped: { ...q.equipped, [slot]: itemId },
            };
          });
          return true;
        },
        equip: (slot, itemId) => mutate((p) => ({ ...p, equipped: { ...p.equipped, [slot]: itemId } })),
        tickTime: (seconds) =>
          mutate((p) => {
            const t = todayStr();
            const today = p.today.date === t ? p.today : { date: t, seconds: 0 };
            return { ...p, today: { date: t, seconds: today.seconds + seconds } };
          }),
        popBadge: () => set((s) => ({ pendingBadges: s.pendingBadges.slice(1) })),
        importData: (json) => {
          try {
            const data = JSON.parse(json);
            if (!Array.isArray(data.profiles) || typeof data.progress !== 'object') return false;
            set({
              profiles: data.profiles,
              progress: data.progress,
              settings: { ...get().settings, ...data.settings },
              activeId: null,
            });
            return true;
          } catch {
            return false;
          }
        },
      };
    },
    {
      name: 'hafiz-kecil',
      version: 3,
      migrate: (persisted, version) => {
        const s = persisted as Partial<GameState>;
        if (version < 3 && s.settings) s.settings = { ...s.settings, voiceSource: 'asset', repeat: 2 };
        return s as GameState;
      },
      merge: (persisted, current) => {
        const s = { ...current, ...(persisted as Partial<GameState>) };
        s.settings = { ...current.settings, ...s.settings };
        for (const id of Object.keys(s.progress)) {
          const base = emptyProgress();
          const cur = s.progress[id] ?? {};
          s.progress[id] = {
            ...base,
            ...cur,
            materials: { ...base.materials, ...(cur.materials ?? {}) },
            rpgEquipped: { ...base.rpgEquipped, ...(cur.rpgEquipped ?? {}) },
            crafted: cur.crafted?.length ? cur.crafted : base.crafted,
          };
        }
        return s;
      },
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ profiles: s.profiles, activeId: s.activeId, progress: s.progress, settings: s.settings }),
    },
  ),
);

export const useProfile = () =>
  useGameStore((s) => s.profiles.find((p) => p.id === s.activeId) ?? null);

export const useProgress = () => useGameStore((s) => (s.activeId ? s.progress[s.activeId] : undefined) ?? EMPTY);

const EMPTY = emptyProgress();

export const isDue = (r: Review | undefined) => !!r && r.nextAt <= Date.now();

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { QoriId } from '../data/quran';
import { BADGES } from '../data/badges';
import { nextReview, todayStr } from '../services/srs';

export type AgeBand = 'A' | 'B';
export type ActivityId = 'listen' | 'sambung' | 'jodoh' | 'review';

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

export interface Progress {
  stars: Record<number, number>;
  done: Record<number, Partial<Record<ActivityId, number>>>; // activity -> timestamp
  review: Record<number, Review>;
  parts: Record<number, number[]>; // Dengar & Ulangi: completed part indexes
  coins: number;
  owned: string[];
  equipped: { hat?: string; scarf?: string; boat?: string; color?: string };
  badges: string[];
  garden: { lastDate: string; days: number };
  challenge: Record<number, number>; // Tantangan Waktu best score per surah
  today: { date: string; seconds: number };
  stats: { correct: number; tebak: number; dawn: number };
}

export interface Settings {
  qori: QoriId;
  repeat: number; // 1..5
  rate: number; // 0.75 | 1
  sfx: boolean;
  voice: boolean;
  voiceSource: 'asset' | 'tts'; // Bintang: always device TTS (default) or recorded clips with TTS fallback
  childVoice: boolean; // Bintang speaks with a higher, child-like pitch
  showTranslation: boolean;
  showWordMeaning: boolean; // arti per kata under each Arabic word
  dailyLimitMin: number; // 0 = none
  unlockAll: boolean; // parent lifts the fog on all islands
}

interface GameState {
  profiles: Profile[];
  activeId: string | null;
  progress: Record<string, Progress>;
  settings: Settings;
  /** Celebration queued for the UI (badge / bloom / star). */
  pendingBadges: string[];

  addProfile: (p: Omit<Profile, 'id' | 'createdAt'>) => string;
  removeProfile: (id: string) => void;
  switchProfile: (id: string | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  completeActivity: (surah: number, activity: ActivityId, coins: number) => { newStars: number; gained: number };
  completePart: (surah: number, part: number, totalParts: number) => { newStars: number; gained: number };
  failReview: (surah: number) => void;
  addCoins: (n: number) => void;
  recordCorrect: (kind?: 'tebak') => void;
  /** Save a Tantangan Waktu score; returns the previous best. */
  recordChallenge: (surah: number, score: number) => number;
  /** Passed Tes Lompat Pulau: counts as learned (⭐⭐), murojaah gives the 3rd star later. */
  passSkipTest: (surah: number, totalParts: number) => { newStars: number; gained: number };
  buy: (itemId: string, price: number, slot: keyof Progress['equipped']) => boolean;
  equip: (slot: keyof Progress['equipped'], itemId: string | undefined) => void;
  tickTime: (seconds: number) => void;
  popBadge: () => void;
  importData: (json: string) => boolean;
}

export const emptyProgress = (): Progress => ({
  stars: {},
  done: {},
  review: {},
  parts: {},
  coins: 0,
  owned: [],
  equipped: {},
  badges: [],
  garden: { lastDate: '', days: 0 },
  challenge: {},
  today: { date: todayStr(), seconds: 0 },
  stats: { correct: 0, tebak: 0, dawn: 0 },
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
  if (d.listen && d.sambung && d.jodoh) s = 2;
  // 3rd star only for a successful review at least 3 days after learning
  if (s === 2 && (p.review[surah]?.passes ?? 0) > 0) s = 3;
  return s;
}

function touchGarden(p: Progress): Progress['garden'] {
  const t = todayStr();
  if (p.garden.lastDate === t) return p.garden;
  return { lastDate: t, days: p.garden.days + 1 };
}

function checkBadges(p: Progress): string[] {
  return BADGES.filter((b) => !p.badges.includes(b.id) && b.check(p)).map((b) => b.id);
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
          repeat: 3,
          rate: 1,
          sfx: true,
          voice: true,
          voiceSource: 'tts',
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
            let next: Progress = { ...p, done, review, coins: p.coins + coins, garden: touchGarden(p) };
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
          mutate((q) => ({ ...q, parts: { ...q.parts, [surah]: parts } }));
          if (parts.length >= totalParts) return get().completeActivity(surah, 'listen', 10);
          mutate((q) => ({ ...q, coins: q.coins + 10, garden: touchGarden(q) }));
          return { newStars: p.stars[surah] ?? 0, gained: 0 };
        },
        failReview: (surah) =>
          mutate((p) => (p.review[surah] ? { ...p, review: { ...p.review, [surah]: nextReview(p.review[surah], false) } } : p)),
        addCoins: (n) => mutate((p) => ({ ...p, coins: p.coins + n })),
        recordCorrect: (kind) =>
          mutate((p) => ({
            ...p,
            stats: { ...p.stats, correct: p.stats.correct + 1, tebak: p.stats.tebak + (kind === 'tebak' ? 1 : 0) },
          })),
        passSkipTest: (surah, totalParts) => {
          const { activeId, progress } = get();
          const before = (activeId && progress[activeId]?.stars[surah]) || 0;
          const parts = Array.from({ length: totalParts }, (_, i) => i);
          mutate((q) => ({ ...q, parts: { ...q.parts, [surah]: parts } }));
          get().completeActivity(surah, 'listen', 0);
          get().completeActivity(surah, 'jodoh', 0);
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
          mutate((q) => ({
            ...q,
            coins: q.coins - price,
            owned: [...q.owned, itemId],
            equipped: { ...q.equipped, [slot]: itemId },
          }));
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
      version: 2,
      // v2: phone TTS became the default voice for Bintang
      migrate: (persisted, version) => {
        const s = persisted as Partial<GameState>;
        if (version < 2 && s.settings) s.settings = { ...s.settings, voiceSource: 'tts' };
        return s as GameState;
      },
      merge: (persisted, current) => {
        const s = { ...current, ...(persisted as Partial<GameState>) };
        s.settings = { ...current.settings, ...s.settings };
        // Fill fields added in later versions
        for (const id of Object.keys(s.progress)) s.progress[id] = { ...emptyProgress(), ...s.progress[id] };
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

import type { Review } from '../store/useGameStore';

// Murojaah schedule (days). A successful review moves to the next step;
// a struggle moves back one step. Stars never decrease.
const STEPS = [1, 3, 7, 14, 30, 60];
const DAY = 24 * 60 * 60 * 1000;

export function nextReview(r: Review, success: boolean): Review {
  const i = Math.max(0, STEPS.indexOf(r.intervalDays));
  const step = success ? STEPS[Math.min(STEPS.length - 1, i + 1)] : STEPS[Math.max(0, i - 1)];
  return { intervalDays: step, nextAt: Date.now() + step * DAY, passes: r.passes + (success ? 1 : 0) };
}

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

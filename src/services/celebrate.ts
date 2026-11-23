import confetti from 'canvas-confetti';

// Confetti bursts from the screen edges so it never covers Qur'anic text.
export function celebrate(big = false) {
  const opts = { particleCount: big ? 90 : 40, spread: 70, startVelocity: 45, ticks: 160, zIndex: 60 };
  confetti({ ...opts, angle: 60, origin: { x: 0, y: 0.9 } });
  confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.9 } });
}

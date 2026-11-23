// Bintang's encouraging voice lines (rotated so they don't get repetitive).
export const PRAISE = ['MasyaAllah, hebat!', 'Barakallah!', 'Hebat sekali!', 'Kamu makin pintar!', 'MasyaAllah, betul!', 'Keren!', 'Alhamdulillah, benar!'];
export const RETRY = ['Hampir! Yuk, dengar lagi.', 'Ayo coba lagi, kamu pasti bisa!', 'Tidak apa-apa, coba sekali lagi ya.', 'Hmm, dengarkan baik-baik ya.'];

let i = 0;
let j = 0;
export const praise = () => PRAISE[i++ % PRAISE.length];
export const retry = () => RETRY[j++ % RETRY.length];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let k = a.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [a[k], a[r]] = [a[r], a[k]];
  }
  return a;
}

export const pick = <T,>(arr: T[], n: number) => shuffle(arr).slice(0, n);

import { get, set, del, keys } from 'idb-keyval';

// "Rekam Suaraku": recordings stay on this device and auto-delete after 7 days.
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;
const key = (profile: string, surah: number, ayah: number) => `rec:${profile}:${surah}:${ayah}`;

interface Stored {
  blob: Blob;
  at: number;
}

export const canRecord = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export async function startRecording(): Promise<() => Promise<Blob>> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  return () =>
    new Promise((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: rec.mimeType }));
      };
      rec.stop();
    });
}

export const saveRecording = (profile: string, surah: number, ayah: number, blob: Blob) =>
  set(key(profile, surah, ayah), { blob, at: Date.now() } satisfies Stored);

export async function getRecording(profile: string, surah: number, ayah: number) {
  return (await get<Stored>(key(profile, surah, ayah)))?.blob;
}

export async function listRecordings(profile: string) {
  const all = (await keys()).filter((k): k is string => typeof k === 'string' && k.startsWith(`rec:${profile}:`));
  const out: { surah: number; ayah: number; at: number; blob: Blob }[] = [];
  for (const k of all) {
    const v = await get<Stored>(k);
    const [, , s, a] = k.split(':');
    if (v) out.push({ surah: +s, ayah: +a, at: v.at, blob: v.blob });
  }
  return out.sort((x, y) => y.at - x.at);
}

export async function cleanupRecordings() {
  for (const k of await keys()) {
    if (typeof k !== 'string' || !k.startsWith('rec:')) continue;
    const v = await get<Stored>(k);
    if (!v || Date.now() - v.at > KEEP_MS) await del(k);
  }
}

export function playBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  a.onended = () => URL.revokeObjectURL(url);
  return a.play();
}

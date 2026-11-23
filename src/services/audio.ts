import { audioUrl, wordTimings, type QoriId } from '../data/quran';
import { personalize } from './personalize';
import { useGameStore } from '../store/useGameStore';
import { useToast } from '../components/Toast';
import { voiceId, spoken } from '../data/voiceLines';

// ---------- Recitation ----------

const player = typeof Audio !== 'undefined' ? new Audio() : (null as unknown as HTMLAudioElement);
if (player) {
  player.preload = 'auto';
  (player as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
}

let stopCurrent: (() => void) | null = null;
let reciting = false;

export const isReciting = () => reciting;

export interface PlayOptions {
  /** first word index (0-based, inclusive) */
  from?: number;
  /** last word index (exclusive) */
  to?: number;
  onWord?: (index: number) => void;
}

/**
 * Plays an ayah (or a range of its words) and resolves when finished or stopped.
 * Resolves `false` if it was interrupted or failed to load.
 */
export function playAyah(surah: number, ayah: number, opts: PlayOptions = {}): Promise<boolean> {
  stopAll();
  const { qori, rate } = useGameStore.getState().settings;
  const segs = wordTimings(qori, surah, ayah);
  const url = audioUrl(qori, surah, ayah);
  const startMs = opts.from && segs[opts.from] ? Math.max(0, segs[opts.from][1] - 80) : 0;
  const endSeg = opts.to !== undefined && opts.to < segs.length ? segs[opts.to - 1] : undefined;
  const endMs = endSeg ? endSeg[2] + 120 : Infinity;

  return new Promise((resolve) => {
    let raf = 0;
    let lastWord = -1;
    let finished = false;

    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(loadTimer);
      reciting = false;
      cancelAnimationFrame(raf);
      player.onended = player.onerror = null;
      player.pause();
      stopCurrent = null;
      opts.onWord?.(-1);
      resolve(ok);
    };
    stopCurrent = () => finish(false);
    // Never leave the UI waiting on audio that doesn't load
    const loadTimer = setTimeout(() => {
      if (!reciting) audioFailed();
      finish(false);
    }, 15000);

    const tick = () => {
      const ms = player.currentTime * 1000;
      if (ms >= endMs) return finish(true);
      if (opts.onWord) {
        let w = -1;
        for (let i = 0; i < segs.length; i++) if (ms >= segs[i][1] - 40) w = segs[i][0] - 1;
        if (w !== lastWord) opts.onWord((lastWord = w));
      }
      raf = requestAnimationFrame(tick);
    };

    if (!player.src.endsWith(url)) player.src = url;
    player.playbackRate = rate;
    player.onended = () => finish(true);
    player.onerror = () => {
      audioFailed();
      finish(false);
    };
    const start = () => {
      if (finished) return;
      player.currentTime = startMs / 1000;
      reciting = true;
      player
        .play()
        .then(() => {
          clearTimeout(loadTimer);
          raf = requestAnimationFrame(tick);
        })
        .catch(() => finish(false));
    };
    if (player.readyState >= 1 && player.src.endsWith(url)) start();
    else player.addEventListener('loadedmetadata', start, { once: true });
  });
}

let lastFail = 0;
function audioFailed() {
  // One message at a time, even if several ayahs fail in a row
  if (Date.now() - lastFail < 8000) return;
  lastFail = Date.now();
  useToast.getState().show(navigator.onLine ? 'Suara belum bisa diputar. Coba ketuk lagi ya.' : 'Tidak ada internet. Unduh pulau dulu supaya bisa didengar offline.');
}

/** Plays a single word cut from the ayah recording. */
export const playWord = (surah: number, ayah: number, wordIndex: number) =>
  playAyah(surah, ayah, { from: wordIndex, to: wordIndex + 1 });

export function stopAll() {
  stopCurrent?.();
  stopVoice();
}

// ---------- Bintang's voice: recorded lines (public/voice/), device TTS as fallback ----------

const clip = typeof Audio !== 'undefined' ? new Audio() : null;
const missing = new Set<string>(); // recordings that don't exist; use TTS for these
let endClip: ((r: ClipResult) => void) | null = null;
let sayToken = 0;

type ClipResult = 'done' | 'stopped' | 'missing' | 'blocked';

function stopVoice() {
  sayToken++;
  endClip?.('stopped');
  stopBuffer?.();
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

function playClip(url: string): Promise<ClipResult> {
  if (!clip) return Promise.resolve('missing');
  endClip?.('stopped');
  return new Promise((resolve) => {
    const end = (r: ClipResult) => {
      if (endClip !== end) return;
      endClip = null;
      clip.onended = clip.onerror = null;
      if (r !== 'done') clip.pause();
      resolve(r);
    };
    endClip = end;
    clip.onended = () => end('done');
    clip.onerror = () => end('missing'); // 404 → SPA fallback HTML → decode error
    clip.src = url;
    clip.play().catch((e: DOMException) => end(e.name === 'NotAllowedError' ? 'blocked' : 'missing'));
  });
}

// Decoded recordings kept in memory so they play instantly (no download/decode delay).
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
const MAX_BUFFERS = 150;
let stopBuffer: (() => void) | null = null;

function loadBuffer(id: string): Promise<AudioBuffer | null> {
  if (buffers.has(id)) return Promise.resolve(buffers.get(id)!);
  if (missing.has(id)) return Promise.resolve(null);
  let p = loading.get(id);
  if (!p) {
    p = fetch(`/voice/${id}.mp3`)
      .then((res) => {
        if (!res.ok || !(res.headers.get('content-type') ?? '').includes('audio')) throw new Error('missing');
        return res.arrayBuffer();
      })
      .then((data) => getCtx().decodeAudioData(data))
      .then((buf) => {
        if (buffers.size >= MAX_BUFFERS) buffers.delete(buffers.keys().next().value!);
        buffers.set(id, buf);
        return buf;
      })
      .catch(() => {
        missing.add(id);
        return null;
      })
      .finally(() => loading.delete(id));
    loading.set(id, p);
  }
  return p;
}

/** Load recordings in the background so Bintang can say them instantly later. */
export async function preloadVoices(lines: string[]) {
  const ids = [...new Set(lines.map(voiceId))].filter((id) => !buffers.has(id) && !missing.has(id));
  const worker = async () => {
    while (ids.length) await loadBuffer(ids.shift()!);
  };
  await Promise.all(Array.from({ length: 3 }, worker));
}

function playBuffer(buf: AudioBuffer): Promise<void> {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  return new Promise((resolve) => {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    const done = () => {
      if (stopBuffer === stop) stopBuffer = null;
      resolve();
    };
    const stop = () => {
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      done();
    };
    src.onended = done;
    stopBuffer?.();
    stopBuffer = stop;
    src.start();
  });
}

const useTts = () => useGameStore.getState().settings.voiceSource === 'tts' && typeof speechSynthesis !== 'undefined';

/**
 * Bintang says one or more sentences in order. By default it speaks with device TTS.
 * With the recorded-voice setting it uses the recording, waiting briefly if it isn't
 * loaded yet, and falls back to device TTS only when a line has no recording.
 */
export async function say(text: string | string[]): Promise<void> {
  if (!useGameStore.getState().settings.voice || reciting) return;
  stopVoice();
  const token = sayToken;
  for (const t of Array.isArray(text) ? text : [text]) {
    if (token !== sayToken) return;
    if (useTts()) {
      await ttsSay(personalize(t));
      continue;
    }
    const id = voiceId(t);
    const buf = buffers.get(id);
    if (buf) {
      await playBuffer(buf);
      continue;
    }
    // Wait briefly for the recording (longer if there is no TTS to fall back to)
    const wait = typeof speechSynthesis === 'undefined' ? 2000 : 1200;
    const b = await Promise.race([loadBuffer(id), new Promise<null>((r) => setTimeout(() => r(null), wait))]);
    if (token !== sayToken) return;
    if (b) await playBuffer(b);
    else await ttsSay(t);
  }
}

/**
 * Plays the welcome greeting. Resolves true if sound started,
 * false if the browser is still waiting for the first touch.
 */
export async function playVoice(id: string, fallbackText: string): Promise<boolean> {
  if (!useGameStore.getState().settings.voice) return true;
  stopVoice();
  if (useTts()) {
    ttsSay(fallbackText);
    await new Promise((r) => setTimeout(r, 800));
    return speechSynthesis.speaking;
  }
  const done = playClip(`/voice/${id}.mp3`);
  const first = await Promise.race([done, new Promise<'playing'>((r) => setTimeout(() => r('playing'), 400))]);
  if (first === 'blocked') return false;
  if (first === 'missing') {
    ttsSay(fallbackText);
    await new Promise((r) => setTimeout(r, 800));
    return typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking;
  }
  return true;
}

let idVoice: SpeechSynthesisVoice | null | undefined;
function pickVoice() {
  if (idVoice !== undefined && idVoice !== null) return idVoice;
  const voices = speechSynthesis.getVoices();
  idVoice = voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('id')) ?? null;
  return idVoice;
}

function ttsSay(text: string): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve();
  const { childVoice } = useGameStore.getState().settings;
  speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(spoken(text));
    u.lang = 'id-ID';
    const v = pickVoice();
    if (v) u.voice = v;
    // Browsers only ship adult voices; a higher pitch makes Bintang sound like a child
    // (too high sounds shrill; ~1.35 stays natural on most Android voices)
    u.rate = childVoice ? 1.0 : 0.95;
    u.pitch = childVoice ? 1.35 : 1.05;
    const timer = setTimeout(resolve, 600 + text.length * 90);
    u.onend = u.onerror = () => {
      clearTimeout(timer);
      resolve();
    };
    speechSynthesis.speak(u);
  });
}

/** Show Bintang's message on screen and speak it (optionally a different, recorded sentence). */
export function notify(text: string, speech: string | string[] = text) {
  useToast.getState().show(text);
  return say(speech);
}

/** Show a message on screen only (technical notes that aren't worth speaking). */
export const toast = (text: string) => useToast.getState().show(text);

// ---------- Sound effects (synthesized: soft chimes, no music) ----------

let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
};

function tone(freq: number, at: number, dur: number, gain = 0.15, type: OscillatorType = 'sine') {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.05);
}

export type Sfx = 'tap' | 'correct' | 'gentle' | 'bloom' | 'coin' | 'combo';

export function sfx(kind: Sfx) {
  // Audio ducking: never play effects over a recitation
  if (!useGameStore.getState().settings.sfx || reciting) return;
  try {
    switch (kind) {
      case 'tap':
        tone(660, 0, 0.08, 0.08, 'triangle');
        break;
      case 'correct':
        tone(880, 0, 0.5);
        tone(1320, 0.12, 0.6);
        break;
      case 'combo':
        tone(880, 0, 0.14, 0.12, 'triangle');
        tone(1174, 0.07, 0.16, 0.12, 'triangle');
        tone(1568, 0.14, 0.35, 0.14, 'triangle');
        break;
      case 'gentle':
        tone(392, 0, 0.35, 0.08);
        break;
      case 'coin':
        tone(1046, 0, 0.12, 0.1, 'triangle');
        tone(1568, 0.08, 0.25, 0.1, 'triangle');
        break;
      case 'bloom':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.6, 0.1));
        break;
    }
  } catch {
    /* audio not available */
  }
}

/** Must run inside a user gesture (iOS/Safari autoplay policy). */
export function unlockAudio() {
  try {
    getCtx().resume();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.getVoices();
      speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }
    player.muted = true;
    player.play().catch(() => {}).finally(() => {
      player.pause();
      player.muted = false;
    });
  } catch {
    /* ignore */
  }
}

// ---------- Offline download ----------

const CACHE = 'quran-audio-cache';

/** Fetches Bintang's recordings so the service worker caches them for offline use. */
export async function downloadVoices(lines: string[], onProgress?: (done: number) => void) {
  const urls = [...new Set(lines.map((t) => `/voice/${voiceId(t)}.mp3`))];
  let done = 0;
  let ok = true;
  const worker = async () => {
    while (urls.length) {
      const url = urls.shift()!;
      try {
        const res = await fetch(url);
        ok &&= res.ok;
        await res.arrayBuffer();
      } catch {
        ok = false;
      }
      onProgress?.(++done);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return ok;
}

/** Offline storage only works on localhost or HTTPS. */
export const canDownload = () => typeof window !== 'undefined' && 'caches' in window;

export async function downloadedCount(qori: QoriId, surah: number, count: number): Promise<number> {
  if (!('caches' in window)) return 0;
  const cache = await caches.open(CACHE);
  let n = 0;
  for (let a = 1; a <= count; a++) if (await cache.match(audioUrl(qori, surah, a))) n++;
  return n;
}

export async function downloadSurah(
  qori: QoriId,
  surah: number,
  count: number,
  onProgress?: (done: number) => void,
): Promise<boolean> {
  if (!('caches' in window)) return false;
  navigator.storage?.persist?.();
  const cache = await caches.open(CACHE);
  let done = 0;
  let ok = true;
  for (let a = 1; a <= count; a++) {
    const url = audioUrl(qori, surah, a);
    if (!(await cache.match(url))) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) await cache.put(url, res);
        else ok = false;
      } catch {
        ok = false;
      }
    }
    onProgress?.(++done);
  }
  return ok;
}

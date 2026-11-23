// Records every Bintang sentence (src/data/voiceLines.ts) into public/voice/ with
// Microsoft Edge neural TTS, then trims silence and compresses with ffmpeg.
// Requires `pip install edge-tts`, `pkg install ffmpeg` and internet (dev time only).
//
//   node scripts/make-voice.mjs                  # only missing files
//   node scripts/make-voice.mjs --force          # re-record everything
//   node scripts/make-voice.mjs --compress-only  # just trim + compress existing files
//   node scripts/make-voice.mjs --voice id-ID-ArdiNeural
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, statSync } from 'node:fs';
import { allVoiceLines, voiceId, voiceKind, spoken, WELCOME } from '../src/data/voiceLines.ts';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const VOICE = arg('voice', 'id-ID-GadisNeural');
const FORCE = process.argv.includes('--force');
const COMPRESS_ONLY = process.argv.includes('--compress-only');
const DIR = new URL('../public/voice/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

// Intonation per sentence type. A modest pitch lift keeps the voice young without sounding robotic.
const PROSODY = {
  cheer: { rate: '+8%', pitch: '+28Hz' }, // praise & rewards: brighter and quicker
  guide: { rate: '+0%', pitch: '+22Hz' }, // instructions: clear and steady
  story: { rate: '-8%', pitch: '+18Hz' }, // island explanations & stories: calm storytelling
  word: { rate: '-10%', pitch: '+20Hz' }, // single vocabulary words: slow and distinct
};

const HAS_FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0;
if (!HAS_FFMPEG) console.warn('ffmpeg not found: files will not be trimmed/compressed (pkg install ffmpeg)');

// Trim leading/trailing silence, keep a short natural tail, mono 24 kHz, 32 kbps
const FFMPEG_FILTER =
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,' +
  'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse';

const exec = (cmd, args) =>
  new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'ignore' });
    p.on('close', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
  });

async function compress(file) {
  if (!HAS_FFMPEG) return true;
  const tmp = file.replace(/\.mp3$/, '.tmp.mp3');
  const ok = await exec('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-af', FFMPEG_FILTER, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '32k', tmp]);
  if (ok && statSync(tmp).size > 500) renameSync(tmp, file);
  else if (existsSync(tmp)) unlinkSync(tmp);
  return ok;
}

async function record(j) {
  const { rate, pitch } = PROSODY[j.kind];
  const raw = DIR + j.file.replace(/\.mp3$/, '.raw.mp3');
  for (let attempt = 0; attempt < 3; attempt++) {
    const ok = await exec('edge-tts', ['--voice', VOICE, `--rate=${rate}`, `--pitch=${pitch}`, '--text', spoken(j.text), '--write-media', raw]);
    if (ok && existsSync(raw) && statSync(raw).size > 2000) {
      renameSync(raw, DIR + j.file);
      return compress(DIR + j.file);
    }
  }
  if (existsSync(raw)) unlinkSync(raw);
  return false;
}

const jobs = [
  { file: 'salam.mp3', text: WELCOME, kind: 'guide' },
  ...allVoiceLines().map((t) => ({ file: `${voiceId(t)}.mp3`, text: t, kind: voiceKind(t) })),
];

// Remove recordings of sentences that no longer exist (and leftovers from interrupted runs)
const keep = new Set(jobs.map((j) => j.file));
for (const f of readdirSync(DIR))
  if ((/^v-.*\.mp3$/.test(f) && !keep.has(f)) || /\.(raw|tmp)\.mp3$/.test(f)) unlinkSync(DIR + f);

const todo = COMPRESS_ONLY ? jobs.filter((j) => existsSync(DIR + j.file)) : jobs.filter((j) => FORCE || !existsSync(DIR + j.file));
console.log(`${jobs.length} sentences, ${todo.length} to ${COMPRESS_ONLY ? 'compress' : 'record'} (${VOICE})`);

let done = 0;
const failed = [];
const worker = async () => {
  while (todo.length) {
    const j = todo.shift();
    const ok = COMPRESS_ONLY ? await compress(DIR + j.file) : await record(j);
    if (!ok) failed.push(j.text);
    if (++done % 25 === 0) console.log(`  ${done} done`);
  }
};
await Promise.all(Array.from({ length: 4 }, worker));
const total = readdirSync(DIR).filter((f) => f.endsWith('.mp3')).reduce((a, f) => a + statSync(DIR + f).size, 0);
console.log(failed.length ? `Failed (${failed.length}):\n  ${failed.join('\n  ')}` : 'All done ✓', `| total ${(total / 1048576).toFixed(1)} MB`);

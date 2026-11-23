import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui';
import { Bintang, BintangSays } from '../components/Bintang';
import { InstallButton } from '../components/InstallButton';
import { useGameStore, type AgeBand } from '../store/useGameStore';
import { say, playVoice, unlockAudio, preloadVoices } from '../services/audio';
import { navigate } from '../hooks/useRoute';
import { SHOP } from '../data/shop';
import { WELCOME, L } from '../data/voiceLines';

const COLORS = SHOP.filter((i) => i.slot === 'color');


/** Splash (audio unlock tap) + profile picker + first-time setup. */
export default function Onboarding({ onStart }: { onStart: () => void }) {
  const profiles = useGameStore((s) => s.profiles);
  const switchProfile = useGameStore((s) => s.switchProfile);
  const addProfile = useGameStore((s) => s.addProfile);
  const [step, setStep] = useState<'splash' | 'who' | 'name' | 'age'>('splash');
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0].preview);
  const greeted = useRef(false);

  useEffect(() => {
    preloadVoices([L.who, L.askName, L.askAge]);
  }, []);

  // Welcome greeting. Browsers block sound until the first touch, so: try right away,
  // and if that is blocked, greet on the first tap anywhere on the screen.
  useEffect(() => {
    if (step !== 'splash') return;
    const greet = () => {
      greeted.current = true;
      unlockAudio();
      playVoice('salam', WELCOME);
    };
    const t = setTimeout(async () => {
      if (await playVoice('salam', WELCOME)) greeted.current = true;
    }, 700);
    const onTap = (e: Event) => {
      if (greeted.current || (e.target as Element).closest?.('[data-no-greet]')) return;
      greet();
    };
    document.addEventListener('click', onTap, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onTap, true);
    };
  }, [step]);

  const start = () => {
    unlockAudio(); // must happen inside this tap (iOS)
    if (profiles.length) {
      setStep('who');
      say(L.who); // inside the tap, so iOS allows the sound
    } else {
      setStep('name');
      say(L.askName);
    }
  };

  const finish = (band: AgeBand) => {
    addProfile({ nickname: name.trim() || 'Sahabat', avatar: color, ageBand: band });
    onStart();
    navigate('/pulau/114/dengar', true);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      {step === 'splash' && (
        <>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
            <Bintang size={180} />
          </motion.div>
          <h1 className="text-4xl font-semibold text-blue-700">Petualangan Hafiz Kecil</h1>
          <p className="text-lg text-slate-600">Menjelajah 37 pulau Juz 30 bersama Bintang!</p>
          <div className="relative rounded-3xl bg-white px-4 py-3 text-lg font-semibold text-slate-700 shadow-md">
            Assalamu'alaikum! 👋 Ayo ketuk tombol hijau <b className="text-emerald-600">Ayo Mulai!</b>
            <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
          </div>
          <div className="mt-2 flex w-full flex-col items-center gap-7" data-no-greet>
            <motion.span
              className="text-5xl leading-none"
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
              aria-hidden
            >
              👇
            </motion.span>
            <motion.div
              className="w-full"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            >
              <Button big color="green" className="w-full text-3xl" onClick={start}>
                Ayo Mulai! ✨
              </Button>
            </motion.div>
          </div>
          <div data-no-greet>
            <Button
              color="white"
              label="Dengar salam"
              onClick={() => {
                greeted.current = true;
                unlockAudio();
                playVoice('salam', WELCOME);
              }}
            >
              <Volume2 size={24} /> Dengar salam
            </Button>
          </div>
          <div data-no-greet>
            <InstallButton />
          </div>
        </>
      )}

      {step === 'who' && (
        <>
          <BintangSays text="Siapa yang mau belajar?" />
          <div className="grid w-full gap-3">
            {profiles.map((pr) => (
              <Button
                key={pr.id}
                big
                color="white"
                onClick={() => {
                  switchProfile(pr.id);
                  onStart();
                }}
              >
                <span className="h-8 w-8 rounded-full" style={{ background: pr.avatar }} /> {pr.nickname}
              </Button>
            ))}
            <Button color="blue" onClick={() => setStep('name')}>
              + Teman baru
            </Button>
          </div>
        </>
      )}

      {step === 'name' && (
        <>
          <BintangSays text="Aku Bintang! Siapa namamu?" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 16))}
            placeholder="Nama panggilan"
            autoComplete="off"
            className="h-16 w-full rounded-3xl border-4 border-sky-300 bg-white px-5 text-center text-2xl outline-none focus:border-amber-400"
          />
          <p className="text-sm text-slate-500">Cukup nama panggilan saja. Tidak perlu nama lengkap.</p>
          <div className="flex gap-3">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.name}
                onClick={() => setColor(c.preview)}
                className={`h-14 w-14 rounded-full shadow ${color === c.preview ? 'ring-4 ring-slate-700' : ''}`}
                style={{ background: c.preview }}
              />
            ))}
          </div>
          <Button
            big
            color="green"
            className="w-full"
            onClick={() => {
              setStep('age');
              say(L.askAge);
            }}
          >
            Lanjut ➜
          </Button>
        </>
      )}

      {step === 'age' && (
        <>
          <BintangSays text="Berapa umurmu?" />
          <div className="grid w-full gap-4">
            <Button big color="yellow" className="flex-col py-6" onClick={() => finish('A')}>
              <span className="text-5xl">🐣</span>
              <span>5 – 7 tahun</span>
              <span className="text-base font-normal">Pemula: banyak mendengar</span>
            </Button>
            <Button big color="blue" className="flex-col py-6" onClick={() => finish('B')}>
              <span className="text-5xl">🧭</span>
              <span>8 – 12 tahun</span>
              <span className="text-base font-normal">Penjelajah: lebih menantang</span>
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

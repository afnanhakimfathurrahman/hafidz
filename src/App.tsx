import { useEffect, useState } from 'react';
import { useGameStore, useProfile, useProgress } from './store/useGameStore';
import { useRoute, navigate } from './hooks/useRoute';
import { Modal, Button } from './components/ui';
import { Bintang } from './components/Bintang';
import { ParentGate } from './components/ParentGate';
import { Toast } from './components/Toast';
import { say, preloadVoices } from './services/audio';
import { todayStr } from './services/srs';
import { L, commonVoiceLines } from './data/voiceLines';
import Onboarding from './pages/Onboarding';
import MapView from './pages/MapView';
import IslandView from './pages/IslandView';
import ListenRepeat from './pages/activities/ListenRepeat';
import SambungAyat from './pages/activities/SambungAyat';
import JodohkanMakna from './pages/activities/JodohkanMakna';
import LengkapiKata from './pages/activities/LengkapiKata';
import SusunAyat from './pages/activities/SusunAyat';
import RpgBattle from './pages/activities/RpgBattle';
import ArtiQuest from './pages/activities/ArtiQuest';
import MushafTasmi from './pages/activities/MushafTasmi';
import TebakSurah from './pages/TebakSurah';
import Shop from './pages/Shop';
import Badges from './pages/Badges';
import Garden from './pages/Garden';
import Forge from './pages/Forge';
import Collection from './pages/Collection';
import KamusArti from './pages/KamusArti';
import ParentArea from './pages/ParentArea';
import { useFoggy } from './services/fog';

const BREAK_AFTER_S = 15 * 60;

function useHydrated() {
  const [ok, setOk] = useState(useGameStore.persist.hasHydrated());
  useEffect(() => useGameStore.persist.onFinishHydration(() => setOk(true)), []);
  return ok;
}

/** Counts active play time; suggests a break after 15 minutes and enforces the parent's daily limit. */
function usePlayTime(active: boolean) {
  const tick = useGameStore((s) => s.tickTime);
  const limit = useGameStore((s) => s.settings.dailyLimitMin);
  const p = useProgress();
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      tick(15);
      setSession((s) => s + 15);
    }, 15000);
    return () => clearInterval(id);
  }, [active, tick]);
  const today = p.today.date === todayStr() ? p.today.seconds : 0;
  return { needBreak: session >= BREAK_AFTER_S, overLimit: limit > 0 && today >= limit * 60, resetSession: () => setSession(0) };
}

function Routes() {
  const [a, b, c, d] = useRoute();
  const n = Number(b);
  const foggy = useFoggy(n);
  if (a === 'pulau' && n >= 78 && n <= 114) {
    if (c === 'lompat' && foggy) return <SambungAyat key={`s${n}`} surahNo={n} skip />;
    // Activities of a foggy island aren't open yet: show the island (with its fog notice)
    if (foggy) return <IslandView key={n} surahNo={n} />;
    if (c === 'dengar') return <ListenRepeat key={`${n}-${d}`} surahNo={n} part={d !== undefined ? Number(d) : undefined} />;
    if (c === 'mushaf') return <MushafTasmi key={`m${n}`} surahNo={n} />;
    if (c === 'battle') return <RpgBattle key={`b${n}`} surahNo={n} />;
    if (c === 'arti') return <ArtiQuest key={`a${n}`} surahNo={n} />;
    if (c === 'sambung') return <SambungAyat key={n} surahNo={n} />;
    if (c === 'lengkapi') return <LengkapiKata key={`l${n}`} surahNo={n} />;
    if (c === 'susun') return <SusunAyat key={`u${n}`} surahNo={n} />;
    if (c === 'tantangan') return <SambungAyat key={`t${n}`} surahNo={n} timed />;
    if (c === 'review') return <SambungAyat key={`r${n}`} surahNo={n} review />;
    if (c === 'jodoh') return <JodohkanMakna key={n} surahNo={n} />;
    return <IslandView key={n} surahNo={n} />;
  }
  if (a === 'murojaah') return <TebakSurah />;
  if (a === 'kamus') return <KamusArti />;
  if (a === 'toko') return <Shop />;
  if (a === 'lencana') return <Badges />;
  if (a === 'kebun') return <Garden />;
  if (a === 'bengkel') return <Forge />;
  if (a === 'koleksi') return <Collection />;
  if (a === 'orang-tua') return <ParentArea />;
  return <MapView />;
}

export default function App() {
  const hydrated = useHydrated();
  const profile = useProfile();
  const [started, setStarted] = useState(false);
  const [breakDismissed, setBreakDismissed] = useState(false);
  const [gate, setGate] = useState(false);
  const [limitUnlocked, setLimitUnlocked] = useState(false);
  const { needBreak, overLimit, resetSession } = usePlayTime(started && !!profile);

  useEffect(() => {
    if (started && profile) preloadVoices(commonVoiceLines());
  }, [started, profile]);

  const showBreak = needBreak && !breakDismissed;
  const showLimit = overLimit && !limitUnlocked;

  useEffect(() => {
    if (showBreak) say(L.takeBreak);
    if (showLimit) say(L.dayLimit);
  }, [showBreak, showLimit]);

  if (!hydrated) return <div className="flex min-h-screen items-center justify-center text-6xl">⭐</div>;
  if (!started || !profile)
    return (
      <>
        <Onboarding onStart={() => setStarted(true)} />
        <Toast />
      </>
    );

  return (
    <>
      <Routes />
      <Toast />
      <Modal open={showBreak && !showLimit}>
        <Bintang size={110} mood="happy" />
        <h2 className="text-2xl font-semibold">Istirahat dulu yuk! 🥤</h2>
        <p className="my-2 text-slate-600">Kamu sudah belajar 15 menit. Minum air dan regangkan badan, lalu lanjut lagi.</p>
        <Button
          big
          color="green"
          className="w-full"
          onClick={() => {
            setBreakDismissed(true);
            resetSession();
          }}
        >
          Oke!
        </Button>
      </Modal>
      <Modal open={showLimit}>
        <div className="text-7xl">🌙</div>
        <h2 className="text-2xl font-semibold">Sampai jumpa besok!</h2>
        <p className="my-2 text-slate-600">Waktu belajar hari ini sudah cukup. Hafalanmu akan menunggu besok, insyaAllah.</p>
        <Button color="white" className="w-full" onClick={() => setGate(true)}>
          Orang tua: lanjutkan
        </Button>
      </Modal>
      <ParentGate
        open={gate}
        onClose={() => setGate(false)}
        onPass={() => {
          setGate(false);
          setLimitUnlocked(true);
          navigate(location.pathname, true);
        }}
      />
    </>
  );
}

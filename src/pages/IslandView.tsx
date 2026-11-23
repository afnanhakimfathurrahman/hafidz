import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Volume2, DownloadCloud, BookOpen, Award, Play, Square, Repeat, Mic, Swords } from 'lucide-react';
import { surahOf, partsOf } from '../data/quran';
import { islandOf } from '../data/islands';
import { STAGE_LABEL, companionStage, surahRpgOf } from '../data/rpg';
import { Button, Modal, Stars, TopBar } from '../components/ui';
import { BintangSays } from '../components/Bintang';
import { BadgeToast } from '../components/BadgeToast';
import { ParentGate } from '../components/ParentGate';
import { useGameStore, useProfile, useProgress, isDue } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import {
  playAyah,
  say,
  notify,
  toast,
  stopAll,
  downloadSurah,
  downloadedCount,
  canDownload,
  downloadVoices,
  preloadVoices,
  sfx,
} from '../services/audio';
import { canRecord, startRecording, saveRecording, playBlob } from '../services/recorder';
import { L, islandVoiceLines, commonVoiceLines } from '../data/voiceLines';
import { makeCertificate, shareCertificate } from '../services/certificate';
import { SeoHead } from '../components/SeoHead';
import { useFoggy, frontierOf } from '../services/fog';

const DAY = 24 * 60 * 60 * 1000;

interface ActivityCard {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  done: boolean;
  locked: boolean;
  lockMsg?: string;
  color: string;
}

export default function IslandView({ surahNo }: { surahNo: number }) {
  const surah = surahOf(surahNo);
  const island = islandOf(surahNo);
  const rpg = surahRpgOf(surahNo);
  const profile = useProfile()!;
  const p = useProgress();
  const qori = useGameStore((s) => s.settings.qori);
  const submitSetoran = useGameStore((s) => s.submitSetoran);

  const stars = p.stars[surahNo] ?? 0;
  const done = p.done[surahNo] ?? {};
  const parts = partsOf(surah, profile.ageBand);
  const partsDone = p.parts[surahNo] ?? [];
  const review = p.review[surahNo];
  const foggy = useFoggy(surahNo);
  const frontier = frontierOf(p);
  const setoran = p.setoran?.[surahNo];
  const stage = companionStage(p, surahNo);

  const [story, setStory] = useState(false);
  const [gate, setGate] = useState(false);
  const [cert, setCert] = useState<string | null>(null);
  const [dl, setDl] = useState<number | null>(null);

  // Murattal Loop state
  const [murattalAyah, setMurattalAyah] = useState<number | null>(null);
  const [loopSurah, setLoopSurah] = useState(true);
  const murattalRun = useRef(0);
  const loopRef = useRef(true);
  loopRef.current = loopSurah;

  // Setoran modal state
  const [setoranOpen, setSetoranOpen] = useState(false);
  const [recStop, setRecStop] = useState<null | (() => Promise<Blob>)>(null);
  const [recBlob, setRecBlob] = useState<Blob | null>(null);

  useEffect(() => {
    preloadVoices(islandVoiceLines(surahNo));
  }, [surahNo]);

  useEffect(() => {
    downloadedCount(qori, surahNo, surah.count).then(setDl);
    return () => {
      murattalRun.current++;
      stopAll();
    };
  }, [qori, surahNo, surah.count]);

  const stopMurattal = () => {
    murattalRun.current++;
    setMurattalAyah(null);
    stopAll();
  };

  const toggleMurattal = async () => {
    if (murattalAyah !== null) {
      stopMurattal();
      return;
    }
    const id = ++murattalRun.current;
    do {
      for (let a = 1; a <= surah.count; a++) {
        if (murattalRun.current !== id) return;
        setMurattalAyah(a);
        const ok = await playAyah(surahNo, a);
        if (!ok || murattalRun.current !== id) {
          setMurattalAyah(null);
          return;
        }
      }
    } while (loopRef.current && murattalRun.current === id);
    if (murattalRun.current === id) setMurattalAyah(null);
  };

  const download = async () => {
    if (!canDownload()) {
      toast(`Unduh offline hanya bisa dari ${location.origin} (HTTPS atau localhost).`);
      return;
    }
    setDl(0);
    const ok =
      (await downloadSurah(qori, surahNo, surah.count, setDl)) &&
      (await downloadVoices([...islandVoiceLines(surahNo), ...commonVoiceLines()]));
    setDl(await downloadedCount(qori, surahNo, surah.count));
    if (ok) notify(L.offlineReady);
    else toast('Sebagian suara gagal diunduh. Cek internet lalu coba lagi.');
  };

  const toggleSetoranRec = async () => {
    if (recStop) {
      const blob = await recStop();
      setRecStop(null);
      setRecBlob(blob);
      await saveRecording(profile.id, surahNo, 0, blob);
    } else {
      try {
        stopMurattal();
        const stop = await startRecording();
        setRecStop(() => stop);
      } catch {
        setRecStop(null);
        toast('Mikrofon tidak bisa dipakai. Izinkan mikrofon di browser ya.');
      }
    }
  };

  const sendSetoran = async () => {
    if (recStop) {
      const blob = await recStop();
      setRecStop(null);
      setRecBlob(blob);
      await saveRecording(profile.id, surahNo, 0, blob);
    }
    submitSetoran(surahNo);
    setSetoranOpen(false);
    sfx('correct');
    notify('Setoran dikirim! Beri tahu Ayah atau Bunda untuk mendengarkan di Area Orang Tua.');
  };

  const listenDone = !!done.listen;
  const gamesUnlocked = listenDone || partsDone.length > 0;

  const hafalanActivities: ActivityCard[] = [
    {
      id: 'dengar',
      emoji: '🎧',
      name: 'Dengar & Ulangi',
      desc: parts.length > 1 ? `${partsDone.length}/${parts.length} bagian · +💎` : 'Dengar, ulangi, hafalkan · +💎',
      done: listenDone,
      locked: false,
      color: 'from-amber-400 to-orange-500',
    },
    {
      id: 'sambung',
      emoji: '🧩',
      name: 'Sambung Ayat',
      desc: 'Tebak ayat lanjutannya · +💎',
      done: !!done.sambung,
      locked: !gamesUnlocked,
      color: 'from-sky-400 to-blue-600',
    },
    {
      id: 'lengkapi',
      emoji: '✏️',
      name: 'Lengkapi Kata',
      desc: 'Cari kata Arab yang hilang · +💎',
      done: !!done.lengkapi,
      locked: !gamesUnlocked,
      color: 'from-teal-400 to-emerald-600',
    },
    {
      id: 'susun',
      emoji: '🚂',
      name: 'Kereta Ayat',
      desc: 'Susun urutan ayat berurutan · +💎',
      done: !!done.susun,
      locked: !gamesUnlocked,
      color: 'from-indigo-400 to-violet-600',
    },
    ...(profile.ageBand === 'B'
      ? [
          {
            id: 'tantangan',
            emoji: '⏱️',
            name: 'Tantangan Waktu',
            desc: p.challenge[surahNo] ? `Rekor: ${p.challenge[surahNo]} benar` : 'Jawab cepat sebelum waktu habis!',
            done: false,
            locked: !done.sambung,
            lockMsg: 'Selesaikan Sambung Ayat dulu ya! 🧩',
            color: 'from-rose-400 to-orange-500',
          },
        ]
      : []),
  ];

  const artiActivities: ActivityCard[] = [
    {
      id: 'arti',
      emoji: '📖',
      name: 'Ujian Arti Surat & Ayat',
      desc: `Hafalkan arti "${surah.meaning}" & terjemahan ayat · +🌿`,
      done: !!done.arti,
      locked: !gamesUnlocked,
      color: 'from-emerald-400 to-teal-600',
    },
    {
      id: 'jodoh',
      emoji: '🃏',
      name: 'Jodohkan Makna',
      desc: 'Pasangkan kosakata Arab & artinya · +🌿',
      done: !!done.jodoh,
      locked: !gamesUnlocked,
      color: 'from-purple-400 to-fuchsia-600',
    },
  ];

  const nextHint = foggy
    ? `Pulau ini masih tertutup kabut. Selesaikan Pulau ${frontier ? islandOf(frontier).latin : ''} dulu ya!`
    : !gamesUnlocked
      ? 'Ayo mulai dengan Dengar & Ulangi untuk membuka jurus hafalan & duel penjaga!'
      : !done.battle
        ? `Siap! Tantang ${rpg.bossName} atau kuasai Hafalan & Arti untuk evolusi ${rpg.companionName}!`
        : isDue(review)
          ? 'Pulau ini rindu kamu! Ayo murojaah untuk menjaga hafalanmu.'
          : stars < 3
            ? 'MasyaAllah! Kembali lagi nanti untuk murojaah dan evolusi Legendaris ✨!'
            : 'MasyaAllah, penjaga dikalahkan dan partnermu sudah Legendaris!';

  const renderActivityButton = (a: ActivityCard) => (
    <motion.button
      key={a.id}
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        stopMurattal();
        if (a.locked) {
          notify(a.lockMsg || 'Selesaikan minimal 1 bagian Dengar & Ulangi dulu ya! 🎧');
        } else {
          navigate(`/pulau/${surahNo}/${a.id}`);
        }
      }}
      className={`flex min-h-20 items-center gap-4 rounded-3xl bg-linear-to-r ${a.color} p-4 text-left text-white shadow-md ${
        a.locked ? 'opacity-50 grayscale' : ''
      }`}
    >
      <span className="text-4xl">{a.emoji}</span>
      <span className="flex-1">
        <span className="block text-xl font-bold">{a.name}</span>
        <span className="block text-sm text-white/90">{a.desc}</span>
      </span>
      {a.locked ? <Lock size={28} /> : a.done ? <Check size={32} strokeWidth={3} /> : null}
    </motion.button>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SeoHead surah={surahNo} />
      <TopBar title={`${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <section className={`relative overflow-hidden rounded-[2rem] bg-linear-to-br ${island.color} p-5 text-center shadow-lg`}>
          <div className="bob text-7xl">{island.emoji}</div>
          <div className="absolute inset-x-0 top-3 flex justify-between px-6 text-4xl">
            {island.bloom.slice(0, stars).map((b, i) => (
              <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 * i, type: 'spring' }}>
                {b}
              </motion.span>
            ))}
          </div>
          <p className="font-quran mt-1 text-4xl leading-normal text-slate-900">{surah.name}</p>
          <h1 className="text-3xl font-bold text-slate-800">
            {surah.latin} <span className="text-lg font-semibold text-slate-700">· Arti: {surah.meaning}</span>
          </h1>
          <p className="text-slate-700">{surah.count} ayat</p>
          <div className="mt-1">
            <Stars n={stars} size="text-4xl" />
          </div>
          {setoran?.status === 'approved' && (
            <p className="mt-2 inline-block rounded-2xl bg-amber-300 px-3 py-1 text-sm font-semibold text-amber-950 shadow-sm">
              🏅 Stempel Hafiz Sah dari Orang Tua
            </p>
          )}
          <button
            type="button"
            onClick={() => say(island.about)}
            className="mx-auto mt-3 flex items-center gap-2 rounded-2xl bg-white/75 px-4 py-2 text-left text-sm font-medium text-slate-700"
          >
            <Volume2 className="shrink-0" size={20} /> {island.about}
          </button>
        </section>

        {/* RPG Quest & Companion Header + Duel Penjaga CTA */}
        {!foggy && (
          <section className="rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-purple-950 p-4 text-white shadow-lg">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                <span className="text-4xl">{rpg.bossEmoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-rose-300">Penjaga Kabut</span>
                    {done.battle && <span className="rounded-lg bg-emerald-500/30 px-1.5 py-0.5 text-[11px] font-bold text-emerald-200">Kalah ✓</span>}
                  </div>
                  <p className="truncate font-bold text-white">{rpg.bossName}</p>
                  <p className="text-xs text-slate-300">{rpg.bossHint}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                <span className="text-4xl">{rpg.companionEmoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Partner Surah</span>
                    <span className="rounded-lg bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-200">{STAGE_LABEL[stage]}</span>
                  </div>
                  <p className="truncate font-bold text-white">{rpg.companionName}</p>
                  <p className="text-xs text-slate-300">{rpg.companionDesc}</p>
                </div>
              </div>
            </div>

            <Button
              big
              color={gamesUnlocked ? 'rose' : 'white'}
              className={`mt-3 w-full ${!gamesUnlocked ? 'opacity-70' : ''}`}
              onClick={() => {
                stopMurattal();
                if (!gamesUnlocked) {
                  notify('Selesaikan minimal 1 bagian Dengar & Ulangi dulu ya untuk membuka duel! 🎧');
                } else {
                  navigate(`/pulau/${surahNo}/battle`);
                }
              }}
            >
              {gamesUnlocked ? <Swords size={24} /> : <Lock size={22} />}
              <span>{done.battle ? `Tantang Ulang ${rpg.bossName}` : `Duel Penjaga ${surah.latin}`}</span>
            </Button>
            <p className="mt-1.5 text-center text-xs text-indigo-200">
              Jurus Hafalan + Jurus Arti Surat/Ayat · Hadiah: +35 EXP, 💎 Kristal & 🌿 Daun Hikmah
            </p>
          </section>
        )}

        <BintangSays text={nextHint} size={64} />

        {/* Murattal Full Surah Loop Player */}
        {!foggy && (
          <section className="flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-white/90 p-3 shadow">
            <div className="flex items-center gap-2">
              <Button color={murattalAyah !== null ? 'rose' : 'blue'} onClick={toggleMurattal}>
                {murattalAyah !== null ? <Square size={20} /> : <Play size={20} />}
                <span>{murattalAyah !== null ? `Stop (Ayat ${murattalAyah}/${surah.count})` : 'Putar Full Surah'}</span>
              </Button>
            </div>
            <Button
              color={loopSurah ? 'green' : 'white'}
              onClick={() => setLoopSurah((v) => !v)}
              label="Ulang terus"
            >
              <Repeat size={20} /> {loopSurah ? 'Ulang: Ya' : 'Ulang: 1x'}
            </Button>
          </section>
        )}

        {foggy && frontier && (
          <section className="flex flex-col gap-3 rounded-3xl bg-slate-100 p-4 text-center shadow-inner">
            <div className="text-6xl">🌫️</div>
            <Button big color="blue" onClick={() => navigate(`/pulau/${frontier}`)}>
              ⛵ Berlayar ke {islandOf(frontier).latin}
            </Button>
            <p className="text-slate-600">Sudah hafal surah ini dari TPA atau sekolah? Jawab soal tanpa melihat teks. Kalau lulus, kabutnya hilang!</p>
            <Button color="purple" onClick={() => navigate(`/pulau/${surahNo}/lompat`)}>
              🚀 Tes Lompat Pulau
            </Button>
          </section>
        )}

        {!foggy && (
          <div className="flex flex-col gap-5">
            {/* Pillar 1: Hafalan Surat */}
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-slate-800">💎 Pilar 1 · Hafalan Surat</h2>
                <span className="text-xs font-semibold text-slate-500">Kuasai bacaan & urutan ayat</span>
              </div>
              <div className="grid gap-3">{hafalanActivities.map(renderActivityButton)}</div>
              {parts.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {parts.map(([f, t], i) => (
                    <Button
                      key={i}
                      color={partsDone.includes(i) ? 'green' : 'white'}
                      onClick={() => {
                        stopMurattal();
                        navigate(`/pulau/${surahNo}/dengar/${i}`);
                      }}
                    >
                      {partsDone.includes(i) ? '✓' : '🎧'} Ayat {f}–{t}
                    </Button>
                  ))}
                </div>
              )}
            </section>

            {/* Pillar 2: Hafal Arti Surat & Ayat */}
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-slate-800">🌿 Pilar 2 · Hafal Arti Surat & Ayat</h2>
                <span className="text-xs font-semibold text-slate-500">Pahami arti & terjemahan</span>
              </div>
              <div className="grid gap-3">{artiActivities.map(renderActivityButton)}</div>
            </section>

            {review && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  stopMurattal();
                  if (isDue(review)) navigate(`/pulau/${surahNo}/review`);
                  else
                    notify(
                      `Belum waktunya murojaah. Kembali lagi ${Math.max(1, Math.ceil((review.nextAt - Date.now()) / DAY))} hari lagi ya!`,
                      L.notDue,
                    );
                }}
                className={`flex min-h-20 items-center gap-4 rounded-3xl bg-linear-to-r from-emerald-400 to-teal-600 p-4 text-left text-white shadow-md ${
                  isDue(review) ? 'ring-4 ring-amber-300' : 'opacity-65'
                }`}
              >
                <span className="text-4xl">💭</span>
                <span className="flex-1">
                  <span className="block text-xl font-bold">Murojaah</span>
                  <span className="block text-sm text-white/90">
                    {isDue(review) ? 'Pulau ini rindu kamu! Naikkan ke Legendaris ✨' : `Lagi ${Math.max(1, Math.ceil((review.nextAt - Date.now()) / DAY))} hari`}
                  </span>
                </span>
              </motion.button>
            )}
          </div>
        )}

        <div className={`flex flex-wrap justify-center gap-3 pb-6 ${foggy ? 'hidden' : ''}`}>
          {stars >= 1 && (
            <Button color={setoran?.status === 'approved' ? 'green' : 'purple'} onClick={() => setSetoranOpen(true)}>
              <Mic size={20} />
              {setoran?.status === 'approved'
                ? 'Setoran Sah ✓'
                : setoran?.status === 'pending'
                  ? 'Setoran Menunggu Ayah/Bunda'
                  : 'Setor Hafalan ke Orang Tua'}
            </Button>
          )}
          {island.story && stars >= 1 && (
            <Button color="purple" onClick={() => setStory(true)}>
              <BookOpen size={22} /> Kisah
            </Button>
          )}
          {stars >= 3 && (
            <Button color="yellow" onClick={() => setGate(true)}>
              <Award size={22} /> Sertifikat
            </Button>
          )}
          <Button color="white" onClick={download} disabled={dl !== null && dl > 0 && dl < surah.count}>
            <DownloadCloud size={22} />
            {dl !== null && dl >= surah.count ? 'Tersedia offline ✓' : dl ? `Mengunduh ${dl}/${surah.count}` : 'Unduh Pulau'}
          </Button>
        </div>
      </main>

      <Modal open={story} onClose={() => (stopAll(), setStory(false))}>
        <div className="text-7xl">{island.emoji}</div>
        <h2 className="text-2xl font-semibold">Kisah {surah.latin}</h2>
        <p className="my-3 text-left text-lg leading-relaxed text-slate-700">{island.story}</p>
        <div className="flex gap-2">
          <Button color="yellow" className="flex-1" onClick={() => say(island.story!)}>
            <Volume2 /> Bacakan
          </Button>
          <Button color="blue" className="flex-1" onClick={() => (stopAll(), setStory(false))}>
            Tutup
          </Button>
        </div>
      </Modal>

      <Modal open={setoranOpen} onClose={() => setSetoranOpen(false)}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-6xl">🎙️</div>
          <h2 className="text-2xl font-semibold">Setoran Surah {surah.latin}</h2>
          <p className="text-slate-600">
            Baca Surah {surah.latin} dari ayat 1 sampai {surah.count}. Ayah/Bunda akan memeriksa dan memberi Stempel Hafiz (+30 🪙)!
          </p>
          {canRecord() && (
            <div className="flex w-full flex-col gap-2">
              <Button big color={recStop ? 'rose' : 'purple'} className="w-full" onClick={toggleSetoranRec}>
                {recStop ? <Square size={24} /> : <Mic size={24} />}
                <span>{recStop ? 'Stop Rekam Setoran' : recBlob ? 'Rekam Ulang' : 'Rekam Setoran'}</span>
              </Button>
              {recBlob && (
                <Button color="white" className="w-full" onClick={() => playBlob(recBlob)}>
                  <Play size={20} /> Dengarkan Rekaman Setoran
                </Button>
              )}
            </div>
          )}
          <Button big color="green" className="w-full" onClick={sendSetoran}>
            Kirim ke Area Orang Tua ➜
          </Button>
          <Button color="white" className="w-full" onClick={() => setSetoranOpen(false)}>
            Tutup
          </Button>
        </div>
      </Modal>

      <ParentGate
        open={gate}
        onClose={() => setGate(false)}
        onPass={async () => {
          setGate(false);
          setCert(await makeCertificate(profile.nickname, [surahNo]));
        }}
      />
      <Modal open={!!cert} onClose={() => setCert(null)}>
        {cert && <img src={cert} alt="Sertifikat hafalan" className="w-full rounded-xl shadow" />}
        <div className="mt-3 flex gap-2">
          <Button color="green" className="flex-1" onClick={() => cert && shareCertificate(cert, surah.latin)}>
            Simpan / Bagikan
          </Button>
          <Button color="white" onClick={() => setCert(null)}>
            Tutup
          </Button>
        </div>
      </Modal>
      <BadgeToast />
    </div>
  );
}

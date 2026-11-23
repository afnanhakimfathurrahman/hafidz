import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Volume2, DownloadCloud, BookOpen, Award } from 'lucide-react';
import { surahOf, partsOf } from '../data/quran';
import { islandOf } from '../data/islands';
import { Button, Modal, Stars, TopBar } from '../components/ui';
import { BintangSays } from '../components/Bintang';
import { BadgeToast } from '../components/BadgeToast';
import { ParentGate } from '../components/ParentGate';
import { useGameStore, useProfile, useProgress, isDue } from '../store/useGameStore';
import { navigate } from '../hooks/useRoute';
import { say, notify, toast, stopAll, downloadSurah, downloadedCount, canDownload, downloadVoices, preloadVoices } from '../services/audio';
import { L, islandVoiceLines, commonVoiceLines } from '../data/voiceLines';
import { makeCertificate, shareCertificate } from '../services/certificate';
import { SeoHead } from '../components/SeoHead';
import { useFoggy, frontierOf } from '../services/fog';

const DAY = 24 * 60 * 60 * 1000;

export default function IslandView({ surahNo }: { surahNo: number }) {
  const surah = surahOf(surahNo);
  const island = islandOf(surahNo);
  const profile = useProfile()!;
  const p = useProgress();
  const qori = useGameStore((s) => s.settings.qori);
  const stars = p.stars[surahNo] ?? 0;
  const done = p.done[surahNo] ?? {};
  const parts = partsOf(surah, profile.ageBand);
  const partsDone = p.parts[surahNo] ?? [];
  const review = p.review[surahNo];
  const foggy = useFoggy(surahNo);
  const frontier = frontierOf(p);

  const [story, setStory] = useState(false);
  const [gate, setGate] = useState(false);
  const [cert, setCert] = useState<string | null>(null);
  const [dl, setDl] = useState<number | null>(null);

  useEffect(() => {
    preloadVoices(islandVoiceLines(surahNo));
  }, [surahNo]);

  useEffect(() => {
    downloadedCount(qori, surahNo, surah.count).then(setDl);
    return stopAll;
  }, [qori, surahNo, surah.count]);

  const download = async () => {
    if (!canDownload()) {
      toast('Unduh offline hanya bisa dari http://localhost:8080 di HP ini (atau HTTPS).');
      return;
    }
    setDl(0);
    const ok = (await downloadSurah(qori, surahNo, surah.count, setDl)) && (await downloadVoices([...islandVoiceLines(surahNo), ...commonVoiceLines()]));
    setDl(await downloadedCount(qori, surahNo, surah.count));
    if (ok) notify(L.offlineReady);
    else toast('Sebagian suara gagal diunduh. Cek internet lalu coba lagi.');
  };

  const listenDone = !!done.listen;
  const activities = [
    {
      id: 'dengar',
      emoji: '🎧',
      name: 'Dengar & Ulangi',
      desc: parts.length > 1 ? `${partsDone.length}/${parts.length} bagian` : 'Dengar, ulangi, hafalkan',
      done: listenDone,
      locked: false,
      color: 'from-amber-300 to-orange-400',
    },
    {
      id: 'sambung',
      emoji: '🧩',
      name: 'Sambung Ayat',
      desc: 'Ayat apa selanjutnya?',
      done: !!done.sambung,
      locked: !listenDone,
      color: 'from-sky-300 to-blue-500',
    },
    {
      id: 'jodoh',
      emoji: '🃏',
      name: 'Jodohkan Makna',
      desc: 'Cari pasangan kata',
      done: !!done.jodoh,
      locked: !listenDone,
      color: 'from-purple-300 to-fuchsia-500',
    },
    // Band B only, opt-in: timed Sambung Ayat for extra coins (no stars at stake)
    ...(profile.ageBand === 'B'
      ? [
          {
            id: 'tantangan',
            emoji: '⏱️',
            name: 'Tantangan Waktu',
            desc: p.challenge[surahNo] ? `Rekor: ${p.challenge[surahNo]} benar` : 'Jawab sebelum waktu habis!',
            done: false,
            locked: !done.sambung,
            lockMsg: 'Selesaikan Sambung Ayat dulu ya! 🧩',
            color: 'from-rose-300 to-orange-400',
          },
        ]
      : []),
  ];

  const nextHint = foggy
    ? `Pulau ini masih tertutup kabut. Selesaikan Pulau ${frontier ? islandOf(frontier).latin : ''} dulu ya!`
    : !listenDone
    ? 'Ayo mulai dengan Dengar & Ulangi!'
    : stars < 2
      ? 'Hebat! Sekarang main Sambung Ayat dan Jodohkan Makna.'
      : isDue(review)
        ? 'Pulau ini rindu kamu! Ayo murojaah.'
        : stars < 3
          ? 'MasyaAllah! Kembali lagi nanti untuk murojaah dan bintang ketiga.'
          : 'MasyaAllah, pulau ini sudah mekar sempurna!';

  return (
    <div className="flex min-h-screen flex-col">
      <SeoHead surah={surahNo} />
      <TopBar title={`${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <section className={`relative overflow-hidden rounded-[2rem] bg-linear-to-br ${island.color} p-5 text-center shadow-lg`}>
          <div className="bob text-8xl">{island.emoji}</div>
          <div className="absolute inset-x-0 top-3 flex justify-between px-6 text-4xl">
            {island.bloom.slice(0, stars).map((b, i) => (
              <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 * i, type: 'spring' }}>
                {b}
              </motion.span>
            ))}
          </div>
          <p className="font-quran mt-1 text-4xl leading-normal text-slate-900">{surah.name}</p>
          <h1 className="text-3xl font-semibold text-slate-800">
            {surah.latin} <span className="text-lg font-normal">· {surah.meaning}</span>
          </h1>
          <p className="text-slate-700">{surah.count} ayat</p>
          <div className="mt-1">
            <Stars n={stars} size="text-4xl" />
          </div>
          <button
            type="button"
            onClick={() => say(island.about)}
            className="mx-auto mt-3 flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-2 text-left text-slate-700"
          >
            <Volume2 className="shrink-0" size={22} /> {island.about}
          </button>
        </section>

        <BintangSays text={nextHint} size={70} />

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
        <div className="grid gap-3">
          {activities.map((a) => (
            <motion.button
              key={a.id}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => (a.locked ? notify(('lockMsg' in a && a.lockMsg) || 'Selesaikan Dengar & Ulangi dulu ya! 🎧') : navigate(`/pulau/${surahNo}/${a.id}`))}
              className={`flex min-h-20 items-center gap-4 rounded-3xl bg-linear-to-r ${a.color} p-4 text-left text-white shadow-md ${
                a.locked ? 'opacity-50 grayscale' : ''
              }`}
            >
              <span className="text-5xl">{a.emoji}</span>
              <span className="flex-1">
                <span className="block text-2xl font-semibold">{a.name}</span>
                <span className="block text-white/90">{a.desc}</span>
              </span>
              {a.locked ? <Lock size={30} /> : a.done ? <Check size={36} strokeWidth={3} /> : null}
            </motion.button>
          ))}

          {parts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {parts.map(([f, t], i) => (
                <Button key={i} color={partsDone.includes(i) ? 'green' : 'white'} onClick={() => navigate(`/pulau/${surahNo}/dengar/${i}`)}>
                  {partsDone.includes(i) ? '✓' : '🎧'} Ayat {f}–{t}
                </Button>
              ))}
            </div>
          )}

          {review && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => (isDue(review) ? navigate(`/pulau/${surahNo}/review`) : notify(`Belum waktunya murojaah. Kembali lagi ${Math.max(1, Math.ceil((review.nextAt - Date.now()) / DAY))} hari lagi ya!`, L.notDue))}
              className={`flex min-h-20 items-center gap-4 rounded-3xl bg-linear-to-r from-emerald-300 to-teal-500 p-4 text-left text-white shadow-md ${
                isDue(review) ? 'ring-4 ring-amber-300' : 'opacity-60'
              }`}
            >
              <span className="text-5xl">💭</span>
              <span className="flex-1">
                <span className="block text-2xl font-semibold">Murojaah</span>
                <span className="block text-white/90">
                  {isDue(review) ? 'Pulau ini rindu kamu!' : `Lagi ${Math.max(1, Math.ceil((review.nextAt - Date.now()) / DAY))} hari`}
                </span>
              </span>
            </motion.button>
          )}
        </div>
        )}

        <div className={`flex flex-wrap justify-center gap-3 pb-6 ${foggy ? 'hidden' : ''}`}>
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

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ShieldAlert, Swords, Sparkles, RotateCcw } from 'lucide-react';
import { SURAHS, surahOf, ayahText, type Ayah } from '../../data/quran';
import { islandOf } from '../../data/islands';
import { heroStats, surahRpgOf } from '../../data/rpg';
import { QuranPanel, AyahText } from '../../components/AyahText';
import { Bintang } from '../../components/Bintang';
import { Button, Modal, TopBar } from '../../components/ui';
import { ComboBanner } from '../../components/ComboBanner';
import { playAyah, say, sfx, stopAll } from '../../services/audio';
import { celebrate } from '../../services/celebrate';
import { praise, retry, shuffle } from '../../services/lines';
import { useGameStore, useProfile, useProgress } from '../../store/useGameStore';
import { navigate } from '../../hooks/useRoute';

type TurnKind = 'sambung' | 'lengkapi' | 'arti-surah' | 'arti-ayat';

interface BattleTurn {
  kind: TurnKind;
  isUltimate: boolean;
  promptLabel: string;
  ayah?: Ayah;
  blankIdx?: number;
  options: { label: string; sub?: string; arabic?: boolean; surah?: number; ayahNo?: number; correct: boolean }[];
}

function buildBattleDeck(surahNo: number, band: 'A' | 'B'): BattleTurn[] {
  const surah = surahOf(surahNo);
  const nChoices = band === 'A' ? 3 : 4;
  const idx = SURAHS.findIndex((s) => s.number === surahNo);
  const neighbors = SURAHS.filter((_, i) => i !== idx && Math.abs(i - idx) <= 3);
  const turns: BattleTurn[] = [];

  // Turn 1: Hafalan Surat (Sambung Ayat or Lengkapi Kata)
  if (surah.count >= 2) {
    const a = surah.ayahs[0];
    const next = surah.ayahs[1];
    const distractors = shuffle(
      [...surah.ayahs.slice(2), ...neighbors.flatMap((ns) => ns.ayahs)].filter((x) => ayahText(x) !== ayahText(next)),
    ).slice(0, nChoices - 1);
    turns.push({
      kind: 'sambung',
      isUltimate: false,
      promptLabel: '⚔️ Serangan Surat: Pilih ayat selanjutnya!',
      ayah: a,
      options: shuffle([
        { label: ayahText(next), arabic: true, surah: surahNo, ayahNo: next.n, correct: true },
        ...distractors.map((d) => ({ label: ayahText(d), arabic: true, correct: false })),
      ]),
    });
  }

  // Turn 2: Hafal Arti Nama Surah (Ultimate Skill!)
  const wrongMeanings = shuffle(neighbors.map((ns) => ns.meaning).filter((m) => m !== surah.meaning)).slice(0, nChoices - 1);
  turns.push({
    kind: 'arti-surah',
    isUltimate: true,
    promptLabel: `✨ Jurus Makna: Apa arti nama Surah ${surah.latin}?`,
    options: shuffle([
      { label: surah.meaning, sub: islandOf(surahNo).emoji, correct: true },
      ...wrongMeanings.map((m) => ({ label: m, correct: false })),
    ]),
  });

  // Turn 3: Lengkapi Kata (Hafalan Dalam Ayat)
  const wordPoolAyahs = shuffle(surah.ayahs.filter((a) => a.words.length >= 2));
  if (wordPoolAyahs.length > 0) {
    const target = wordPoolAyahs[0];
    const blankIdx = target.words.length > 2 ? 1 + Math.floor(Math.random() * (target.words.length - 1)) : target.words.length - 1;
    const ans = target.words[blankIdx].t;
    const seen = new Set([ans]);
    const wrongWords: string[] = [];
    for (const a of shuffle([...surah.ayahs, ...(neighbors[0]?.ayahs ?? [])])) {
      for (const w of a.words) {
        if (!seen.has(w.t) && wrongWords.length < nChoices - 1) {
          seen.add(w.t);
          wrongWords.push(w.t);
        }
      }
    }
    turns.push({
      kind: 'lengkapi',
      isUltimate: false,
      promptLabel: '⚔️ Tebas Kabut: Lengkapi kata yang hilang!',
      ayah: target,
      blankIdx,
      options: shuffle([
        { label: ans, arabic: true, correct: true },
        ...wrongWords.map((w) => ({ label: w, arabic: true, correct: false })),
      ]),
    });
  }

  // Turn 4: Arti Ayat (Hafal Terjemahan Ayat!)
  const trAyahs = shuffle(surah.ayahs);
  for (const a of trAyahs.slice(0, 2)) {
    const wrongTr = shuffle(
      [...surah.ayahs, ...neighbors.flatMap((ns) => ns.ayahs)]
        .map((x) => x.tr)
        .filter((tr) => tr !== a.tr),
    ).slice(0, nChoices - 1);
    turns.push({
      kind: 'arti-ayat',
      isUltimate: true,
      promptLabel: '✨ Jurus Cahaya: Apa arti ayat ini?',
      ayah: a,
      options: shuffle([
        { label: a.tr, correct: true },
        ...wrongTr.map((tr) => ({ label: tr, correct: false })),
      ]),
    });
  }

  // Turn 5+: Extra Sambung Ayat to finish Boss cleanly if high HP
  if (surah.count >= 3) {
    const pIdx = Math.min(surah.count - 2, 2);
    const a = surah.ayahs[pIdx];
    const next = surah.ayahs[pIdx + 1];
    const distractors = shuffle(
      [...surah.ayahs, ...neighbors.flatMap((ns) => ns.ayahs)].filter((x) => ayahText(x) !== ayahText(next) && ayahText(x) !== ayahText(a)),
    ).slice(0, nChoices - 1);
    turns.push({
      kind: 'sambung',
      isUltimate: false,
      promptLabel: '⚔️ Serangan Penutup: Sambung ayat berikutnya!',
      ayah: a,
      options: shuffle([
        { label: ayahText(next), arabic: true, surah: surahNo, ayahNo: next.n, correct: true },
        ...distractors.map((d) => ({ label: ayahText(d), arabic: true, correct: false })),
      ]),
    });
  }

  return turns;
}

/** Action RPG Battle combining Surah Memorization + Surah Meaning Mastery. */
export default function RpgBattle({ surahNo }: { surahNo: number }) {
  const surah = surahOf(surahNo);
  const island = islandOf(surahNo);
  const rpg = surahRpgOf(surahNo);
  const profile = useProfile()!;
  const p = useProgress();
  const stats = heroStats(p);
  const activeCompanion = p.rpgEquipped?.companion ? surahRpgOf(p.rpgEquipped.companion) : null;

  const completeActivity = useGameStore((s) => s.completeActivity);
  const recordCorrect = useGameStore((s) => s.recordCorrect);
  const recordCombo = useGameStore((s) => s.recordCombo);
  const grantRpgRewards = useGameStore((s) => s.grantRpgRewards);

  const [roundSeed, setRoundSeed] = useState(0);
  const deck = useMemo(() => buildBattleDeck(surahNo, profile.ageBand), [surahNo, profile.ageBand, roundSeed]);

  const bossMaxHp = Math.max(80, stats.atk * 3);
  const [bossHp, setBossHp] = useState(bossMaxHp);
  const [heroHp, setHeroHp] = useState(stats.maxHp);
  const [turnIdx, setTurnIdx] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hitEffect, setHitEffect] = useState<'boss' | 'hero' | null>(null);
  const [battleLog, setBattleLog] = useState(`${rpg.bossName} menghadang! Kalahkan dengan hafalan & arti!`);
  const [locked, setLocked] = useState(false);
  const [victory, setVictory] = useState<{
    stars: number;
    gained: number;
    xp: number;
    coins: number;
    kristal: number;
    daun: number;
    bintang: number;
  } | null>(null);
  const [defeat, setDefeat] = useState(false);

  const turn = deck[turnIdx % deck.length];

  useEffect(() => {
    setWrongPicks([]);
    setLocked(false);
    if (turn.ayah) {
      playAyah(surahNo, turn.ayah.n);
    } else {
      say(turn.promptLabel);
    }
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIdx, roundSeed]);

  const handlePick = async (idx: number) => {
    if (locked || defeat || victory) return;
    const opt = turn.options[idx];

    if (opt.correct) {
      setLocked(true);
      const clean = wrongPicks.length === 0;
      const nextCombo = clean ? combo + 1 : 0;
      setCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);
      if (nextCombo >= 2) recordCombo(nextCombo);
      recordCorrect();

      const mult = (turn.isUltimate ? 1.5 : 1) + (nextCombo >= 2 ? 0.25 : 0);
      const dmg = Math.round(stats.atk * mult);
      const nextBossHp = Math.max(0, bossHp - dmg);
      setBossHp(nextBossHp);
      setHitEffect('boss');
      setTimeout(() => setHitEffect(null), 350);

      sfx(nextCombo >= 2 || turn.isUltimate ? 'combo' : 'correct');
      setBattleLog(
        turn.isUltimate
          ? `✨ Jurus Makna! -${dmg} DMG ke ${rpg.bossName}!`
          : `⚔️ Tepat! -${dmg} DMG ke ${rpg.bossName}!`,
      );
      await say(praise());

      if (nextBossHp <= 0) {
        const baseXp = 35;
        const extraXp = Math.round((baseXp * stats.xpPct) / 100);
        const totalCoins = 20 + stats.coinBonus + (maxCombo >= 3 ? 5 : 0);
        const extraBintang = nextCombo >= 3 || maxCombo >= 3 ? 1 : 0;

        const res = completeActivity(surahNo, 'battle', totalCoins);
        grantRpgRewards({ xp: extraXp, bintang: extraBintang });
        celebrate(true);
        sfx('bloom');
        setVictory({
          stars: res.newStars,
          gained: res.gained,
          xp: baseXp + extraXp,
          coins: totalCoins,
          kristal: 2,
          daun: 2,
          bintang: extraBintang,
        });
      } else {
        setTurnIdx((t) => t + 1);
      }
    } else {
      setCombo(0);
      setWrongPicks((w) => [...w, idx]);
      const bossDmg = 18;
      const nextHeroHp = Math.max(0, heroHp - bossDmg);
      setHeroHp(nextHeroHp);
      setHitEffect('hero');
      setTimeout(() => setHitEffect(null), 350);
      sfx('gentle');
      setBattleLog(`${rpg.bossEmoji} ${rpg.bossName} menyerang (-${bossDmg} HP)! Petunjuk: ${rpg.bossHint}`);
      await say(retry());
      if (nextHeroHp <= 0) {
        setDefeat(true);
      }
    }
  };

  const retryBattle = () => {
    setDefeat(false);
    setVictory(null);
    setBossHp(bossMaxHp);
    setHeroHp(stats.maxHp);
    setTurnIdx(0);
    setCombo(0);
    setMaxCombo(0);
    setBattleLog(`Ayo bangkit! Kalahkan ${rpg.bossName}!`);
    setRoundSeed((s) => s + 1);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar back={`/pulau/${surahNo}`} title={`⚔️ Duel Penjaga · ${surah.latin}`} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 p-4 pb-8">
        <ComboBanner combo={combo} />

        {/* RPG Battle Stage */}
        <section className="rounded-[2rem] bg-linear-to-b from-slate-800 via-indigo-950 to-slate-900 p-4 text-white shadow-xl">
          {/* Enemy Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-300">PENJAGA KABUT</span>
                <span className="text-xs text-slate-300">· {surah.latin}</span>
              </div>
              <h2 className="truncate text-xl font-semibold">{rpg.bossName}</h2>
              <div className="mt-1.5 h-3.5 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                />
              </div>
              <div className="mt-0.5 text-xs text-slate-300 tabular-nums">
                HP {bossHp} / {bossMaxHp}
              </div>
            </div>
            <motion.div
              animate={hitEffect === 'boss' ? { x: [-8, 8, -6, 6, 0], scale: [1, 0.85, 1] } : { y: [0, -5, 0] }}
              transition={{ duration: hitEffect === 'boss' ? 0.3 : 2.5, repeat: hitEffect === 'boss' ? 0 : Infinity }}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-5xl shadow-inner"
            >
              {rpg.bossEmoji}
            </motion.div>
          </div>

          <div className="my-3 border-t border-white/10" />

          {/* Hero Row */}
          <div className="flex items-center justify-between gap-3">
            <motion.div
              animate={hitEffect === 'hero' ? { x: [-6, 6, 0] } : {}}
              className="flex items-end gap-1"
            >
              <Bintang size={76} mood={combo >= 2 ? 'cheer' : 'happy'} />
              {activeCompanion && (
                <div className="mb-1 flex flex-col items-center rounded-2xl bg-white/10 px-2 py-1">
                  <span className="text-2xl">{activeCompanion.companionEmoji}</span>
                  <span className="text-[10px] text-amber-200">{activeCompanion.companionName}</span>
                </div>
              )}
            </motion.div>
            <div className="min-w-0 flex-1 text-right">
              <div className="text-sm font-semibold text-emerald-300">
                {profile.nickname} · Lv.{stats.level} · ⚔️ {stats.atk}
              </div>
              <div className="mt-1.5 h-3.5 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${(heroHp / stats.maxHp) * 100}%` }}
                />
              </div>
              <div className="mt-0.5 text-xs text-slate-300 tabular-nums">
                HP {heroHp} / {stats.maxHp}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={battleLog}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-center text-sm font-semibold text-amber-100"
            >
              {battleLog}
            </motion.p>
          </AnimatePresence>
        </section>

        {/* Active Battle Prompt */}
        <section className="rounded-3xl bg-white p-4 shadow">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={`flex items-center gap-1.5 text-base font-semibold ${turn.isUltimate ? 'text-purple-700' : 'text-blue-700'}`}>
              {turn.isUltimate ? <Sparkles size={18} /> : <Swords size={18} />}
              {turn.promptLabel}
            </span>
          </div>

          {turn.ayah && (
            <QuranPanel className="mb-3">
              {turn.kind === 'lengkapi' && turn.blankIdx !== undefined ? (
                <p className="font-quran text-center text-3xl leading-[2.2] text-slate-900">
                  {turn.ayah.words.map((w, i) => (
                    <span
                      key={i}
                      className={`mx-1 inline-block rounded-xl px-2 ${
                        i === turn.blankIdx ? 'border-2 border-dashed border-amber-400 bg-amber-100 text-amber-700' : ''
                      }`}
                    >
                      {i === turn.blankIdx ? ' ؟ ' : w.t}
                    </span>
                  ))}
                </p>
              ) : (
                <AyahText words={turn.ayah.words} ayahNo={turn.ayah.n} size="text-3xl" />
              )}
              <div className="mt-2 flex justify-center">
                <Button color="yellow" onClick={() => playAyah(surahNo, turn.ayah!.n)} label="Putar ayat">
                  <Volume2 size={20} /> Dengar Ayat
                </Button>
              </div>
            </QuranPanel>
          )}

          <div className="grid gap-2.5">
            {turn.options.map((o, idx) => {
              const isWrong = wrongPicks.includes(idx);
              return (
                <motion.button
                  key={idx}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  disabled={isWrong || locked}
                  onClick={() => handlePick(idx)}
                  className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-center shadow-sm transition-opacity ${
                    isWrong
                      ? 'border-rose-200 bg-rose-50 opacity-45'
                      : turn.isUltimate
                        ? 'border-purple-200 bg-purple-50 hover:border-purple-400'
                        : 'border-sky-200 bg-sky-50 hover:border-sky-400'
                  }`}
                >
                  {o.sub && <span className="text-3xl">{o.sub}</span>}
                  <span className={o.arabic ? 'font-quran text-2xl leading-[1.9] text-slate-900' : 'text-lg font-semibold text-slate-800'}>
                    {o.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Victory Modal */}
      <Modal open={!!victory}>
        {victory && (
          <div className="flex flex-col items-center gap-3">
            <div className="bob text-7xl">{rpg.companionEmoji}</div>
            <h2 className="text-2xl font-semibold text-emerald-700">
              {rpg.bossName} Dikalahkan!
            </h2>
            <p className="text-slate-600">
              Sahabat <b>{rpg.companionName}</b> ({island.latin} · {surah.meaning}) bergabung dalam koleksimu!
            </p>
            <div className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-amber-50 p-3 text-base font-semibold text-amber-900">
              <span>⚡ +{victory.xp} EXP</span>
              <span>🪙 +{victory.coins} Koin</span>
              <span>💎 +{victory.kristal} Kristal</span>
              <span>🌿 +{victory.daun} Daun</span>
              {victory.bintang > 0 && <span className="col-span-2 text-purple-700">🌟 +{victory.bintang} Debu Bintang (Combo!)</span>}
            </div>
            <Button big color="green" className="w-full" onClick={() => navigate(`/pulau/${surahNo}`, true)}>
              Lanjut Petualangan ➜
            </Button>
            <Button color="blue" className="w-full" onClick={() => navigate('/bengkel', true)}>
              🔨 Pergi ke Bengkel Senjata
            </Button>
          </div>
        )}
      </Modal>

      {/* Defeat / Recharge Modal */}
      <Modal open={defeat}>
        <div className="flex flex-col items-center gap-3">
          <ShieldAlert size={56} className="text-amber-500" />
          <h2 className="text-2xl font-semibold text-slate-800">Energi Cahaya Habis!</h2>
          <p className="text-slate-600">
            Jangan menyerah! Dengarkan lagi Surah {surah.latin} dan artinya, atau langsung coba duel lagi.
          </p>
          <Button big color="green" className="w-full" onClick={retryBattle}>
            <RotateCcw size={22} /> Isi Energi & Duel Lagi
          </Button>
          <Button color="white" className="w-full" onClick={() => navigate(`/pulau/${surahNo}/dengar`, true)}>
            🎧 Dengar & Ulangi Dulu
          </Button>
        </div>
      </Modal>
    </div>
  );
}

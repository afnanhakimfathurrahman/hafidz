import { motion } from 'framer-motion';
import { useProfile, useProgress } from '../store/useGameStore';
import { itemOf } from '../data/shop';

export type Mood = 'happy' | 'cheer' | 'think' | 'wave';

const SCARF: Record<string, string> = { 'scarf-red': '#EF4444', 'scarf-green': '#10B981', 'scarf-blue': '#3B82F6' };

/** Bintang: a friendly star mascot (non-human, per adab guidelines). */
export function Bintang({ size = 120, mood = 'happy', color }: { size?: number; mood?: Mood; color?: string }) {
  const { equipped } = useProgress();
  const profile = useProfile();
  const fill = color ?? itemOf(equipped.color)?.preview ?? profile?.avatar ?? '#FBBF24';
  const hat = equipped.hat;
  const scarf = equipped.scarf ? SCARF[equipped.scarf] : undefined;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      animate={mood === 'cheer' ? { y: [0, -14, 0], rotate: [0, -6, 6, 0] } : { y: [0, -4, 0] }}
      transition={{ duration: mood === 'cheer' ? 0.7 : 3, repeat: mood === 'cheer' ? 2 : Infinity }}
      aria-hidden
    >
      <path
        d="M60 8 L74 42 L110 44 L82 67 L92 103 L60 83 L28 103 L38 67 L10 44 L46 42 Z"
        fill={fill}
        stroke="#00000022"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* cheeks */}
      <circle cx="44" cy="62" r="5" fill="#F9731655" />
      <circle cx="76" cy="62" r="5" fill="#F9731655" />
      {/* eyes */}
      {mood === 'cheer' ? (
        <>
          <path d="M44 54 q5 -6 10 0" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M66 54 q5 -6 10 0" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="50" cy="53" rx="4" ry="5" fill="#1E293B" />
          <ellipse cx="70" cy="53" rx="4" ry="5" fill="#1E293B" />
          <circle cx="51.5" cy="51" r="1.5" fill="white" />
          <circle cx="71.5" cy="51" r="1.5" fill="white" />
        </>
      )}
      {/* mouth */}
      {mood === 'think' ? (
        <circle cx="60" cy="66" r="3" fill="#1E293B" />
      ) : (
        <path d="M52 63 q8 9 16 0" stroke="#1E293B" strokeWidth="3" fill={mood === 'cheer' ? '#F87171' : 'none'} strokeLinecap="round" />
      )}
      {scarf && <path d="M40 75 q20 10 40 0 l-2 7 q-18 8 -36 0 z M70 80 l6 16 l-8 -2 z" fill={scarf} />}
      {hat === 'hat-peci' && <path d="M44 22 h32 l-2 -12 q-14 -5 -28 0 z" fill="#1F2937" />}
      {hat === 'hat-white' && <path d="M45 22 q15 -22 30 0 z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />}
      {hat === 'hat-explorer' && (
        <>
          <ellipse cx="60" cy="22" rx="26" ry="5" fill="#A16207" />
          <path d="M46 22 q14 -20 28 0 z" fill="#CA8A04" />
        </>
      )}
      {hat === 'hat-crown' && <path d="M44 24 l2 -16 l8 8 l6 -10 l6 10 l8 -8 l2 16 z" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" />}
    </motion.svg>
  );
}

/** Mascot with a speech bubble. */
export function BintangSays({ text, mood = 'happy', size = 90 }: { text: string; mood?: Mood; size?: number }) {
  return (
    <div className="flex items-end gap-2">
      <Bintang size={size} mood={mood} />
      <motion.div
        key={text}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mb-6 max-w-xs rounded-3xl rounded-bl-md bg-white px-4 py-3 text-lg font-semibold text-slate-700 shadow-md"
      >
        {text}
      </motion.div>
    </div>
  );
}

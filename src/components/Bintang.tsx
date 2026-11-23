import { motion } from 'framer-motion';
import { useProfile, useProgress } from '../store/useGameStore';
import { itemOf } from '../data/shop';

export type Mood = 'happy' | 'cheer' | 'think' | 'wave';

const SCARF: Record<string, string> = { 'scarf-red': '#EF4444', 'scarf-green': '#10B981', 'scarf-blue': '#3B82F6' };

/** Bintang: friendly star mascot wearing shop cosmetics + crafted RPG weapon, shield, and cloak. */
export function Bintang({ size = 120, mood = 'happy', color }: { size?: number; mood?: Mood; color?: string }) {
  const { equipped, rpgEquipped } = useProgress();
  const profile = useProfile();
  const fill = color ?? itemOf(equipped.color)?.preview ?? profile?.avatar ?? '#FBBF24';
  const hat = equipped.hat;
  const scarf = equipped.scarf ? SCARF[equipped.scarf] : undefined;
  const weapon = rpgEquipped?.weapon;
  const shield = rpgEquipped?.shield;
  const cloak = rpgEquipped?.cloak;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 140 130"
      animate={mood === 'cheer' ? { y: [0, -14, 0], rotate: [0, -6, 6, 0] } : { y: [0, -4, 0] }}
      transition={{ duration: mood === 'cheer' ? 0.7 : 3, repeat: mood === 'cheer' ? 2 : Infinity }}
      aria-hidden
    >
      {/* Crafted Cloak behind mascot */}
      {cloak === 'cloak-sky' && (
        <path d="M40 72 L24 114 Q70 122 116 114 L100 72 Z" fill="#38BDF8" opacity="0.85" />
      )}
      {cloak === 'cloak-qadr' && (
        <path d="M38 70 L20 116 Q70 126 120 116 L102 70 Z" fill="#4338CA" opacity="0.92" />
      )}

      {/* Main Star Body (shifted +10 in X to leave room for weapon & shield) */}
      <g transform="translate(10, 4)">
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
      </g>

      {/* Crafted Weapon on Right Hand */}
      {weapon === 'weapon-wood' && (
        <g transform="translate(114, 46) rotate(12)">
          <rect x="0" y="10" width="5" height="46" rx="2.5" fill="#92400E" />
          <circle cx="2.5" cy="9" r="5" fill="#FDE68A" />
        </g>
      )}
      {weapon === 'weapon-lantern' && (
        <g transform="translate(114, 42) rotate(10)">
          <rect x="0" y="12" width="5" height="48" rx="2.5" fill="#78350F" />
          <rect x="-4" y="2" width="13" height="14" rx="4" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
          <circle cx="2.5" cy="9" r="3" fill="#FEF3C7" />
        </g>
      )}
      {weapon === 'weapon-quill' && (
        <g transform="translate(114, 38) rotate(15)">
          <rect x="1" y="20" width="4" height="40" rx="2" fill="#0EA5E9" />
          <path d="M3 0 Q15 14 3 32 Q-6 14 3 0 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
        </g>
      )}
      {weapon === 'weapon-star' && (
        <g transform="translate(114, 34) rotate(14)">
          <rect x="1" y="14" width="5" height="36" rx="2" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
          <rect x="-5" y="48" width="17" height="5" rx="2" fill="#F59E0B" />
          <rect x="1" y="53" width="5" height="10" rx="2" fill="#78350F" />
          <polygon points="3.5,2 6,12 1,12" fill="#38BDF8" />
        </g>
      )}

      {/* Crafted Shield on Left Hand */}
      {shield === 'shield-leaf' && (
        <path d="M10 64 Q24 58 34 64 L32 88 Q22 98 12 88 Z" fill="#22C55E" stroke="#15803D" strokeWidth="2.5" />
      )}
      {shield === 'shield-ababil' && (
        <path d="M8 62 Q23 54 36 62 L33 90 Q22 102 11 90 Z" fill="#38BDF8" stroke="#0369A1" strokeWidth="2.5" />
      )}
      {shield === 'shield-nur' && (
        <g>
          <path d="M8 60 Q23 52 37 60 L34 92 Q22 104 10 92 Z" fill="#A855F7" stroke="#FACC15" strokeWidth="3" />
          <circle cx="22.5" cy="76" r="5" fill="#FDE047" />
        </g>
      )}
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

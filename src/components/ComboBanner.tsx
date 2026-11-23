import { AnimatePresence, motion } from 'framer-motion';

/** Displays active answer streak combo in mini-games. */
export function ComboBanner({ combo, bonusCoins = 0 }: { combo: number; bonusCoins?: number }) {
  return (
    <AnimatePresence>
      {combo >= 2 && (
        <motion.div
          key={combo}
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
          className="mx-auto flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-1.5 text-base font-semibold text-amber-800 shadow-sm"
        >
          <span>🔥 Combo x{combo}!</span>
          {bonusCoins > 0 && <span className="text-amber-600">+{bonusCoins} 🪙 bonus</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { Home, Coins } from 'lucide-react';
import { sfx } from '../services/audio';
import { navigate } from '../hooks/useRoute';
import { useProgress } from '../store/useGameStore';

const COLORS = {
  blue: 'bg-blue-500 text-white shadow-blue-700/40',
  yellow: 'bg-amber-400 text-amber-950 shadow-amber-600/40',
  green: 'bg-emerald-500 text-white shadow-emerald-700/40',
  purple: 'bg-purple-500 text-white shadow-purple-700/40',
  white: 'bg-white text-slate-700 shadow-slate-400/40',
  rose: 'bg-rose-400 text-white shadow-rose-600/40',
};
export type BtnColor = keyof typeof COLORS;

export function Button({
  children,
  onClick,
  color = 'blue',
  className = '',
  disabled,
  big,
  label,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: BtnColor;
  className?: string;
  disabled?: boolean;
  big?: boolean;
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      disabled={disabled}
      onClick={() => {
        sfx('tap');
        onClick?.();
      }}
      className={`flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-3xl px-5 font-semibold shadow-[0_5px_0] transition-opacity active:translate-y-1 active:shadow-[0_1px_0] disabled:opacity-40 ${
        big ? 'py-4 text-2xl' : 'py-2 text-lg'
      } ${COLORS[color]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function TopBar({ title, back = '/' }: { title?: ReactNode; back?: string }) {
  const { coins } = useProgress();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-sky-200/80 px-3 py-2 backdrop-blur">
      <Button color="white" label="Kembali" onClick={() => navigate(back)}>
        <Home size={28} />
      </Button>
      <div className="flex-1 truncate text-center text-xl font-semibold text-slate-700">{title}</div>
      <div className="flex min-h-14 items-center gap-1 rounded-3xl bg-white px-4 text-lg font-semibold text-amber-600 shadow">
        <Coins size={24} /> {coins}
      </div>
    </header>
  );
}

export function Modal({ open, children, onClose }: { open: boolean; children: ReactNode; onClose?: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 text-center shadow-2xl"
            initial={{ scale: 0.7, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Stars({ n, size = 'text-2xl' }: { n: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${n} bintang`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? '' : 'opacity-25 grayscale'}>
          ⭐
        </span>
      ))}
    </span>
  );
}

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full transition-colors ${i < current ? 'bg-emerald-500' : i === current ? 'bg-amber-400' : 'bg-white'}`}
        />
      ))}
    </div>
  );
}

import { useEffect } from 'react';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { Bintang } from './Bintang';

interface ToastState {
  text: string | null;
  id: number;
  show: (text: string) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  text: null,
  id: 0,
  show: (text) => set((s) => ({ text, id: s.id + 1 })),
  hide: () => set({ text: null }),
}));

/** Visible message from Bintang: every button gives feedback even when TTS is unavailable. */
export function Toast() {
  const { text, id, hide } = useToast();
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(hide, 2500 + text.length * 45);
    return () => clearTimeout(t);
  }, [text, id, hide]);

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={id}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={hide}
          className="fixed inset-x-3 bottom-4 z-[70] mx-auto flex max-w-md items-center gap-2 rounded-3xl bg-white p-3 text-lg font-semibold text-slate-700 shadow-2xl ring-4 ring-amber-200"
          role="status"
        >
          <Bintang size={48} />
          <span className="flex-1">{text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

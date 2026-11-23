import { useEffect } from 'react';
import { Modal, Button } from './ui';
import { useGameStore } from '../store/useGameStore';
import { badgeOf } from '../data/badges';
import { say, sfx } from '../services/audio';
import { badgeNew } from '../data/voiceLines';
import { celebrate } from '../services/celebrate';

export function BadgeToast() {
  const id = useGameStore((s) => s.pendingBadges[0]);
  const pop = useGameStore((s) => s.popBadge);
  const badge = id ? badgeOf(id) : undefined;

  useEffect(() => {
    if (!badge) return;
    const t = setTimeout(() => {
      celebrate(true);
      sfx('bloom');
      say(badgeNew(badge.name));
    }, 400);
    return () => clearTimeout(t);
  }, [badge]);

  return (
    <Modal open={!!badge}>
      {badge && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-semibold text-purple-500">Lencana Baru!</p>
          <div className="bob text-8xl">{badge.emoji}</div>
          <h2 className="text-3xl font-semibold">{badge.name}</h2>
          <p className="text-slate-600">{badge.desc}</p>
          <p className="text-xl font-semibold text-amber-500">+20 🪙</p>
          <Button big color="purple" className="mt-2 w-full" onClick={pop}>
            Alhamdulillah!
          </Button>
        </div>
      )}
    </Modal>
  );
}

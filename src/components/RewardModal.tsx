import { useEffect } from 'react';
import { Modal, Button, Stars } from './ui';
import { Bintang } from './Bintang';
import { celebrate } from '../services/celebrate';
import { say, sfx } from '../services/audio';
import { L } from '../data/voiceLines';

export function RewardModal({
  open,
  stars,
  gained,
  coins,
  message,
  onNext,
  nextLabel = 'Lanjut',
  secondaryAction,
}: {
  open: boolean;
  stars: number;
  gained: number;
  coins: number;
  message: string;
  onNext: () => void;
  nextLabel?: string;
  secondaryAction?: { label: string; onClick: () => void };
}) {
  useEffect(() => {
    if (!open) return;
    celebrate(gained > 0);
    sfx(gained > 0 ? 'bloom' : 'correct');
    const t = setTimeout(() => sfx('coin'), 700);
    say(gained > 0 ? [message, L.newStar] : message);
    return () => clearTimeout(t);
  }, [open, gained, message]);

  return (
    <Modal open={open}>
      <div className="flex flex-col items-center gap-3">
        <Bintang size={110} mood="cheer" />
        <h2 className="text-3xl font-semibold text-emerald-600">{message}</h2>
        <Stars n={stars} size="text-5xl" />
        {gained > 0 && <p className="text-lg font-semibold text-amber-600">+{gained} bintang baru! 🎉</p>}
        <p className="text-2xl font-semibold text-amber-500">+{coins} 🪙</p>
        <Button big color="green" className="mt-2 w-full" onClick={onNext}>
          {nextLabel} ➜
        </Button>
        {secondaryAction && (
          <Button color="white" className="w-full" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </Modal>
  );
}

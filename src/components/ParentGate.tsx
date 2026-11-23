import { useState } from 'react';
import { Modal, Button } from './ui';

const ONES = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
function terbilang(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const t = Math.floor(rest / 10);
  const o = rest % 10;
  const parts: string[] = [];
  if (h) parts.push(h === 1 ? 'seratus' : `${ONES[h]} ratus`);
  if (rest >= 10 && rest < 20) parts.push(rest === 10 ? 'sepuluh' : rest === 11 ? 'sebelas' : `${ONES[o]} belas`);
  else {
    if (t) parts.push(`${ONES[t]} puluh`);
    if (o) parts.push(ONES[o]);
  }
  return parts.join(' ');
}

/** Adult check before settings or any external action. */
export function ParentGate({ open, onPass, onClose }: { open: boolean; onPass: () => void; onClose: () => void }) {
  const [target] = useState(() => 200 + Math.floor(Math.random() * 700));
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (d: string) => {
    setWrong(false);
    const next = (input + d).slice(0, 3);
    setInput(next);
    if (next.length === 3) {
      if (+next === target) onPass();
      else {
        setWrong(true);
        setInput('');
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-semibold">Khusus Orang Tua 👨‍👩‍👧</h2>
      <p className="mt-2 text-slate-600">Ketik angka berikut:</p>
      <p className="my-2 text-xl font-semibold text-blue-600">“{terbilang(target)}”</p>
      <div className={`mx-auto mb-3 h-12 w-40 rounded-2xl border-2 text-3xl tracking-[0.5em] ${wrong ? 'border-rose-400' : 'border-slate-200'}`}>
        {input.padEnd(3, '·')}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d) =>
          d === '' ? (
            <span key="blank" />
          ) : (
            <Button key={d} color="white" onClick={() => (d === '⌫' ? setInput(input.slice(0, -1)) : press(d))}>
              {d}
            </Button>
          ),
        )}
      </div>
      <button className="mt-4 text-slate-500 underline" onClick={onClose}>
        Batal
      </button>
    </Modal>
  );
}

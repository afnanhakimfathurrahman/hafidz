import type { Word } from '../data/quran';

export interface KeyWord {
  emoji: string;
  meaning: string;
}

export type HideLevel = 0 | 1 | 2 | 3; // 0 full, 1 some words hidden, 2 first letters, 3 blank

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('ar', { granularity: 'grapheme' }) : null;
const firstLetter = (w: string) => (seg ? [...seg.segment(w)][0]?.segment ?? w[0] : w[0]);

/**
 * Qur'anic text on a calm, solid panel. The text itself is never animated
 * (adab): only highlight color changes.
 */
export function AyahText({
  words,
  highlight = -1,
  hide = 0,
  range,
  onWord,
  size = 'text-4xl',
  ayahNo,
  meanings = false,
  keyWords,
}: {
  words: Word[];
  highlight?: number;
  hide?: HideLevel;
  range?: [number, number];
  onWord?: (i: number) => void;
  size?: string;
  ayahNo?: number;
  /** Show the Indonesian meaning under each visible word. */
  meanings?: boolean;
  /** Key words (Jodohkan Makna vocabulary) by word index: always captioned with picture + meaning. */
  keyWords?: Record<number, KeyWord>;
}) {
  const captions = meanings || (!!keyWords && Object.keys(keyWords).length > 0);
  return (
    <p className={`font-quran text-center ${size} text-slate-900`}>
      {words.map((w, i) => {
        const inRange = !range || (i >= range[0] && i < range[1]);
        const hidden =
          inRange && (hide === 3 || hide === 2 || (hide === 1 && i % 2 === 1)) && i !== highlight;
        const text = hidden ? (hide === 2 || hide === 1 ? firstLetter(w.t) + '…' : '⋯⋯') : w.t;
        return (
          <span
            key={i}
            onClick={onWord ? () => onWord(i) : undefined}
            className={`mx-0.5 rounded-xl px-1 transition-colors duration-150 ${
              captions ? 'my-1 inline-flex flex-col items-center align-top' : 'inline-block'
            } ${i === highlight ? 'bg-amber-200 text-blue-800' : ''} ${!inRange ? 'opacity-30' : ''} ${
              hidden ? 'text-slate-300' : ''
            } ${onWord ? 'cursor-pointer' : ''}`}
          >
            {text}
            {captions && (
              <span
                dir="ltr"
                className={`max-w-[8rem] pb-1 font-sans text-sm leading-tight ${
                  keyWords?.[i] ? 'font-semibold text-purple-700' : i === highlight ? 'text-blue-700' : 'text-slate-500'
                } ${hidden ? 'invisible' : ''}`}
              >
                {keyWords?.[i] ? `${keyWords[i].emoji} ${keyWords[i].meaning}` : meanings ? w.m : ''}
              </span>
            )}
          </span>
        );
      })}
      {ayahNo !== undefined && (
        <span className="mx-1 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500 align-middle font-sans text-base text-emerald-700">
          {ayahNo.toLocaleString('ar-EG')}
        </span>
      )}
    </p>
  );
}

export function QuranPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[2rem] border-4 border-amber-100 bg-amber-50 px-4 py-5 shadow-inner ${className}`}>{children}</div>;
}

import { surahOf } from '../data/quran';

/** Draws a printable certificate locally (nothing is uploaded). Returns a PNG data URL. */
export async function makeCertificate(name: string, surahs: number[], title?: string): Promise<string> {
  await Promise.all([document.fonts.load('600 40px Fredoka'), document.fonts.load('60px "Amiri Quran"')]).catch(() => {});
  const W = 1400;
  const H = 990;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#E0F2FE');
  bg.addColorStop(1, '#FEF3C7');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  g.strokeStyle = '#F59E0B';
  g.lineWidth = 18;
  g.strokeRect(30, 30, W - 60, H - 60);
  g.strokeStyle = '#3B82F6';
  g.lineWidth = 4;
  g.strokeRect(60, 60, W - 120, H - 120);

  const star = (x: number, y: number, r: number, color: string) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
    }
    g.closePath();
    g.fillStyle = color;
    g.fill();
  };
  star(160, 170, 60, '#FBBF24');
  star(W - 160, 170, 60, '#FBBF24');
  star(W / 2 - 90, 800, 34, '#FBBF24');
  star(W / 2, 790, 44, '#FBBF24');
  star(W / 2 + 90, 800, 34, '#FBBF24');

  g.textAlign = 'center';
  g.fillStyle = '#1E3A8A';
  g.font = '600 76px Fredoka, sans-serif';
  g.fillText(title ?? 'Sertifikat Hafalan', W / 2, 200);
  g.fillStyle = '#475569';
  g.font = '400 38px Fredoka, sans-serif';
  g.fillText('Petualangan Hafiz Kecil · Juz 30', W / 2, 255);
  g.fillText('Dengan penuh rasa syukur diberikan kepada', W / 2, 350);
  g.fillStyle = '#059669';
  g.font = '600 96px Fredoka, sans-serif';
  g.fillText(name, W / 2, 470);
  g.fillStyle = '#475569';
  g.font = '400 38px Fredoka, sans-serif';
  g.fillText('yang telah menghafal dan murojaah', W / 2, 550);

  if (surahs.length === 1) {
    const s = surahOf(surahs[0]);
    g.fillStyle = '#0F172A';
    g.font = '80px "Amiri Quran", serif';
    g.fillText(`سورة ${s.name}`, W / 2, 660);
    g.font = '600 46px Fredoka, sans-serif';
    g.fillText(`Surah ${s.latin} (${s.count} ayat)`, W / 2, 725);
  } else {
    g.fillStyle = '#0F172A';
    g.font = '600 56px Fredoka, sans-serif';
    g.fillText(`${surahs.length} Surah dari Juz 30`, W / 2, 680);
  }

  g.fillStyle = '#64748B';
  g.font = '400 30px Fredoka, sans-serif';
  g.fillText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, 890);
  g.fillText('بَارَكَ ٱللَّهُ فِيكَ', W / 2, 930);

  return c.toDataURL('image/png');
}

export async function shareCertificate(dataUrl: string, label: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `sertifikat-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sertifikat Hafalan' });
      return;
    } catch {
      /* cancelled: fall back to download */
    }
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = file.name;
  a.click();
}

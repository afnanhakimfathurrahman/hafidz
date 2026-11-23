// Post-build: writes static HTML for '/' and each '/pulau/{n}' (title, description,
// readable Surah content for crawlers) plus sitemap.xml. React replaces #root on load.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ISLANDS } from '../src/data/islands.ts';

const SITE = (process.env.SITE_URL ?? 'https://hafizkecil.pages.dev').replace(/\/$/, '');
const dist = new URL('../dist/', import.meta.url);
const tpl = readFileSync(new URL('index.html', dist), 'utf8');
const surahs = JSON.parse(readFileSync(new URL('../src/data/juz30.json', import.meta.url), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const latin = (n) => ISLANDS.find((i) => i.number === n).latin;

function page({ path, title, desc, body }) {
  return tpl
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace('</head>', `  <link rel="canonical" href="${SITE}${path}" />\n  </head>`)
    .replace('<!--prerender-->', `<div style="max-width:42rem;margin:auto;padding:1rem;font-family:sans-serif">${body}</div>`);
}

const list = surahs
  .slice()
  .sort((a, b) => b.number - a.number)
  .map((s) => `<li><a href="/pulau/${s.number}">Surah ${esc(latin(s.number))} (${esc(s.meaning)})</a></li>`)
  .join('');

writeFileSync(
  new URL('index.html', dist),
  page({
    path: '/',
    title: 'Petualangan Hafiz Kecil - Game Edukasi Hafalan Juz 30 Anak',
    desc: 'Game edukasi gratis untuk membantu anak menghafal Juz 30 beserta artinya. Tanpa iklan, bisa offline.',
    body: `<h1>Petualangan Hafiz Kecil: Game Hafalan Juz 30 untuk Anak</h1><p>Jelajahi 37 pulau Juz 30 bersama Bintang. Dengar &amp; ulangi bacaan Qori, sambung ayat, jodohkan makna, dan tebak surah. Gratis, tanpa iklan, bisa dipakai offline.</p><ul>${list}</ul>`,
  }),
);

for (const s of surahs) {
  const isl = ISLANDS.find((i) => i.number === s.number);
  const ayahs = s.ayahs
    .map((a) => `<li><p dir="rtl" lang="ar">${esc(a.words.map((w) => w.t).join(' '))} (${a.n})</p><p>${esc(a.tr)}</p></li>`)
    .join('');
  const html = page({
    path: `/pulau/${s.number}`,
    title: `Belajar Surah ${isl.latin} (Juz 30) - Game Hafalan Anak | Petualangan Hafiz Kecil`,
    desc: `Hafalan Surah ${isl.latin} (${s.meaning}, ${s.count} ayat) untuk anak: dengar & ulangi, sambung ayat, dan jodohkan makna. Gratis, tanpa iklan.`,
    body: `<h1>Belajar Surah ${esc(isl.latin)} (${esc(s.name)}) untuk Anak</h1><p>${esc(isl.about)}</p><p>Surah ke-${s.number}, ${s.count} ayat, artinya “${esc(s.meaning)}”.</p><ol>${ayahs}</ol><p><a href="/">Semua surah Juz 30</a></p>`,
  });
  mkdirSync(new URL(`pulau/${s.number}/`, dist), { recursive: true });
  writeFileSync(new URL(`pulau/${s.number}/index.html`, dist), html);
}

const urls = ['/', ...surahs.map((s) => `/pulau/${s.number}`)];
writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
console.log(`prerendered ${urls.length} pages for ${SITE}`);

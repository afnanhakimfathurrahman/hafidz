// Build-time snapshot of Juz 30 (Surah 78–114) into src/data/juz30.json.
// Sources: Quran.com API v4 (Uthmani words, Indonesian word meanings,
// Kemenag translation id 33, word timings per reciter).
import { writeFile } from 'node:fs/promises';

const API = 'https://api.quran.com/api/v4';
const RECITERS = { husary: 6, alafasy: 7, muallim: 12 };

async function get(path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(API + path);
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  throw new Error('Failed: ' + path);
}

const clean = (s) =>
  s.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const surahs = [];
const timings = { husary: {}, alafasy: {}, muallim: {} };

for (let c = 78; c <= 114; c++) {
  const { chapter } = await get(`/chapters/${c}?language=id`);
  const { verses } = await get(
    `/verses/by_chapter/${c}?words=true&language=id&word_fields=text_uthmani&translations=33&per_page=50`,
  );
  const ayahs = verses.map((v) => ({
    n: v.verse_number,
    id: v.id,
    words: v.words
      .filter((w) => w.char_type_name === 'word')
      .map((w) => ({ t: w.text_uthmani, m: w.translation?.text ?? '' })),
    tr: clean(v.translations[0].text),
  }));
  for (const [key, rid] of Object.entries(RECITERS)) {
    const { audio_files } = await get(`/recitations/${rid}/by_chapter/${c}?fields=segments&per_page=50`);
    for (const f of audio_files) {
      // segment: [index, wordPosition, startMs, endMs]
      timings[key][f.verse_key] = (f.segments ?? [])
        .filter((s) => s.length >= 4)
        .map((s) => [s[1], s[2], s[3]]);
    }
  }
  surahs.push({
    number: c,
    name: chapter.name_arabic,
    latin: chapter.name_simple,
    meaning: chapter.translated_name.name,
    count: chapter.verses_count,
    ayahs,
  });
  console.log(c, chapter.name_simple, ayahs.length);
}

await writeFile(new URL('../src/data/juz30.json', import.meta.url), JSON.stringify(surahs));
await writeFile(new URL('../src/data/timings.json', import.meta.url), JSON.stringify(timings));
console.log('done');

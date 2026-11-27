import type { Progress } from '../store/useGameStore';

export type ElementType = 'cahaya' | 'alam' | 'kisah' | 'waktu' | 'langit';
export type RpgSlot = 'weapon' | 'shield' | 'cloak' | 'accessory';

export const ELEMENT_INFO: Record<ElementType, { label: string; emoji: string; bonusDesc: string }> = {
  cahaya: { label: 'Cahaya', emoji: '✨', bonusDesc: '+ATK & Pulih HP saat Jurus Makna' },
  alam: { label: 'Alam', emoji: '🌿', bonusDesc: '+HP Maks & Pulih HP tiap jawaban tepat' },
  kisah: { label: 'Kisah', emoji: '📜', bonusDesc: '+Bonus Koin & EXP ekstra setelah menang' },
  waktu: { label: 'Waktu', emoji: '⏳', bonusDesc: '+Bonus kerusakan Combo beruntun' },
  langit: { label: 'Langit', emoji: '🌌', bonusDesc: 'Mengurangi serangan balik Penjaga Kabut' },
};

export interface MaterialCost {
  kristal: number;
  daun: number;
  bintang: number;
  coins: number;
}

export interface CraftItem {
  id: string;
  slot: RpgSlot;
  name: string;
  emoji: string;
  desc: string;
  atkBonus: number;
  hpBonus: number;
  xpPct: number;
  coinBonus: number;
  cost: MaterialCost;
}

export interface SurahRpg {
  number: number;
  companionName: string;
  companionEmoji: string;
  companionDesc: string;
  bossName: string;
  bossEmoji: string;
  bossHint: string;
  element: ElementType;
}

export const MATERIALS = [
  { id: 'kristal', name: 'Kristal Ayat', emoji: '💎', from: 'Hafalan Surat & Duel' },
  { id: 'daun', name: 'Daun Hikmah', emoji: '🌿', from: 'Hafal Arti & Makna' },
  { id: 'bintang', name: 'Debu Bintang', emoji: '🌟', from: 'Combo & Arena Murojaah' },
] as const;

export const CRAFT_ITEMS: CraftItem[] = [
  {
    id: 'weapon-wood',
    slot: 'weapon',
    name: 'Tongkat Pengembara',
    emoji: '🪄',
    desc: 'Tongkat awal penjelajah Negeri Juz 30.',
    atkBonus: 0,
    hpBonus: 0,
    xpPct: 0,
    coinBonus: 0,
    cost: { kristal: 0, daun: 0, bintang: 0, coins: 0 },
  },
  {
    id: 'weapon-lantern',
    slot: 'weapon',
    name: 'Tongkat Lentera Subuh',
    emoji: '🏮',
    desc: 'Menambah +10 Serangan Cahaya di duel penjaga.',
    atkBonus: 10,
    hpBonus: 0,
    xpPct: 0,
    coinBonus: 0,
    cost: { kristal: 2, daun: 1, bintang: 0, coins: 25 },
  },
  {
    id: 'weapon-quill',
    slot: 'weapon',
    name: 'Pena Cahaya Iqra',
    emoji: '🪶',
    desc: 'Serangan +18 DMG! Tajam menembus kabut.',
    atkBonus: 18,
    hpBonus: 0,
    xpPct: 10,
    coinBonus: 0,
    cost: { kristal: 4, daun: 3, bintang: 1, coins: 55 },
  },
  {
    id: 'weapon-star',
    slot: 'weapon',
    name: 'Pedang Bintang Hikmah',
    emoji: '⚔️',
    desc: 'Senjata legendaris +28 DMG & +20% EXP.',
    atkBonus: 28,
    hpBonus: 0,
    xpPct: 20,
    coinBonus: 2,
    cost: { kristal: 7, daun: 5, bintang: 3, coins: 110 },
  },
  {
    id: 'shield-leaf',
    slot: 'shield',
    name: 'Perisai Daun Zaitun',
    emoji: '🛡️',
    desc: 'Menambah +20 HP selama duel.',
    atkBonus: 0,
    hpBonus: 20,
    xpPct: 0,
    coinBonus: 0,
    cost: { kristal: 1, daun: 2, bintang: 0, coins: 25 },
  },
  {
    id: 'shield-ababil',
    slot: 'shield',
    name: 'Perisai Sayap Ababil',
    emoji: '🪽',
    desc: 'Menambah +40 HP & +4 Serangan.',
    atkBonus: 4,
    hpBonus: 40,
    xpPct: 0,
    coinBonus: 0,
    cost: { kristal: 3, daun: 4, bintang: 1, coins: 65 },
  },
  {
    id: 'shield-nur',
    slot: 'shield',
    name: 'Perisai Cahaya An-Nas',
    emoji: '💠',
    desc: 'Perlindungan terkuat +65 HP & +3 Koin tiap menang.',
    atkBonus: 6,
    hpBonus: 65,
    xpPct: 10,
    coinBonus: 3,
    cost: { kristal: 6, daun: 6, bintang: 3, coins: 120 },
  },
  {
    id: 'cloak-sky',
    slot: 'cloak',
    name: 'Jubah Angin Teluk',
    emoji: '🧥',
    desc: 'Bonus +25% EXP setelah menang.',
    atkBonus: 3,
    hpBonus: 10,
    xpPct: 25,
    coinBonus: 1,
    cost: { kristal: 2, daun: 2, bintang: 1, coins: 40 },
  },
  {
    id: 'cloak-qadr',
    slot: 'cloak',
    name: 'Jubah Malam Seribu Bulan',
    emoji: '🌌',
    desc: 'Jubah agung: +45% EXP & +5 Koin tiap duel.',
    atkBonus: 8,
    hpBonus: 20,
    xpPct: 45,
    coinBonus: 5,
    cost: { kristal: 5, daun: 5, bintang: 4, coins: 130 },
  },
  {
    id: 'acc-ring',
    slot: 'accessory',
    name: 'Cincin Bintang',
    emoji: '💍',
    desc: 'Aksesoris bercahaya +6 DMG & +15 HP.',
    atkBonus: 6,
    hpBonus: 15,
    xpPct: 5,
    coinBonus: 1,
    cost: { kristal: 2, daun: 2, bintang: 1, coins: 35 },
  },
  {
    id: 'acc-lamp',
    slot: 'accessory',
    name: 'Liontin Pelita',
    emoji: '🪔',
    desc: 'Pelita pengingat ayat: +10 DMG, +25 HP & +15% EXP.',
    atkBonus: 10,
    hpBonus: 25,
    xpPct: 15,
    coinBonus: 2,
    cost: { kristal: 4, daun: 4, bintang: 2, coins: 75 },
  },
  {
    id: 'acc-crown',
    slot: 'accessory',
    name: 'Mahkota Cahaya Juz 30',
    emoji: '👑',
    desc: 'Aksesoris agung penghafal Juz 30: +15 DMG, +40 HP & +25% EXP.',
    atkBonus: 15,
    hpBonus: 40,
    xpPct: 25,
    coinBonus: 4,
    cost: { kristal: 8, daun: 8, bintang: 5, coins: 160 },
  },
];

export const craftItemOf = (id?: string) => CRAFT_ITEMS.find((i) => i.id === id);

/** 37 unique Surah Companions & Guardians tied directly to each Surah's meaning. */
export const SURAH_RPG: Record<number, SurahRpg> = {
  114: { number: 114, companionName: 'Nurani', companionEmoji: '🕊️', companionDesc: 'Pelindung hati dari bisikan buruk.', bossName: 'Kabut Bisikan', bossEmoji: '💨', bossHint: 'Berlindunglah kepada Tuhan semua manusia.', element: 'cahaya' },
  113: { number: 113, companionName: 'Fajari', companionEmoji: '🐓', companionDesc: 'Pembawa cahaya subuh yang cerah.', bossName: 'Bayang Gelap', bossEmoji: '🌑', bossHint: 'Tuhan yang menerbitkan waktu subuh.', element: 'cahaya' },
  112: { number: 112, companionName: 'Ahadun', companionEmoji: '💎', companionDesc: 'Kristal kemurnian tauhid kepada Allah.', bossName: 'Kabut Ragu', bossEmoji: '🌫️', bossHint: 'Allah itu Maha Esa, tidak ada sekutu.', element: 'cahaya' },
  111: { number: 111, companionName: 'Shabiri', companionEmoji: '🦎', companionDesc: 'Sahabat sabar menghadapi gangguan.', bossName: 'Bara Amarah', bossEmoji: '🔥', bossHint: 'Harta dan kesombongan tidak menolong.', element: 'kisah' },
  110: { number: 110, companionName: 'Nasri', companionEmoji: '🦅', companionDesc: 'Pembawa kabar pertolongan Allah.', bossName: 'Tembok Putus Asa', bossEmoji: '🧱', bossHint: 'Bertasbih dan mohon ampun saat menang.', element: 'cahaya' },
  109: { number: 109, companionName: 'Teguh', companionEmoji: '🪷', companionDesc: 'Bunga teguh pendirian dalam iman.', bossName: 'Kabut Bimbang', bossEmoji: '🌀', bossHint: 'Untukmu agamamu, untukku agamaku.', element: 'cahaya' },
  108: { number: 108, companionName: 'Kautsar', companionEmoji: '🐬', companionDesc: 'Penjaga telaga nikmat yang berlimpah.', bossName: 'Kabut Kikir', bossEmoji: '🏜️', bossHint: 'Salatlah dan berkurbanlah karena nikmat Allah.', element: 'alam' },
  107: { number: 107, companionName: 'Derma', companionEmoji: '🦌', companionDesc: 'Sahabat penyayang anak yatim dan miskin.', bossName: 'Kabut Acuh', bossEmoji: '🧊', bossHint: 'Jangan menghardik anak yatim dan lalai salat.', element: 'kisah' },
  106: { number: 106, companionName: 'Qafilah', companionEmoji: '🐪', companionDesc: 'Unta kafilah yang dijaga perjalanannya.', bossName: 'Badai Gurun', bossEmoji: '🌪️', bossHint: 'Sembahlah Tuhan pemilik Ka’bah yang memberi aman.', element: 'kisah' },
  105: { number: 105, companionName: 'Ababil', companionEmoji: '🐦', companionDesc: 'Burung penjaga Ka’bah pembawa batu kecil.', bossName: 'Gajah Kabut', bossEmoji: '🐘', bossHint: 'Allah mengirim burung Ababil menjaga rumah-Nya.', element: 'kisah' },
  104: { number: 104, companionName: 'Santun', companionEmoji: '🦋', companionDesc: 'Penjaga lisan agar berkata baik.', bossName: 'Kabut Ejekan', bossEmoji: '🗣️', bossHint: 'Jangan mengumpat, mencela, atau menumpuk harta.', element: 'kisah' },
  103: { number: 103, companionName: 'Zamani', companionEmoji: '⏳', companionDesc: 'Penjaga waktu agar tak terbuang sia-sia.', bossName: 'Kabut Lalai', bossEmoji: '🦥', bossHint: 'Manusia merugi kecuali yang beriman & beramal.', element: 'waktu' },
  102: { number: 102, companionName: 'Qanaah', companionEmoji: '🌾', companionDesc: 'Penjaga rasa cukup dan syukur.', bossName: 'Peti Serakah', bossEmoji: '💰', bossHint: 'Bermegah-megahan melalaikan hingga liang kubur.', element: 'waktu' },
  101: { number: 101, companionName: 'Mizani', companionEmoji: '⚖️', companionDesc: 'Penimbang amal baik di akhirat.', bossName: 'Kabut Ringan', bossEmoji: '🪶', bossHint: 'Siapa yang berat timbangan kebaikannya akan senang.', element: 'waktu' },
  100: { number: 100, companionName: 'Adiyat', companionEmoji: '🐎', companionDesc: 'Kuda cahaya yang berlari kencang.', bossName: 'Kabut Ingkar', bossEmoji: '🌩️', bossHint: 'Jangan ingkar nikmat dan cinta harta berlebihan.', element: 'alam' },
  99: { number: 99, companionName: 'Zalzali', companionEmoji: '🌍', companionDesc: 'Penjaga bumi yang mencatat kebaikan sekecil atom.', bossName: 'Getar Bumi', bossEmoji: '🌋', bossHint: 'Kebaikan sekecil dzarrah pun pasti dibalas.', element: 'alam' },
  98: { number: 98, companionName: 'Bayyina', companionEmoji: '📜', companionDesc: 'Pembawa bukti nyata petunjuk Allah.', bossName: 'Kabut Keliru', bossEmoji: '❓', bossHint: 'Beribadah ikhlas, dirikan salat, dan tunaikan zakat.', element: 'cahaya' },
  97: { number: 97, companionName: 'Qadri', companionEmoji: '🌙', companionDesc: 'Cahaya malam lebih baik dari seribu bulan.', bossName: 'Kabut Sunyi', bossEmoji: '🦉', bossHint: 'Al-Qur’an diturunkan pada malam Lailatul Qadar.', element: 'langit' },
  96: { number: 96, companionName: 'Iqra', companionEmoji: '📖', companionDesc: 'Burung hantu bijak pecinta ilmu dan pena.', bossName: 'Kabut Malas Baca', bossEmoji: '💤', bossHint: 'Bacalah dengan nama Tuhanmu yang mengajar dengan pena.', element: 'cahaya' },
  95: { number: 95, companionName: 'Zaituna', companionEmoji: '🫒', companionDesc: 'Roh pohon tin dan zaitun yang diberkahi.', bossName: 'Kabut Lupa Diri', bossEmoji: '🥀', bossHint: 'Manusia diciptakan dalam bentuk sebaik-baiknya.', element: 'alam' },
  94: { number: 94, companionName: 'Yusra', companionEmoji: '🌈', companionDesc: 'Pelangi harapan sesudah kesulitan.', bossName: 'Awan Sempit', bossEmoji: '⛈️', bossHint: 'Sesungguhnya bersama kesulitan ada kemudahan.', element: 'cahaya' },
  93: { number: 93, companionName: 'Dhuha', companionEmoji: '🌞', companionDesc: 'Mentari pagi bukti kasih sayang Allah.', bossName: 'Kabut Sedih', bossEmoji: '🌧️', bossHint: 'Tuhanmu tidak meninggalkanmu dan tidak membencimu.', element: 'waktu' },
  92: { number: 92, companionName: 'Laili', companionEmoji: '⭐', companionDesc: 'Kunang malam penerang jalan kebaikan.', bossName: 'Kabut Pelit', bossEmoji: '🕸️', bossHint: 'Orang yang dermawan dan bertakwa dimudahkan jalannya.', element: 'waktu' },
  91: { number: 91, companionName: 'Syamsi', companionEmoji: '☀️', companionDesc: 'Penjaga matahari yang menyucikan jiwa.', bossName: 'Kabut Kotor', bossEmoji: '🌫️', bossHint: 'Beruntunglah orang yang menyucikan jiwanya.', element: 'langit' },
  90: { number: 90, companionName: 'Baladi', companionEmoji: '🏙️', companionDesc: 'Penjaga negeri aman dan jalan mendaki kebaikan.', bossName: 'Tanjakan Berat', bossEmoji: '🪨', bossHint: 'Membebaskan hamba dan memberi makan di masa sulit.', element: 'kisah' },
  89: { number: 89, companionName: 'Fajri', companionEmoji: '🌄', companionDesc: 'Penjaga fajar dan jiwa yang tenang.', bossName: 'Kabut Sombong', bossEmoji: '🏛️', bossHint: 'Muliakan anak yatim dan kembalilah kepada Allah dengan tenang.', element: 'waktu' },
  88: { number: 88, companionName: 'Ghasyi', companionEmoji: '⛰️', companionDesc: 'Pengamat unta, langit, dan gunung ciptaan Allah.', bossName: 'Kabut Lalai', bossEmoji: '🏜️', bossHint: 'Tidakkah mereka memperhatikan unta, langit, dan gunung?', element: 'alam' },
  87: { number: 87, companionName: 'A’la', companionEmoji: '🌿', companionDesc: 'Penjaga padang hijau yang bertasbih.', bossName: 'Kabut Lupa', bossEmoji: '🍂', bossHint: 'Sucikanlah nama Tuhanmu Yang Maha Tinggi.', element: 'alam' },
  86: { number: 86, companionName: 'Thariq', companionEmoji: '🌠', companionDesc: 'Bintang penembus gelapnya malam.', bossName: 'Malam Pekat', bossEmoji: '🌌', bossHint: 'Bintang yang cahayanya menembus malam.', element: 'langit' },
  85: { number: 85, companionName: 'Buruj', companionEmoji: '✨', companionDesc: 'Penjaga gugusan bintang di langit.', bossName: 'Kabut Ujian', bossEmoji: '🔥', bossHint: 'Langit yang mempunyai gugusan bintang.', element: 'langit' },
  84: { number: 84, companionName: 'Syafaq', companionEmoji: '🌇', companionDesc: 'Penjaga cahaya merah senja dan purnama.', bossName: 'Kabut Senja', bossEmoji: '🌆', bossHint: 'Langit dan bumi tunduk patuh kepada Allah.', element: 'langit' },
  83: { number: 83, companionName: 'Adil', companionEmoji: '⚖️', companionDesc: 'Penjaga kejujuran dalam menimbang.', bossName: 'Penipu Takaran', bossEmoji: '🎭', bossHint: 'Celakalah orang-orang yang curang dalam menakar.', element: 'kisah' },
  82: { number: 82, companionName: 'Kiraman', companionEmoji: '🐬', companionDesc: 'Sahabat baik pengingat malaikat pencatat amal.', bossName: 'Kabut Tipu', bossEmoji: '🌊', bossHint: 'Ada malaikat mulia yang mencatat semua amal kita.', element: 'langit' },
  81: { number: 81, companionName: 'Takwir', companionEmoji: '🦁', companionDesc: 'Singa cahaya pengingat kebesaran wahyu.', bossName: 'Kabut Gelap', bossEmoji: '🌑', bossHint: 'Al-Qur’an adalah peringatan bagi semesta alam.', element: 'langit' },
  80: { number: 80, companionName: 'Bustan', companionEmoji: '🍇', companionDesc: 'Penjaga kebun anggur, zaitun, dan kurma.', bossName: 'Kabut Pilih Kasih', bossEmoji: '☁️', bossHint: 'Setiap pencari ilmu berharga di sisi Allah.', element: 'alam' },
  79: { number: 79, companionName: 'Thuwa', companionEmoji: '🏔️', companionDesc: 'Elang lembah suci pengingat keberanian Musa.', bossName: 'Kabut Fir’aun', bossEmoji: '🌪️', bossHint: 'Nabi Musa menasihati dengan lembut, jauhi kesombongan.', element: 'kisah' },
  78: { number: 78, companionName: 'Ghamam', companionEmoji: '🐉', companionDesc: 'Penjaga awan hujan, gunung pasak bumi, dan kebun.', bossName: 'Raksasa Kabut Besar', bossEmoji: '🌋', bossHint: 'Allah menghamparkan bumi dan menurunkan hujan lebat.', element: 'alam' },
};

export const surahRpgOf = (n: number): SurahRpg => SURAH_RPG[n] ?? SURAH_RPG[114];

/** Companion evolution stage (0 = locked, 1 = Tunas, 2 = Sahabat Muda, 3 = Legendaris). */
export function companionStage(p: Progress, surahNo: number): 0 | 1 | 2 | 3 {
  const s = p.stars[surahNo] ?? 0;
  if (s >= 3) return 3;
  if (s >= 2) return 2;
  if (s >= 1 || !!p.done[surahNo]?.listen || (p.parts[surahNo]?.length ?? 0) > 0) return 1;
  return 0;
}

export const STAGE_LABEL = ['Terkunci', 'Tahap 1 · Tunas', 'Tahap 2 · Sahabat', 'Tahap 3 · Legendaris ✨'] as const;

/** Player RPG level from XP. */
export function levelOf(xp: number): { level: number; curXp: number; nextXp: number; pct: number } {
  const safeXp = Math.max(0, xp || 0);
  const level = Math.floor(Math.sqrt(safeXp / 40)) + 1;
  const startXp = 40 * (level - 1) * (level - 1);
  const endXp = 40 * level * level;
  const curXp = safeXp - startXp;
  const nextXp = endXp - startXp;
  return { level, curXp, nextXp, pct: Math.min(100, Math.round((curXp / nextXp) * 100)) };
}

/** Computes active Companion element passive scaled by evolution stage (1..3). */
export function partnerSkill(p: Progress) {
  const compNo = p.rpgEquipped?.companion;
  if (!compNo) {
    return {
      companion: null as SurahRpg | null,
      stage: 0 as 0 | 1 | 2 | 3,
      atkBonus: 0,
      hpBonus: 0,
      xpPct: 0,
      coinBonus: 0,
      ultHeal: 0,
      turnHeal: 0,
      comboBonus: 0,
      dmgReduce: 0,
      summary: 'Pilih Partner di Koleksi untuk aktifkan jurus elemen!',
    };
  }
  const companion = surahRpgOf(compNo);
  const stage = Math.max(1, companionStage(p, compNo)) as 1 | 2 | 3;
  let atkBonus = 0,
    hpBonus = 0,
    xpPct = 0,
    coinBonus = 0,
    ultHeal = 0,
    turnHeal = 0,
    comboBonus = 0,
    dmgReduce = 0;
  let summary = '';

  switch (companion.element) {
    case 'cahaya':
      atkBonus = 3 * stage;
      ultHeal = 6 * stage;
      summary = `+${atkBonus} ATK & +${ultHeal} HP saat Jurus Makna`;
      break;
    case 'alam':
      hpBonus = 12 * stage;
      turnHeal = 3 * stage;
      summary = `+${hpBonus} HP Maks & +${turnHeal} HP tiap benar`;
      break;
    case 'kisah':
      coinBonus = 3 * stage;
      xpPct = 10 * stage;
      summary = `+${coinBonus} Koin & +${xpPct}% EXP setelah duel`;
      break;
    case 'waktu':
      comboBonus = 0.1 * stage;
      atkBonus = 2 * stage;
      summary = `+${atkBonus} ATK & +${Math.round(comboBonus * 100)}% DMG Combo`;
      break;
    case 'langit':
      dmgReduce = 3 * stage;
      hpBonus = 6 * stage;
      summary = `Kurangi serangan bos -${dmgReduce} DMG & +${hpBonus} HP`;
      break;
  }

  return { companion, stage, atkBonus, hpBonus, xpPct, coinBonus, ultHeal, turnHeal, comboBonus, dmgReduce, summary };
}

/** Combined RPG stats from crafted & equipped gear + companion count & active partner skill. */
export function heroStats(p: Progress) {
  const eq = p.rpgEquipped ?? {};
  const weapon = craftItemOf(eq.weapon ?? 'weapon-wood');
  const shield = craftItemOf(eq.shield);
  const cloak = craftItemOf(eq.cloak);
  const accessory = craftItemOf(eq.accessory);
  const ownedCompanions = Object.keys(p.stars).filter((k) => (p.stars[Number(k)] ?? 0) >= 2).length;
  const lv = levelOf(p.xp ?? 0).level;
  const partner = partnerSkill(p);

  const baseAtk = 20 + (lv - 1) * 2 + ownedCompanions;
  const baseHp = 100 + (lv - 1) * 5;
  const atk = baseAtk + (weapon?.atkBonus ?? 0) + (shield?.atkBonus ?? 0) + (cloak?.atkBonus ?? 0) + (accessory?.atkBonus ?? 0) + partner.atkBonus;
  const maxHp = baseHp + (weapon?.hpBonus ?? 0) + (shield?.hpBonus ?? 0) + (cloak?.hpBonus ?? 0) + (accessory?.hpBonus ?? 0) + partner.hpBonus;
  const xpPct = (weapon?.xpPct ?? 0) + (shield?.xpPct ?? 0) + (cloak?.xpPct ?? 0) + (accessory?.xpPct ?? 0) + partner.xpPct;
  const coinBonus = (weapon?.coinBonus ?? 0) + (shield?.coinBonus ?? 0) + (cloak?.coinBonus ?? 0) + (accessory?.coinBonus ?? 0) + partner.coinBonus;

  return {
    atk,
    maxHp,
    xpPct,
    coinBonus,
    weapon,
    shield,
    cloak,
    accessory,
    level: lv,
    partner,
  };
}

export function canCraft(p: Progress, item: CraftItem): boolean {
  if ((p.crafted ?? []).includes(item.id)) return false;
  const mat = p.materials ?? { kristal: 0, daun: 0, bintang: 0 };
  return (
    mat.kristal >= item.cost.kristal &&
    mat.daun >= item.cost.daun &&
    mat.bintang >= item.cost.bintang &&
    p.coins >= item.cost.coins
  );
}

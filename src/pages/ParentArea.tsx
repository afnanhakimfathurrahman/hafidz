import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Trash2, Download, Upload, DownloadCloud } from 'lucide-react';
import { SURAHS, QORI, type QoriId } from '../data/quran';
import { Button, Stars, TopBar } from '../components/ui';
import { useGameStore, useProfile, useProgress, isDue } from '../store/useGameStore';
import { listRecordings, playBlob } from '../services/recorder';
import { downloadSurah, say, toast, canDownload, downloadVoices } from '../services/audio';
import { L, allVoiceLines } from '../data/voiceLines';
import { makeCertificate, shareCertificate } from '../services/certificate';
import { navigate } from '../hooks/useRoute';
import { todayStr } from '../services/srs';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow">
      <h2 className="mb-3 text-xl font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function Choice<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button key={String(o.value)} color={o.value === value ? 'blue' : 'white'} onClick={() => onChange(o.value)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mb-4">
    <p className="mb-1 font-semibold text-slate-600">{label}</p>
    {children}
  </div>
);

export default function ParentArea() {
  const profile = useProfile()!;
  const p = useProgress();
  const s = useGameStore();
  const { settings, updateSettings } = s;
  const [recs, setRecs] = useState<Awaited<ReturnType<typeof listRecordings>>>([]);
  const [dlAll, setDlAll] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRecordings(profile.id).then(setRecs);
  }, [profile.id]);

  const learned = SURAHS.filter((x) => (p.stars[x.number] ?? 0) >= 2);
  const minutesToday = p.today.date === todayStr() ? Math.round(p.today.seconds / 60) : 0;

  const downloadAll = async () => {
    if (!canDownload()) {
      setDlAll(null);
      setMsg(`Unduh offline hanya bisa dari ${location.origin} (HTTPS atau localhost).`);
      return;
    }
    let failed = false;
    const total = SURAHS.reduce((a, x) => a + x.count, 0);
    let done = 0;
    for (const x of SURAHS) {
      const ok = await downloadSurah(settings.qori, x.number, x.count, () => setDlAll(`${Math.round((++done / total) * 100)}%`));
      failed ||= !ok;
    }
    setDlAll('Suara Bintang...');
    failed ||= !(await downloadVoices(allVoiceLines()));
    setDlAll(failed ? null : 'Selesai ✓');
    if (failed) setMsg('Sebagian suara gagal diunduh. Cek internet lalu ketuk lagi.');
  };

  const exportData = () => {
    const data = JSON.stringify({ app: 'hafiz-kecil', v: 1, profiles: s.profiles, progress: s.progress, settings });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `hafiz-kecil-cadangan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importData = async (file: File) => {
    const ok = s.importData(await file.text());
    toast(ok ? 'Data berhasil dipulihkan.' : 'File cadangan tidak valid.');
    if (ok) navigate('/', true);
  };

  return (
    <div className="min-h-screen">
      <TopBar title="👨‍👩‍👧 Area Orang Tua" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-10">
        <Section title={`Laporan: ${profile.nickname}`}>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-sky-50 p-2">
              <div className="text-2xl font-semibold">{learned.length}</div>
              <div className="text-sm text-slate-500">surah hafal</div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-2">
              <div className="text-2xl font-semibold">{p.garden.days}</div>
              <div className="text-sm text-slate-500">hari belajar</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-2">
              <div className="text-2xl font-semibold">{minutesToday}</div>
              <div className="text-sm text-slate-500">menit hari ini</div>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left">
              <tbody>
                {SURAHS.filter((x) => p.stars[x.number] || p.done[x.number]).map((x) => (
                  <tr key={x.number} className="border-t border-slate-100">
                    <td className="py-1">{x.latin}</td>
                    <td>
                      <Stars n={p.stars[x.number] ?? 0} size="text-base" />
                    </td>
                    <td className="text-sm text-slate-500">
                      {p.review[x.number]
                        ? isDue(p.review[x.number])
                          ? '💭 perlu murojaah'
                          : `murojaah ${new Date(p.review[x.number].nextAt).toLocaleDateString('id-ID')}`
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!Object.keys(p.done).length && <p className="text-slate-500">Belum ada kegiatan.</p>}
          </div>
          {learned.length >= 2 && (
            <Button
              color="yellow"
              className="mt-3 w-full"
              onClick={async () =>
                shareCertificate(
                  await makeCertificate(profile.nickname, learned.map((x) => x.number), 'Sertifikat Juz 30'),
                  'juz-30',
                )
              }
            >
              🏆 Sertifikat {learned.length} Surah
            </Button>
          )}
        </Section>

        <Section title="🏅 Setoran Hafalan Anak">
          {Object.keys(p.setoran ?? {}).length === 0 ? (
            <p className="text-slate-500">
              Belum ada setoran. Anak bisa mengirim setoran dari halaman pulau surah yang sudah dipelajari.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(p.setoran ?? {}).map(([sNoStr, entry]) => {
                const sNo = Number(sNoStr);
                const sName = SURAHS.find((x) => x.number === sNo)?.latin ?? `Surah ${sNo}`;
                const fullRec = recs.find((r) => r.surah === sNo && r.ayah === 0);
                return (
                  <div key={sNo} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3">
                    <div>
                      <div className="font-semibold text-slate-800">{sName}</div>
                      <div className="text-xs text-slate-500">
                        {entry.status === 'approved' ? 'Sah ✓ (+30 🪙 sudah diberikan)' : 'Menunggu persetujuan orang tua'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fullRec && (
                        <Button color="white" onClick={() => playBlob(fullRec.blob)} label="Putar setoran">
                          <Play size={18} /> Putar
                        </Button>
                      )}
                      {entry.status !== 'approved' && (
                        <Button
                          color="green"
                          onClick={() => {
                            s.approveSetoran(sNo);
                            toast(`Stempel Hafiz untuk ${sName} disahkan! (+30 🪙 untuk anak)`);
                          }}
                        >
                          Sahkan ⭐
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="🎙️ Rekaman Suara Anak">
          {recs.length === 0 ? (
            <p className="text-slate-500">Belum ada rekaman. Rekaman tersimpan di perangkat ini saja dan terhapus otomatis setelah 7 hari.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recs.map((r) => (
                <div key={`${r.surah}:${r.ayah}`} className="flex items-center gap-2">
                  <Button color="white" onClick={() => playBlob(r.blob)} label="Putar">
                    <Play size={20} />
                  </Button>
                  <span className="flex-1">
                    {SURAHS.find((x) => x.number === r.surah)?.latin} {r.ayah === 0 ? '(Setoran penuh)' : `ayat ${r.ayah}`}
                  </span>
                  <span className="text-sm text-slate-400">{new Date(r.at).toLocaleDateString('id-ID')}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="⚙️ Pengaturan Belajar">
          <Row label="Kelompok usia">
            <Choice
              value={profile.ageBand}
              options={[
                { value: 'A', label: '🐣 5–7 Pemula' },
                { value: 'B', label: '🧭 8–12 Penjelajah' },
              ]}
              onChange={(v) => s.updateProfile({ ageBand: v })}
            />
          </Row>
          <Row label="Qori">
            <Choice
              value={settings.qori}
              options={(Object.keys(QORI) as QoriId[]).map((q) => ({ value: q, label: `${QORI[q].label} · ${QORI[q].note}` }))}
              onChange={(v) => updateSettings({ qori: v })}
            />
          </Row>
          <Row label="Ulangi setiap ayat">
            <Choice
              value={settings.repeat}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}x` }))}
              onChange={(v) => updateSettings({ repeat: v })}
            />
          </Row>
          <Row label="Kecepatan bacaan">
            <Choice
              value={settings.rate}
              options={[
                { value: 0.75, label: '🐢 Pelan' },
                { value: 1, label: 'Normal' },
              ]}
              onChange={(v) => updateSettings({ rate: v })}
            />
          </Row>
          <Row label="Suara Bintang (panduan suara)">
            <div className="flex flex-wrap gap-2">
              <Choice value={settings.voice ? 'on' : 'off'} options={[{ value: 'on', label: 'Nyala' }, { value: 'off', label: 'Mati' }]} onChange={(v) => updateSettings({ voice: v === 'on' })} />
              <Button color="yellow" disabled={!settings.voice} onClick={() => say(L.voiceTest)}>
                🔊 Coba suara
              </Button>
            </div>
          </Row>
          <Row label="Jenis suara Bintang">
            <div className="flex flex-col gap-2">
              <Choice
                value={settings.voiceSource}
                options={[
                  { value: 'asset', label: '🎙️ Suara rekaman' },
                  { value: 'tts', label: '📱 Suara HP (text-to-speech)' },
                ]}
                onChange={(v) => updateSettings({ voiceSource: v })}
              />
              <p className="text-sm text-slate-500">
                {settings.voiceSource === 'asset'
                  ? 'Memakai rekaman suara Bintang. Kalimat yang belum direkam memakai suara HP.'
                  : 'Memakai suara bawaan HP. Tidak perlu unduh, tapi bunyinya tergantung HP.'}
              </p>
              {settings.voiceSource === 'tts' && (
                <Choice
                  value={settings.childVoice ? 'child' : 'normal'}
                  options={[
                    { value: 'child', label: '🧒 Nada anak-anak' },
                    { value: 'normal', label: 'Nada biasa' },
                  ]}
                  onChange={(v) => updateSettings({ childVoice: v === 'child' })}
                />
              )}
            </div>
          </Row>
          <Row label="Efek suara (lonceng lembut, tanpa musik)">
            <Choice value={settings.sfx ? 'on' : 'off'} options={[{ value: 'on', label: 'Nyala' }, { value: 'off', label: 'Mati' }]} onChange={(v) => updateSettings({ sfx: v === 'on' })} />
          </Row>
          <Row label="Tampilkan terjemahan">
            <Choice
              value={settings.showTranslation ? 'on' : 'off'}
              options={[{ value: 'on', label: 'Ya' }, { value: 'off', label: 'Tidak' }]}
              onChange={(v) => updateSettings({ showTranslation: v === 'on' })}
            />
          </Row>
          <Row label="Tampilkan arti per kata">
            <Choice
              value={settings.showWordMeaning ? 'on' : 'off'}
              options={[{ value: 'on', label: 'Ya' }, { value: 'off', label: 'Tidak' }]}
              onChange={(v) => updateSettings({ showWordMeaning: v === 'on' })}
            />
          </Row>
          <Row label="Buka semua pulau (tanpa kabut)">
            <div className="flex flex-col gap-2">
              <Choice
                value={settings.unlockAll ? 'on' : 'off'}
                options={[{ value: 'off', label: 'Berurutan' }, { value: 'on', label: 'Buka semua' }]}
                onChange={(v) => updateSettings({ unlockAll: v === 'on' })}
              />
              <p className="text-sm text-slate-500">
                Berurutan: pulau dibuka satu per satu dari An-Nas. Anak yang sudah hafal bisa ikut Tes Lompat Pulau.
              </p>
            </div>
          </Row>
          <Row label="Batas waktu bermain per hari">
            <Choice
              value={settings.dailyLimitMin}
              options={[0, 15, 30, 45, 60].map((n) => ({ value: n, label: n ? `${n} menit` : 'Tanpa batas' }))}
              onChange={(v) => updateSettings({ dailyLimitMin: v })}
            />
          </Row>
        </Section>

        <Section title="📶 Mode Offline">
          <p className="mb-3 text-slate-600">
            Teks Al-Qur'an sudah tersimpan di aplikasi. Unduh suara Qori agar bisa belajar tanpa internet (± 20–60 MB).
          </p>
          <Button color="blue" className="w-full" onClick={downloadAll} disabled={!!dlAll && dlAll !== 'Selesai ✓'}>
            <DownloadCloud size={22} /> {dlAll ?? `Unduh Semua Juz 30 (${QORI[settings.qori].label})`}
          </Button>
          {msg && <p className="mt-2 text-amber-700">{msg}</p>}
        </Section>

        <Section title="👧👦 Profil Anak">
          <div className="flex flex-col gap-2">
            {s.profiles.map((pr) => (
              <div key={pr.id} className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full" style={{ background: pr.avatar }} />
                <span className="flex-1 font-semibold">
                  {pr.nickname} {pr.id === profile.id && '(aktif)'}
                </span>
                {pr.id !== profile.id && (
                  <Button
                    color="rose"
                    label="Hapus profil"
                    onClick={() => confirm(`Hapus profil ${pr.nickname} beserta semua progresnya?`) && s.removeProfile(pr.id)}
                  >
                    <Trash2 size={20} />
                  </Button>
                )}
              </div>
            ))}
            <Button color="white" onClick={() => (s.switchProfile(null), navigate('/', true))}>
              Ganti / tambah anak
            </Button>
          </div>
        </Section>

        <Section title="💾 Cadangan Data">
          <p className="mb-3 text-slate-600">Tidak ada akun dan tidak ada data yang dikirim ke server. Simpan cadangan untuk pindah perangkat.</p>
          <div className="flex gap-2">
            <Button color="white" className="flex-1" onClick={exportData}>
              <Download size={20} /> Simpan
            </Button>
            <Button color="white" className="flex-1" onClick={() => fileRef.current?.click()}>
              <Upload size={20} /> Pulihkan
            </Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />

        </Section>

        <Section title="ℹ️ Tentang">
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>Teks Utsmani & arti per kata: Quran.com. Terjemahan: Kementerian Agama RI.</li>
            <li>Suara: Syaikh Mahmud Khalil Al-Husary dan Syaikh Mishary Alafasy.</li>
            <li>Tanpa iklan, tanpa pelacak, tanpa akun. Semua progres tersimpan di perangkat ini.</li>
            <li>Penilaian bacaan tidak otomatis. Dampingi anak dan dengarkan rekamannya untuk membetulkan tajwid.</li>
          </ul>
        </Section>
      </main>
    </div>
  );
}

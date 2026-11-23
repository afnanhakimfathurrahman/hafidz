import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { Button, Modal } from './ui';
import { promptInstall, useInstall } from '../services/install';

/** "Pasang aplikasi" button; hidden when already installed or the browser can't install. */
export function InstallButton({ className = '' }: { className?: string }) {
  const { available, canPrompt } = useInstall();
  const [iosHelp, setIosHelp] = useState(false);
  if (!available) return null;

  return (
    <>
      <Button
        color="blue"
        className={className}
        label="Pasang aplikasi"
        onClick={() => (canPrompt ? promptInstall() : setIosHelp(true))}
      >
        <Download size={24} /> Pasang Aplikasi
      </Button>
      <Modal open={iosHelp} onClose={() => setIosHelp(false)}>
        <h2 className="text-2xl font-semibold">Pasang di layar utama 📲</h2>
        <ol className="my-4 space-y-3 text-left text-lg text-slate-700">
          <li className="flex items-center gap-2">
            1. Ketuk tombol <Share size={22} className="text-blue-500" /> <b>Bagikan</b> di Safari
          </li>
          <li className="flex items-center gap-2">
            2. Pilih <SquarePlus size={22} className="text-blue-500" /> <b>Tambah ke Layar Utama</b>
          </li>
          <li>3. Ketuk <b>Tambah</b></li>
        </ol>
        <Button color="green" className="w-full" onClick={() => setIosHelp(false)}>
          Oke!
        </Button>
      </Modal>
    </>
  );
}

import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed =
  typeof window !== 'undefined' &&
  (matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Captured at module load (imported from main.tsx) so the event isn't missed before React mounts
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    emit();
  });
}

// iOS Safari has no install prompt; users must use Share → "Add to Home Screen"
const isIOS =
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

let snapshot = { canPrompt: false, installed, isIOS };
const getSnapshot = () => {
  const canPrompt = !!deferred;
  if (snapshot.canPrompt !== canPrompt || snapshot.installed !== installed) snapshot = { canPrompt, installed, isIOS };
  return snapshot;
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  emit();
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome === 'accepted';
}

export function useInstall() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...s, available: !s.installed && (s.canPrompt || s.isIOS) };
}

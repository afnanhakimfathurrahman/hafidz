import { useSyncExternalStore } from 'react';

// Tiny history router: '/', '/pulau/105', '/pulau/105/sambung', '/murojaah', '/toko', '/lencana', '/orang-tua'
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener('popstate', fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('popstate', fn);
  };
};

export function navigate(path: string, replace = false) {
  if (path === location.pathname) return;
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
}

export const useRoute = () => {
  const path = useSyncExternalStore(subscribe, () => location.pathname, () => '/');
  return path.replace(/\/+$/, '').split('/').filter(Boolean);
};

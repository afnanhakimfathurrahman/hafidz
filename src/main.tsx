import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { cleanupRecordings } from './services/recorder';
import './services/install';
import './index.css';

registerSW({ immediate: true });
cleanupRecordings();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

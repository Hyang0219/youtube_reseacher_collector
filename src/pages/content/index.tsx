// src/pages/content/index.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import { captureContext } from '../../services/youtube';

type CaptureStatus = 'idle' | 'captured';

const CONTAINER_ID = 'youtube-aha-catcher-root';

const ensureContainer = (): HTMLElement => {
  let container = document.getElementById(CONTAINER_ID);
  if (container) {
    return container;
  }
  container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.position = 'fixed';
  container.style.bottom = '1.25rem';
  container.style.right = '1.25rem';
  container.style.zIndex = '999999';
  document.body.appendChild(container);
  return container;
};

const sendCaptureMessage = async () => {
  try {
    const payload = await captureContext();
    chrome.runtime.sendMessage({ type: 'CAPTURE_TRIGGERED', payload });
  } catch (error) {
    console.error('Capture failed', error);
  }
};

const ContentHost: React.FC = () => {
  const [status, setStatus] = useState<CaptureStatus>('idle');

  const triggerCapture = useCallback(async () => {
    setStatus('captured');
    await sendCaptureMessage();
    setTimeout(() => setStatus('idle'), 900);
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const isCaptureHotkey =
        (event.altKey && event.key.toLowerCase() === 'c') ||
        (isMac && event.metaKey && event.shiftKey && event.key.toLowerCase() === 'y');

      if (isCaptureHotkey) {
        event.preventDefault();
        triggerCapture();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [triggerCapture]);

  return <App onCapture={triggerCapture} status={status} />;
};

const root = createRoot(ensureContainer());
root.render(<ContentHost />);

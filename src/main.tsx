import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { rpc } from '@/bridge';
import { BootPayload } from '@/types';
import { applyThemeToDocument, loadPreferences } from '@/utils/prefs';
import { App } from '@/App';
import { QuickEdit } from '@/components/QuickEdit';

const initialPrefs = loadPreferences();
applyThemeToDocument(initialPrefs.theme, initialPrefs.accent, initialPrefs.density);

const rootEl = document.getElementById('root')!;
const mount = createRoot(rootEl);

rpc<BootPayload>('init')
  .then((boot) => {
    mount.render(
      <MotionConfig reducedMotion="user">
        {boot.quick ? <QuickEdit boot={boot} /> : <App boot={boot} />}
      </MotionConfig>
    );
  })
  .catch((err) => {
    mount.render(
      <div
        role="alert"
        className="grid h-full place-content-center bg-canvas p-8 text-center text-ink"
      >
        <h1 className="mb-2 mt-0 text-[18px] font-semibold">无法加载 Folio</h1>
        <p className="m-0 text-ink-muted">{err?.message || String(err)}</p>
      </div>
    );
  });

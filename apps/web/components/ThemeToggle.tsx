'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { palette } from '@roleup/ui-tokens';

type Theme = 'light' | 'dark';
const EVENT = 'roleup-theme-change';

function current(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  window.addEventListener(EVENT, cb);
  mq.addEventListener('change', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    mq.removeEventListener('change', cb);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, current, () => null);

  const toggle = () => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    // Keep the mobile browser bar in step with the page.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', palette[next].bg));
    try {
      localStorage.setItem('roleup-theme', next);
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="btn btn-ghost btn-sm btn-icon"
    >
      <span className="relative inline-flex h-[17px] w-[17px]">
        <Sun
          size={17}
          aria-hidden
          className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`}
        />
        <Moon
          size={17}
          aria-hidden
          className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
        />
      </span>
    </button>
  );
}

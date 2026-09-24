import {useEffect, useState} from 'react';
import {readPreference, resolve, save, watch, type Preference} from '@/lib/theme';

/** The blog's theme control: a sun/moon switch and a "use device theme" button. */
export function ThemeToggle() {
  const [preference, setPreference] = useState<Preference>(readPreference);
  const [, rerender] = useState(0);
  useEffect(() => watch(next => {
    setPreference(next);
    rerender(count => count + 1);
  }), []);
  const dark = resolve(preference) === 'dark';
  const choose = (next: Preference) => {
    save(next);
    setPreference(next);
  };
  return (
    <div className="theme-control" role="group" aria-label="Color theme">
      <button
        type="button"
        role="switch"
        className="theme-toggle"
        aria-label="Dark mode"
        aria-checked={dark}
        title="Dark mode"
        onClick={() => choose(dark ? 'light' : 'dark')}
      >
        <span className="theme-toggle-thumb" aria-hidden="true">
          <svg className="theme-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </svg>
          <svg className="theme-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
          </svg>
        </span>
      </button>
      <button
        type="button"
        className="theme-system"
        aria-label="Use device theme"
        aria-pressed={preference === 'system'}
        title="Use device theme"
        onClick={() => choose('system')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8m-4-4v4" />
        </svg>
      </button>
    </div>
  );
}

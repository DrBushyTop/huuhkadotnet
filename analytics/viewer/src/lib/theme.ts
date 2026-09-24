// Theme preference, matching the blog: light, dark, or the device setting.
// The resolved theme is written to <html data-theme>, which the CSS reads.

export type Preference = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const KEY = 'huuhka-theme';
const system = () => matchMedia('(prefers-color-scheme: dark)');

export function readPreference(): Preference {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export const resolve = (preference: Preference): Theme =>
  preference === 'system' ? (system().matches ? 'dark' : 'light') : preference;

export function apply(preference: Preference) {
  const theme = resolve(preference);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#24273a' : '#eff1f5');
}

export function save(preference: Preference) {
  try {
    if (preference === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, preference);
  } catch {}
  apply(preference);
}

/** Follows device changes while the preference is "system", and other tabs' choices. */
export function watch(onChange: (preference: Preference) => void): () => void {
  const media = system();
  const onSystem = () => {
    if (readPreference() === 'system') {
      apply('system');
      onChange('system');
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) {
      const preference = readPreference();
      apply(preference);
      onChange(preference);
    }
  };
  media.addEventListener('change', onSystem);
  addEventListener('storage', onStorage);
  return () => {
    media.removeEventListener('change', onSystem);
    removeEventListener('storage', onStorage);
  };
}

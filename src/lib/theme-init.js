// Inlined in <head> so the saved appearance applies before the first paint.
(() => {
  const key = 'huuhka-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark'].includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = valid(window.localStorage.getItem(key)); } catch {}

  function apply() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#24273a' : '#ffffff');
    document.querySelectorAll('[data-theme-toggle]').forEach(toggle => {
      toggle.setAttribute('aria-checked', String(theme === 'dark'));
    });
    document.querySelectorAll('[data-theme-system]').forEach(button => {
      button.setAttribute('aria-pressed', String(preference === 'system'));
    });
    window.dispatchEvent(new CustomEvent('themechange', {detail: {theme}}));
  }

  apply();
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = valid(event.newValue);
      apply();
    }
  });
  function choose(value) {
    preference = value;
    try {
      if (preference === 'system') window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, preference);
    } catch {}
    apply();
  }
  function mount() {
    document.querySelectorAll('[data-theme-control]').forEach(control => { control.hidden = false; });
    document.querySelectorAll('[data-theme-toggle]').forEach(toggle => {
      toggle.addEventListener('click', () => {
        choose(root.dataset.theme === 'dark' ? 'light' : 'dark');
      });
    });
    document.querySelectorAll('[data-theme-system]').forEach(button => {
      button.addEventListener('click', () => choose('system'));
    });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
})();

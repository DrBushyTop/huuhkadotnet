// Loaded in <head> before the app so the saved theme applies before the first
// paint. The CSP forbids inline scripts, so this is a same-origin file. Mirrors
// the blog's src/lib/theme-init.js and uses the same storage key.
(() => {
  const root = document.documentElement;
  let preference = 'system';
  try {
    const saved = localStorage.getItem('huuhka-theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {}
  const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#24273a' : '#eff1f5');
})();

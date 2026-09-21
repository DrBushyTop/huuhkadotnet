import {isPublicSite} from './site-integrations.ts';

export function mountComments(window: Window & typeof globalThis) {
  const {document} = window;
  const section = document.querySelector<HTMLElement>('[data-comments]');
  if (!section || section.dataset.commentsMounted) return;
  section.dataset.commentsMounted = 'true';
  const status = section.querySelector<HTMLElement>('[data-comments-status]')!;
  const container = section.querySelector<HTMLElement>('.giscus')!;
  const theme = () => document.documentElement.dataset.theme === 'dark' ? 'catppuccin_macchiato' : 'catppuccin_latte';
  window.addEventListener('themechange', () => {
    container.querySelector<HTMLIFrameElement>('iframe.giscus-frame')?.contentWindow?.postMessage(
      {giscus: {setConfig: {theme: theme()}}}, 'https://giscus.app',
    );
  });
  if (!isPublicSite(window.location)) {
    status.textContent = 'Comments are available on the published site.';
    return;
  }
  if (!section.dataset.repoId || !section.dataset.categoryId) {
    status.textContent = 'Comments are not configured yet.';
    return;
  }

  let loaded = false;
  let timeout: ReturnType<typeof setTimeout>;
  const showError = () => {
    window.clearTimeout(timeout);
    status.textContent = 'Comments could not load. You can read or join the discussion on GitHub.';
  };
  window.addEventListener('message', event => {
    const frame = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (event.origin !== 'https://giscus.app' || !frame || event.source !== frame.contentWindow) return;
    // Let the widget explain its own API/auth errors. "Discussion not found"
    // is also its normal initial state before an article's first comment.
    if (event.data?.giscus?.discussion || event.data?.giscus?.resizeHeight) {
      window.clearTimeout(timeout);
      status.textContent = '';
    }
  });
  const load = () => {
    if (loaded) return;
    loaded = true;
    status.textContent = 'Loading comments…';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    const attributes = {
      'data-repo': section.dataset.repo!,
      'data-repo-id': section.dataset.repoId!,
      'data-category': section.dataset.category!,
      'data-category-id': section.dataset.categoryId!,
      'data-mapping': 'specific',
      'data-term': section.dataset.thread!,
      'data-strict': '1',
      'data-reactions-enabled': '0',
      'data-emit-metadata': '1',
      'data-input-position': 'top',
      'data-theme': theme(),
      'data-lang': 'en',
    };
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.addEventListener('error', showError);
    timeout = window.setTimeout(showError, 15000);
    container.append(script);
  };
  if (!window.IntersectionObserver) {
    load();
    return;
  }
  const observer = new window.IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    load();
  }, {rootMargin: '300px'});
  observer.observe(section);
}

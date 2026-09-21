import {measurementId, isPublicSite} from './site-integrations.ts';

export const consentKey = 'huuhka.analytics-consent.v1';
export const consentLifetime = 180 * 24 * 60 * 60 * 1000;

function withoutQuery(value: string): string {
  try {
    const url = new URL(value);
    return url.origin + url.pathname;
  } catch { return ''; }
}

type AnalyticsWindow = Window & typeof globalThis & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export function readConsent(storage: Pick<Storage, 'getItem'>, now = Date.now()): boolean | null {
  try {
    const value = JSON.parse(storage.getItem(consentKey) || 'null');
    if (typeof value?.accepted !== 'boolean' || typeof value?.savedAt !== 'number' ||
        value.savedAt > now || now - value.savedAt >= consentLifetime) return null;
    return value.accepted;
  } catch {
    return null;
  }
}

export function clearAnalyticsCookies(document: Document, hostname: string) {
  const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0])
    .filter(name => /^(_ga($|_)|_gid$|_gat($|_))/.test(name));
  const labels = hostname.split('.');
  const domains = ['', ...labels.slice(0, -1).map((_, i) => labels.slice(i).join('.'))];
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`;
    }
  }
}

export function createAnalytics(window: AnalyticsWindow) {
  const {document} = window;
  let initialized = false;
  let pageViewSent = false;
  const disableKey = `ga-disable-${measurementId}`;
  const flags = window as unknown as Record<string, unknown>;
  flags[disableKey] = true;

  function gtag(..._args: unknown[]) {
    window.dataLayer ||= [];
    // gtag expects an arguments object, not a nested array.
    window.dataLayer.push(arguments);
  }

  function apply(accepted: boolean) {
    const enabled = accepted && isPublicSite(window.location);
    flags[disableKey] = !enabled;
    if (!enabled) {
      clearAnalyticsCookies(document, window.location.hostname);
      if (initialized) gtag('consent', 'update', {analytics_storage: 'denied'});
      return;
    }

    if (!initialized) {
      initialized = true;
      window.gtag = gtag;
      gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      gtag('js', new Date());
      gtag('consent', 'update', {analytics_storage: 'granted'});
      gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_expires: consentLifetime / 1000,
        // Search terms, hashes and giscus authentication tokens stay out of GA.
        page_location: window.location.origin + window.location.pathname,
        page_referrer: withoutQuery(document.referrer),
      });
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.append(script);
    } else {
      gtag('consent', 'update', {analytics_storage: 'granted'});
    }
    if (!pageViewSent) {
      gtag('event', 'page_view', {
        send_to: measurementId,
        page_location: window.location.origin + window.location.pathname,
        page_title: document.title,
      });
      pageViewSent = true;
    }
  }

  return {apply};
}

export function mountAnalytics(window: AnalyticsWindow) {
  const {document} = window;
  const panel = document.querySelector<HTMLElement>('#analytics-preferences');
  const settings = document.querySelector<HTMLButtonElement>('[data-privacy-settings]');
  if (!panel || !settings) return;
  const close = panel.querySelector<HTMLButtonElement>('[data-consent-close]')!;
  const status = panel.querySelector<HTMLElement>('[data-consent-status]')!;
  const analytics = createAnalytics(window);
  let accepted: boolean | null = null;
  try { accepted = readConsent(window.localStorage); } catch { /* Storage can be blocked. */ }

  function render() {
    status.textContent = !isPublicSite(window.location) ? 'Analytics is disabled on this preview.' :
      accepted === true ? 'Analytics is currently on.' : 'Analytics is currently off.';
    close.hidden = accepted === null;
  }
  render();
  analytics.apply(accepted === true);
  panel.hidden = accepted !== null;
  settings.hidden = false;

  settings.addEventListener('click', () => {
    render();
    panel.hidden = false;
    panel.querySelector<HTMLButtonElement>('[data-consent]')?.focus({preventScroll: true});
  });
  close.addEventListener('click', () => {
    panel.hidden = true;
    settings.focus({preventScroll: true});
  });
  panel.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(button => {
    button.addEventListener('click', () => {
      accepted = button.dataset.consent === 'accept';
      try {
        window.localStorage.setItem(consentKey, JSON.stringify({accepted, savedAt: Date.now()}));
      } catch { /* Honor this choice for the current page even when it cannot be saved. */ }
      analytics.apply(accepted);
      render();
      panel.hidden = true;
      settings.focus({preventScroll: true});
    });
  });
  window.addEventListener('storage', event => {
    if (event.key !== consentKey && event.key !== null) return;
    try { accepted = readConsent(window.localStorage); } catch { accepted = null; }
    analytics.apply(accepted === true);
    render();
    panel.hidden = accepted !== null;
  });
}

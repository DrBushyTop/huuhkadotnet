import {isPublicSite, publicHostnames, umamiWebsiteId} from './site-integrations.ts';

export function mountAnalytics(window: Window) {
  const {document, navigator} = window;
  if (!isPublicSite(window.location) || navigator.doNotTrack === '1' ||
      navigator.doNotTrack === 'yes' || document.querySelector('script[data-website-id]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://cloud.umami.is/script.js';
  script.setAttribute('data-website-id', umamiWebsiteId);
  script.setAttribute('data-domains', publicHostnames.join(','));
  script.setAttribute('data-do-not-track', 'true');
  // Keep search terms and giscus authentication tokens out of URLs and referrers.
  script.setAttribute('data-exclude-search', 'true');
  script.setAttribute('data-exclude-hash', 'true');
  document.head.append(script);
}

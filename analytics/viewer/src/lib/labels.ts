// Human labels for raw Umami values.

const regions = new Intl.DisplayNames(['en'], {type: 'region'});
const languages = new Intl.DisplayNames(['en'], {type: 'language'});

export function countryName(code: string): string {
  if (!code) return 'Unknown';
  try {
    return regions.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function languageName(code: string): string {
  if (!code) return 'Unknown';
  try {
    return languages.of(code) ?? code;
  } catch {
    return code;
  }
}

// Umami's browser identifiers, from its client-side detection.
const browsers: Record<string, string> = {
  android: 'Android', aol: 'AOL', bb10: 'BlackBerry 10', beaker: 'Beaker', 'chromium-webview': 'Chrome (webview)',
  chrome: 'Chrome', crios: 'Chrome (iOS)', curl: 'Curl', edge: 'Edge', 'edge-chromium': 'Edge', 'edge-ios': 'Edge (iOS)',
  facebook: 'Facebook', firefox: 'Firefox', fxios: 'Firefox (iOS)', ie: 'Internet Explorer', instagram: 'Instagram',
  ios: 'Safari (iOS)', 'ios-webview': 'Safari (webview)', kakaotalk: 'KakaoTalk', miui: 'MIUI', opera: 'Opera',
  'opera-mini': 'Opera Mini', phantomjs: 'PhantomJS', safari: 'Safari', samsung: 'Samsung', searchbot: 'Searchbot',
  silk: 'Silk', yandexbrowser: 'Yandex',
};

export const browserName = (value: string) => browsers[value] ?? (value || 'Unknown');

export const deviceName = (value: string) => value ? value[0].toUpperCase() + value.slice(1) : 'Unknown';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const hourName = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

// Channel grouping, close to Umami's and GA's default channel definitions.
const search = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|startpage|qwant|kagi|naver|seznam|brave|search\.brave|yep|mojeek)\.[a-z.]+$/;
const social = /(^|\.)(facebook|fb|instagram|linkedin|lnkd|t|x|twitter|reddit|news\.ycombinator|ycombinator|mastodon|bsky|threads|youtube|tiktok|pinterest|tumblr|discord|slack|telegram|whatsapp|lobste|dev|medium|hashnode|substack)\.[a-z.]+$/;
const ai = /(^|\.)(chatgpt|openai|perplexity|claude|gemini|copilot\.microsoft|you|phind|poe|deepseek|mistral)\.[a-z.]+$/;
const email = /(^|\.)(mail\.|outlook\.|gmail\.|webmail|proton)/;

export function channelOf(referrer: string, medium: string, source: string): string {
  const m = medium.toLowerCase();
  if (/^(cpc|ppc|paid|paidsearch|display|cpm)/.test(m)) return 'Paid';
  if (m === 'email' || m === 'newsletter' || email.test(referrer)) return 'Email';
  if (!referrer && !source && m !== 'ai-assistant') return 'Direct';
  const host = referrer || source.toLowerCase();
  if (m === 'ai-assistant' || ai.test(host)) return 'AI assistants';
  if (search.test(host) || m === 'organic') return 'Organic search';
  if (social.test(host) || m === 'social') return 'Organic social';
  return 'Referral';
}

/** Umami records ISO 3166-2 codes (FI-18); GA4 records names keyed as FI|Uusimaa. */
export function regionName(value: string): string {
  if (!value) return 'Unknown';
  if (value.includes('|')) {
    const [country, name] = value.split('|');
    return `${name} · ${countryName(country)}`;
  }
  const country = value.split('-')[0];
  return `${value} · ${countryName(country)}`;
}

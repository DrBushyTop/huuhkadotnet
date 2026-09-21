import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

export function imageUrl(value, mediaBaseUrl) {
  const prefix = 'https://www.huuhka.net';
  const path = value.startsWith(`${prefix}/images/`) ? value.slice(prefix.length) : value;
  return path.startsWith('/images/') ? `${mediaBaseUrl}${path.slice('/images'.length)}` : value;
}

export function rewriteHtml(html, mediaBaseUrl, indexable) {
  const {document} = parseHTML(html);
  for (const node of document.querySelectorAll('[src], [href], [poster], meta[content]')) {
    for (const attribute of ['src', 'href', 'poster', 'content']) {
      const value = node.getAttribute(attribute);
      if (value) node.setAttribute(attribute, imageUrl(value, mediaBaseUrl));
    }
  }
  for (const node of document.querySelectorAll('[srcset]')) {
    node.setAttribute('srcset', node.getAttribute('srcset').replace(
      /(^|,\s*)(\S+)/g, (_, separator, url) => separator + imageUrl(url, mediaBaseUrl),
    ));
  }
  for (const script of document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]')) {
    const value = JSON.parse(script.textContent, (_, value) => typeof value === 'string' ? imageUrl(value, mediaBaseUrl) : value);
    script.textContent = JSON.stringify(value).replaceAll('<', '\\u003c');
  }
  if (indexable) document.querySelector('meta[name="robots"]')?.remove();
  return document.toString();
}

export function prepare({source = 'dist', target = '.deployment', mediaBaseUrl, indexable = false} = {}) {
  const base = new URL(mediaBaseUrl);
  if (base.protocol !== 'https:' || base.search || base.hash || base.username || base.password) {
    throw new Error('MEDIA_BASE_URL must be an HTTPS container URL without credentials or query parameters.');
  }
  mediaBaseUrl = base.href.replace(/\/$/, '');
  if (!existsSync(join(source, 'index.html'))) throw new Error('Run npm run build first.');
  rmSync(target, {recursive: true, force: true});
  mkdirSync(target, {recursive: true});
  const site = join(target, 'site');
  cpSync(source, site, {recursive: true});
  cpSync(join(source, 'images'), join(target, 'images'), {
    recursive: true, filter: path => !path.endsWith('.json'),
  });
  rmSync(join(site, 'images'), {recursive: true});
  const routes = [];
  for (const file of readdirSync(site, {recursive: true}).filter(file => file.endsWith('.html'))) {
    const path = join(site, file);
    const html = readFileSync(path, 'utf8');
    if (file.endsWith('/amp/index.html')) {
      const slug = file.slice(0, -'/amp/index.html'.length);
      routes.push({route: `/${slug}/amp/index.html`, redirect: `/${slug}/`, statusCode: 301});
    }
    writeFileSync(path, rewriteHtml(html, mediaBaseUrl, indexable));
  }
  // Give the extensionless Astro feed an XML filename for the host's MIME handling.
  cpSync(join(site, 'rss'), join(site, 'feed.xml'));
  rmSync(join(site, 'rss'));
  routes.push({route: '/rss', rewrite: '/feed.xml', headers: {'Content-Type': 'application/rss+xml; charset=utf-8'}});
  const config = {
    routes,
    responseOverrides: {'404': {rewrite: '/404.html', statusCode: 404}},
    globalHeaders: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...(!indexable ? {'X-Robots-Tag': 'noindex, nofollow'} : {}),
    },
    mimeTypes: {'.xml': 'application/xml', '.webp': 'image/webp'},
    trailingSlash: 'always',
  };
  const configJson = JSON.stringify(config);
  if (Buffer.byteLength(configJson) > 20 * 1024) throw new Error('Static Web Apps configuration exceeds 20 KB.');
  writeFileSync(join(site, 'staticwebapp.config.json'), configJson);
  writeFileSync(join(site, 'robots.txt'), indexable ? 'User-agent: *\nAllow: /\nSitemap: https://www.huuhka.net/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n');
  console.log(`Prepared ${site}; images upload separately to ${mediaBaseUrl}. Indexing: ${indexable}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  prepare({mediaBaseUrl: process.env.MEDIA_BASE_URL, indexable: process.env.SITE_INDEXABLE === 'true'});
}

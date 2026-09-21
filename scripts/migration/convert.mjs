// Adapted from Jussi Roine's astro-formatter, ISC, commit
// 8faff4fc188b903255e682f6bc55063f5c081ba5. See docs/migration.md.
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { parseHTML } from 'linkedom';
import YAML from 'yaml';

export const origin = 'https://www.huuhka.net';
export function localLink(value) {
  if (!value || value.startsWith('#')) return value;
  const url = new URL(value.replaceAll('__GHOST_URL__', origin), origin);
  if (['huuhka.net', 'www.huuhka.net'].includes(url.hostname)) {
    url.searchParams.delete('ref');
    return `${url.pathname}${url.search}${url.hash}`;
  }
  return url.href;
}
export function buildFrontMatter(post, image, tags) {
  if (!post.slug || !post.published_at || !post.html) throw new Error(`Incomplete post: ${post.slug}`);
  return {
    title: post.title, slug: post.slug,
    publishedAt: post.published_at, updatedAt: post.updated_at,
    description: post.custom_excerpt || post.meta_description || post.excerpt || post.title,
    tags: tags.map(t => t.name), tagSlugs: tags.map(t => t.slug),
    image: image || undefined, imageAlt: post.feature_image_alt || '',
    imageCaption: post.feature_image_caption || undefined,
    draft: false, featured: post.featured || false,
    canonicalUrl: post.canonical_url || undefined,
    seoTitle: post.meta_title || undefined, seoDescription: post.meta_description || undefined,
    ogTitle: post.og_title || undefined, ogDescription: post.og_description || undefined,
    ogImage: post.og_image || undefined,
    twitterTitle: post.twitter_title || undefined, twitterDescription: post.twitter_description || undefined,
    twitterImage: post.twitter_image || undefined,
  };
}
export function buildContent(html) {
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
  turndown.use(gfm);
  const originalEscape = turndown.escape.bind(turndown);
  turndown.escape = text => originalEscape(text).replaceAll('{', '&#123;').replaceAll('}', '&#125;').replaceAll('<', '&lt;');
  turndown.addRule('fenced-code-with-language', {
    filter: 'pre',
    replacement: (_, node) => {
      const code = node.querySelector('code') || node;
      const language = (code.getAttribute('class') || '').match(/language-([^\s]+)/)?.[1] || '';
      const text = code.textContent.replace(/\n$/, '');
      const maxTicks = Math.max(2, ...[...text.matchAll(/`+/g)].map(m => m[0].length));
      const fence = '`'.repeat(maxTicks + 1);
      return `\n\n${fence}${language}\n${text}\n${fence}\n\n`;
    },
  });
  turndown.addRule('original-heading-anchors', {
    filter: ['h1','h2','h3','h4','h5','h6'],
    replacement: (content, node) => {
      const id = node.getAttribute('id');
      const anchor = id ? `<a id=${JSON.stringify(id)} />\n\n` : '';
      return `\n\n${anchor}${'#'.repeat(Number(node.nodeName[1]))} ${content}\n\n`;
    },
  });
  turndown.addRule('callout', { filter: node => node.nodeName === 'DIV' && node.classList.contains('kg-callout-card'), replacement: content => '\n\n' + content.trim().split('\n').map(line => '> ' + line).join('\n') + '\n\n' });
  turndown.addRule('captions', { filter: 'figcaption', replacement: content => `\n\n<figcaption>\n\n${content}\n\n</figcaption>\n\n` });
  turndown.addRule('video', {
    filter: 'iframe',
    replacement: (_, node) => {
      const src = node.getAttribute('src');
      if (!src?.startsWith('https://www.youtube.com/embed/')) throw new Error(`Review embed: ${src}`);
      return `\n\n<iframe src=${JSON.stringify(src)} title="Embedded presentation video" loading="lazy" allowFullScreen />\n\n`;
    },
  });
  // Ghost bookmark wrappers otherwise concatenate the title and description.
  turndown.addRule('bookmark', {
    filter: node => node.nodeName === 'FIGURE' && node.classList.contains('kg-bookmark-card'),
    replacement: (_, node) => {
      const a = node.querySelector('a');
      const title = node.querySelector('.kg-bookmark-title')?.textContent || a.href;
      const description = node.querySelector('.kg-bookmark-description')?.textContent;
      return `\n\n[${turndown.escape(title)}](${a.getAttribute('href')})${description ? `\n\n${turndown.escape(description)}` : ''}\n\n`;
    },
  });
  return turndown.turndown(html).trim() + '\n';
}
export function documentFor(html) {
  return parseHTML(`<html><body>${html}</body></html>`).document;
}
export function mdx(frontmatter, body) { return `---\n${YAML.stringify(frontmatter, { defaultStringType: 'QUOTE_DOUBLE', defaultKeyType: 'PLAIN' })}---\n\n${body}`; }

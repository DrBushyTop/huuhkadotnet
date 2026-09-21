import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeContent from './scripts/rehype-content.mjs';
import { lightCodeTheme, darkCodeTheme } from './scripts/code-themes.mjs';
import { readFileSync, existsSync } from 'node:fs';
const inventory = existsSync('migration/inventory.json') ? JSON.parse(readFileSync('migration/inventory.json','utf8')) : [];
const redirects = Object.fromEntries(inventory.map(post => [`/${post.slug}/amp`, {destination:`/${post.slug}/`,status:301}]));
export default defineConfig({
  site:'https://www.huuhka.net', trailingSlash:'always',
  integrations:[mdx()],
  // Fuse ships native ESM. Serve it directly in dev so a stale optimizer cache
  // cannot disable both homepage search and progressive article loading.
  vite:{optimizeDeps:{exclude:['fuse.js']}},
  redirects,
  markdown: { shikiConfig:{themes:{light:lightCodeTheme,dark:darkCodeTheme}, defaultColor:false, langAlias:{'YAML':'yaml',pwsh:'powershell'}}, processor:unified({rehypePlugins:[rehypeContent],smartypants:false}) },
  server:{host:'127.0.0.1',port:4321,allowedHosts:['m1.saiga-bleak.ts.net']},
  devToolbar:{enabled:false},
});

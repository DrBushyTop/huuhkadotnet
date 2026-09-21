import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeContent from './scripts/rehype-content.mjs';
import { readFileSync, existsSync } from 'node:fs';
const inventory = existsSync('migration/inventory.json') ? JSON.parse(readFileSync('migration/inventory.json','utf8')) : [];
const redirects = Object.fromEntries(inventory.map(post => [`/${post.slug}/amp`, {destination:`/${post.slug}/`,status:301}]));
export default defineConfig({
  site:'https://www.huuhka.net', trailingSlash:'always',
  integrations:[mdx()],
  redirects,
  markdown: { shikiConfig:{theme:'github-light', langAlias:{'YAML':'yaml',pwsh:'powershell'}}, processor:unified({rehypePlugins:[rehypeContent],smartypants:false}) },
  server:{host:'127.0.0.1',port:4321,allowedHosts:['m1.saiga-bleak.ts.net']},
  devToolbar:{enabled:false},
});

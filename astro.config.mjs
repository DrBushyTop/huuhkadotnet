import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeContent from './scripts/rehype-content.mjs';
import { lightCodeTheme, darkCodeTheme } from './scripts/code-themes.mjs';
import redirects from './src/data/redirects.json' with {type:'json'};
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

import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.huuhka.net',
  server: {
    host: '127.0.0.1',
    port: 4321,
    allowedHosts: ['m1.saiga-bleak.ts.net'],
  },
  devToolbar: { enabled: false },
});

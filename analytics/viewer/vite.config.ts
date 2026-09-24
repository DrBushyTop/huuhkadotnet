import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';

// In development, serve reports built locally in ../.output as /data/*.json.
const output = fileURLToPath(new URL('../.output/', import.meta.url));
const devData: Plugin = {
  name: 'dev-data',
  configureServer(server) {
    server.middlewares.use('/data', (request, response) => {
      const name = request.url?.replace(/^\//, '').split('?')[0] ?? '';
      const file = `${output}${name}`;
      if (!/^[a-z0-9-]+\.json$/.test(name) || !existsSync(file)) {
        response.statusCode = 404;
        response.end('Run npm run build:report or npm run import:ga4 in analytics/ first.');
        return;
      }
      response.setHeader('Content-Type', 'application/json');
      response.end(readFileSync(file));
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), devData],
  resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
  build: {
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {input: {main: 'index.html', redirect: 'redirect.html'}},
  },
});

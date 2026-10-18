import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import transcriptHandler from './api/transcript.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.APIFY_API_TOKEN = env.APIFY_API_TOKEN;
  process.env.APIFY_ACTOR_ID = env.APIFY_ACTOR_ID;
  return {
  plugins: [
    react(),
    {
      name: 'local-transcript-api',
      configureServer(server) {
        server.middlewares.use('/api/transcript', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          let raw = '';
          for await (const chunk of req) raw += chunk;
          const body = raw ? JSON.parse(raw) : {};
          const response = {
            statusCode: 200,
            headers: {},
            status(code) { this.statusCode = code; return this; },
            json(payload) { res.statusCode = this.statusCode; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(payload)); }
          };
          await transcriptHandler({ method: req.method, body }, response);
        });
      }
    }
  ]
  };
});

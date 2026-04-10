import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import deepseekHandler from './api/deepseek.js';

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function devApiBridge() {
  return {
    name: 'dev-api-bridge',
    configureServer(server) {
      server.middlewares.use('/api/deepseek', async (req, res, next) => {
        if (!req.url?.startsWith('/')) {
          next();
          return;
        }

        try {
          req.body = await readRequestBody(req);
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (payload) => {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
            }
            res.end(JSON.stringify(payload));
            return res;
          };
          await deepseekHandler(req, res);
        } catch (error) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          }
          res.end(JSON.stringify({ error: error?.message || 'Dev API bridge failed' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiBridge()],
});

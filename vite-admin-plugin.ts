import type { Plugin } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.resolve(process.cwd(), 'src/data/mcu-data.json');
const API_PATH = '/api/mcu-data';

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

// Dev-only backend for the /admin editor: reads and writes the MCU dataset
// straight to disk on the machine running `vite dev`. `apply: 'serve'` keeps
// this out of the production build entirely — a deployed static site has no
// server to run this middleware, so there's nothing there to exploit; the
// "auth" is simply having a checkout of this repo and running it locally.
export function mcuAdminApiPlugin(): Plugin {
  return {
    name: 'mcu-admin-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(API_PATH, async (req, res) => {
        if (req.method === 'GET') {
          try {
            const text = await readFile(DATA_PATH, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(text);
          } catch (err) {
            res.statusCode = 500;
            res.end(err instanceof Error ? err.message : String(err));
          }
          return;
        }

        if (req.method === 'POST') {
          try {
            const body = await readBody(req);
            const data = JSON.parse(body);
            if (!data || !Array.isArray(data.phases) || !Array.isArray(data.entries)) {
              throw new Error('Payload must have "phases" and "entries" arrays.');
            }
            await writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 400;
            res.end(err instanceof Error ? err.message : String(err));
          }
          return;
        }

        res.statusCode = 405;
        res.end('Method not allowed');
      });
    },
  };
}

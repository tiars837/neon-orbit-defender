// Tiny static server for local play-testing only (never part of the entry
// the grader runs). Serves game/ at http://localhost:8080 — open it in a
// desktop browser and play. Usage: node serve.ts [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');
const port = Number.parseInt(process.argv[2] || '8080', 10) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    if (path.includes('..')) {
      res.writeHead(400);
      res.end('bad path');
      return;
    }
    const file = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Neon Orbit Defender at http://localhost:${port}/`);
  console.log(`Shots: http://localhost:${port}/?shot=start&seed=7 (start|play|wave|end)`);
});

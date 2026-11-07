// npm run dev → http://localhost:8765 (another port: npm run dev -- 8766)
//
// A tiny web server for working on the site on your own computer.
// It needs no packages. It puts the site together the same way the
// Pages workflow does online (.github/workflows/pages.yml):
//   this folder        → /
//   ../database/       → /database/   (the site's data, one folder up)
// Every file is sent fresh (no caching), so a refresh always shows your edit.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] || process.env.PORT) || 8765;
const SITE = fileURLToPath(new URL('./', import.meta.url));
const DATABASE = fileURLToPath(new URL('../database/', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const server = createServer(async (req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad address');
    return;
  }
  const [root, rest] = path.startsWith('/database/')
    ? [DATABASE, path.slice('/database/'.length)]
    : [SITE, path.slice(1)];
  const file = normalize(join(root, rest.endsWith('/') || rest === '' ? rest + 'index.html' : rest));
  if (!file.startsWith(root)) {          // "../" tricks stay inside the two folders
    res.writeHead(403).end('Not allowed');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Not found: ${path}`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try another one: npm run dev -- ${PORT + 1}`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

server.listen(PORT, 'localhost', () => {
  console.log(`Campus Compass is running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});

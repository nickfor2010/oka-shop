// OKA Shop — Node.js host (local development and tests). Cloudflare uses src/worker.js; both share src/app.js.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './src/app.js';
import { openNodeDb, openPhotoDir } from './src/node-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

export function createServer({ dataDir = process.env.DATA_DIR || path.join(__dirname, 'data'), env = process.env, fetchImpl } = {}) {
  const db = openNodeDb(dataDir);
  const line = { loginChannelId: env.LINE_LOGIN_CHANNEL_ID, loginChannelSecret: env.LINE_LOGIN_CHANNEL_SECRET, messagingToken: env.LINE_MESSAGING_TOKEN };
  const app = createApp({
    db, photos: openPhotoDir(path.join(dataDir, 'photos')), timezone: env.APP_TIMEZONE || 'Asia/Taipei', adminPassword: env.ADMIN_PASSWORD || 'oka-admin',
    line, devLogin: env.DEV_LOGIN !== '0', fetchImpl,
  });
  const pending = new Set();
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined;
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const request = new Request(`${proto}://${req.headers.host || 'localhost'}${req.url}`, { method: req.method, headers: req.headers, body });
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
      const defer = (p) => { const t = p.catch((e) => console.error(e)).finally(() => pending.delete(t)); pending.add(t); };
      const response = await app.handle(request, { ip, defer });
      if (response) {
        res.writeHead(response.status, Object.fromEntries(response.headers));
        return res.end(Buffer.from(await response.arrayBuffer()));
      }
      serveStatic(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) { res.writeHead(500); res.end('Server error'); }
    }
  });
  // Tests wait for LINE messages that are sent after the response.
  const settle = () => Promise.all([...pending]);
  return { server, app, db, settle };
}

function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pathname === '/') pathname = '/index.html';
  if (/^\/[a-z0-9-]+\/?$/.test(pathname) && fs.existsSync(path.join(PUBLIC_DIR, pathname.replace(/\/$/, '') + '.html'))) pathname = pathname.replace(/\/$/, '') + '.html'; // same short URLs as Cloudflare
  const file = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return fs.createReadStream(path.join(PUBLIC_DIR, '404.html')).pipe(res); }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const { server, app } = createServer();
  await app.ready();
  server.listen(port, () => console.log(`[oka] Shop on http://localhost:${port}  (admin: /admin, first password: ${process.env.ADMIN_PASSWORD ? 'from ADMIN_PASSWORD' : 'oka-admin'})`));
}

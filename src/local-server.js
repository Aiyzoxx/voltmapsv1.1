const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3007;
const ROOT = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const KEYS_FILE = path.join(DATA_DIR, 'cheat-keys.json');
const BINDINGS_FILE = path.join(DATA_DIR, 'cheat-bindings.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJSON(res, status, obj) {
  send(res, status, JSON.stringify(obj), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
}

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSONAtomic(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function readBody(req, max = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function resolveSafe(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const normalized = path.normalize(decoded).replace(/^([\\/])+/, '');
  const full = path.join(ROOT, normalized);
  if (!full.startsWith(ROOT)) return null;
  return full;
}

async function handleVerify(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return sendJSON(res, 400, { success: false, error: 'Invalid JSON' });
  }

  const key = typeof body.key === 'string' ? body.key.trim().toUpperCase() : '';
  const hwid = typeof body.hwid === 'string' ? body.hwid.trim() : '';
  const mapType = typeof body.mapType === 'string' ? body.mapType.trim() : '';

  if (!key || !hwid || !mapType) {
    return sendJSON(res, 400, { success: false, error: 'Missing fields' });
  }

  const keys = readJSON(KEYS_FILE, null);
  if (!keys || !Array.isArray(keys[mapType])) {
    return sendJSON(res, 500, { success: false, error: 'Keys not configured' });
  }

  if (!keys[mapType].includes(key)) {
    return sendJSON(res, 403, { success: false, error: 'Invalid key' });
  }

  const bindings = readJSON(BINDINGS_FILE, {});
  const existing = bindings[key];

  if (existing) {
    if (existing.hwid === hwid) {
      return sendJSON(res, 200, { success: true, bound: true });
    }
    return sendJSON(res, 403, {
      success: false,
      error: 'Key already bound to another device',
    });
  }

  bindings[key] = {
    hwid,
    mapType,
    boundAt: new Date().toISOString(),
  };
  try {
    writeJSONAtomic(BINDINGS_FILE, bindings);
  } catch (e) {
    return sendJSON(res, 500, { success: false, error: 'Persist failed' });
  }

  return sendJSON(res, 200, { success: true, bound: false });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/verify') {
    return handleVerify(req, res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed');
  }

  let target = resolveSafe(req.url || '/');
  if (!target) return send(res, 403, 'Forbidden');

  fs.stat(target, (err, stat) => {
    if (err) {
      const htmlFallback = target + '.html';
      return fs.stat(htmlFallback, (err2, stat2) => {
        if (err2 || !stat2.isFile()) return send(res, 404, 'Not Found');
        stream(htmlFallback, res);
      });
    }
    if (stat.isDirectory()) {
      const indexFile = path.join(target, 'index.html');
      return fs.stat(indexFile, (err3, stat3) => {
        if (err3 || !stat3.isFile()) return send(res, 404, 'Not Found');
        stream(indexFile, res);
      });
    }
    stream(target, res);
  });
});

function stream(file, res) {
  const ext = path.extname(file).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving ${ROOT} -> http://localhost:${PORT}`);
  console.log(`Keys: ${KEYS_FILE}`);
  console.log(`Bindings: ${BINDINGS_FILE}`);
});

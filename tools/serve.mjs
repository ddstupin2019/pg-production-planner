import { createServer } from 'node:http';
import console from 'node:console';
import process from 'node:process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPath, readPinnedFile } from './files.mjs';

const workspace = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const root = path.join(workspace, 'dist');
if (!(await inspectPath(workspace, root)).isDirectory()) {
  throw new Error('Run npm run build first');
}

/** @type {Record<string, string>} */
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const server = createServer((request, response) => {
  void (async () => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const pathname = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/');
      if (
        !pathname.startsWith('/') ||
        pathname.includes('\\') ||
        pathname.includes('\0') ||
        pathname.split('/').some((part) => part === '..' || part === '.' || part.includes(':'))
      ) {
        response.writeHead(400).end();
        return;
      }
      let target = path.join(root, pathname === '/' ? 'index.html' : pathname);
      const stat = await inspectPath(root, target);
      if (stat.isDirectory()) target = path.join(target, 'index.html');
      const { bytes } = await readPinnedFile(root, target);
      response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(target)] ?? 'application/octet-stream',
        'Content-Length': bytes.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(404).end();
    }
  })().catch(() => {
    response.destroy();
  });
});

// A fixed loopback endpoint, no fallback port and no CLI root/path override.
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(4173, '127.0.0.1', () => {
  console.log('Production files: http://127.0.0.1:4173');
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close();
  });
}

// Local-only production-build integration harness. No browser dependency and no disk fixtures.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve('dist');
const tests = resolve('tests/browser');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4174');
  let file;
  let instrument = false;
  if (url.pathname === '/__qa/frame') { file = resolve(root, 'index.html'); instrument = true; }
  else if (url.pathname === '/__qa/') file = resolve(tests, 'index.html');
  else if (url.pathname === '/__qa/diagnostics.js') file = resolve(tests, 'diagnostics.js');
  else if (url.pathname.startsWith('/test_3js/')) {
    const relative = decodeURIComponent(url.pathname.slice('/test_3js/'.length));
    file = resolve(root, relative || 'index.html');
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  } else { res.writeHead(404).end(); return; }
  try {
    let content = await readFile(file);
    if (instrument) content = Buffer.from(content.toString().replace('<head>', '<head><script src="/__qa/diagnostics.js"></script>'));
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(404).end(); }
});
server.listen(4174, '127.0.0.1', () => console.log('Production QA: http://localhost:4174/__qa/'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());

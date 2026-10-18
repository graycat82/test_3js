import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('home screen manifest and icons resolve inside the GitHub Pages project scope', async () => {
  const base = new URL('https://graycat82.github.io/test_3js/manifest.webmanifest');
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(new URL(manifest.scope, base).pathname, '/test_3js/');
  assert.equal(new URL(manifest.start_url, base).pathname, '/test_3js/');
  assert.equal(manifest.display, 'standalone');
  for (const icon of [...manifest.icons, { src: 'icons/calculator-180.png', sizes: '180x180' }]) {
    assert.ok(new URL(icon.src, base).pathname.startsWith('/test_3js/icons/'));
    const png = await readFile(new URL('../public/' + icon.src, import.meta.url));
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
});

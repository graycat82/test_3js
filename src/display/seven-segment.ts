const GLYPHS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
  '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  '−': 'g', '-': 'g', 'E': 'adefg', 'e': 'adefg', 'r': 'eg', 'o': 'cdeg',
};
const SEGMENTS: Record<string, [number, number, number, boolean]> = {
  a: [6, 0, 52, true], b: [56, 7, 46, false], c: [56, 59, 46, false],
  d: [6, 104, 52, true], e: [0, 59, 46, false], f: [0, 7, 46, false], g: [6, 52, 52, true],
};

function strip(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, horizontal: boolean) {
  const points = horizontal
    ? [[x + 4, y], [x + length - 4, y], [x + length, y + 4], [x + length - 4, y + 8], [x + 4, y + 8], [x, y + 4]]
    : [[x, y + 4], [x + 4, y], [x + 8, y + 4], [x + 8, y + length - 4], [x + 4, y + length], [x, y + length - 4]];
  ctx.beginPath();
  points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  ctx.closePath();
  ctx.fill();
}

/** Polygon segments keep calculator digits independent of device font rendering. */
export function drawSevenSegment(ctx: CanvasRenderingContext2D, value: string, right: number, top: number, width: number, height: number) {
  const advance = (char: string) => char === '.' ? 18 : 80;
  const units = [...value].reduce((sum, char) => sum + advance(char), 0);
  const scale = Math.min(height / 112, width / Math.max(units, 8 * 80));
  ctx.save();
  ctx.translate(right - units * scale, top + (height - 112 * scale) / 2);
  ctx.scale(scale, scale);
  for (const char of value) {
    if (char === '.') {
      ctx.fillStyle = '#243b2b';
      ctx.beginPath(); ctx.arc(5, 107, 5, 0, Math.PI * 2); ctx.fill();
    } else if (char === '+') {
      ctx.fillStyle = '#243b2b';
      strip(ctx, 6, 52, 52, true);
      strip(ctx, 28, 32, 48, false);
    } else {
      const active = GLYPHS[char] ?? '';
      for (const [name, [x, y, length, horizontal]] of Object.entries(SEGMENTS)) {
        ctx.fillStyle = active.includes(name) ? '#243b2b' : '#9aaa91';
        strip(ctx, x, y, length, horizontal);
      }
    }
    ctx.translate(advance(char), 0);
  }
  ctx.restore();
}

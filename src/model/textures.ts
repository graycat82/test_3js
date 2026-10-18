import { CanvasTexture, SRGBColorSpace } from 'three';
import type { RegisterTextures } from './register.ts';
import { FUNCTION_KEYS, KEY_ROWS } from './layout.ts';
import atlasUrl from '../assets/sticker-atlas.webp';

function texture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  draw(ctx);
  const result = new CanvasTexture(canvas);
  result.colorSpace = SRGBColorSpace;
  return result;
}

/** Photo-guided restored atlas; only the derived WebP is shipped, never Pictures/. */
export async function createTextures(): Promise<RegisterTextures> {
  const image = new Image();
  image.src = atlasUrl;
  await image.decode();
  const crop = (width: number, height: number, area: number[], mask = false) => texture(width, height, ctx => {
    if (mask) {
      // The face sticker has a raised title tab; discard the white atlas corners.
      ctx.beginPath();
      ctx.scale(width, height);
      ctx.moveTo(0.32, 0.01); ctx.lineTo(0.76, 0.01);
      ctx.quadraticCurveTo(0.78, 0.01, 0.78, 0.05);
      ctx.lineTo(0.78, 0.12); ctx.quadraticCurveTo(0.78, 0.15, 0.81, 0.15);
      ctx.lineTo(0.92, 0.15); ctx.quadraticCurveTo(0.96, 0.15, 0.975, 0.25);
      ctx.lineTo(0.994, 0.93); ctx.quadraticCurveTo(0.994, 0.98, 0.97, 0.98);
      ctx.lineTo(0.03, 0.98); ctx.quadraticCurveTo(0.005, 0.98, 0.01, 0.93);
      ctx.lineTo(0.035, 0.29); ctx.quadraticCurveTo(0.05, 0.15, 0.10, 0.15);
      ctx.lineTo(0.28, 0.15); ctx.quadraticCurveTo(0.31, 0.15, 0.31, 0.12);
      ctx.lineTo(0.31, 0.05); ctx.quadraticCurveTo(0.31, 0.01, 0.32, 0.01);
      ctx.closePath(); ctx.clip();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.drawImage(image, area[0] * image.width, area[1] * image.height, area[2] * image.width, area[3] * image.height, 0, 0, width, height);
  });
  const labels = new Map<string, CanvasTexture>();
  for (const label of [...KEY_ROWS.flat(), ...FUNCTION_KEYS, 'OPEN']) {
    labels.set(label, texture(256, 192, ctx => {
      ctx.fillStyle = FUNCTION_KEYS.includes(label as typeof FUNCTION_KEYS[number]) || label === 'OPEN' ? '#a8141c' : '#004796';
      const printed = label === '.' ? '•' : label;
      ctx.font = `700 ${label.length === 1 ? 143 : label === 'OPEN' ? 66 : 87}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(printed, 128, 103);
    }));
  }
  return {
    labels,
    panel: crop(1024, 512, [0, 0, 1, 0.537], true),
    drawer: crop(1024, 256, [0, 0.542, 1, 0.208]),
    badge: crop(256, 128, [0, 0.753, 0.5, 0.247]),
  };
}

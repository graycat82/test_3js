import { CanvasTexture, SRGBColorSpace } from 'three';
import type { RegisterTextures } from './register.ts';
import { FUNCTION_KEYS, KEY_ROWS } from './layout.ts';

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

export function createTextures(): RegisterTextures {
  const labels = new Map<string, CanvasTexture>();
  for (const label of [...KEY_ROWS.flat(), ...FUNCTION_KEYS, 'OPEN']) {
    labels.set(label, texture(256, 192, ctx => {
      ctx.fillStyle = FUNCTION_KEYS.includes(label as typeof FUNCTION_KEYS[number]) || label === 'OPEN' ? '#a8141c' : '#004796';
      ctx.font = `700 ${label.length === 1 ? 143 : label === 'OPEN' ? 66 : 87}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 128, 103);
    }));
  }
  const panel = texture(1024, 512, ctx => {
    ctx.fillStyle = '#e8c553';
    ctx.beginPath(); ctx.roundRect(0, 0, 1024, 512, 35); ctx.fill();
    ctx.fillStyle = '#0c7197'; ctx.fillRect(0, 425, 1024, 87);
    ctx.fillStyle = '#004f83'; ctx.fillRect(299, 0, 500, 110);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(332 + i * 66, 104, 33, 0, Math.PI); ctx.fill();
    }
    ctx.fillStyle = '#fff0a5'; ctx.font = '900 53px Arial'; ctx.textAlign = 'center';
    ctx.fillText('ROBOCAR POLI', 550, 71);
    ctx.fillStyle = '#c1f4ed'; ctx.font = 'italic 25px Arial';
    ctx.fillText('HERE WE COME TO RESCUE YOU!', 578, 475);
    // Block graphics stand in for character artwork until the photo texture pass.
    ctx.fillStyle = '#0259b1'; ctx.beginPath(); ctx.roundRect(32, 226, 195, 180, 30); ctx.fill();
    ctx.fillStyle = '#d9f4ee'; ctx.beginPath(); ctx.roundRect(54, 250, 151, 65, 14); ctx.fill();
    ctx.fillStyle = '#fffdf0'; ctx.fillRect(47, 339, 166, 44);
    ctx.fillStyle = '#182f42';
    ctx.beginPath(); ctx.arc(76, 400, 23, 0, Math.PI * 2); ctx.arc(185, 400, 23, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe036'; ctx.fillRect(101, 216, 65, 18);
    ctx.fillStyle = '#004779'; ctx.font = 'bold 34px Arial'; ctx.fillText('P', 132, 369);
    ctx.fillStyle = '#fff4a6'; ctx.font = '30px Arial'; ctx.fillText('★', 270, 65); ctx.fillText('★', 857, 65);
  });
  const drawer = texture(1024, 128, ctx => {
    ctx.fillStyle = '#059bb8'; ctx.fillRect(0, 0, 1024, 128);
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = '#55d7db'; ctx.beginPath(); ctx.arc(i * 90, 110, 49, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#e5f7ed'; ctx.font = '900 66px Arial'; ctx.textAlign = 'center'; ctx.fillText('ROBOCAR POLI', 512, 86);
    ctx.fillStyle = '#ffdc27'; ctx.font = '35px Arial'; ctx.fillText('★', 125, 80); ctx.fillText('★', 900, 80);
  });
  const badge = texture(256, 192, ctx => {
    ctx.fillStyle = '#b04c24'; ctx.beginPath(); ctx.ellipse(128, 96, 123, 88, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f9da49'; ctx.beginPath(); ctx.moveTo(38, 41); ctx.lineTo(218, 41); ctx.lineTo(128, 178); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#066794'; ctx.beginPath(); ctx.arc(128, 83, 57, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff5dc'; ctx.font = '900 39px Arial'; ctx.textAlign = 'center'; ctx.fillText('POLI', 128, 98);
  });
  return { labels, panel, drawer, badge };
}

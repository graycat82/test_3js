import { CanvasTexture, SRGBColorSpace } from 'three';
import type { CalculatorSnapshot } from '../calculator/calculator.ts';
import { drawSevenSegment } from './seven-segment.ts';

export function createLcd() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 352;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('LCD canvas unavailable');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  let previous = '';
  function update(state: CalculatorSnapshot) {
    const signature = JSON.stringify(state);
    if (signature === previous) return;
    previous = signature;
    ctx!.fillStyle = state.powered ? '#a6b59a' : '#24372e';
    ctx!.fillRect(0, 0, canvas.width, canvas.height);
    if (state.powered) {
      ctx!.fillStyle = '#253c2d';
      drawSevenSegment(ctx!, state.display, 970, 104, 920, 205);
      ctx!.textAlign = 'right';
      ctx!.textBaseline = 'middle';
      ctx!.font = '500 43px monospace';
      ctx!.fillText(state.error ? 'ERR' : state.pending ?? '', 966, 57);
    }
    texture.needsUpdate = true;
  }
  return { texture, update };
}

import './style.css';
import { mountScene } from './scene.ts';

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const stage = document.querySelector<HTMLElement>('.stage')!;
const status = document.querySelector<HTMLElement>('#render-status')!;
const error = document.querySelector<HTMLElement>('#render-error')!;

try {
  const dispose = mountScene(viewport);
  stage.setAttribute('aria-busy', 'false');
  status.textContent = 'Three.js · 실시간 3D 모형';
  if (import.meta.hot) import.meta.hot.dispose(dispose);
} catch (cause) {
  stage.setAttribute('aria-busy', 'false');
  status.textContent = '3D 표시를 시작하지 못했습니다';
  error.textContent = '3D 모형을 표시할 수 없습니다. WebGL 2를 지원하는 최신 Safari 또는 브라우저에서 다시 열어 주세요.';
  error.hidden = false;
  console.error('Register scene initialization failed:', cause);
}

import './style.css';
import { mountScene } from './scene.ts';
import { createTextures } from './model/textures.ts';
import type { RenderStatus } from './scene.ts';

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const stage = document.querySelector<HTMLElement>('.stage')!;
const status = document.querySelector<HTMLElement>('#render-status')!;
const error = document.querySelector<HTMLElement>('#render-error')!;
const errorMessage = document.querySelector<HTMLElement>('#render-error-message')!;
const output = document.querySelector<HTMLOutputElement>('#calculator-result')!;
const toolbar = document.querySelector<HTMLElement>('#view-controls')!;
document.querySelector('#reload-page')!.addEventListener('click', () => location.reload());

function renderStatus(state: RenderStatus) {
  error.hidden = state === 'ready';
  toolbar.hidden = state !== 'ready';
  status.textContent = state === 'ready' ? 'Three.js · 실시간 3D 모형' : '3D 표시 복구 중';
  errorMessage.textContent = state === 'lost'
    ? '그래픽 표시를 복구하고 있습니다. 잠시 기다려 주세요.'
    : '그래픽 표시를 복구하지 못했습니다. 다시 열어 주세요.';
}

try {
  const textures = await createTextures();
  const scene = mountScene(viewport, textures, (state, lit) => {
    output.textContent = state.display;
    output.setAttribute('aria-label', `LCD ${state.powered ? state.display : '전원 꺼짐'}. 백라이트 ${lit ? '켜짐' : '꺼짐'}`);
  }, renderStatus);
  toolbar.hidden = false;
  toolbar.addEventListener('pointerdown', scene.cancelInput);
  const actions = { zoomIn: scene.zoomIn, zoomOut: scene.zoomOut, resetView: scene.resetView, overview: scene.overview };
  const buttons = toolbar.querySelectorAll<HTMLButtonElement>('button[data-action]');
  const listeners = [...buttons].map(button => {
    const listener = () => actions[button.dataset.action as keyof typeof actions]();
    button.addEventListener('click', listener);
    return () => button.removeEventListener('click', listener);
  });
  stage.setAttribute('aria-busy', 'false');
  status.textContent = 'Three.js · 실시간 3D 모형';
  if (import.meta.hot) import.meta.hot.dispose(() => {
    toolbar.removeEventListener('pointerdown', scene.cancelInput);
    listeners.forEach(remove => remove());
    scene.dispose();
  });
} catch (cause) {
  stage.setAttribute('aria-busy', 'false');
  status.textContent = '3D 표시를 시작하지 못했습니다';
  errorMessage.textContent = '3D 모형을 표시할 수 없습니다. 네트워크 연결과 WebGL 2를 지원하는 Safari 또는 브라우저를 확인한 뒤 다시 열어 주세요.';
  error.hidden = false;
  console.error('Register scene initialization failed:', cause);
}

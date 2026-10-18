import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRegister } from './model/register.ts';
import type { RegisterTextures } from './model/register.ts';
import { Calculator } from './calculator/calculator.ts';
import type { CalculatorSnapshot } from './calculator/calculator.ts';
import { TapGesture } from './input/tap-gesture.ts';
import { KeyPicker } from './input/picking.ts';
import { createOrbitControls } from './input/orbit-controls.ts';
import { createLcd } from './display/lcd.ts';
import { Backlight } from './display/backlight.ts';
import { KeyAnimation } from './display/key-animation.ts';

const VIEW_DIRECTIONS: Record<string, THREE.Vector3> = {
  default: new THREE.Vector3(0.78, 0.78, 1.65),
  front: new THREE.Vector3(0, 0.63, 1.8),
  back: new THREE.Vector3(-0.55, 0.65, -1.8),
  left: new THREE.Vector3(-1.8, 0.75, 0.5),
  right: new THREE.Vector3(1.8, 0.75, 0.5),
};

export interface SceneHandle {
  dispose(): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  calculatorView(): void;
  cancelInput(): void;
}

export type RenderStatus = 'ready' | 'lost' | 'restore-failed';

export function mountScene(host: HTMLElement, textures: RegisterTextures, onDisplay: (state: CalculatorSnapshot, lit: boolean) => void, onStatus: (status: RenderStatus) => void): SceneHandle {
  const surface = document.createElement('canvas');
  const context = surface.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'default' });
  if (!context) throw new Error('WebGL 2 unavailable');
  const renderer = new THREE.WebGLRenderer({ canvas: surface, context });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  function createEnvironment() {
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    try { return generator.fromScene(room, 0.04); }
    finally { room.dispose(); generator.dispose(); }
  }
  let environment = createEnvironment();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  const register = createRegister(textures);
  scene.add(register);
  const calculator = new Calculator();
  const lcd = createLcd();
  const lcdMesh = register.getObjectByName('lcd') as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  lcdMesh.material.map = lcd.texture;
  lcdMesh.material.emissiveMap = lcd.texture;
  lcdMesh.material.emissive.set('#ccffb4');
  lcdMesh.material.emissiveIntensity = 0;
  lcdMesh.material.color.set('#ffffff');
  lcdMesh.material.roughness = 0.62;
  lcdMesh.material.metalness = 0;
  lcdMesh.material.needsUpdate = true;
  lcd.update(calculator.snapshot);
  scene.add(new THREE.HemisphereLight('#f6faff', '#b1b9ad', 0.85));
  const keyLight = new THREE.DirectionalLight('#fff9eb', 2.3);
  keyLight.position.set(-5, 10, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 35 });
  keyLight.shadow.normalBias = 0.035;
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight('#e0f6ff', 1);
  fill.position.set(7, 6, -4);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#596453', opacity: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  const bounds = new THREE.Box3().setFromObject(register);
  const defaultTarget = bounds.getCenter(new THREE.Vector3());
  const allPoints: THREE.Vector3[] = [];
  const calculatorPoints: THREE.Vector3[] = [];
  register.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    const box = object.geometry.boundingBox!;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const point = new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld);
          allPoints.push(point);
          if (object.parent?.name === 'keypad' || object.parent?.name === 'display-assembly') calculatorPoints.push(point);
        }
      }
    }
  });
  const requestedView = new URLSearchParams(window.location.search).get('view') ?? 'default';
  const initialDirection = (Object.hasOwn(VIEW_DIRECTIONS, requestedView) ? VIEW_DIRECTIONS[requestedView] : VIEW_DIRECTIONS.default).clone().normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), initialDirection).normalize();
  const up = new THREE.Vector3().crossVectors(initialDirection, right).normalize();
  // Center the visible silhouette, rather than the empty corners of a world box.
  const horizontal = allPoints.map(point => point.clone().sub(defaultTarget).dot(right));
  const vertical = allPoints.map(point => point.clone().sub(defaultTarget).dot(up));
  defaultTarget.addScaledVector(right, (Math.min(...horizontal) + Math.max(...horizontal)) / 2)
    .addScaledVector(up, (Math.min(...vertical) + Math.max(...vertical)) / 2);
  camera.position.copy(defaultTarget).addScaledVector(initialDirection, 20);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D 계산대. 드래그로 회전, 두 손가락 또는 휠로 확대·축소, 계산 키를 탭해 입력');
  const controls = createOrbitControls(camera, canvas);
  controls.target.copy(defaultTarget);
  const gestures = new TapGesture();
  const picker = new KeyPicker();
  const animation = new KeyAnimation(register);
  const backlight = new Backlight();
  let referenceDistance = 0;
  let framingPoints = allPoints;
  let disposed = false;
  let contextLost = false;
  let frame = 0;
  let lastTime = 0;
  let lightTimer: ReturnType<typeof setTimeout> | undefined;
  let previouslyLit = false;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastPixelRatio = 0;
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;

  function requestRender() {
    if (!disposed && !contextLost && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }
  function draw(now: number) {
    frame = 0;
    if (disposed || contextLost || document.hidden) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 1 / 60;
    lastTime = now;
    const moving = controls.update(delta);
    const animating = animation.update(delta);
    const light = backlight.sample(now);
    clearTimeout(lightTimer);
    // Timers may wake just before the deadline; re-arm until fading really starts.
    if (light.wakeIn !== null) lightTimer = setTimeout(requestRender, Math.ceil(light.wakeIn));
    lcdMesh.material.emissiveIntensity = light.level * 0.75;
    const lit = light.level > 0;
    if (lit !== previouslyLit) { previouslyLit = lit; onDisplay(calculator.snapshot, lit); }
    renderer.render(scene, camera);
    if (moving || animating || light.fading) requestRender();
    if (!frame) lastTime = 0;
  }
  controls.addEventListener('change', requestRender);

  function fitDistance(points: THREE.Vector3[], target: THREE.Vector3, direction: THREE.Vector3) {
    const viewRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const viewUp = new THREE.Vector3().crossVectors(direction, viewRight).normalize();
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanX = tanY * camera.aspect;
    let distance = 0;
    for (const worldPoint of points) {
      const point = worldPoint.clone().sub(target);
      distance = Math.max(distance, point.dot(direction) + Math.max(Math.abs(point.dot(viewRight)) / tanX, Math.abs(point.dot(viewUp)) / tanY));
    }
    return distance * 1.04;
  }
  function settleControls() {
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
  }
  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (width === lastWidth && height === lastHeight && pixelRatio === lastPixelRatio) return;
    lastWidth = width;
    lastHeight = height;
    lastPixelRatio = pixelRatio;
    cancelInput();
    const direction = camera.position.clone().sub(controls.target).normalize();
    const zoomRatio = referenceDistance ? controls.getDistance() / referenceDistance : 1;
    settleControls();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    referenceDistance = fitDistance(framingPoints, controls.target, direction);
    controls.minDistance = referenceDistance * 0.35;
    controls.maxDistance = referenceDistance * 2.8;
    camera.position.copy(controls.target).addScaledVector(direction, referenceDistance * THREE.MathUtils.clamp(zoomRatio, 0.35, 2.8));
    controls.update();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    requestRender();
  }
  function cancelInput() {
    gestures.reset();
    animation.press(null);
    controls.disconnect();
    controls.connect(canvas);
    requestRender();
  }
  function pick(event: PointerEvent) {
    const key = picker.pick(event.clientX, event.clientY, canvas.getBoundingClientRect(), camera, register);
    return key && calculator.accepts(key) ? key : null;
  }
  function commit(key: string) {
    if (contextLost || document.hidden) return;
    if (!calculator.accepts(key)) return;
    const state = calculator.press(key);
    lcd.update(state);
    animation.pulse(key);
    clearTimeout(lightTimer);
    if (state.powered) {
      backlight.activate(performance.now());
    } else backlight.off();
    onDisplay(state, state.powered);
    requestRender();
  }
  function pointerDown(event: PointerEvent) {
    if (contextLost || document.hidden) return;
    if (event.pointerType !== 'touch' && event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    gestures.down(event.pointerId, event.clientX, event.clientY, pick(event), event.isPrimary);
    animation.press(gestures.pressedKey);
    requestRender();
  }
  function outsidePointerDown(event: PointerEvent) {
    if (event.target === canvas || event.pointerType !== 'touch' || !gestures.activeCount) return;
    gestures.down(event.pointerId, event.clientX, event.clientY, null, false);
    animation.press(null);
    requestRender();
  }
  function pointerMove(event: PointerEvent) {
    if (!gestures.isTracking(event.pointerId)) return;
    gestures.move(event.pointerId, event.clientX, event.clientY);
    animation.press(gestures.pressedKey);
    requestRender();
  }
  function pointerUp(event: PointerEvent) {
    if (!gestures.isTracking(event.pointerId)) return;
    const key = gestures.up(event.pointerId, event.clientX, event.clientY, pick(event));
    animation.press(null);
    if (key) commit(key);
    requestRender();
  }
  function pointerCancel(event: PointerEvent) {
    if (!gestures.isTracking(event.pointerId)) return;
    gestures.cancelPointer(event.pointerId);
    animation.press(null);
    requestRender();
  }
  function wheel() { gestures.cancel(); animation.press(null); }
  function keyDown(event: KeyboardEvent) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = ({ '*': '×', '/': '÷', '-': '−', Enter: '=', '=': '=', Escape: 'AC', Delete: 'AC', o: 'ON' } as Record<string, string>)[event.key] ?? event.key;
    if (!calculator.accepts(key)) return;
    event.preventDefault();
    cancelInput();
    commit(key);
  }
  function visibility() {
    cancelInput();
    animation.reset();
    lastTime = 0;
    controls.enabled = !document.hidden && !contextLost;
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else requestRender();
  }
  function lost(event: Event) {
    event.preventDefault();
    contextLost = true;
    cancelInput();
    animation.reset();
    controls.enabled = false;
    cancelAnimationFrame(frame);
    frame = lastTime = 0;
    clearTimeout(lightTimer);
    clearTimeout(restoreTimer);
    onStatus('lost');
    restoreTimer = setTimeout(() => onStatus('restore-failed'), 8000);
  }
  function restored() {
    clearTimeout(restoreTimer);
    try {
      // Render-target pixels are lost with the context; regenerate the lighting map.
      environment.dispose();
      environment = createEnvironment();
      scene.environment = environment.texture;
      renderer.shadowMap.needsUpdate = true;
      lcd.texture.needsUpdate = true;
      contextLost = false;
      controls.enabled = !document.hidden;
      lastTime = 0;
      onStatus('ready');
      requestRender();
    } catch (cause) {
      contextLost = true;
      onStatus('restore-failed');
      console.error('Context restore failed:', cause);
    }
  }
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  canvas.addEventListener('pointerdown', pointerDown, true);
  document.addEventListener('pointerdown', outsidePointerDown, true);
  // The second touch may leave the canvas without owning pointer capture.
  document.addEventListener('pointermove', pointerMove, true);
  document.addEventListener('pointerup', pointerUp, true);
  document.addEventListener('pointercancel', pointerCancel, true);
  canvas.addEventListener('lostpointercapture', pointerCancel);
  canvas.addEventListener('wheel', wheel, { capture: true, passive: true });
  canvas.addEventListener('keydown', keyDown);
  window.addEventListener('blur', visibility);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pageshow', visibility);
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  onDisplay(calculator.snapshot, false);
  onStatus('ready');

  function setView(calculation: boolean) {
    cancelInput();
    settleControls();
    framingPoints = calculation ? calculatorPoints : allPoints;
    const target = calculation ? new THREE.Vector3(0, 2.6, 0.1) : defaultTarget;
    const direction = calculation ? new THREE.Vector3(0, 0.9, 1.8).normalize() : initialDirection;
    controls.target.copy(target);
    referenceDistance = fitDistance(framingPoints, target, direction);
    controls.minDistance = referenceDistance * 0.35;
    controls.maxDistance = referenceDistance * 2.8;
    camera.position.copy(target).addScaledVector(direction, referenceDistance);
    controls.update();
    requestRender();
  }
  return {
    zoomIn() { cancelInput(); controls.dollyIn(0.8); requestRender(); },
    zoomOut() { cancelInput(); controls.dollyOut(0.8); requestRender(); },
    resetView() { setView(false); },
    calculatorView() { setView(true); },
    cancelInput,
    dispose() {
      disposed = true;
      clearTimeout(lightTimer);
      clearTimeout(restoreTimer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      canvas.removeEventListener('pointerdown', pointerDown, true);
      document.removeEventListener('pointerdown', outsidePointerDown, true);
      document.removeEventListener('pointermove', pointerMove, true);
      document.removeEventListener('pointerup', pointerUp, true);
      document.removeEventListener('pointercancel', pointerCancel, true);
      canvas.removeEventListener('lostpointercapture', pointerCancel);
      canvas.removeEventListener('wheel', wheel, true);
      canvas.removeEventListener('keydown', keyDown);
      window.removeEventListener('blur', visibility);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', visibility);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          if ('map' in material && material.map instanceof THREE.Texture) textures.add(material.map);
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      keyLight.shadow.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

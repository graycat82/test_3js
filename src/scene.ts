import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRegister } from './model/register.ts';
import { createTextures } from './model/textures.ts';

const VIEW_DIRECTIONS: Record<string, THREE.Vector3> = {
  default: new THREE.Vector3(0.78, 0.78, 1.65),
  front: new THREE.Vector3(0, 0.63, 1.8),
  back: new THREE.Vector3(-0.55, 0.65, -1.8),
  left: new THREE.Vector3(-1.8, 0.75, 0.5),
  right: new THREE.Vector3(1.8, 0.75, 0.5),
};

export function mountScene(host: HTMLElement): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const environmentGenerator = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = environmentGenerator.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  room.dispose();
  environmentGenerator.dispose();
  const register = createRegister(createTextures());
  scene.add(register);
  scene.add(new THREE.HemisphereLight('#f6faff', '#b1b9ad', 0.85));
  const keyLight = new THREE.DirectionalLight('#fff9eb', 2.3);
  keyLight.position.set(-5, 10, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
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
  const center = bounds.getCenter(new THREE.Vector3());
  const fittingPoints: THREE.Vector3[] = [];
  register.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    const box = object.geometry.boundingBox!;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) fittingPoints.push(new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld).sub(center));
      }
    }
  });
  const requestedView = new URLSearchParams(window.location.search).get('view') ?? 'default';
  const direction = (VIEW_DIRECTIONS[requestedView] ?? VIEW_DIRECTIONS.default).clone().normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  // Center the visible silhouette, rather than the empty corners of a world box.
  const horizontal = fittingPoints.map(point => point.dot(right));
  const vertical = fittingPoints.map(point => point.dot(up));
  const shift = right.clone().multiplyScalar((Math.min(...horizontal) + Math.max(...horizontal)) / 2)
    .addScaledVector(up, (Math.min(...vertical) + Math.max(...vertical)) / 2);
  center.add(shift);
  fittingPoints.forEach(point => point.sub(shift));
  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanX = tanY * camera.aspect;
    let distance = 0;
    for (const point of fittingPoints) {
      distance = Math.max(distance, point.dot(direction) + Math.max(Math.abs(point.dot(right)) / tanX, Math.abs(point.dot(up)) / tanY));
    }
    camera.position.copy(center).addScaledVector(direction, distance * 1.04);
    camera.lookAt(center);
    renderer.setSize(width, height);
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return () => {
    observer.disconnect();
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
  };
}

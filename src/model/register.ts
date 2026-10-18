import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FUNCTION_KEYS, KEYPAD_SLOPE, KEY_ROWS, keyPosition } from './layout.ts';

export interface RegisterTextures {
  labels: ReadonlyMap<string, THREE.Texture>;
  panel: THREE.Texture;
  drawer: THREE.Texture;
  badge: THREE.Texture;
}

export function createRegister(textures: RegisterTextures): THREE.Group {
  const root = new THREE.Group();
  root.name = 'toy-register';
  const plastic = (color: string, roughness = 0.32) => new THREE.MeshStandardMaterial({
    color, roughness, metalness: 0,
  });
  const navy = plastic('#0050ad');
  const cyan = plastic('#00b3c9');
  const yellow = plastic('#ffcc05');
  const white = plastic('#fffdf2', 0.34);
  const red = plastic('#dc1831', 0.3);
  const dark = plastic('#183c48', 0.6);
  const cableMaterial = plastic('#d5e3dc', 0.55);
  const cache = new Map<THREE.Texture, THREE.MeshStandardMaterial>();
  function printMaterial(texture: THREE.Texture) {
    let material = cache.get(texture);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.7, depthWrite: false });
      cache.set(texture, material);
    }
    return material;
  }
  function box(parent: THREE.Object3D, name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material, radius = 0.15) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function decal(parent: THREE.Object3D, name: string, texture: THREE.Texture, width: number, height: number, position: [number, number, number]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), printMaterial(texture));
    mesh.name = name;
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }
  function tube(name: string, points: number[][], radius: number) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, radius, 8, false), cableMaterial);
    mesh.name = name;
    mesh.castShadow = true;
    root.add(mesh);
  }

  box(root, 'turquoise-bottom', [6.05, 0.48, 5.65], [0, 0.3, 0.15], cyan, 0.22);
  const profile = new THREE.Shape();
  profile.moveTo(-2.38, 0.45);
  profile.lineTo(2.38, 0.45);
  profile.quadraticCurveTo(2.65, 0.45, 2.65, 0.7);
  profile.lineTo(2.65, 2.25);
  profile.quadraticCurveTo(2.65, 2.48, 2.4, 2.43);
  profile.lineTo(-2.65, 1.46);
  profile.quadraticCurveTo(-2.95, 1.41, -2.95, 1.18);
  profile.lineTo(-2.95, 0.73);
  profile.quadraticCurveTo(-2.95, 0.45, -2.38, 0.45);
  const housingGeometry = new THREE.ExtrudeGeometry(profile, { depth: 5.55, steps: 1, bevelEnabled: true, bevelSegments: 4, bevelSize: 0.17, bevelThickness: 0.17, curveSegments: 12 });
  housingGeometry.translate(0, 0, -2.775);
  const housing = new THREE.Mesh(housingGeometry, navy);
  housing.name = 'sloped-housing';
  housing.rotation.y = Math.PI / 2;
  housing.castShadow = true;
  housing.receiveShadow = true;
  root.add(housing);

  box(root, 'drawer-shadow-gap', [5.65, 0.8, 0.08], [0, 0.85, 3.04], dark, 0.06);
  box(root, 'drawer', [5.66, 0.74, 0.22], [0, 0.8, 3.13], cyan, 0.12);
  decal(root, 'drawer-print', textures.drawer, 5.23, 0.52, [0, 0.8, 3.247]);
  box(root, 'drawer-lip', [5.5, 0.09, 0.29], [0, 1.15, 3.1], cyan, 0.04);
  const opener = box(root, 'open-button', [2.35, 0.25, 0.46], [0, 1.55, 2.8], yellow, 0.12);
  opener.rotation.x = KEYPAD_SLOPE;
  const openLabel = textures.labels.get('OPEN');
  if (openLabel) {
    const print = decal(opener, 'open-label', openLabel, 1.84, 0.36, [0, 0.135, 0]);
    print.rotation.x = -Math.PI / 2;
  }

  const keypad = new THREE.Group();
  keypad.name = 'keypad';
  keypad.position.set(0, 1.99, 0.21);
  keypad.rotation.x = KEYPAD_SLOPE;
  root.add(keypad);
  box(keypad, 'keypad-recess', [4.62, 0.09, 3.46], [0.42, -0.055, 0.39], navy, 0.2);
  function key(label: string, position: [number, number, number], round: boolean) {
    const mesh = round
      ? new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.39, 0.23, 32), yellow)
      : new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.25, 0.72, 3, 0.12), white);
    mesh.name = `key-${label}`;
    mesh.userData = { label, interactive: label !== 'MIC', role: label === 'MIC' ? 'decoration' : 'calculator-key' };
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    keypad.add(mesh);
    const texture = textures.labels.get(label);
    if (texture) {
      const labelMesh = decal(mesh, `label-${label}`, texture, round ? 0.61 : 0.76, round ? 0.5 : 0.58, [0, 0.132, 0]);
      labelMesh.rotation.x = -Math.PI / 2;
    }
  }
  KEY_ROWS.forEach((row, r) => row.forEach((label, c) => key(label, keyPosition(r, c), false)));
  FUNCTION_KEYS.forEach((label, row) => key(label, [-2.38, 0.13, keyPosition(row, 0)[2]], true));

  const display = new THREE.Group();
  display.name = 'display-assembly';
  display.position.set(0, 3.85, -2.07);
  display.rotation.x = -0.16;
  root.add(display);
  box(display, 'screen-back', [5.32, 2.95, 0.6], [0, 0, -0.08], navy, 0.3);
  box(display, 'cyan-bezel', [5.36, 2.91, 0.43], [0, 0, 0.2], cyan, 0.3);
  decal(display, 'faceplate-print', textures.panel, 4.76, 2.22, [0, -0.01, 0.424]);
  box(display, 'lcd-rim', [2.91, 1.13, 0.05], [0.46, -0.24, 0.44], cyan, 0.035);
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(2.69, 0.91), new THREE.MeshStandardMaterial({ color: '#162922', roughness: 0.29, metalness: 0.08 }));
  lcd.name = 'lcd';
  lcd.position.set(0.46, -0.24, 0.472);
  display.add(lcd);

  // Scanner rests beside the register. Its proportions are inferred from the photos.
  box(root, 'scanner-dock', [0.65, 1.0, 2.35], [3.21, 0.86, -0.03], navy, 0.2);
  box(root, 'scanner-cradle', [1.29, 0.43, 1.39], [3.96, 0.69, -0.78], yellow, 0.2);
  const scanner = new THREE.Group();
  scanner.name = 'scanner';
  scanner.position.set(4.1, 0.72, 0.07);
  scanner.rotation.y = -0.12;
  scanner.rotation.x = -0.06;
  root.add(scanner);
  box(scanner, 'scanner-handle', [0.76, 0.64, 2.68], [0, 0.02, 0.72], yellow, 0.27);
  box(scanner, 'scanner-head', [1.69, 0.84, 1.64], [0, 0.25, -0.74], yellow, 0.38);
  box(scanner, 'scanner-trigger', [0.43, 0.16, 0.49], [0, 0.36, 0.12], yellow, 0.08);
  const badge = decal(scanner, 'scanner-badge', textures.badge, 1.03, 0.81, [0, 0.68, -0.74]);
  badge.rotation.x = -Math.PI / 2;
  tube('scanner-cable', [[3.11, 0.6, 1.89], [3.32, 0.12, 2.68], [4.48, 0.1, 3.01], [4.93, 0.13, 2.4], [4.33, 0.73, 2.03]], 0.055);

  box(root, 'microphone-socket', [0.42, 0.64, 0.53], [-3.0, 1.98, -1.8], navy, 0.16);
  tube('microphone-stem', [[-3.03, 2.15, -1.77], [-3.13, 2.91, -1.75], [-3.49, 3.7, -1.7], [-4.01, 4.13, -1.56]], 0.064);
  const mic = new THREE.Group();
  mic.name = 'flower-microphone';
  mic.position.set(-4.04, 4.16, -1.55);
  mic.rotation.y = -0.15;
  root.add(mic);
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI / 2 + i * 2 * Math.PI / 5;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12), red);
    petal.name = `petal-${i}`;
    petal.scale.set(0.88, 1.06, 0.22);
    petal.position.set(Math.cos(angle) * 0.38, Math.sin(angle) * 0.38, 0);
    petal.castShadow = true;
    mic.add(petal);
  }
  const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.32, 32), yellow);
  grille.name = 'microphone-grille';
  grille.rotation.x = Math.PI / 2;
  grille.position.z = 0.16;
  mic.add(grille);
  for (let i = -2; i <= 2; i++) {
    const slot = box(mic, `mic-slot-${i}`, [0.045, 0.25 - Math.abs(i) * 0.033, 0.012], [i * 0.075, 0, 0.326], dark, 0.008);
    slot.rotation.z = 0.5;
  }
  for (const x of [-2.3, 2.3]) {
    for (const z of [-1.9, 1.9]) box(root, 'bottom-foot', [0.52, 0.12, 0.52], [x, 0.03, z], cyan, 0.1);
  }
  box(root, 'battery-cover', [1.7, 0.04, 1.38], [0, 0.045, -0.66], cyan, 0.05);
  return root;
}

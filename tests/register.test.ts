import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BufferGeometry, Material, Mesh, Texture, PerspectiveCamera, Vector3 } from 'three';
import { KeyPicker } from '../src/input/picking.ts';
import { createRegister } from '../src/model/register.ts';
import { KEY_ROWS, FUNCTION_KEYS } from '../src/model/layout.ts';
import { CALCULATOR_DIRECTION, fitDistance, registerViewPoints, viewCenter } from '../src/view/framing.ts';

function fixture() {
  const texture = new Texture();
  const labels = new Map([...KEY_ROWS.flat(), ...FUNCTION_KEYS, 'OPEN'].map(label => [label, texture]));
  const model = createRegister({ labels, panel: texture, drawer: texture, badge: texture });
  return { model, cleanup() {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    texture.dispose();
  } };
}

test('photo key arrangement has independent keys in the correct rows', () => {
  const { model, cleanup } = fixture();
  try {
    const keypad = model.getObjectByName('keypad')!;
    const keys = keypad.children.filter(child => child.name.startsWith('key-'));
    assert.equal(keys.length, 20);
    KEY_ROWS.forEach((row, r) => row.forEach((label, c) => {
      const key = model.getObjectByName(`key-${label}`)!;
      assert.ok(key);
      if (c > 0) assert.ok(key.position.x > model.getObjectByName(`key-${row[c - 1]}`)!.position.x);
      if (r > 0) assert.ok(key.position.z > model.getObjectByName(`key-${KEY_ROWS[r - 1][c]}`)!.position.z);
    }));
    for (const label of FUNCTION_KEYS) assert.ok(model.getObjectByName(`key-${label}`)!.position.x < keys[0].position.x);
  } finally { cleanup(); }
});

test('all major photographed assemblies exist with finite mesh positions', () => {
  const { model, cleanup } = fixture();
  try {
    for (const name of ['sloped-housing', 'drawer', 'display-assembly', 'lcd', 'open-button', 'scanner', 'scanner-cable', 'flower-microphone', 'microphone-stem']) assert.ok(model.getObjectByName(name), name);
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const positions = object.geometry.getAttribute('position');
      for (let i = 0; i < positions.array.length; i++) assert.ok(Number.isFinite(positions.array[i]), object.name);
    });
    const bounds = new Box3().setFromObject(model);
    assert.ok(bounds.max.x > 4.5 && bounds.min.x < -4, 'scanner and microphone extend past housing');
    assert.ok(bounds.min.y >= -0.1, 'assembly rests on the floor');
  } finally { cleanup(); }
});

test('keys stand above the recess and do not overlap adjacent keys', () => {
  const { model, cleanup } = fixture();
  try {
    model.updateMatrixWorld(true);
    const keypad = model.getObjectByName('keypad')!;
    const keys = keypad.children.filter((object): object is Mesh => object instanceof Mesh && object.name.startsWith('key-'));
    const bounds = keys.map(key => {
      key.geometry.computeBoundingBox();
      return key.geometry.boundingBox!.clone().applyMatrix4(key.matrix);
    });
    const plate = keypad.getObjectByName('keypad-recess') as Mesh;
    plate.geometry.computeBoundingBox();
    const plateTop = plate.geometry.boundingBox!.max.y + plate.position.y;
    bounds.forEach((bound, i) => {
      assert.ok(bound.min.y > plateTop, `${keys[i].name} is buried in the recess`);
      bounds.slice(i + 1).forEach(other => {
        const overlapX = Math.min(bound.max.x, other.max.x) - Math.max(bound.min.x, other.min.x);
        const overlapZ = Math.min(bound.max.z, other.max.z) - Math.max(bound.min.z, other.min.z);
        assert.ok(overlapX <= 0 || overlapZ <= 0, `${keys[i].name} overlaps another key`);
      });
    });
  } finally { cleanup(); }
});

test('OPEN has a separate front strip and every numeric key is visible from the calculator view', () => {
  const { model, cleanup } = fixture();
  try {
    model.updateMatrixWorld(true);
    const opener = new Box3().setFromObject(model.getObjectByName('open-button')!);
    const keypad = model.getObjectByName('keypad')!;
    for (const key of keypad.children.filter(child => child.name.startsWith('key-'))) {
      const bounds = new Box3().setFromObject(key);
      assert.ok(opener.min.z - bounds.max.z > 0.15, `${key.name}: OPEN needs a visible gap`);
      assert.ok(!opener.intersectsBox(bounds), `${key.name}: OPEN overlaps`);
    }
    const display = new Box3().setFromObject(model.getObjectByName('display-assembly')!);
    const firstRow = new Box3().setFromObject(model.getObjectByName('key-1')!);
    assert.ok(firstRow.min.z - display.max.z > 0.08, 'space between LCD assembly and first row');
    const camera = new PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 10, 16);
    camera.lookAt(0, 2.6, 0.1);
    camera.updateMatrixWorld(true);
    const picker = new KeyPicker();
    for (const label of KEY_ROWS.flat()) {
      const point = model.getObjectByName(`key-${label}`)!.getWorldPosition(new Vector3()).project(camera);
      assert.equal(picker.pick((point.x + 1) * 500, (1 - point.y) * 500, { left: 0, top: 0, width: 1000, height: 1000 }, camera, model), label, `visible ${label}`);
    }
  } finally { cleanup(); }
});

test('calculator framing keeps the LCD and every usable key visible, with room to zoom out to the whole model', () => {
  const { model, cleanup } = fixture();
  try {
    const points = registerViewPoints(model);
    const direction = CALCULATOR_DIRECTION;
    const target = viewCenter(points.calculator, direction);
    for (const aspect of [374 / 764, 304 / 488, 1264 / 640, 828 / 310]) {
      const camera = new PerspectiveCamera(34, aspect, 0.1, 200);
      const distance = fitDistance(points.calculator, target, direction, aspect, camera.fov);
      camera.position.copy(target).addScaledVector(direction, distance);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      for (const point of points.calculator) {
        const projected = point.clone().project(camera);
        assert.ok(Math.abs(projected.x) < 0.99 && Math.abs(projected.y) < 0.99, `calculator clipped at aspect ${aspect}`);
        assert.ok(projected.z > -1 && projected.z < 1);
      }
      const picker = new KeyPicker();
      for (const label of [...KEY_ROWS.flat(), 'ON', 'OFF', 'AC']) {
        const point = model.getObjectByName(`key-${label}`)!.getWorldPosition(new Vector3()).project(camera);
        assert.equal(picker.pick((point.x + 1) * 500, (1 - point.y) * 500, { left: 0, top: 0, width: 1000, height: 1000 }, camera, model), label, `${label} blocked at aspect ${aspect}`);
      }
      const zoomLimit = Math.max(distance * 2.8, fitDistance(points.all, target, direction, aspect, camera.fov) * 1.25);
      camera.position.copy(target).addScaledVector(direction, zoomLimit);
      camera.updateMatrixWorld(true);
      for (const point of points.all) {
        const projected = point.clone().project(camera);
        assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, `whole model unavailable at aspect ${aspect}`);
      }
    }
  } finally { cleanup(); }
});

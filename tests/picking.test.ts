import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry } from 'three';
import { KeyPicker } from '../src/input/picking.ts';

test('a printed label resolves to its key but a closer housing or decorative part blocks it', () => {
  const model = new Group();
  const material = new MeshBasicMaterial();
  const keyGeometry = new BoxGeometry(1, 1, 0.2);
  const printGeometry = new PlaneGeometry(0.8, 0.8);
  const blockerGeometry = new BoxGeometry(2, 2, 0.1);
  const key = new Mesh(keyGeometry, material);
  key.userData = { label: '8', role: 'calculator-key', interactive: true };
  const print = new Mesh(printGeometry, material);
  print.position.z = 0.11;
  key.add(print);
  model.add(key);
  const camera = new PerspectiveCamera(45, 1, 0.1, 20);
  camera.position.z = 5;
  camera.lookAt(0, 0, 0);
  const picker = new KeyPicker();
  const rect = { left: 10, top: 20, width: 1000, height: 1000 };
  try {
    assert.equal(picker.pick(510, 520, rect, camera, model), '8');
    assert.equal(picker.pick(0, 0, rect, camera, model), null);
    const blocker = new Mesh(blockerGeometry, material);
    blocker.position.z = 1;
    model.add(blocker);
    assert.equal(picker.pick(510, 520, rect, camera, model), null);
    model.remove(blocker);
    key.userData.interactive = false;
    assert.equal(picker.pick(510, 520, rect, camera, model), null);
    key.userData.interactive = true;
    blocker.position.z = -1;
    model.add(blocker);
    camera.position.z = -5;
    camera.lookAt(0, 0, 0);
    assert.equal(picker.pick(510, 520, rect, camera, model), null);
  } finally {
    keyGeometry.dispose(); printGeometry.dispose(); blockerGeometry.dispose(); material.dispose();
  }
});

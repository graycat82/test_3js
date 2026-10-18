import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { createOrbitControls } from '../src/input/orbit-controls.ts';

// Unit-level DOM substitute: no browser, disk fixture, or hardware input is used.
class Surface extends EventTarget {
  style = {};
  clientWidth = 1000;
  clientHeight = 1000;
  ownerDocument = new EventTarget();
  getRootNode() { return this.ownerDocument; }
  setPointerCapture(_id: number) { /* no physical pointer in unit tests */ }
  releasePointerCapture(_id: number) { /* no physical pointer in unit tests */ }
}
function touch(target: EventTarget, type: string, id: number, x: number, y: number) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: id, pointerType: 'touch', pageX: x, pageY: y, clientX: x, clientY: y, button: 0 });
  target.dispatchEvent(event);
}

test('configured touch controls pinch within limits, rotate with one finger, and recover after disconnect', () => {
  const surface = new Surface();
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 4, 10);
  const controls = createOrbitControls(camera, surface as unknown as HTMLElement);
  controls.minDistance = 5;
  controls.maxDistance = 20;
  try {
    const initial = controls.getDistance();
    touch(surface, 'pointerdown', 1, 400, 500);
    touch(surface, 'pointerdown', 2, 600, 500);
    touch(surface.ownerDocument, 'pointermove', 1, 250, 500);
    touch(surface.ownerDocument, 'pointermove', 2, 750, 500);
    assert.ok(controls.getDistance() < initial, 'pinch spread zooms in');
    assert.ok(controls.getDistance() >= 5, 'minimum distance is respected');
    touch(surface.ownerDocument, 'pointermove', 1, 498, 500);
    touch(surface.ownerDocument, 'pointermove', 2, 502, 500);
    assert.ok(controls.getDistance() > initial, 'pinch contraction zooms out');
    assert.ok(controls.getDistance() <= 20, 'maximum distance is respected');
    touch(surface.ownerDocument, 'pointerup', 1, 498, 500);
    touch(surface.ownerDocument, 'pointerup', 2, 502, 500);
    const beforeRotate = camera.position.clone();
    touch(surface, 'pointerdown', 3, 500, 500);
    touch(surface.ownerDocument, 'pointermove', 3, 750, 600);
    touch(surface.ownerDocument, 'pointerup', 3, 750, 600);
    assert.ok(camera.position.distanceTo(beforeRotate) > 0.1, 'one finger rotates');
    assert.ok(controls.target.length() < 0.0001, 'two fingers do not pan');
    controls.disconnect();
    controls.connect(surface as unknown as HTMLElement);
    controls.enableDamping = false;
    controls.update();
    const resumed = camera.position.clone();
    touch(surface, 'pointerdown', 4, 500, 500);
    touch(surface.ownerDocument, 'pointermove', 4, 450, 500);
    touch(surface.ownerDocument, 'pointerup', 4, 450, 500);
    assert.ok(camera.position.distanceTo(resumed) > 0.1, 'new touch works after app cancellation');
  } finally { controls.dispose(); }
});

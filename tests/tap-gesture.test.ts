import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TapGesture } from '../src/input/tap-gesture.ts';

test('same visible key with a small movement commits exactly once', () => {
  const tap = new TapGesture();
  tap.down(1, 100, 100, '5');
  tap.move(1, 102, 103);
  assert.equal(tap.up(1, 102, 103, '5'), '5');
  assert.equal(tap.up(1, 102, 103, '5'), null);
});
test('a drag is permanently cancelled even when the pointer returns to the original key', () => {
  const tap = new TapGesture();
  tap.down(1, 0, 0, '5');
  tap.move(1, 9, 0);
  tap.move(1, 0, 0);
  assert.equal(tap.pressedKey, null);
  assert.equal(tap.up(1, 0, 0, '5'), null);
});
test('changing or leaving a key does not enter a value', () => {
  const tap = new TapGesture();
  tap.down(1, 0, 0, '5');
  assert.equal(tap.up(1, 0, 0, '6'), null);
  tap.down(2, 0, 0, null);
  assert.equal(tap.up(2, 0, 0, '5'), null);
});
test('pinch ending in either order cannot resurrect the remaining finger', () => {
  for (const first of [1, 2]) {
    const tap = new TapGesture();
    tap.down(1, 0, 0, '1');
    tap.down(2, 50, 0, '2');
    assert.equal(tap.up(first, 0, 0, '1'), null);
    tap.move(3 - first, 0, 0);
    assert.equal(tap.up(3 - first, 0, 0, '1'), null);
    tap.down(4, 0, 0, '9');
    assert.equal(tap.up(4, 0, 0, '9'), '9');
  }
});
test('cancelling one finger keeps the other finger cancelled', () => {
  const tap = new TapGesture();
  tap.down(1, 0, 0, '1');
  tap.down(2, 5, 0, '2');
  tap.cancelPointer(2);
  assert.equal(tap.up(1, 0, 0, '1'), null);
});
test('wheel or UI cancellation invalidates an active tap until release', () => {
  const tap = new TapGesture();
  tap.down(1, 0, 0, '5');
  tap.cancel();
  assert.equal(tap.up(1, 0, 0, '5'), null);
  tap.down(2, 0, 0, '5');
  tap.reset();
  assert.equal(tap.up(2, 0, 0, '5'), null);
});
test('late events from an old pointer do not cancel a fresh tap', () => {
  const tap = new TapGesture();
  tap.down(2, 0, 0, '7');
  tap.cancelPointer(1);
  assert.equal(tap.up(1, 0, 0, '8'), null);
  assert.equal(tap.up(2, 0, 0, '7'), '7');
});
test('a touch that starts while another finger is outside the canvas cannot become a tap', () => {
  const tap = new TapGesture();
  tap.down(2, 10, 10, '7', false);
  assert.equal(tap.up(2, 10, 10, '7'), null);
  tap.down(3, 10, 10, '7', false);
  assert.equal(tap.up(3, 10, 10, '7'), null);
  tap.down(4, 10, 10, '7', true);
  assert.equal(tap.up(4, 10, 10, '7'), '7');
});

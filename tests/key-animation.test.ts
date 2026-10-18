import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Group, Object3D } from 'three';
import { KeyAnimation } from '../src/display/key-animation.ts';

function fixture() {
  const model = new Group();
  const key = new Object3D();
  key.position.y = 0.13;
  key.userData = { label: '1', role: 'calculator-key' };
  model.add(key);
  return { key, animation: new KeyAnimation(model) };
}
test('held key depresses locally and returns after drag or pointer cancellation', () => {
  const { key, animation } = fixture();
  animation.press('1');
  for (let i = 0; i < 30; i++) animation.update(1 / 60);
  assert.ok(key.position.y < 0.1);
  animation.press(null);
  for (let i = 0; i < 30; i++) animation.update(1 / 60);
  assert.equal(key.position.y, 0.13);
});
test('a fast tap still has a visible pulse; reset clears all pressed state', () => {
  const { key, animation } = fixture();
  animation.press('1');
  animation.press(null);
  animation.pulse('1');
  assert.ok(key.position.y < 0.1);
  animation.update(1 / 60);
  assert.ok(key.position.y < 0.13);
  animation.reset();
  assert.equal(key.position.y, 0.13);
  assert.equal(animation.update(1 / 60), false);
});

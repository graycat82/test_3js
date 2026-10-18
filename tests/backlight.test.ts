import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Backlight } from '../src/display/backlight.ts';

test('backlight holds for three seconds, fades, and stays off without changing calculator state', () => {
  const light = new Backlight();
  assert.equal(light.sample(0).level, 0);
  light.activate(100);
  assert.equal(light.sample(3099).level, 1);
  assert.equal(light.sample(3100).fading, true);
  assert.equal(light.sample(3225).level, 0.5);
  assert.equal(light.sample(3350).level, 0);
});
test('each accepted press renews the deadline; OFF clears even a renewed deadline', () => {
  const light = new Backlight();
  light.activate(0);
  light.activate(2800);
  assert.equal(light.sample(4000).level, 1);
  light.off();
  assert.equal(light.sample(4000).level, 0);
  light.activate(5000);
  assert.equal(light.sample(5000).level, 1);
});

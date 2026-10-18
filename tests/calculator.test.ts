import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Calculator } from '../src/calculator/calculator.ts';

function enter(calculator: Calculator, sequence: string[]) {
  for (const key of sequence) calculator.press(key);
  return calculator.snapshot.display;
}
function calculate(sequence: string[]) { return enter(new Calculator(), sequence); }

for (const [sequence, expected] of [
  [['1', '2', '+', '3', '4', '='], '46'],
  [['9', '−', '1', '2', '='], '-3'],
  [['7', '×', '8', '='], '56'],
  [['9', '÷', '4', '='], '2.25'],
  [['2', '+', '3', '×', '4', '='], '20'],
  [['0', '.', '1', '+', '0', '.', '2', '='], '0.3'],
  [['1', '÷', '3', '×', '3', '='], '1'],
  [['2', '+', '×', '4', '='], '8'],
  [['2', '+', '=', '3', '='], '5'],
  [['5', '+', '2', '=', '=', '='], '7'],
  [['2', '+', '3', '=', '4'], '4'],
  [['2', '+', '3', '=', '×', '4', '='], '20'],
  [['1', '2', '=', '3'], '3'],
  [['0', '0', '.', '2', '.', '5'], '0.25'],
  [['.', '5', '+', '.', '2', '5', '='], '0.75'],
  [['1', '÷', '3', '='], '0.333333333333'],
  [['9', '9', '9', '9', '9', '9', '9', '9', '9', '9', '9', '9', '+', '1', '='], '1e+12'],
  [['0', '−', '0', '='], '0'],
] as [string[], string][]) {
  test(`calculator ${sequence.join(' ')} → ${expected}`, () => assert.equal(calculate(sequence), expected));
}

test('input is capped at twelve digits without limiting decimal-point insertion', () => {
  const calculator = new Calculator();
  assert.equal(enter(calculator, [...'123456789012345']), '123456789012');
  assert.equal(enter(calculator, ['.', '9']), '123456789012.');
});

test('OFF blocks every calculation key except ON; ON and AC clear pending state', () => {
  const calculator = new Calculator();
  enter(calculator, ['5', '+', '3', 'OFF', 'AC', '9', '=', '.']);
  assert.equal(calculator.snapshot.display, '');
  assert.equal(calculator.snapshot.powered, false);
  assert.equal(enter(calculator, ['ON']), '0');
  assert.equal(calculator.snapshot.pending, null);
  assert.equal(enter(calculator, ['4', '×', '2', 'AC', '3', '=']), '3');
});

test('division by zero is latched until AC or ON; OFF remains available', () => {
  const calculator = new Calculator();
  assert.equal(enter(calculator, ['5', '÷', '0', '=']), 'Error');
  assert.equal(enter(calculator, ['9', '+', '=', '.']), 'Error');
  assert.equal(calculator.snapshot.error, true);
  assert.equal(enter(calculator, ['AC']), '0');
  assert.equal(enter(calculator, ['0', '÷', '0', '=', 'OFF']), '');
  assert.equal(enter(calculator, ['ON', '6']), '6');
});

test('large and small exponents fail predictably outside LCD range', () => {
  const calculator = new Calculator();
  enter(calculator, [...'999999999999']);
  for (let i = 0; i < 9; i++) enter(calculator, ['×', ...'999999999999', '=']);
  assert.equal(calculator.snapshot.display, 'Error');
  enter(calculator, ['AC', '1']);
  for (let i = 0; i < 10; i++) enter(calculator, ['÷', ...'999999999999', '=']);
  assert.equal(calculator.snapshot.display, 'Error');
});

test('decimal trailing zeros are removed only for results; invalid and decorative keys are ignored', () => {
  const calculator = new Calculator();
  assert.equal(enter(calculator, ['1', '.', '2', '0']), '1.20');
  assert.equal(enter(calculator, ['+', '0', '=']), '1.2');
  assert.equal(enter(calculator, ['MIC', 'OPEN', 'scanner', 'NaN', 'Infinity']), '1.2');
});

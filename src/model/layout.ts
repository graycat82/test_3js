export const KEY_ROWS = [
  ['1', '2', '3', '÷'],
  ['4', '5', '6', '×'],
  ['7', '8', '9', '−'],
  ['.', '0', '=', '+'],
] as const;

export const FUNCTION_KEYS = ['ON', 'OFF', 'AC', 'MIC'] as const;
export const KEYPAD_SLOPE = 0.19;

export function keyPosition(row: number, column: number): [number, number, number] {
  return [-1.27 + column * 1.12, 0.13, -1.12 + row * 0.88];
}

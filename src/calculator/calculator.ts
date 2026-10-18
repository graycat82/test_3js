import Decimal from 'decimal.js';

const NumberValue = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -7, toExpPos: 12 });
export type Operator = '+' | '−' | '×' | '÷';
export interface CalculatorSnapshot {
  display: string;
  powered: boolean;
  error: boolean;
  pending: Operator | null;
}
const operators = new Set<string>(['+', '−', '×', '÷']);

/** Sequential desktop-calculator rules, independent of the DOM and WebGL. */
export class Calculator {
  private powered = true;
  private failed = false;
  private entry = '0';
  private value = new NumberValue(0);
  private accumulator: Decimal | null = null;
  private pending: Operator | null = null;
  private replaceEntry = true;
  private rightEntered = false;

  get snapshot(): CalculatorSnapshot {
    return { display: !this.powered ? '' : this.failed ? 'Error' : this.entry, powered: this.powered, error: this.failed, pending: this.pending };
  }

  accepts(key: string): boolean {
    if (key === 'ON') return true;
    if (!this.powered) return false;
    if (key === 'OFF' || key === 'AC') return true;
    return !this.failed && (/^[0-9.]$/.test(key) || operators.has(key) || key === '=');
  }

  press(key: string): CalculatorSnapshot {
    if (!this.accepts(key)) return this.snapshot;
    if (key === 'ON' || key === 'AC') {
      this.reset();
    } else if (key === 'OFF') {
      this.powered = false;
    } else if (/^[0-9.]$/.test(key)) {
      this.enter(key);
    } else if (operators.has(key)) {
      if (this.pending && this.rightEntered && !this.calculate()) return this.snapshot;
      this.accumulator = this.value;
      this.pending = key as Operator;
      this.replaceEntry = true;
      this.rightEntered = false;
    } else if (key === '=' && this.pending && this.rightEntered) {
      if (this.calculate()) {
        this.accumulator = null;
        this.pending = null;
        this.replaceEntry = true;
        this.rightEntered = false;
      }
    } else if (key === '=' && !this.pending) {
      this.replaceEntry = true;
    }
    return this.snapshot;
  }

  private reset() {
    this.powered = true;
    this.failed = false;
    this.entry = '0';
    this.value = new NumberValue(0);
    this.accumulator = null;
    this.pending = null;
    this.replaceEntry = true;
    this.rightEntered = false;
  }

  private enter(key: string) {
    if (this.replaceEntry) {
      this.entry = key === '.' ? '0.' : key;
      this.replaceEntry = false;
    } else if (key === '.') {
      if (this.entry.includes('.')) return;
      this.entry += '.';
    } else {
      if (this.entry === '0') this.entry = key;
      else {
        if (this.entry.replace(/\D/g, '').length >= 12) return;
        this.entry += key;
      }
    }
    this.value = new NumberValue(this.entry);
    if (this.pending) this.rightEntered = true;
  }

  private calculate(): boolean {
    try {
      const left = this.accumulator!;
      let result: Decimal;
      switch (this.pending) {
        case '+': result = left.plus(this.value); break;
        case '−': result = left.minus(this.value); break;
        case '×': result = left.times(this.value); break;
        case '÷': result = left.div(this.value); break;
        default: return false;
      }
      const rounded = result.toSignificantDigits(12);
      if (!result.isFinite() || (!rounded.isZero() && Math.abs(rounded.e) > 99)) throw new RangeError('Display range exceeded');
      this.value = result;
      this.entry = rounded.isZero() ? '0' : rounded.toString();
      return true;
    } catch {
      this.failed = true;
      this.pending = null;
      this.accumulator = null;
      this.rightEntered = false;
      return false;
    }
  }
}

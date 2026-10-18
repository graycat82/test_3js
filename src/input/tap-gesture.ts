interface Candidate { id: number; x: number; y: number; key: string | null }

/** A second pointer or a drag invalidates the entire gesture until every pointer is up. */
export class TapGesture {
  private pointers = new Set<number>();
  private candidate: Candidate | null = null;
  private blocked = false;
  private readonly threshold: number;

  constructor(threshold = 8) { this.threshold = threshold; }

  get pressedKey(): string | null { return this.candidate?.key ?? null; }
  get activeCount(): number { return this.pointers.size; }
  isTracking(id: number): boolean { return this.pointers.has(id); }

  down(id: number, x: number, y: number, key: string | null, primary = true) {
    if (this.pointers.size || this.pointers.has(id)) this.cancel();
    if (!primary) this.blocked = true;
    this.pointers.add(id);
    if (!this.blocked && this.pointers.size === 1) this.candidate = { id, x, y, key };
  }

  move(id: number, x: number, y: number) {
    if (this.candidate?.id === id && Math.hypot(x - this.candidate.x, y - this.candidate.y) > this.threshold) this.cancel();
  }

  up(id: number, x: number, y: number, key: string | null): string | null {
    if (!this.pointers.has(id)) return null;
    this.move(id, x, y);
    const result = !this.blocked && this.candidate?.id === id && this.candidate.key === key ? key : null;
    this.pointers.delete(id);
    this.candidate = null;
    if (!this.pointers.size) this.blocked = false;
    return result;
  }

  cancelPointer(id: number) {
    if (!this.pointers.has(id)) return;
    this.cancel();
    this.pointers.delete(id);
    if (!this.pointers.size) this.blocked = false;
  }

  cancel() {
    this.candidate = null;
    this.blocked = this.pointers.size > 0;
  }

  reset() {
    this.pointers.clear();
    this.candidate = null;
    this.blocked = false;
  }
}

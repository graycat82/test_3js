export const BACKLIGHT_DURATION_MS = 3000;
export const BACKLIGHT_FADE_MS = 250;

export class Backlight {
  private deadline = -Infinity;

  activate(now: number) { this.deadline = now + BACKLIGHT_DURATION_MS; }
  off() { this.deadline = -Infinity; }

  sample(now: number): { level: number; fading: boolean; wakeIn: number | null } {
    if (now < this.deadline) return { level: 1, fading: false, wakeIn: this.deadline - now };
    const level = Math.max(0, 1 - (now - this.deadline) / BACKLIGHT_FADE_MS);
    return { level, fading: level > 0, wakeIn: null };
  }
}

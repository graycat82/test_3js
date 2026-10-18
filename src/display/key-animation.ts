import type { Group, Mesh } from 'three';

interface KeyState { mesh: Mesh; rest: number; target: number; amount: number }
export class KeyAnimation {
  private keys = new Map<string, KeyState>();

  constructor(model: Group) {
    model.traverse(object => {
      if (object.userData.role === 'calculator-key') this.keys.set(object.userData.label, { mesh: object as Mesh, rest: object.position.y, target: 0, amount: 0 });
    });
  }

  press(label: string | null) {
    for (const [name, state] of this.keys) state.target = name === label ? 0.065 : 0;
  }

  pulse(label: string) {
    const state = this.keys.get(label);
    if (!state) return;
    state.amount = 0.065;
    state.mesh.position.y = state.rest - state.amount;
  }

  reset() {
    for (const state of this.keys.values()) {
      state.amount = state.target = 0;
      state.mesh.position.y = state.rest;
    }
  }

  update(deltaSeconds: number): boolean {
    let moving = false;
    const fraction = 1 - Math.exp(-26 * Math.min(deltaSeconds, 0.1));
    for (const state of this.keys.values()) {
      state.amount += (state.target - state.amount) * fraction;
      if (Math.abs(state.target - state.amount) < 0.0005) state.amount = state.target;
      else moving = true;
      state.mesh.position.y = state.rest - state.amount;
    }
    return moving;
  }
}

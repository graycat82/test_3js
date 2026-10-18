import { Object3D, Raycaster, Vector2 } from 'three';
import type { Camera } from 'three';

export class KeyPicker {
  private raycaster = new Raycaster();
  private point = new Vector2();

  pick(x: number, y: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, camera: Camera, model: Object3D): string | null {
    if (rect.width <= 0 || rect.height <= 0 || x < rect.left || y < rect.top || x > rect.left + rect.width || y > rect.top + rect.height) return null;
    this.point.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    model.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.point, camera);
    // Inspect the nearest visible surface, including non-key parts that occlude keys.
    let object: Object3D | null = this.raycaster.intersectObject(model, true)[0]?.object ?? null;
    while (object && object !== model) {
      if (object.userData.role === 'calculator-key' && object.userData.interactive) return object.userData.label as string;
      object = object.parent;
    }
    return null;
  }
}

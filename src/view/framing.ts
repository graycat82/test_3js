import { Box3, MathUtils, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';

export const CALCULATOR_DIRECTION = new Vector3(0, 1.15, 1.8).normalize();

export function registerViewPoints(model: Object3D) {
  model.updateMatrixWorld(true);
  const all: Vector3[] = [], calculator: Vector3[] = [];
  model.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.geometry.computeBoundingBox();
    const box = object.geometry.boundingBox!;
    const functional = object.userData.role === 'calculator-key' || object.name === 'lcd' || object.name === 'lcd-rim';
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const point = new Vector3(x, y, z).applyMatrix4(object.matrixWorld);
      all.push(point);
      if (functional) calculator.push(point);
    }
  });
  return { all, calculator };
}

export function viewCenter(points: Vector3[], direction: Vector3): Vector3 {
  const target = new Box3().setFromPoints(points).getCenter(new Vector3());
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const horizontal = points.map(point => point.clone().sub(target).dot(right));
  const vertical = points.map(point => point.clone().sub(target).dot(up));
  return target.addScaledVector(right, (Math.min(...horizontal) + Math.max(...horizontal)) / 2)
    .addScaledVector(up, (Math.min(...vertical) + Math.max(...vertical)) / 2);
}

export function fitDistance(points: Vector3[], target: Vector3, direction: Vector3, aspect: number, fov: number): number {
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const tanY = Math.tan(MathUtils.degToRad(fov / 2));
  let distance = 0;
  for (const worldPoint of points) {
    const point = worldPoint.clone().sub(target);
    distance = Math.max(distance, point.dot(direction) + Math.max(Math.abs(point.dot(right)) / (tanY * aspect), Math.abs(point.dot(up)) / tanY));
  }
  return distance * 1.04;
}

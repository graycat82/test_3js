import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, LatheGeometry, Shape, Vector2 } from 'three';

// Shapes are inferred from IMG_0098/0099/0101, in model units, without measured dimensions.
export function createOpenButtonGeometry() {
  const outline = new Shape();
  outline.moveTo(-1.05, 0.2);
  outline.lineTo(1.05, 0.2);
  outline.quadraticCurveTo(1.16, 0.2, 1.16, 0.08);
  outline.bezierCurveTo(1.16, -0.15, 0.8, -0.30, 0, -0.32);
  outline.bezierCurveTo(-0.8, -0.30, -1.16, -0.15, -1.16, 0.08);
  outline.quadraticCurveTo(-1.16, 0.2, -1.05, 0.2);
  const geometry = new ExtrudeGeometry(outline, {
    depth: 0.15, steps: 1, bevelEnabled: true, bevelSegments: 4,
    bevelSize: 0.055, bevelThickness: 0.055, curveSegments: 16,
  });
  geometry.translate(0, 0, -0.075);
  geometry.rotateX(-Math.PI / 2);
  // The front underside bows down at the middle; keep the printed top face flat.
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y < 0) positions.setY(i, y * (1 + 0.27 * Math.max(0, 1 - (positions.getX(i) / 1.22) ** 2)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createScannerHeadGeometry(rim = false) {
  const outline = new Shape();
  // Broad rounded back, oval shoulders, then a narrower neck at the handle.
  outline.moveTo(-0.6, 1.52);
  outline.bezierCurveTo(-0.96, 1.52, -1.02, 1.26, -1.02, 0.90);
  outline.bezierCurveTo(-1.02, 0.35, -0.72, 0.04, -0.37, 0.02);
  outline.lineTo(0.37, 0.02);
  outline.bezierCurveTo(0.72, 0.04, 1.02, 0.35, 1.02, 0.90);
  outline.bezierCurveTo(1.02, 1.26, 0.96, 1.52, 0.6, 1.52);
  outline.quadraticCurveTo(0, 1.60, -0.6, 1.52);
  const geometry = new ExtrudeGeometry(outline, {
    depth: rim ? 0.055 : 0.14, steps: 1, bevelEnabled: true, bevelSegments: 8,
    bevelSize: rim ? 0.205 : 0.20, bevelThickness: rim ? 0.045 : 0.27, curveSegments: 20,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function scannerGripSection(z: number) {
  const t = Math.max(0, Math.min(1, z / 2.75));
  const top = 0.31 + 0.12 * Math.sin(Math.PI * t) - 0.22 * t * t;
  let bottom = -0.27 - 0.11 * Math.exp(-(((z - 2.25) / 0.4) ** 2));
  for (const finger of [0.45, 0.95, 1.45]) bottom += 0.15 * Math.exp(-(((z - finger) / 0.17) ** 2));
  const cap = z > 2.30 ? Math.sqrt(Math.max(0, 1 - ((z - 2.30) / 0.45) ** 2))
    : z < -0.10 ? Math.sqrt(Math.max(0, 1 - ((z + 0.10) / 0.20) ** 2)) : 1;
  return { centerY: (top + bottom) / 2, radiusY: (top - bottom) / 2 * cap,
    radiusX: (0.38 + 0.045 * Math.exp(-(((z - 2.20) / 0.60) ** 2))) * cap };
}

export function createScannerGripGeometry() {
  // Elliptical rings make both the arched spine and the finger scallops smoothly rounded.
  const rings = 64;
  const sides = 32;
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    const z = ring === rings ? 2.75 : -0.30 + 3.05 * ring / rings;
    const section = scannerGripSection(z);
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2;
      vertices.push(section.radiusX * Math.cos(angle), section.centerY + section.radiusY * Math.sin(angle), z);
      if (ring < rings) {
        const a = ring * sides + side, b = ring * sides + (side + 1) % sides;
        const c = a + sides, d = b + sides;
        if (ring > 0) indices.push(a, b, c);
        if (ring < rings - 1) indices.push(b, d, c);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createMicrophoneBodyGeometry() {
  // Lathe axis becomes local Z: a long yellow capsule projecting through the thin flower plate.
  const profile = [[0, -0.10], [0.19, -0.10], [0.255, -0.04], [0.28, 0.05],
    [0.28, 0.67], [0.27, 0.76], [0.24, 0.82], [0, 0.82]];
  const geometry = new LatheGeometry(profile.map(([radius, depth]) => new Vector2(radius, depth)), 40);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

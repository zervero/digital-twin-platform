/**
 * Pure camera framing math used by DigitalTwinEngine.
 * Kept WebGL-free so tests do not need a renderer.
 */

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  position: Vec3;
  lookAt: Vec3;
}

/** Standard 3/4 orbital direction (normalized). */
const VIEW_DIR: Vec3 = (() => {
  const x = 1;
  const y = 0.8;
  const z = 1;
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len] as const;
})();

export function computeResetView(defaultPosition: Vec3): CameraPose {
  return {
    position: defaultPosition,
    lookAt: [0, 0, 0],
  };
}

/**
 * Frame all node positions with a padded bounding-sphere distance
 * along the standard 3/4 view direction.
 */
export function computeFitAll(
  positions: ReadonlyArray<Vec3>,
  fovDeg: number,
): CameraPose | null {
  if (positions.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const [x, y, z] of positions) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const maxDim = Math.max(sizeX, sizeY, sizeZ, 1);

  const fov = (fovDeg * Math.PI) / 180;
  const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.6;

  return {
    position: [
      cx + VIEW_DIR[0] * distance,
      cy + VIEW_DIR[1] * distance,
      cz + VIEW_DIR[2] * distance,
    ],
    lookAt: [cx, cy, cz],
  };
}

/** Orbit the camera around a point at a fixed distance along VIEW_DIR. */
export function computeFocusOnPoint(target: Vec3, distance: number): CameraPose {
  return {
    position: [
      target[0] + VIEW_DIR[0] * distance,
      target[1] + VIEW_DIR[1] * distance,
      target[2] + VIEW_DIR[2] * distance,
    ],
    lookAt: target,
  };
}

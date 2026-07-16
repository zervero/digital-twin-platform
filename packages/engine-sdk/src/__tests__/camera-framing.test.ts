/**
 * Camera framing helpers — pure math, no WebGL.
 */
import { describe, expect, it } from 'vitest';

import {
  computeFitAll,
  computeFocusOnPoint,
  computeResetView,
} from '../camera-framing.js';

describe('camera-framing', () => {
  it('resetView returns the default 3/4 camera pose looking at origin', () => {
    const pose = computeResetView([10, 8, 10]);
    expect(pose.position).toEqual([10, 8, 10]);
    expect(pose.lookAt).toEqual([0, 0, 0]);
  });

  it('fitAll returns null when there are no node positions', () => {
    expect(computeFitAll([], 45)).toBeNull();
  });

  it('fitAll frames the bounding box of nodes with padding', () => {
    const pose = computeFitAll(
      [
        [0, 0, 0],
        [4, 0, 0],
        [0, 0, 4],
      ],
      45,
    );
    expect(pose).not.toBeNull();
    expect(pose!.lookAt[0]).toBeCloseTo(2, 5);
    expect(pose!.lookAt[2]).toBeCloseTo(2, 5);
    // Camera sits along the standard 3/4 diagonal, farther than reset.
    expect(pose!.position[0]).toBeGreaterThan(pose!.lookAt[0]);
    expect(pose!.position[1]).toBeGreaterThan(pose!.lookAt[1]);
    expect(pose!.position[2]).toBeGreaterThan(pose!.lookAt[2]);
  });

  it('focusOnPoint aims the camera at a target with a fixed orbital offset', () => {
    const pose = computeFocusOnPoint([3, 1, -2], 5);
    expect(pose.lookAt).toEqual([3, 1, -2]);
    const dx = pose.position[0] - 3;
    const dy = pose.position[1] - 1;
    const dz = pose.position[2] - (-2);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    expect(dist).toBeCloseTo(5, 5);
  });
});

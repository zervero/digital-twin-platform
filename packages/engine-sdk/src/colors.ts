/**
 * Status -> color mapping. Centralized so the renderer stays declarative and
 * a future theme can override it without touching scene code.
 */

import type { DeviceStatus } from '@dt/contracts';

export const STATUS_COLORS: Record<DeviceStatus, number> = {
  online: 0x3fb950, // calm green
  offline: 0x6e7681, // neutral grey
  warning: 0xd29922, // amber
  alarm: 0xf85149, // alarm red
};

export const SELECTION_COLOR = 0x58a6ff;
export const FLOOR_COLOR = 0x161b22;
export const GRID_COLOR = 0x30363d;

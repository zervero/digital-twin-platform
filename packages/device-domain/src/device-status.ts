/**
 * Device status business rules.
 *
 * Status labels come from `@dt/contracts` so the UI kit can render them
 * without depending on this domain package. This module layers behavior
 * (sorting, filtering, detection helpers) on top of those constants.
 */

import { STATUS_LABELS_ZH } from '@dt/contracts';
import type { Device, DeviceStatus } from '@dt/contracts';

const STATUS_PRIORITY: Record<DeviceStatus, number> = {
  alarm: 0,
  warning: 1,
  online: 2,
  offline: 3,
};

export function getDeviceStatusLabel(status: DeviceStatus): string {
  return STATUS_LABELS_ZH[status];
}

export function getDeviceStatusPriority(status: DeviceStatus): number {
  return STATUS_PRIORITY[status];
}

export function isDeviceAlarmed(device: Device): boolean {
  return device.status === 'alarm';
}

export function isDeviceWarning(device: Device): boolean {
  return device.status === 'warning';
}

export function isDeviceOnline(device: Device): boolean {
  return device.status === 'online';
}

export function isDeviceOffline(device: Device): boolean {
  return device.status === 'offline';
}

/**
 * Sort devices so the most urgent appear first: alarm -> warning -> online ->
 * offline, with stable secondary order by name for deterministic output.
 */
export function sortDevicesByPriority(devices: readonly Device[]): Device[] {
  return [...devices].sort((a, b) => {
    const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name, 'zh-Hans');
  });
}

export function filterDevicesByStatus(
  devices: readonly Device[],
  status: DeviceStatus,
): Device[] {
  return devices.filter((d) => d.status === status);
}

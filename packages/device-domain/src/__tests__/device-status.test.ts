import { describe, expect, it } from 'vitest';

import type { Device } from '@dt/contracts';

import {
  filterDevicesByStatus,
  getDeviceStatusLabel,
  getDeviceStatusPriority,
  isDeviceAlarmed,
  isDeviceOffline,
  isDeviceOnline,
  isDeviceWarning,
  sortDevicesByPriority,
} from '../index.js';

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'd-1',
    name: 'CNC-01',
    status: 'online',
    sceneNodeId: 'node-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('@dt/device-domain', () => {
  it('returns Chinese status labels', () => {
    expect(getDeviceStatusLabel('online')).toBe('在线');
    expect(getDeviceStatusLabel('offline')).toBe('离线');
    expect(getDeviceStatusLabel('warning')).toBe('预警');
    expect(getDeviceStatusLabel('alarm')).toBe('告警');
  });

  it('assigns priority alarm < warning < online < offline', () => {
    expect(getDeviceStatusPriority('alarm')).toBe(0);
    expect(getDeviceStatusPriority('warning')).toBe(1);
    expect(getDeviceStatusPriority('online')).toBe(2);
    expect(getDeviceStatusPriority('offline')).toBe(3);
  });

  it('sorts devices with alarm first, then warning, online, offline', () => {
    const devices: Device[] = [
      makeDevice({ id: '1', name: 'A', status: 'online' }),
      makeDevice({ id: '2', name: 'B', status: 'alarm' }),
      makeDevice({ id: '3', name: 'C', status: 'offline' }),
      makeDevice({ id: '4', name: 'D', status: 'warning' }),
    ];
    const sorted = sortDevicesByPriority(devices);
    expect(sorted.map((d) => d.status)).toEqual(['alarm', 'warning', 'online', 'offline']);
  });

  it('does not mutate the input array', () => {
    const devices: Device[] = [
      makeDevice({ id: '1', status: 'offline' }),
      makeDevice({ id: '2', status: 'alarm' }),
    ];
    const snapshot = devices.map((d) => d.id);
    sortDevicesByPriority(devices);
    expect(devices.map((d) => d.id)).toEqual(snapshot);
  });

  it('detects status flags', () => {
    expect(isDeviceAlarmed(makeDevice({ status: 'alarm' }))).toBe(true);
    expect(isDeviceWarning(makeDevice({ status: 'warning' }))).toBe(true);
    expect(isDeviceOnline(makeDevice({ status: 'online' }))).toBe(true);
    expect(isDeviceOffline(makeDevice({ status: 'offline' }))).toBe(true);
  });

  it('filters by status', () => {
    const devices: Device[] = [
      makeDevice({ id: '1', status: 'online' }),
      makeDevice({ id: '2', status: 'alarm' }),
      makeDevice({ id: '3', status: 'online' }),
    ];
    expect(filterDevicesByStatus(devices, 'online')).toHaveLength(2);
    expect(filterDevicesByStatus(devices, 'alarm')).toHaveLength(1);
  });
});

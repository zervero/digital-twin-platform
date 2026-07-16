import { describe, expect, it } from 'vitest';

import type { Device } from '@dt/contracts';

import {
  buildDeviceTree,
  deviceTreeGroupId,
  deviceTreeRootId,
  isDeviceTreeDeviceId,
  type DeviceForTree,
} from '../device-tree.js';

function makeDevice(overrides: Partial<DeviceForTree> = {}): DeviceForTree {
  return {
    id: 'd-1',
    tenantId: 'acme-corp',
    name: 'CNC-01',
    status: 'online',
    sceneNodeId: 'node-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildDeviceTree', () => {
  it('places devices flat under the site root when no line/area is set', () => {
    const devices = [
      makeDevice({ id: 'd-1', name: 'CNC-01' }),
      makeDevice({ id: 'd-2', name: 'CNC-02', status: 'warning' }),
    ];
    const tree = buildDeviceTree(devices, { rootLabel: 'acme-corp' });

    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe(deviceTreeRootId('acme-corp'));
    expect(tree[0]!.label).toBe('acme-corp');
    expect(tree[0]!.kind).toBe('root');
    expect(tree[0]!.children).toEqual([
      { id: 'd-1', label: 'CNC-01', kind: 'device', status: 'online' },
      { id: 'd-2', label: 'CNC-02', kind: 'device', status: 'warning' },
    ]);
  });

  it('groups by line when present, falling back to area', () => {
    const devices: DeviceForTree[] = [
      makeDevice({ id: 'd-1', name: 'A', line: 'Line-B' }),
      makeDevice({ id: 'd-2', name: 'B', area: 'Area-1' }),
      makeDevice({ id: 'd-3', name: 'C', line: 'Line-A' }),
      makeDevice({ id: 'd-4', name: 'D' }),
    ];
    const tree = buildDeviceTree(devices, {
      rootLabel: 'Factory',
      rootId: 'site-1',
    });

    const children = tree[0]!.children ?? [];
    // Groups sort via localeCompare('zh-Hans'): Area-1 before Line-*.
    expect(children.map((n) => n.id)).toEqual([
      deviceTreeGroupId('Area-1'),
      deviceTreeGroupId('Line-A'),
      deviceTreeGroupId('Line-B'),
      'd-4',
    ]);
    expect(children[0]!.children?.[0]!.id).toBe('d-2');
    expect(children[1]!.children?.[0]!.id).toBe('d-3');
    expect(children[2]!.children?.[0]!.id).toBe('d-1');
    expect(children[3]!.kind).toBe('device');
  });

  it('prefers line over area on the same device', () => {
    const tree = buildDeviceTree(
      [makeDevice({ line: 'L1', area: 'A1' })],
      { rootLabel: 'Site' },
    );
    expect(tree[0]!.children?.[0]!.id).toBe(deviceTreeGroupId('L1'));
  });

  it('builds an empty root when there are no devices', () => {
    const tree = buildDeviceTree([] as Device[], { rootLabel: 'Empty', rootId: 'x' });
    expect(tree[0]!.id).toBe(deviceTreeRootId('x'));
    expect(tree[0]!.children).toEqual([]);
  });
});

describe('isDeviceTreeDeviceId', () => {
  it('rejects root and group prefixes', () => {
    expect(isDeviceTreeDeviceId(deviceTreeRootId('a'))).toBe(false);
    expect(isDeviceTreeDeviceId(deviceTreeGroupId('L1'))).toBe(false);
    expect(isDeviceTreeDeviceId('device-1')).toBe(true);
  });
});

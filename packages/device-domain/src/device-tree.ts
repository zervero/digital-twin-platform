/**
 * Pure device-tree grouping for the ops left rail.
 *
 * Devices may carry optional `line` / `area` fields (not yet on the
 * shared Device contract). When present, devices nest under a group
 * node; otherwise they sit flat under the site/tenant root.
 *
 * Tree node ids:
 *   - `root:{id}` — site root (not a device)
 *   - `group:{key}` — line/area group (not a device)
 *   - device.id — leaf device (selectable)
 */

import type { Device, DeviceStatus } from '@dt/contracts';

/** Optional location fields that may appear on API payloads before the contract gains them. */
export type DeviceLocationFields = {
  line?: string;
  area?: string;
};

export type DeviceForTree = Device & DeviceLocationFields;

export type DeviceTreeNodeKind = 'root' | 'group' | 'device';

export type DeviceTreeNode = {
  id: string;
  label: string;
  kind: DeviceTreeNodeKind;
  status?: DeviceStatus;
  children?: DeviceTreeNode[];
};

export function deviceTreeRootId(rootId: string): string {
  return `root:${rootId}`;
}

export function deviceTreeGroupId(key: string): string {
  return `group:${key}`;
}

export function isDeviceTreeDeviceId(nodeId: string): boolean {
  return !nodeId.startsWith('root:') && !nodeId.startsWith('group:');
}

function locationKey(device: DeviceForTree): string | undefined {
  const line = device.line?.trim();
  if (line) return line;
  const area = device.area?.trim();
  if (area) return area;
  return undefined;
}

/**
 * Build a site → (line|area) → device tree. `rootLabel` is the
 * tenant/site display name; `rootId` defaults to the first device's
 * tenantId or `"site"`.
 */
export function buildDeviceTree(
  devices: readonly DeviceForTree[],
  options: { rootLabel: string; rootId?: string } = { rootLabel: 'Site' },
): DeviceTreeNode[] {
  const rootId = options.rootId ?? devices[0]?.tenantId ?? 'site';
  const root: DeviceTreeNode = {
    id: deviceTreeRootId(rootId),
    label: options.rootLabel,
    kind: 'root',
    children: [],
  };

  const groups = new Map<string, DeviceTreeNode>();
  const ungrouped: DeviceTreeNode[] = [];

  for (const device of devices) {
    const leaf: DeviceTreeNode = {
      id: device.id,
      label: device.name,
      kind: 'device',
      status: device.status,
    };
    const key = locationKey(device);
    if (!key) {
      ungrouped.push(leaf);
      continue;
    }
    let group = groups.get(key);
    if (!group) {
      group = {
        id: deviceTreeGroupId(key),
        label: key,
        kind: 'group',
        children: [],
      };
      groups.set(key, group);
    }
    group.children = [...(group.children ?? []), leaf];
  }

  const sortedGroups = [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, 'zh-Hans'),
  );
  root.children = [...sortedGroups, ...ungrouped];
  return [root];
}

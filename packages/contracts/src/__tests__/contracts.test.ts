import { describe, expect, it } from 'vitest';

import {
  DEVICE_STATUSES,
  DIGITAL_TWIN_EVENT_TYPES,
  STATUS_LABELS_ZH,
  type Device,
  type DigitalTwinCommand,
  type DigitalTwinEvent,
  type SceneNode,
  type SceneSnapshot,
} from '../index.js';

describe('@dt/contracts', () => {
  it('exposes the four device statuses', () => {
    expect(DEVICE_STATUSES).toEqual(['online', 'offline', 'warning', 'alarm']);
  });

  it('exposes Chinese status labels for every status', () => {
    expect(STATUS_LABELS_ZH.online).toBe('在线');
    expect(STATUS_LABELS_ZH.offline).toBe('离线');
    expect(STATUS_LABELS_ZH.warning).toBe('预警');
    expect(STATUS_LABELS_ZH.alarm).toBe('告警');
  });

  it('builds a valid Device', () => {
    const device: Device = {
      id: 'd-1',
      tenantId: 'fixture-tenant',
      name: 'CNC-01',
      status: 'online',
      sceneNodeId: 'node-1',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(device.status).toBe('online');
  });

  it('builds a valid SceneSnapshot with typed positions', () => {
    const node: SceneNode = {
      id: 'node-1',
      tenantId: 'fixture-tenant',
      name: 'CNC-01',
      type: 'machine',
      position: [0, 0, 0],
      status: 'online',
    };
    const scene: SceneSnapshot = {
      id: 'scene-1',
      tenantId: 'fixture-tenant',
      name: 'Factory A',
      nodes: [node],
    };
    expect(scene.nodes[0]?.position).toEqual([0, 0, 0]);
  });

  it('accepts optional modelId on SceneNode for viewport assets', () => {
    const node: SceneNode = {
      id: 'node-1',
      tenantId: 'fixture-tenant',
      name: 'CNC-01',
      type: 'machine',
      position: [0, 0, 0],
      modelId: 'dt.machine.cnc-v1',
    };
    expect(node.modelId).toBe('dt.machine.cnc-v1');
  });

  it('narrows DigitalTwinCommand by type', () => {
    const cmd: DigitalTwinCommand = {
      id: 'c-1',
      tenantId: 'fixture-tenant',
      type: 'select',
      nodeId: 'node-1',
    };
    if (cmd.type === 'select') {
      expect(cmd.nodeId).toBe('node-1');
    }
  });

  it('exposes stable event type constants', () => {
    expect(DIGITAL_TWIN_EVENT_TYPES.SCENE_NODE_SELECTED).toBe('scene:node-selected');
  });

  it('narrows DigitalTwinEvent by type', () => {
    const event: DigitalTwinEvent = {
      tenantId: 'fixture-tenant',
      type: 'scene:node-selected',
      payload: { nodeId: 'node-1' },
      timestamp: '2026-07-05T00:00:00.000Z',
    };
    if (event.type === 'scene:node-selected') {
      expect(event.payload.nodeId).toBe('node-1');
    }
  });

  it('narrows device-action DigitalTwinCommand variants', () => {
    const cmd: DigitalTwinCommand = {
      id: 'c-ack',
      tenantId: 'fixture-tenant',
      type: 'acknowledge-alarm',
      deviceId: 'd-1',
    };
    if (cmd.type === 'acknowledge-alarm') {
      expect(cmd.deviceId).toBe('d-1');
    }
    const reset: DigitalTwinCommand = {
      id: 'c-reset',
      tenantId: 'fixture-tenant',
      type: 'reset-device',
      deviceId: 'd-1',
    };
    expect(reset.type).toBe('reset-device');
    const maint: DigitalTwinCommand = {
      id: 'c-maint',
      tenantId: 'fixture-tenant',
      type: 'request-maintenance',
      deviceId: 'd-1',
    };
    expect(maint.type).toBe('request-maintenance');
  });
});

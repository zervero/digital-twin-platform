import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import DtTree from '../DtTree.vue';

const nodes = [
  {
    id: 'site-a',
    label: 'Site A',
    status: 'online' as const,
    children: [
      { id: 'dev-1', label: 'Device 1', status: 'warning' as const },
      { id: 'dev-2', label: 'Device 2', status: 'alarm' as const },
    ],
  },
  { id: 'site-b', label: 'Site B', status: 'offline' as const },
];

describe('DtTree', () => {
  it('mounts and renders node labels including nested children', () => {
    const wrapper = mount(DtTree, {
      props: { nodes, selectedId: 'site-a' },
    });

    expect(wrapper.text()).toContain('Site A');
    expect(wrapper.text()).toContain('Device 1');
    expect(wrapper.text()).toContain('Device 2');
    expect(wrapper.text()).toContain('Site B');
  });

  it('emits select with the node id when a row is clicked', async () => {
    const wrapper = mount(DtTree, {
      props: { nodes, selectedId: 'site-a' },
    });

    const rows = wrapper.findAll('[data-node-id]');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const child = rows.find((r) => r.attributes('data-node-id') === 'dev-1');
    expect(child).toBeDefined();
    await child!.trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['dev-1']);
  });

  it('marks the selected row', () => {
    const wrapper = mount(DtTree, {
      props: { nodes, selectedId: 'dev-2' },
    });

    const selected = wrapper.find('[data-node-id="dev-2"]');
    expect(selected.exists()).toBe(true);
    expect(selected.classes()).toContain('dt-tree__row--selected');
  });

  it('renders a status dot when status is provided', () => {
    const wrapper = mount(DtTree, {
      props: { nodes, selectedId: 'site-a' },
    });

    const onlineDot = wrapper.find('[data-node-id="site-a"] [data-status="online"]');
    const warningDot = wrapper.find('[data-node-id="dev-1"] [data-status="warning"]');
    expect(onlineDot.exists()).toBe(true);
    expect(warningDot.exists()).toBe(true);
  });

  it('uses role=tree only on the root and role=group on nested lists', () => {
    const wrapper = mount(DtTree, {
      props: { nodes, selectedId: 'site-a' },
    });

    const trees = wrapper.findAll('[role="tree"]');
    expect(trees.length).toBe(1);
    expect(trees[0]!.classes()).toContain('dt-tree');

    const groups = wrapper.findAll('[role="group"]');
    expect(groups.length).toBe(1);
    expect(groups[0]!.classes()).toContain('dt-tree__children');
  });

  it('omits aria-expanded until expand/collapse exists', () => {
    const wrapper = mount(DtTree, {
      props: { nodes, selectedId: 'site-a' },
    });

    const items = wrapper.findAll('[role="treeitem"]');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.attributes('aria-expanded')).toBeUndefined();
    }
  });
});

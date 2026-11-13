import { describe, expect, it } from 'vitest';

import { defaultFilterCondition } from '../list-filter-condition.js';
import {
  buildListColumnFilterProps,
  resolveListColumnFilterEditor,
} from '../list-column-filter.js';
import { sampleDefinition } from './helpers/sample.js';

describe('list-column-filter', () => {
  it('uses unified renderer and contains default for text', () => {
    const props = buildListColumnFilterProps(
      { key: 'name', label: 'Name' },
      sampleDefinition,
    );
    expect(props.filterRender.name).toBe('DtListColumnFilter');
    expect(props.filters[0]!.data).toEqual(defaultFilterCondition('text'));
    expect(
      props.filterMethod({
        option: { data: { op: 'contains', value: 'lph' } },
        row: { name: 'Alpha' },
        column: { field: 'name' },
      }),
    ).toBe(true);
  });

  it('respects listFilter editor from column definition', () => {
    const def = {
      ...sampleDefinition,
      list: {
        ...sampleDefinition.list,
        columns: [
          {
            key: 'createdAt',
            label: 'Created',
            listFilter: { editor: 'dateTimeRange' as const },
          },
        ],
      },
    };
    expect(
      resolveListColumnFilterEditor(def.list.columns[0]!, def),
    ).toBe('dateTimeRange');
    const props = buildListColumnFilterProps(def.list.columns[0]!, def);
    expect(props.filterRender.props?.editor).toBe('dateTimeRange');
    expect(
      props.filterMethod({
        option: {
          data: {
            op: 'between',
            value: '2024-01-01',
            value2: '2024-12-31',
          },
        },
        row: { createdAt: '2024-06-01 10:00:00' },
        column: { field: 'createdAt' },
      }),
    ).toBe(true);
  });
});

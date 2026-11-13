import { createApp } from 'vue';
import VxeUI from 'vxe-pc-ui';
import { beforeAll, describe, expect, it } from 'vitest';

import { installDocumentShell } from '../install.js';
import {
  DT_LIST_FILTER_RENDERER_NAMES,
  registerListFilterRenderers,
} from '../register-list-filter-renderers.js';

describe('registerListFilterRenderers', () => {
  beforeAll(() => {
    installDocumentShell(createApp({ render: () => null }));
  });

  it('registers unified column filter renderer', () => {
    for (const name of DT_LIST_FILTER_RENDERER_NAMES) {
      const conf = VxeUI.renderer.get(name);
      expect(conf?.createTableFilterOptions).toBeTypeOf('function');
      expect(conf?.renderTableFloatingFilter).toBeTypeOf('function');
    }
    const conf = VxeUI.renderer.get('DtListColumnFilter');
    const options = conf?.createTableFilterOptions?.({} as never);
    expect(options?.[0]?.data).toMatchObject({ op: 'contains', value: '' });
  });

  it('is idempotent', () => {
    expect(() => registerListFilterRenderers()).not.toThrow();
  });
});

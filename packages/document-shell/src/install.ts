import type { App } from 'vue';
import VxeUI from 'vxe-pc-ui';
import VxeUITable from 'vxe-table';

import 'vxe-pc-ui/lib/style.css';
import 'vxe-table/lib/style.css';
import './styles/island.css';

let installed = false;

/**
 * Install vxe UI/table once on the host Vue app. Styles are further
 * scoped visually by `.dt-document-island` (see island.css).
 */
export function installDocumentShell(app: App): void {
  if (installed) return;
  app.use(VxeUI);
  app.use(VxeUITable);
  installed = true;
}

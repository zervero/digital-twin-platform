/**
 * On-demand Element Plus component styles + theme bridge (SPEC 0003).
 *
 * Order matters: Element's `el-var.css` hardcodes light `--el-*` on `:root`.
 * Import the `--dt-*` bridge *after* those styles so DtDatePicker (and
 * future El wrappers) track product light/dark.
 */
import 'element-plus/es/components/date-picker/style/css';
import './element-bridge.css';

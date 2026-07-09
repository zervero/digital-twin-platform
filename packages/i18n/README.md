# @dt/i18n

Self-hosted, key-based localization for `@dt/app-shell`.

Two locales ship: `en` (default) and `zh-CN`. The locale
choice (`system` / `en` / `zh-CN`) persists in
`localStorage` under `dt.locale.v1`. Composable:

```ts
import { useI18n } from '@dt/i18n';
const { t, locale, setLocale } = useI18n();
t('device.title');            // -> "Devices" or "设备"
t('marketplace.installHint', { permission: 'plugin:publish' });
```

No runtime dependency on `vue-i18n`. Decisions and the
"do not translate" rules live in
[`docs/adr/0018-v3.5-i18n.md`](../../docs/adr/0018-v3.5-i18n.md).

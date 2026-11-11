# SPEC 0004 - Document workbench i18n

## Status

`accepted` (2026-11-11)

## Goal

Make document list/detail chrome and module field/action/option labels
follow the product locale (`en` | `zh-CN`) via `@dt/i18n`, instead of
hardcoded Chinese in `@dt/document-shell` and `@dt/document-modules`.

## Non-goals

- Localizing seed/demo domain *values* (栋舍 names, person names stored
  as filter values) beyond option *display* labels where codes exist.
- Runtime message registration from modules (dictionaries stay in
  `@dt/i18n` for completeness CI).
- Putting locale JSON inside `document-schema` (schema stays UI-agnostic).
- vue-i18n migration.

## Acceptance criteria

- [ ] `@dt/i18n` ships `documents.*` dictionaries (en + zh-CN) covering
      shell chrome, shared actions/validation, and both demo modules.
- [ ] `document-shell` depends on `@dt/i18n` and resolves chrome +
      definition labels through `useI18n().t`.
- [ ] List title uses locale-aware title (`resolveDocumentTitle` /
      `titleLocales` or `titleKey`).
- [ ] `document-schema` validation issues expose `code` + `params`
      (plus a locale-neutral `message` fallback); shell formats with
      `documents.validation.*`.
- [ ] Field / column / action / option definitions may carry
      `labelKey` / `placeholderKey`; shell prefers key → `t()`, else
      `label`.
- [ ] `sow-death` and `sow-breeding` definitions use keys for UI copy.
- [ ] Docs: `workspace.md` allows `document-shell → i18n`.

## Affected packages / surfaces

| Area | Change |
| --- | --- |
| `@dt/i18n` | `documents.json` en/zh-CN |
| `@dt/document-schema` | Optional keys; validation codes |
| `@dt/document-shell` | `t()` wiring + label resolve helper |
| `@dt/document-modules` | labelKeys on definitions |
| `docs/architecture/workspace.md` | Edge update |

## Boundaries

- `document-schema` must not depend on `@dt/i18n` or Vue.
- Modules must not import `@dt/i18n` (keys are plain strings).

## Related

- SPEC 0001 (document workbench)
- ADR 0023 (lightweight SDD)

## Notes

- Agents: new document modules add keys under
  `documents.modules.<typeId>.*` in both locale files before shipping
  Chinese-only labels. This spec is a **standing hard rule** — see
  `AGENTS.md` §3, `.cursor/rules/document-i18n.mdc`, and
  `docs/development/i18n.md` (Document workbench section).

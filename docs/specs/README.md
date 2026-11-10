# Feature specs (lightweight SDD)

Specs are the **behavior contract** for non-trivial work. They answer:
what must be true when we are done, and what is explicitly out of scope.

Architecture rationale still belongs in [ADRs](../adr/). Multi-PR
sequencing can still use [plans](../plans/). See
[ADR 0023](../adr/0023-lightweight-sdd.md).

## When to write a spec

**Required** before implementation for:

- New user-visible workspace / IA behavior
- Auth, roles, permissions, tenant boundaries
- Asset / marketplace / plugin pipelines
- Public API or `@dt/contracts` shape changes
- Cross-package boundary moves

**Skip** for polish, restore-documented-behavior bugfixes, tests, CI, and
dependency bumps with no behavior change.

## Lifecycle

| Status | Meaning |
| --- | --- |
| `draft` | Being written; not binding |
| `accepted` | Binding; implement against this |
| `implemented` | Acceptance criteria met on `main` |
| `superseded` | Replaced by a newer spec (link it) |
| `abandoned` | Will not ship; leave a one-line why |

## How to add a spec

1. Copy [`_template.md`](./_template.md) to `NNNN-<slug>.md` (next free
   number; zero-padded to four digits).
2. Fill goal, non-goals, acceptance criteria, and affected packages.
3. Set status to `draft`, open a PR (or include the spec in the same PR
   as the first implementation commit if the change is small).
4. Promote to `accepted` before treating the work as ready to code
   against. Mark `implemented` when the acceptance checklist is green
   on `main`.

## Index

| Spec | Title | Status |
| --- | --- | --- |
| — | _(none yet — next is `0001`)_ | — |

Historical design notes that predate this folder live under
[`docs/plans/`](../plans/) and remain valid until a new spec supersedes
them.

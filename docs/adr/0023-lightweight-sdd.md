# ADR 0023 - Lightweight Spec-Driven Development (SDD)

## Status

Accepted (2026-11-10).

## Context

The repo already practices a soft form of "design before code":

- Architecture decisions live under `docs/adr/`.
- Larger product work uses paired files in `docs/plans/`
  (`*-design.md` + implementation plan).
- `AGENTS.md` and `docs/development/contributing.md` enforce documentation
  discipline for every change.

What is missing is a **stable, numbered contract** between intent and
implementation: when a feature is required, which document is the source
of truth; when it is done; how AI agents and humans know the acceptance
bar before writing code.

Full Spec Kit / multi-agent SDD stacks would duplicate the plans + ADR
culture we already have and would force ceremony onto polish-sized
changes. We need a thin layer, not a new religion.

## Decision

1. Introduce **`docs/specs/`** as the home for product / behavior specs.
   Specs are numbered `NNNN-<slug>.md` (same sequencing style as ADRs,
   separate counter starting at `0001`).
2. **Specs describe what must be true when done.** ADRs still describe
   *why* we chose an architecture. Plans under `docs/plans/` remain
   optional implementation sequencing for multi-PR work; new work
   prefers a spec first, then a plan only if the delivery needs a
   phased checklist.
3. Spec lifecycle statuses: `draft` → `accepted` → `implemented` →
   `superseded` (or `abandoned`). Only `accepted` specs are binding
   for implementation PRs.
4. **When a spec is required** (must open or update a spec before code):
   - New user-visible workspace / IA behavior
   - Auth, roles, permissions, tenant boundaries
   - Asset / marketplace / plugin pipelines
   - Public API or `@dt/contracts` shape changes
   - Cross-package boundary moves
5. **When a spec is not required:**
   - Pure polish (copy, spacing, favicon, local CSS)
   - Bug fixes that restore documented behavior
   - Tests / CI / dependency bumps with no behavior change
6. Every required-scope PR must cite `SPEC NNNN` (or an accepted ADR that
   embeds the behavior contract) in the PR body. Agents must read the
   cited accepted spec before editing.
7. Template and index live at `docs/specs/_template.md` and
   `docs/specs/README.md`. Do not introduce Spec Kit, OpenSpec, or
   similar tooling in V1 of this decision.

## Consequences

- `AGENTS.md` and `contributing.md` gain a "feature specs" row and a
  short SDD section so agents and humans share one gate.
- Historical `docs/plans/*-design.md` files are **not** rewritten into
  specs. New work uses `docs/specs/`. Existing designs stay valid
  references until superseded by a new spec or ADR.
- Risk of double documentation is managed by keeping specs short
  (goal, non-goals, acceptance) and pointing to ADRs for architecture
  rationale instead of repeating it.
- If the team later wants machine-checkable specs or Spec Kit, that is
  a follow-up ADR — this one deliberately stays markdown + process.

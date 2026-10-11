# INF001 requirements review ledger

## Scope and authorization

2026-10-11: user requested automatic requirement inference and parity with
Effect's route/provision example, then required error composition during
service assembly and business logic. User subsequently authorized review,
adversarial review, ledgering and inclusion in local main, conditional on
meeting the appropriate skill requirements. This authorizes the requirements
brief and its integration; no compiler implementation or remote push.

## Skill audit

- Brainstorming: architectural subject. Intent, baseline, alternatives,
  acceptance and open decisions are recorded in the milestone. The artifact
  is a requirements brief, not a completed/approved language design. User's
  integration request approves preserving this brief; later written-design
  and implementation-plan gates remain in force.
- Requesting-code-review: an independent review is required before main.
  Independent requirements review and a separate adversarial review are
  requested by the user and recorded here. Findings must be disposed of
  before integration; no reviewer changes the shared checkout.
- Verification-before-completion: report actual checks and failures.
  Earlier full verify failed a recorded T007 bound. Do not call that green.
- Writing-plans: deferred until a reviewed and approved language design
  exists. No implementation plan or execution ledger is fabricated.

## Isolation and ownership

Integration starts from main d35edf2 in a temporary local clone. Only INF001
additions are transferred from the dirty fx008 checkout. Existing FX008
Task 6/7 records, its dirty execution ledger, writing files and implementation
worktree are excluded. No active checkout is switched, reset or stashed.
An atomic main reference update must reject a concurrently changed main.

## Review status

- Requirements review: pending.
- Adversarial review: pending.
- Finding disposition and final checks: pending.
- Main integration: pending.

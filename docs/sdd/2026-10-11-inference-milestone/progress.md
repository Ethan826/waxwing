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

- Requirements review: complete, ready to merge; no blocking findings.
  Report: [requirements-review.md](requirements-review.md).
- Adversarial review: complete, ready to merge; one Minor M1 addressed
  with B1-B8 and the handler-site witness, scoped re-review approved.
  Report: [adversarial-review.md](adversarial-review.md).
- Finding disposition and documentation checks: complete.
- Main integration: complete locally; reviewed commit da1b4d0 is in main.

## Finding dispositions

- Independent review's ledger recommendation: review reports and these
  dispositions are recorded before integration.
- Reproducibility recommendation: original exploratory probes remain
  explicitly non-durable, limited evidence. Existing signature tests and
  the original verification log corroborate the boundary; the reviewer
  did not reproduce those seven inputs. Preserve this limit; do not
  promote the exploration to implementation acceptance.
- Adversarial M1: addressed and re-reviewed, as above.
- Handler-site witness: B8 adopted as an explicit future acceptance
  obligation, preserving current semantics unless an intentional change
  is reviewed in the later design.
- Both reviewers' declined-to-judge items: accepted as future design,
  implementation or integration obligations, not silently dropped. No
  current compiler behavior is asserted to satisfy INF001.

## Self-review and workflow completion

Requirements creation and self-review are complete: intent, alternatives,
A1-A10 and B1-B8, compatibility, error families, boundaries, dependencies and
future gates are explicit. No placeholders. Both independent reviews are
complete and their dispositions recorded. No approved architecture or
implementation plan is claimed. The user's conditional integration request
authorizes preserving this reviewed brief in local main; future design
approval is still required before writing an implementation plan.

Fresh isolated verification: build, strict rebuild proof and structural
gates passed. `npm run verify` exited 1 with 957/958 parallel tests passing:
`test/coverage-scale.test.mjs:57` took 7.196051 s against its 5 s bound.
The command stopped before serial tests and regression proofs. No compiler,
test, assertion or bound changed; no failing test was retried. Cause is not
established. Record under T004 for performance investigation.
The unreached serial phase was run separately: 29/29 passed, exit 0.
Regression proof collection was stopped at the user's direction. Partial
output is not a complete regression result; no full proof pass is claimed.

Documentation checks passed: A1-A10, B1-B8, tracking links, placeholder scan
and `git diff --check`; compiler, tests, scripts, dependencies and tool
configuration are identical to main baseline d35edf2.

## User clarification: documentation verification

2026-10-11: user said, "We shouldn't need to run tests to ship
documentation, right?" This directs the scope of verification for this
documentation delivery and overrides applying AGENTS.md's blanket full
verify instruction to it. Compiler tests are not a release prerequisite
for this requirements brief. The executor stopped only its isolated
regression process tree; the other agent's processes and checkout were
untouched. Earlier observed timing failures remain recorded honestly.

Release checks are requirements coverage, independent and adversarial
review, resolved findings, ledger accuracy, link/placeholder checks,
whitespace checks, exact documentation-only commit scope, and verification
that local main contains the resulting commit. All pre-integration checks
are complete. No tests, bounds or compiler implementation changed.

## Integration receipt (2026-10-11)

Local main advanced atomically from d35edf2 to da1b4d0 after confirming
ancestry and that main was not checked out in another worktree. The
expected-old-reference guard succeeded. Main contains the milestone, both
review reports, the follow-up disposition and this ledger.

Before/after checks confirm the shared checkout's HEAD, working status and
index were unchanged. FX008 implementation and execution records were not
imported or overwritten. No remote push. This receipt is a documentation
follow-up to the already integrated reviewed commit.

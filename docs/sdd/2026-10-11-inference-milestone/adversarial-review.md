# INF001 adversarial requirements review

Reviewer: `inf001_adversarial_review`, separate fresh-context subagent.
Date: 2026-10-11. Base: d35edf2; reviewed draft: c4f7931. Read-only.
This report preserves the findings, attack cases and evidence limits.

## Strengths

Seven documentation files, no compiler changes. The brief separates intended
outcome, existing evidence, future design and eventual implementation
verification. Exact residual channels, scoped labels, generic rows, staging,
recursion, explicit contracts and FX008 preservation are normative obligations.
Its construction/input/error distinction matches the cited Effect Layer docs.

## Issues

Critical: none. Important: none for merging a requirements brief.

### M1: explicitly identify broader composition observations

Milestone draft lines 102-126 and 157-160: the completion gate explicitly
maps A1-A10 to tests, but additional composition bullets have no individual
IDs. A later plan might test the route well while giving generic forwarding,
staging, scoped multiplicity or abort marks only incidental coverage.
Assign observations to every bullet when planning. This is a Minor coverage
clarity improvement, not evidence that the requirements allow dropping them.

## Adversarial cases

| Attempted shortcut | Assessment of draft |
|---|---|
| Infer only a local lambda and claim named inference | Closed by outcome, baseline and rejected alternative 3. |
| Require application error sums or widening at every call | Closed by ergonomic requirement and A1. |
| Provide BalanceApi and erase NetworkError | Closed by distinction between provision and operation errors, A3/A5. |
| Drop additional failures introduced by an implementation | Closed by outcome and handler-clause propagation obligation; future design must cover it. |
| Attach ConnectionError permanently to constructed service methods | Closed by setup/invocation distinction and A4. |
| Handle construction errors and erase same-family invocation errors outside that boundary | Closed by A7 and scoped row semantics. |
| Lose direct ValidationError/BusinessRuleError after successful calls | Closed by business-execution requirement and A2. |
| Recovery calls another service or fails but only subtracts the original family | Closed by outcome, A6 and contextual-translation requirement. |
| Recovery re-raises NetworkError and subtraction erases it | Explicitly closed by A6. |
| Replace scoped rows with plain sets | Closed by sharing/multiplicity requirement. |
| Enumerate concrete families inside generic forwarding | Closed by higher-order and open-row requirements. |
| Claim Fail(a) or incompatible Error(Int)/Error(Bool) already work | Closed as a parity claim; identified as a future design question. |
| Move returned/partially applied function errors into construction | Closed by correct-stage latent-channel requirement. |
| Drop recursive constraints to make inference terminate | Closed by termination/source-diagnostic requirement. |
| Lose FX008 marks and allow cleanup through a failing handler | Closed by abort preservation; FX007 repair is not claimed. |
| Compile while losing failures at runtime | Closed by exact channels, executable paths, independent model, generated cases and restored-defect proofs. |

## Handler-site witness for future design

Existing FX001 semantics require an implementation clause's failure to reach
the handler surrounding the implementation installation, rather than an
inner same-family handler surrounding just the operation call:

```text
outer handle E {
  provide handler whose operation raises E {
    inner handle E { invoke operation }
  }
}
```

Evidence: `test/fx-oracle.test.mjs`, "a clause failing past an inner handle
of its family reaches the outer", and FX008's rejection of putting clause
Fail labels in the body's row. The milestone's scoped-occurrence,
handler-clause and FX008 obligations do not authorize changing this. Pin
the witness in later design, or explicitly review an intentional change.
No proven conflict was found in the brief.

## Verification and limits

Confirmed draft HEAD; inspected full diff, FX001/FX008 design sections,
relevant checker code and signature/handler/failure/oracle tests.
`git diff --check BASE HEAD` passed. Working tree stayed clean.
No build, probes, runtime tests or full verify run by this reviewer;
historical counts and timing cause were not independently reproduced.

## Declined to judge

- Syntax and solver correctness: no implementation or approved design.
- Principal schemes, generalization, recursion and exported representation:
  explicitly deferred design decisions.
- Compose versus reject incompatible same-family payloads: explicit design
  question; universal error-union parity is not claimed.
- Module-interface scheduling: resolve with M001 during planning.
- Full lifecycle, memoization, cancellation, async, general resumable
  handlers and value-level extensible variants: separate projects.
- FX008 implementation completion and FX007 bracket soundness: separate
  work; only preservation requirements reviewed here.
- Historical probe counts and failure cause: not reproduced, no false green
  claim in the milestone.

## Assessment

Ready to merge: **Yes, as a requirements brief**. No proven blocking gap.
Merging records the target and gates, not language-design approval,
compiler-implementation authorization or established Effect parity.

## Scoped follow-up: M1 disposition

The same adversarial reviewer read only the milestone's follow-up diff.
M1 **addressed**: B1-B8 have individual IDs; each requires exact compile-time
observations and executable tests, with incidental generated coverage alone
insufficient. B8 accurately captures the existing handler-site witness.
No new issue. Ready to merge: **Yes, as a requirements brief**. Read-only.

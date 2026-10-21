# C001 design tranche handoff

2026-10-21. Review branch `design/c001-explicit-evidence`, worktree
`/private/tmp/waxwing-c001-design`, base `5a46e96`. Commit only this
tranche's files. No merge or push. No compiler changes, Lean work,
language-policy adoption or resumed record-composition research.

Start with [README](README.md), whose four decisions are the requested
author review. It compares ordinary operation records and dedicated class
evidence without selecting either. The remaining artifacts provide:

- [Programs](programs.md): proposed sum/product/last, generic clients,
  fixed-field composition, returned captures, two same-typed evidence
  operands, specialization observations and negative/boundary cases.
- [Core](core.md): annotated rank-1 rules, explicit construction/projection,
  ordinary value passing and the proposed type-specialization contract.
- [Collections](collections.md): exact/folded equality, up/down ordering,
  lookup/update, explicit destination rebuilding, collisions, cross-module
  transfer and alternatives for future structural merge compatibility.
- [Sources](sources.md): primary rules read, local adaptations, novelty
  audit and input status cautions; [input hashes](inputs.json) identify the
  consulted versions, including uncommitted direction/assurance inputs.
- [Assurance](assurance.md): separate typing, evaluation, selection,
  termination and algebraic-law obligations; soundness versus completeness;
  proposed evidence gates and current print/comparison overlap.
- [Review](review.md): before/after Humanizer/Garner catalogues and all
  five independent adversarial findings, fixes and re-review.

## Review-sensitive limits

A record's phantom carrier can disappear; nominal evidence preserves that
index. To avoid dictionary-origin tracking, the small annotated core rejects
residual metas in all expressions/reference instantiations. This is a
proposed conservative boundary, not a change to P001's existing
unconstrained-hole behavior. Written type vectors are illustrative ways to
resolve otherwise unconstrained phantom instantiations.

Retaining a dictionary governs lookup/update. It does not justify raw
structural merges. The proposed cross-policy operation enumerates and
rebuilds under an explicit destination, with explicit collision order and
representative retention. Production constructor hiding requires a future
collection-library/M001 decision. The proposal's invariant assumes lawful,
stable terminating key operations; purity alone does not establish that.

The independent reviewer found no remaining soundness counterexample in the
reviewed fragment. Preservation, relative checking completeness and
specialization correspondence remain arguments to write and review. No
universal result follows from this review or the bounded probe.

## Checks actually run

From the isolated worktree:

```text
python3 docs/plans/2026-10-21-c001-explicit/probe.py
node scripts/width.mjs
git diff --check
```

The [probe](probe.py) passed all its frozen selected observations; output is
retained in [probe-results.txt](probe-results.txt). It evaluates selected
numeric/value-flow cases, retained equality, update/rebuilding and the
ascending-tree/descending-search failure. Stats checks component results
only; the P4 check uses projections, not the generic helper. It detects
per-carrier default replacement changing 6 to 5. Python uses small integers
here, so this does not validate Waxwing overflow or numeric laws. It parses
no Waxwing and establishes no typing, compiler or lowering result.

The width check reports zero lines over 80 columns across the worktree. No
whitespace errors were reported by the final staged diff check. A
tranche-local relative-link check passed for Markdown links. No npm
verification or Lean build ran. The probe is an exploratory model, not a
compiler implementation.

The original checkout's consulted file hashes remained unchanged after
commit. All original status entries remained except one untracked Claude
agent-worktree entry, `.claude/worktrees/agent-a3a836bc18c839110/`, which
was no longer listed at the final comparison. This task issued no removal
command or source-file edit there; the concurrent workspace can advance.
Only the isolated branch's new tranche files were staged/committed. Shared
backlog, progress, handoff, provenance and direction files were not edited;
coordinate with their owner before adding links or status updates there.

## Next authorized action

Review the four decisions in README. Acceptance of this design would not
itself authorize compiler implementation or new proofs. After the author
chooses a representation and scope, write the required arguments and
implementation/evidence plan under a separate authorization. Do not make
that plan depend on unfinished record-solver internals.

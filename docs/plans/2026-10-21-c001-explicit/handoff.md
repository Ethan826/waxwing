# C001 design tranche handoff

2026-10-21. Review branch `design/c001-explicit-evidence`, worktree
`/private/tmp/waxwing-c001-design`, rebased onto `c341109` after the
original `5a46e96` base. Only this tranche's files belong to its commits. No
merge or push. No compiler changes, Lean work, language-policy adoption or
resumed record-composition research.

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
only; the P4 check uses projections, not the generic helper. It demonstrates
that sum and product choices yield 5 and 6, and that relabelling a tree's
policy can miss key 3. It constructs no default-replacement evaluator and
runs no mutants. Python uses small integers here, so this does not validate
Waxwing overflow or numeric laws. It parses no Waxwing and establishes no
typing, compiler or lowering result.

The width check reports zero lines over 80 columns across the worktree. No
whitespace errors were reported by the final staged diff check. A
tranche-local relative-link check passed for Markdown links. No npm
verification or Lean build ran. The probe is an exploratory model, not a
compiler implementation.

At the original delivery, the consulted source file hashes remained
unchanged after commit. All original status entries remained except one
untracked Claude agent-worktree entry,
`.claude/worktrees/agent-a3a836bc18c839110/`, which was no longer listed at
the final comparison. This task issued no removal command or source-file
edit there; the concurrent workspace can advance. Only the isolated branch's
new tranche files were staged/committed. Shared backlog, progress, handoff,
provenance and direction files were not edited; coordinate with their owner
before adding links or status updates there.

## Next authorized action

Review the four decisions in README. Acceptance of this design would not
itself authorize compiler implementation or new proofs. After the author
chooses a representation and scope, write the required arguments and
implementation/evidence plan under a separate authorization. Do not make
that plan depend on unfinished record-solver internals.

## Author-review revision

Replaced invented local `where fn` helpers with existing capturing lambdas;
the expected types keep the enclosing signature's rigid variables in scope.
A examples use ordinary colon-field records. B's nominal constructor is
shown separately and remains unselected. Removed the unused `using` binder
and lastFor's inference-only seed; decision 2 now concerns scope. Both probe
counterexamples are labelled demonstrations.

Read dossier §18.29-§18.31 and rebased this branch onto `c341109` without a
merge commit. The C001 request in this chat separately authorizes design
comparison of dedicated evidence. It grants no implementation approval.
Generic code relies on written interfaces under opaque rigid variables;
operation dictionaries provide no row-decomposition or shape evidence.
Follow-up input hashes are in [revision-inputs.json](revision-inputs.json).

The earlier missing agent-worktree entry remains absent from Git's current
worktree list. This read-only glance cannot establish who removed it; no
cleanup or recovery was attempted by this task.

## Executable ordinary-record baseline

The author then approved a separate bounded probe tranche. Its
[report](baseline/README.md), [runner](baseline/run.mjs), fixtures and raw
evidence are confined to baseline/. The compiler sources remain unchanged at
c341109; a fresh private build reports zero warnings/errors.

Twenty-one sources were examined, with staged amendments recorded before
their runs. Eleven generated programs produce expected Go output under both
Int and Bool hole representatives. Eight of those also agree with the
existing interpreter on the exact source. Six candidates reject because an
earlier operation stage remains ambient; three accepted cases with explicit
per-stage rows exceed the interpreter parser's grammar. The c7 Stats result
still has an ambient first stage. The runner exits 1 with those nine unmet
expectations. No assertion was weakened to make it green; see the raw
reports and local backlog.

These observations show useful A behavior already exists. They motivate
reviewing the all-meta restriction but adopt no new policy or typing rule.
No class implementation, record-composition solver change, shared-file edit,
Lean work or npm verification ran. Checkpoint and hash manifests record the
exact compiler used; no mutable shared output was loaded.

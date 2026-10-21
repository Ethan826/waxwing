# C001 design tranche handoff

2026-10-21. Review branch `design/c001-explicit-evidence`, worktree
`/private/tmp/waxwing-c001-design`, rebased onto `c341109` after the
original `5a46e96` base. Only this tranche's files belong to its commits. No
merge or push. The author approved the design direction recorded below. No
compiler changes, Lean work or resumed record-composition research.

Start with the [author rulings](README.md): A is selected, the pure closed
rank-1 scope is approved, and the unknown-type rule is held open. Retained
collection policies with explicit rebuilding, runtime dictionary passing
and the separate assurance gates are approved as design direction.
Dedicated class evidence and structural reuse remain deferred. These
rulings authorize no compiler implementation or new proofs. The remaining
artifacts provide:

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
index. The small annotated model proposed rejecting residual metas in all
expressions/reference instantiations to avoid dictionary-origin tracking.
The author held this conservative boundary open. It is not a change to P001's
existing
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

## Recorded ruling and remaining work

The author agreed to the four recommended rulings in this chat on
2026-10-21 and asked that they be recorded. The remaining design question is
the operation-specific ambiguity boundary: specify permitted operations
and admissible stand-ins, accounting for h1/h2 printability. The blanket
all-meta restriction is not adopted. Further design, implementation plans,
compiler work and new proofs require separate authorization. Keep future
work independent of unfinished record-solver internals.

## Author-review revision

Replaced invented local `where fn` helpers with existing capturing lambdas;
the expected types keep the enclosing signature's rigid variables in scope.
A examples use ordinary colon-field records. B's nominal constructor is
shown separately; it was unselected at that revision and is now deferred.
Removed the unused `using` binder and lastFor's inference-only seed; decision 2
now concerns scope. Both probe
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

## Executable ordinary-record baseline and review corrections

The author wrote "Okay, do it" after the proposal to translate P1-P4, probe
explicit choices and captures, challenge the all-meta restriction, and
commit programs/report. The intervening scope clarification excluded
compiler changes, shared documents, class machinery and record-solver work.
That is the approval this handoff records; it is not acceptance of the four
design decisions or any language-policy change at that stage. The later
author rulings are recorded at the start of this handoff.

The [report](baseline/README.md), [runner](baseline/run.mjs), fixtures and
raw evidence stay within the tranche. Unchanged c341109 compiler sources
were built privately with zero warnings/errors. The earlier exploratory
runner always exited 1; its report is retained as pre-review-results.json.
The revised runner pins actual current outcomes and exits 0 on a match, with
separate compiler, Go, specialization and interpreter observations. A new
difference exits 1. Eight deliberate result-record mutations test that exit
gate; they are not compiler or source mutation proofs.

The reviewed set has 24 fixed sources and five stand-ins: Int, Bool, Text,
record and pure function. Thirteen sources compile by default; 63 Go
executions match expected output. Ten accepted sources have exact-source
interpreter agreement; c7-c9 retain known parser errors. Six written
contracts remain rejected, alongside five builtin/syntax rejections. The
three original discarded/unused/phantom observations are acceptance evidence
only. h1/h2 put an unknown element type under printing and reject the
function stand-in during specialization. The separate uniformity gate exits
1 on these known acceptance differences; no wrong runtime value or
type-safety defect is shown. No replacement ambiguity policy is adopted.

The broader [effects-syntax finding](effects-syntax-usability.md) is now a
separate note for the author, beyond CB002's local diagnostic entry. No
compiler implementation, record solver, shared tracking file, Lean proof,
merge,
push or npm verification is included in the corrections.

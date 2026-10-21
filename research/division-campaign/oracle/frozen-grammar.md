# Typed oracle confirmation run: grammar, bounds and problems, frozen

Stream 4 of the parallel campaign (dossier §18.13). This file is
committed alone, before any run of the new problems, so the history
shows it came first. Base commit: `b5647cc`. Nothing below may change
during the run. If a gap appears, it is reported as a finding, and any
amended grammar is run separately and labelled as amended (§18.13: "the
amended-grammar runs are exploratory evidence; future confirmation runs
freeze their grammar beforehand").

**Disclosure.** Before writing this file I reran §18.9's existing
amended part B (`node nested-oracle.mjs B amended`, eight shards) only
to time it: 29 problems, all `agree`, as §18.9 reports; slowest shard
243 s. No new problem was classified before this file was committed.
To fix the problem set, the new files were loaded and the problems
listed (`list` mode, which classifies nothing).

## Code, fixed by hash

The run uses these files. The new files are committed after this one;
their SHA-256 must match.

| File | SHA-256 |
|---|---|
| division-campaign/oracle/d3-challenges.mjs (new) | `199e929874541c0c57e545c5b942b08bea5add5e94389a065af3d694f8692e76` |
| division-campaign/oracle/d3-grammar.mjs (new) | `3ff0998a3ffa5cd1c62093304f087e7532b87415a3c87e255dc5a0ed10c1fed5` |
| division-campaign/oracle/d3-oracle.mjs (new) | `54c558d7543b849cab13f3766d7286f81355bb9b1d540b37ca646dfe62402edb` |
| division-campaign/oracle/d3-set.mjs (new) | `d494a5e4b5261c4abfb5424e49d02a8380519295214bacc1a7f6951aa19ea2cd` |
| composition-assessment/sig-oracle/semantics.mjs | `dbccfc1712e2b3ecd316d0e0bbe52d2c46d69468b54b6109bcff8856270f7d62` |
| composition-assessment/sig-oracle/bounded.mjs | `6dd67cafa2caf57123fcb48a91bac82d9d46aba177d4e01349c73160c0a69a7f` |
| composition-assessment/sig-oracle/p9s.mjs | `ba680b815d133b448c55b7931126b7690596400621bd1cf2c7a666a1fa2696cf` |
| composition-assessment/sig-oracle/nested-templates.mjs | `38a00a7b97667658095b40a5e17be25705beaa3212f78b4615dbe162b7b08af8` |
| composition-assessment/sig-oracle/nested-search.mjs | `689fc79995fb092a7b8c4171ee05264f3e8629bc99a5fbdcdd124611b96ab64b` |
| composition-assessment/sig-oracle/nested-brute.mjs | `ca21c63b582346e0a7d01a6c9d30c2bc4842239f4179189a1bfcf32ef4c8a0dc` |
| composition-assessment/sig-oracle/nested-oracle.mjs | `208cb97dacd032a5ca05bb181d8af5d6d75043f83f960257a655e3ae05730355` |

Paths are relative to `research/`. No existing oracle file is edited.

## The grammar (dossier §18.8, amended as in §18.9 item 3)

- **Leaves**, per written-label pattern `π`: `A(r, l)` (rigid row `r`'s
  field at written label `l`, for each `r` and `l` with `π(r, l)`),
  `T(n)` for each rigid type variable `n`, and a ground `g` for each base
  type written in the problem plus `Int` and `Bool`.
- **Skeletons** `Sk(P)`: the constructor shapes of the problem's own
  type subexpressions in `D` and `B` (every subexpression of every
  equation). A base type or type variable is a hole; an arrow's
  skeleton is the arrow of its parts' skeletons; a record's skeleton is
  its written labels, each with its field's skeleton, and whether it has
  tails.
- `Temp₀` = leaves. `Temp_{k+1}` = `Temp_k` together with every skeleton
  filled as follows: holes from `Temp_k`; each record node with tails
  gets (i) a **cell map**, giving each Venn cell `S` of the rigid rows
  (a nonempty set of rigid rows) absent or one source row in `S`, and
  (ii) **(the amendment)** at each written label its skeleton does not
  write, absent or a leaf from `Temp₀`. A record node without tails
  gets neither.
- **Flexible type variables** range over `Temp₂`. **Flexible rows**: at
  each written label, absent or a template from `Temp₁`; plus a cell map.
- **Instantiation** at a rigid assignment `θ`: a cell-map entry `S ↦ r`
  copies `θ(r)`'s field at every unwritten label whose Venn cell under
  `θ` is `S`; `A(r, l)` is `θ(r)(l)`; `T(n)` is `θ(n)`.
- **Uniformity**: per pattern, one template for every rigid assignment
  of the pattern that satisfies `D`, fixed before any assignment is
  seen. It may not vary with nested field values or their equalities.
- "Exhaustive" means exhaustive within this grammar and these bounds:
  a separation found inside it is real for the grammar; none found says
  nothing about witnesses outside it (shapes the problem never writes,
  nesting beyond `Temp₂`, leaves other than those above at
  tail-node written labels).

Implementation: `findNested(P, π, written, rigids, { tailWritten: true },
2)` (nested-search.mjs, the decomposed search of §18.8-18.9) for the
verdicts; `bruteNested` (nested-brute.mjs, no decomposition) for the
cross-check.

## Bounds (dossier §18.8)

- Labels: the problem's written labels plus `z1`, `z2`.
- Rigid row fields: absent, `Int` or `{q:Int}`.
- Rigid type variables: `Int`, `Bool`, `{}`, `(Int->Int)`, `{q:Int}`.
- Bounded validity's flexible domain: rows map labels to absent, `Int`,
  `Bool`, `{}`, `(Int->Int)`, `{q:Int}`; flexible type variables range
  over those five values plus the values of the body's subexpressions
  free of flexible type variables (`builtValues`).
- Per-problem overrides, fixed here and in the files:
  - `division-record-rigid-var` (existing, §18.9): type values `Int`,
    `{}`, `{z1:Int}`, `{z2:Int}`, `{z1:Int,z2:{q:Int}}`.
  - `tyvar-nested-hyp-divided`, `tyvar-divided-undeclared`: the same
    list (so `α` can equal a rigid row).
  - `tyvar-two-rows-hyp`: the same plus `{z1:Int,z2:Int}`.
  - the four `three-rows-*` problems (four flexible rows): flexible
    field types `Int`, `{q:Int}` only (the rigid field types). This
    shrinks only bounded validity's flexible domain, so it can only
    turn a verdict into a bounded-invalid one, which the POWER check
    below then tests.
  - generated problems: type values `Int`, `Bool`, `{}`, `(Int->Int)`,
    `{q:Int}`, `{z1:Int}`, `{z1:Int,z2:{q:Int}}` (record values, so
    `α = { ...r }` has instances).
- Separations are rechecked for bounded validity with a third unwritten
  label `z3`.

## Classifications (as nested-oracle.mjs, restated in d3-oracle.mjs)

Per problem: bounded validity; P9s at the same bounds; then

- bounded invalid at `θ*`: one template search at `θ*` alone. A template
  there is `POWER: bounded domain` (uniformity unknown); none and P9s
  valid is `BUG: P9s valid, bounded invalid`; otherwise `agree`.
- bounded valid: the uniform search per pattern. No template and P9s
  valid is `FLAG: P9s witness outside the grammar, or a P9s defect`; no
  template otherwise is `SEPARATION: type-dependent` if every
  assignment has its own template, else `SEPARATION: beyond the
  grammar`; a template is `agree`.
- Separately, each named problem's prediction `[bounded, template,
  P9s]` is compared; a wrong prediction is a finding, not a failure.
- Any non-`agree` kind is minimized (drop `B` atoms, then `D` atoms,
  while the kind persists; then try one unwritten label, rigid fields
  `Int` only, type values `Int`, `{}`, flexible fields `Int`, `{}`).

## Problem set

**Named, 75 problems** (`node d3-oracle.mjs list named`, SHA-256 of the
output `97bfda6e88fa868515d048c718f1601725e464d6f5164a9dfc70b1db9e5121ed`).
Predictions as bounded/template/P9s: V valid, I invalid; F found, N
none; P P9s valid, U unresolved. Existing problems keep their files'
predictions (template found iff valid, since no separation is
predicted; P9s from their files, or from §18.7 and §18.9 where the file
records none). `split` appears twice (typed and first-pass files).

| Source | Problems and predictions |
|---|---|
| typed-challenges.mjs (§18.7) | `shared-part` I/N/U, `shared-part-equal-rows` V/F/U, `shared-part-no-disjoint` V/F/P, `agreement-hypothesis` V/F/U, `split` V/F/U, `split-undeclared` I/N/U |
| challenges.mjs (18 first-pass, 5 nested) | `alias` I/N/U, `alias-declared` V/F/P, `alias-chain` I/N/U, `compose-undeclared` I/N/U, `equal-rests` I/N/U, `self-disjoint` I/N/U, `rigid-type-eq` I/N/U, `rigid-type-free` V/F/P, `rec-sig` I/N/U, `arrow-sig` I/N/U, `lacks-declared` V/F/P, `lacks-missing` I/N/U, `split` V/F/U, `types-differ` I/N/U, `types-independent` V/F/P, `empty-split` V/F/P, `forced-empty` I/N/U, `nested-same` V/F/P, `nested-two` I/N/U, `tyvar-field` V/F/P, `nested-alias` V/F/P, `nested-alias-undeclared` I/N/U, `tyvar-nested-rest` V/F/P |
| source-boundary.mjs (§17) | `src-greeting` V/F/P, `src-mark` V/F/P, `src-markForwarded` V/F/P, `src-join` V/F/P, `src-forwarded` V/F/P, `src-join3` V/F/P, `src-both` V/F/P, `src-wrapAccepts` V/F/P, `src-undeclaredMerge` I/N/U, `src-missingField` I/N/U, `src-route` V/F/U, `src-routeNarrowed` V/F/P |
| nested-challenges.mjs (§18.8-18.9) | `division-in-field` V/F/U, `division-in-function` V/F/U, `division-record-rigid-var` V/F/U, `nested-agreement` V/F/U, `nested-agreement-missing` I/N/U, `function-from-rigid` V/F/P, `record-from-rigid` V/F/P, `nested-rigid-mismatch` I/N/U |
| d3-challenges.mjs (new) | `agree-some-cells` V/F/U, `agree-some-cells-bad` I/N/U, `agree-unforced-pair` I/N/U, `agree-nested-hyp` V/F/U, `tyvar-nested-hyp-divided` V/F/U, `tyvar-divided-undeclared` I/N/U, `tyvar-two-rows-hyp` V/F/U, `division-depth2` V/F/U, `division-depth2-undeclared` I/N/U, `division-depth2-tyvar` V/F/U, `fn-around-divided` V/F/U, `fn-around-divided-bad` I/N/U, `fn-codomain-divided` V/F/U, `three-rows-shared` V/F/U, `three-rows-shared-undeclared` I/N/U, `three-rows-all-equal` V/F/U, `three-rows-partial-hyp` I/N/U, `three-compose` V/F/P, `vacuous-D` V/F/U, `vacuous-pattern` V/F/U, `vacuous-tyvar` V/F/U, `written-in-nested-tail` V/F/P, `written-in-nested-tail-undeclared` I/N/U, `written-label-in-nested-tail-of-flex` V/F/P, `written-in-nested-tail-forced` V/F/U, `written-in-nested-tail-forced-bad` I/N/U |

The new challenges, by the categories asked for (rigid rows `r s t q` =
0 1 2 7; flexible `u v w x` = 3 4 5 6; `α` rigid, `β` flexible); each
problem's argument is in its file:

- *Agreement on some cells only*: `r = s ⊎ t` makes `r`, `s` agree on
  `s` but says nothing of `q` (`agree-some-cells`, with `s disjoint q`,
  valid; `-bad` and `agree-unforced-pair`, invalid); the same hypothesis
  stated inside a field (`agree-nested-hyp`).
- *Record-valued rigid type variables divided by another row*: `α` tied
  to `r` by a nested hypothesis `{ f: α } = { f: { ...r } }` (§18.10's
  D3b remark), or `α = r ⊎ s`; the control without the hypothesis.
- *Division at depth 2*: `{ f: { f: { ...r } } }` split, and `β` built
  at depth 2; the undeclared control.
- *Function types around divided rows*: domain split with the part
  returned in the codomain; codomain split beside `α`; a broken one
  that needs `s ⊆ r`.
- *Shared field types across three rigid rows* (four flexible rows):
  `r = s ⊎ t` with parts shared pairwise; `r = s = t`; `r = s` only
  (broken); undeclared (broken); a P9s-certified three-way composition.
- *Vacuous `D`*: unsatisfiable rows, an unsatisfiable type variable,
  and a hypothesis that empties all patterns but one.
- *A written label inside a nested tail*: `{ f: { a: Int, ...r } }`
  (P9s-certified) and its undeclared control; `{ f: { ...r } }` in a
  flexible type variable where `r` may hold written `a` and `f` (needs
  the amendment); `{ g: { ...r } } = { g: { a: β, ...u } }` with
  `r = { a: α, ...s }` declared, and undeclared.

**Generated, 240 problems**: `d3Generator` (d3-grammar.mjs), seeds 5
and 13, 120 problems each, bounds as above. Listing hashes
(`node d3-oracle.mjs list gen 120 <seed> | shasum -a 256`): seed 5
`055f87cfbb5e4c886fe2ce53566244fa1cf154fbd6fe2d3b04fc2ad3d8ab60cb`,
seed 13 `45b251e7b004ad93ed724cd96c2c2d0295ced1f5250df10243648bb7c1310365`.
The generator's grammar is stated at the head of its file: one written
label `f` used as field and nesting label; rigid rows 0, 1 (2 with
probability 0.15); flexible rows 3, 4 (5 with probability 0.25, not
with three rigid rows); `α` with probability 0.3 (not with three rigid
rows); `β` with probability 0.5; clauses `disjoint`, `lacks f`, `r = s`,
`r = s ⊎ t`, `{ f: { ...r } } = { f: { ...s } }`, `α = { ...r }`; one
to three body atoms: splits (of a rigid row or `α`) and aliases wrapped
in nothing, a field, a field of a field, or an arrow's domain;
`disjoint`; `lacks f`; a written field at `Int`, `α` or `β` beside a
flexible tail; `β` equated with a wrapped flexible row or an arrow
between flexible rows. Generated problems carry no prediction; the
expected outcome is no `SEPARATION`, `FLAG`, `POWER` or `BUG`.

## Cross-checks

1. **Part A** (decomposed search against the first-pass engine, the 36
   first-pass named problems, first-pass bounds):
   `node nested-oracle.mjs A amended`. Expected: 0 mismatches.
2. **Part C** (decomposed against brute force, the six problems of
   §18.9): `node nested-oracle.mjs C amended`. Expected: 0 mismatches.
3. **Brute force on everything small enough**:
   `node d3-oracle.mjs brute named` and `brute gen 120 <seed>`. A
   problem is run when its brute-force bound (per pattern, shape and
   cell-map combinations times rigid assignments, summed) is at most
   5·10⁷; otherwise it is listed as skipped with its bound. Expected: 0
   mismatches.

## Power checks (scratch copies, deleted afterwards)

Copies of `research/composition-assessment/sig-oracle` and
`research/division-campaign/oracle` only, with one mutation each, run
on the named set:

- **M1** arrows become holes in `skel` (no function skeletons).
  Expected: `division-in-function` reported `SEPARATION`;
  `function-from-rigid` reported `FLAG`.
- **M2** a cell-map entry may only copy the **highest-numbered** row of
  its cell (nested-search.mjs `solveCell`). Expected: `split` (both),
  `src-route` and the new division problems reported `SEPARATION`, and
  the minimizer shrinks at least one.
- **M3** every cell block accepted without checking (`solveCell`
  returns true). Expected: broken controls with cell-dependent
  counter-instances (for example `agree-some-cells-bad`,
  `three-rows-shared-undeclared`, `shared-part`) reported `POWER`.

## Limits on the run

Each shard is capped at about 30 minutes; a shard that does not finish
is reported with the problems it did not complete, and bounds are not
changed to make it finish. Shards: `--shard=i/n`, every n-th problem.

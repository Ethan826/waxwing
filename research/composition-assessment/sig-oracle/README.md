# Bounded ∀∃ oracle for signature problems

Compares P9s, the candidate sound and incomplete signature checker of
docs/plans/2026-10-20-record-composition-dossier.md (§13.4, §13.7), with
bounded evaluation of signature validity (§13.1; Lean `Valid`). Research
only; not part of `npm run verify`. Bounded evidence, not proof.

## Files

- semantics.mjs: the ground semantics of the call-site language,
  mirroring Composition/Syntax.lean (ground values as canonical strings;
  a record is undefined if two of its parts share a label).
- bounded.mjs: bounded validity.
- p9s.mjs: P9s in its generic model.
- challenges.mjs, run-challenges.mjs: 20 hand-written challenges with
  predicted verdicts and arguments.
- grammar.mjs: the seeded generators (plain and split-biased).
- generate.mjs: comparison and minimization over generated problems;
  writes discrepancies.json. discrepancies-split.json keeps the
  split-biased run.
- interpret.mjs, check-interpretation.mjs: the interpretation `h` of
  dossier §14.3 and a direct check of its lemmas (below).
- deliberate.mjs: hand-built certificates for cases the search never
  produces (dossier §14.8).
- source-boundary.mjs, run-source-boundary.mjs: Waxwing functions with
  hand-translated signature problems (dossier §17), against predicted
  verdicts.
- export-lean.mjs: writes the certificates the search finds as Lean
  data (research/composition-proofs/Composition/Sig/CheckData.lean) for
  the verified checker (dossier §15.8). The search stays untrusted:
  Lean's `checkAll` decides whether to believe each certificate.

Run (from this directory): `node run-challenges.mjs`;
`node generate.mjs 3000 7`; `node generate.mjs 5000 11 split`;
`node check-interpretation.mjs 1000 5`;
`node check-interpretation.mjs 300 9 larger`;
`node check-interpretation.mjs 0 5 mutant`;
`node check-interpretation.mjs 300 5 rich`; `node export-lean.mjs 100 7`;
`node run-source-boundary.mjs`.

## The bounded semantics

- **Labels**: those written in the problem plus two unwritten labels,
  `z1` and `z2`.
- **Rigid rows** (∀): every map from those labels to absent, `Int` or
  `Bool`.
- **Rigid type variables** (∀): `Int`, `Bool`, `{}`, `(Int->Int)`.
- **Flexible rows** (∃): every map from those labels to absent, `Int`,
  `Bool`, `{}` or `(Int->Int)`.
- **Flexible type variables** (∃): the four values above, plus the
  values of the body's subexpressions that mention no flexible type
  variable, under the rows being tried (so a nested record the problem
  builds is available).
- A problem is **valid in the bounded model** if every rigid assignment
  satisfying `D` has a flexible assignment satisfying `B`. **Invalid in
  the bounded model** reports the rigid assignment found. It is a
  candidate counter-instance, not a signature failure: a valid witness
  may need a deeper type or more labels. A reported flexible solution
  is checked directly.

## P9s, as bounded here

For each presence pattern of the rigid rows over the written labels
consistent with `D`, rigid row `r` becomes its present labels at atoms
`A{r}{l}` plus a rest label `ρ{r}` at atom `R{r}`; rigid type variable
`n` becomes atom `T{n}`. Flexible rows may hold `ρ{r}` only at `R{r}`
(the rest wholly or not at all) and any other label at the flexible
types or the atoms. Side condition: two different rests in one row, in
one composition, or on the two sides of a `disjoint` atom need a
declared `disjoint` between their rigid rows. Valid iff every pattern
has a flexible solution; otherwise Unresolved. The flexible search is
bounded as above, which can only make P9s answer Unresolved more often,
never valid wrongly.

## Grammar of generated problems

Rigid rows 0, 1 (and 2 in a third of problems); flexible rows 3, 4;
written label `a`; optional rigid type variable 0 and flexible type
variable 1. `D`: `disjoint` between rigid rows and `lacks a`, each with
probability 0.3. `B`: one to three atoms: equations between record
types (optional field `a` at `Int`, `Bool` or a type variable; up to
two tails), an equation between a type variable and a record type,
`disjoint` between two rows, or a flexible `lacks a`. Split mode: three
rigid rows, `B` = `{ ...0 } = { ...3, ...4 }` plus one to three random
`disjoint` atoms, `D` a random subset of the rigid `disjoint` clauses.

## Results (2026-10-20)

| Run | Problems | Agree | P9s valid, bounded invalid | Bounded valid, P9s unresolved |
|---|---|---|---|---|
| challenges | 20 | 20 as predicted | 0 | 1 (`split`) |
| challenges, three added for §14 | 23 | 23 as predicted | 0 | 1 (`split`) |
| `generate.mjs 3000 7` | 3000 | 3000 | 0 | 0 |
| `generate.mjs 5000 11 split` | 5000 | 4984 | 0 | 16 (12 distinct minimized) |

Every minimized incompleteness is the reviewer's `split` shape up to
symmetry: `D` = `1 disjoint 2`, `B` = `{ ...0 } = { ...3, ...4 }` with
one flexible part disjoint from 1 and the other from 2.

## Checks of the oracle's own power

- **Mutant** (scratch copy, not kept): P9s without its side condition.
  300 problems give 15 candidate unsoundnesses, each minimized and each
  still invalid with larger bounds (three unwritten labels, `{}` as a
  rigid field type), for example `∀ r s. r disjoint s` with no clause.
- The plain grammar never produced a completeness gap in 3000 problems;
  the split mode rediscovers `split` within 400. The plain grammar has
  little power against completeness.
- Two challenge predictions were wrong at first and are recorded:
  `types-independent` is trivially valid (empty parts), so it does not
  test per-row field types; `nested-same` was a bounded-model artifact
  (the flexible type variable needed a nested record outside the fixed
  domain), fixed by the built values above.

## Limits

Two unwritten labels and two field types for rigid rows; type depth one
in the fixed domains; at most three rigid rows and two flexible rows in
generated problems; one written label. Agreement here is bounded
evidence, not a proof of P9s's soundness, and says nothing about
completeness beyond the shapes generated.

## Checking the interpretation (dossier §14.6)

check-interpretation.mjs tests the soundness argument itself rather
than P9s's verdicts. For each pattern P9s solves, it maps the generic
solution found by `h` into every bounded rigid assignment with that
pattern that satisfies `D`, with `R{r}` read as `Int` and as
`(Int->Int)`, and checks: `h` defined (L2, no label repeated after
rests expand), each subexpression of `B` defined generically evaluates
to the image of its generic value (L3), and `B` holds (L4). The mutant
drops the side condition and is expected to fail.

Generated problems come from both grammars, `count` each, after the 23
challenges. Results are in the dossier, §14.6. After moving the
generators to grammar.mjs, `generate.mjs 3000 7` and
`generate.mjs 5000 11 split` were rerun and reproduce the results
above exactly (the split run's file is byte-identical).

The deliberate certificates (deliberate.mjs) run first, each checked in
the generic model before it is mapped: constants used as types on their
own (`R{r}` outside a rest, `A{r}{l}` for an absent label), a rigid
type variable inside a record with a rest, and a rigid row's written
field nested in another record. `rich` widens the rigid side: rigid
fields `{z1:Int}`, `{a:Bool}`; rigid type variables `{a:Int}`,
`{z1:Bool}`, `{a:{z1:Int}}`, `({z1:Int}->Int)`. A scratch copy with `h`
corrupted on present constants fails L3 on these cases. Results are in
the dossier, §14.8. Lean proves the same lemmas for all values
(research/composition-proofs, Sig/Soundness.lean).

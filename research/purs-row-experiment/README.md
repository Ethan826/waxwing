# Row predicates in the installed PureScript compiler

Evidence for docs/plans/2026-10-18-row-merge-qualified-types.md §12
(user request, 2026-10-19): does research/row-merge-qt's QT ("strict
PureScript") model what PureScript actually does, in particular on the
problems whose verdict depends on the order of constraints? The
programs are compiled with the installed `purs`; nothing in the
repository is built and no package is needed (the programs use only
`Prim.Row`). Not part of `npm run verify`; scripts/width.mjs checks the
.mjs and .md files.

## The compiler

| Item | Value |
|---|---|
| `purs --version` | `0.15.16` |
| binary | npm package `purescript` 0.15.16 (`purs.bin`, sha256 `ae313beb…aaa9b9`) |
| tag | v0.15.16 = purescript/purescript commit `4c66c05a59a08b698ba5c34b48e8bf7744ecb9f6` (2026-03-14) |
| audited revision | `cb3c4965c8468d26c9b14cf0319db6dbd06ee4ff` (design §11.5), 2 commits after the tag: `c4a35b34` (a CoreFn traversal typo) and `cb3c4965` (derive clauses); neither touches the type checker |
| relevant files | src/Language/PureScript/TypeChecker/Entailment.hs and src/Language/PureScript/Environment.hs are byte-identical at the tag and at the audited revision (`diff`, 0 lines, 2026-10-19) |

So the installed compiler runs the `unionRows`, `nubRows`, `rowLacks`
and `Union` dependencies that the design quotes.

## Method

translate.mjs turns a labels-only problem (research/open-row-merge's
encoding) into a module. A row is a type-level proxy `P r`; a step is
one element of an array, so an order of the steps is an order of the
elements:

| Step | PureScript |
|---|---|
| `eq l r` | `same (row l) (row r)`, `same :: P r -> P r -> U` |
| `dis l r` | `disj (row l) (row r)`: `Union l r u` (and `Nub u u` in encoding `nub`) |
| `lacks v l` | `lack (S :: S "l") v`: `Lacks "l" v` |
| a row `{ a, ...m0, ...m1 }` | `ext (S :: S "a") (merge m0 m1)`: `merge` is `Union` (plus `Nub` of the result in `nub`, Record.disjointUnion's constraint); `ext` is `Cons` plus `Lacks` |
| a closed row | `(P :: P (a :: U, b :: U))` |
| a rigid `R` with hypotheses | a signature variable `r` with the hypotheses as given `Lacks` constraints |

Encodings: `nub` keeps Waxwing's disjointness as PureScript can state
it (`Nub u u`, which only reduces on a closed row); `union` drops it,
isolating `Union`'s dependency solving. Modes: `sig`, a declaration
with a signature whose metas are the unknowns of an immediately applied
lambda (nothing is generalized, as in Waxwing); `gen`, a declaration
without a signature taking the metas as parameters, so PureScript
generalizes what it cannot solve (only a constraint with a bare unknown
argument; Entailment.hs `canBeGeneralized`) and prints the inferred
type in its MissingTypeDeclaration warning. Cases with a rigid run in
`sig` only.

**Orders.** Every permutation of the steps (cases of up to 4 steps;
the two controls, longer, in the given order and reversed). Permuting
the elements of one array literal is a genuinely equivalent program:
the same expressions, the same constraints and the same unifications,
met in a different order by the checker (it infers the elements left
to right and solves the collected constraints in emission order).
Permuting function parameters (changes the type), signature constraint
order and `let` order were not used.

**Observation.** `purs compile --json-errors -o <fresh dir> <file>`,
one file at a time with a fresh output directory (purs skips an
up-to-date module and then prints no warnings). Accepted: no error; in
`gen`, the inferred type from the MissingTypeDeclaration warning,
compared up to renaming of type variables and the printing order of
constraints (normal.mjs). Rejected: the error codes, and apart the
error text with unknowns renamed (a diagnostic difference, tracked
separately).

## Files

| File | What it is |
|---|---|
| translate.mjs | a problem and an order to a module, by encoding and mode |
| normal.mjs | normal forms of inferred types and error texts |
| run.mjs | compiles every case in every order, mode and encoding; records QT's and QS-EHZ's verdicts beside each; writes programs/ and results.json |
| pick-domain-b.mjs | lists QT's 29 order-dependent problems of domain B and writes the sampled ones to cases/ |
| cases/domain-b-*.json | the sample: QT's order differences 1, 3, 7, 9 and 17 |
| programs/<case>/<mode>-<encoding>-<order>.purs | the 176 generated programs (committed so that each can be compiled by hand) |
| results.json | every outcome: QT, QS-EHZ, and purs per order (inferred type as printed and normalized, or error codes and text) |

Cases: the six fixtures of research/row-merge-qt/fixtures (order-*),
five of QT's domain-B order differences, and two controls
(test/fixtures/r005b `design-composition`, accepted by both, and
`diag-15`, an overlap rejected by both).

## Commands and output (2026-10-19, purs 0.15.16, node v26.6.0)

```sh
node pick-domain-b.mjs 1 3 7 9 17   # 29 listed; writes the five
node run.mjs                         # about 5 s; ends with `purs 0.15.16`
```

run.mjs prints one line per case, mode and encoding. Abridged (QT and
purs per order; "same" or DIFFERS for acceptance, outcome or type, and
error text); a second run printed identical lines:

| Case | QT per order | purs `sig` (both encodings) | purs `gen-nub` | purs `gen-union` |
|---|---|---|---|---|
| order-22-3634 (6 orders) | accept ×6 | NoInstanceFound ×6 | NoInstanceFound ×6 | accept ×6, one type |
| order-22-581, -23-3089, -24-3802 (2 each) | D4, D4 | NoInstanceFound ×2 | NoInstanceFound ×2 | accept ×2, one type |
| order-A-apart, order-A-lacks (6 each) | refuse ×6 | NoInstanceFound ×6 | — | — |
| domain-b-1, -17 | accept, D4 | NoInstanceFound ×2 | accept ×2, one type | accept ×2, one type |
| domain-b-3 (6) | refuse, refuse, D4, D4, refuse, D4 | NoInstanceFound ×6 | NoInstanceFound ×3, AmbiguousTypeVariables ×3 | the same |
| domain-b-7 (6) | refuse, refuse, D4, D4, refuse, D4 | NoInstanceFound ×6 | NoInstanceFound ×6 | **accept ×3, AmbiguousTypeVariables ×3** |
| domain-b-9 (2) | refuse, D4 | NoInstanceFound ×2 | **PossiblyInfiniteInstance, accept** | **PossiblyInfiniteInstance, accept** |
| control design-composition | accept ×2 | accept ×2 | accept ×2, one type | accept ×2, one type |
| control diag-15 (6) | refuse ×6 | `nub`: TypesDoNotUnify ×6; `union`: accept ×6 | TypesDoNotUnify ×6 | accept ×6 |

Error texts (the first error) differ between orders in most `sig` rows
and in the `gen` rows marked above; the codes are as listed.

## What the evidence does not show

The translation is faithful only in part (design §12.3): PureScript
has no empty-row default, its `Nub` cannot reduce an open row, its
`Union` keeps duplicates, rigid disjointness hypotheses cannot be given
(only `Lacks`), and field types are all `U`. Five of QT's 29 domain-B
differences were sampled, not all. Only array order was permuted.

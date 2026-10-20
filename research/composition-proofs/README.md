# Record composition: first proof milestone (Lean 4)

Machine-checked proofs of the elementary claims of
docs/plans/2026-10-20-record-composition-dossier.md (§9 there has the
review summary). Research only; separate from the compiler and not part
of `npm run verify`.

## Build and check

Lean 4.35.0 (`lean-toolchain`), no Mathlib or other dependency. elan
was installed with Homebrew (`brew install elan-init`, 2026-10-20); the
toolchain lives in `~/.elan` (2.8 GB).

    cd research/composition-proofs
    lake build                                   # checks every proof
    lake env lean Composition/Axioms.lean        # axioms, as axioms.out

A clean `lake build` reports no errors and no warnings. No file uses
`sorry`, `admit`, `native_decide` or a declared `axiom` (`grep -rn`).

## Files and theorems

| File | Dossier | Theorems |
|---|---|---|
| Composition/Rows.lean | D1-D4, D7, D8; C1, C2 | `c1`, `c2_label`, `c2`, `d7_biased` |
| Composition/Forced.lean | D5; C7a, C7b; first C7 | `c7a`, `c7b`, `first_c7_false` |
| Composition/Signatures.lean | D6, §2.2, §2.4; C10, C11 | `sigFails_iff`, `c10`, `instance_alone_insufficient`, `c11`, `fails_while_satisfiable` |
| Composition/Programs.lean | §5 | `p3_overlap`, `p4_*`, `p5_*`, `p11`, `p11_negative`, `p6_holds`, `p6_negative_*` |
| Composition/Axioms.lean | | `#print axioms` for each of the above |

## Assumption dependencies (axioms.out)

Only Lean's standard axioms appear: `propext`, `Quot.sound` (from which
function extensionality follows) and, in `sigFails_iff` alone,
`Classical.choice` (the direction "not holds implies fails" is
classical). `c7a`, `c10`, `c11`, `instance_alone_insufficient` and
`p6_holds` depend on no axioms.

## Definitional choices to review

- A row is any function from labels to `Option Ty`; finiteness is not
  assumed, so the theorems hold for every partial map, finite ones
  included. Record types are exact: rows are equal iff they agree at
  every label.
- `union` takes a label's field from the left row where it has one;
  `DUnion r s u` is `Disjoint r s ∧ u = union r s` (D3).
- A call-site problem is a predicate on assignments; a signature problem
  is a pair `D`, `B` over rigid and flexible assignments. No constraint
  syntax, solver or substitution is modelled, so C3, C4, C9 and §2.1's
  binding equations are not formalized here.
- The programs are formalized at their deciding constraint, written by
  hand from the dossier's §5. The step from Waxwing source to that
  constraint is not formalized; program 6's body constraint (`join`'s
  parts equal the parameters, its clause, its result) is likewise
  written by hand.

## Evidence that the theorems are not vacuous

- Every program's problem is shown satisfiable where the dossier says
  Solved (`p4_solved`, `p5_solved`, `p11`, `p6_holds`), and the C7b and
  C11 premises are met by programs 4, 5 and 6.
- Mutant (scratch copy, not kept): with program 4's `s lacks { admin }`
  replaced by `True`, `p4_admin_forced` and `p4_split_forced` no longer
  check (unsolved goals): the placement proofs use the `lacks` fact.
- Mutant: with `Disjoint` removed from `DUnion`, `c2` no longer checks
  (with `c2` stubbed in the mutant, program proofs fail too, but those
  failures are partly structural: the proofs supply disjointness
  explicitly, so they are weaker evidence than the first mutant).

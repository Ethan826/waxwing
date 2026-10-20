# Record composition: proofs (Lean 4)

Machine-checked proofs for
docs/plans/2026-10-20-record-composition-dossier.md: the elementary
claims (first milestone, dossier §9) and the call-site foundation's
syntax, substitution, binding equations and finite reduction (R1, R2,
R2′, enumeration, fresh allocation; second milestone, §10), and the
closed-problem decider with call-site decidability (R3; third
milestone, §12).
Research only; separate from the compiler and not part of `npm run
verify`.

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
| Composition/Compose.lean | D3 as a partial operation | `compose_assoc`, `composeAll_append`, `composeAll_perm`, `composeAll_none_iff`, `disjoint_composeAll` |
| Composition/Syntax.lean | constraint syntax, ground types, interpretation | definitions only |
| Composition/Subst.lean | substitution, `eqs σ` | definitions only |
| Composition/Evaluate.lean | records as compositions of parts | `evalT_record`, `fieldRows_none_iff`, `fieldRows_disjoint` |
| Composition/Correspond.lean | substitution preserves values | `rowOf_eval`, `expandTails_eval`, `subst_evalT` |
| Composition/Binding.lean | §2.1 (i) | `subst_atom`, `subst_sat`, `binding_correspondence`, `bindings_needed` |
| Composition/Reduction.lean | R1, R2, R2′, R2Enum, R3 | statements (`Prop` definitions), `dedup`, `pairsOf`, `subsets`, `freshAlloc` |
| Composition/Restrict.lean | R1's directional lemma | `evalT_restrict`, `composeAll_rrow` |
| Composition/R1.lean | R1 | `r1`, `holds_restrict`, `assignWithin_restrict` |
| Composition/Closed.lean | congruence | `sat_congr`, `evalT_congr` |
| Composition/Pattern.lean | pattern rows | `evalF_patternFields`, `mem_dedup`, `nodup_dedup` |
| Composition/Closedness.lean | R2′ | `r2Closed` |
| Composition/R2.lean | R2 | `r2_forward`, `r2_backward`, `r2` |
| Composition/Enum.lean | enumeration, allocation | `r2Enum`, `freshAlloc_fresh` |
| Composition/Unify/Occurs.lean | occurs check against `G` | `acc_part`, `not_part_self`, `occurs_part` |
| Composition/Unify/Wf.lean | well-formed closed expressions | `wf_defined`, `evalF_dom`, `evalF_nodup` |
| Composition/Unify/Record.lean | one field at a time | `removeField_eval`, `removeField_labels` |
| Composition/Unify/Steps.lean | step semantics | `defined_wf`, `holds_eq_iff`, `record_step` |
| Composition/Unify/Measure.lean | termination measure | `nvars_lt`, `nvars_le`, `nodup_length_le` |
| Composition/Unify/Elim.lean | `[x ↦ t]` | `substT_elim_vars`, `substT_elim_wf` |
| Composition/Unify/Algo.lean | the unifier (U3: termination) | `unify`, `tyVarsOf_elim_gen`, `dec_elim` |
| Composition/Unify/Facts.lean | per-step facts | `elim_sound`, `elim_complete`, `occurs_unsat`, `clash_unsat` |
| Composition/Unify/Sound.lean | U1 | `unify_sound` |
| Composition/Unify/Complete.lean | U2 | `unify_complete` |
| Composition/Unify/Decider.lean | R3, call sites | `decideClosed`, `r3`, `decideCall`, `decideCall_correct` |
| Composition/Unify/Examples.lean | executable examples | `#guard` on programs 3, 4, 5, 11, controls, counterexamples |
| Composition/Axioms.lean | | `#print axioms` for each theorem above |

## Assumption dependencies (axioms.out)

Only Lean's standard axioms appear: `propext`, `Quot.sound` (from which
function extensionality follows) and `Classical.choice`. In the first
milestone `Classical.choice` appears only in `sigFails_iff` (the
direction "not holds implies fails" is classical). In the second it
appears in every theorem about `compose`: disjointness of arbitrary
maps is not decidable, so partial composition is defined classically.
These definitions are semantics, not an algorithm; a decision procedure
(R3) must be computable and is not yet written. `c7a`, `c10`, `c11`,
`instance_alone_insufficient` and `p6_holds` depend on no axioms.

## Definitional choices to review

- A row is any function from labels to `Option Ty`; finiteness is not
  assumed, so the theorems hold for every partial map, finite ones
  included. Record types are exact: rows are equal iff they agree at
  every label.
- `union` takes a label's field from the left row where it has one;
  `DUnion r s u` is `Disjoint r s ∧ u = union r s` (D3).
- First milestone: a call-site problem is a predicate on assignments; a
  signature problem is a pair `D`, `B` over rigid and flexible
  assignments.
- Second milestone: a call-site problem is a finite list of atoms
  (`eq`, `lacks`, `disjoint`, `ff`) over numbered type and row
  variables, all flexible. A record type is written fields plus row
  tails and denotes their disjoint composition; an equation needs both
  sides defined. Ground types are base types, functions and records
  whose rows are maps (finite witnesses are R1's business, stated with
  `AssignWithin`). A substitution is a finite list of bindings applied
  once, in parallel; a row variable may be bound to fields plus tails.
  User-defined type constructors are not modelled (base types stand in).
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
- Second milestone: `bindings_needed` instantiates
  `binding_correspondence`'s premise with a concrete problem and
  substitution. Mutant (scratch copy, not kept): with `substAtom`'s
  `lacks` case ignoring a bound row's written fields, `subst_lacks` no
  longer checks; the mutated statement is false (a row bound to `{ l:
  Int }` would "lack" `l`).
- R1/R2: `freshAlloc_fresh` discharges R2's premise for every problem.
  Mutant (scratch copy, not kept): with one fresh type variable per
  label shared by every row variable, `r2_forward` no longer checks.
- Third milestone: the `#guard` examples are checked by Lean's
  evaluator at build time (a planted false `#guard` fails the build);
  they rest on the compiler and interpreter, not on the kernel, and
  `decideCall_correct` is what gives them meaning. Mutant (scratch copy,
  not kept): with a base-type mismatch answering true, `unify_sound`
  no longer checks. Mutants that add or remove a recursive call fail
  earlier, in the positional termination proofs, which is structural
  and weaker evidence.

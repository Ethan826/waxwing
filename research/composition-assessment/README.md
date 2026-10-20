# Composition acceptance programs: evidence for the assessment

Evidence for docs/plans/2026-10-20-composition-foundation-assessment.md.
Research only; not part of `npm run verify`.

## Contents

- programs/: each program of docs/plans/2026-10-20-composition-
  acceptance-programs.md as written, with its variants and negative
  controls (`-neg`), one file each. `p9-test-alone` and `p9-neg-alone`
  leave out `withRepository`, which the compiler refuses on its own.
- run.mjs: checks, compiles and runs each through the compiler built in
  output/ (`GOTOOLCHAIN=go1.26.4 node research/composition-assessment/
  run.mjs`). The assessment's table was produced on the Task 7
  checkpoint build (branch `r005b-task7-wip`, 4d741a1); on
  `r005b-replan`'s build every program with two spreads in a literal
  stops at Tranche A's one-spread refusal instead.
- purs/: programs 4, 5 and 6 in PureScript (`Prim.Row` only), compiled
  with the installed `purs` 0.15.16 (`purs compile P4.purs -o
  <scratch>`): P4 and P5 refused (`NoInstanceFound`, "The instance head
  contains unknown type variables"), P6 compiles.

## Sources read for the assessment (2026-10-20)

Author or institutional copies; the ACM library refused direct access.

| Source | Read |
|---|---|
| Baader and Snyder, Unification Theory (Handbook of Automated Reasoning) | §3.4: Boolean rings unitary for elementary unification and with constants; complexity classes |
| Madsen and van de Pol, Polymorphic Types and Effects with Boolean Unification, OOPSLA 2020 | §3.2 (successive variable elimination, rigid variables as ∀∃), §3.3 (generalization, principal types), §5 (cost, simplification) |
| Madsen and van de Pol, Relational Nullable Types with Boolean Unification, OOPSLA 2021 | abstract, §5.3 |
| de Vries, Plasmeijer and Abrahamson, Uniqueness Typing Simplified, IFL 2007 | §5, §7 |
| Madsen, Starup and Lutze, Restrictable Variants, ECOOP 2023 | §3 (finite label universe, set unification) |
| flix/flix, RecordConstraintSolver.scala (master) | record rows are ordinary rows, no Boolean calls |
| Rémy, Typing record concatenation for free (INRIA RR-1739, 1992) | §2.1-§2.3 |
| Morris and McKinna, Abstracting extensible data types, POPL 2019 | §2.1, §3, §4.5, Def. 13-14 |
| Hubers and Morris, Generic programming with extensible data types, ICFP 2023 (arXiv 2307.08759) | §3.3, Fig. 7 |
| Simon, Optimal inference of fields in row-polymorphic records, PLDI 2014 | abstract, §1.1, §6 |
| Castagna and Peyrot, Polymorphic records for dynamic languages (arXiv 2404.00338) | no principal types; no concatenation |
| Koka book, §3.4.7 Masking effects; Leijen MSFP 2014 §2.4.1, §2.6, §3.2; Leijen POPL 2017 §3.1-§3.2 | `mask`, `inject`, open and close, generalization of total expressions |
| koka-lang/koka (dev, 198fc3bb): Type/InferMonad.hs, Type/Infer.hs | local `val` not generalized, local `fun` generalized |
| Biernacki, Piróg, Polesiuk and Sieczkowski, Handle with care, POPL 2018 | §1, §2.2, Fig. 5, §4.4, §5.4 |
| Lindley, McBride and McLaughlin, Do be do be do, POPL 2017 (arXiv 1611.09259) | §2.6, §3.1 |
| Convent, Lindley, McBride and McLaughlin, Doo bee doo bee doo, JFP 2020 | §3 |
| Vytiniotis, Peyton Jones and Schrijvers, Let should not be generalised, TLDI 2010; OutsideIn(X), JFP 2011 | §2.2, §3.4, §4.2-§4.3; §4.2, §4.2.4 |
| GHC User's Guide, Let-generalisation | the closed-binding rule |
| purescript/purescript v0.15.16: TypeChecker/Types.hs, Entailment.hs | local lets not generalized; `Unsolved` only when generalizing a top-level group |

Earlier reads still relied on: Jones, Simplifying and improving
qualified types (FPCA 1995), §4, and the other sources of the QT
re-plan's §11.5.

Not accessed (cited only where stated): Martin and Nipkow (JSC 1989)
beyond the abstract; Büttner and Simonis 1987; Baader 1998 beyond the
abstract; Madsen, van de Pol and Henriksen, OOPSLA 2023; Zullo, POPL
2026, and Lee et al., OOPSLA 2025 (abstracts only); Wright 1995 (value
restriction, through OutsideIn(X) §4.2.4); the Effekt paper (OOPSLA
2020; its documentation only); Rémy's "Type inference for records in a
natural extension of ML"; Pottier's conditional constraints.

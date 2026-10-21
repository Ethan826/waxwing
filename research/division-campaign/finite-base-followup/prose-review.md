# Finite-base follow-up prose review

2026-10-21. Humanizer/Garner loop under docs/engineering.md.

## Before rewriting

| Draft passage | Concern | Required correction |
|---|---|---|
| "The finite-base conjecture is false for Waxwing." | Unsupported transfer | Separate the abstract equation-family result from the richer source language. |
| "There is no source syntax for this problem." | Incorrect inference | Fresh instantiation at a gate call generates the equations; probes establish parse/resolve reachability. |
| "The finite-base proof is complete." | Missing scope | State that the new proof covers branch-indexed row equations, not the Nat-indexed SigProblem encoding or source translation. |
| "Infinite types solve the problem." | Ambiguous terminology | Distinguish infinitely many constructed types from fresh opaque base constants. |

The final note must identify what was checked, what the new theorems say,
and the next decision for the paused coordinator. It must not adopt a
witness extension or narrow the intended language.

## After rewriting

| Passage | Review | Outcome |
|---|---|---|
| "semantic row-equation family" | Needed scope qualification | The note explicitly excludes a generated SigProblem and source correspondence. |
| "existing compiled checker" | Reproduction limit | State that probes did not rebuild the compiler; include module hashes. |
| "No desired feature is shown broken" | Must not imply a universal guarantee | The note keeps typed inference completeness and the actual generic universe open. |

Final pass preserved the finite-list assumptions, arbitrary target choices,
finite witnesses, failed source reachability claim and separate approval
boundaries. The independent reader's initial inference that no existential
syntax meant no source encoding was corrected after the gate probes.
Validation: Lean library, axiom report, source probes, width, whitespace
and local handoff links. No npm command or campaign restart.

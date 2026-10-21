# Residual slicing and declaration patterns (proposals)

Dossier §18.26 authorizes statements and design only. The definitions
compile; none of SubstSound, SubstEquivalent, C1Subst, CP or C4 is proved.
No production checker or solver is changed.

## The preservation chain

For a recorded signature problem `P`, keep its rigid lists and `D`:

```
substP P σ = <P.rigidTy, P.rigidRow, P.D,
              eqs σ ++ substProblem σ P.B>
```

The chain is original constraints, substitution with binding equations,
residual body, independent residual slices. S0 and S1 apply to this
residual problem, including its binding equations. A new false ground
atom produced by `substAtom` stays in the ground slice. Keeping only
`B[σ]` is insufficient: Binding.lean already gives that counterexample.
Moving `eqs σ` into `D` is also insufficient: it can discard permitted
rigid assignments instead of checking their obligations.

`SubstSound` proposes both one-way implications:

```
ValidAll (substP P σ) -> ValidAll P
ValidFin (substP P σ) -> ValidFin P
```

The proof dependency is `subst_sat`: for any assignment satisfying the
bindings, the original and substituted body have the same truth value.
Apply it to `combine P θR θF`, preserving the original universal rigid
assignment and its existential flexible witness. `C1Subst` composes
this implication with the residual sliced checker. It does not infer
invalidity from a missing certificate or a failed chosen substitution.

The intended solver substitution binds only flexible variables
(`FlexibleSubst`). The soundness statement itself permits rigid bindings
in the body: checking them for every rigid assignment is stronger and
can fail. It does not constrain the quantifier's range. For example,
`B: x = α` is valid with flexible `x` and rigid `α`. Choosing `x := Int`
works for `α = Int`, but the residual binding `x = Int` plus `Int = α`
fails for `α = Bool`. That specialization is sound in one direction
and incomplete for the original signature. One ground-instance solution
cannot discharge all rigid assignments.

`SubstEquivalent` has an extra `BindingEntailed P σ` obligation:
for every `θR` satisfying `D` and every original flexible solution
`θF`, the combined assignment satisfies `eqs σ`. This supplies
solution-preserving equivalence, through `binding_correspondence` in
Binding.lean, rather than merely choosing a witness. It is sufficient,
not asserted necessary for validity equivalence. Its proof is pending.

A's measurement identifies a cheap existing step: field-read type metas
are unified to ground field types before signature pattern search.
The measured change is `2^120` before substitution versus `2^12` after
it. The measurement approximates substitution from the last top-level
unify; it does not check the complete binding-preservation chain above.
Retained equations can reconnect residual components. Recompute slices
with their equations before claiming that exact cost for C1Subst.
Restrict the chosen substitution to bindings needed by the original
body before constructing `substP`; unused bindings needlessly join
components. Do not delete necessary binding equations after slicing.

## Declaration-consistent patterns

For each distinct written label `l`, `holdersOK P l rs` accepts exactly
those subsets of declared rigid rows that do not contain a row declared
to lack `l`, or both ends of a declared disjoint pair. The proposed
`consistentPatterns P` is the product of those allowed subsets across
`(written P).eraseDups`. Repeated rigid identifiers are deduplicated.

CP states exactness in both directions, using `samePattern` to compare
sets of pairs: every emitted pattern matches a `patterns P` entry that
`consistentS` keeps, and every kept reference entry is emitted up to
that equality. C4 states `checkAllCons P T = checkAll P T` for every
certificate table, so matching the pattern's first certificate entry
must also be preserved. SlicePatternExamples.lean checks set coverage
and checker equality on all 58 CheckData exports; those guards prove
neither universal claim.

These are patterns consistent with declared lacks/disjoint facts, not
all semantic consequences of arbitrary `D`. `consistentS` ignores `eq`
and `ff`; so does this enumerator. `D = [ff]` still emits patterns,
although no semantic assignment satisfies `D`. Conversely, equations in
`D` can force absence without a written lacks declaration. For source
clause-only declarations, per-label holder conditions describe their
presence restrictions; interpreting these as realizable generic rows
still depends on the existing generic-model construction. No shortcut
based on clause-only satisfiability is asserted for arbitrary `D`.

The research definition filters `subsets` to form each label's factor.
It is executable specification, not a fast enumerator. Efficiently
listing independent sets of the declaration graph or symbolically
representing the factors would require separate implementation review
and the same CP obligation. CP alone does not bound enumeration cost.

## Cost and acceptance

| Cost | Required evidence |
|---|---|
| Search | time, peak memory, rigid patterns visited, candidate substitutions/witnesses tried, and resource-limit outcome |
| Certificate size | distinct covered patterns, encoded table bytes, repeated witness structure and any shared representation |
| Checking | time, peak memory, pattern coverage validation and per-entry work, separately from search |

The reference `pairs` and `written` keep duplicates: list enumeration
can cost more than the number of distinct patterns. `relevantPairs`
deduplicates, but `checkAllOn` still enumerates a product over slices.
For disjoint relevant-pair sets of sizes `k_i`, its raw count is
`2^(sum k_i)`; `checkSliced` instead runs `sum 2^k_i`, including the
ground slice and flexible-only components. Neither count includes the
cost of finding certificates. `checkAllCons` reduces the product's
factors only where declared facts restrict them.

`star` remains a required acceptance benchmark at useful scale. Its
measured declarations leave `2^(n(n-1))` consistent patterns (n = 7
already gives `2^42`), so the proposed enumerator alone does not settle
it. S2's slice-level relevance also leaves the shared component whole.
The atom-level shortcut is unsound (`u = r; u lacks a`). No new
label-flow machinery or symbolic checker is approved here.

Before implementation, compare established symbolic representations and
factorized coverage methods; measure search, certificate size and
checking separately on star and the independent families. Set measured
resource limits and return Unresolved when search cannot meet them.
No numeric acceptance threshold has been supplied; record useful-scale
sizes and limits explicitly when benchmark design is reviewed. A ported
real program is still required before production performance claims or
implementation completion (§18.26); it does not block these proposals.

## Refusal and unsupported slices

SliceRefusal requires satisfiable declarations in every other slice.
Its finite form requires finite-rigid satisfiability. A supported invalid
slice cannot refute the whole when an unsupported slice might have
impossible declarations: the whole could be vacuously valid. A source
clause-only declaration can use its established satisfiability result;
arbitrary `D` needs separate evidence. Unsupported semantics remain
Outside, with the checked slice's scope stated explicitly.

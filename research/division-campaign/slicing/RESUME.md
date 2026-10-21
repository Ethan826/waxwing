# Stream 10 handoff: statements ready for independent review

Completed 2026-10-21 in codex/campaign-slicing. Statements and bounded
research checks only. No new proofs, production checker or solver.

## Applied review findings

- IsSlicing.sort now requires rigid-list subsets plus agreement on the
  slice's variables. DSatFinSplit and finite/nonfinite refusal statements
  accompany DSatSplit. Refusal requires satisfiable other declarations;
  an Outside slice cannot silently meet that precondition.
- S2's sketch erases per slice before expansion. relevantPairs deduplicates;
  twoParts now documents two distinct relevant pairs of four. Examples
  moved out of the growing SliceDefs (205 lines) into SliceExamples.
- checkAllOn enumerates a product; only checkSliced gives a sum. Proposed
  S1rAcc/S2r retain all D and rigid lists, with Scoped P for the refinement.
- Hunt scripts report zero checked rigid instances explicitly. Bounds did
  not change. Historical generated counts cannot supply missing coverage.
- SliceSubst states SubstSound, BindingEntailed, SubstEquivalent and
  C1Subst. Equations remain body obligations and quantifiers are preserved.
  Choosing a substitution does not promise completeness.
- SlicePatterns proposes holdersOK, consistentPatterns, checkAllCons,
  CP exactness and C4 equality. Guards check both set coverage and C4 on
  the 58 CheckData exports. No checkAll optimization is installed.

## Checks and durable notes

validation.md records the pinned Lean build and completed bounded runs.
design.md covers the post-substitution chain, declaration-fact scope,
star's acceptance obligation and separate search/certificate/check costs.
amendments.md gives exact central measurement corrections for the parent.
prose-review.md preserves the humanizer catalogue and final re-review.

The measured cut is unsound: a ground field clash inside a non-ground
atom is dropped. Published 7b sliced counts cannot be sound-checker cost
bounds; old numerical outputs are retained only as operation sizes.
The atom-level relevance shortcut is also unsound. Neither is a speedup.

## Pending obligations and strongest attacks

Every proposed claim remains unproved. Independent adversarial review of
these completed statements is pending. Inspect especially:

1. Shared rigid rows/rest expansion after per-slice erasure in S1rAcc/S2r.
2. Substitution equations reconnecting components; A's measured 2^12
   has not been recomputed with the full preserved binding problem.
3. Arbitrary D equations/ff: consistentS and the proposed enumerator
   ignore them; semantic realizability is not CP's claim.
4. A one-instance substitution for x = α: x := Int loses α = Bool.
   Only one-way sound specialization follows without BindingEntailed.
5. Other slices' impossible declarations can make the whole valid even
   with a locally invalid slice; refusal must retain its precondition.

Possible DSat ↔ DSatFin simplification remains argument only, not assumed.
Historical evidence from paused reviews: S0 fuzzed on 4,000 cases with
0 failures; a separate flexible-only review checked 493 problems with
0 disagreements. Those runs were not rerun and lack fresh coverage data.
Star remains required at useful scale, and a ported real program remains
required before production performance claims or implementation completion.

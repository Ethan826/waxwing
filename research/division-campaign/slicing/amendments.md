# Integration amendments for the coordinator

These corrections belong in measurement/dossier files outside this
stream's edit scope. Suggested replacement text follows. The numerical
outputs are retained as measurements of the old operation, not costs of
a sound checker. No corrected numerical slicing run is claimed.

## measurements.md §2.3, after its definition of the cut

The measured cut drops variable-free groups, including contradictions
inside otherwise non-ground atoms. It is unsound as a validity-preserving
slicing: `{a: Bool} = {a: Int, ...u}` becomes satisfiable when the ground
field clash is dropped. A nested record with a missing label gives a
second witness. The slicing stream's nine naive-slicing failure shapes
include this measured cut; see slicing/statements.md §5.1–5.2.

Withdraw the interpretation of every sliced count as an upper bound on
sound checking cost until ground groups are retained and a pointwise
decomposition statement is established, or counts are recomputed using
whole atoms. The original raw counts still describe that measured cut.

## measurements.md §0, §3, §5 and §6.1

Affected published entries: §0's `wide` `2^42 -> 2^2` and at-most-`2^7`
sliced writtenCheck discussion; §3's `sliced patterns`, `sliced bitCheck`
and `sliced writtenCheck` percentile/max rows; §3's rigid-only variants
and per-function `sl. pat.`/`slices` columns; §5's `2^2.6` sliced-pattern
maximum and `2^7` sliced-writtenCheck cost summary; and §6.1's sliced
hand checks, especially `wide`. These values are invalid as sound
checker cost bounds or justified speedups. Unsliced `patterns`,
consistent-pattern, bitCheck and writtenCheck counts are unaffected by
this particular counterexample. Slicing Presence's bitCheck and
writtenCheck also needs its own statement; Sig S1 does not establish it.

## app-measurements.md §0, §3, §4, §6–7

All columns labelled `7b`, including A's `2^23` comparison and scaling
thresholds, inherit the unsound variable-free-group cut. They cannot be
presented as sound speedups. The row-only (i) cut has independent
counterexamples through shared type variables and nested rows; it is an
exploratory count, not a sound option. Whole-atom (ii) and residual
(ii)σ are distinct proposals; residual counts must include retained
binding equations before claiming preservation of original validity.
No recomputation here establishes their exact production checking cost.

Replace the implication that slicing `B[σ]` "costs nothing extra" with:
The residual checker keeps `eqs σ` in its body and preserves the rigid
lists and declaration quantifiers. Substitution soundness needs a
separate connection to the original problem; solution equivalence needs
an additional preservation obligation. A ground-instance substitution
cannot cover other permitted rigid assignments. A's measured `2^120`
to `2^12` illustrates the potential of already-ground field-read metas;
it does not validate the full binding-preservation cost.

## dossier §18.19 and §18.25; app-measurements.md star discussion

The stream 7b sliced counts use a cut later refuted by the slicing hunt.
Keep them as historical operation sizes, withdraw their sound-checker
cost interpretation, and link the exact affected entries above.

`star` is a required useful-scale acceptance benchmark (§18.26), not an
accepted language restriction. Declaration-consistent enumeration is a
proposal with CP exactness and C4 checker-equality obligations. It still
leaves `2^(n(n-1))` patterns for the measured star family. Measure search,
certificate size and checking separately; larger certificate tables can
move the exponential work without solving signature scalability.
Exhaustive enumeration remains the bounded reference baseline.

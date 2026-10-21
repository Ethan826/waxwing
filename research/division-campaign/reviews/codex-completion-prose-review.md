# Campaign completion prose review

2026-10-21. Humanizer/Garner loop under docs/engineering.md and the
writer's Claude memory. Applies to the resumed recorder and corrections
streams; the other worktrees keep their own reviews.

## Catalogue before rewriting

| Passage | Concern | Revision needed |
|---|---|---|
| "Rows remaining: none to draft; none verified." | Stale checkpoint status | Replace after the inventory and citation audit; preserve what remains unproved. |
| "Four makers are added" | Incorrect count | Name the additions without confusing four table rows with five makers. |
| "cmp τ ... holds no arrow" with a compiler citation | Missing scope | The model has no handlers; the compiler rejects handlers too through containsFunction. |
| "Not believed provable with checkAll's label-blind patterns alone" for a sound-checker implication | Soundness/completeness conflation | A conservative sound checker is possible; supporting all type-directed placements is the open issue. |
| "If no, the caller's contract must carry r printable" | False dichotomy | Evidence for the chosen part suffices; whole-row printability is one stronger sufficient condition. |
| "Current compiler behaviour" followed by the old missing-module failure | Historical observation presented as current | Label the original stream-base observations and note the later repair separately. |

The Lean corrections narrow comments to the actual theorem statements;
they do not change definitions or proof terms. Record the before/after
code comparison and the final build separately from prose review.

## Additional source audit findings

- The rollback/rigid-overlap prose promised that a refused branch's newly
  recorded atom would be available to diagnostics. Current Either returns
  no state on that path. Narrowed to success-path recording; a prefix-log
  interface is now an explicit open question, not an invented implementation.
- Coverage arithmetic is correct (36/10/14), but five rows cite only the
  conditional split model and D3 cites an example. Relabeled the table as
  an evidence inventory, not source-translation proof coverage.
- Source code comparison confirms four edited Lean files differ only in
  comments after stripping comments/whitespace. Full build still required.

## Re-review after rewriting

The listed passages now distinguish a completed proposal from tested
recording, theorem scope from compiler behavior, and soundness from
completeness. The refusal-log paragraph states the current interface and
leaves the proposed change open. The evidence inventory makes no claim
that its 36 model references prove source coverage. No new wording issue
was found in this pass; independent semantic review is still pending.

Validation: all four Lean edits are comment-only by a comparison that
strips comments and whitespace. The integrated Lean build completed all
97 jobs with no warnings or errors. The repository width check found one
imported oracle line outside this review's files; that worktree owns its
formatting-only correction and frozen-hash amendment. The completed
quiet verification passed 2,366 parallel tests, 59 serial tests and all
176 regression proofs. No compiler code changed in this review.

## Measurement corrections: catalogue before rewriting

- measurements.md calls its slicing counts "not proved" and says each
  count is an "upper bound for this slicing". The hunt now refutes
  preservation for that cut: dropping a variable-free contradictory
  field group changes satisfiability. State the failure before the
  historical numbers, and withdraw their sound-checker cost reading.
- app-measurements.md says slicing the residual "costs nothing extra".
  Retaining the binding equations can reconnect slices; the measurement
  does not establish that cost. Replace the claim with the required
  binding-preserving chain.
- The application summary says "What scales on these programs is a
  lemma-backed slicing" although those lemmas are only proposals. Mark
  these as candidate optimizations and require separate cost evidence.
- Earlier dossier summaries repeat the numbers without the discovered
  defect. Add a dated correction in both affected sections, preserving
  the raw results as historical measurements.

## Independent review, first correction

The reviewer found the refusal-state correction had not reached T7,
T9 or the test-order paragraph. Those still promised observable logs
through hooks alone. Updated the successful-path tests, retained the
negative diagnostic controls, and made every refused-prefix inspection
conditional on the explicit interface decision. No log interface was
selected. The reviewer is checking the amendment separately.

## Measurement corrections: re-review

Dated qualifications now precede both reports' historical summaries and
appear at each affected dossier section. They identify the refuted cut,
withdraw cost/speedup interpretations, preserve raw measurements and
separate residual substitution soundness from full equivalence. Removed
"costs nothing extra" and the assertion that proposed slicing already
scales. Star remains required, and no recomputed cost is claimed.

## Independent review, remaining scope and cost corrections

The reviewer found two further overstatements. Recorder §2.3 treated
any printable-part split as type-directed; it now also names annotation
and constraint evidence. Slicing/design.md used distinct pair counts
for reference checkAll's per-slice loops, which retain duplicates. Its
cost now uses raw list lengths, reserving deduplicated cost for an
implementation with its own equality argument. Re-review confirms both
passages preserve the unresolved policy and proof boundaries.

The independent review found no false soundness implication in the
substitution proposals, checked the rigid lists/D/binding equations,
and confirmed that the Lean corrections change comments only. That is
an adversarial review, not a proof of slicing or recorder completeness.

## Final handoff review

Before writing: stale D3a text named a missing widened.mjs and said
ShapeSplit was not imported. Updated both to the integrated files.
The dossier and handoff now distinguish completed reports from open
mathematics, new checks from retained evidence, timeouts from full runs,
and model counterexamples from full-Waxwing feature failures. Re-review
found no unsupported adoption or new completeness claim. The author
requested stopping, so no further searches or proof attempts are planned.

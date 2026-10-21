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

# Recorder specification completion audit

2026-10-21, Codex. Reviewed the 60-row draft from e7ce17a after the
streams-5/8 corrections were integrated. This is a document/source audit;
no recorder was implemented or tested.

## Inventory and citations

Section 3 has exactly 60 unique IDs: A=7, B=15, D=5, F=9, C=8,
H=7, O=9. The summary's 36/10/14 sets are disjoint and cover all IDs.
These numbers classify referenced evidence, not proved source coverage.
Five of the theorem-category rows use only the conditional split model;
D3 cites an example. None has a tested recording hook.

Checked 100 explicit src file:line references across 50 source files for
existence and range. Read the generation/validation hooks and rollback
paths cited by the table. Updated the holes call to Function.purs:107 and
the postponed-pair implementation to RowFinish.purs:61-69. The original
references remain anchored at 4a51688; the build repair restores the
missing SeveralTails module without moving these existing hooks.

## Corrections made

- Distinguished model printability/comparability from the compiler's
  containsFunction predicate, which rejects handlers as well as arrows.
  Nominal data and handlers remain outside the formal G fragment.
- Removed the implication that label-only patterns make a sound checker
  impossible. The unresolved issue is coverage/completeness for
  type-dependent placements.
- Removed the false choice between type-directed splitting and requiring
  the entire source row printable. Evidence for the particular part is
  another route; a whole-row contract is sufficient but not necessary.
- Corrected the promise to retrieve new records on refusal: current Either
  returns no updated state. Success-path recording is specified; a
  diagnostic prefix-log interface is an open question. Such a prefix is
  not the complete body's constraints.
- Clarified that rollback behavior is an intended invariant, not a proved
  property of an implementation. Corrected the maker-count wording.
- Relabeled stream 5's missing-module observations as historical, keeping
  predictions distinct from the later repaired-build probes.

## Remaining gates

The specification is a reconciled proposal, not a verified recorder.
Requirement atoms, copy-placement, the source-to-constraint bridge and
policy/admissibility separation still need the statements and evidence
listed in section 8. Section 11 retains the author's decisions, including
whether refusal-prefix logging is wanted. No syntax, split policy,
compiler source change or proof scope is adopted by this audit.

Prose review: reviews/codex-completion-prose-review.md. Independent review
of this completed draft is still to run before final acceptance.

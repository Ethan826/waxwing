# Corrections of streams 5 and 8: resume note (paused)

Paused 2026-10-21 at the coordinator's request. Base 4a51688; work is
on this worktree's branch, in the "WIP checkpoint (paused)" commit.

## Done

- translation.md: kinds of evidence; F1 (row C2, §3 intro, §3.3, F5);
  F2 (row S1, §3.2, §3.3); F3 and decision 4 (applied-`peek` claim
  withdrawn, candidates kept, decision 3 rests on §18.17 item 3 and
  §18.22); decision 2 (rows S1, C2, §3.2, §3.3, question 4); decision 1
  (§3.2, §5); F13 (row C1, §3.3, F6). Corrections list at the end.
- statements.md: kinds of evidence (head, §1.1 table); F4, F5, F6 and
  decision 3 (C narrowed; C+ added as proposed, unproved), F7, F11,
  F12, F13, F14 and decision 5, F15, decision 2. Corrections list.
- ground-check.md: F7, F8, F9, F10, evidence labels. Corrections list.
- `node scripts/width.mjs`: clean for all three files.

## Remaining

1. Lean comments only (no statement or proof changes) in
   research/composition-proofs/Composition/SplitIrrelevance/:
   - Acceptance.lean header and `req_of_keyAt` docstring: add the
     premise (copies reached from a declaration and key whose interface
     holds); add a docstring to `req_of_covers` with that premise (F7).
   - Defs.lean `Covers` docstring ("counts every specialization-time
     requirement"): narrow to requirement sites; body equations are
     not modelled and are presupposed (F6). `Tm` docstring: `ann` for
     `==` models the operand's type only (F5).
   - Acceptance.lean `accepted_split` docstring ("a model that counts
     every requirement"): narrow likewise (F6, decision 3).
   - Examples.lean `e2` docstring ("model M1"): a hand-written instance
     of M1, not proved equal to `Req₁` (F15).
   - Run.lean header: R does not cover `==`'s result (F5).
2. `cd research/composition-proofs && lake build` must be clean.
3. Reread the three documents once for consistency; recheck width.
4. Commit (explicit paths), then report: hash, per-document
   corrections, none declined so far, Lean comment changes, build.

## Exact next step

Edit the Acceptance.lean comments listed in item 1.

## Completed by Codex (2026-10-21)

All listed Lean comment changes are applied. Non-comment text in the four
edited files matches the prior revision after removing comments and
whitespace. The full integrated Lean library builds (97 jobs), no warnings
or errors; .build/codex-campaign-integrated-lean.log. The three stream
prose documents were reread, and stream 5's old missing-module observation
is now explicitly historical. No definitions, theorem statements or proof
terms changed. Independent final review is pending; see
codex-completion-prose-review.md.

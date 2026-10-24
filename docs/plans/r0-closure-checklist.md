# R0 and composed records: closure checklist (2026-10-24)

The completion contract for the R0 / composed-record epic: what must be
true to switch R0 live (part A) and to close the epic (part B), each row
with its status, owner, dependencies, current evidence and the evidence
that closes it. Adopted at the author's request after their review of an
earlier draft (dossier §18.75). Keep it current in the same change as
the work it tracks.

## Scope

This is the checklist for the R0 implementation plan
(docs/plans/2026-10-22-r0-implementation-plan.md) and the composed-record
foundation behind it (dossier §18). It is **not** the completion contract
for the whole type system. Principal inference, local generalization,
higher-kinded types and generic method dictionaries need their own
scoped milestones; they are listed in part C so they neither inflate
this epic nor drop off the roadmap.

## Terms

**Blocks:** S soundness (a wrong program could be accepted or
mis-compiled), C a promised capability (including not silently
narrowing what compiles today), E inference ergonomics or diagnostics,
P performance.

**Status:** *done* (closed with its evidence), *evidenced* (component
built and tested, but the gate that contains it is open), *in progress*,
*open*, *deferred* (deliberately not now; never counted as done).

**Owner:** *author* for decisions and rulings; *controller* (the agent
executing under the author's authorization) for work, which returns to
the author for acceptance.

**Guarantees, kept apart.** Four different claims, each closed by its
own evidence; none implies another:

1. *Model soundness:* in the research model, the checker's acceptance
   implies validity (Lean).
2. *Implementation correspondence:* the shipped code computes what the
   model describes. Closed universally only by a refinement proof; a
   differential test is bounded evidence and cannot upgrade a claim to
   Proved.
3. *Typed-IR construction:* certified bindings become the intended
   typed code (`certify`, `build`).
4. *Lowering preservation:* the transformations this epic introduces
   preserve meaning: split selection keeps permitted behaviour,
   specialization keeps dictionary values and captures, effect erasure
   happens only after its obligations are checked.

## What is proved (research model, Lean, accepted by the author)

- Presence fragment: O1-O3, D2, decidable validity (§18.11-18.12).
- D3b existence: `MGUExists`, `CellIndependence`, `Universality`,
  `D3bExists`, reviewed (§18.34, §18.36). Completeness at θ* is proved
  only under `Fresh`, and no theorem says Waxwing satisfies `Fresh`.
  That limitation stands for the θ* theorem; the option-B bridge is the
  route around it: general option-B completeness and the validity
  characterization are proved with the premises `Scoped`, infinitely
  many labels and finite values (§18.40-18.46), so `Fresh` is not an
  open global obstacle for option B.
- The cell-based certificate checker: acceptance implies `ValidOpen`
  (§18.56-18.57); exact queries QR1-QR5 and the `star`, `dep`, `divide`
  families (§18.58-18.59; 63 audited theorems). Also proved: the checker
  refuses `divide5` because its certificate format cannot express the
  split (incompleteness, not a defect in queries).

Not established (§18.46): principal inferred types, completeness of
source-level inference, compilation correctness, and that R0's shipped
G0 is the proved checker (guarantee 2).

## A. Ready to switch live (Task 4.6)

| # | Item | Blocks | Status | Owner | Depends on | Current evidence | Closes when |
|---|---|---|---|---|---|---|---|
| A1 | G-effect-rows: the a-min representation | S | in progress: review 1 not ready (F1-F17), rulings (§18.76), revision 2; review 2 not ready (N1-N3); revision 3 (§18.77, §18.78); review 3 not ready but fixes local (T2-a S1: defer's mark edge; nine findings to resolve) | author (acceptance), controller | review 2 | docs/plans/r0-effect-rows-audit.md; r0-amin-statements.md and its §8 | statements revised and a further review finds no S1/S2; the author approves; implemented with every distinguishing test passing and a restored-defect row per invariant; R031's pins flip to today's form |
| A2 | Trusted effect validator (a-min D6) with `EffectsUnchecked` | S (guarantee 4: effects checked before erasure; §7.1 item 2) | open | author (algorithm, interim F14), controller | A1 | none beyond the design | algorithm chosen with its source; obligations complete for today's effect checks (one forged-witness fixture per refusal kind, a mutation test per obligation kind); mark evidence judged; obligations inside the recorded problem; one minting site |
| A3 | Task 7.1's full equality, rows included, at post-Strip; or a ruling on Task 7.2's bridge | S (guarantee 3) | evidenced effect-erased only: T2 exact 1,985 and by site 45 of 2,030 Solved, pinned | controller | A1 | test/r0-elab-corpus.serial.test.mjs | T2 at post-Strip with rows, pinned, every RT8/window move explained, old pins kept as a cohort |
| A4 | G-D1 closed | S | open | author | A1 | Task 0.3 specification, four review rounds; policy settled (r0-erased-rows §7.1 item 4); representation open | a closure record with its review |
| A5 | G-erased: criterion argument and policy | S | open (marker `ErasedRow` in shadow) | author (policy), controller (argument) | none | census `ErasedRow`: 91 declarations, 72 programs | argument with one fixture per effect operation and handler form; adversarial review; ruling |
| A6 | Acceptance preservation | C | open: 256 of 751 accepted programs blocked by at least one category (250 without `ErasedRow`); by family .wxw 76, fixtures 29, inline test data 151 (census.json, after the C001 additions; earlier cohorts' figures are not comparable) | author | A5, A7, B4 | test/fixtures/r0/census.json | exemptions bring unapproved blocks to zero, or the author approves the narrowing with its list |
| A7 | G-ValidR policy and checks | C (generic `show`, `==`), S (VR rules) | open; requirement atoms Unresolved | author, controller | none | r0-validr-draft.md; probe tests | rulings; VR-sub, VR-agree, VR-CX tests; T-R0b §5.4 edit reviewed |
| A8 | G-switch timing; full switch or option C window | C | open (option A now, option E destination, §18.70) | author | A6 | census and window table | the author's ruling |
| A9 | User-visible diagnostics: G-codes, G-R019-visible, Task 1.2's CLI step, Task 2.2 | E | open (held back, §18.71) | author, controller | none | `E_UNRESOLVED` constructor exists, unused | rulings; stderr and first-diagnostic fixtures with every change listed |
| A10 | R023, R024 (shadow defects in `Free` numbering and Cov's sort check) | S (defence in depth) | open | controller | none | BACKLOG | fix with near-miss tests, or a ruling that no other producer can exist |
| A11 | Live-path cost, measured on the candidate pipeline before it is enabled | P | open; no gate defined | author (budget), controller | A1-A3 (the candidate pipeline exists) | none | corpus and compile-time deltas of the candidate pipeline against today, measured before the switch; a budget the author accepts (§18.76) |
| A12 | Task 4.6: `build`'s IR lowered | S, C | open | controller | A1-A11 | none | full verify; acceptance and first diagnostics unchanged or approved; `r0-lowered-ir` rows prove |
| A13 | Typed-IR construction coupling (R026) and trusted inventory (R027-R030) | S (guarantee 3) | done | controller | none | f97dbde, 7a9fcc0, 655fef9, 62b965a, a1e591c, 570a19e; clean verify at d7f30b0 | (closed) |
| A14 | C001 corpus additions | C | done | controller | none | f99ce8b; counts in progress.md | (closed) |

Proofs not required to switch, by the author's decision (§18.69 Q9,
labelled `Pending` assurance): P-G0 and P-certify. Proving them closes
guarantee 1 for G0 and the settle-and-witness steps; it does not close
guarantee 2, 3 or 4.

## B. Epic complete (after the switch)

| # | Item | Blocks | Status | Owner | Depends on | Current evidence | Closes when |
|---|---|---|---|---|---|---|---|
| B1 | Phase 6: admission, policy, re-check, support | S (re-check), C | open (gated on Task 4.6) | controller, author | A12 | plan Phase 6 | Tasks 6.1-6.5 with tests; Task 7.2's bridge removed before 6.4 |
| B2 | `divide5`-shaped programs | C | open; checker incompleteness proved | author, controller | B1 (admission), A12 | §18.58-18.66 | an extended certificate format with a proof that acceptance implies `ValidOpen` (guarantee 1); the chosen split passes the admission policy; **a representative source program compiled and run**, with the split-selection justification |
| B3 | `route` | C | evidenced in the model (`scRoute` states `ValidOpen`) | controller | B1, A12 | Cell proofs | a representative source program compiled and run, with the split-selection justification |
| B4 | Trusted refuters live (P-C1, P-CX; Task 5.3) | E (contradiction diagnostics), S | evidenced in shadow (Task 5.2, `shadowRefuter`) | controller, author | none | CX corpus tests | proofs that **a checked counter-instance establishes that the universally quantified signature is invalid** (one permitted rigid assignment with no flexible solution suffices); for a concrete call, that contradiction means no permitted solution exists; diagnostics keep the two apart |
| B5 | Exemptions (G-exempt; option E) | C | open | author | A5 | none | per-kind argument and check; policy per kind |
| B6 | R019 (several row tails) | C | open (probe: 14 fixtures) | author | B1 | test/r0-r019-probe.test.mjs | the post-Task-8 choice; the probe's programs compile |
| B7 | Forced splits (G-6b), a language change | C | open | author | B1 | none | decision; statements; fixtures |
| B8 | Local-transformation preservation (guarantee 4) | S | open | controller, author | A1, A2, B1, B2 | none | justified preservation, argued with checks or proved, for each transformation this epic introduces: certified bindings become the intended typed code; split selection keeps permitted behaviour; specialization keeps dictionary values and captures; effect erasure only after its obligations are checked. **Mandatory to close the epic.** |
| B9 | A comprehensive compiler proof | none | deferred, optional | author | B8 | none | not required to close; distinct from B8 |
| B10 | Assurance upgrade: P-G0, P-certify (guarantee 1); refinement from model to code (guarantee 2) | S (assurance) | open, unauthorized | author | none | `Pending` assurance labels | Lean proofs; a refinement proof for guarantee 2. Differential tests are bounded evidence and do not upgrade the label |
| B11 | `star` at useful scale | P | not re-checked in this pass | controller | none | §18.37, §18.52 | a fresh measurement against the stated scale |

## C. Outside this epic (own milestones)

| Item | Why it matters | Status |
|---|---|---|
| O24 (EMLTI correspondence, §18.69 D2) | Non-blocking for the R0 plan; important to the proposed inference foundation | unauthorized |
| Principal inference | Language promise to decide; not established by §18.46 | own milestone |
| Local generalization | Census category exists (0 now); policy for the language | own milestone |
| Higher-kinded types | Roadmap (K001) | own milestone |
| Generic method dictionaries (C001) | Rulings recorded; implementation not authorized | own milestone |

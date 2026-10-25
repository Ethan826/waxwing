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

## Critical path (2026-10-25)

Written at the author's request (priority: finish the row-checker
integration and its effect guarantees; arithmetic parked). It answers
four questions from the rows below; each step names its obligation,
the evidence that exists, the next action and the owner. Labels:
*observed* (run), *read* (code or records), *reasoned* (argued only).

**H′ is not RC′.** The FX033 repair (rule H′, on main since 6b4be77 and
on this branch since 094adbf) refuses the nine demonstrated programs.
It discharges neither the ResultC parametricity step (P4) nor the
substitution property (O-SUB) nor A1 of RC′'s argument
(r0-amin-resultc-tail.md §6, Review 2). Those stay open below.

### 1. Before a-min's statements can be approved (A1, first half)

A1 closes its first half when a further review finds no S1/S2 and the
author approves (row A1). Revision 3.5 has had no review.

| Step | Obligation | Existing evidence | Next action | Owner |
|---|---|---|---|---|
| 1a | §18.85 item 7's controller checks | closed-R control and N4 under Definition 4.2: rerun 2026-10-25, `node run.mjs` and `node k1.mjs` in research/amin-mark-oracle, exit 0, "no disagreement"; closed-R honest accepted, near miss refused; N4 honest refused (observed) | record the reruns in statements §12 (its "not yet rerun" note is stale) | controller |
| 1b | U8 recorded as implemented | §11 U8 says "not enforced"; the trusted solved-form check landed later (7476097, pin 9f547d7; §18.86-§18.87) (read) | update §11 U8 and the places citing it (§2, §5, §13a) | controller |
| 1c | E4′ / decision 3 (ResultC tail) stated as H′ with RC′ open | E4′ and §14 decision 3 updated (d99ec45); Review 2's channel search; nine shapes refused by the compiler (observed) | author rules whether the statements may be approved with RC′ (P4, O-SUB, A1) carried as a labelled open obligation, or must wait for an argument | author |
| 1d | O6, records with several tails | defined in 3.4, "proposed, no case" (read) | one separating case, or a recorded reason none is constructible yet | controller |
| 1e | carried obligations listed once | O5, O7 (correspondence, today stricter); U2-U5; E10 settled by reading only; a ResultC's own tail unexamined; [FX008-5] argued, not proved (read) | one consolidated table in the statements, each labelled "carried, not blocking approval" or "blocking" | controller |
| 1f | targeted review of the revision carrying 1a-1e | done 2026-10-25: §R7, no S1, four S2 (Console guard text, O6 testable, O-SUB/A1 whole-judgment, table mislabels) | author: text fixes or waiver | controller (dispatch), author (acceptance) |
| 1g | approval | §R7 fix pass (statements §R7a, cade64f); consistency repairs (bc665cd); §R7b forcing clarification (535b780); **approved as a representation, 2026-10-25** (dossier §18.95) | done: covers the representation with the named obligations open; authorizes neither implementation nor soundness claims | author |

### 2. Before implementation can start (A1, second half; A2)

| Step | Obligation | Existing evidence | Next action | Owner |
|---|---|---|---|---|
| 2a | statements approved | done 2026-10-25 at 535b780 (§18.95) | — | author |
| 2b | implementation authorized, scoped to A1's representation | tranche 1 scope accepted (§18.96); plan docs/plans/2026-10-25-amin-tranche-1-plan.md for review | Checkpoint A (Tasks 1-6) authorized for subagent execution (§18.97), budget 1.6-2.4M tokens; Tasks 7-14 need their own authorization | author |
| 2c | A2's validator algorithm chosen with its published source, and the interim `EffectsUnchecked` policy (F14) | options note drafted (docs/plans/2026-10-25-amin-a2-options.md: M-A/M-B/M-C, R-A, interim items 1-3, recorded inputs 1-4) | the author chooses; inputs 1-4 decided before T1 is final | controller (note), author (choice) |
| 2d | R031's two option-c defects fixed within the a-min work | pinned (BACKLOG R031) | part of the first implementation tranche | controller |

### 3. What closes G-D1 and permits Task 4.6

G-D1 (row A4): the policy is settled (r0-erased-rows §7.1 item 4); the
representation is open as G-effect-rows (§18.72 item 3). Evidence that
closes it: the approved a-min statements as the representation, then a
closure record citing Task 0.3's specification, the policy ruling and
the approval, reviewed and accepted by the author. Approval alone does
not close it; the record does.

Task 4.6 (row A12) needs every part-A row: A1 implemented, with each
distinguishing test passing and a restored-defect row per invariant;
A2; A3 at post-Strip with rows; A4; A5 (G-erased argument and ruling);
A6 (acceptance preservation: 256 of 751 accepted programs blocked
today); A7 (G-ValidR); A8 (switch timing); A9 (diagnostics); A10 (R023,
R024); A11 (cost budget). A13 and A14 are done. Most of these are
independent of a-min and can run in parallel once authorized; A5, A6
and A7 are the largest (read).

### 4. Which effect-contract decisions block these steps

The five decisions (research/effect-kinds, decision-memo.md §7:
`pure` and crash, `Crash` catchable, the observation boundary, external
root classes, extension rule) block **none** of paths 1-3 (reasoned):
a-min's guarantees are effect safety and abort safety over today's
labels, marks and rows (statements §14), and none of the five changes
a label, row form or mark the validator reads. They proceed
separately. Couplings to watch: a crash label under decision 1 would
add obligations to A2 after the switch; a catchable `Crash` (decision
2) would meet the Console frame accounting ruled in §18.86 only if it
were handled like an effect. Division's typing waits on decision 1;
I001's root bindings wait on decision 4.

### Next tranche (proposed, bounded)

**a-min revision 3.6 and its approval review** (path 1).

1. Revision 3.6, docs only: steps 1a, 1b, 1d, 1e; E4′ already
   updated. Controller, inline.
2. Step 1f: one independent read-only Opus review of 3.6, returning
   findings as text.
3. A one-page decision packet for steps 1c and 1g.

Cost: about 0.2-0.3M tokens of controller work and one review agent of
about 0.15-0.25M tokens; 2-3 hours wall clock. No full verify (docs
and oracle scripts that run in seconds; any O6 probe uses the existing
build).

Acceptance: §12 carries the reruns with commands and outputs; §11 U8
says implemented, with commits; O6 has a case or a recorded reason; one
table lists every carried obligation with its label and whether it
blocks approval; the review reports S1/S2/S3 findings with evidence;
the packet asks the author exactly 1c and 1g. If the review finds an
S1, the tranche ends with the findings: no automatic revision 3.7.

Not in this tranche: implementation, G-D1's closure record (after
approval), A2-A11, the five effect decisions, proofs.

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
| A1 | G-effect-rows: the a-min representation | S | in progress: review 1 not ready (F1-F17), rulings (§18.76), revision 2; review 2 not ready (N1-N3); revision 3 (§18.77, §18.78); review 3 not ready, fixes local; revision 3.2 (§18.80); targeted re-review not ready (F1 S1: E1 omits C ≡ C and R's marks without an owned C; F2 S1: ResultC still a package row; F3, F5 S2); revisions 3.3-3.5 (§18.82-§18.85: K1 adopted, rule J); revision 3.6, review §R7 (no S1, four S2), fix pass §R7a, §R7b; **representation approved by the author at 535b780 (2026-10-25)**, named obligations open (O-SUB, A1 of RC′, the carried table), no soundness claim; implementation not authorized; see Critical path, path 2 | author (acceptance), controller | review 2 | docs/plans/r0-effect-rows-audit.md; r0-amin-statements.md and its §8 | statements revised and a further review finds no S1/S2; the author approves; implemented with every distinguishing test passing and a restored-defect row per invariant; R031's pins flip to today's form |
| A2 | Trusted effect validator (a-min D6) with `EffectsUnchecked` | S (guarantee 4: effects checked before erasure; §7.1 item 2) | open | author (algorithm, interim F14), controller | A1 | none beyond the design | algorithm chosen with its source; obligations complete for today's effect checks (one forged-witness fixture per refusal kind, a mutation test per obligation kind); mark evidence judged; obligations inside the recorded problem; one minting site |
| A3 | Task 7.1's full equality, rows included, at post-Strip; or a ruling on Task 7.2's bridge | S (guarantee 3) | evidenced effect-erased only: T2 exact 1,985 and by site 45 of 2,030 Solved, pinned | controller | A1 | test/r0-elab-corpus.serial.test.mjs | T2 at post-Strip with rows, pinned, every RT8/window move explained, old pins kept as a cohort |
| A4 | G-D1 closed | S | open (closing evidence stated in Critical path, path 3) | author | A1 | Task 0.3 specification, four review rounds; policy settled (r0-erased-rows §7.1 item 4); representation open | a closure record with its review |
| A5 | G-erased: criterion argument and policy | S | open (marker `ErasedRow` in shadow) | author (policy), controller (argument) | none | census `ErasedRow`: 91 declarations, 72 programs | argument with one fixture per effect operation and handler form; adversarial review; ruling |
| A6 | Acceptance preservation | C | open; also, by the provisional "always R's tail" restriction (2026-10-25), aroundBoth (pinned corpus) and k2f would be refused (stand-in evidence, statements §0e item 2): 256 of 751 accepted programs blocked by at least one category (250 without `ErasedRow`); by family .wxw 76, fixtures 29, inline test data 151 (census.json, after the C001 additions; earlier cohorts' figures are not comparable) | author | A5, A7, B4 | test/fixtures/r0/census.json | exemptions bring unapproved blocks to zero, or the author approves the narrowing with its list |
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

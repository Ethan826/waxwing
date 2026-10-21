# Codex campaign stopped at the author's request (2026-10-21)

All six paused checkpoints and three Codex completion streams are
integrated locally on r005b-replan. Read dossier §18.28 and the latest
docs/progress.md entry first. No merge or push; no production compiler
integration, D4 or language-policy adoption. No agents/searches remain
running. Original Claude worktrees are preserved; Codex temporary
worktrees are removed after integration, with branches retained.

Verification: quiet compiler run passed 2366 parallel tests, 59 serial
and 176 regression proofs. Final Lean build passed 104 jobs without
warnings. Axiom audits use only standard axioms. No further npm run is
needed for these final documentation-only corrections.

Main result: no demonstrated full-Waxwing feature failure. Typed
completeness still depends on the intended generic type universe; Fresh
requires all CConst, not merely used constants. The finite-base family
has no general source/constraint bridge. Presence results stand.

Do not mistake completion of reports for completion of the mathematics:
D3b general existence is open; R3a timed out twice; R4a has only ten
new diagnostic cases; D3b full runs stopped after 42 cases; its
record-constant mismatch has a local backlog. Slicing claims are still
unproved statements. The old measured cut is unsound, and its cost
interpretation is withdrawn. Recorder remains a proposal, not tested
implementation. Star useful-scale support is still required.

Next work needs a new scope: generic-universe decision, typed proof
obligations, slicing/recorder statement review, then separately authorized
integration. Preserve unrelated uncommitted README, BACKLOG and direction
plan edits. The author asked to stop because of usage; do not restart the
campaign automatically.

---

# Codex finite-base follow-up for Claude (2026-10-21)

The six campaign streams remain paused. The author asked Codex to investigate
only the standing finite-base question while Claude waits for its reset.
Read research/division-campaign/finite-base-followup/README.md first, then
dossier §18.27. New proofs are imported by Composition.lean and build.

**Result:** the counterexample extends to every complete nonempty finite
base list at the semantic row-equation level, including finite remainder
rows. Two-/four-base instances are included; an omitted base invalidates
the family. The Nat-indexed SigProblem encoding is not formalized. A source
gate generates the shape and parses/resolves, but is not established valid
for Waxwing's richer universe. No desired source feature is shown broken.

**Next:** pin down the intended generic type universe before continuing
D3a/D3b completeness. See the note's six scoped actions. The original
singleton target at 9c3b9b7 built separately; its paused branch is not
integrated here. No production source change, D4 adoption or push.

**Evidence:** full Lean library build and new axiom report in the follow-up
directory. Source probes use existing output modules, not a clean compiler
build. The quiet-machine verify is still owed before campaign resumption.
Other sessions' README/backlog/direction edits were preserved unstaged.

---

# Waxwing / record composition foundation: presence fragment decided (2026-10-21)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). For the
presence fragment (finite rows, declared hypotheses, infinitely many
labels): O1-O3 and D2 proved, and validity decided by a computable check
(`valid_iff_validCheck`). Dossier §18.11-18.12;
research/composition-proofs/Composition/Presence/ (Defs.lean is the
shared interface; Examples.lean the non-vacuity fixtures). Typed oracle
passes: §18.7 (first), §18.8-18.9 (second, nested; amended grammar
29/29), review §18.10. No compiler code changed. Task 7 stays
checkpointed (`r005b-task7-wip`). Agent worktrees removed; their
branches (`worktree-agent-*`) kept.

**Read, in order.** This entry; dossier §18 from §18.6 (statements),
§18.9-18.12 (results and reviews); docs/progress.md, the last three
entries.

**Next, needs the author:** review of §18.9 (the amended grammar, chosen
after a run) and §18.12 (presence results). Open, each a separate
approval: D3b's construction (deferred until the nested pass is
reviewed; must handle nested structure, every equality `D` requires,
and rigid type variables tied to rows), D3a beyond bounded evidence, a
constructive witness procedure, D4, compiler changes, solver
integration.

---

# Waxwing / record composition foundation: typed oracle, first pass (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). §18's
statements amended (§18.6); the typed term-witness oracle's first pass
run (§18.7): no separation. No compiler code changed. Task 7 stays
checkpointed (`r005b-task7-wip`).

**Read.** Dossier §18.6-18.7; sig-oracle/README.md, "The typed
term-witness oracle".

**Next, needs the author:** review of the amended D1-D3 and the oracle
results; whether to run a second pass with records nested in fields,
and the D3b construction. Not authorized: proofs, D4, compiler changes.

---

# Waxwing / record composition foundation: dividing rigid rows (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). §17
accepted; §18 research proposal written. No compiler code changed.
Task 7 stays checkpointed (`r005b-task7-wip`). Website fix complete
(`7130dfc`, per the author).

**Read.** Dossier §18; research/composition-assessment/division/.

**Next, needs the author:** approval of §18.3's statements D1-D3 (D4
only as a later design) and of §18.5's first step, the typed bounded
oracle aimed at type-agreement placements. Not authorized: a solver,
proofs, the narrower-signature workaround as policy, compiler changes.

---

# Waxwing / record composition foundation: source-level boundary (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). Proved:
P9s soundness, the verified checker, K7, K8, and the source-level
boundary (§17). No compiler code changed. Task 7 stays checkpointed
(`r005b-task7-wip`). The website fix is complete: the author reports it
pushed through `7130dfc` (on `main`) and verified live.

**Read.** Dossier §17; research/composition-proofs/README.md
(SourceBoundary row); sig-oracle/source-boundary.mjs.

**Next, needs the author:** §17.4: research a procedure that divides
rigid rests (`route`'s shape), or record the narrower-signature
workaround as a known limitation for now. Also open: whether the
compiler's constraints match §17.1's hand translation, how accepted
constraints justify compilation and split selection, compiler
integration. Not authorized: adopting P9s or its boundary as policy,
compiler changes.

---

# Waxwing / record composition foundation: K7 and K8 proved (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). Proved:
P9s soundness, the verified checker, no loss against `Accepts` (K7),
and that `Accepts` refuses the valid `split` (K8). No compiler code
changed. Task 7 stays checkpointed (`r005b-task7-wip`). The author
notes the website fix remains paused (superseded: complete, see above).

**Read.** Dossier §16.5; research/composition-proofs/README.md.

**Next, needs the author:** review of this milestone. Open as separate
decisions: which valid signatures P9s leaves Unresolved, whether source
produces the intended constraints, how accepted constraints justify
compilation and split selection, compiler integration. Not authorized:
adopting P9s or its boundary as language policy, compiler changes.

---

# Waxwing / record composition foundation: K7 statements (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). Checker
milestone accepted. No compiler code changed. Task 7 stays
checkpointed (`r005b-task7-wip`).

**Read.** Dossier §16 (K7 statements, optional K8, restrictions table,
adversarial review).

**Next, needs the author:** §16.4: approve K7a-K7c, the lifting lemma
and K7; whether K8 (`¬ Accepts splitSig`) joins; the file plan. Then
Lean. Not authorized: proofs before approval, adopting P9s, compiler
changes.

---

# Waxwing / record composition foundation: verified certificate checker (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). P9s
soundness accepted; the certificate checker (K1-K6) proved, for review.
No compiler code changed. Task 7 stays checkpointed
(`r005b-task7-wip`).

**Read.** Dossier §15.7-15.8; research/composition-proofs/README.md
(Sig/ rows); sig-oracle/README.md (export-lean.mjs).

**Next, needs the author:** review of the checker milestone. Open as
separate decisions: K7, certificate search, completeness, Unresolved
policy, source-to-constraint translation, compiler integration. Not
authorized: adopting P9s, compiler changes.

---

# Waxwing / record composition foundation: certificate checker statements (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). P9s
soundness (`s1`, `s1_fin`) accepted; P9s not adopted. No compiler code
changed. Task 7 stays checkpointed (`r005b-task7-wip`).

**Read.** Dossier §14.8 (end: acceptance) and §15 (checker statements,
restrictions table, adversarial review).

**Next, needs the author:** approval or amendment of §15.6 (K1-K6 and
§15.2's definitions; whether K7 joins the milestone; the `DecidableEq`
assumptions). Then Lean: Sig/Syntactic, Check, Patterns,
CheckExamples. Not authorized: proofs before approval, adopting P9s,
compiler changes.

---

# Waxwing / record composition foundation: P9s soundness proved (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). No
compiler code changed in this thread; Task 7 stays checkpointed
(`r005b-task7-wip`). Verify last run before this thread.

**Read.** Dossier §14.8 (approval, the amendments found while proving,
the Lean table, deliberate checks); research/composition-proofs/
README.md (Sig/ rows).

**Next, needs the author:** review of the milestone, in particular the
weakened premises (W1, W2 dropped; W3 only through D1). Open as
separate decisions: completeness (Q1-Q3, `split`), certificate search
and an executable certificate format, policy for Unresolved
signatures, compiler integration. Not authorized: adopting P9s in the
compiler, CR.

---

# Waxwing / record composition foundation: P9s soundness statements (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). No
compiler code changed in this thread; Task 7 stays checkpointed
(`r005b-task7-wip`). Verify last run before this thread.

**Read, in order.** As in the entry below, then dossier §13.9 (the
author's review of §13.8: two tracks, Q1-Q3, the BAPA translation and
the finite-rows finding) and §14 (P9s soundness statements, the
restrictions table, the claim-level check, the adversarial review);
sig-oracle/README.md "Checking the interpretation".

**Next, needs the author:** approval or amendment of §14.7's four
points (the statements; the rest encoding flagged under ADR 014;
S1-fin vs S1 as the target and whether `Valid` moves to finite rows;
the Lean file plan). Then, if approved, Lean proofs of L1-L4, S1.
Not authorized: proofs before that approval, adopting P9s, CR,
compiler changes.

---

# Waxwing / record composition foundation: C9 under review (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed), last commit
2bd2aec. No compiler code changed in this thread; Task 7 stays
checkpointed (`r005b-task7-wip`). Verify last run before this thread.

**Read, in order.**
1. docs/plans/2026-10-20-composition-foundation-assessment.md (why:
   systems surveyed; Wand is the leading candidate, §4.11; decision 1).
2. docs/plans/2026-10-20-record-composition-dossier.md (the work):
   §2 verdicts; §§9-12 proved milestones (Lean): elementary claims,
   substitution and binding equations, finite reduction R1/R2, the
   closed-problem decider and `decideCall_correct` (call-site
   satisfiability decidable); §13 C9 signature checking, statements
   first; §13.7 P9's completeness refuted (`split`, `recSig`),
   restrictions table, P9 reclassified as candidate sound and
   incomplete (P9s); §13.8 bounded ∀∃ oracle and BAPA reading.
3. research/composition-proofs/README.md (Lean 4.35, `lake build`;
   no `sorry`); research/composition-assessment/sig-oracle/README.md;
   research/composition-assessment/bapa/README.md.
4. docs/engineering.md "Adversarial review of proposed procedures"
   (the author's convention: restrictions table, separate soundness and
   completeness passes, claim-level oracles, adversarial reviewers).

**How the author works here.** Reviews arrive pasted (often from
another model); each phase is authorized explicitly (statements first;
proofs only after approval; no compiler change until a dossier is
adopted). Labels: published / derived / checked / unresolved.

**Next, needs the author:** review of §13.8. Open questions listed
there: whether emptiness per region suffices for Waxwing's positive
atoms; whether flexible rows need part of a region; how per-label field
types are quantified and equated. CR is not to be pursued as stated.
Not authorized: proofs of CR, adopting P9s, compiler changes.

---

# Waxwing / R005 Tranche B: B5 complete, for final acceptance (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). B5 with
decisions 20-23: D4/D6, the field-blame fix, colliding names qualified,
width covering new files, two performance regressions found and fixed;
verify 2366/2366, 59/59, 176; differential 52, every one a placeholder
replaced (docs/progress.md "R005 Tranche B B5: colliding names, width
coverage").

**Next, needs the user:** final acceptance of B5; Task 7 stays blocked
until then. Open: partialFirst's timing bound is missed by the base too
on this machine (BACKLOG T003).

---

# Waxwing / R005 Tranche B: B5 done, for review, unmerged (2026-10-20)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). B5
implemented on top of decisions 20 and 21: D4 and D6 rendered, P2 and P6
removed; verify 2363/2363, 59/59, 174 proofs; differential: 47
differences, every one a placeholder replaced. Evidence and seven points
for the user in docs/progress.md "R005 Tranche B B5: implementation".

**Next, needs the user's review:** B5, and those seven points (field
type clashes keeping their own text; O1/O2 as H's D6; colliding names;
lambda names and handler positions waiting for Task 7; design-holes'
location under T6; tests written after the code; the machinery added).
Task 7 stays blocked until B5 is reviewed.

---

# Waxwing / R005 Tranche B: B5 started, texts pinned (2026-10-19)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). Hint
wording approved (plan §10 decision 20). B5's first commit pins the
texts: diag-06's amended hint, 13 `render-*` fixtures with 9 annotated
companions, participation-control; test/r005b-fixtures.test.mjs at
`task` 6 is red on 16 fixtures, each on its placeholder (evidence in
docs/progress.md "R005 Tranche B B5").

**Next.** The user's answers on three points in that entry: T6 (D4 at
the argument for a parameter's row; diag-18's approved `p` not met),
`none of` unreachable, `same-name-parts` to Task 7. Then PartOrigin,
Unresolved.purs and Contradicted.purs, R11's tie-break test, the
structural test, P2 and P6 removed, verify, the differential.

---

# Waxwing / R005 Tranche B: B4 done, for review, unmerged (2026-10-19)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). B4 (the end
of a body: H and Unresolved) is done on top of B3 and 2g (decisions 17,
18): code commit 3157b6d; verify 2334/2334, 59/59, 164 proofs; evidence
in docs/progress.md "R005 Tranche B B4". P5 is gone; Unresolved bodies
report P6 and H's refusals P2's text until B5. The three approved
reclassifications and `same` are in test/fixtures.

**Next: B5 is authorized** (decision 19; B4 accepted, its one test gap
closed). Before pinning any new hint wording, bring it back for
approval: a lambda annotation offered only where it can resolve the
constraint; for a call's own rows (O4) the limitation explained, with
no annotation suggested (decisions 17, 19).

The working method and design notes below still apply.

---

# Waxwing / R005 Tranche B: B3 with case 2g, for review, unmerged (2026-10-19)

**State.** Branch `r005b-replan` (UNMERGED; nothing pushed). The user
accepted the B3 follow-up and approved case 2g and keeping O4's
limitation (plan §10 decision 17). 2g is implemented within B3 as
amended the same day: the first form (a missing atom waits) made a
refusal order dependent, so 2g now applies only when the result holds
every label and rigid tail of the right part, and otherwise claims
nothing. Code commit ae295d1; verify 2319/2319, 59/59, 160 proofs;
evidence in docs/progress.md "R005 Tranche B B3: case 2g".

**Next, needs the user's review:** the 2g change (rules file §3a, the
amendment, the evidence with and without H). B4 stays blocked until it
is reviewed. B5 must bring back the exact wording of the two kinds of
hint (a lambda annotation where it helps; for a call's own rows, the
limitation explained) for approval; no new text is approved. O4 is an
accepted limitation; O1-O6 otherwise open.

The working method and design notes in the section below still apply.

---

# Waxwing / R005 Tranche B: B3 and its follow-up for review, unmerged (2026-10-19)

**State.** main is at 1d43341 (the Sym/H research merge); the active
branch is `r005b-replan` (UNMERGED, by the user's choice): the
implementation plan, README draft and prose review, B0's evidence, the
user's B0 decisions (plan §10), B1's behaviour-preserving splits and
B2's removal of the invented machinery (code commit 1bb23ae; verify
2269/2269, 59/59, 151 proofs; differential against d7efc6d: 0 among
sources without Tranche B syntax, 9 Tranche B differences classified in
docs/progress.md "R005 Tranche B B2"). Since B2 only the one-tail rules
decide record rows; any residue with two unknown tails on a side is
placeholder P1 until B3. `r005b-task5` holds the stopped custom-solver
Task 5 WIP (reference only; superseded). Nothing is pushed, ever, unless
the user asks.

**Design (adopted 2026-10-19).** Tranche B (open-row merge) uses
QT-strict + Sym + H + broad 1g: PureScript 0.15.16's `Union` solving
cases (pinned 4c66c05a), symmetric merge (Sym), H as a classification
rule only (no binding/defaulting/acceptance effect), and 1g justified by
the symbolic disjoint union. Order independence is SUPPORTED BY
MEASUREMENT (acceptance, inferred types, verdict kinds), never "proved".
Annotation cost is explicit; some annotations narrow typings (S1, Q1).
Governing docs: docs/adr/014-composition-not-invention.md;
docs/plans/2026-10-19-row-merge-implementation-plan.md (§10 decisions,
ledger, tasks B2-B5, 7-10); docs/plans/2026-10-19-row-merge-readme-draft.md
(final path src/Features/Check/RowMerge/README.md);
docs/plans/2026-10-18-row-merge-qualified-types.md (research record).

**Next, needs the user's review:** the B3 follow-up (code commit
b3ac648; verify 2308/2308, 59/59, 157 proofs; docs/progress.md "R005
Tranche B B3 follow-up") and a decision on
docs/plans/2026-10-19-row-merge-limitations.md (case 2g proposed for
the self-call and forwarding wrappers; O4 kept; D4's hint). B4 (H,
Unresolved, the reclassified fixtures, O1-O6's classes) stays blocked
until B3 is approved.

**Working method the user expects.** A branch per task; the user
authorizes each task and each merge (fast-forward only); the controller
reproduces agents' key evidence before relaying it and reports
corrections plainly; Sonnet for mechanical work, Opus for solver/design;
estimates are not budgets; evidence rules in docs/engineering.md
(claims backed by checks, three-way results, result boundary
classification, prose review with humanizer and Garner for READMEs).
The untracked `.agents/skills/humanizer` and `.claude/skills/humanizer`
are the user's installation: leave them alone.

---

# Waxwing / evening queue done (2026-10-17)

Merged into main by fast-forward overnight (nothing pushed; each with a
green `npm run verify` and the controller's review): R005 Tranche A
(extension, `without`, rest binders, written lacks, `{}`), R013
(records-heavy chains: 2,000 declarations 7.5 s to 0.18 s), hygiene
F007, F006 and A005, T002 (per-process go-batch directories) and R011
(only used record layouts are emitted; records.go loses three unused
structs). Latest verify: 2120/2120, 59/59, 142 proofs.

Waiting for the user, all written unattended and marked Proposed:
- R005 Tranche B: draft 2 of the algorithm
  (docs/plans/2026-10-16-open-row-merge-design.md) after an adversarial
  review (docs/plans/2026-10-16-open-row-merge-review.md); open
  questions in its §14 (implied vs written `disjoint`, completeness,
  tail order, texts, a precedence rule that would change some Tranche A
  notes).
- T013: verify profile (docs/plans/2026-10-17-verify-profile.md);
  regression proofs are 85% of 21.5 min; proposals (prebuilt output
  plus incremental compile per proof; parallel workers) need approval.

No provisional texts or decisions were adopted. Then: INF001 and C001.

---

# Waxwing / R005 Tranche A merged; evening queue running (2026-10-16)

R005 Tranche A was fast-forwarded into main at fedb8ff (branch deleted,
nothing pushed). The Tranche B algorithm draft,
docs/plans/2026-10-16-open-row-merge-design.md, was written unattended
and awaits the user's review (open: how complete the deferred-equation
solver should be; whether `{ ...r, ...s }` in a signature implies
`r disjoint s`). The evening queue continues: R013, A005, F006, F007,
then a verify phase profile (docs/progress.md "Unattended evening
queue").

---

# Waxwing / R005 Tranche A done on branch `record-extension` (2026-10-16, merged since)

R005 Tranche A (extension, `without`, rest binders, written lacks, `{}`)
is complete on branch `record-extension` (Tasks 1-3; nothing pushed or
merged). Gates: `npm run verify` exit 0 (2103/2103, 59/59, 142 regression
proofs); the reference interpreter agrees with Go on 200/200 generated
programs; the differential against main shows 371 differences, all in the
parse phase: sources using the new syntax or the four new reserved words
(`where lacks without disjoint`). Evidence in docs/progress.md "R005 Task
3" and .build/evidence/r005-t3-*.log. Next: the controller's review and
fast-forward into main (no merge commits); Tranche B (open-row merge,
`disjoint`) needs its algorithm pass before planning; then the INF001
design and C001. No provisional choice is waiting for approval.

---

# Waxwing / R004 merged into main (2026-10-16)

R004 (record patterns) was fast-forwarded into main at 2ca49ab on
2026-10-16; branch `record-patterns` deleted; nothing pushed. R005's
design is drafted (docs/plans/2026-10-16-record-extension-design.md)
(draft 2): Tranche A (extension, written lacks, removal, empty
records) is approved and planned (docs/plans/2026-10-16-record-
extension-plan.md, 3 tasks, all texts approved); Tranche B (open-row
merge) needs an algorithm pass. Then the INF001 design and C001.
Alongside: a phase profile of `npm run verify`.

---

# Waxwing / R004 done on branch `record-patterns` (2026-10-16, merged since)

R004 (record patterns) is complete on branch `record-patterns` (four
commits for Task 4 on top of Tasks 1-3; nothing pushed or merged). Gates:
`npm run verify` exit 0 (1975/1975, 59/59, 134 regression proofs); the
reference interpreter agrees with Go on 200/200 generated programs; the
differential against main shows only `{` in pattern position (before:
E_SYNTAX) and the Task 3 inhabitation change. Evidence in docs/progress.md
"R004 Task 4" and .build/evidence/r004-t4-*.log. Next: the user's decision
to merge by fast-forward (no merge commits); then R005's design
(extension, merge and removal), which would also settle binding the rest
of a record.

---

# Waxwing / R014 merged; R004 design approved (2026-10-16)

R014 was fast-forwarded into main at 955ad33 (branch deleted, nothing
pushed). R004's design, docs/plans/2026-10-16-record-patterns-design.md,
has the user's decisions (2026-10-16): a record pattern names every field
or ends with `...`; fields pun in patterns; the missing-field text and
witness form are approved. The plan,
docs/plans/2026-10-16-record-patterns-plan.md, was revised after the
user's review and regrouped into four tasks (2026-10-16); its open-row
text is approved. Next: Task 1 (parse and resolve) on branch `record-patterns`;
then R005's design.

---

# Waxwing / R014 done on branch `r014` (2026-10-16, merged since)

R014 (written type names looked up through TypeIndices rather than
scanned) is done on branch `r014` from main 41cbbbb: 0 differences
against 41cbbbb over every differential corpus; the 10,000-type chain
about 940 → 577 ms and R013's records-heavy chain at N=1,000 4.1 → 1.7 s
(docs/progress.md "R014"). Nothing is pushed or merged; merge by
fast-forward only.

Next, unchanged: R004 (record patterns) and R005 (extension, merge and
removal), each with a design the user approves first; then the INF001
design and C001 with records of operations. Alongside: a phase profile of
`npm run verify`.

---

# Waxwing / internal-error batch merged into main (2026-10-15)

The internal-error batch was fast-forwarded into main at a1df6fc on
2026-10-15 after a clean verify of that tree (1909/1909, 59/59, 127
proofs); the branch and worktree are deleted, nothing is pushed. FX025
(d0c9f8a), R015 (b07d11f), R016 (3e610b6), R010 (75b2aa3) and R017
(036153b, found while fixing R016: a row read as a type, or a type
variable as a row, in a body), each with tests seen failing first and
regression rows (scripts/regression-ie.mjs), using existing or approved
texts only (docs/progress.md "FX025 and R015", "R016 and R010").

Next, in order: R004 (record patterns) and R005 (extension, merge and
removal), each with a design the user approves first; then the INF001
design and C001 with records of operations. Alongside: a phase profile of
`npm run verify`, R013 and R014.

Setup facts: run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in
a worktree (copy .spago and .build/home in); delete .build/regression and
.build/go-cache after a run.

---

# Waxwing / R001 merged into main; internal-error batch next (2026-10-15)

R001 (records, first tranche, with R012 and plan Tasks 13-15) was
fast-forwarded into main at 80b5b53 on 2026-10-15 after a clean final
verify on that tree; the `records` branch and worktree are deleted, and so
are the git-ignored evidence logs and SDD ledger the R001 docs cite under
.build/evidence and .superpowers (the figures are kept in docs/progress.md,
ADR 013 and BACKLOG). The user confirmed FX024's consequence (an
unannotated arrow in a label's argument is `pure`; ADR 010, FX028).
Nothing is pushed.

Next, in order: the internal-error batch on branch `r001-followups`
(FX025, R015, R016, R010: user-reachable E_INTERNAL or misleading
diagnostics, using existing or approved texts); then R004 (record
patterns) and R005 (extension, merge and removal), each with a design the
user approves first; then the INF001 design and C001 with records of
operations. Alongside: a phase profile of `npm run verify`, R013 and R014.

The section below is the pre-merge state, kept as history.

---

# Waxwing / R001 records first tranche and final fix wave done on branch `records`; awaiting merge decision (2026-10-15)

R001's first tranche (records, BACKLOG R001) is complete on branch
`records` (worktree .worktrees/records, from main de96a15): Tasks 1-11 of
docs/plans/2026-10-14-records-plan.md, ADR 013 (docs/adr/013-records.md),
the Records section of docs/language.md, examples/records.wxw with
bootstrap/records.go, and the "R001" entries in docs/progress.md. The
whole-branch review's fix wave (docs/progress.md "R001 final fix wave")
fixed C1 (types written in a body are held to the signature's lacks sets;
E_TYPE `r may already have field a`, approved 2026-10-15) and FX024 (a
label's arguments have no ambient row), and filed R012 and E019. R012
(concrete record-row arguments, plan Task 12) is done, and plan Task 13
fixed the pre-merge evidence (T012 done, FX024's shared `...e` tests,
BACKLOG E020 and FX025-FX028). Nothing is pushed or merged. Next: the
user's merge decision, by fast-forward only (no merge commits). Ledger and
reports: .superpowers/sdd/2026-10-14-records-plan/ (final-fix-report.md
for the wave).

Open items from R001: fast-follows R004 (record patterns) and R005
(extension, merge and removal with written lacks constraints); later R006
(polymorphic fields), R007 (punning), R008 (type aliases), R009
(record-row parameters of effects); found during the tranche R010 (the
instantiation rule misses record rows; growth is caught only by the 10,000
limit), R011 (unused tail structs), E018 (lambda missing-field
diagnostic), E019 (lacks-failure wording; needs approval), T011 (record
corpus gaps, now also lambda annotations over open tails and handler type
arguments), and an I001 note (nil field access). FX024's fix makes an
unannotated arrow in a label's argument `pure`, so raising an ambient
callback in a payload is now rejected; confirm that consequence with the
user (ADR 010). G002 is unchanged at 259; G006 gained a reproduction; T007
has the harvest-run timing figures. After R001: the INF001 design, and
C001 with records of operations.

Setup facts: run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in
the worktree; `node scripts/width.mjs` checks git-tracked files only, so
run it after `git add`. Delete .build/regression and .build/go-cache after
a verify run; agent copies for mutant proofs and differentials exclude
.build and are deleted.

Older sections below are history.

---

# Waxwing / FX020 merged into main; housekeeping; R001 next (2026-10-14)

FX020 (effect operation namespaces, BACKLOG FX020) was merged into main by
fast-forward on 2026-10-14 (c374b40). Its worktree and branch are removed.
Evidence logs are kept under .build/fx020-evidence/ (gitignored) in the main
checkout. The SDD ledger is gone; its rulings are summarised in
docs/progress.md "FX020" and ADR 012 (docs/adr/012-effect-namespaces.md).
The 80-column width gate (cd4a862) and IDE001 stage 1 (b2be43f..3f1b564) are
already on main.

Housekeeping (branch `housekeeping`, not merged): the VS Code grammar follows
FX020. `fail` is no longer a contextual keyword, `Effect.op` is highlighted,
and `as` aliases and import lists in a signature row are scoped; fixture
editors/vscode/fixtures/effect-namespaces.wxw, README "What is highlighted".

Next: R001 (records) design, jointly with C001 (`r.field` coexists with
`Effect.op` because qualifiers are uppercase), then the INF001 design.

Open items from FX020: FX021 (an import from an unreachable duplicate label
silently binds the first); the INF001 requirement (a way to alias or import
without writing the whole inferred row); `print` and `show` stay
compiler-provided until C001; G002 margin is 259 against the limit 256;
G006 stack flake; T007 timing figures.

Setup facts: run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in the
worktree; `node scripts/width.mjs` checks git-tracked files only, so run it
after `git add`. The regression runner leaves about 2 GB under
.build/regression; delete it after a run. The grammar snapshot check is
opt-in (editors/vscode/README.md).

Older sections below are history.

---

# Waxwing / Text v1 done on branch `text`; review done (with fixes), merged into main 2026-10-13 (2026-10-13)

Text v1 (BACKLOG D001, first tranche) is implemented on branch `text` (worktree
`.worktrees/text`, rebased onto main 0b1f850): Tasks 1-9 of
docs/plans/2026-10-13-text-plan.md, ADR 011 (docs/adr/011-text.md), the Text
section of docs/language.md, examples/text.wxw with bootstrap/text.go, and
the Text entry in docs/progress.md. Nothing is pushed or merged.

Order from here:
1. Text is merged into main (2026-10-13) after the whole-branch review.
2. Phase 2 of the 80-column sweep (scripts/width.mjs): the text-touched files
   that phase 1 left (about 98 lines over 80 across 468 files at the end of
   Task 9, in docs/engineering.md, scripts/structure.mjs and several tests).
   The width.mjs argv guard and the fence toggle for mixed fence characters
   are phase-2 items.
3. IDE001 waits to be rebased onto main after Text merges.
4. FX020 (effect operation namespaces; at the time, the spec awaited the
   user's review) was next after that, then R001. FX020 has since been
   implemented; see the top section.

Open items from Text: `show` is compiler-provided until C001 (ADR 011);
user Console handlers are still uninhabited (BACKLOG D001); Text operations
are STD001; a flat chain of 130 `++` operands is E_NESTING until O001.

Setup facts: run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in the
worktree; the regression runner leaves about 2 GB under .build/regression,
delete it after a run. Agent copies for mutant proofs and differentials
exclude .build and are deleted.

# Waxwing / FX001 Tasks 1-12 reviewed; awaiting merge decision (2026-10-12)

FX001 Tasks 1-12 are complete on branch fx001-finish (worktree
`.worktrees/fx001-finish`). The whole-branch review (Opus) answered "with
fixes" (no Critical); its fixes are in e53cab9 and passed a scoped
re-review. Nothing is pushed from the branch. Task 11 added the
acceptance scenario (examples/services.wxw) and scale tests; Task 12 added
fifteen regression rows (81 proofs in verify), ADR 010
(docs/adr/010-effects.md), the language Effects section (docs/language.md)
and the documentation updates (docs/progress.md, "FX001 Task 12"). Ledger:
docs/sdd/2026-10-09-effects-plan/progress.md ("FX001 Tasks 11-12").
Evidence logs are in the worktree's .build/ (final-fix-verify.log: exit 0,
1252/1252 parallel, 53/53 serial, 81 proofs).

Next: the user's decision on merging fx001-finish into main.

FX018 (callback-row diagnostics under `with`/`handle` and in argument
passing) is done on branch fx018 from 0a23784; not pushed or merged
(docs/progress.md, "FX018").

FX017 (callback-row diagnostic) is done on branch fx017, a diagnostic-only
change from 3ff0538: `q must allow every effect of a (L + M), but its row
is L; ...` with notes at both written rows (docs/progress.md, "FX017").
Not pushed or merged; it touches the same tree as fx001-finish, so merge it
after the fx001-finish decision. Open question left with FX007: whether a
callback's row should be subsumed by its caller's.

Open BACKLOG items after FX001: FX002 (concurrency, builds on CF001), FX003
(local state, recording fakes), FX005 (`ctx` elimination, cached lookup),
FX006 (general resume), FX007 (relax strict `defer`; `nofail ...e`), FX010,
FX011, FX012, FX013-FX016 (FX008 limitations: L1 with P5, L4, L6, handler
through a generic function), T009, T010, D002, E013, FN006 items (1) (a
`make()(x)` oracle row) and (2), plus the notes added to D001, R001, STD001,
PKG001, I001 and CF001. INF001 stays the next language milestone after
FX001 merges. FX008 is merged into main and pushed (2026-10-12).

Size notes: Subst.purs 245 lines, Domain/Type.purs 250 (no headroom),
Format/Diagnostic.purs near the limit. Agent copies for mutant proofs
exclude .build and are deleted; the regression runner leaves about 2 GB
under .build/regression, delete it after a run.

Setup facts: run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in
the worktree; .spago and .build/home were copied in.

# Waxwing / FX008 merged into main; FX001 Tasks 11-12 next (2026-10-12)

Future milestone INF001 was defined at the user's request on 2026-10-11:
[automatic requirement and error composition](plans/2026-10-11-requirement-and-error-inference-milestone.md).
Includes setup/assembly errors and business-logic errors, automatic named
function channels, partial provision and recovery. Requirements brief only;
independent and adversarial review complete.
Ledger: `docs/sdd/2026-10-11-inference-milestone/progress.md`. Finish active
FX008/FX001 work before its language design and plan.

FX008 (type-level tracking of handlers that may fail; `nofail` and
`nofail(k)` marks; the mark check makes `defer` sound) is complete:
Tasks 1-12 of docs/plans/2026-10-10-abort-tracking-plan.md, T008 (linear
settling) and the whole-branch review with its fixes
(docs/sdd/2026-10-09-effects-plan/review-fx008-branch-result.md). Merged
from fx008-impl into fx008 (dd1efd6), with main's INF001 docs merged in
(1331ae4), then main fast-forwarded and pushed with the user's approval
(2026-10-12). The worktree's evidence logs are kept in the main checkout
under .build/fx008-impl-evidence/ (gitignored); docs/progress.md cites
them as "in the worktree".

Next: FX001 Task 11 (amended for `nofail`) and Task 12 (ADR 010, language
Effects section, regression-fx rows; see docs/plans/2026-10-09-effects-plan.md).
Open FX008 follow-ups in BACKLOG: FX010 (narrowed), FX013-FX016
(limitations), T009 (remaining alias shapes and accepted constant
factors), T010 (`nofail(k)` generator shape), D002, E013.

Size notes: Subst.purs 245 lines, Domain/Type.purs 250 (no headroom).
Agent copies for mutant proofs exclude .build and are deleted.

Execution: subagent-driven, as the user directed (2026-10-10). Sonnet
implements each task, and Opus reviews each. Escalate to Opus on a
genuine ambiguity, a gate failure, or a second failed review.

Stop conditions still in force:
- any probe change the gate table does not list (stop and report);
- the first observed text of a pattern-gated probe (report to the user
  before pinning);
- user-facing text changes outside the approved P10 texts.

Setup facts:
- run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in the
  worktree;
- .spago and .build/home were copied in;
- baseline for comparisons: `node scripts/differential.mjs --baseline
  <build of the previous task's commit>`.

Open BACKLOG items from this session: FX010, FX011, FX012, E012, G004,
T008. FX009 is fixed and merged.

# Waxwing / FX001: Task 10 done; FX008 design next (2026-10-10)

Branch claude/vibrant-cerf-3km61i = main (PR Ethan826/waxwing#1, Tasks 1-9)
+ Task 10 (reference interpreter, generator, 500-program differential
corpus with 0 differences; test-side only) + docs. FX001 Tasks 1-10 are
complete and reviewed; Tasks 11-12 are amended in the plan (rulings
R1-R12) and not started. Work continues on the user's machine.

Next, before Tasks 11-12: FX008 (BACKLOG), a soundness hole in the strict
`defer must not fail` rule. Cleanup may perform an operation whose handler
clause fails — the handler may be installed by a caller in another
function — so a typed abort can end a cleanup (pinned in
test/fx-oracle.test.mjs). User decisions 2026-10-10: do not weaken the
language's structure or design (no runtime delivery or conversion of such
aborts); fix by type-level tracking: performing L under a handler whose
clauses may fail may abort, carried through rows and across calls. Write a
design note (spec §2/§3 change), get it reviewed, decide with the user,
then implement test-first; afterwards lift Task 10's generator restriction
(fail-free random clauses).

Awaiting the user's review:
- CF001 concurrency foundations, docs/plans/2026-10-09-concurrency-
  foundations-design.md: recommended fork-join subset (`par let`),
  R0 "performs no X" rule, task-boundary rules, failure selection, discard
  contract, and the 2026-10-10 operational addendum (§8A: supervision vs
  structured concurrency, defect boundaries, state ownership, overload,
  observability, host boundaries, tooling) with decisions O-1..O-7. Four
  Opus review rounds plus addendum reviews; not authorized for
  implementation.
- BK001 Go backend maintainability, docs/plans/2026-10-10-backend-syntax-
  proposal.md: Tier 1 (total plan records, Signature/Callee by call kind,
  Go-correct quoting, Lines/Inline helpers) after FX001; migration steps
  0, 1, 6 before FX005/FX002 lowering. Not authorized.
- FX007: strict `defer must not fail` (adopted 2026-10-09; bracket idiom
  needs `with pure` callbacks) vs a future lacks-Fail constraint.
- Task 12 ADR 010 wording additions from CF001 §10/§8A (cause kinds an
  open set; report and exit 1 are main's root policy; Go fatal errors are
  Go's behaviour, not a Waxwing guarantee; `cleanup failed:` means a cause
  raised by cleanup).

Execution: superpowers subagent-driven-development (skills linked under
.claude/skills): Sonnet implementers, Opus reviews; Haiku/Sonnet for
mechanical edits and small re-reviews. Ledger and every brief/report/review
are snapshotted in docs/sdd/2026-10-09-effects-plan/ (the live workspace
.superpowers/sdd/ is git-ignored).

Cloud environment notes: run `NODE_USE_ENV_PROXY=1 npm run build` once to
fill .spago (not during verify). Use `GOTOOLCHAIN=go1.26.4`. On this
container fixed timing bounds fail at unchanged baselines (BACKLOG T007,
T004); per ruling R1 a verify passes when only those fail and
`node scripts/regression.mjs` exits 0. Never relax a bound. The container
restarted twice during this session; work in flight was recovered or
re-dispatched.

# FN001 merged into main

Workspace: /Users/ethan/Desktop/gofuncyourself, branch main (FN001 merged
2026-10-09 and pushed to origin/main; P001 at dcb40fb). Read AGENTS.md,
README.md, docs/adr/008-functions.md (FN001), ADRs 001-007,
docs/plans/bootstrap.md, docs/progress.md, docs/findings.md,
docs/engineering.md and BACKLOG.md. The uncommitted .vscode/settings.json
change predates this work.

State: first-class functions, lambdas, closures, staged partial and
over-application and `|>` are implemented (ADR 008; design and plan
docs/plans/2026-10-08-functions-{design,plan}.md). `rm -rf output && npm
run verify` exits 0 on the merged tree: 541 parallel tests, 12 serial
tests (`test/*.serial.test.mjs`), twenty-two regression proofs
(.build/fn001-merge-verify.log). Tools: scripts/differential.mjs
(compare two compiler builds), scripts/fn-milestone.mjs (20,000-parameter
tier, not in verify), scripts/ladder-profile.mjs, scripts/stage-probe.mjs,
`node scripts/regression.mjs name…`.

Update 2026-10-09: the user chose FX001. Its written spec,
docs/plans/2026-10-09-effects-design.md, was settled section by section
with the user; the whole-spec review is applied (fd625a4) and §6
diagnostic quality was added at the user's request (provenance, row
difference first, origin/boundary/path notes, distinguished missing-
handler, same-key mismatch and callback-purity errors, bounded
abbreviation, regression cases; PureScript research cases in LA001).
The spec is approved; the implementation plan
docs/plans/2026-10-09-effects-plan.md (12 tasks) was revised after the
user's review and execution is authorized: subagent-driven (fresh
implementer and reviewer per task, whole-branch review), branch fx001 in
.worktrees/fx001; stop and report if Task 1 rejects a runtime shape.

Earlier next steps (before FX001 was chosen): none authorized. Candidates, for
the user to choose: C001
and R001 (review jointly; decide whether instances are ordinary records),
FX001, FN001 follow-ups FN002-FN006, and the open timing/scale items
T002-T005, G002, G003.

Long-term discussion is recorded in plans/2026-10-08-language-direction.md:
row/service architecture, explicit effects design (FX001), inspectable
lowered IR (L001), and future target evaluation (J001). These do not
authorize new implementation.

The same direction document records proposed `do` notation under FX001:
bind/lambda elaboration, result bindings and discarded results, final
computation, deferred execution, and inferred service/error requirements.
Syntax, bind/pure selection and monadic versus algebraic effects remain
open; this records discussion without authorizing implementation.

Further discussion favors evaluating Koka-inspired direct-style effects
and familiar `+`/named spread notation (`Log + ...effects`). See the
direction document's open-row section for inference and proposed implicit
universal quantification. Explicit effect-row constraint syntax is a
future feature outside initial FX001; keep record-row constraints separate.

Language-direction now also captures MileAhead's open error-row pattern
from read-only ../trailmapper: family rows compose without wrappers, stay
open until handling, and wrap only to add context. Candidate Waxwing error
sums hide `Variant`/injection plumbing. FX001/R001 must resolve the open
error-sum need against R001's deferred general variants before changing scope.

STD001 records the user's common-FP-helper requirement and approachable
naming direction, informed by Rust. Read
docs/plans/2026-10-08-standard-library-direction.md: inventory, candidate
names (getOrElse, mapOrElse, matchWith, joinWith), eager/lazy distinctions,
coverage acceptance and staged prerequisites. No helpers added to FN001.
User clarification: naming convenience must preserve lawful HKT-based
generic contracts. bimap works for any Bifunctor; optional values and
fixed-error Result share Functor/Applicative/Monad APIs. Read STD001's
generic-rigor section for constructor kinds, instance/evidence design,
user-defined-instance acceptance and law/coherence properties.

LA001 now plans the broader cross-language audit, beyond STD001's helper
coverage. Read docs/plans/2026-10-08-language-audit-plan.md: twelve required
references, source/version/section ledger, comparative briefs, feature and
interaction matrix, practical scenarios and independent review. Feed it
into upcoming type/row/effect designs without interrupting FN001; existing
advanced-feature deferrals remain. Source entry points checked, audit not run.

Tooling direction is recorded in plans/2026-10-08-tooling-direction.md:
IDE001 highlighting/editor support, DOC001 first-class doctests, PBT001
language-user generators/shrinking/replay and law suites, AI001 versioned
LLM skills/discovery, and exploratory LIT001 literate capabilities. Feed
these into LA001 and focused subsystem designs; no tooling implementation
is authorized or added to FN001. Existing compiler properties do not
complete PBT001. Preserve the tentative status of literate capabilities.
PKG001 extends that direction with portable Waxwing libraries, host FFI,
service implementations/fakes and package management over both Waxwing and
host dependencies. Review exports, source/type identity, target/runtime
support, manifests/locks and host resolver integration with M001/I001/FX001.
Effect Platform is conceptual influence; no package manager, ABI or provider
mechanism is selected and no publication is authorized.

Open items: E002 remainder, E006-E011 (P001 follow-ups: stack margin,
exponential type size, Expand keys, lowercase-type hint, mismatch `_`,
near-limit elision), F001-F003, F005-F007, E001, E003, E004, O001, H001,
A002, A004, A005; design follow-ups FX001, L001, J001 and D001.

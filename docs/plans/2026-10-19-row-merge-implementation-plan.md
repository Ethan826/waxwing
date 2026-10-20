# R005 Tranche B Implementation Plan: the adopted design (QT-strict + Sym + H)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking. **Tasks B1, B2, B3 and B4
> were authorized** (the user, 2026-10-19, each alone) and are done. Do not
> start any later task, or the gate tasks L1 and L2, until the user
> authorizes it, and then only the task the user names. Two gates (§10,
> decisions 12 and 13) block B3.

**Goal:** `fn merge(a: { ...r }, b: { ...s }): { ...r, ...s } where r
disjoint s = { ...a, ...b };` and everything it needs, checked by the
adopted design: record rows with several rigid tails and at most one
unknown tail, `Merge` predicates solved as PureScript 0.15.16 solves
`Prim.Row.Union` (with the approved adaptation Sym), Unresolved bodies
classified by the approved rule H, the merge literal with any number of
spreads, removal and rest binders over such rows, specialization and Go
lowering, the approved diagnostics, and a module README that explains
the solver to an ordinary programmer. Each claim is backed by a fixture,
an oracle property or a measured run.

**Spec:**
- docs/plans/2026-10-18-row-merge-qualified-types.md, "The user's
  decisions (2026-10-19)", §13.1 (QT-strict), §14.1 (Sym), §14.2 (H),
  §14.3-§14.5 (measurements), §14.7 (open findings); §11.5 (sources
  read, PureScript pinned).
- docs/adr/014-composition-not-invention.md (components name their
  sources; local rules need need, argument, evidence and approval).
- docs/engineering.md, "Evidence for solvers and diagnostics" and
  "Result boundary classification" (the evidence rules this plan
  follows).
- docs/plans/2026-10-17-open-row-merge-diagnostics.md (D4, D6 and
  R1-R11 as far as §1 below keeps them).
- docs/plans/2026-10-16-open-row-merge-design.md (draft 3) and
  docs/plans/2026-10-17-open-row-merge-plan.md: retained parts only,
  as §1 lists (surface, facts, precedence, removal, printing, lowering,
  test stages, fixture format).
- docs/adr/013-records.md (rows, ADR 013's rules 1-6, Tranche A).
- research/row-merge-qt/README.md (the prototype of the adopted
  configuration, `QT-strict+Sym+H` in qt-adapt.mjs `ADAPT`) and
  research/purs-row-experiment/README.md (the installed compiler).

**Architecture:**
- **One unknown tail per row.** A record row keeps Task 1's `tails ∷
  Array v`, which may hold several rigid tails (a signature's own
  variables, as in `{ ...r, ...s }` inside `merge`'s body) but at most
  one meta. Where a type with two or more meta tails would be made (a
  use's instantiation, a constructor, an effect operation, the merge
  literal of Task 7), the meta tails become one fresh meta `t` and
  `Merge` predicates folded from the left, PureScript's form (§2.1).
- **`Merge left right result` is a waiting predicate** kept in the
  substitution's row store, with an identity, a site, an owner and a
  field path (diagnostic metadata). It reverts with the substitution
  when a postponed effect pair reverts.
- **Solving** uses PureScript's `unionRows` cases 1-3 (borrowed), the
  adaptation 1g (parts with no unknown give their symbolic union, which
  is its justification, independent of PureScript's matching of a
  given; rules file §3), the adaptation 2g (a right part and result
  with no unknown, the result holding every atom of the right part,
  give the left part their symbolic difference; rules file §3a,
  decision 17) and the
  approved adaptation Sym (the same cases with the parts swapped),
  re-examined by a full rescan after each top-level unification and in
  each effect-settling round; at the end of a body, the approved
  classification rule H.
  Nothing else improves a predicate: no sum rule, bounds, homes,
  commits, pairwise improvement, N5, E or Z.
- **The end of a body** is the only producer of `Solved` and
  `Unresolved` (a `Settled` witness, the interface revised on branch
  r005b-task5 in 2c7292d): no predicate waiting → `Solved` (unknowns
  default to `{}`, as lowering already reads them); otherwise H
  classifies, without binding anything, into `Contradiction` or
  `Unresolved`. The outer `Stop` channel (`Limit | Internal |
  Unfinished`) survives every step.
- **Diagnostics** are rendered only from the three-way result (D4 from
  `Unresolved`, D6 and D1-D3'' from `Contradiction`), with metadata
  kept apart from solving.
- **New modules** live in src/Features/Check/RowMerge/ (modules
  `Features.Check.RowMerge.*`) with the module README
  src/Features/Check/RowMerge/README.md (draft:
  docs/plans/2026-10-19-row-merge-readme-draft.md). Retained modules
  keep their names and paths (§1.2), so regression rows that name
  their files do not move.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency (Z3 stays outside the
repository, an optional research oracle).

**Status:** B0 accepted; B1, B2 and B3 done (2026-10-19), each
authorized alone; L1 accepted and L2's limited location rule approved
(§10, decision 15). Nothing later is authorized; B4 waits for the
user's review of B3.

Written on branch `r005b-replan` from main 1d43341. Docs only: no
compiler source, test, script or test fixture changed; nothing built;
verify not run. What was run, read-only: the research scripts named
below (their outputs are quoted where used). Results first obtained by
scratch checks were committed and reproduced from the tree in Task B0
(research/row-merge-qt/qt-adopted.mjs, qt-render.mjs, qt-given.mjs;
research/row-merge-typed; research/purs-given-1g); the marks
**scratch** below were replaced by the command that reproduces each.
The compiler build in output/ (built 2026-10-18 10:38;
it has main's placeholder texts and none of the Task 5 WIP's modules)
was run only on scratch programs to confirm that the lambda
annotations of §5 are accepted syntax in single-tail programs; no
verdict about merge comes from it, since today's compiler refuses a
literal with two spreads (Task 7).

## 0. In brief

- **Supersedes** the custom solver of design draft 3 and Tasks 5-6 of
  the 2026-10-17 plan: forced solving with upper bounds (user decision
  3), the sum rule, homes and commits, the drain and quiet equations,
  R10.2's U4 clause and R10.3, the F2 fix, C1 and C3, and Task 3's `x #
  x` binding (N5). §1.1 lists every decision with its fate.
- **Keeps** Tasks 1-3 and most of Task 4: the several-tail
  representation, the surface, the fact store with provenance and
  precedence, decomposition, the bind rule, cancellation and the
  one-tail rules, the three-way result and the `Stop` channel, the test
  entry, the compiler-backed oracle and its read-back. §1.2 lists the
  modules: about 560-650 src lines are removed (**estimate**), 363 of
  them in four whole modules (SumRule, Narrow, RowBound, Commit).
- **Migration** (§7): B0 gate (arguments, ledger, research checks,
  proposals) → B1 behaviour-preserving splits → B2 removal behind the
  existing placeholder → B3 desugaring, predicates, cases, Sym,
  re-examination → B4 end of body and H → B5 diagnostics → 7 literal,
  removal, rest → 8 lowering and interpreter → 9 generated programs →
  10a the README made authoritative → 10b close-out. Every commit builds
  and passes verify; unfinished paths are `R005B placeholder`s (table in
  Global Constraints).
- **What users pay** (§5): on the published examples, programs 11
  (`both(merge, merge)`), 12 (`apply(merge, noX)`) and 13 (S1,
  `apply0(merge, merge)`) need an annotation the current design does
  not; on review F2's family all 186 programs with a least solution do.
  Some annotations narrow a function's possible typings (S1, Q1; S2
  under QT-strict alone); the others are redundant (§5).
- **Evidence** (§3, §4): the compiler against an independent brute-force
  oracle with an independent read-back, on exhaustive domains, typed
  domains with unknown field types, generated problems and (Task 9)
  generated programs across compiler boundaries, with permanent tests
  for Sym, H, every order, swapped inputs and the annotation cases.
  Order independence is supported by measurement, never proved.
- **Remaining work**: about 2.3-2.8M tokens (**estimate**, not a
  budget; §9).

## 1. What this plan supersedes and keeps

### 1.1 Decisions

Each earlier decision, quoted (or quoted in part where it is long), and
what it becomes. "Retained" means unchanged; "Modified" says how;
"Superseded" means it no longer governs. Sources: design draft 3 "User
decisions (2026-10-17)" (D-n) and "User decisions (2026-10-17, plan
review)" (PR-n); the 2026-10-17 plan's "Decisions" (P-n), Global
Constraints and Review Focus; the diagnostics file's §0 (G-n) and §1;
the review findings (docs/plans/2026-10-16-open-row-merge-review.md,
F-n, as resolved in draft 3); the 2026-10-17 plan's ledger (L-n); the
Task 5 interface revision (2c7292d, branch r005b-task5); the
qualified-types re-plan's §9 proposals (Q-n).

| # | Decision | Now | Why, and what replaces it |
|---|---|---|---|
| D-1 | "D7 is withdrawn" (interchangeable tails); the `Both` example "is a worked example (§8) and a required compiler test (`r005b-both-annotation`)" | Retained | `design-both-annotated` is accepted by `QT-strict+Sym+H` in every order (`node qt-fixtures.mjs fixtures`) |
| D-2 | "Implied disjointness: option A. `{ ...r, ...s }` in a signature implies that its tails are disjoint" | Retained | It is Sym's prerequisite: every `Merge` is made with its parts' disjointness recorded (Task 3) |
| D-3 | "Completeness. Forced solving with upper bounds and persistent obligations; no exponential search and no eager basis expansion. Some determinate programs remain rejected" | **Superseded** | No forced solving beyond PureScript's cases and Sym; no upper bounds. "No search, no basis" still holds. More determinate programs are left Unresolved and need an annotation (§5) |
| D-4 | "Printing tails. Fields sorted by label, then rigid tails by first written occurrence in the enclosing signature" | Retained | — |
| D-5 | "Provenance precedence. Written `lacks`, then written `disjoint`, then implied facts, then spread facts; source order breaks ties" | Retained | — |
| D-6 | "Removal. The fresh-remainder rule (§5.2) is approved" | Retained | Removal requires the receiver against `{ l: α, ...ρ }`, an ordinary one-tail requirement; if the receiver's row is a predicate's result, the predicate waits and `ρ lacks l` holds at once (fixtures `design-removal-*` keep their classes) |
| D-7 | Diagnostics approved: D2, D2', D3', D3'', D8, D3 with the hint `require r disjoint s in the signature`, D9's text | Retained | — |
| D-8 | "Equation reasons … `Because` … now has `Equated`" | **Modified** | No rule derives a fact from an equation any more: the sum rule was `Equated`'s only producer (grep: Check/SumRule.purs line 50). The causal link R10.1 needs is kept by `boundBy` (a binding made by a predicate's case). B0 decides whether the constructor is removed in B2 with its rank (T5, §2.12) |
| D-9 | "Evidence in the repository" (research/open-row-merge) | Retained | research/open-row-merge stays the record of the superseded design; research/row-merge-qt is the reference for this one |
| D-10 | "The task breakdown (§13) follows these decisions" | **Superseded** | §7 of this plan |
| PR-1 | Retiring `A record literal accepts at most one spread` "when several spreads become supported"; the record-type `Only one row tail is allowed` retires (done, Task 2) | Retained | Task 7 |
| PR-2 | "`Equated` ranked last … for choosing between competing provenance reasons. The causal rules R10.1-R10.3 … still decide which explanation a failure gets" | **Modified** | The rank stays while the constructor exists (D-8). R10.2 and R10.3 are superseded (G-1, G-3); R10.1 is kept for bindings a predicate's case made (G-2) |
| PR-3 | The counterexample texts (`odd-cycle`, `determinate`) "approved as the plan derives them, the annotation hint included" | Retained | Both stay Unresolved under the adopted design in every order, with 0 and 1 solutions (`node qt-fixtures.mjs programs`) |
| PR-4 | docs/engineering.md's evidence rule "with proportional scope" | Retained | This plan is in its scope |
| PR-5 | "Effort estimates are planning estimates, not an approved budget" | Retained | §9 |
| P-9 | L34: "follow bare-meta aliases when matching a part to the equation owner's variables … never assign an owner's name to arbitrary components of a structured binding" | Retained | `determinate`'s D4 text still needs it (its waiting predicate's parts are aliases of `det`'s variables) |
| P-10 | Derived texts approved: `design-forced-fact`, `design-holes`, the notes of `odd-cycle` and `determinate` | Retained | Their classes are unchanged (all Unresolved); the texts are checked again in B5 and Task 7, and a text that the adopted mechanism cannot produce is a stop for the user |
| P-12a | "Task 5's dependency-complete wake-up (L32)" | **Modified** | Met by construction: every waiting predicate is re-examined by a full rescan to a fixpoint; no index is built unless measured necessary (§9 risks), and then compared with the rescan |
| P-12b | "the compiler-backed property E test reads back independently, with a sensitivity check" | Retained, extended | The read-back adds each waiting predicate as an equation `left ⊎ right = result` with its parts' disjointness (§3.2) |
| P-12c | "the field-type, rollback, joint-fixpoint and specialization arguments (L17, L18, L19, L22) are implementation obligations, not established compiler behaviour, and their planned tests land with those changes" | Retained | B3 (L17-L19), Task 8 (L22) |
| P-12d | "L31 needs property E or a direct exclusion check" | **Modified** | Homes leave solving. The exclusion test survives as H's (`cannotHold`, Check/Homes `admits` without bounds); its direct check becomes: every H contradiction has no solution, and every part H rules out has no solution holding the constant (§3.2) |
| P-13 | research/open-row-merge/state.mjs imports the prototype's flatten | Retained | A fact about that prototype |
| P-14 | "one passed lacks fact per tail is correct, it does not establish that r and s are disjoint" | Retained | Task 3's tests stay |
| G-0 | "D4 means that the checker could not resolve the constraints: it has established neither a solution nor a contradiction … D6 means that the checker has established a contradiction caused by an equation" | Retained (meaning); mechanism **modified** | D4: a `Merge` predicate still waits at the end of a body and H found no contradiction. D6: a contradiction found while solving a predicate (a case's unification fails) or by H. The diagnostics file's §1 definitions in terms of homes, forced moves, bounds and the drain are superseded |
| G-1 | R10.2: "Preserve the specific fact responsible when pruning binds a row to `{}`" | U4 clause **superseded**; principle **open** (B0) | No bound and no U4, so bound-driven emptying disappears. Emptying does not: case 2 binds the left part to `{}` when the right part and the result have the same labels. B0 measured it (rules file §9, `node qt-render.mjs case2 2000`): 17 such bindings in 14,000 runs, 3 runs then failing at a mismatch that reaches the emptied meta, each with another order failing otherwise. Those need the predicate kept as the binding's cause (G-2) or they read `Expected {}, found …`. Whether R10.2's principle (a written fact's own text preferred) also applies there is open (§10); R10.2 is not retired by B0. The `lone-meta-lack` fixtures keep D1 |
| G-2 | R10.1: "Retain the causal equation after it leaves the pending store so Examples 14 and 17 report D6; merely having participated in some equation must not turn later errors into D6" | **Modified** | Kept for bindings a predicate's case made (`boundBy` set by the cases); the commit and drain halves go. Example 14 is now H's (end of body) |
| G-3 | R10.3: "Upper-bound explanations approved in principle" | **Superseded** with bounds | The failing predicate is the one being examined, so no selection is needed |
| G-4 | R5: "The owner's side is printed as written … the other side through the current substitution" | Retained | — |
| G-5 | "Lambda-parameter names, record-part creation sites and instantiated type origins are recorded as diagnostic metadata, kept separate from satisfiability decisions" | Retained | Also the predicate's site, owner and field path |
| G-6 | "list every candidate part … deduplicate by part identity, not printed name … the demonstrated annotation hints; no hint for Example 6" | Retained; R3 **modified** | R3's candidate parts are the predicate's parts that H's exclusion test does not rule out (diagnostic metadata, never a solving step) |
| G-7 | Diagnostics §1: "Quiet equations (no constants) are never D4 (§2.2)" | **Superseded** | A waiting predicate with no constant is Unresolved under QT-strict (S1 = `design-quiet`, S3). It needs a new D4 form, Proposed (§5, decision 3) |
| F-2 | "Adopted: an upper bound per meta, with lacks and apart facts carried by one sum rule … all 186 shared-parameter programs with a least solution now accepted" | **Superseded** | Each of the 186 needs one annotated parameter, redundant in all 186 (it fixes the only value the shared parameter has; `node qt-checks2.mjs generality`; accepted with it under the adopted configuration, `node qt-adopted.mjs examples`) |
| F-3 | C1 "(one pending equation at D4 ⇒ no least solution)", C2 "(verdict independent of constraint order)", C3 "a reported rate" | C1 and C3 **superseded**; C2 **modified** | C1 is false here (S3: one predicate, one solution, Unresolved). C2 becomes: acceptance, inferred types and verdict kinds the same in every order, measured. C3's ceiling is replaced by the recorded count of Unresolved runs with a least solution |
| F-4 | "Pending equations hold only the residue, have an identity, a normal form, a meta index, and nested equations inherit the outer site" | **Modified** | Predicates have an identity, a site and a field path; no residue normal form and no index. Nested predicates are made at instantiation, so their site is the use's (T3, §2.12) |
| F-5 | "a residue with no constants stays pending as a quiet equation, which the empty default satisfies" | **Superseded** | Quiet predicates are Unresolved (G-7) |
| F-6, F-7 | D6 with a `required here` note; "The end alternates the effect settle rounds and the drain to a joint fixpoint; D4 before `Fail needs a concrete error family`" | Retained (drain → re-examination) | B3, B4 |
| GC-1 | Plan Architecture: "Forced moves only (user decision 3): cancel, sum rule with upper bounds, one meta alone, commit a constant with one home, shared remainder, defer, quiet" | **Superseded** | Cancel, one meta alone, the shared remainder (ADR 013's rules) stay; the rest goes |
| GC-2 | Plan Global Constraints: "Three-way result", "Buildable commits with placeholders", "Go output … byte-identical", "Splits on demand", "Every task", "Evidence rules", "Test stages" | Retained | Global Constraints below |
| RF-2 | Review Focus 2: "Reasons survive solving. R10.1 …, R10.2 …, R10.3 …" | **Modified** | R10.1 only (G-2) |
| RF-4 | Review Focus 4: "The verdict class is the same for every constraint order (C2)" | **Modified** | Acceptance, inferred types and verdict kinds, measured (F-3) |
| T5I | 2c7292d: "drain and endOfBody preserve the outer Stop channel … endOfBody the only producer of Solved and Unresolved (a Settled witness without an exported constructor)" | Retained (drain → re-examination) | B3, B4 |
| Q-1 | Re-plan §9.1: "Adopt the re-plan (Tasks B0-B3 …)" on QS | **Superseded** | The user adopted QT-strict + Sym + H |
| Q-2 | §9.2: "QS over QT" | **Superseded** | QT-strict's representation: one unknown tail per row |
| Q-3 | §9.3: N1-N6 | **Modified** | N1 is the meaning (disjoint union). N3 (H) approved as classification only, at the end. N2 (E), N4 (C), N6 (Z) not adopted. N5 **removed**: Task 3 merged it (Check/Disjoint `tailPair`), QT-strict runs without it (§2.7) |
| Q-4 | §9.4 fixture classes | **Modified** | Proposals in §4.5: `design-forced-bound`, `diag-14-fix`, `design-quiet` Solved → Unresolved; `odd-cycle` stays Unresolved (no move to Contradiction: no pairwise improvement); `diag-14` stays Contradiction (by H) |
| Q-5 | §9.5: D6b for two predicates that disagree | **Superseded** | No pairwise improvement, so no such contradiction is found; program 16 (`same`) is Unresolved |
| Q-6 | §9.6: "The approved R10.2 and R10.3 retire" | R10.3 as G-3; R10.2 not retired (G-1, B0's finding) | For the user's decision (§10) |
| Q-7 | §9.7: retire `r005b-upper`, `r005b-bound-reason`, `r005b-pruned-reason` | Proposal | §8 |

Ledger rows of the 2026-10-17 plan that change (the others are retained
as written; §6 re-backs the ones this design relies on):

| Row | Claim | Now |
|---|---|---|
| L2 | the sum rule is sound | retired with the sum rule |
| L3, L4 | the measure decreases; at most \|Π\|·\|Κ\| solver-made metas | modified: a new measure (B0: predicates and the labels in their parts); solver-made metas come only from the shared remainder, case 3 and desugaring (one per extra unknown tail at creation) |
| L7 | quiet equations do not multiply | superseded (quiet predicates are Unresolved); the `h(pick × 12)` timing probe stays as a scale check |
| L8 | F2's 186 accepted | superseded (F-2) |
| L9, L14 | C1; C3 | superseded (F-3) |
| L10 | C2 | modified (F-3) |
| L23 | `x # x` forces `{}`; a rigid twice is D3' | the meta half superseded (N5 removed); the rigid half (D3') retained |
| L28 | programs calling `merge` with known arguments never wait | modified: their predicates are solved by case 1, 1' or 1g once the arguments are checked; none waits at the end of the call's checking |
| L30 | the empty default selects a least solution when no pending equation has a constant | modified: the default applies only when no predicate waits |
| L31 | homes are complete | superseded by H's soundness check (P-12d) |
| L32 | the `naming` index | superseded (P-12a) |

### 1.2 Machinery of Tasks 1-4

Line counts are main at 1d43341. "Source" is the published source under
the adopted design (§1.3).

**Retained as is.**

| Piece | Modules (lines) | Task | Role and source |
|---|---|---|---|
| several-tail rows, flatten, tail substitution | Domain.Type.Record, Domain.Type.RecordSubst (39), Check/FlatRecord (52) | 1 | rows with several rigid tails and at most one unknown; Ur/Web's row normal form [C10] |
| surface `{ ...r, ...s }`, `where r disjoint s`, D3/D8/D9; pairs through declared types | Format/Parse/Constraint, Resolve/Apart (198), Resolve/ArgumentPairs (156), Resolve/Requirements (89), Resolve/Lacking | 2 | surface (bespoke, ADR 014 decision 1); the clause is Ur/Web's `[r ~ s]` [C10], Harper and Pierce [HP91] |
| reasons and precedence | Check/Because (107), Check/Flex (20), Check/PartOrigin (12) | 3 | diagnostics metadata (`Equated`: D-8) |
| seeding givens and wanted facts | Check/Seed (82), Check/UseFacts (53), Check/Lacks, Check/Implied | 3 | entailment by the signature [J92 §1]; lacks [J92 §1.2] |
| one-tail rules after cancellation | Check/RowResidue (122), Check/RowSettle `alone`, `bareMetas`, `shared` | 4 | ADR 013 rules 1-3 [R94]; cancellation [C10 §4.3] |
| the outer `Stop` channel and its classifier | Check/RowOutcome `Stop`, `outcome`'s table (85) | 4 | docs/engineering.md |
| test entry and oracle harness | Check/RowEntry (182), test/row-merge-oracle.mjs, -readback, -judge, -gen, -domains, -adr013, scripts/row-merge-exhaustive.mjs | 0, 4 | — |
| placeholder rendering | Check/Placeholder (13), Check/SeveralTails (27, until Task 7) | 2 | — |

**Removed** (B2), about 560-650 src lines (**estimate**):

| Piece | Modules or parts | Lines |
|---|---|---|
| the sum rule | Check/SumRule | 143 |
| upper bounds U1-U4, narrowing, pruning | Check/Narrow, Check/RowBound; RowStore `upper`, `emptied` and accessors; RecordTail `within`, `prunedBy`, `narrowedRests` (U3, steps 2 and 6), `emptiedBy`; Disjoint's `prune` calls; Homeless's emptied-bound explanation | 116 + 50 + about 150 in parts |
| commits | Check/Commit; RowSettle `placing`'s commit path and `forced`; Homes `homesOf` as a solving step | 54 + about 50 |
| refusals only those rules made | UnifyFailure `Outside`, `Derived`; their classifier rows (RowOutcome, rules §11b); Lacked's `Outside`/`Derived` cases; Refused's `Equated` arm | about 20 |
| N5 | Check/Disjoint `tailPair`'s binding of a meta apart from itself to `{}` (the pair is stored instead, §2.7) | about 5 |
| tests of removed rules | test/r005b-unify.test.mjs's bound and commit cases; the readback's bounds; RowEntry `exclusions` as a homes check | — |

**Modified.**

| Module | Change | Task |
|---|---|---|
| Check/UnifyRecord (138) | no sum rule; after cancellation a side holds at most one meta, so the one-tail rules always decide; a flattened row with two or more metas is `Unexpected` (`Stop Internal`), the representation invariant's guard | B2, B3 |
| Check/RowSettle (141) | `placing` reaches the reworded placeholder P1 (B2), then becomes the invariant guard (B3) | B2, B3 |
| Check/RecordTail (234) | the bind rule without U3; `Solving` loses `emptied` | B1, B2 |
| Check/Disjoint (161) | decomposition without pruning; a meta apart from itself keeps the pair (N5 removed) | B1, B2 |
| Check/Homeless (70) | step 4 only (a constant with no meta opposite) | B2 |
| Check/Homes (54) | `admits` without the bound clause: H's exclusion test (`cannotHold`, §11.1 of the re-plan) and R3's candidate parts; never a solving step | B2, B4 |
| Check/RowStore (199) | loses `upper`, `emptied`; `boundBy` re-purposed (the predicate whose case bound a meta); gains `merges` (the waiting predicates) and the next predicate identity (from `equations`) | B2, B3 |
| Check/RowOutcome (85) | `outcome` replaced by `concluded`; `Solved`/`Unresolved` carry `Settled`, made only by the end of a body; `Pending` becomes the waiting `Merge` | B3, B4 |
| Check/Lacked (98), Check/Refused (35), Check/UnifyFailure (65) | lose the bound and derived refusals; gain H's refusal (B4) | B2, B4 |
| Check/Use (218), Check/Match, Check/ClauseBody, Check/Extension (193) | every instantiated or made type passes through RowMerge/Desugar | B3, 7 |
| Check/Settle (240), Check/Unify (189), Check/Function (141) | re-examination after each top-level unification and in each settle round; the end of a body | B1 (split), B3, B4 |
| Specialize/Record | rows ground under a key (Task 8) | 8 |
| test/r005b-disjoint.test.mjs | "a meta apart from itself is the empty row" keeps its classes; its text for `f({ x: 1 })` may change (D2 instead of the current text), pinned in B2 | B2 |

**New** (B3-B5): src/Features/Check/RowMerge/Predicate (the `Merge`
record and its store operations), Desugar (one unknown tail per row),
Cases (PureScript's cases 1-3 and the adaptations 1g and 2g on one
orientation), Improve
(Sym and the full rescan), End (`endOfBody`, `concluded`, H), and the
README. Names may change in B0; each module ≤250 lines.

### 1.3 Components and their published sources (ADR 014)

PureScript is pinned at tag v0.15.16 (commit 4c66c05a, the installed
`purs`); src/Language/PureScript/TypeChecker/Entailment.hs and
Environment.hs are byte-identical at the audited revision cb3c4965
(re-plan §12.1). Sources the re-plan could not access ([GJ96], [J94],
[R94], [HP91], [L05], [MM19], [SDPS07]) are cited for context only;
where a row cites them, the source read is named beside it (§11.5).

| Component | Source | What is taken | Waxwing's change | Class |
|---|---|---|---|---|
| Rows: labels plus a tail; one-tail unification, a shared fresh remainder | Rémy [R94]; ADR 013 rules 1-6; Ur/Web §4.3 [C10] (read) | unify labels field-wise, extend a meta tail, share one remainder between two meta tails, cancel common parts | rigid tails are constants beside labels | as published (ADR 013) |
| Lacks `l ∉ r` | Jones [J92] §1.2 (read); Gaster and Jones [GJ96] (not accessed); PureScript `Prim.Row.Lacks` | a predicate on row variables, entailed by the signature | Tranche A's `where r lacks { … }` | as published |
| Disjointness `r # s` and its prover | Ur/Web [C10] §4.1 (read): `[c1 ~ c2]`, decomposition into atomic facts, a database of known facts, deferral | decomposition label/label, label/tail, tail/tail; facts on metas re-required when bound | — (Task 3) | as published |
| `Merge left right result` | PureScript `Prim.Row.Union` with `Nub` (Environment.hs 515-528: dependencies `[0, 1] [2]`, `[1, 2] [0]`, `[2, 0] [1]`); purescript-record `disjointUnion` (`Union r1 r2 r3 => Nub r3 r3 =>`, lines 198-207) | a three-place row predicate solved by the compiler | disjoint by definition (Waxwing rows hold no duplicate; one predicate instead of `Union` plus `Nub`) | adapted (re-plan §11.5) |
| Desugaring a row of k ≥ 2 unknown tails | PureScript: a signature names the union's result (`Union r s t => …`); research/row-merge-qt/qt-preds.mjs `desugar` | one fresh `t`, k − 1 predicates folded from the left, parts required disjoint when made | Waxwing writes `{ ...r, ...s }` in the type, so the result variable is made at instantiation (T1) | adapted (translation of the surface) |
| Solving a predicate: cases 1, 2, 3 | Entailment.hs `unionRows`: case 1 lines 636-638 (left closed: `t` is its fields followed by the right part), case 2 lines 639-660 (right and `t` closed: left is `t` minus the right's labels; no progress if one is missing, line 654), case 3 lines 661-672 (left open with known labels: they move into `t`; `Union rest(left) right t'` remains); otherwise no progress (`canMakeProgress`, line 628) | the three cases, their guards and their order | field types are unified (PureScript unifies the solved instance with the constraint, lines 290-296) | as published |
| Case 1g: parts with no unknown | compared with Entailment.hs `matches` (lines 275, 735-750: a wanted `Union` matches a given by the dependency left right -> union); justified independently (rules file §3: with no unknown the result has one value in every solution, the symbolic union, well formed by the parts' entailed disjointness; Jones 1995 §4) | `t := l ⊎ r`, written as one row | broader than given matching: it also fires with the parts swapped, regrouped, or with only a `disjoint` clause (purs NoInstanceFound in those cases, research/purs-given-1g) | **adapted** (B0; the first draft said "re-plan §13.1") |
| Case 2g: a known symbolic subrow subtracted (decision 17) | justified by cancellation of disjoint union (rules file §3a; Jones 1995 §4, as 1g); compared with given matching on the limitation probes (research/purs-given-1g), not derived from it | `l := t` less `r`'s labels and rigid tails, when `r` and `t` hold no unknown and `t` holds every atom of `r`; otherwise no claim | rigid tails cancelled by identity only; a missing atom never stops case 3 (the amendment) | **adapted** (approved and amended 2026-10-19) |
| No pairwise improvement between wanted predicates | Types.hs lines 96-101 (`shouldGeneralize` false with a signature); Entailment.hs 314-320, 369 (an unsolved constraint is not stored as a dictionary for a later one to match) | none | — | as published (what PureScript does with a signature) |
| **Sym**: the cases tried again with the parts swapped | locally introduced, **approved** (2026-10-19); argument re-plan §14.1 | — | cases 1', 2', 3' (§2.3) | local adaptation |
| Deferral; a predicate unsolved at the end is an error | Entailment.hs 363-371 (`Deferred`; `Unsolved` when generalizing; else `NoInstanceFound`); Ur/Web §4 | wait, then report | Waxwing never generalizes, so only the error branch applies; the error is D4 ("annotate") | as published |
| Defaulting an unconstrained unknown to `{}` | ADR 013 (lowering reads an unsolved tail as the empty row); compare Haskell 98 §4.3.4 [H98] | an unknown no predicate mentions becomes `{}` when the body is accepted | no default for anything a waiting predicate mentions (QT-strict) | Waxwing's existing rule |
| **H**: a constant no unknown of the other side can hold makes an Unresolved body a Contradiction | locally introduced, **approved as classification only** (2026-10-19); argument re-plan §14.2; exclusion by entailment [J92] §1, §11.1's `cannotHold` | — | runs only at the end, after an Unresolved result; binds nothing | local adaptation |
| Context reduction under substitution (the bind rule) | [J92] §1 (entailment closed under substitution) | a bound meta's facts re-required on its image | facts kept in a store | adapted (Task 3) |
| Effect rows settled jointly | Leijen-style scoped labels (FX001, Koka) [L05]; FX008's settling rounds | — | records exclude duplicate labels (ADR 002, 013); record predicates are re-examined in each round | existing (FX001, FX008) |
| Three-way result, `Stop` channel | docs/engineering.md | — | — | Waxwing's evidence rule |

**The two approved adaptations, with their arguments** (summarized from
the re-plan; B0 copies them into the rules file with the evidence
named):

- **Sym** (§14.1). `Merge r s t` means `σ(t) = σ(r) ⊎ σ(s)` for an
  assignment `σ` reading rows as finite maps from labels to field types
  (rigid tails as opaque atoms); disjoint union is commutative, so
  `Merge r s t` and `Merge s r t` have the same solutions, and any case
  that keeps the solutions of one keeps those of the other. Each of
  1', 2', 3' is shown to keep solutions; rigid tails are never bound or
  split (1' and 2' need the moved or subtracted part closed, which
  excludes a rigid; 3' moves fields only). Need: without Sym, QT-strict's
  acceptance depends on the order of `merge`'s arguments (S2 rejected,
  `merge({ a: 1 }, p)` accepted), which a symmetric merge must not.
  Evidence: `mirrorDiff` 0 on every family (raw, shapes, the typed
  domain, domains A and B; research/row-merge-qt README), no oracle
  violation, `node qt-checks2.mjs sym`.
- **H** (§14.2). In a solution both sides of a waiting predicate denote
  the same atoms; a constant left on one side after cancellation must
  lie in some unknown of the other side; if every such unknown cannot
  hold it (it lacks the label, or holding it needs a fact the givens do
  not entail), there is no solution, so the Contradiction is a proof.
  It runs after solving and changes only an Unresolved verdict, so
  acceptance and types are unchanged by construction. Need: without it
  QT-strict reports three approved contradictions (`diag-03`,
  `diag-05`, `diag-14`) as "annotate", and seven program shapes change
  verdict kind with the order. Evidence: `baseDiff` 0 on every family;
  every new Contradiction checked by the oracle, none with a solution
  (`H:newWithSolution` absent); `node qt-checks2.mjs kinds`.

## 2. The adopted design in the compiler

This section is the specification the tasks implement. Rows below are
`RecordRow (Ty Flex) Flex`; "unknown" is an unbound meta; "closed"
means no tail at all.

### 2.1 Representation and desugaring

- **Invariant.** Every record row in a type, a binding or a predicate
  holds at most one meta tail; it may hold any number of rigid tails.
  It holds inductively: the one-tail rules bind a meta to a row with at
  most one meta (the other side, or fields plus the one shared fresh
  remainder), case 3 makes one fresh meta, and flattening replaces a
  meta by a binding that itself holds at most one. B3 adds an
  `Unexpected "a record row holds two unknown tails"` guard in
  UnifyRecord, a `Stop Internal` on which the oracle fails.
- **Desugaring at creation.** When a type is made whose row has k ≥ 2
  meta tails (k fresh metas from one instantiation), the meta tails
  `m1 … mk` (in the row's sorted tail order) become one fresh meta `t`
  and predicates `Merge m1 m2 t1`, `Merge t1 m3 t2`, …, `Merge t(k-2)
  mk t` (research/row-merge-qt/qt-preds.mjs `desugar`); rigid tails
  and fields stay in the row. Each predicate's parts are required
  disjoint when it is made (Task 3's `requireDisjoint`, the
  implied-pair reason), and `t` is required well formed beside the
  row's fields and rigid tails (it lacks their labels). Creation
  points: a use's instantiation (Check/Use `declarationUse`, constructor
  uses, Check/Match's constructor patterns, Check/ClauseBody's effect
  operations, and any other `at scheme` or `instantiate` caller: B0
  lists them by grep), a merge literal's type (Task 7), and the test
  entry's rows. One desugaring per occurrence: two rows with the same
  unknown parts get two predicates, as the prototype measured
  (no memo: memoizing would apply the `r s -> t` dependency between
  predicates, which QT-strict does not do).
- **Fold order and association** (T1). The left part is the earlier
  tail in sorted order (for `merge`, its first variable). Sym makes the
  orientation irrelevant (`mirrorDiff` 0). For three or more unknown
  tails the association also changes; on the ten fixtures with a row of
  three unknown tails, every tail order and every step order gave one
  outcome under `QT-strict+Sym+H` (`node qt-adopted.mjs three`). The
  labels-only generators make no row with three unknown tails; B0's
  typed family `assoc` (research/row-merge-typed) merges three typed
  arguments in both groupings and every order: one outcome per problem
  for +Sym+H (rules file §10).

### 2.2 The predicate

```
type Merge =
  { id ∷ Int
  , left ∷ Row, right ∷ Row, result ∷ Row
  , site ∷ Maybe Span       -- the requirement being checked when made
  , owner ∷ Maybe Owner     -- the use whose variables it instantiates
  , path ∷ Array String     -- field labels from the instantiated type
  }
```

Kept in RowStore `merges ∷ Map Int Merge` inside `Subst`, so a
postponed effect pair's revert removes what was made inside it. `site`,
`owner` and `path` are diagnostic metadata: no case reads them (a
structural test, as for PartOrigin).

### 2.3 Solving one predicate

For `Merge l r t`, with `L`, `R`, `T` the flattened rows (re-plan §13.1,
research/row-merge-qt/qt-strict.mjs `oriented`), in this order:

| Case | Fires when | Effect |
|---|---|---|
| 1g | neither part has a meta (fields and rigid tails only), and their disjointness was required when the predicate was made (entailed for rigids: D3, D3', D3'' otherwise) | unify `t` with `{ fields(L), fields(R), ...tails(L), ...tails(R) }`; done. A Waxwing adaptation, not one of PureScript's cases (rules file §3) |
| 1 | `L` closed | unify `t` with `{ fields(L), fields(R), ...tails(R) }`; done |
| 2 | `R` and `T` closed | if every label of `R` is in `T`: unify each such field type with `T`'s, then `l := T` minus `R`'s labels; done. A label of `R` missing from `T`: no progress (line 654) |
| 2g | `R` and `T` hold no meta, and `T` holds every label and rigid tail of `R` | unify each shared field type, then `l := T` minus `R`'s labels and one equal tail of `T` per rigid tail of `R` (by identity); done. Otherwise no claim: the next row is tried. A Waxwing adaptation (rules file §3a, decision 17 as amended) |
| 3 | `L` has fields and a tail | `u` fresh, unify `t` with `{ fields(L), ...u }` (`u` well formed: it lacks those labels); the predicate becomes `Merge rest(L) r u` |
| — | otherwise | no progress |

**Sym**: when none progresses, the same table with the parts swapped
(1', 2', 3'): 1' when `R` is closed (`t ~ { fields(R), fields(L),
...tails(L) }`), 2' when `L` and `T` are closed (`r := T` minus `L`'s
labels), 3' when `R` has fields and a tail (`Merge l rest(R) u`). Its
prerequisites are the approved boundaries: the parts were required
disjoint when the predicate was made (a predicate is never made
otherwise: the desugaring and Task 7's literal are its only makers);
"closed" is `tails` empty (a rigid tail makes a part open); field types
are unified, never compared or dropped; rigid tails are never bound or
split (2g's cancellation by identity is the one exception, rules file
§3a).

Each effect goes through the ordinary unifier and the bind rule, so a
failure is an ordinary `Failure` (a mismatch, a refused fact, an occurs
check) and the binding a case makes records the predicate in `boundBy`
(R10.1). A case never guesses and never makes a predicate except case
3's replacement.

### 2.4 Re-examination

After each top-level unification (Check/Unify's entry) and in each
effect-settling round, every waiting predicate is examined by §2.3 in
identity order, repeatedly, until a pass changes nothing (a full rescan;
qt-strict.mjs `improveStrict`). Nothing else improves a predicate: no
pairwise improvement, no E, Z or N5. Termination (B0 writes the
argument): a pass that changes something removes a predicate (1g, 1, 2,
2g and their mirrors) or moves at least one label out of a part into a
binding of `t` (3, 3'), and the labels in parts are bounded by the
labels written in the body.

### 2.5 The end of a body

After the settle rounds and their joint fixpoint (§2.9):

1. No predicate waits: `Solved` (a `Settled` witness). Unknowns that no
   predicate mentions carry at most lacks and disjointness facts, which
   `{}` meets; lowering reads them as `{}` as today (ADR 013).
2. Some predicate waits: H examines each, in identity order, on the
   final substitution, which it does not change: cancel equal atoms
   between `left ⊎ right` and `result` (a field cancels only the same
   label, after which their types are already unified); if a constant
   (a label or a rigid tail) is left on one side and every unknown on
   the other side cannot hold it (§2.6), the body is a `Contradiction`
   (H's refusal, with the predicate); otherwise `Unresolved` with every
   waiting predicate. H binds nothing, defaults nothing and cannot turn
   an Unresolved body into an accepted one (asserted: the substitution
   after H equals the one before, and the verdict with H differs from
   the verdict without it only by Unresolved → Contradiction).

### 2.6 The exclusion test

`cannotHold(m, c)` (re-plan §11.1; qt-facts.mjs): `m` lacks the label
`c` or is apart from the rigid `c`; or holding `c` would put it beside
a label or rigid `m` must lack or be apart from, which is well formed
only under a hypothesis the givens do not entail (a rigid `c` and a
label `m` lacks that `c` is not known to lack; a rigid `c` and a rigid
`m` is apart from that `c` is not known to be apart from; a label `c`
and a rigid `m` is apart from that is not known to lack `c`). Check/Homes
`admits` computes its negation today, plus a bound clause B2 removes.

### 2.7 Facts

Task 3's facts are unchanged except N5: a meta required apart from
itself (`m # m`) keeps the pair in the store (qt-facts.mjs with
`selfApart: false`) instead of being bound to `{}`. `{}` meets the pair
when the body is accepted; a label later bound into `m` is an overlap
(D2) when the pair is re-required on the image. A rigid apart from
itself stays D3'.

### 2.8 Field types, nested rows, rigid tails, occurs checks

- **Field types** are unified wherever a case moves, subtracts or
  matches a label (cases 1, 2, 3 and mirrors, H's cancellation); unknown
  field types stay metas and are solved by the ordinary unifier.
- **Nested rows.** A row inside a field type is desugared like any other
  when the type is made; its predicate's `path` records the labels from
  the instantiated type (R6's `(in field P)`), and its site is the
  use's (T3). Unifying the outer rows unifies the field types, which may
  bind the inner predicate's `t`; it is re-examined in the same rescan.
- **Rigid tails** are constants: never bound (the unifier binds metas
  only), never subtracted (case 2 needs closed rows), never moved as a
  part (case 3 moves fields).
- **Occurs checks**: a case's unification can bind a meta to a type
  containing it through a field (`{ a: { ...t } }` against `t`); that
  is the ordinary `Occurs` failure, a Contradiction (an infinite type).
  The tail occurs guard (ledger L33, `Unexpected`) stays.

### 2.9 Effects: settling rounds, rollback, the joint fixpoint

Predicates live in the substitution: a postponed effect pair's revert
removes what was made inside it, and the retry makes it again with the
pair's site. Each settle round ends with a re-examination; a round in
which a predicate was solved or changed counts as changed
(Check/SettleChange, split in B1), so the rounds and the re-examination
reach a joint fixpoint before §2.5. Termination: the effect rounds as
today; each re-examination as §2.4; a round counted as changed only by
predicates consumed the predicate measure, which effect retries never
increase except by re-making what a revert removed (B0 argues it).

### 2.10 Diagnostics

| Outcome | Text | Location |
|---|---|---|
| a case's unification fails (field mismatch, a label `t` cannot have, a refused fact) | D6 forms (`O's ROW must be OTHER, so A cannot have field l`), or the fact's own text (D1, D2, D3'') when a written fact is the reason (R10.2's principle, kept: the applicable written fact's specific diagnostic is preferred to D6; approved) | R7: the expression being checked |
| a binding a case made fails later (R10.1, extended to case 2 bindings; approved) | D6, the predicate from `boundBy`, unless a written fact applies (R10.2) | the expression being checked |
| H's Contradiction | D6 `… but neither A nor B can have field l` (`none of`, `cannot hold t`), `excluded here` per fact | **Approved** (T4, stable, from provenance; rules file §7): each fact ruling the field out of a part keeps its reason by the approved precedence and, as metadata, the span of the use whose seeding stated it; the primary is the latest of those spans in source order, else the predicate's site; notes `required here` at the predicate's site and `excluded here` at each reason's span. On `diag-14` this is the approved `noX` |
| Unresolved | D4 forms with R9's hints when a constant has two or more candidate parts (R3, R4); forms approved 2026-10-19 otherwise (§5: a predicate with no constant; constants each with one candidate) | R7: the predicate's site. R11 **approved**: the earliest-site predicate that has a field with two or more candidate parts; only when none has one, the earliest predicate; predicates sharing a source span are ordered by a stable tie-break from source data (never by allocation identity). `determinate`'s approved text needs this: its earliest waiting predicate has no field, and the approved D4 names field `a` at the second `merge` (`node qt-adopted.mjs report`: site 9, field `a`, in every order checked) |

### 2.11 Specialization and lowering

Unchanged from design draft 3 §9: under a key every rigid is its key
row, an accepted body has no waiting predicate, and every unknown left
is `{}`, so every row is ground; the merge literal is built field by
field from typed temporaries evaluated left to right (Task 8).

### 2.12 Translation decisions for the user's review

Not rules (they choose how the adopted design is written in this
compiler); each is checked by the tests named.

- **T1** Desugar at creation, one predicate chain per occurrence, folded
  from the left in sorted tail order (§2.1). Tests: association and
  mirror permutations (§4.1).
- **T2** N5 removed as the adopted configuration measured (§2.7); Task
  3's merged binding goes in B2, with the text change it causes pinned.
- **T3** A nested predicate's site is the use's (it is made at
  instantiation), and its `path` names the field (R6). The approved
  rule "a nested equation has the outer one's site" is met when the
  use is the outer requirement; Examples 4 and 5 (`diag-04`, `diag-05`)
  are the checks.
- **T4** H's primary location (§2.10).
- **T5** `Because.Equated` has no producer after B2 (D-8). Proposed:
  remove it in B2 with its rank; R10.1 reads `boundBy`.

## Global Constraints

- **AGENTS.md governs:** files ≤250 lines; 80 columns (`node
  scripts/width.mjs` after `git add`, check its exit code); `where`, not
  `let … in`; no anonymous lambdas; `maybe`/`either` with named helpers;
  layer and IR allowlists; error codes as an ADT; regression proofs fail
  with the defect restored, in an isolated copy; no `git stash`.
- **ADR 014.** No rule beyond §2 enters solving. A change that needs one
  (an improvement, a default, a search, an index that changes results)
  is a stop for the user, with the textbook alternative and its cost.
  Evidence obligations are implementation obligations, not a reason to
  add N5, E, Z, pairwise improvement or any other rule back implicitly.
- **Claims.** Order independence (acceptance, inferred types, verdict
  kinds) is described as measured, never as proved. "Unresolved" claims
  nothing about the number of solutions.
- **Three-way result.** Every diagnostic from row solving is rendered
  from a `RowOutcome`: D4 only from `Unresolved`, D6 and D1-D3'' only
  from `Contradiction`. `Solved` and `Unresolved` carry `Settled`, made
  only by `endOfBody`. A successful unification is never a verdict.
- **The outer `Stop` channel** (`Limit | Internal | Unfinished`) is
  preserved by every new path: re-examination returns `Failure`s
  (`TooDeep`, `Unexpected`, `Placeholder` included), classified only at
  the boundary (`concluded`); `endOfBody` returns `Left (Internal …)`
  if a predicate could still progress (the fixpoint did not finish),
  never a verdict. Each new failure constructor gets a classifier row
  in the same commit, with what establishes it, and an injection test
  (test/r005b-outcome.test.mjs).
- **Approved texts.** Only approved texts are emitted; a new text, or an
  approved text at a new location, is a stop for the user. Proposed
  texts (§5) are pinned in fixtures only after the user approves them.
  A test that needs a text before B5 asserts the placeholder's
  E_INTERNAL message.
- **Fixtures.** test/fixtures/r005b's `result`, `diagnostic` and
  `stages` change only as the user approves (§4.5, §10). Until then a
  fixture whose class the adopted design changes is listed in its
  test's expected-difference table with the approval it waits on, and
  the task that would need the change stops there.
- **Buildable commits with placeholders.** `Internal "R005B placeholder:
  <what> (Task N)"` through Check/Placeholder `placeholderAt` (or the
  failure `Placeholder`, an `Unfinished` stop) at the first function
  that can fail; a function that cannot fail gets a real case. Every
  commit builds and passes `npm run verify`. Task 8 gates on `grep -rn
  "R005B placeholder" src` being empty; Task 10b repeats it.

  | # | Added in | Placeholder at | Text after `R005B placeholder: ` | Removed in |
  |---|---|---|---|---|
  | P1 | Task 4 (e63f7f4); reworded in B2 (462602d) | Check/RowSettle `settle` (B2 folded `placing` back in): a residue with two or more metas on a side | was `equations that wait are solved in Task 5`; from B2 `rows with two unknown tails on one side are solved in Task B3` | **B3**: now the invariant guard, `Unexpected "a record row holds two unknown tails"` (§2.1) |
  | P2 | Task 4 (e63f7f4) | Check/Lacked `refusedAt`: a refusal whose reason was an equation (`Outside`, `Derived`, an `Equated` reason) | was `contradictions from equations are reported in Task 6` | **B2**: its every cause went with the sum rule and bounds, so it was removed, not reworded. A refusal caused by a predicate's binding (R10.1) first exists in B3, which adds its placeholder (`contradictions from merge predicates are reported in Task B5`) with the cause; B5 removes it |
  | P3 | Task 2 (be42baf) | Check/SeveralTails `withinOneTail` | `rest binders and removal over several tails are typed in Task 7` | 7 |
  | P4 | Task 4 (e63f7f4) | Specialize/Record `recordType` | `rows with several tails are lowered in Task 8` | 8 |
  | P5 | B3 | RowMerge/End `endOfBody` (Check/Function after settling, Check/Failure before an open Fail family, RowEntry `finish`): a predicate still waits; at the earliest waiting predicate's site | `merge predicates still waiting at the end of a body are classified in Task B4` | **B4** (removed) |
  | P2′ | B3 | Check/Merged `mergedAt`: a failure a predicate caused, other than a broken fact | `contradictions from merge predicates are reported in Task B5` | B5 |
  | P6 | B4 | Check/EndReport (Check/Function, Check/Failure): an Unresolved body, at the earliest waiting predicate's site; H's Contradiction uses P2's text at the predicate's site | `unresolved merge predicates are reported in Task B5` | B5 |

- **Go output** of existing programs stays byte-identical in every task
  (bootstrap snapshots; the differential's emit and compile phases for
  sources both trees compile).
- **Splits on demand.** Extract before adding to a file over 200 lines
  (Settle 240, RecordTail 234, Subst 224, Use 218, Failure 210,
  RecordPattern 212, RowStore 199, Extension 193); each split is its own
  behaviour-preserving commit (build, the area's tests, differential 0).
- **Every task:** tests seen failing first (red log under
  .build/evidence/r005b-<task>-red.log); `rm -rf output &&
  GOTOOLCHAIN=go1.26.4 npm run verify` exits 0 on the committed tree; a
  classified differential (`node scripts/differential.mjs --corpus all
  --regenerate` against the task's base, built in an isolated copy)
  with the allowed differences stated in the task; .build/regression,
  .build/go-cache and the base copy deleted afterwards (disk hygiene);
  one task at a time.
- **Test stages** (2026-10-17 plan, retained): solver and renderer tests
  from the task that implements the rule; complete-source checking of
  every program that defines `merge` or `merge3` from Task 7; execution
  from Task 8.
- **Models:** Opus for B0, B2-B5, 7, 9 and 10a; Sonnet for B1, 8 and
  10b, with an Opus review of B1's differential, Task 8's lowering and
  every task's regression rows.

## Review Focus

1. **Only the adopted rules solve.** No path binds, defaults or derives
   a fact outside §2.3-§2.5 and Task 3's facts; H changes no
   substitution and no acceptance. B3, B4.
2. **The result classes.** No path renders D6 from `Unresolved` or D4
   from `Contradiction`; `odd-cycle` (no solution) stays D4. B4, B5.
3. **The `Stop` channel.** Limits and broken invariants met during
   re-examination or at the end of a body are stops, never verdicts,
   and the oracle runner fails on them. B3, B4.
4. **Order independence, swapped inputs and association**, measured on
   the compiler as in the prototype: acceptance, inferred types and
   verdict kinds. B3, B4, 9.
5. **Rollback and the joint fixpoint.** B3.
6. **The representation invariant** (at most one unknown tail) holds at
   every creation point; a missed one is a `Stop Internal`, not a wrong
   verdict. B3, 7.
7. **What users pay**, measured on the compiler and reported against
   the prototype's numbers. B4, 9.
8. **Evaluation order** of `{ ...g(), x: f(), ...h() }`: g, f, h once
   each. Task 8.

## 3. Evidence plan

What each claim rests on, beyond the labels-only prototype. Commands
for research checks run from research/row-merge-qt/ (README).

### 3.1 What the prototype already shows (adopted configuration)

`QT-strict+Sym+H` (re-plan §13-§14; research/row-merge-qt README,
"QT-strict's adaptations"): no S, L or H violation on any family; accepted
runs raw 9,210 (current design 14,255 of 70,000 runs), dense 4,340
(19,895), program shapes 7,792 (10,546 of 24,000), F2 0 (186 of 392),
typed domain 11,042, domain A 182,332 (870,440 of 19,305,292 runs),
domain B 8,352 (193,376 of 453,550); `acceptDiff` and `kindDiff` 0 on
every family; `mirrorDiff` 0; H's new Contradictions none with a
solution; on the 72 fixtures three Solved → Unresolved
(`design-forced-bound`, `design-quiet`, `diag-14-fix`) and no other
class change (`node qt-fixtures.mjs fixtures`). Limits: labels only
except the typed domain (ground field types `a:Int`, `a:Bool`,
`b:Int`); no unknown field types, nested rows, effect rows or texts;
synthetic generators; no corpus of real programs.

### 3.2 The compiler-backed oracle (level 1, B3-B4)

Ported from Task 4's harness (test/row-merge-oracle.mjs, -readback,
-judge, -entry), independent of the compiler's solver and flattener:

- **S** (Solved): the read-back assignment, unknowns `{}`, satisfies
  every constraint of the problem; **L**: it is the least solution;
  **H** (honest refusal): `Contradiction` ⇒ brute force finds no
  solution; **Unresolved** claims nothing, and the buckets are asserted
  with their counts: `odd-cycle` 0, `determinate` 1, `diag-01` 4.
- **Property E** (read-back): the state read back as a constraint
  system (bindings followed by the test itself, never the compiler's
  flatten; facts on metas; each waiting predicate as `left ⊎ right =
  result` with its parts' disjointness) has exactly the problem's
  solutions, restricted to the problem's metas. Its sensitivity check
  (a nested binding skipped; a waiting predicate dropped) must fail.
- **H's checks**: every H Contradiction has no solution; every part H
  rules out has no solution holding the constant (the direct exclusion
  check, replacing L31's); H off against H on (an option of the test
  entry only): acceptance and inferred types identical, and the only
  verdict change Unresolved → Contradiction (`baseDiff` 0).
- **Second reference**: the compiler's verdicts against the research
  prototype's `QT-strict+Sym+H` on every problem (as
  scripts/row-merge-cross.mjs compared Task 4 with research/
  open-row-merge); any disagreement is investigated before the task
  ends. Z3 stays optional, outside verify.

### 3.3 Beyond concrete field types

| Area | Obligation | Check | Task |
|---|---|---|---|
| type variables in fields | cases unify field types, never compare them; an unknown field type is solved by the ordinary unifier or stays a meta | a typed entry (fields `a: ?α`) and a typed brute-force oracle over the field types `Int`, `Bool` (sufficient for equations among these constructors: a satisfiable system has a most general unifier, grounded by `Int`; B0 writes the argument); typed swapped programs (`merge(p, { a: 1 })` into `{ a: Bool, … }`: Contradiction both ways) | B0 (research), B3 |
| nested records | a merge whose field holds a merge; a merged field holding records that merge; nested predicates re-examined in the same rescan | `fn nest(w: { a: { ...p, ...q }, ...r, ...s }): …` against `(c) -> { a: { x: Int, y: Int }, z: Int }` (§2.6's example of draft 3); Examples 4, 5 (`diag-04`, `diag-05`); `merge({ a: merge(p, q) }, { b: 1 })` with `p`, `q` fixed later; a typed-nested research domain (B0) | B0, B3, 7 |
| rigid tails | never bound, split or subtracted; Sym's closed test treats a rigid tail as open | a property on every run: no rigid in any binding's domain; generic callers (`design-generic-three`, `-d3`, the mixed case `tagged`); a sensitivity mutation (Sym treating a rigid-tailed part as closed) caught by the oracle | B3 |
| occurs checks | a case's unification through a field type that would make a cycle is `Occurs` (Contradiction); the tail occurs guard never fires | constructed problems through the entry (`{ a: { ...t } } ~ t`-shaped); the oracle runner fails on `Unexpected` | B3 |
| effect solving | predicates revert with a postponed pair; each settle round re-examines; the joint fixpoint ends in both directions | `r005b-settle-rollback`; `r005b-end-fixpoint` both directions (an effect retry unblocking a predicate; a predicate's binding settling a postponed pair); a `Fail` payload `{ ...?r, ...?s }` whose key waits reports the predicate, not `Fail needs a concrete error family`; a time bound on each | B3, B4 |

### 3.4 Exhaustive small domains and generated problems

- **Domains A and B** (research/open-row-merge's, Task 0): B whole in
  verify, A sampled in verify and whole by scripts/row-merge-exhaustive.
  mjs (outside verify), every problem in every order: S, L, H, E, the
  bucket counts, order differences (acceptance, solution, kind) 0, and
  the counts compared with the prototype's (`node qt-domains.mjs A 10`,
  `… B 10`).
- **Mirror and association.** Each problem also with every row's unknown
  tails reversed (swapped inputs) and, for rows of three or more unknown
  tails, every tail order: one outcome. B0 adds a generator mode with
  rows of three unknown tails (done in research form: `assoc` in
  research/row-merge-typed, rules file §10).
- **Typed domain** (research/row-merge-qt/qt-typed.mjs, ported):
  336,610 problems of two typed equations, both orders and the mirror.
- **Generated problems**: raw, dense and program-shaped (seeds as Task
  4), five orders each; F2's 392.
- **Generated programs (Task 9)** across compiler boundaries: wrappers
  (declared types joining tails), partial application, `let` references,
  lambdas annotated and not, nested record fields holding merges,
  higher-order uses (`apply2`, `both`), removal and rest binders on merge
  results, effects in items and handlers around calls. The reference is
  the generator's own model → labels and field types → brute force, plus
  the research prototype; accepted programs run in Go and the
  interpreter; failures shrink (delta debugging) into `found-*`
  fixtures; a census per shape with minimums; order, mirror and H-off
  variants.

### 3.5 Result-boundary classification

The classifier (RowOutcome, rules §11b's table) changes in B2 (`Outside`
and `Derived` removed), B3 (the invariant guard's `Unexpected` text) and
B4 (H's refusal: Contradiction, established by H's argument). Each
change is a row of the table and an injection test: `TooDeep` and
`Unexpected` injected through re-examination (inside a case's
unification) and through `endOfBody` must come out as `Stop Limit` and
`Stop Internal`; a `Placeholder` as `Unfinished` (a skipped run); the
runner (test/row-merge-entry.mjs `classify`) throws on the first two.

## 4. Permanent tests and behavioural controls

### 4.1 Sym (test/row-merge-sym.test.mjs, B3)

- **Swapped inputs**: every fixture's rows, domains A and B and the
  generators with every row's unknown tails reversed give the same
  verdict and solution (mirror 0).
- **Prerequisites**: every predicate the compiler makes has its parts'
  pair in the store when made (state inspection through the entry);
  `closed` is false for a part with only a rigid tail (unit, through
  the entry).
- **Field types**: `merge(p, q)` against `merge(q, p)` with `q = { a:
  Int }`: `p` unknown (accepted, `p = {}`), `p` later `{ b: Int }`
  (accepted), into `{ a: Bool, …}` (Contradiction), into `{ a: Int, b:
  Int }` (accepted), `merge(merge(p, q), w)` with `w = { b: Int }`:
  one outcome over every order of both orientations, the typed
  oracle's (research `node qt-checks2.mjs sym`, ported).
- **Rigid tails**: `fn f(x: { ...u }): … = g(merge(x, { a: 1 }))` and
  its mirror inside a generic function; no rigid bound.
- **Association**: the ten fixtures with three unknown tails
  (`diag-02`, `-03`, `-08`, `-12`, `-17` and their fixes) in every tail
  order and step order: one outcome.

### 4.2 H (test/row-merge-h.test.mjs, B4)

- **Classification only**: on domains A and B, the typed domain and the
  generators, H on and off (entry option): acceptance and inferred
  types identical; verdicts differ only Unresolved → Contradiction;
  the substitution after H equals the one before.
- **Every H Contradiction is oracle-checked**: no solution by brute
  force; the direct exclusion check on every part H rules out.
- **Runs only on Unresolved**: H is never consulted when no predicate
  waits (a counter through the entry).
- **Fixtures**: `diag-03`, `diag-05`, `diag-14` Contradiction; with H
  off they would be Unresolved (asserted with the option, so each keeps
  exhibiting what H decides).

### 4.3 Order permutations (test/row-merge-order.test.mjs, B3-B4)

Every permutation of every fixture's rows (up to seven steps; the
fixtures' `orders`), of the research order fixtures
(research/row-merge-qt/fixtures/order-*.json, all permutations or their
recorded orders) and of research/purs-row-experiment/cases/; five
orders of every generated problem: acceptance, the read-back solution
and the verdict kind are each one value per problem. Counts are
recorded; any difference fails.

### 4.4 The annotation cases (test/r005b-annotations.test.mjs, Task 7)

Complete sources (they define `merge`), each without and with its
annotation (§5), in both argument orders where the program has two
callbacks: S1 (`design-quiet`), S2, S3, Q1, Q2, programs 11
(`design-forced-bound`), 12 (`diag-14-fix`), 16 (`same`), and a sample
of F2's family (the 186 with a least solution, annotated). Expected:
the unannotated class and text (§5), the annotated program accepted and
run (Task 8). Solver-level forms of the same rows land in B4.

### 4.5 Behavioural controls: retired counterexamples, new outcomes

Kept, never deleted. Expected outcomes under `QT-strict+Sym+H`, every
order, from the prototype (`node qt-fixtures.mjs fixtures`, `…
programs`; `node qt-adopted.mjs controls` for all of them):

| Control | Was (current design) | Expected now | Solutions | Status |
|---|---|---|---|---|
| `odd-cycle` | Unresolved (D4) | Unresolved (D4) | 0 | unchanged; still the zero bucket |
| `determinate` | Unresolved | Unresolved | 1 | unchanged |
| `diag-01` | Unresolved | Unresolved | 4 | unchanged |
| `design-forced-bound` (program 11) | Solved | **Unresolved** (D4 at the first `merge`, approved form `Cannot tell whether merge's r or s has field x; …`) | 1 | **proposal** |
| `diag-14-fix` (program 12) | Solved | **Unresolved** (D4; each constant has one candidate part: Proposed form) | 1 | **proposal** |
| `design-quiet` (program 13, S1) | Solved | **Unresolved** (D4; no constant: Proposed form) | 1 over its own labels; 5 with one extra label | **proposal** |
| `diag-14` | Contradiction (D6) | Contradiction (by H) | 0 | unchanged class |
| `diag-03`, `diag-05` | Contradiction | Contradiction (Sym; H also) | 0 | unchanged class |
| every other fixture of the 72 | as recorded | as recorded | — | unchanged |
| `same` (program 16, qt-programs.mjs) | Contradiction (current design) | Unresolved | 0 | **proposal**: new fixture |
| `zero (new)` (qt-programs.mjs) | Unresolved | Unresolved | 0 | not needed as a bucket (`odd-cycle` stays); kept as a research problem |
| order-22-581, -22-3634, -23-3089, -24-3802 | QS-EH order-dependent; QS-EHZ accepted | Unresolved in every order | 1 each | research control (B0 adds the expectation) |
| order-A-lacks, order-A-apart | refuse with the repair | Contradiction in every order | 0 | research control |
| order-S-shapes-1910 | QT-strict: Contradiction, Unresolved | Contradiction in both orders | 0 | research control |
| purs domain-b-1, -17 | QT: accept, D4 | Unresolved in every order | 1 | research control |
| purs domain-b-3, -7 | QT: refuse/D4 by order | Contradiction in every order | 0 | research control |
| purs domain-b-9 | QT: refuse, D4 | Unresolved in both orders | 0 | research control |

**Reclassifications, approved 2026-10-19; test/fixtures not edited in
B1, the change belongs to B4's fixture step** (texts pinned in B5): the
three fixtures marked **proposal** move from Solved to Unresolved with their
D4 texts (one approved form, two Proposed), each gaining an
`-annotated` fixture with the annotation of §5 (Solved, `output`
`0\n`); `same` is added as a fixture (Unresolved, D4 approved form).
Their research counterparts (research/open-row-merge's fixtures.mjs)
keep asserting the superseded design's classes: that directory is the
research archive of the old design's results.

### 4.6 Regression rows

See §8: rows kept, rows reworded for the new mechanism, proposed
retirements, and new rows for Sym, H, the invariant and N5.

### 4.7 Recovery obligations: what B2 displaced (user, 2026-10-19)

Each refusal or acceptance that only B2's removed machinery made, now
placeholder P1, is an obligation: the task named shows its outcome and
diagnostic individually, by a test; none is assumed restored by H.
Found by B2's differential (programs) and by running every fixture's
rows in every order through the compiler before and after B2
(.build/evidence/r005b-b2-fixture-rows-{before,after}.json; only two
fixtures changed).

| # | Was (Task 4) | Now (B2) | Expected (prototype, every order) | Shown in |
|---|---|---|---|---|
| O1 | `granted2({ admin: false })`, both tails `lacks { admin }`: D1 `admin is not allowed here: r lacks { admin }` at the argument | P1 | Contradiction by H, 0 solutions; text: D1 preferred to D6 (decision 5) | **B4: class shown** (H's refusal, P2 at the call); B5 (text) |
| O2 | the same with `{ name: 1, admin: false }`: D1 | P1 | as O1 | **B4: class shown**; B5 |
| O3 | `diag-14` rows: refused in 16 of 24 orders, skipped in 8 | P1 in all 24 | Contradiction by H (fixture class unchanged), the approved `noX` location (T4) | **B4: shown**, H's refusal in all 24 orders, Unresolved with H off; B5 (text, location) |
| O4 | `granted2(…)`, only `s lacks { admin }`, both arguments: accepted (a commit) | P1 | Unresolved, 1 and 2 solutions; no annotation can fix it at the call (§5), so it is a finding for the user, not only a cost | **B4: shown** Unresolved (P6); kept as an accepted limitation (decision 17); B5 explains it without an annotation hint |
| O5 | `diag-14-fix` rows: accepted in 16 of 24 orders | P1 in all 24 | Unresolved (approved reclassification, decision 2) | **B4: shown**, Unresolved in all 24 orders |
| O6 | labels-only runs Task 4 refused and B2 skips: domain A 17,705,571 → 15,026,498 refusals, domain B 233,144 → 153,080, generators likewise (docs/progress.md "R005 Tranche B B2") | P1 | each either Contradiction or Unresolved, never accepted (they have no solution); the count H recovers reported against these | **B4: shown**, no acceptance without a solution in either domain; refusals at B4 A 17,220,172 (H 636,722), B 130,548 (H 25,716); docs/progress.md "R005 Tranche B B4" |

## 5. The annotation burden, at the compiler level

Every program below defines

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
```

Verdicts are the prototype's under `QT-strict+Sym+H` in every order;
the smallest annotation was found by trying every set of annotated
unknowns at their least values (`node qt-adopted.mjs examples`). "Narrows"
means fixing the annotated part excludes solutions the program had
(counted with one extra label `w`, `node qt-checks2.mjs generality`).
Texts are approved D4 forms where marked, otherwise the forms the user
approved on 2026-10-19 (proposals §2). The
annotation syntax was checked on today's compiler in single-tail
programs (lambdas `fn(p: {}) => …` and `fn(p, s: {}) => …` passed to a
function with a `disjoint` clause: accepted, run printing 0).

| Program | Unannotated | Smallest annotation | Narrows? What is lost |
|---|---|---|---|
| **S1** `fn apply0(f: (a, b) -> c, g: (d, e) -> c): Int = 0;` `apply0(merge, merge)` (`design-quiet`, program 13) | Unresolved: D4 at the first `merge`, Proposed form for a predicate with no field: `Cannot tell what merge's r and s hold; pass a lambda with annotated parameters in place of merge` | two parameters: `apply0(fn(p: {}, q) => merge(p, q), fn(p: {}, q) => merge(p, q))` (one part of each merge; any of the four choices) | **narrows**: 3 of 5 solutions excluded, the typings in which the merges' left parts hold labels (both results are the unused `c`). No observable behaviour depends on them, but the annotated program no longer type-checks at those instances |
| **S2** `fn ignore(f: (p) -> q): Int = 0;` `ignore(fn(p) => merge(p, { a: 1 }))` | **accepted** (Sym's case 1': the right part is closed), `p = {}` | none needed | under QT-strict alone it needs `fn(p: {}) => …`, which **narrows** (1 of 2 excluded: `p` holding labels other than `a`, for a lambda never applied); written anyway under the adopted design it narrows the same way |
| **Q1** `fn relate(f: (p, s) -> { ...u }, g: (q, s) -> { b: Int, c: Int, ...u }): Int = 0;` `relate(merge, merge)` | Unresolved: two predicates wait, the first with no field, the second with `b` and `c` (candidates: its `r` and the shared `s`); under §2.10's proposed R11, the approved form `Cannot tell whether merge's r or s has field b; pass a lambda with annotated parameters in place of merge` at the second `merge` | the shared `s`: `relate(fn(p, s: {}) => merge(p, s), merge)` (the re-plan's `fn(p: {}, s)` for QT, §11.3, leaves it Unresolved here, `node qt-adopted.mjs examples`) | **narrows**: 1 of 3 excluded, the typing in which the shared `s` holds an extra label, which then appears in both results; nothing uses it |
| S3 `fn apply0(f: (a, b) -> {}): Int = 0;` `apply0(merge)` | Unresolved: no field (Proposed form) | `apply0(fn(p, q: {}) => merge(p, q))` | redundant (one solution) |
| Q2 `fn nest(f: (p, w) -> { a: Int, b: Int }, g: (p, q) -> w): Int = 0;` `nest(merge, merge)` | Unresolved | `nest(fn(p: {}, w) => merge(p, w), merge)` | redundant |
| program 11 `fn both(f: (p, q) -> { x: Int }, g: (p, w) -> { y: Int }): Int = 0;` `both(merge, merge)` (`design-forced-bound`) | Unresolved: approved D4 `Cannot tell whether merge's r or s has field x; pass a lambda with annotated parameters in place of merge` at the first `merge` | one parameter: `both(fn(p: {}, q) => merge(p, q), merge)` (the re-plan's two-parameter form also works) | redundant |
| program 12 `fn apply(f: (a, b) -> { x: Int, y: Int }, g: (a, b) -> Int): Int = 0;` with `fn noX(p: { ...u }, q: { ...v }): Int where u lacks { y }, v lacks { x } = 0;`, `apply(merge, noX)` (`diag-14-fix`) | Unresolved: each field has one candidate part, Proposed form, e.g. `Cannot tell how merge's r and s split { x: Int, y: Int }; pass a lambda …` | `apply(fn(p: { x: Int }, q) => merge(p, q), noX)` | redundant |
| F2's family, `k(merge, …, merge)` with a shared parameter, 186 programs with a least solution | Unresolved (all 392 plain; 206 have no least solution) | the shared parameter at its only value in the first callback (all 186 accepted, `node qt-adopted.mjs examples`) | redundant in all 186 |
| O4: `granted2({ admin: false })` with `fn granted2(p: { ...r, ...s }): Bool where s lacks { admin }` (found in B2's differential; not a published example) | Unresolved: `admin` has one candidate part, `r` (the prototype, every order, 1 solution; with `{ name: 1, admin: false }`, 2 solutions). Task 4 accepted it by a commit | **none** (2026-10-19): the parts are the direct call's own instantiation, and Waxwing annotates only lambda parameters, so no annotation names `r` or `s`; callers cannot repair it with the available annotation syntax. Changing the callee's signature (for example `{ admin: Bool, ...r }`) is a possible redesign, not necessarily something a library's caller controls. D4's approved hint ("pass a lambda with annotated parameters") does not apply to it | — (kept as an accepted limitation, §10 decision 17; B5 explains it without suggesting an annotation) |
| program 16 `same(merge, merge)` | Unresolved (current design: Contradiction) | an annotation exposes the contradiction (as approved for `odd-cycle`'s hint) | — (no solution) |

So, on the published examples, three programs need an annotation the
current design does not (11, 12, 13), one of which narrows (13 = S1);
Q1 (shrunk from generated shapes, not published) also narrows. On
generated problems the adopted design accepts 9,210 raw runs where the
current design accepts 14,255, 4,340 dense against 19,895, 7,792
program-shape runs against 10,546 (§3.1); these generators overweight
unknowns nothing fixes (re-plan §13.6), and no corpus of real programs
exists to say how often users would meet this.

**The decision record's S2.** The user's decisions list S1, S2 and Q1
as narrowing annotations (re-plan §14.4, measured against QT-strict).
Under the adopted design S2 needs no annotation; its annotation narrows
only if written (§10, decision 9).

## 6. Claims ledger (re-backed)

Each claim this design makes, with what backs it now and the compiler
check that will. B0 completes it; no unbacked claim passes the gate.

| # | Claim | Backing now | Compiler check |
|---|---|---|---|
| M1 | Every case (1, 2, 3, 1g and Sym's mirrors) keeps the solutions, fresh metas accounted for | re-plan §13.1 (PureScript's cases), §14.1 (Sym); prototype S, L, H 0 violations | property E on every run (B3) |
| M2 | Desugaring keeps the solutions (each `t` is determined by its parts) | argument (B0); prototype runs desugar every row | property E (B3) |
| M3 | Re-examination terminates | **L1, for the user's review** (rules file §5): a lineage moves at most `\|Λ\|` times, so a rescan makes at most `P · (\|Λ\| + 1)` productive steps, for any predicate graph; cyclic graphs shown reachable; checked on every family and a cyclic one (`node qt-cyclic.mjs all`), with a sensitivity check. The B0 height measure was wrong as written (height 0 weighs nothing) | the lineage check in the oracle runner; the counter bounded by the theorem (a `Stop Limit` safeguard); `r005b-lineage-lacks` (B3) |
| M4 | `Solved` emits a solution, the least | prototype S, L 0 on every family | S, L on every run (B3, B4) |
| M5 | `Contradiction` (a case's failure, a fact, H) has no solution | prototype H 0; H's argument (§14.2) | H on every run; H's direct exclusion check (B4) |
| M6 | Unresolved occurs with 0, 1 and several solutions | `odd-cycle` 0, `determinate` 1, `diag-01` 4 | asserted counts (B4) |
| M7 | H changes no acceptance or type | by construction (§2.5); prototype `baseDiff` 0 | H on/off on every run (B4) |
| M8 | Acceptance, types and verdict kinds do not depend on the order of constraints | measured: `acceptDiff`, `kindDiff` 0 on every family incl. domains A and B; **not proved** | every order of fixtures and domains; five of generated problems (B3, B4, 9) |
| M9 | Swapping a merge's arguments changes nothing | measured: `mirrorDiff` 0 on every family | mirror runs (B3) |
| M10 | Association of three or more unknown tails changes nothing | measured (B0): ten fixtures, every tail and step order; typed `assoc`, both groupings and every order; argued for 1g only | compiler test (B3) |
| M11 | Field types: cases unify them; unknown field types behave as ground ones | argued; checked by research/row-merge-typed (unknown field types, one level of nesting, no rigid tails) | the typed families through the compiler (test/row-merge-typed.test.mjs, B3 follow-up: reference, H, S/L, G) |
| M12 | Nested predicates are re-examined and reported once, with their path | argued | nested tests (B3), Examples 4, 5 (Task 7) |
| M13 | Predicates revert with a postponed effect pair; the joint fixpoint ends | argued against FX008's 4c premises (rules file §5, B3 follow-up) | the rollback tests at the boundary (test/r005b-rollback.test.mjs); settling through predicates within time bounds (test/r005b-predicates.test.mjs) |
| M14 | After specialization every row is ground | argued (§2.11; old L22) | Specialize asserts it (Task 8) |
| M15 | The representation invariant holds | argued (§2.1) | the `Unexpected` guard and the oracle runner failing on it (B3) |
| M16 | The annotations of §5 make the programs accepted; S1, Q1 narrow, the rest are redundant | `node qt-checks2.mjs generality`; `node qt-adopted.mjs examples` for the adopted configuration | test/r005b-annotations.test.mjs (Task 7) |
| M19 | Diagnostics found while solving are located stably | **L2 proposal for review** (docs/plans/2026-10-19-row-merge-locations.md; `node qt-locate.mjs 2000`). **Open (L2, gate, §10.13):** the same conflict can get different locations under different orders; different orders can find different valid conflicts first. Modelled selection and location checks only (the prototype renders no text) | proposal first; then tests of the chosen change (B3, B5) |

## 7. Tasks

### Task B0: Gate (arguments, ledger, research checks, proposals)

Docs, research scripts and research fixtures only; no src, test or
test-fixture change; nothing in verify.

**Files:**
- docs/plans/2026-10-19-row-merge-rules.md (new): the arguments for
  §2 by kind (rewrites keep solutions: desugaring, each case and
  mirror, the bind rule, decomposition without N5; rejections establish
  impossibility: a case's unification failure, H; defaulting: only
  unknowns no predicate mentions; termination: §2.4's measure, the
  joint fixpoint); the field-type argument for the typed oracle
  (`Int`, `Bool` suffice); association (M10); what is retained from
  the 2026-10-17 rules file by section.
- this plan's §6 ledger completed; §1.1 checked against the documents
  once more.
- research/row-merge-qt/: committed checks for the **scratch** results
  this plan quotes (the adopted configuration's verdict and smallest
  annotation for S1-S3, Q1, Q2, programs 11, 12, F2; association over
  the three-unknown fixtures; the research controls' expected outcomes,
  §4.5), a generator mode with rows of three or more unknown tails, and
  a typed domain with an unknown field type and a nested row; README
  rows with commands and outputs.
- Proposals for the user: the reclassifications of §4.5 with their
  Waxwing sources and annotated variants written out; the Proposed D4
  forms of §5 and H's location (T4) applied to every affected fixture;
  the regression-row changes of §8; T1-T5.

- [x] Write the rules file: docs/plans/2026-10-19-row-merge-rules.md
  (2026-10-19). Termination is argued for acyclic predicate graphs only
  (its §5); the cyclic case is stated as not argued.
- [x] Commit the research checks and reproduce from the tree
  (research/row-merge-qt README, "The adopted configuration";
  research/row-merge-typed; research/purs-given-1g). Each exits 0; each
  was shown to fail on a deliberately wrong expectation or a mutation in
  a deleted scratch copy (qt-adopted.mjs `examples`, `controls`;
  qt-given.mjs; tr-run.mjs's five mutations, research/row-merge-typed
  README).
- [x] Complete the ledger (rules file §11): M3 argued only for acyclic
  predicates, M11-M12 checked without rigid tails and one level deep,
  M8-M10 measured, not proved.
- [x] Proposals written, not applied:
  docs/plans/2026-10-19-row-merge-proposals.md.
- [x] Width check; commit. **Gate: the user reviews the rules file, the
  ledger, the proposals, T1-T5 and §8, and authorizes B1.**

**B0 results** (user's review requests of 2026-10-19, items 1-6):

- **Case 1g** is a Waxwing adaptation, not one of PureScript's cases.
  Its justification is the symbolic disjoint union (rules file §3),
  independently of PureScript's given matching. It agrees with that
  matching where a given `Union` exists for the same parts, orientation
  and grouping, and is broader elsewhere (swapped, regrouped, or
  disjointness from a clause with no given), where purs 0.15.16 reports
  NoInstanceFound; the agreement is a check, not the reason. Narrowing
  it would leave those programs with no annotation that helps. Approved
  broad (§10, decision 4).
- **R10.2.** Case 2 still empties metas; those bindings need their
  predicate as cause (R10.1 extended to case 2), and a written fact's own
  text wins there (R10.2's principle kept; approved, rules file §9).
- **H's location** is now stable by construction (§2.10). Modelled
  diagnostics compared across orders apart from verdict kinds (`node
  qt-render.mjs render 2000`) are modelled diagnostic selection and
  location checks (the prototype renders no text, so these do not show
  that complete rendered messages are stable): no verdict-kind
  difference; no difference in the modelled selection or location for H
  or D4; refusals met while solving are located at the step being
  checked (location rule 1), so their modelled diagnostic differs with
  the order in fixtures 24 of 72, raw 758 of 2,000 and shapes 855 of
  2,000 problems. Gate L2 (§10, decision 13). This is the approved rule's
  dependence on checking order (the re-plan's §11.1 `whyDiff`), not a
  verdict difference; it is listed for the user (§10, decision 6).
- **Reproduced** from the tree: S2 accepted unannotated; Q1's smallest
  annotation on the shared `s`; program 11 one parameter; F2's 186 with
  one annotation; program 16 Contradiction → Unresolved; the ten
  three-unknown fixtures one outcome over every tail and step order;
  `determinate` reported at the second merge, field `a`, under the
  proposed R11; the 72 fixtures (three move) and research controls.
- **Association and types** (research/row-merge-typed): no violation, no
  order, mirror or grouping difference for +Sym+H on 4,000 nested and
  1,000 association problems; QT-strict alone has grouping differences
  (`acceptDiff` 50 and 68). Unchecked: rigid tails with typed or nested
  rows, deeper nesting, effects.
- **No disagreement** between the prototypes, the oracles and the plan's
  expectations was found, except the corrections above (1g's
  classification; R10.2's retirement claim; H's location rule) and
  those already reported (S2, Q1's annotation).

### Task B1: Behaviour-preserving splits

**Files:** Check/RecordTail (U3's `within`, `prunedBy`, `narrowedRests`
into Check/RecordTailBound), Check/Disjoint (its `prune` calls behind
one function), Check/RowSettle (`placing`, `forced` into
Check/RowPlacing), Check/RowStore (bound accessors into
Check/RowStoreBound), Check/Settle (the round's change test into
Check/SettleChange, as 85ca98e on branch r005b-task5), Check/Use
(`declarationUse` into its own module, room for the desugaring hook),
Check/Failure (`settleFinal`'s caller) if B3's end of body needs it.

- [x] Each split its own commit: build, the area's tests, differential
  **0 differences** (`--corpus all`), no test expectation changed
  (2026-10-19; commits f04903c, 299373e, fdd83c3, 4141629, 4159c77,
  345e0df; docs/progress.md "R005 Tranche B B1").
- [x] Verify on the last commit: exit 0 (.build/evidence/r005b-b1-verify.log).
- [x] Opus reviews the differential (.build/evidence/r005b-b1-diff.log:
  0 differences in all five corpora; controller, 2026-10-19).

B1 did not split Check/Failure: `settleFinal`'s caller is split in B3
only if the end of body needs it.

### Task B2: Remove the invented machinery (behind P1)

**Files:** delete Check/SumRule, Check/Narrow, Check/RowBound,
Check/Commit and B1's Check/RecordTailBound, Check/RowStoreBound;
Check/UnifyRecord (no sum rule); Check/RowPlacing (every residue with
two or more metas on a side reaches P1, reworded); Check/Homes (`admits`
without the bound clause; `homesOf` no longer called by solving);
Check/Homeless (step 4 only); Check/Disjoint (no pruning; N5 removed:
the self-pair stored); Check/RowStore (no `upper`, `emptied`);
Check/UnifyFailure, Check/RowOutcome, Check/Lacked, Check/Refused
(`Outside`, `Derived` and their classifier rows removed; P2 reworded);
`Because.Equated` (T5, approved once every remaining consumer is
accounted for: list them first); Check/RowEntry, test/row-merge-*
(bounds out of the read-back and the judge; `exclusions` out);
scripts/regression-r005b.mjs (`r005b-pruned-reason` retired, §8: the
obsolete bound-specific mutations go with the machinery they target, in
this task and not in B1; their behavioural controls stay and the case-2
provenance regression is added).

- [x] Failing tests first (.build/evidence/r005b-b2-red.log: 6 fail,
  37 pass on the pre-B2 build): the rows B2 displaces reach P1, skipped,
  in every order (corrected 2026-10-19: B2 first named
  `design-forced-bound` here, but Task 4 already left it waiting in
  every order, so its red came from P1's old text alone; the test now
  uses `diag-14-fix`, `diag-14` and a commit-only problem, red on the
  pre-B2 build, .build/evidence/r005b-b2-correction-red.log); `fn(p) => g(p,
  p)` applied to `{ x: 1 }` is D2 (B0 pinned no text; §1.2 named D2 as
  the expected change, and the approved D2 form is what the bind rule
  produces); no `Outside` or `Derived` constructor (test/r005b-outcome);
  P1's new text.
- [x] The 25 fixtures at `stages.solver` 4 keep their classes in every
  order; none waits (test/row-merge.test.mjs). The stop did not fire.
- [x] Domains A and B and the generators re-recorded (docs/progress.md
  "R005 Tranche B B2"): Solved shrinks and skipped grows; so does
  Contradiction, which the plan did not say: refusals only the sum rule
  or a bound established now reach P1 (H re-establishes them in B4). S,
  L, H, E, order, measure and fresh-meta defects 0; no stop.
- [x] Verify on 1bb23ae: exit 0 (2269/2269, 59/59, 151 proofs).
  Differential against d7efc6d: 0 among sources without Tranche B
  syntax; 9 Tranche B differences, each classified (N5 → D2; P1's
  wording; accepted → P1; D1 → P1). docs/progress.md "R005 Tranche B
  B2".

**B2 results and departures from the file list** (2026-10-19):

- Removed, besides the listed modules: Check/RowPlacing (its `placing`
  was only P1 once commits and homes went; P1 now sits in RowSettle
  `settle`); `Because.Equation`, RowStore `boundBy`, `equations`,
  `withBoundBy`, `equationId` (T5's listing: their only writers were the
  sum rule and Commit, and nothing read `boundBy`; B3 adds the
  predicate's own cause record); RowResidue `Exam` (with the sum rule's
  and commits' loops gone the examination's state is the substitution);
  `Solving.emptied` (U4's and N5's only).
- P2 was removed, not reworded: its causes were `Outside`, `Derived`
  and `Equated` reasons, all gone. B3 adds a placeholder for refusals
  that a predicate's binding causes, with that cause.
- `Atom` moved to Check/RowResidue; Homes keeps `admits` (no bound
  clause) with no caller until B4's H; RowEntry `exclusions` and the
  L31 check (test/row-merge-homes.mjs) are gone, as listed.
- `r005b-pruned-reason` retired; `r005b-self-pair` added and proved.
  The case-2 provenance row (`r005b-case2-reason`) is not added: case 2
  first exists in B3, so its defect cannot be restored before then
  (the proposals file already placed it in B3; the rules file's §9
  said B2).
- Tranche B programs refused before B2 by a bound or the sum rule now
  reach P1 (E_INTERNAL), as `granted2({ admin: false })` with both tails
  lacking `admin` (was D1). This is the same kind of change as accepted
  → P1; §10 decision 5 has H restore the written fact's text in B4.

### Task B3: Desugaring, predicates, cases, Sym, re-examination

**Gate (user, 2026-10-19): B3 does not start until ledger item L1 is
closed** (§10, decision 12): an argument covering reachable cyclic
predicate graphs, or a proof that they cannot arise with a test of that
invariant; the acyclic measure checked under substitutions that change
edges and share rows. The step counter is a `Stop Limit` safeguard, not
the termination argument. Ledger item L2 (§10, decision 13) must be
decided before the solving-time diagnostics part is implemented.

**Files:** src/Features/Check/RowMerge/Predicate.purs, Desugar.purs,
Cases.purs, Improve.purs, End.purs (minimal: `Solved` or P5);
Check/RowStore (`merges`, identities); every creation point B0 listed
(Check/Use and its split, Check/Match, Check/ClauseBody, …); Check/Unify
(re-examination after each top-level unification); Check/SettleChange
(a round changed if a predicate changed); Check/UnifyRecord and
Check/RowPlacing (P1 → the `Unexpected` invariant guard); Check/Function
(`endOfBody` after settling); Check/RowOutcome (`concluded`, `Settled`);
Check/RowEntry (rows desugared as made; `finish`; H-off option reserved
for B4); test/row-merge-*.

**Interfaces** (names may change in B0):

```
desugared ∷ Solving → Made → State → Threaded (Ty Open)
examine ∷ Solving → Merge → Subst → Either Failure Progress
data Progress = Solved Subst | Replaced Merge Subst | Waits
improve ∷ Solving → Subst → Either Failure Subst   -- full rescan
endOfBody ∷ Subst → Either Stop RowOutcome          -- Solved or P5
concluded ∷ Either Failure Subst → Either Stop RowOutcome
```

- [x] Tests (red on the pre-B3 build: .build/evidence/r005b-b3-red.log)
  test/row-merge.test.mjs: every fixture's rows in every order judged
  in full; stages 4 and 5 keep or never contradict their classes; the
  generators with S, L, H, E, the read-back now including waiting
  predicates (property E also on runs that end waiting, a dropped
  predicate as a second corruption) and the lineage lemma; the second
  reference is the prototype's QT-strict+Sym, H off until B4 (accept,
  refuse, D4 against accept, refuse, P5); the invariant guard never
  fires (the runner throws on it).
- [x] test/row-merge-sym.test.mjs (§4.1: mirrors of fixtures, domain B,
  generators; association of the ten three-unknown fixtures under every
  renaming and order) and test/row-merge-order.test.mjs (§4.3: research
  order fixtures and purs cases, every order up to seven steps, else the
  recorded ones).
- [x] test/r005b-predicates.test.mjs (check phase, `pickR`-style): case
  1, Sym's 1' both ways, both parts unknown (P5 at the use), typed clash
  (a predicate's contradiction, P2) and R10.1's limit (a clash on a
  binding no case made keeps its text), generic callers (1g, 1', D3''),
  nested, occurs, the joint fixpoint both ways, the L2 location under
  three rearrangements (logical sites), a waiting predicate reported
  before an open Fail family, and the metadata check; each within 2 s.
  Plan's separate test/r005b-settle.test.mjs is folded in there.
- [x] test/r005b-outcome.test.mjs: `Exhausted` a limit, `FromMerge` its
  inner class with the cause kept, stops injected through
  re-examination stay stops.
- [x] Implement; verify; differential (docs/progress.md "R005 Tranche B
  B3").

**B3 results and departures** (2026-10-19; docs/progress.md has the
counts):

- New modules src/Features/Check/RowMerge/: Merge (types), Predicate
  (store operations), Desugar, Cases, Improve, End, Reach (metas
  through bindings), Use (desugaring at uses); Check/Merged renders a
  predicate's failure. RowStore gains `merges` (waiting predicates, next
  identity, `boundBy`, each lineage's moves); `boundBy` and the moves
  replace B2's removed `Equation` and `boundBy`.
- Desugaring counts a row's unknown tails as written, as the prototype
  does; the entry requires the parts' pair (it can refuse when a part is
  already bound), uses only meet fresh metas, where storing the pair is
  the same. Flattening first was tried and made verdicts order dependent
  against the reference (a sound refusal in some orders).
- Failure gains `FromMerge` (R10.1 extended: bindings any solving case
  made, recorded in `boundBy`; failures found while re-examining, with
  the L2 location) and `Exhausted` (the rescan's bound, a limit), each
  with a classifier row and an injection test. A predicate's failure
  renders a broken fact's own text (R10.2's principle) or P2, re-added
  here with its cause (Check/Merged).
- P1 is now the invariant guard (`Unexpected "a record row holds two
  unknown tails"`); P5 is reported at the end of a body and, before
  `Fail needs a concrete error family`, wherever a predicate still waits
  (plan F-7, Check/Failure).
- The L2 rule is implemented for failures found while re-examining:
  the latest of the requirement being checked, the predicate's site and
  the arrival sites of its rows' metas. In ordinary checking that is
  the requirement being checked (rule 1); it differs while settling,
  where no requirement is being checked.
- Regression rows landed and proved: `r005b-lineage-lacks`,
  `-case2-reason`, `-sym`, `-sym-rigid`, `-one-unknown`, `-end-fixpoint`.
  **Not landed:** `r005b-settle-rollback`. Predicates live in the
  substitution, so a postponed pair's revert takes them back with the
  bindings by construction; no whole, compiling defect isolates that
  without new plumbing, and no program was found whose retry makes
  progress and then postpones again (a known label's binding is decided
  even when another label's key stays open).
- **Not done at B3** (done by the follow-up below): the typed and
  nested research families through the compiler; M13 was argued in
  part.
- Recovery obligations O1-O6 stay open; their checks are B4's and B5's.

**B3 follow-up** (the user's review, §10 decision 16; 2026-10-19):

- Typed and nested coverage ported: test/row-merge-typed.test.mjs runs
  research/row-merge-typed's families (`nested`, `assoc`) through the
  compiler's entry, rows made at every depth, judged against that
  research solver (Sym, H off) and its oracle (H, S/L, and G: the most
  general typing up to renaming), plus each nested problem mirrored.
  At the research sizes no violation; a defect in case 2's field types
  is caught (G-violated 8 and 12).
- Rollback shown at the transaction boundary (test/r005b-rollback.
  test.mjs): a pair whose first label's payload solves a predicate by
  re-examination and whose second label's family is unknown restores
  the starting bindings, waiting predicates, identities, causes,
  lineage history and facts, also through a settling retry; a revert
  that kept the attempt's row store fails it (scratch). The planned
  whole-program `r005b-settle-rollback` row stays unlanded, as the user
  allowed.
- M13 argued against FX008's premises (rules file §5): a case's
  unification can postpone a new pair (tested), and those pairs are
  bounded.
- A handler's own rows were not desugared, and a record of two tails in
  them reached the invariant guard (`Handler(Log with State({ ...r,
  ...t }))` against a known handler). Now desugared like every other
  row, with tests.
- The two limitations probed against the compiler and purs, diagnosed,
  and a remedy proposed, not adopted: docs/plans/2026-10-19-row-merge-
  limitations.md (case 2g for a known left part and result; O4 kept;
  the D4 hint must not suggest an annotation that cannot help).

**Case 2g** (§10 decision 17, as amended; 2026-10-19; code commit
ae295d1, evidence in docs/progress.md "R005 Tranche B B3: case 2g"):

- RowMerge/Cases: 2g after case 2, guarded by `holdsAll` (every label
  of the right part by name, every rigid tail by identity); case 2
  keeps its own wait; a missing atom makes 2g claim nothing.
- The first form, waiting on a missing atom, was implemented first and
  failed the generated family "program-shaped, shared" (`orderDiff`
  1); the user amended the rule. The counterexample is a permanent test
  in every order; `r005b-case2g-claim` restores the first form.
- The limitation probes: the self-call, the forwarding wrapper and the
  lambda wrapper are accepted; O4 still waits.
  `r005b-sym-rigid`'s probe moved to an unknown result, since 2g now
  solves `Merge U ?q U`.
- The second reference (test/row-merge-judge.mjs) and the termination
  check (qt-termination.mjs) use option `g2`; `qt-2g.mjs` runs it with
  and without H.

### Task B4: The end of a body: Unresolved and H

**Files:** RowMerge/End (`endOfBody` complete: `Solved`, H, `Unresolved`;
P5 removed, P6 added); Check/Homes (`admits` as H's `cannotHold`);
Check/UnifyFailure and the classifier (H's refusal, a Contradiction by
H's argument); Check/Function and Check/Failure (the Unresolved report
before `Fail needs a concrete error family`); Check/RowEntry (the H-off
option); tests.

- [x] Failing tests: the buckets (`odd-cycle` 0, `determinate` 1,
  `diag-01` 4) Unresolved with their counts asserted, each assertion
  shown failing with a wrong count; test/row-merge-h.test.mjs (§4.2);
  test/row-merge-order.test.mjs completed with verdict kinds; the
  reclassified fixtures at solver level, **only if the user approved
  them** (otherwise the task stops before this step); the injection
  tests of §3.5 through `endOfBody`.
- [x] Check-phase: `split({ x: 1, y: 2 })` (`diag-06`) and the
  unannotated `Both` (`diag-07`, `design-both-plain`) end Unresolved,
  asserting P6's E_INTERNAL; `same`-shaped and S1-shaped `pick`
  programs Unresolved.
- [x] Implement; verify; differential classified (P5 → P6 or a
  contradiction).

**B4 results and departures** (2026-10-19, decision 18; docs/progress.md
"R005 Tranche B B4" has the counts):

- RowMerge/End: `endOfBody` takes the unifier and H as a `Judge`
  (injected: `homeless`, or `withoutH` through the entry's
  `finishWithoutH`); `homeless` is §2.5 over Check/RowResidue's residue
  and Check/Homes `admits` negated. Before H it checks that no waiting
  predicate could progress: a stop from that examination passes
  through, any progress or other failure is `Unexpected` (§2.5's
  "the fixpoint did not finish").
- H's refusal is a new failure, `Homeless Atom`, made only inside its
  predicate's `FromMerge` (at the predicate's site; B5 gives the
  approved location), classified a Contradiction. `Atom` moved to its
  own module (Check/Atom) so UnifyFailure can name it.
- RowOutcome: `outcome` split into `stepped` (a step: went on, a
  contradiction, a stop) and `concluded` (the end of a body);
  `Solved` and `Unresolved` carry `Settled`, whose constructor is not
  exported and which only `concluded` makes from End's `Ended`;
  `Unresolved`'s payload is the waiting `Merge`s (the old `Pending`
  went).
- Check/EndReport reports the end for Check/Function and, before `Fail
  needs a concrete error family`, Check/Failure: H's refusal as P2's
  text at the predicate, Unresolved as P6 at the earliest waiting
  predicate's site. P5 is gone.
- Fixtures reclassified as approved (decision 2), each with its
  `-annotated` companion (the smallest annotation of `node
  qt-adopted.mjs examples`), and `same` added (0 solutions). The
  fixture test's `task` is 5 (the 2026-10-17 numbering `stages` uses);
  a Solved fixture at its check stage is now judged by the checker
  alone (`checkWired`), since full compilation stops at P4 until Task
  8. research/open-row-merge's fixtures.mjs keeps the superseded
  classes of the four in a table, as §4.5 says that archive does.
- O1-O5 shown individually (test/row-merge.test.mjs, test/r005b-
  unify.test.mjs, test/r005b-limitations.test.mjs); O6 in the
  exhaustive runs (progress).
- Regression rows landed: `r005b-h-exclusion` (as planned);
  `r005b-predicate-end` (its defect's symptom is lowering's P4, the body
  passing checking, not an acceptance); **reworded**: `r005b-h-binds`
  restores H inside re-examination, and its probe is diag-14's shape
  followed by an ordinary mismatch, which the body must report first (H
  refusing early cannot change a class, since its exclusions only grow);
  `r005b-quiet` restores a rescan that counts a pass where nothing fired
  as a change, so twelve quiet predicates reach the rescan's bound
  instead of Unresolved within 2 s (the adopted design makes no
  predicates while re-examining, so "multiplying predicates" has no
  whole-form defect).
- Rows whose symptom changed: `r005b-end-fixpoint` is now caught by the
  end's progress check (`a waiting predicate could still progress at the
  end of a body`); `r005b-sym` and `r005b-case2g` read P6;
  `r005b-case2g-claim`'s superseded wait is refused by H at the end,
  told apart by location (the predicate's site against case 3's at the
  argument), and the solver-level counterexample test now also runs
  with H off, where case 3's refusal must come before the end (the user:
  H must not conceal that regression); `r005b-case2g-atoms`'s probe is
  H's refusal (P2).

### Task B5: Diagnostics (D4, D6) and metadata

**Files:** Check/PartOrigin filled where rows and predicates are made (Use,
Lambda, Extension, Record `select`, Desugar): part identity, creation span,
lambda-parameter name, instantiated type origin, owner; RowMerge (or Check)
Unresolved.purs (D4: R1-R4, R6-R9, R11 with a stable tie-break for predicates
sharing a source span, never allocation identity; the forms approved 2026-10-19)
and Contradicted.purs (D6: R1-R3, R5-R8, R10.1, H's form and location), both
taking only `RowOutcome` payloads; Check/TypeName (split row printing first);
Problem, Format/Diagnostic/Records; P2 and P6 removed.

- [ ] Failing renderer tests (test/r005b-fixtures.test.mjs): the
  fixtures at `stages.text` 6 (`diag-06`, `diag-07`,
  `design-both-plain`); `render-*` fixtures for each form a source
  without a multi-spread literal can produce (function reference, three
  parts, partial application, nested field, `holds t`; D6 one part,
  `neither`, `none of`, nested), built from `pick`-style signatures,
  texts derived by R1-R11 and pinned in the task's first commit;
  `same-name-parts` (R3) and `participation-control` (R10.1's limit).
- [ ] A structural test: no solving module imports PartOrigin or reads
  a predicate's metadata.
- [ ] R11's tie-break: two waiting predicates at one source span are
  reported identically in every order of making them.
- [ ] Actionable hints told apart (§10 decisions 17, 20): a lambda
  annotation offered where at least one candidate part can take one,
  each hinted text with an annotated companion that is decided; for
  rows of a call's own instantiation (O4), the limitation explained
  with no annotation suggested. Wording approved (decision 20); pinned
  in the first commit (`render-*`, diag-06; docs/progress.md "R005
  Tranche B B5"); `none of` and `same-name-parts` deferred to Task 7
  (decision 21).
- [ ] Solving-time diagnostics (L2): only after the user decides the
  gate's proposal (§10, decision 13).
- [ ] Implement; verify; differential: 0 on existing sources; commit.

### Task 7: The merge literal, access, removal and rest binders

As the 2026-10-17 plan's Task 7, on this design.

**Files:** Resolve/Record (the second spread accepted; `SecondSpread`
removed, PR-1); Check/Extension (extract the overlap check to
Check/Overlap first; items in written order; each spread's row joins the
result's tails, then RowMerge/Desugar makes the predicates for its
unknown tails; `Spread` reasons for item pairs; D2' immediate and late);
Check/Removal and Check/RecordPattern (extract the rest binder first;
one requirement against `{ l1: α1, …, ...ρ }`, type `ρ`); Check/Record
`select`; Check/SeveralTails removed (P3).

- [ ] Failing tests test/r005b-literal.test.mjs: `{ ...a, ...b }`, `{
  ...a, x: v, ...b }`, three spreads, a spread of a merge result, types
  as draft 3 §1.4 with predicates for unknown tails; D2' immediate and
  late (`d2-late`); one-spread literals unchanged; the former
  `SecondSpread` sources listed, accepted or D2'.
- [ ] Failing tests test/r005b-removal.test.mjs:
  `r005b-without-hole-left`, `-right`, `r005b-rest-hole`; `.x` on the
  rest refused while the predicate waits; the rest `{ y: Int }` with `x`
  in either part.
- [ ] Complete-source checking switches on: every fixture with
  `stages.check` 7, class, code, message, span and notes exactly; the
  annotation tests of §4.4; `diag-14` in every order of its facts.
- [ ] Implement; verify; differential: differences only in sources with
  several spreads (refused before) and removal or rest over several
  tails, classified.

### Task 8: Specialization and lowering; reference interpreter

As the 2026-10-17 plan's Task 8: Specialize/Record (canonical form under
a key: fields of all tails joined and sorted, unsolved tails empty; a
label twice stays E_INTERNAL `Duplicate record label`; a waiting
predicate under a key is E_INTERNAL, never reached after B4),
Specialize/Layouts, Domain/IR/Internal (extract first if extended),
Format/Go/Extension (items into typed temporaries left to right),
Format/Go/RecordLayouts, Nested; test/fx-oracle-records.mjs and
fx-oracle-parse.mjs (the interpreter evaluates several spreads);
test/fx-gen-record-extension.mjs gains several spreads. P4 removed;
`grep -rn "R005B placeholder" src` empty.

- [ ] Failing tests test/r005b-go.test.mjs (executed): `merge` at `r = {
  a }, s = { b }` and at `r = { a, b }, s = {}`; `{ ...g(), x: f(),
  ...h() }` prints g, f, h once each (`r005b-merge-order`); a field read
  from the right item when labels interleave (`r005b-merge-sources`); an
  empty spread still evaluated; ADT-valued fields; nested merges.
- [ ] Execution switches on: every fixture with `stages.run` 8, and the
  `-annotated` fixtures of §4.5 if approved.
- [ ] test/fx-oracle-row-merge.test.mjs: generated merge programs run in
  Go and the interpreter agree, with a sensitivity check.
- [ ] Implement; verify; differential: emit and compile byte-identical
  for every source the base compiles.

### Task 9: Generated programs across boundaries; oracle level 2

**Files:** test/fx-gen-row-merge.mjs (programs as §3.4), test/
row-merge-reference.mjs (the generator's model → constraints → brute
force, with field types), test/row-merge-shrink.mjs (delta debugging),
test/r005b-programs.test.mjs.

- [ ] Failing first: against a deliberately broken checker copy (Sym
  disabled; separately, H without its entailment test) the test reports
  a mismatch and shrinks it to a fixture under 10 lines (recorded, copy
  deleted).
- [ ] The test: class against the reference (`Solved` a solution and
  the least; `Contradiction` none; `Unresolved` counted by its number of
  solutions); the research prototype as second reference; accepted
  programs run in Go and the interpreter; order, mirror and H-off
  variants (§4.1-§4.3); a census per shape with minimums; the burden
  measured (Unresolved with a least solution, by shape) and reported
  beside the prototype's.
- [ ] Shrunk failures saved as `found-*` fixtures and fixed here or filed
  in BACKLOG with evidence and a next action.
- [ ] Verify; commit.

### Task 10a: The module README, made authoritative

**Files:** src/Features/Check/RowMerge/README.md (from
docs/plans/2026-10-19-row-merge-readme-draft.md; the draft is deleted or
marked moved), docs/engineering.md ("Research scripts" or a new
paragraph: module READMEs under src are maintained documentation,
width-checked, authoritative for their modules), ADR 013 and
docs/language.md links to it.

- [ ] Update the README to match the code as merged: module and
  function names, the order of cases, the exact texts, the test files,
  commands and the numbers measured on the compiler (Tasks B3-9), each
  marked with the command that reproduces it; every "planned" or
  "draft" statement removed or made true.
- [ ] Trace every technical statement to a file, a test or a document
  (a checklist in the task's evidence log); an untraceable one is fixed
  or removed.
- [ ] **Acceptance: an explicit review for technical accuracy and
  readability** — a reviewer (Opus, fresh context) checks each statement
  against the code and the research documents and reads it as the
  intended audience (an ordinary programmer); findings are fixed and
  recorded; then the user's review. From then on the README is
  authoritative about the implemented design: a later change to the
  row-merge modules updates it in the same commit (a review convention
  recorded in docs/engineering.md).
- [ ] Width check; commit.

### Task 10b: Rows, docs, ADR, examples, close-out

- [ ] Regression rows not yet landed (§8), each proved failing with its
  defect restored, compiling with 0 warnings.
- [ ] examples/records.wxw gains `merge` and a merge literal;
  bootstrap/records.go regenerated; docs/language.md (several tails,
  `disjoint`, merge literals, the one-spread rule retired, when an
  annotation is needed and why); ADR 013 section "Open-row merge (R005
  Tranche B)" naming each component's source (ADR 014) and linking the
  README.
- [ ] research/row-merge-qt/README.md updated if any script changed; the
  ledger final; BACKLOG R005 done; progress; `grep -rn "R005B
  placeholder" src` empty; no fixture skipped.
- [ ] Full differential against the pre-Tranche-B main, classified;
  verify; commit; the user's merge decision.

## 8. Regression rows

Each restores one defect in a whole, compiling form and is proved
failing in an isolated copy. Rows of the 2026-10-17 plan not listed are
kept as planned (`r005b-precedence`, `-provenance`, `-mixed-lacks`,
`-mixed-tails`, `-self-apart` (the rigid case), `-body-type`,
`-wrapper-pairs`, `-cancel`, `-apart-persist`, `-three-way`,
`-participation`, `-part-identity`, `-owner-written`, `-without-hole-*`,
`-rest-hole`, `-merge-order`, `-merge-sources`, `-both-annotation`,
`-nested-field`, `-settle-rollback`, `-end-fixpoint`).

| Row | Status | Defect restored | Probe | Task |
|---|---|---|---|---|
| `r005b-pruned-reason` | landed (Task 4); **retired in B2** | its mutation targets Check/Narrow, which B2 deletes | `lone-meta-lack` and `-two` keep pinning D1 as fixtures | B2 |
| `r005b-upper` | planned, never landed; **drop proposed** | no upper bounds | `both(merge, merge)` is Unresolved by design | — |
| `r005b-bound-reason` | planned; **drop proposed** | R10.3 | — | — |
| `r005b-defer` | planned; **reworded** | a predicate solved by guessing a part | `apply2(merge, { y: 2 }, { x: 1 })` stays accepted with each label in its argument's part | 7 |
| `r005b-quiet` | **landed, B4; reworded again** | a rescan that counts a pass where no case fired as a change | `h(pick × 12)` Unresolved (P6) within 2 s | B4 |
| `r005b-pending-dedup` → `r005b-nested-once` | reworded | a nested predicate reported twice | draft 3 §2.6's nested program, one D4 | B5 |
| `r005b-pending-end` → `r005b-predicate-end` | **landed, B4** | waiting predicates dropped at the end | `split({ x: 1, y: 2 })` passes checking (lowering's P4) instead of P6 | B4 |
| `r005b-drain-text` → `r005b-case-text` | reworded | a case's failure uses Require's own text | `apply2(merge, { z: 1 }, { y: 2 })` reads `Expected { ..._ }, found …` | 7 |
| `r005b-drained-reason` → `r005b-solved-reason` | reworded | a binding a case made loses its predicate (R10.1) | Example 17 reads `Expected {}, found { z: Int }` | 7 |
| `r005b-sym` | **new** | Sym disabled | S2 (`ignore(fn(p) => merge(p, { a: 1 }))`) Unresolved | B3 |
| `r005b-sym-rigid` | **new** | Sym's closed test true for a part with a rigid tail | a generic caller B0 finds by the oracle, refused or accepted wrongly | B3 |
| `r005b-h-exclusion` | **landed, B4** | H's exclusion without entailment (a rigid partner excludes a label whether or not it lacks it) | `Merge R ?q { a, ...w }` with `r lacks { a }` refused although it has a solution | B4 |
| `r005b-h-binds` | **landed, B4; reworded** | H run before the end (inside re-examination) | diag-14's shape then an ordinary mismatch: H's refusal pre-empts it | B4 |
| `r005b-one-unknown` | **new** | a creation point not desugared | a constructor or effect-operation use with `{ ...r, ...s }`: E_INTERNAL (the invariant guard) where a verdict is due | B3 |
| `r005b-case2-reason` | **new, B3** (moved from B2, user 2026-10-19) | a binding case 2 made loses its predicate as cause | the shape of `node qt-render.mjs case2`'s problem 1558 as a Waxwing program | B3 |
| `r005b-lineage-lacks` | **new, proposed by L1** | the bind rule not passing a meta's lacks to a meta rest (Check/RecordTail `passed`) | a cyclic program (a merge result unified with its own part holding a label) reaches the step counter's `Stop Limit` instead of its Contradiction | B3 |
| `r005b-self-pair` | **landed in B2** | N5 restored (a meta apart from itself bound to `{}`) | `fn(p) => g(p, p)` applied to `{ x: 1 }` reads the text before B2 (`Expected {}, found { x: Int }`) instead of D2 | B2 |

## 9. Estimates, actuals and risks

**Historical spend** (recorded only where known; the rest was not
recorded):

| Work | Spent |
|---|---|
| Task 0-3 | not recorded (planned 250k, 250k, 150k, 350k tokens) |
| Task 4 and its review fix | about 0.6M tokens: docs/progress.md records about 0.6M for Task 4's session; re-plan §11.6 says the fix was not recorded separately; the user's brief (2026-10-19) gives about 0.6M including the fix |
| Task 5, partial (branch r005b-task5) | not recorded; 42 files +1,789/−281, unbuilt, unverified |
| Alternatives assessment, re-plan, follow-up, PureScript experiment, QT-strict, adaptations, this plan | not recorded |

**Remaining work**, planning **estimates, not a budget** (Task 4 overran
its estimate by about 1.5×):

| Task | What | Model | Estimate (tokens, agent time) |
|---|---|---|---|
| B0 | rules file, ledger, research checks, proposals | Opus | 150-200k, 3-4 h |
| B1 | behaviour-preserving splits | Sonnet (Opus reviews) | 60-100k, 1-2 h |
| B2 | removal behind P1; N5; classifier; domains re-recorded | Opus | 150-200k, 3-4 h |
| B3 | desugaring, predicates, cases, Sym, re-examination, rollback, joint fixpoint, level-1 oracle | Opus | 350-450k, 6-8 h |
| B4 | end of body, H, Unresolved, buckets, H tests | Opus | 200-250k, 3-4 h |
| B5 | D4, D6, R1-R11 as kept, metadata | Opus | 300-350k, 5-6 h |
| 7 | literal, removal, rest; complete-source fixtures; annotation tests | Opus | 350-400k, 5-6 h |
| 8 | lowering, interpreter | Sonnet (Opus reviews) | 250k, 4 h |
| 9 | generated programs, oracle level 2, shrinking | Opus | 300-350k, 4-5 h |
| 10a | README authoritative, review | Opus | 80-120k, 2 h |
| 10b | rows, docs, ADR, examples, close-out | Sonnet (Opus reviews rows) | 150-200k, 3 h |

Total about 2.3-2.8M tokens (**estimate**), each task plus one verify
(about 12 minutes) and one differential (about 10 minutes).

**Risks.**
- **Creation points missed by the desugaring** (a row with two unknown
  tails reaching unification): the invariant guard makes it a
  `Stop Internal`, the oracle and `r005b-one-unknown` catch it; B0's grep
  lists the sites.
- **Field types, nested rows, effects** are argued, not prototyped
  (M11-M13); B3's tests are the first evidence. A case the argument
  misses stops the task.
- **Association** (M10) rests on ten fixtures; B0's generator mode is
  the first broad check.
- **The burden is larger than the current design's** (§5): published
  examples 11, 12, 13; generated problems as §3.1. Users meet D4 in
  point-free higher-order code; the hint names the fix. No corpus
  exists to say how often.
- **Diagnostics**: the Proposed D4 forms and H's location need approval;
  approved texts whose class is unchanged may still be produced through
  a different mechanism (H for `diag-14`, Sym for `diag-03`), so a text
  or location the mechanism cannot reproduce is a stop for the user.
- **Full-rescan cost** on large bodies: measured on the scale programs
  (R001, T003) in B3; an index is added only if measured necessary and
  then compared with the rescan on the domains.
- **N5's removal** changes the text of a merged test's program (B2);
  pinned before the change.
- **Removing merged, verified code** (B2): the differential, the
  re-recorded domains and the unchanged stage-4 fixtures are the guard.

## 10. Decisions for the user

Decided by the user on 2026-10-19 after Task B0; each decision is marked
**approved** or **gate** (an open item that blocks a named task). The
details of the proposals are in
docs/plans/2026-10-19-row-merge-proposals.md.

1. **B0 accepted; B1 authorized alone** (behaviour-preserving splits).
   B2 onward remain unauthorized. **Approved.**
2. **Fixture reclassifications** (§4.5): `design-forced-bound`,
   `diag-14-fix`, `design-quiet` Solved → Unresolved, each with an
   annotated companion (`-annotated`, Solved, `output` `0\n`); `same`
   added as Unresolved with zero solutions; the research controls'
   expected outcomes recorded (`node qt-adopted.mjs controls`).
   **Approved.** The old design's results stay in its research archive,
   research/open-row-merge (fixtures.mjs asserts the superseded
   classes). test/fixtures is not edited in B1; the reclassification
   belongs to B4's fixture step and B5 pins the texts.
3. **Proposed D4 forms and R11** (proposals §2): a waiting predicate
   with no field (S1, S3); one whose fields each have one candidate part
   (program 12); R11 reporting the earliest predicate with a field two
   parts may hold, else the earliest predicate. **Approved**, with one
   added requirement: the choice of predicate must have a **stable
   tie-break** when predicates share a source span. Allocation identity
   (the order in which predicates were made) must not decide; the
   tie-break uses source data only (for instance the span's start and
   end, then the path of the field), and B5 tests two predicates at one
   span in every order.
4. **Case 1g's scope** (rules file §3): **approved, broad.** Its
   justification is the symbolic disjoint union: with no unknown in
   either part the result has exactly one value, and the signature's
   disjointness makes it a valid record. That holds independently of
   PureScript's given matching, which agrees with 1g only where a given
   `Union` exists for the same parts, orientation and grouping. The
   rules file, this plan and the README draft keep the two apart: the
   agreement with PureScript is a check, not the reason.
5. **R10.2** (rules file §9): **approved.** Its principle is kept: where
   a written fact also excludes the label, that fact's specific
   diagnostic (D1, D2, D3'') is preferred to D6. Causal tracking extends
   to case-2 bindings (R10.1 extended to case 2), as proposed.
6. **H's location** (T4, rules file §7): **approved**, the stable
   source/provenance rule. Refusals met while solving keep the approved
   location rule 1 for now; see decision 13 (gate).
7. **Regression rows** (§8): **approved** retiring the obsolete
   bound-specific regression mutations (`r005b-pruned-reason`; the
   planned `r005b-upper` and `r005b-bound-reason` are dropped), keeping
   their behavioural controls and adding the case-2 provenance
   regression (a binding case 2 made keeps its predicate as cause).
   Each retirement happens together with the removal of the machinery
   it targets (B2), not in B1.
8. **N5's removal** (T2): **approved.**
9. **Translation decisions** T1 (desugar at creation, left fold, no
   memo) and T3 (nested sites): **approved.** T5 (`Equated` removed):
   **approved** once its remaining consumers are accounted for (B2
   lists every use of `Because.Equated` before deleting it).
10. **S2 in the decision record**: **approved** the correction. The
    adopted design accepts S2 without an annotation (Sym): "S1 and Q1
    need annotations that narrow; S2's annotation, needed only without
    Sym, would narrow if written".
11. **Module location**: **approved**; new modules in
    src/Features/Check/RowMerge/ and the README at
    src/Features/Check/RowMerge/README.md (§0); retained modules stay
    where they are.
12. **Termination** (rules file §5): **GATE, blocks B3.** The argument
    covers acyclic predicate graphs only. Before B3 either (a) an
    argument covering reachable cyclic predicate graphs, or (b) a proof
    that they cannot arise, with a test of that invariant. The step
    counter (`Stop Limit`) is a safeguard, not a termination argument.
    The acyclic measure must also be checked to stay valid as
    substitutions change graph edges and make predicates share rows.
    Ledger item L1 (rules file §11, M3). **Returned for review**
    (2026-10-19): rules file §5, an argument that uses no graph
    property, with cyclic graphs shown reachable and the checks named
    there; not closed until the user accepts it.
13. **Solving-time diagnostics** (location rule 1): **GATE, before that
    part is implemented (B3 for refusals met while solving, B5 for
    their text).** A proposal first, separating (1) the SAME conflict
    getting different locations under different orders (fixable from
    provenance) from (2) different orders discovering DIFFERENT valid
    conflicts first (may need collecting or prioritizing conflicts, and
    may be costly). It gives examples (fixtures 24 of 72, raw 758 and
    shapes 855 of 2,000 in the modelled comparison) and the smallest
    proposed change, before anything is decided. Complete diagnostic
    order independence is not promised. Ledger item L2 (rules file
    §11, M19). **Proposal returned for review** (2026-10-19):
    docs/plans/2026-10-19-row-merge-locations.md. Of the modelled
    order-dependent refusals, same conflict with the same explanation:
    fixtures 18, raw 55, shapes 91; same conflict explained differently:
    3, 57, 4; different conflicts: 3, 646, 212 (548 shaped problems past
    the oracle's caps). Proposed: for refusals found while re-examining
    predicates only, locate at the latest written participant (stable
    for the same conflict by construction in the model; its compiler
    approximation to be checked in B3); no change for different
    explanations or different conflicts. Not decided.

14. **B2 reviewed** (user, 2026-10-19). Its departures are accepted
    for this intermediate branch: (1) refusals displaced to P1 are
    acceptable as unfinished checking; each is a named recovery
    obligation (§4.7) whose outcome and diagnostic are shown
    individually, not assumed restored by H; (2) P2's removal is
    appropriate, its producers gone; (3) the unused structures go, and
    B3's predicate causes must restore the provenance behaviour
    required; (4) the case-2 provenance row moves to B3 (§8); (5) the
    N5 overlap diagnostic at the argument is **confirmed**, with the
    existing provenance-note rules (`first written here` where the label
    arrived, `required here` at the clause). The harvest's 14 timing
    failures were to be disposed of, not rerun away (BACKLOG T005).
    L1 and L2 authorized as research and docs work; B3 stays blocked
    until both are reviewed.

15. **L1 accepted, L2 approved, B3 authorized** (user, 2026-10-19).
    L1's lineage argument is accepted, with Λ tightened to every label
    available to a rescan (rules file §5) and the lineage-lacks
    regression and the `Stop Limit` safeguard kept. L2: the provenance
    location rule applies **only to refusals found while re-examining
    predicates**; every other diagnostic keeps its location; different
    explanations and different conflicts may stay order dependent, an
    explicit policy decision. B3 must test the same-conflict cases
    against the intended participants, comparing corresponding logical
    sites when sources are rearranged, and report before pinning texts
    if provenance cannot reproduce the stable location. O1-O6 stay open
    until their checks pass; O4's burden belongs in the README too.

16. **B3 reviewed, not yet approved** (user, 2026-10-19). A focused
    follow-up is authorized, within the approved rules: port the typed
    and nested oracle coverage; show rollback at the postponement
    boundary (constructed state allowed, no whole-program mutation
    required); close M13's composition argument against FX008's
    premises; desugar records in a handler's own rows if they are
    reachable, or document and test that they are not; probe the
    recursive-call limitation (with a nonrecursive forwarding wrapper)
    and O4, show whether each comes from missing signature-given
    entailment, inaccessible row arguments or both, and bring back the
    smallest remedy or a proposal to keep it. No solver rule is added
    without approval; D4 must not suggest an annotation that cannot
    repair the call. B4 stays blocked; O1-O6 stay open.

17. **B3 follow-up accepted; 2g approved; O4 kept** (user, 2026-10-19).
    The follow-up closes decision 16's four obligations; the absence of
    generated effect-settling coverage stays a documented limit (M13).
    **Case 2g approved** and authorized within B3 (rules file §3a):
    subtracting a known symbolic subrow from a known symbolic result,
    with these boundaries: the right part and the result hold no
    unresolved row meta after following bindings; every label and rigid
    tail of the right part occurs explicitly in the result; shared field
    types are unified; rigid tails are cancelled by identity, never
    inspected, split or inferred from what they might contain; Sym
    applies it with the inputs exchanged. Recorded as another explicit
    adaptation, not as PureScript's given matching; no general
    improvement between predicates. **Amended** the same day, after the
    implementation found that waiting on a missing atom kept case 3 from
    a refusal (rules file §3a, "The amendment"): 2g applies only when
    the result explicitly holds every label and rigid tail of the right
    part; otherwise it makes no claim and checking continues to case 3
    or waiting; case 2 keeps PureScript's behaviour. H must not conceal
    such a regression: the counterexample is a permanent test, and the
    order checks run with and without H. Wording: 2g preserves the
    solution set while letting more waiting problems be decided,
    accepted or refused; it does not "add solutions". **O4 stays
    unresolved**, an accepted expressiveness limitation of this tranche:
    callers cannot repair it with the available annotation syntax;
    changing the callee's signature is a possible redesign, not
    necessarily something a library's caller controls. **B5** must
    distinguish actionable hints (a lambda annotation where it can
    resolve the constraint; for rows of a call's own instantiation, the
    limitation explained, with no annotation suggested); the exact
    wording comes back for approval, and no new diagnostic text is
    approved here. B4 stays blocked until the 2g change is reviewed. No
    merge or push.

18. **2g as amended accepted; B4 authorized** (user, 2026-10-19). No
    blocking findings: fall-through keeps case 3 available and closed
    case 2 keeps its wait; cancellation removes one matching rigid tail
    by identity and unifies shared field types; the `r005b-sym-rigid`
    witness change is justified (the old shape became solvable by the
    intended improvement; the replacement keeps an unknown result); the
    brute-force oracle and solution read-back give confidence beyond
    agreement with the updated prototype; the diagnostic differences are
    accounted for (earlier binding exposes a contradiction sooner; the
    nested mismatch is within R10.1's limits). The reviewer reran 18
    focused tests (the 2g and limitation tests and the order fixtures,
    the counterexample's 720 permutations included), not verify or the
    exhaustive corpora. O4 stays documented as a limitation callers
    cannot repair with the available annotations; B5's hint wording
    comes back for approval. No merge or push.

19. **B4 accepted; B5 authorized** (user, 2026-10-19), within the
    approved plan, with any new hint wording brought back before it is
    pinned. No blocking findings: H runs only after the fixpoint and only
    when predicates remain, binds nothing, Unresolved claims nothing
    about solutions, the unfinished-fixpoint check is an internal
    failure, the 2g counterexample stays sensitive with H off; the
    departures of `r005b-h-binds` and `r005b-quiet` are reasonable. One
    nonblocking gap, closed the same day: the judge's H-off comparison
    now compares states in every run, H's refusals included. The
    reviewer ran 67 focused tests (one fixture failed only on the
    sandbox's Go cache and passed with filesystem access), about 104,000
    H on/off comparisons, not verify. B5 keeps a lambda annotation that
    can resolve an ambiguity apart from O4's limitation, which callers
    cannot repair with the available annotations.

20. **B5's hint wording approved** (user, 2026-10-19). D4 keeps its
    approved texts; the hint follows `; ` as in R9, chosen by the
    origin of the reported predicate's parts (PartOrigin), not by its
    shape.
    - **Kind 1, an annotation may help:** R9's three texts unchanged
      (`pass a lambda with annotated parameters in place of O`; `… in
      place of this partial application of O`; `annotate this
      lambda's parameters`). Eligibility: at least one candidate part
      of the reported field (for the no-field and one-candidate forms,
      at least one unknown part) is a lambda parameter or comes from a
      function value passed as an argument. **Qualification:** one
      annotatable part shows where an annotation might help; it does
      not establish that annotating it resolves the whole ambiguity,
      since other unknown parts or predicates may remain. Each hinted
      fixture has an annotated companion that must be accepted or
      give a genuine contradiction; a companion that stays Unresolved
      is reported to the user before its hint is pinned, and the check
      is not weakened to diagnostic movement. In mixed-origin cases
      the suggested annotation must reach the relevant part.
    - **Kind 2, the parts belong to a direct call (O4):** wording A,
      `; no annotation can decide A and B, which belong to this call
      of O`. Approved instances: O4, `Cannot tell how granted2's r and
      s split { admin: Bool }; no annotation can decide r and s, which
      belong to this call of granted2`; Example 6 (`diag-06`), `Cannot
      tell whether split's r or s has field x; no annotation can decide
      r and s, which belong to this call of split`. Wording B (adding
      `only a change to O's signature can`) was declined: callers need
      not control the callee's signature, and "only" claims too much
      about remedies.
    - **Amendment to R9** (diagnostics file, the named-call row): the
      named call's "none" hint, approved for Example 6, is replaced by
      kind 2, following decision 17.
    - **Deferred:** a note explaining that a part is not inferred to
      hold a field because the other parts lack it (O4); it would need
      new metadata and is not part of B5.

21. **T6 approved; `none of` and `same-name-parts` deferred** (user,
    2026-10-20).
    - **T6, the location of a predicate's diagnostic.** A predicate
      made from a supplied parameter's written row is located at that
      argument; one from the result type at the use (the call, the
      partial application or the function value); nested predicates
      inherit their location (T3); a parameter with no argument
      supplied keeps the use's span. `diag-18`'s primary is amended
      from `p` to `merge`, as `render-holds` is pinned at `pickR`; its
      note at `{ ...t }` keeps where the row is required. Provenance
      stays separate from solving: T6 changes no processing order, no
      rule and no acceptance.
    - **`none of` (D6).** Source-level coverage is deferred. H is not
      strengthened and no fact is propagated to produce the message.
      The three-part program is kept as the Unresolved control
      `render-none-control` (its annotated companion exposes D1), with
      why the chain's intermediate part keeps H from refusing it.
      Task 7 reassesses reachability with the merge literal and
      records it if the form stays unreachable; a renderer-level test
      may exercise the wording, labelled as such.
    - **`same-name-parts`** moves to Task 7; its requirement stays open:
      distinct part identities with identical displayed names, numbered
      and ordered stably.

**Reporting correction (user, 2026-10-19).** The prototype renders no
text. Its comparisons across orders are "modelled diagnostic selection
and location checks": they model which constraint is reported and where,
and are not evidence that complete rendered messages are stable. The
rules file, this plan and the README draft say so.

## References

As the re-plan's (docs/plans/2026-10-18-row-merge-qualified-types.md,
"References"; §11.5 for what was read, with revisions): [C10] Chlipala,
Ur, PLDI 2010; [GJ96] Gaster and Jones 1996; [H98] the Haskell 98
Report; [HP91] Harper and Pierce, POPL 1991; [J92] Jones, A theory of
qualified types, ESOP 1992 (revised version); [J94] Jones, Qualified
Types, 1994; [J95] Jones, Simplifying and improving qualified types,
FPCA 1995; [J00] Jones, Type classes with functional dependencies, ESOP
2000; [L05] Leijen, Extensible records with scoped labels, TFP 2005;
[MM19] Morris and McKinna, POPL 2019; [PS] PureScript 0.15.16 (tag
commit 4c66c05a): Entailment.hs, Environment.hs, Types.hs, and
purescript-record (8ebda016) Record.purs; [R94] Rémy 1994; [SDPS07]
Sulzmann, Duck, Peyton Jones and Stuckey, JFP 2007.

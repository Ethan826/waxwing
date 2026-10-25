# a-min: statements, revision 3.6 with the §R7 corrections and §R7b (G-effect-rows, 2026-10-25)

Status: **approved as a representation by the author at 535b780
(2026-10-25; §R7b, dossier §18.95); named obligations open (O-SUB, A1
and §0e's carried table), no soundness claim; implementation, A2's
algorithm, G-D1's closure and Task 4.6 unauthorized.** Revision 3.6
(§0e) records the FX033 repair (rule H′ as E4′'s ResultC tail; RC′
still open), U8 as implemented, the oracle
reruns, O6's standing, and one table of carried obligations, for one
approval review (closure checklist, critical path 1). Revision 3.5
applies the author's rulings on §R6 (dossier §18.85; §0d, §R6a): K1
adopted as a conservative validator restriction (Definition 4.2, §4),
rule J chosen for O4 (Definition 4.1(d)), §R6's S3 fixes applied; the
solved form for bindings (U8, §11) awaits code inspection. No code.
Revision 3 (one design, §18.77-18.78) was reviewed a third time (§R3);
revision 3.1 applied those fixes and delivered U1 and U6; a targeted
review of 3.1 (§R4) found one plausible S1 (N1) and four S2; revision
3.2 applied them under §18.80's conditions (§0a). A targeted re-review
of 3.2 (§R5) found two S1 (F1, F2), three S2 (F3, F5) and S3 items. This
revision 3.3 applies them under §18.82's five conditions (§0b) and folds
in the obligation semantics of §18.81 (§14). F5's unifier entry-point
audit is in §13a; it found two unrecorded paths (O1, O2). Revision 3.4
applies the author's rulings of 2026-10-24 on §13a and §13b (§0c): O1
and O2 are recorded, the false copies claim is corrected, O3 and O6 are
stated, K2-K4 resolved; K1 and O4 stay open. §R3a, §R4a, §R5a, §R5b
and §R6a are the resolution ledgers. "Local fixes" describes edit size, not
confidence that the remaining soundness work is small (§18.80). Labels
on every claim: **decided** (the author's), **universal** (an argument
for all inputs), **bounded** (a check over finite inputs, named),
**unrun** (a predicted example outcome), **reasoned** (an argument from
reading the code or the design for the cases named, checked by no run),
**design** (holds by construction of the proposed representation once
built; nothing exists to check yet), **proposed**, **open**.

Sources: FX008's design (docs/plans/2026-10-10-abort-tracking-design.md
§1, §3.3-3.5, §5) and plan ("as built" notes for Tasks 7-9); the code
it built (Frames.purs, Defer.purs, Clauses.purs, Install.purs,
Lend.purs, ResultClauses.purs, MarkUse.purs, UnifyMark.purs,
Consume.purs, TailPass.purs, Handle.purs, Settle.purs, SyncCycle.purs,
Mark.purs); the unifier (Unify.purs, UnifyParts.purs, UnifyRow.purs,
Domain/Row.purs, Walked.purs); generation (Generate/Translate.purs,
Generate/Effect.purs, Generate/Node.purs, Generate/Callee.purs,
Domain/Recorded/Internal.purs); FX001's consumption;
r0-erased-rows.md §2, §7.1; r0-certify-argument.md; findings.md
"Effect and coverage audit". Code facts are from base 0c2ad60.

## 0. What changed from revision 3

1. **Complete edge collection** (T2-a, S1): `defer` consumes its row
   into the enclosing row directionally (Defer.purs `consumeLabels`,
   `ignoreMarks: false`), so E2's sites include `defer` and every
   settling consumption (§4). §7a traces FX008's original failing
   cleanup to the refusal of the forged package.
2. **One home for each fact** (T3-b, T2-c): every FX008 position has
   exactly one authoritative place (§2's ownership table); other uses
   refer to it; I3 refuses any second copy.
3. **Concrete obligations** (T3-a, T2-b, T2-e): E1 compares full marked
   types recorded with both sides; consumption, clause tails and
   installation are conditions on final rows, not inference steps.
4. **As-built handler rules** (T2-d, T2-e; corrected in 3.2, N2): a
   handler literal, a top-level result handler type at a use
   (ResultClauses `ownClauses`) and an outermost handler type in a local
   annotation (MarkUse `handlerRows`) own a C; every other C is R's bare
   alias; C rows are bare and installation pairs by key and position.
   (Corrected in 3.3, F6: in a local annotation every handler type not
   inside another handler type's rows owns a C, not only the outermost;
   §2.)
5. **Least terms over equality classes** (T1-a), U1's premises stated
   (T1-b), and U1's bounded oracle run (§5).
6. **Routing pinned to the code** (T5-a): an unsupported obligation
   kind blocks at rule 1 (`Unsupported EffectsUnchecked`), as
   Decide.purs's header and r0-erased-rows §7.1 place it; a failed
   candidate is a `CheckFailed` attempt and later strategies run.
7. **U6 written** (§13): every source rule that can refuse an effect
   or a mark, mapped to its obligation or to an exclusion with its
   reason.

## 0a. What changed in revision 3.2 (§18.80)

1. **Every owned C has one home with stated obligations** (N1, N2,
   N6): a literal's C is an effect-row binding; a ResultC's and an
   annotation C's labels and fixed marks are **derived by trusted code
   from the recorded problem** (R's labels, bare), so a package cannot
   supply or forge them; only their flexible marks and tail come from
   the package (§2, E4, E5). Label added in 3.3: **design** (the
   package has no slot for these facts and I3's exact domain refuses
   one; nothing is built). In 3.3 generation records the C itself
   (§0b item 3).
2. **Copies through equations** (N5): a handler literal's recorded type
   names its site positions, generation records an E1 at the literal's
   node, and every image copy of a site position arises from a recorded
   unification, so a position and its copies form one class; P2 is
   per class; mark assignments are checked per class (§2, §5). Label
   added in 3.3: **open** pending the entry-point audit (§13a, F5).
   Corrected in 3.4: the claim was **false** as written; §13a found two
   unifications with no recorded equation (O1, O2). 3.4 records both
   (§4, "Where E1 is recorded") and states E1 for records with several
   tails (O6); the claim now stands as **reasoned** from §13a's reading
   audit, except where O4 is open (§2, "Copies through equations").
3. **Inclusion, not equality** (N4): R is consumed into ρ ignoring marks
   (E2 with marks ignored), so ρ may hold more effects (§4 E5, §12).
   (3.5: only for a closed R; a rigid-tailed R is under Definition 4.2,
   §4, §0d.)
4. **Routing described as built** (N3): a rule-1 block still runs every
   strategy and refuter; Solved is suppressed afterwards (§7).
5. **Reproducible evidence**: the forgery cases (cleanup, owned C
   forged empty, let-bound handler, inclusion), each beside an honest
   control and judged under the earlier obligation set too, and three
   injected mutants, run from the repository (§5, §12).
6. Smaller corrections N7-N12 (§R4a).

## 0b. What changed in revision 3.3 (§18.82)

1. **One definition of handler-type equality** (F1, condition 1):
   Definition 4.1 (§4), read from Unify.purs and UnifyParts.purs.
   Revision 3.2's E1 ignored R's marks on every handler type and had no
   C ≡ C; E1, §12, §13 and §14 now refer to Definition 4.1. Its
   justification is FX008 §5 point 1 (class S); today's behaviour is
   supporting evidence. Attempt A is its separating example (reasoned,
   not run). (3.5, §R6 S3-7: attempts A and B now run in derived.mjs,
   bounded, and today refuses both, run; §12.2.)
2. **No package-side ResultC** (F2, condition 2): `ResultC { c ∷ MRow
   }` is removed from §10's `SiteFact`. Generation records the derived
   C in the use's recorded instance type (`Fields.instances`; §2, §10).
3. **Recorded inputs for derivation** (F3, F6, condition 3): §2 states
   what generation records at each use with a top-level handler result
   and at each local annotation, with no checker state outside the
   recorded problem; E4′ reads those records. In an annotation every
   handler type not inside another handler type's rows owns a C, with
   its own `Annotation` positions and an always-fresh tail (F6).
4. **F5** (condition 4): §13a maps every unifier entry point; two
   paths have no recorded equation (O1, O2), so §2's copies claim is
   false as written until they are recorded; O3-O7 follow.
5. **S3 items**: E2's remainder states the closed-source case (F7);
   §2 names the readers of R's extension marks; §12 separates the rows
   reproduced in cases.mjs from unrun predictions; §0a's and §2's
   claims carry labels.
6. **Semantics folded in** (§18.81): §14 holds the classes, arguments,
   obligation table (with rows for Definition 4.1 and C ≡ C),
   compatibility-only list and open decisions;
   r0-amin-obligation-semantics.md is now a pointer to it.
7. **Not in this revision**: condition 5's oracle work (derivation
   cases from recorded inputs, attempts A and B with passing controls, a
   C-equality mutant, a replacement for the inclusion case) is being
   done in research/amin-mark-oracle/ in parallel. No result of it is
   reported here.

## 0c. What changed in revision 3.4 (author's rulings, 2026-10-24)

The author ruled on §13a and §13b on 2026-10-24 (to be recorded as
dossier §18.83 by the controller). Each item has a §R5b row.

1. **O1, O2 recorded** (decided): §4 "Where E1 is recorded" adds E1
   between a clause body's type and the operation's result
   instantiated with the handled label's arguments, rows closed (O1),
   and between a `with` node's variable and its body's type (O2). Each
   has a forged-package case and a control in
   research/amin-mark-oracle/equations.mjs (§12.1; bounded).
2. **The completeness claim corrected** (decided): §13a showed "every
   image copy arises from a recorded unification" false. §0a item 2,
   §2 "Copies through equations", §5 P1 and P2, §11 U6, §13's copy row
   and §R5a now say what is recorded, what stays open (O4, O5, O7; K1
   for E2) and with what standing.
3. **O3** (wording): "ignoring marks" and E2's copies concern a label's
   own top-level mark only; arguments, nested marks and nested handler
   types included, are shared or compared (§4: E2, Definition 4.1(d)).
4. **O6** (definition): §4 states E1 for records with several tails
   (written fields plus the disjoint union of the tails' images);
   **proposed**, reasoned from RowMerge's reference copies, no case.
5. **Instances and annotations** (decided): §2 "What generation
   records" and §10's `instances` and `annotations` are **approved for
   specification** (statements only), no longer proposed; nothing is
   built.
6. **K2** (examples): §12.1's and §12.2's N1 programs replaced by
   programs not refused for FrameRigid, each run through today's
   compiler with its control (§12.1); cases.mjs's comment updated. The
   graphs are unchanged and labelled as graphs.
7. **K3, K4** (wording): E2's tail conditions restated on completed
   rows; the remainder clause (an inference step) dropped; `defer` and
   every settling site consume labels only, with a throwaway tail
   (§4 E2).
8. **Added after the repairs, same revision**: K1 investigated (§13b:
   E2's rigid clause unsound as written; a stronger premise proposed,
   not adopted); O4's two candidate rules and their comparison (§13a;
   no ruling); U7's own check (§11, u7.mjs). The targeted review was
   held until K1 was investigated.

## 0d. What changed in revision 3.5 (§18.85)

The author ruled on §R6 on 2026-10-24 (dossier §18.85). Implementation
stays blocked; no implementation authorization is implied. Each §R6
finding and each §18.85 item has a §R6a row.

1. **K1 adopted** (decided, §18.85 items 1, 2): Definition 4.2
   (rigid-tailed consumption, §4), one condition on completed rows,
   stated once and referenced from every site it applies to (call,
   perform, apply, pipe, over- and partial-application stages, callback,
   E4's c_k into R and into C, E5's R into ρ, and E10's stage sites).
   E2's "Tails" text for a rigid source now refers to it; clause rows
   into C left E2's labels-only list (S2-1). The departure from today's
   label-by-label c into C is recorded with its reason (§4, Definition
   4.2). A refusal by Definition 4.2 means the validator cannot certify
   the candidate, not that the program is invalid or that this is final
   language policy; the known lost acceptances are listed there.
2. **E10 settled by reading** (reasoned): it has no source of its own;
   a function body's ambient row is its declared row, so E10 is E2 at
   the stage sites that target it (§4 E10).
3. **O4: rule J** (decided, §18.85 item 3): Definition 4.1(d)'s alias is
   R itself, its own tail variable included (§4). Rule K stays in §13a
   as an alternative whose equivalence with J on recorded problems is
   unestablished; its weakest step is the solved form for bindings (U8).
4. **§R6's S3 fixes**: U7's counts (S3-1, §11); K1's necessity scoped to
   FX008's positional invariant (S3-2, §13b); callback and E10 (S3-3);
   the installed-C step (S3-4, §4 E5); the F1′-hook exclusion restated
   on Definition 4.2 (S3-5, §13); O4's caveat (S3-6, §13a); attempts A
   and B relabelled as run (S3-7, §0b, §12.2, §14); O1's wording (S3-8,
   §4).
5. **U8, the solved form for bindings** (§18.85 item 4): inspected
   (§11 U8): not enforced by trusted certification; confirmed by a run
   (an unbound flexible reference is certified with a witness). Recorded
   as a gap with a proposed invariant and fixtures; not implemented.
6. **N4 and §14** (§18.85 item 5): §12.1's N4 row flips to refused (p1
   separating); inclusion holds only for a closed R (§0a item 3, E5,
   §14); a closed-R inclusion control row is added to §12.1 for the
   oracle agent's case, no result claimed here; §14 replaces the
   rigid-remainder row with Definition 4.2 and adds the c-into-C
   departure.
7. **Qualifications kept visible** (§18.85 item 6): "no additional
   refusal found" against today rests on the K1 probes and reasoning
   (§13b), not on a general compatibility result. A ResultC's own tail
   remains unexamined (open decision 3, §14). E10 is settled only by
   the reading in §4 (reasoned, nothing run). Adopting K1 does not
   close a ResultC's tail, and it does not establish the soundness of
   the whole judgment: Definition 4.2's sufficiency is argued site by
   site, not by a substitution lemma (§R6).

## 0e. What changed in revision 3.6 (2026-10-25)

Scope: the closure checklist's critical path 1 (author's ratification,
2026-10-25): one revision, then one approval review. No code; nothing
here is newly proved.

1. **E4′'s ResultC tail is H′** (FX033 repair; on main at 6b4be77, on
   this branch at 094adbf): C's tail is R's whenever R's tail variable
   occurs in a parameter, in the callee's own row, or in the result
   outside R's own tail position; otherwise the use's own fresh tail
   (§2, §4 E4′, §12.2's generation-side fixture row, §14). H′ refuses the nine
   demonstrated programs (observed, docs/plans/r0-amin-resultc-tail.md
   Review 2) and refuses c1 and x1z as a temporary precision
   limitation. **It does not discharge RC′**: P4 (behavioural
   parametricity under dynamic handler scoping), O-SUB (substitution
   through the whole judgment) and A1 (static rows to dynamic frames)
   remain unproved. Decision 3 (§14) stays open.
2. **Claims that depend on RC′** (corrected, §R7 S2-3). RC′'s parts are not all
   fresh-tail obligations: only **P4** (behavioural parametricity) is specific
   to the fresh-tail case. **O-SUB** and **A1** are obligations of the whole
   judgment: every polymorphic use, H′'s occurs case (via P3), E5's installed-C
   step and Definition 4.2's argument rest on them. P4 is what depends on the
   fresh-tail case: a use whose ResultC tail variable occurs as R's tail alone
   (k2f; aroundBoth's `prefix()`; the FX008 regression probe r1 in
   test/fx008-defer-programs.mjs, not Review 2's record channel). For those uses
   the installed-C edges (E2 installed-C site, E5's frame edges read through C)
   rest on RC′; abort safety for programs installing such a handler is therefore
   argued, not established. Where the tail is R's no claim rests on P4; it still
   rests on O-SUB and A1, as every use does. The alternative that removes
   reliance on P4 is "always R's tail" (§14 decision 3's fallback); O-SUB and
   A1 remain dependencies under it. Emulated with
   an unused parameter that forces the occurs path, it refuses aroundBoth
   ("Expected nofail(k) Log, found Log") and k2f, and keeps r1, r2 and r9
   (observed through the stand-in, research/amin-resultc-probes/review36/; §R7).
   So r1, r2 and r9 exercise the ResultC fresh path today but do not require a
   fresh tail; aroundBoth's `prefix()` and k2f do. **Ruled (author, 2026-10-25):
   "always R's tail" as a provisional shadow-validator restriction.** It removes
   P4 only where it prevents freshening; it does not discharge O-SUB, A1 or the
   other whole-judgment obligations. The stand-in's differences are evidence for
   the restriction, not checks of a validator, which needs its own. Losing
   aroundBoth and k2f stays visible under A6. The live compiler keeps H′.
   The procedure is the stand-in's (§R7b): force R's tail, then check
   the constraints (E4′). It does not refuse every use recorded with a
   fresh tail, which would also lose r1, r2 and r9.
3. **U8 implemented** (7476097, pin 9f547d7; §11 U8): today's type
   and record-row bindings are in solved form or refused
   (`UnsolvedImage`). a-min's effect-row and mark bindings must extend
   the same check; that extension is part of any implementation, not
   of these statements.
4. **§18.85 item 7's checks run** (§12.1, "Reruns"): N4 refused under
   Definition 4.2; the closed-R control accepted, its near miss
   refused (observed, bounded).
5. **O6 (records with several tails).** Corrected (§R7 S2-2): rigid
   two-tail equalities are constructible (o6g, o6h accepted; o6i, o6j
   refused; observed) and O6 is testable for them; oracle cases owed.
   What is not constructible (observed, research/amin-o6-probes/, this
   branch's build): a record
   literal with two spreads is E_TYPE "A record literal accepts at
   most one spread" (o6a); a call into a two-tailed parameter is
   E_TYPE "Cannot tell whether pick's r or s has field k; no annotation
   can decide r and s, ..." (o6d), likewise with no extra fields (o6e)
   and through a two-tailed caller (o6f); with a closed clause row the
   program meets FX034 instead (o6c; FX034 is filed on main, not on
   this branch's BACKLOG). Flexible-tail unfolding becomes testable
   when R005B's forced splits (closure checklist B7) or merges land.
6. **Carried obligations, one table** (below). "Carried" means the
   statements can be judged as a representation with the obligation
   open and labelled; "blocking" means approval should wait for it.

| Obligation | Where | Standing | Blocks representation approval? | Blocks a soundness claim? |
|---|---|---|---|---|
| P4 (RC′'s parametricity step), fresh-tail ResultC uses only | §0e item 2; resultc-tail §6 | argued, unproved; refutation history (RC false through nine channels) | no: the shadow validator forces R's tail and checks ("always R's tail", ruled 2026-10-25; §R7b) | yes: abort safety for fresh-tail uses (effect safety goes through R, not C); not needed while the restriction holds |
| O-SUB, with A1 under [FX008-5] | §0e item 2; resultc-tail §6; §4 E5 installed-C step; §13b | presupposed by the compiler, unproved | no | yes: every polymorphic use, both ResultC cases, Definition 4.2, E5's step |
| [FX008-5] points 1-4 | §14 | argued, reviewed against probes, unproved | no | yes: every S row citing it |
| Definition 4.2's sufficiency | §4, §13b | per site, reasoned; no substitution lemma | no | yes, for rigid-tailed consumption |
| E10 | §4 E10 | settled by reading only | no | yes if the reading is incomplete: it is a coverage claim (a rigid source missed would escape Definition 4.2) |
| a ResultC's own tail under rule J | §13a O4; resultc-tail P9 | reasoned in P9 (a rule J merge links γ to the alias's tail; r1, r2 observed accordingly) | no | yes: rests on P4 for fresh tails and on U8's extension |
| O5, O7 | §13a | correspondence: a-min may accept more than today | no | yes (argued): each widening needs its exclusion argument, bare-C for O5, Definition 4.2 standing in for the F1′ hook's closing for O7 (§13) |
| O6 | §0e item 5; §13a O6 | testable for rigid tails (o6g-o6j); flexible-tail unfolding not constructible | no | yes: handler types copied through several-tailed records (P2); oracle cases owed |
| U2, U3, U5 | §11 | unresolved claims | no | U2: completeness of read-back; U3: sufficiency of the solved form on the corpus; U5: equivalence with FX008's settling |
| U4 | §11; §8 S2 | unresolved | no | yes: soundness of certify (C1-C2) for effect rows, marks and label-argument holes; effect-hole defaults rest on it |
| U6 / P1, coverage | §11; §13; §8 S4 | argued; fixtures and mutants never run | no | yes: the validator covers today's refusal rules, and generation computes H′'s tail correctly (trusted under E4′) |
| U7 | §11 | correspondence over a fixed grammar; the ResultC occurs shape is outside it | no | no claim beyond correspondence with rule J's encoding |
| P2 and the §13a audit's scope | §5; §13a | reasoned; Refute/, Strategy/, Decide* and Entailed* outside the audit | no | yes: a unifier path outside the audit could copy a handler type unrecorded |
| U8 extension to effect rows and marks | §11 U8 | not built (no effect bindings yet) | no | yes, once a-min's bindings exist (P2 in O4's case, P9, rule J) |
| effect-safety theorem for the consumption variant | §14, "Not covered" | [L17] is the model, not a proof | no | yes |

7. **The five effect-contract decisions** (research/effect-kinds,
   decision-memo.md §7) are not settled here. a-min's obligations
   preserve the intended guarantees (effect safety, abort safety; §14;
   today's checker violated abort safety before FX033's repair and
   still has FX032)
   over today's labels, rows and marks; no row of §14 encodes a
   choice about `pure` and crash, a catchable `Crash`, the
   observation boundary, external root classes or the extension rule
   (reasoned, for the reviewer to check). One rule touches nearby
   ground: uniform Console frame accounting (§14 decision 1, §18.86)
   is chosen so that lifting FX011 or a future catchable channel does
   not inherit today's guard; it adds edges and settles no policy.
   Coupling points (§R7, reasoned): E8 and the "Console labels N" row
   hardcode Console as the only, non-aborting root (decisions 2-4
   would amend them); E4's own-abort rule and E6 treat `Fail` as the
   only typed abort (decisions 1-2 would amend them). These rows would
   need amendment, not reinterpretation, if those decisions change.

## 1. Goal, threat model, scope (unchanged from revision 3)

Every effect, mark and clause fact that reaches compilation is judged
by trusted code over the one package `build` reads; the fidelity target
is the post-Strip program, rows included (decided, Q1). Soundness holds
for any candidate from any strategy, forged ones included (decided,
§18.76). Lowering and today's checker are unchanged; effect soundness
stays Pending.

## 2. The package and who owns each fact

**Marked types** `MTy = Ty Var` with a `MarkTerm` on every label
occurrence and `{ inference: R, clauses }` on every handler type.
**Mark terms** `N | M | J S` (S a non-empty set of the declaration's
rigid mark variables), `norm (J ∅) = N`, every comparison on normal
forms. `Fail` labels carry the term N as a placeholder: E2's
matched-pair edges include `Fail` pairs, where N ⊑ N always holds; I3
refuses another term on a `Fail` label, and `strip` erases it (T3-d,
N9). Console labels are N
(FX008 §3.3); I3 refuses another term on a Console label, and the
generator records a written `nofail(k) Console` as N (T3-e). Image
variables: declared rigids at their sort (the implicit ambient row
variable included), holes, no flexible problem variable; declared data
row counts (decided, §18.76).

**Ownership.** Each FX008 position has one home; every other mention
is a reference by key.

| Fact | Home | Referred to by |
|---|---|---|
| a flexible type, record-row or effect-row variable's value | `bindings` (`Inline`, `InlineRow`, `Free`) | images, rows, obligations |
| a clause's own row c (a tail meta in FX008) | `bindings`, at the clause's `⟨p, clauses k⟩` effect-row variable | `HandlerLit` by variable |
| a deferred row d | `bindings`, at the `defer`'s `⟨p, effect⟩` variable | `Deferred` by variable |
| a stage tail's binding, copies of ρ's prefix included | `bindings`, at the stage tail variable (the copies are its labels) | E2 by variable |
| a handler literal's own-abort mark m | `sites` `HandlerLit { m }` | E4, E5 |
| a handler literal's C (its clause row aggregate) | `bindings`, at the literal's `⟨p, handler clauses⟩` effect-row variable (a bare row) | `HandlerLit` by variable; E4, E5 |
| a ResultC (top-level result handler type at a use, ResultClauses `ownClauses`) | **the recorded problem**: generation records it in the use's instance type (`instances`, §10), labels, marks and tail as "What generation records" below states; the package holds only the binding of `⟨p, result clauses⟩` when that variable is the tail | Definition 4.1, E4′, E5 |
| an annotation C (each handler type in a local annotation not inside another handler type's rows, MarkUse `freshType`, `handlerRows`; F6) | **the recorded problem**: generation records the annotation's MTy with this C (`annotations`, §10): labels R's, bare; written `nofail`, `nofail(k)` kept; every other mark a position of its own in `sites` `Annotation { marks }`, distinct from R's position for the same label; tail always `⟨p, annotation clauses i⟩`, an effect-row variable bound in `bindings` | Definition 4.1, E4′, E5 |
| an installation's frame mark f | `sites` `Installation { frame }` | E5 |
| a callee's `nofail(k)` at a use (one meta per k, shared across its signature) | `sites` `Instantiated { marks ∷ Map MarkName MarkTerm }` | the instance's written labels, by name |
| an opened handler mark at a use | `sites` `Opened { mark }` | E1, E3 |
| an unmarked label in a local annotation | that annotation's recorded type in the problem names a position; its term lives in `sites` `Annotation { marks }` | E1 |
| marks that consuming R into ρ adds to R by extension | none of their own: fresh terms inside R's tail binding, erased by `strip` | Lend `assume`'s edge when C is R's alias (upper side only), and Definition 4.1(d) through the alias if the value later meets a type owning a C (F7; both only add constraints, reasoned) |

Every site fact holds marks or variable names, never rows (rows are
bindings or recorded in the problem); I3 refuses a site fact that
carries a row (T3-b, N6). The package's domain equals the recorded
positions exactly (N10); R's extension marks are terms inside bindings,
read only as the last table row says (F7: §R5 judged the `assume`
reading harmless; a reading through Definition 4.1 equates them with
another type's C marks, which can only refuse more).

**What generation records for handler types (F3, condition 3;
approved for specification by the author, 2026-10-24, statements
only; unbuilt).** Today generation records no handler row or mark.
Translating a handler type emits an `Outside HandlerType` marker
(Generate/Translate.purs `handlerOf` adds `HandlerMark`, which
Generate/Node.purs `markersAt` emits as `EmitOutside HandlerType`); a
handler literal and a `with` emit the same marker (Generate/Effect.purs
`handler`, rule E20, and `with`, rule E21); recorded atoms erase a
handler type to `App (HandlerHead e) args` (Generate/Elab/Recorded.purs);
and `Fields` (Domain/Recorded/Internal.purs) holds a use's callee only
as a `FunctionId` with its slots (`adm`), no signature. Generation does
read the callee's signature to translate it under θ
(Generate/Callee.purs). So generation records:
- **At each use whose instantiated result is a top-level handler
  type** (Use.purs `openedUse` runs `ownClauses` after `openHandlers`):
  the use's instance MTy in `instances`, its handler result carrying
  `clauses: Just C`, C as ResultClauses `ownClauses` builds it.
  Labels: R's at the use, in order and count, bare (Walked.purs
  `bareLabel`: no arguments; a `Fail` label keeps its payload's head,
  or the payload as it stands when the head is not known, e.g. an
  instantiated variable). Marks: R's at the use, each N, M or a
  reference to the use's `Instantiated` k (callee marks are
  instantiated before `ownClauses` runs, DeclarationUse.purs
  `instantiateMarks`; `openHandlers` opens only the handled label).
  Tail (`copied`, `kept`): R's tail variable (the instance slot of the
  callee's effect-row variable that R ends in) when it occurs in a
  parameter, in the callee's own row, or in the result handler with its
  inference row's tail dropped (`occurs` folds over `TFun TUnit row
  TUnit`, the parameters and `untailed result`; rule H′, the FX033
  repair of 2026-10-25 on branch fx033-resultc-tail); otherwise the use's own
  effect-row variable `⟨p, result clauses⟩` (`kept`: `Hole meta | not
  (occurs meta) → Just (Hole next)`); closed when R is closed (`kept
  =<< tail` with no tail); any other tail as it stands (`other → Just
  other`).
- **At each local annotation** (Lambda.purs `parameterType` calls
  `localMarks` on the annotation after the rigid substitution): the
  annotation's MTy in `annotations`. Each handler type in it not inside
  another handler type's rows carries its own C: MarkUse `freshType`
  passes `outside` unchanged through arrows, data arguments, records and
  labels, and only `handlerRows` turns it false for R's labels. C's
  labels are R's, bare (`clausesOf` with `bareLabel empty`). Marks:
  `handlerRows` runs the `inference` supply twice (`withClauses <$>
  inference <*> inference <*> (Hole <$> next)`), and each run draws new
  metas, so each unwritten mark of C is a position distinct from R's
  for the same label; written `nofail` and `nofail(k)` stay
  (`freshMark`). Tail: always fresh (`Hole <$> next`; `clausesOf`
  ignores R's tail), even when R is closed or ends in a rigid; recorded
  as `⟨p, annotation clauses i⟩`, i the handler type's index in the
  annotation. A handler type inside another's rows keeps C = R.
- **No unrecorded checker state** (design): every input of E4′ is in
  these records. R's labels and marks are in the recorded MTy; the
  occurs choice is made by generation from the callee's signature, as
  `ownClauses` makes it from the instantiated signature, and recorded
  as the chosen tail; nothing is read from the checker's substitution.
  Whether generation records them correctly is generation's obligation
  (U6, §13; its fixtures in §12.2), not `validateEffects`'s.

**Copies through equations (N5; corrected in 3.4 after §13a, F5).**
A handler literal's recorded type is
`THandler (Label e args (HandlerLit.m)) { inference: ⟨p, handler
inference⟩, clauses: Just ⟨p, handler clauses⟩ }`, and generation
records `Equal (TVar node) (that type)` at the literal's node (design).
Revision 3.2 claimed that an image can hold a copy of a site position
only where today's checker unifies two types, each such unification
recorded as an E1. **That claim was false**: §13a's audit found two
unifications with no recorded equation, a clause body against the
operation's result (O1) and a `with` node's type (O2), each refused
today but accepted by revision 3.3's obligations with a forged or
honest package (§12.1, equations.mjs; bounded).

What is recorded in 3.4: every path §13a's table lists as copying a
handler type into an image is one of (i) an E1 site (§4, "Where E1 is
recorded": each rule where G0 records a `GenEqual`, the literal's node,
O1, O2, records with several tails under O6's definition, and the
`handle`, `if` and `match` node types); (ii) an E2 consumption, whose
copies are labels of the completed source with a fresh top-level mark,
arguments shared (O3, §4); (iii) the same variable (`let`, locals,
binders); or (iv) construction of positions (§2's table, E3, E4′, E5).
Where these hold, a site position and every image copy of it are
joined by recorded equations into one class; P2 holds per class (§5),
and `validateEffects` checks mark assignments per class (`norm`
equality on every E1 mark pair). Standing: **reasoned** (§13a is a
reading audit at 0c2ad60, nothing run except its three headline
programs; the oracle cases test only O1's and O2's graphs).

What remains open: **O4** (when one side owns a C and the other does
not, `unifyClauses` unifies the owned C with R itself, so own-C labels
may join R; Definition 4.1(d) does not yet say whether they do, so the
claim is open for that case; decision pending, §13a); **O5** and **O7**
(today imposes more than a-min there: correspondence, not copies; P1,
§5); **O6**'s definition is proposed, unchecked by any case; and K1
(§13b) for E2's rigid case. (3.5: O4 decided as rule J, so an own-C
label beyond R's joins R's tail binding and Definition 4.1(d) equates
it with the other side's R; the claim for that case is reasoned on
this reading, not re-audited, and rests on U8's extension to effect
rows and marks (§11; not built). K1 decided as
Definition 4.2, §4.) Any unifier path the audit did not reach
(it excluded Refute/, Strategy/, Decide* and Entailed*, the G0 path) is
outside the claim.

**Stripped projection.** `strip` maps marks to `Unmarked`, clauses to
`Nothing`, drops `sites` and keeps bindings' shapes (Check/Strip.purs's
rule); `build` reads `strip P` only.

## 3. Rigid and fixed marks

Rigid: the declaration's own `nofail(k)` variables (recorded in the
problem as `rigidMarks`). Fixed: written `nofail` (N), written plain
labels in signatures (M), Console (N). Everything in §2's `sites` and
every mark on a label inside `bindings` is a flexible position.
"Fresh" in FX008 always means a new flexible position, never a
distinct value; no obligation forces two positions to differ (review
3 task 4, clean).

## 4. Obligations as conditions on final rows (recorded in the problem)

The recorded problem gains `obligations` (Domain.Recorded.Internal,
covered by `elaborate`'s whole-`Fields` identity). Each obligation is a
**condition on the completed package**, read after settling holes to
their defaults (§6); none is an instruction to extend, bind or merge.
Rows are compared up to scoped-label order (Leijen 2005's row
equivalence, FX001's representation).

**E1, equations.** `Equal lhs rhs` with both sides recorded as marked
types over the problem's variables (`lhs, rhs ∷ MTy`, the written side
keeping its fixed and rigid marks, annotation marks naming their
`Annotation` positions). Holds when the two sides, under the package,
are equal types: same structure; rows equal up to scoped order; labels'
arguments equal, nested marks included; marks equal on normal forms;
two handler types, at any depth, equal by Definition 4.1 and by nothing
else. (R ≡ ρ at installation is not an E1: it is E5's consumption.)
Refusals: TypeMismatch, InfiniteType, LabelMismatch (RowPayload), the
mark E_TYPE clashes (UnifyMark `equateMarks`). Recorded atoms (RTExpr)
stay row-free for G0; E1 is a separate record. An E1 side that is a
use's instance type or a local annotation refers to its `instances` or
`annotations` entry by site rather than repeating it (single home).

**Where E1 is recorded (3.4; O1 and O2 decided by the author,
2026-10-24).** Generation records an E1 at: each rule where G0 records
a `GenEqual` (§13a, first row); a handler literal's node (§2); the
`handle`, `if` and `match` node types and record unification (G0's
equations, read at full marked types); and, new in 3.4:
- **O1, clause body.** For each handler clause, `Equal` between the
  clause body's type and the operation's declared result type with the
  handled label's arguments substituted and every row variable of the
  operation's declared result replaced by the closed row
  (ClauseBody.purs:52, `require` against `instantiateType label
  clause.result`, whose substitution is `rows: closed`). The label's
  argument rows are not substituted there: they are closed already at
  resolution (worded in 3.5, §R6 S3-8; the reviewer's probe was refused
  "This function must be pure, but it performs Ask"). The right side
  is a written marked type: its written marks fixed, a handler type in
  it owning no C (R is its alias). Today
  generation records nothing there (Generate/Effect.purs
  `handlerClause` recurs into the body only).
- **O2, `with` node.** For each `with h { body }`, `Equal` between the
  node's variable `⟨p, res⟩` and the body's type (Install.purs:73: the
  node's type is the body's type term, `Checked.typeOf
  bodyValue.value`). Today rule E21 gives the fresh `⟨p, res⟩` with "no
  equation through the handler" (Generate/Effect.purs `with`).

Separating examples: equations.mjs's O1 and O2 cases with controls
(§12.1; bounded, graphs only). Neither changes the representation.

**Records with several tails (O6; proposed in 3.4).** A record type
`{ l̄: τ̄, ...t1, …, ...tn }` (Generate/Record.purs rule E25 records
`eq ⟨p, res⟩ { l̄: τ̄, ...⟨p, spread 1⟩ … }`) denotes, under a package,
its written fields together with the disjoint union of its tails'
images: a record-row variable contributes its completed binding's
fields and tails, unfolded; a hole contributes nothing (lowering's
default, §6); a declared rigid record-row variable stays a tail. E1
holds between two record types when their denoted rows have the same
field labels, each same-label pair of field types equal by E1 (nested
marks included, handler types by Definition 4.1), and the same rigid
tails as a multiset. A label in two parts is G0's `Disjoint` atom
(InBothRows), not E1. Standing: **proposed**; reasoned only from
RowMerge's cases (`oriented`, `subtracted`, `moved`), which copy a
field term into the result record by reference, so the copy equals the
original with every mark, as this definition asks; no case checks it,
and the multiset reading of rigid tails is unchecked against RowMerge.
The definition follows the composition result `θ(r) ⊎ θ(s)` of the
record dossier (§3.2, C7b); its agreement with that dossier's C5
(field types per record) is unchecked.

**Definition 4.1 (handler-type equality; F1, condition 1).** Two marked
handler types `THandler (Label e as m) { inference: R, clauses: C? }`
and `THandler (Label e′ as′ m′) { inference: R′, clauses: C′? }`, C?
present exactly when the type owns a C (§2), are equal under a package
when all of the following hold:
- (a) e = e′, the argument lists have one length, and the arguments are
  pairwise equal by E1 (Unify.purs `unifyHeads`, the `THandler` case:
  `one == other && sameLength lefts rights`, then `unifyPair` over the
  arguments);
- (b) the handled marks are equal on normal forms, m ≡ m′
  (UnifyParts.purs `handledMarks`, through UnifyMark `equateMarks`; a
  clash is a type mismatch, `mismatch subst left right`);
- (c) if neither side owns a C: R ≡ R′ as rows with marks, that is,
  E1's row equality with label arguments equal and marks equal on
  normal forms (Unify.purs `unifyInference`, first branch, `unifyRowAt`
  to UnifyRow `unifyRows`, mode `EqualMarks`). R stands in as C
  (Domain/Row.purs `clauseRow rows = fromMaybe rows.inference
  rows.clauses`), so this comparison is also C ≡ C, and (d) does not
  apply (UnifyParts `unifyClauses` returns at once when both `clauses`
  are `Nothing`);
- (d) if either side owns a C: R ≡ R′ with the labels' own top-level
  marks ignored and their arguments equal by E1, nested marks and
  nested handler types included (`unifyInference`, second branch:
  `unifyRowsIgnoring (unifyAt (level + 1))`, whose argument unifier is
  the full one; UnifyMark's `IgnoreMarks` case skips only the label's
  own mark; O3, worded in 3.4), and clauseRow ≡ clauseRow′ with marks
  (`unifyClauses`: `unifyRows ignoringArguments` on `clauseRow left`
  and `clauseRow right`, mode `EqualMarks`): labels paired by key and
  per-key position (a `Fail` label's key is its payload's head,
  Domain/Row.purs `labelKey`), marks equal on normal forms (a `Fail`
  label holds the placeholder N, §2, as today's `normalMark` leaves it
  unmarked, so it never clashes), tails equal, no label argument
  compared beyond the `Fail` head (UnifyRow `ignoringArguments`: "C's
  arguments are never unified; R carries and checks them"). **Rule J**
  (decided, §18.85 item 3; O4): a side without its own C uses R itself
  as its clauseRow, as Domain/Row.purs `clauseRow` does. The alias is
  R, not a copy: the same labels read bare (keys and marks only), the
  same mark positions, and R's own tail variable, not a separate
  variable ending where R ends. So a C label beyond R's written labels
  must be in the package's binding of R's flexible tail, and is then
  equated with the other side's R by R ≡ R′ above (wording finding of
  §13a resolved).

Conditions are on completed rows (after settling, §6), where E9 makes
every `Fail` head concrete; today's postponement of a pair whose `Fail`
head is unknown (UnifyRow `unifyRows`, retried by Unify.purs
`settleRows`) is an inference step, not a condition. Justification:
FX008 §5 point 1, "Handler values reach installations only by type
equality (C ≡ C, marks included) [...] So m and C are honest wherever
the handler is installed. R adds only equalities, and its marks are
dead", and §3.4, "Two handler types unify C with C, marks included".
Class S (§14); today's code is supporting evidence, not the argument.
Reasoned: FX008's design gives a written signature type its own C, "a
structural copy of R with the same written marks and the same closed or
rigid tail" (§3.4); as built (Task 9) such a type has no C and (c)
compares R with marks instead. Comparing R with marks and arguments in
one pass asks what (d) asks of two structural copies plus R ≡ R′
ignoring marks, so the alias implements the design's C ≡ C for those
types (U7, §11; unchecked). Separating examples: attempt A for (c) and
attempt B for (d)'s tails (§12.2; bounded, derived.mjs; today refuses
both, run; relabelled in 3.5, §R6 S3-7).

**E2, consumption of a row s into a target ρ.** Sites: call, perform,
apply, pipe, over- and partial-application stages, callback, **`defer`
(d into the enclosing row)**, and settling's consumptions: **installed C
into ρ, deferred rows into their row** (FX008 §3.5 step (d)). Clause
rows into C, which today consumes at the literal and again at settling,
are E4's site with the full condition, Definition 4.2 included (3.5,
§R6 S2-1); E4's c_k into R and E5's R into ρ are E2 with marks
ignored. The installed-C site contributes only E2's per-key count and
Lend `assume`'s edge `mark(ρ partner) ⊑ mark(C label)` (no remainder;
N8). With s and ρ completed, the condition is: for each key κ, the r-th
occurrence of κ in s is matched with the r-th occurrence of κ in ρ, and
ρ has at least as many occurrences of κ as s (the side-condition, per
key); matched labels' arguments are equal (nested marks and nested
handler types included), except that C rows are bare and compare keys
only (T2-e).

Tails (restated in 3.4, K3 and K4; rigid case in 3.5). On a completed
package s's tail is closed (a hole settles to the closed row, §6) or a
rigid ϱ, never a flexible variable, and every label that s's tail
variable's binding holds is a label of the completed s, matched by the
rule above:
- if the completed s is closed, there is no tail condition: ρ's further
  labels and its tail are unconstrained (F7);
- if s ends in a rigid ϱ: **Definition 4.2** below (decided, §18.85).
  Revision 3.4's condition "ρ ends in ϱ" alone was withdrawn (§18.84)
  as unsound: with honest packages and no forgery it let a typed abort
  escape cleanup and a payload reach the wrong instance's frame (K1,
  §13b; simulated runs).

Revision 3.3's remainder clause ("s's tail variable's binding is ρ's
labels after the matched ones followed by ρ's tail") described how
today's checker builds the binding, an inference step, not a condition
on completed rows, and is dropped. Its copies are labels of the
completed s, matched with ρ's later occurrences by the per-key rule, so
each copy's edge `mark(ρ label) ⊑ mark(copy)` is a matched-pair edge
and its arguments are equal to its partner's, nested marks included. A
package that binds s's tail variable to fewer labels makes s smaller;
every other obligation that reads that variable judges the binding
(reasoned).

Labels-only sites (K3; clause rows into C removed in 3.5, S2-1).
`defer` (Defer.purs `checkDefer`) and settling's deferred-row
consumptions (SettleEntry.purs `deferralEntries`: a `Fresh` tail,
through Settle.purs `consume` and `consumeLabels`; the installed-C site
records marks only, `installed`, N8) consume a row's labels with one
fresh throwaway tail that is never joined to the target (Consume.purs
`consumeLabelsWith`: `Row spec.labels (Just (Hole state.next))`, "the
tail is never read, so no copy lands on it"; UnifyMark `stageLabel`
records no copy edge on the throwaway). At these sites s is the source
row's labels, closed: no tail condition, no copy. Today consumes clause
rows into C the same way (Clauses.purs `file` and SettleEntry
`clauseEntries` `toClauses`, through `consumeBare`), but a-min does not:
E4 applies Definition 4.2 there (the departure is recorded with it).
A closed source at an ordinary site is the same (Consume.purs `consume`
gives it a throwaway tail, "the one nobody reads"). Settling's
`Remainder` entries, which consume `labels + φ` as they stand, belong to
the excluded F1′ hook (§13, O7).

Marks. "Ignoring marks" (consumption into R: E4's c into R, E5's R into
ρ) ignores only each matched label's own top-level mark; arguments are
equal by E1, nested marks and nested handler types included (UnifyMark
`pairMarks`, `IgnoreMarks` case; copies keep their arguments,
`freshened`, Binding `extendRow`; O3, worded in 3.4). Mark edges,
unless the site ignores marks: each matched pair `mark(ρ occurrence) ⊑
mark(s occurrence)`. FX008's two other generators are instances of it
on completed rows (reasoned): a copy is an occurrence of the completed
s (`stageLabel`: `mark(ρ label) ⊑ mark(copy)`), and a label s adds to a
target's tail is an occurrence of the completed ρ (`targetLabel`:
`mark(added) ⊑ mark(s label)`). Refusals: EffectNotAllowed, MustBePure,
CallbackRowLacks, RowEquality (shared tail, `both end in`),
LabelMismatch, InfiniteType (RowOccurs).

**Definition 4.2 (rigid-tailed consumption; K1, adopted as a
conservative validator restriction, dossier §18.85 items 1, 2).** A
condition on completed rows at a consumption of s into ρ. When the
completed s ends in a rigid ϱ: ρ ends in ϱ, and for every key κ, ρ has
exactly as many occurrences of κ as s. So ρ is s's matched labels
followed by ϱ, and s ≡ ρ up to scoped order [L05] and top-level marks.
Each matched pair (the r-th κ of s with the r-th κ of ρ) keeps E2's
argument equality (nested marks and nested handler types included; at
a C row, bare, keys only, T2-e) and, unless the site ignores marks,
E2's directional edge mark(ρ occurrence) ⊑ mark(s occurrence). A closed
s is not constrained by this definition (E2's closed case, F7).

Sites (the list is kept here; each site refers to it): call, perform,
apply, pipe, over- and partial-application stages; callback (a call or
apply stage whose leftover target label Reject `rejected` reports
through Callback `callbackLacks` with CallbackParts' texts, FX017 and
FX018; §R6 S3-3); E4's c_k into R (marks ignored) and c_k into C (with
marks, bare; §R6 S2-1); E5's R into ρ (marks ignored); and E10, which
is these stage sites (§4 E10). Not at: `defer` and settling's deferred
rows (labels only, so s is closed); the installed-C site (no
consumption; its step is under E5, §R6 S3-4).

Standing: **decided** as a validator restriction. Its sufficiency is
**reasoned** site by site (§13b; §R6 found it closes p2, p4, p6, p7, p8
and p9 per declaration), not a substitution lemma for the whole
judgment; its necessity is scoped to FX008's positional invariant
(§13b, §R6 S3-2).

What a refusal means (§18.85 item 1). A candidate refused by Definition
4.2 is one the validator cannot certify. It does not mean the program
is invalid, and the restriction is not final language policy. Known
lost acceptances against E2 as written in 3.4, recorded as validator
limitations: s1 (research/amin-k1-probes/; safe in every run of its
hinted twin, which prints `1`, `2`); K1's `st` (p1); FX027's program
(BACKLOG FX027); p9 (a rigid clause row into a larger R; refused today,
its runs not examined). Against today: no additional refusal found on
those probes (observed) and by reasoning (§13b); this is not a general
compatibility result (§0d item 7).

Departure from today at c_k into C (recorded, §18.85 item 2). Today
consumes a clause row into C label by label: Clauses.purs `file` calls
Consume `consumeBare` with a fresh throwaway tail (`consumeLabelsWith`),
and settling repeats it (SettleEntry `clauseEntries` `toClauses`,
`Fresh`, `bare: true`). A rigid tail reaches C only through the tail
pass: TailPass `both` calls `ensure` on C, which binds C's end variable
to ϱ alone (`Loose meta → bind (Row [] (Just (Hole meta)))`) and asks
nothing of C's labels. Definition 4.2 instead asks C to be exactly
c_k's matched labels followed by ϱ. Reason: one definition of
rigid-tailed consumption, referenced at every site (§18.85 item 2).
With Definition 4.2 also at c_k into R and at E5, the two readings
seem to refuse the same programs (§R6 S2-1; reasoned, unrun).

**E3, opening at use** (handler types only; MarkUse `openHandlers`):
the opened handled label's mark is the `Opened` position; no
condition beyond E1's use of it.

**E4, handler literal** with clause rows c_k (bindings) and own-abort
mark m: each c_k is consumed into R ignoring marks and into C with
marks (E2's conditions; C bare); a c_k ending in a rigid ϱ is consumed
into R and into C under Definition 4.2, tail condition included (3.5,
§R6 S2-1); for each c_k holding a `Fail` label or ending in a rigid ϱ,
`M ⊑ m` (Frames `aborting`). Today's tail pass (TailPass `both`: R and
C end in ϱ) is implied by Definition 4.2 at these two sites.

**E4′, an owned C not from a literal** (N1; F3, F6 in 3.3). The
validator reads the C generation recorded (§2, "What generation
records") and derives nothing from checker state; I3 refuses a
package-supplied C, label or fixed mark at that site (design).
- A ResultC: labels exactly R's at the use, bare (`Fail` heads kept),
  in order and count; marks N, M or the use's `Instantiated` k; tail as
  recorded: R's tail variable (occurring in a parameter, in the
  callee's own row, or in the result type outside R's own tail
  position: L's arguments, Ls's label arguments and everything nested
  in them; rule H′, FX033), the use's own `⟨p, result clauses⟩` only
  when the variable occurs as R's tail alone, or closed when R is
  closed. That is what generation records, matching the live
  compiler's H′ (ResultClauses.purs).
  **Provisional restriction for shadow certification** (author,
  2026-10-25; §0e item 2; procedure fixed in §R7b): "always R's tail"
  forces the R-tail choice and then checks. A ResultC recorded with
  R's tail variable, or closed with R, is checked as recorded. For a
  ResultC recorded with the use's own `⟨p, result clauses⟩` (H′'s
  fresh case), the validator binds that variable to R's tail variable,
  both read from the record, and checks the resulting problem
  (Definition 4.1, E5) as for a recorded R tail. It certifies the use
  only when those constraints hold; otherwise it refuses the use as
  unsupported, which means it cannot certify the candidate, not that
  the program is invalid. A recorded fresh tail is therefore not
  refused by itself: r1, r2 and r9 have one and are kept (stand-in
  evidence, §0e item 2). Known losses: aroundBoth's `prefix()` and
  k2f (closure checklist A6); losses elsewhere in the corpus are
  unmeasured. What is certified is the forced typing; no claim
  relates it to the live compiler's H′ typing of the same use. This
  removes reliance on P4; O-SUB and A1 remain dependencies. The live
  compiler keeps H′ until a separate ruling. Refusing every recorded
  fresh tail would be a stricter restriction (it also loses r1, r2
  and r9, with further losses unmeasured); it is not the ruled one.
- An annotation C: labels exactly R's, bare; marks written or its own
  `Annotation` positions, distinct from R's; tail always its own
  `⟨p, annotation clauses i⟩`, whatever R's tail is (F6).

An owned C's own tail variable is constrained by Definition 4.1(d)
wherever its type meets another; a `Free` binding defaults to the
closed row (§6, the tail pass's closing). Reasoned: a larger C or a
rigid tail only adds E5's pairing, frame and per-key count constraints
and Definition 4.1's equalities, so no binding of such a tail is weaker
than the closed row. The ResultC tail rule is H′
(docs/plans/r0-amin-resultc-tail.md §5; implemented in the compiler as
the narrow FX033 repair, 2026-10-25). Whether H′ suffices rests on
RC′'s informal, unproved argument (§6 there: P4, O-SUB, A1): open
decision 3 (§14). The annotation tail follows FX008 §3.4 (a local annotation's C
"has a fresh tail meta", review M5).

**E5, installation `with h { body }`.** m and C are read from h's marked
type, wherever it comes from (an image, an instance, a literal; T3-c); C
is the owned C if h's type owns one, else R's bare alias (Install
`clausesOf`; T2-d; owned per E4′ or E4). Conditions: R is consumed into
ρ ignoring marks (Consume `consumeIgnoring`: E2 with marks ignored;
N4), under Definition 4.2 when R ends in a rigid ϱ, so inclusion (ρ
holding more effects than R) holds only for a closed R (3.5); C is
paired with ρ by key
and position (Lend `partners`), recording only mark edges (no
consumption, no arguments; T2-e); for every frame, Console included
(uniform accounting, §14 decision 1, ruled §18.86; today's Frames
`framed` skips an N frame, unreachable while FX011 holds): `m ⊑ f`,
each paired ρ label's mark `⊑ f`, and a rigid C tail gives `M ⊑ f`
and ρ ending in ϱ;
the body's ambient row is `f L + ρ`. Refusals: HandlerMayFail,
ExpectedHandler (h's head not a handler); the rigid-tail mismatch is
unreachable today (`Internal BodyState`, TailPass `installed`).

Installed C under Definition 4.2 (3.5, §R6 S3-4; reasoned). The
installed-C site has no tail condition of its own; its soundness rests
on R ≡ ρ, by this step. An owned C ends in a rigid ϱ that its clauses
reach only if some clause row c_k ends in ϱ (E4 consumes every c_k into
C). Definition 4.2 at c_k into R then makes R exactly c_k's matched
labels followed by ϱ, and at R into ρ makes ρ exactly R's matched
labels followed by ϱ: R ≡ ρ up to scoped order and top-level marks,
and the installed C, equal to c_k by Definition 4.2 at c_k into C, has
a partner in ρ for each occurrence. For a C not from a literal,
Definition 4.1(d) equates it, tail included, with the C of each owned
type it met, and R ≡ R′ ignoring marks carries the literal's R to the
installed one. An owned C whose tail a package sets to ϱ with no clause
row ending in ϱ (an annotation C's free tail, for one) only adds
FrameRigid's `M ⊑ f` and the condition that ρ end in ϱ: more refusal,
never more acceptance.

**E6, `defer e`** with row d (binding): no `Fail` label and no rigid
tail in d (DeferMayFail, DeferMayPerform); each non-`Fail` label's
mark `⊑ N` (Frames `demanded`; DeferHandlerMayFail,
DeferHandlerVariable); and d consumed into the enclosing row (E2).

**E7, a call's `nofail` assumption**: an instance of E2's matched-pair
edge (ExpectedNofail).

**E8, entry**: `main`'s completed row within `Console`
(UnhandledEffect).

**E9, Fail payloads**: each payload's head concrete after settling
(FailNeedsConcrete, Failure.purs:102).

**E10, the body's row within the declared row** (E2 with the declared
row as target; EffectNotAllowed, MustBePure). Settled by reading in 3.5
(§R6 S3-3; reasoned, at 0c2ad60, nothing run): E10 has no source of its
own, so it cannot have a rigid-tailed source distinct from its target
other than a stage's. A function body's ambient row is its declared row
(Function.purs `environment`, `current: row`, with `current` reading
the signature's row; `main`'s tail made flexible, `mainRow`), and every
stage in the body consumes directly into it, or into a row extending it
(Install.purs: `f L + ρ`; Handle.purs `withFailures`: `Fail(E…) + ρ`).
The other writers of the ambient row (Lambda.purs `checkLambda`, a
fresh row; Defer.purs, d; ClauseBody.purs `handlerClause`, the clause
row) give E11's other rows, consumed by E2, E4 or E6. EffectNotAllowed
and MustBePure come from those consumptions (Reject `rejected`) or from
an E1 row failure (Require `expectType`). So E10 is E2 at the stage
sites whose target is the declared row, and a rigid-tailed stage source
there is under Definition 4.2 at its own site.

**E11, ambient rows.** Generation records each body's ambient row: the
declared row; a lambda's `⟨p, effect⟩`; `f L + ρ` in a `with` body;
`Fail(E…) + ρ` in a `handle` body (Handle `withFailures`, T2-f); the
clause row in a clause; d in a deferred expression.

**E12, marks**: every edge E2-E6 generate, collected exhaustively from
those rows, holds by `holds` on normal forms (§5); every mark equality
of E1 holds by `norm` equality.

## 5. Mark correspondence (U1; universal argument plus bounded oracle)

**The check** (universal). `holds x y` on normal forms: `x = N`, or
`y = M`, or `x = J S`, `y = J T` with `S ⊆ T`. For two-point values
N ⊑ M and a valuation v of the rigid marks (`J S` read as the join of
v(S)), `holds x y` is true exactly when x ⊑ y for every v: N on the
left always holds; M on the left holds only against M (the all-N
valuation makes any `J T` N); `J S ⊑ N` with S non-empty fails (set
some k in S to M); `J S ⊑ J T` fails exactly when some k ∈ S \ T (set
that k to M, the rest to N). The author checked all 36 term pairs over
two rigid marks against all four valuations (bounded, run by the
author, 2026-10-24; reported in §18.78, not in the repository), which
found the un-normalized `J ∅ ⊑ N` gap that `norm` closes.

**Premises of the correspondence (T1-b; P2 restated in 3.2, N5;
standing corrected in 3.4).** P1: the package's obligation graph is
exactly FX008's edge set and mark equalities for the same program (U6,
§13). P2: every FX008 mark meta corresponds to exactly one equality
class of package positions (a meta shared between a site and an image
is two positions joined by a recorded E1). P3: written constants are
only N, M or a single rigid `J {k}` (Domain/Row.purs `Mark`).
Standing of P1 and P2 (3.4): **open**. Revision 3.3 rested both on
"every image copy arises from a recorded unification", which §13a
showed false (O1, O2). With O1 and O2 recorded and O6 stated (§4), P2
is **reasoned** for every path of §13a's table except O4's (§2,
"Copies through equations"). P1 is not "exactly" as things stand:
today imposes more than a-min at O5 (a postponed C pair retried with
argument unification) and O7 (today's c-into-R stage and the F1′
hook's closing), so on such programs a-min's graph is weaker than
today's and the shadow differential must report the difference; O4
and K1 (§13b) are open decisions that change the graph (3.5: decided,
rule J and Definition 4.2, §0d; P2 for O4's case is reasoned and rests
on U8, §11). The claim
below relates a package to the path criterion on one graph, the one
a-min records; that this graph is FX008's is P1.

**Claim (universal, given P1-P3).** Let classes be the equivalence
classes of positions and constants under E1's mark equalities and the
callee-k sharing (union-find). A package passing `holds` on every edge
and `norm` equality on every equation exists exactly when FX008's
step-5 path criterion accepts (no path from atom a to atom b with
a ≠ b, a not N, b not M, after equalities, a class holding two
different constants a clash, as UnifyMark `equateMarks` refuses).
- Package ⇒ FX008: each edge holds for every valuation, so for each
  valuation the classes have a two-point solution; FX008's criterion
  is satisfiability for every valuation (per-valuation satisfiability
  of atomic two-point constraints is exactly the absence of a path from
  a constant valued M to one valued N; over all valuations those are
  the forbidden pairs).
- FX008 ⇒ package: give each class its **least term**: a class holding
  a constant takes it (two different constants were refused); any other
  class takes M if M reaches it, otherwise the join of the rigid
  constants that reach it, N if none. Equalities hold by construction
  (one term per class). A class-to-class edge holds since reachability
  is transitive and a constant class's term is reached by what reaches
  it. An edge into a constant class N, M or `J {k}` holds because the
  corresponding forbidden paths (M→N, k→N, M→k, k′→k) are absent.

Mark.purs `violation` checks the same criterion without passing
through atoms; a path through an intermediate atom contains a
forbidden sub-path exactly when the whole is forbidden (review 3,
universal, confirmed by reading).

**Bounded oracle** (research/amin-mark-oracle/, `node run.mjs`,
2026-10-24): three verdicts (path criterion, brute-force semantics over
every valuation, least terms over classes) agree on every graph with
one flexible position (5,242,880 graphs, atom-to-atom edges included),
every graph with two flexible positions over the edges touching them
with none, one or two of the nine single equalities (12,058,624), and
200,000 seeded random graphs with three or four positions and up to
four equalities. `holds` against the meaning on all 36 term pairs over
two rigid marks (the author's check, now `pairs36`). Soundness of
`holds`, exhaustively on the two-position family with at most one
equality: on the 2,562,208 graphs whose meaning fails, 17,776,800 term
assignments tried and **none** passing; on the 59,232 whose meaning
holds, 573,280 tried and 93,696 passing. Two rigid marks, at most four
positions. `node mutants.mjs` detects three injected wrong
implementations (one ground valuation; no normalization; least terms
per position). Bounded evidence; P1 is not tested by it.

**Two solutions, kept apart.** The least terms are an honest
read-back's evidence and the argument's witness. FX008's step 6,
closing remaining metas to M, is display and erasure only and is never
evidence.

## 6. Holes (unchanged from revision 3)

One sort per hole number across the package; defaults are lowering's
(type Int, record tail none, effect tail the closed empty row);
settling replaces holes by defaults before G0 and before every
obligation; holes in label arguments and nested tails are judged at
their defaults (extends certify-argument C1-C2; U4).

## 7. Pipeline and routing

1. Source rule; 2. generation records atoms (row-free), obligations
E1-E12 with full marked sides and site keys, `rigidMarks`, arities,
effect rigids, ambient rows (E11), and `instances` and `annotations`
with their owned Cs (§2, 3.3); a construct whose obligation kind
the validator does not support (FX032's operation `with` rows) records
an `Unsupported` obligation; 3. the search proposes one package (the
online read-back: unstripped images, least mark terms, clause and
deferred row bindings, sites); 4. `certify`: (a) I3 (variable
restrictions, arities, one sort per hole, binding constructor matching
sort, Console N, the ownership table's single homes, domain exact),
(b) settle, G0 on `erase`, (c) `validateEffects` E1-E12; 5. routing;
6. `elaborate` (problem identity, seal, Cov), `build (strip P)`.

**Routing, pinned to the code (T5-a).**
- An `Unsupported` obligation is known from the problem before any
  search, so `decide`'s rule 1 blocks the declaration with
  `Unsupported (EffectsUnchecked kinds)`: a new `Unsupport`
  constructor, joining rule 1 as Decide.purs's header and
  r0-erased-rows §7.1 item 2 place it. As built (Decide.purs
  `untilVerdict = not blocked && (solved || refuted)`), a blocked
  declaration still runs every strategy and refuter; an acceptance is
  then suppressed by `solvedUnlessBlocked`, so the verdict is Unresolved
  (§7.1 item 3), never Solved (N3; documentation only, behaviour
  unchanged).
- A candidate that fails (a)-(c) is a `CheckRefusal`; Strategy.purs
  `checked` makes it a `CheckFailed` attempt with no solution, and
  `decide`'s rule 2 (`untilVerdict`) continues to the next strategy
  and to the refuters (review 3, universal, confirmed against
  Strategy.purs and Decide.purs). With every strategy refused, today's
  reading applies (Decide.Reading: a `ClaimsComplete` refusal is a
  `CandidateRefused` search fault, the reason `Inference
  NoAcceptedCertificate`).
- If a read-back cannot build a package, it returns `NoCandidate`,
  never `Inconsistent` (which stops the run; T5-b).
- Acceptance mints `Certified Valid (Witnessed (strip P))`.

## 7a. Trace: FX008's failing cleanup

FX008 §1's program: `fn work(): Unit with Log = { defer log(1); () };`
with `main` installing `handler Log { log(n) => fail(E) }` around
`work()`. Today FX008 refuses `work` (the design's motivating case;
bounded: pinned by the probes test/fx008-probes/rev6/hole.wxw,
facts/cross.wxw and design-review/c1.wxw, spelled `Log.log(1)`; N12).
Its mark graph is reproduced, with a control, in
research/amin-mark-oracle/cases.mjs.

1. Source: `defer log(1)` in a body whose declared row is plain `Log`
   (fixed M).
2. Recorded: E6 for the `defer` at variable d = `⟨p, effect⟩`; E2
   consuming d into the ambient row (the declared row `Log`, mark M).
3. Honest package: d = `Log` with mark x = M (the least term: M
   reaches x through the consumption edge).
4. Check: E6's demand `x ⊑ N` is `M ⊑ N`: false; refused
   (DeferHandlerMayFail's obligation). The honest candidate fails, as
   today.
5. Forged package: x = N. E6's demand `N ⊑ N` holds, but E2's edge
   `mark(ρ's Log) ⊑ x` is `M ⊑ N`: false; refused. Under revision 3,
   which lacked E2 at `defer`, this forged package passed (T2-a).

So `work` is never certified, honest or forged; `main` then fails
elsewhere or not at all, but no compiled `work` exists. Bounded check
before implementation: this program and the FX008 probes as forged-
package fixtures (§12).

## 8. Obligations kept apart (as revision 3)

Soundness: S1 G0 on `erase` (P-G0); S2 settle, `erase`, `strip`
against lowering (certify argument C1-C2, extended); S3 the validator
accepts only packages satisfying their obligations for every rigid
valuation (§5, universal for `holds`); S4 coverage (U6, §13); S5
coupling (obligations in the problem, one package, single homes, the
checked stripped projection). Acceptance preservation: A1 the honest
read-back passes for every declaration today accepts and the online
search solves (least terms supplied); A2 the solved-form restriction
rejects none of them; A3 U1 (§5); A4 RT8 and window moves explained.

## 9. Exclusions and unsupported (see §13 for each reason)

FX032 operation `with` rows: unsupported, rule-1 `EffectsUnchecked` in
shadow for a declaration with any perform form of such an operation in
its body, nested lambdas and clauses included (a qualified call, a
pipe, a partial application, the operation as a value; N11), live
unchanged (§18.78; `OperationInfo` gains the field
generation reads). F1′, correction S and termination T: excluded as
inference only (§13). Resolve-time refusals: precede generation.
Constructs behind `Outside` markers: specified, still blocked by G0's
markers today (every handler type, literal and `with` emits `Outside
HandlerType`, §2).

## 10. Interfaces (revision 3's, amended)

`Fields += { obligations ∷ Array Obligation, instances ∷ Map Site
MTy, annotations ∷ Map Site MTy, rigidMarks, arities, effectRigids,
ambient rows }`: `instances` holds each use's instantiated marked
signature, naming its `Instantiated` k by name, a top-level handler
result carrying the derived C; `annotations` holds each local
annotation's MTy with its owned Cs (§2; 3.3; approved for
specification, 3.4). `Obligation =
Equal MTy MTy | Consume { site, source ∷ Var, target ∷ RowRef, marks ∷
Bool, bare ∷ Bool } | HandlerLit … | Install … | Defer … | Entry … |
FailConcrete … | Unsupported Kind`; `SiteFact += Instantiated { marks
} | Annotation { marks }` (R's and each owned C's unwritten marks;
there is no `ResultC` site fact: the derived C is in `instances`, F2),
and `HandlerLit` and `Deferred` hold variable names only; `Unsupport +=
EffectsUnchecked (Array Kind)`; `CheckRefusal += Malformed |
ObligationFailed Obligation`.
Change surface (N11), from revision 3: Strategy.purs `checked` (unchanged shape:
`Certified` still carries `Valid` and `Compilation`); Decide.Reason
(maps `EffectsUnchecked` to its Unresolved reason); Witness.purs
`bindingsOf`, `sameSort`, `bareHole`; HoleContract.purs `image`;
Candidate.purs `generic`; the read-back; Generate's context and every
row-writing site (§3, review 2's N6 list: `⟨p, apply⟩`, a lambda's inner
stage rows, partial-application stages, plus review 1's I6 list); the
certify argument and `certifySound`'s statement.
Added in revision 3.1: Decide's rule 1 (the new `Unsupport`) and
Resolve/Effect.purs (`OperationInfo`'s field). Added in revision 3.3:
Generate/Callee.purs and the use rules (record `instances`, with the
derived C), generation's lambda-parameter rule (records
`annotations`), and Domain/Recorded/Internal.purs (`Fields`).

## 11. Unresolved claims

- U1: delivered (§5): universal argument under P1-P2, bounded oracle
  run. Open within it: P1, which is U6.
- U2. A1, the read-back's honest package for every accepted
  declaration, including least mark terms from today's mark graph.
- U3. A2, sufficiency of the solved-form restriction on the corpus.
- U4. Extension of certify-argument C1-C2 to effect rows, marks and
  label-argument holes.
- U5. E10: checking containment of the final restricted rows equals
  FX008's settling loop's acceptance ("accepts exactly when the
  containments and equalities have a finite solution", FX008 §3.5
  property 4), taken from FX008's stated property, not re-argued.
- U6: delivered as an argument (§13); its fixtures and mutants (§12)
  are unrun. The unifier entry-point audit (§13a, F5) is done (a
  reading audit) and refuted §2's copies claim as written; 3.4 records
  O1 and O2 and states O6 (§4). Open within it: O4 (a decision), O5 and
  O7 (correspondence: today stricter), K1 (§13b); P1 and P2 (§5) rest
  on these, and P2 is reasoned outside O4's case. (3.5: O4 and K1
  decided, rule J and Definition 4.2; O5 and O7 stay correspondence
  notes; P2 in O4's case rests on U8's extension to effect rows and
  marks, not built.)
- U7. Definition 4.1(c) as built (a written type's C is R, compared
  with marks) against FX008's design (a structural copy of R as C).
  **Own check after 3.4** (author's ruling §18.83 item 5):
  research/amin-mark-oracle/u7.mjs, grammar fixed before the first run
  (keys A, B, nullary labels; label multisets of size 0-2; marks N, M
  or a flexible position; tails closed, one rigid, or a flexible
  variable; written and owned sides; packages over N, M and four tail
  bindings). Standing, as the author worded it: correspondence of the
  as-built encoding with FX008's structural-copy encoding over this
  grammar, supported by two detected mutants; not independent
  confirmation that the underlying rule is sound. Over 197,676 pairs and
  4,327,668 pair-package evaluations, the as-built alias (rule J) agrees
  with the design everywhere;
  mutants (the alias ignoring marks; the alias dropping R's tail
  binding) are detected (bounded; 6.6 s, rerun by the controller). The
  agreement is close to definitional (the design's copy shares R's mark
  terms and tail), so the mutants carry the check's power; outside the
  grammar, label arguments with nested marks and `Fail` heads are
  unexamined. Rule K (O4) is wider than the design on 12,024 package
  evaluations, and 3,741 pairs differ in satisfiability, none of them
  with the annotation C's shape (C's keys R's, C's tail its own
  variable); 1,944 package evaluations with that shape do differ
  (corrected in 3.5, §R6 S3-1; `node u7.mjs` rerun 2026-10-24, exit 0,
  6.5 s). The ResultC shape in the occurs case (C's tail R's own
  variable) is outside the grammar. The label stays as narrow as
  §18.84 item 4 set it: correspondence with the chosen encoding (rule
  J, §18.85), supported by two detected mutants.
- U8. Solved form for bindings (§18.85 item 4). **Enforced since
  7476097 for today's type and record-row bindings; not yet for effect
  rows or marks, which a-min must add.** History (3.5): found not
  enforced, a gap in today's R0 certification, not only in a-min's
  plans. An
  independent read-only inspection (Opus, 2026-10-24) and one
  controller run. In the code an image is a binding's right-hand side
  (Domain/Verdict/Witness.purs: `Binding = Inline RTExpr | Free Int`;
  only `SortType` and `SortRow` exist, Domain/Recorded/Atom.purs).
  - Trusted certification does not check §18.76 item 2's restriction.
    Strategy/Candidate.purs `generic` refuses only an image that
    mentions a key of σ (`fits` checks the key's quantifier and sort);
    Witness `coverage` checks that every variable is bound, then the
    hole contract, which judges holes only (read; the controller
    re-read `generic`). So a binding may name a flexible variable σ
    leaves out, a made row (`entailed i`, Entailed/Mgu.purs R5), a rigid
    outside the declaration or at the wrong sort, or a hole at two
    sorts, and be certified.
  - The only detector is build's `ImageVariable`
    (Generate/Elab/Image.purs `imageType`): after the decision, a
    `Broken` fault, not a refusal, and only for variables `build` reads
    at a site, never auxiliaries; rigids pass unchecked.
  - Production read-back can plausibly produce such references through
    `mgu` completion (an auxiliary bound to an unbound auxiliary; a
    hole bound to an auxiliary and substituted back; R5's made rows)
    (inferred, not observed). A corpus count finds 0 of 14,867 `Inline`
    images naming a non-hole fresh variable, over Solved rows only
    (test/r0-elab-corpus.serial.test.mjs).
  - Run (controller, a scratch probe through `certify`, not committed):
    σ = {x ↦ y}, y unbound, gives Certified Valid, compilation
    Witnessed (the gap); with the equation x = y added, NoWitness
    HoleContract (an incidental refusal); control σ = {x ↦ Int},
    Witnessed. No existing test refuses such a binding.
  - Consequence for a-min: O4's K ⇒ J argument (§13a) has no
    enforcement point; rule J is chosen without it (§18.85 item 3).
    a-min's planned effect-row bindings would need the restriction for
    effect-row tails, rows nested in label arguments and arrows,
    data-type row arguments, `J S` marks (only `rigidMarks`), rigids at
    their sort, one sort per hole, every binding auxiliaries included.
  - **Implemented as a separate repair (dossier §18.86 item 3,
    2026-10-24)**: contract docs/plans/r0-u8-solved-form.md; check
    Strategy/Witness.purs `solvedForm`, inside `coverage` (so neither
    `substitutionWitness` nor Elaborate's re-check can offer a witness
    without it); refusal `NoWitness (UnsolvedImage v)`, Valid untouched;
    test/r0-u8-solved-form.test.mjs (every must-refuse fixture was
    Witnessed before and is refused now; honest controls stay
    Witnessed); the pinned corpus's witness counts unchanged (scratch
    probe); one reviewed pin line (`UnsolvedImage`,
    scripts/trusted-surface.json); full verify exit 0 (2900/2900
    parallel, 136/136 serial, 209/209 regression proofs). It does not
    cover effect rows or marks (absent today): a-min must extend it. It
    does not authorize a-min's broader implementation or the live
    switch.
  - The invariant as proposed before implementation:
    for every v in `bindings`, every variable of image(v) is a declared
    rigid (`rigidTy`/`rigidRow`) at the sort of its position, or
    `holeVar n` with n at one sort across the witness; must-refuse
    fixtures for an unbound flexible reference, a record tail naming
    one, a nested reference, an out-of-scope or wrong-sort rigid, and a
    made row, each with a positive control.
- Novel, for approval (ADR 014): I3; the ∅ default for effect-row
  holes; consumption-based inclusion (FX001/FX008's design, no
  published source); the mark-term evidence and §5's correspondence;
  H′ and its argument RC′ (derived, no published source; resultc-tail
  §5-§6).

## 12. Separating examples

Split in 3.3 (§R5 S3). §12.1's rows are reproduced as hand-translated
mark graphs in research/amin-mark-oracle/cases.mjs (the O1 and O2 rows,
added in 3.4, in equations.mjs, which cases.mjs runs) (bounded; `node
run.mjs`, output recorded in the oracle's README, 2026-10-24); they
judge a forged package's mark graph, not generation or derivation.
Every row of §12.2 is an unrun prediction. Any handler-type equality
an oracle case computes is meant to implement Definition 4.1 exactly;
attempts A and B, the derivation cases from recorded inputs, the
C-equality mutant and the rigid-tail replacement for the inclusion case
are in derived.mjs, handlers.mjs and mutants.mjs (§18.82 condition 5;
results in the oracle's README, rerun by the controller). In 3.5 the
N4 row flips to refused under Definition 4.2 (p1 separating); the
oracle's `inclusionN4` case followed E2 as written in 3.4, and no result
of its update is claimed here. The closed-R inclusion control is being
added by the oracle agent through the recorded-input builder (§18.85
item 5); its row below claims no result. (3.6: both reruns done, see
the paragraph after §12.1's limits.)

### 12.1 Reproduced in cases.mjs (bounded)

| Claim | Fixture | Fails under |
|---|---|---|
| E2 at `defer` (T2-a; cases.mjs "cleanup (§7a)") | FX008 §1's `work`, its deferred mark forged to N: refused by `M ⊑ N`; control (declared row `nofail Log`) accepted; the forgery passed under revision 3's obligations | E2 without `defer`'s site |
| owned C forged empty (N1; "owned C forged empty"; a graph) | graph: a handler with handled mark N and derived C [Log] installed under a plain `Log` row around `defer Ask.ask()`: honest refused (f = M), forged ResultC = ∅ with f = y = N refused because C's labels are derived ([Log]); control: the caller's row `nofail Log`, accepted; under revision 3.1's package-supplied C the forgery passed. Source (3.4, K2): `fn mk(): Handler(nofail Ask with Log + ...s) with pure = handler Ask { ask() => Log.log(1) }; fn use(): Unit with Log = with mk() { defer Ask.ask(); () };` (s occurs only in the result, so the ResultC's tail is the use's own, not the caller's rigid row); today: refused, "defer must not fail, but it performs Ask, whose handler may fail", related "this handler's clauses perform Log, whose handler may fail"; control `fn use(): Unit with nofail Log`: accepted (run, §R5b) | C supplied by the package |
| let-bound handler (N5; "let-bound failing handler") | `let h = handler Log { log(n) => fail(E) }; … with h { defer Log.log(1) }`: honest refused; h's image mark forged to N refused by the E1 joining it to `HandlerLit.m`; control: a clause that does not fail, accepted; without the E1 the forgery passed | images unlinked to site positions |
| inclusion with a rigid-tailed R (N4; "inclusion with extra effects"; flipped in 3.5) | `fn st(h: Handler(State(Int))): Int with Log = with h { State.get() }` (research/amin-k1-probes/p1-k1.wxw.txt): R ends in st's rigid ambient ϱ and ρ = `Log + ϱ` holds a `Log` R lacks, so Definition 4.2 at E5 refuses it (oracle, rerun by the controller: refused under Definition 4.2, accepted under the withdrawn rule; cases.mjs N4, bounded); today refuses it, E_EFFECT "st performs Log, which its signature does not allow" (run, §13b). p1 is the separating example | E2's rigid case as written in 3.4 ("ρ ends in ϱ") |
| inclusion with a closed R (N4, §R6 S2-2; added in 3.5 (oracle agent)) | a handler literal whose closed R the package chooses, installed under a row with an extra label (e.g. §R6 S2-2's `with handler State(Int) { get() => 1, put(v) => () } { Log.log(1); State.get() }` under `Log + ϱ`, R := ∅), built through the recorded-input obligation builder, not a hand-supplied completed graph (§18.85 item 5). Result (k1.mjs "closed-R inclusion (S2-2)", rerun by the controller): honest package (R, C, clause rows closed) accepted under Definition 4.2 and under the withdrawn rule; near miss R := `[] + ϱ` refused under Definition 4.2, accepted under the withdrawn rule (bounded). Today's compiler accepts the program and, run, prints `1`, `1`. Limit: the oracle compares C labels' arguments rather than keys only (no case depends on it) | R ≡ ρ (revision 3.1's equality) |
| O1 recorded (3.4; equations.mjs "O1 clause body against the operation result") | `effect Get(a) { fn get(): a; }; fn main(): Unit with Console = with handler Get(Handler(Log with Console)) { get() => handler Log { log(n) => Fail.fail(E) } } { with Get.get() { Log.log(1) } };`: the honest package (the literal's R and C hold `Fail(E)`, m = M) refused by the O1 equation (R ≡ `Console` closed) and accepted without it; a package hiding `Fail(E)` from R refused by E4 under both; control (`log(n) => Console.print(n)`) accepted. Today: refused, E_EFFECT "This function must be pure, but it performs Fail(E)"; control accepted (run) | no E1 at the clause body (revision 3.3) |
| O2 recorded (3.4; equations.mjs "O2 with node against its body") | `fn main(): Unit with Console = { let h0 = handler Tick { tick() => () }; let h = with h0 { handler Log { log(n) => Fail.fail(E) } }; with h { Log.log(1) } };`: honest refused (R's `Fail(E)` not in main's row), under both; the forged image (R and C closed, m N) refused by the O2 equation, accepted without it; control (`log(n) => Console.print(n)`) accepted. Today: refused, E_EFFECT "Unhandled Fail(E) in main"; control accepted (run) | no E1 at the `with` node (revision 3.3) |

Limits of these rows (§R5 S3): the N1 row is a graph; its 3.4 source
program is checked only by today's compiler, not translated from
`derivedC`. The O1 and O2 rows translate only the handler's rows and
marks (no `handle`, `h0` or perform-site obligations), with the image's
shape fixed by the translation. In the owned-C case the handled mark m
is an `Opened` meta at the use (MarkUse `openHandlers` opens an N
handled label in the result), not the constant N the case encodes; §R5
found the verdict unchanged. The owned-C case hard-codes the derived C,
so it shows the forged package unsatisfiable, not that derivation yields
that C. The inclusion case is a set comparison that does not exercise
E2's rigid-tail rule. (3.5: the oracle's README says `inclusionN4` now
consumes R through E5's rows; under Definition 4.2 its verdict is the
N4 row's, not yet rerun.)

**Reruns (3.6, controller, 2026-10-25; observed).** In
research/amin-mark-oracle at this branch: `node run.mjs` exit 0, "no
disagreement", printing `case inclusion with extra effects (N4):
{"honest":false,"honestEarlier":true}` (refused under Definition 4.2,
accepted under the withdrawn rule, as the N4 row says) and `case
closed-R inclusion (S2-2): {"honest":true,"honestEarlier":true,
"forged":false,"forgedEarlier":true}` (as the closed-R row says);
`node k1.mjs` exits 0 but prints nothing: k1.mjs is a case module, and
both lines above come from run.mjs (corrected, §R7 S3; the earlier
attribution was the controller's error). §18.85 item 7's two check
results are therefore in.

### 12.2 Unrun predictions

Revision 3's rows, with two corrections (the E4/E5 row's rule, and
the hole-identity row's "pinned", which read as if a test existed),
followed by the rows revision 3.1 adds and then those 3.3 adds:

| Claim | Fixture | Fails under |
|---|---|---|
| R026 | forged `id2`, full images | erase-only check of separate images |
| E1 (K2) | `effect Log { fn log(n: Int): Unit; }; fn f(h: Unit -> Unit with Log): Unit with pure = { let k = h; k(()) }`, the Apply row forged to `pure` | judging erased atoms only |
| E1 marks | test/fixtures/r0/audit/expected-nofail.inferred.json with honest bindings and every flexible mark chosen freely: refused; control .selected.json accepted | marks only at named variables |
| E4, E5 | handler-may-fail.inferred.json refused by E5's frame edges; its clause row's binding forged to `pure` refused by E2 at the clause's sites | clause rows outside the package |
| routing | two strategies on `fn run(f: Unit -> Unit with pure): Unit = f(()); fn g(): Unit = { let k = fn(u: Unit) => (); run(k) }`, the first forging the lambda's row to `Console`, the second honest: the second is used | a standing inside an accepted `Certified` |
| E2 payloads | `effect State(s) { fn get(): s; fn put(value: s): Unit; }; fn g(h: Unit -> Unit with State(Int)): Unit with State(Bool) = h(());` refused (LabelMismatch) | inclusion by key only |
| E1 order | `fn f(h: Unit -> Unit with State(Int) + State(Bool)): Unit -> Unit with State(Bool) + State(Int) = h;` refused | multiset row equality |
| E2 Fail | `Fail(Error(Int))` against `Fail(Error(Bool))` refused | comparing keys only |
| holes in labels | `fn id(x: a): a = x; fn g(h: Unit -> Unit with State(Bool)): Unit with State(Bool) = { let k = id(h); k(()) }`, `id`'s instance forged to `State(_h)`: refused at the default | holes unjudged in label arguments |
| nested tail | the same with `h: … with Log` and the image `Unit -> Unit with ...h4`: refused (∅ ≠ Log) | effect tails nested in images unjudged |
| hole identity | `fn g(): Unit = { let k = fn(u: Unit) => (); k(()) }`, the lambda row `Free 3`, the Apply row `Free 4`: both default to ∅, so predicted accepted | comparing holes syntactically |
| no Cov for marks | `let k = fn(h: Unit -> Unit with Log) => h(())` (a local-annotation mark): not `Uncovered` | marks as problem variables |
| domain exact | an extra mark for a nonexistent site; a missing frame mark: both `Malformed` | an open evidence domain |
| sites | an inner stage row of a two-parameter lambda; an Apply and a Pipe arrow; a partial call: one fixture each | review 1's site list alone |
| rigid marks (§5) | `fn h(g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log = { let r = fn(u: Unit) => g(u); r(()) }` with the lambda's flexible label mark forged to N: refused, since the edge `J {k} ⊑ N` is `{k} ⊆ ∅`, false, though it holds at k = N | checking one ground valuation |
| rigid marks, stronger | the same program with the lambda's mark `J {k}` (the least term): accepted; and `fn h(g: Unit -> Unit with nofail Log): Unit with nofail(k) Log = g(())`, a written edge `J {k} ⊑ N`, refused as FX008 refuses it (path k → N) | refusing every rigid-dependent package; accepting a contract valid only at k = N |
| normalization | the same edge with the context's mark spelled `J ∅` and spelled N: identical verdicts, and `J ∅ ⊑ N` holds | comparing un-normalized terms |
| FX032 | `effect Op { fn op(): Int with Log; }; fn g(): Int with Op = Op.op(); fn main(): Int = 0;`: R0 shadow verdict `EffectsUnchecked`, today's live outcome unchanged | dropping the `with` row at resolution |
| R031 | both pins flip to today's form | — |
| single homes (T3-b) | a package whose `HandlerLit` carries its own clause row besides the binding: `Malformed` | two homes for one meta |
| E1 marked sides (T3-a) | a forged N nested in an image equated with a written plain `Log`: refused | row-free equations |
| tail pass (T2-b) | a clause calling an ambient-row callback, its R forged to a closed row: refused | containment without tails |
| owned C (T2-d) | a written handler parameter type (not a lambda's annotation) with a forged C dropping a label: `Malformed` (C is R's bare alias) | C owned everywhere |
| annotation C forged empty (N1, N2) | (source replaced in 3.4, K2) `mk` as in §12.1's N1 row; `fn use(): Unit with Log + ...e = { let k = fn(h: Handler(nofail Ask with Log + ...e)) => with h { defer Ask.ask(); () }; k(mk()) };`: forged annotation C = ∅ refused (labels derived from the annotation). Today: refused, "defer must not fail, but it performs Ask, whose handler may fail", related "this handler's clauses perform Log, whose handler may fail"; control with `with nofail Log + ...e`: accepted (run, §R5b). The forged package's verdict is unrun | annotation C without a home |
| Console (T3-e, N10) | `fn g(h: Unit -> Unit with nofail(k) Console): Unit with Console = h(())`: Console recorded as N; a package giving it M is `Malformed` | Console marks as positions |
| bare C (T2-e) | famw: `Fail(Job)` in C against `Fail(Job(Int))` in ρ: accepted | comparing C's arguments |
| callee marks (T2-c) | two uses of one callee with different terms for its `k` across labels of one use: `Malformed` | marks only in images |
| `handle` ambient (T2-f) | a `fail(E)` in a `handle` body whose ambient row omits `Fail(E)`: refused | E11 without `handle` |
| routing | FX032's `Op.op()` call: rule-1 `Unsupported EffectsUnchecked`; strategies run, an acceptance is suppressed, never Solved | candidate-level `EffectsUnchecked` |
| routing | a failing first strategy and an honest second: Solved by the second | stopping at the first refusal |
| Definition 4.1(c), R with marks (F1; attempt A) | `fn f(h: Handler(nofail Ask with Log)): Unit with Log = with h { Ask.ask() }; fn g(h2: Handler(nofail Ask with nofail Log)): Unit with Log = f(h2);` with an honest package: refused (N against M on R, neither type owning a C); today's checker refuses it too (§R5's reading, not run); accepting it lets a caller of `g` install a handler whose clause defers `Log.log` under a failing `Log`. Bounded: derived.mjs "attempt A", honest refused, control accepted; today refuses it, E_TYPE (run, §13b) (relabelled in 3.5, §R6 S3-7) | E1 ignoring R's marks on every handler type (revision 3.2) |
| Definition 4.1(d), C ≡ C tails (F1; attempt B) | `let h = if b then mk() else g` with `mk(): Handler(nofail Ask with ...s)` and `g: Handler(nofail Ask with ...r)`, r rigid: the ResultC tail `⟨p, result clauses⟩` forged to ∅ is refused (∅ against g's alias tail r), so FrameRigid's `M ⊑ f` is kept. Bounded: derived.mjs "attempt B", the unbound ResultC tail refused, control accepted; today refuses it, DeferHandlerMayFail (run, §13b) (relabelled in 3.5, §R6 S3-7) | no C ≡ C |
| recorded ResultC (F2, F3) | `mk()` as in the owned-C row, a package carrying a C for the use's site: `Malformed` (no package slot; the C is in `instances`) | a package-side ResultC |
| annotation C below the top (F6) | `let k = fn(f: Unit -> Handler(nofail Ask with Log)) => with f(()) { defer Ask.ask() }`: the handler type in the arrow's result owns a recorded C; a package dropping its `Log` label: `Malformed` | C only for the outermost handler type |
| closed source (F7) | `fn g(h: Unit -> Unit with Log): Unit with Log + Ask = h(())`: accepted; no remainder condition, no copy edge for `Ask` | a remainder rule applied to closed sources |
| recording, generation side (F3) | one generation fixture per `ownClauses` tail case (occurs in a parameter; occurs in the callee's row; occurs in the result outside R's tail, as in FX033's x1 (H′, 2026-10-25); occurs only as R's tail; R closed): the recorded tail is R's variable, R's variable, R's variable, `⟨p, result clauses⟩`, closed | derivation reading checker state |

## 13. U6: coverage of generated obligations (argument)

For every rule of today's checker that can refuse a program for an
effect or a mark, after resolution, the obligation that records it, or
an exclusion with its reason. The rule list is the union of the audit
table's class-f effect refusals (findings.md), FX008 §3.4-3.5's
constraint generators, and the row-unification refusals reachable from
E1 and E2; review 3 checked it against the code (task 2). Rows that
compare two handler types refer to Definition 4.1 (§4) and to nothing
else. Which unifier entry points can reach these rules is §13a's
audit (done, a reading audit; O1 and O2 recorded in 3.4, §4).

| Rule (code) | Obligation |
|---|---|
| type unification of marked types (UnifyMark `equateMarks`, EqualMarks) | E1 |
| R into ρ ignoring marks (Consume `consumeIgnoring`: inclusion; a closed R gets a throwaway tail) | E2 with marks ignored; E5 (N4); Definition 4.2 when R ends in a rigid ϱ (3.5) |
| two handler types: effect and arguments (Unify `unifyHeads`, `THandler` case, `unifyPair`) | E1, Definition 4.1(a) |
| handled marks by equality (UnifyParts `handledMarks`, UnifyMark `equateMarks`) | Definition 4.1(b) |
| R ≡ R: with marks when neither side owns a C, else ignoring marks (Unify `unifyInference`, UnifyRow `unifyRows`, `unifyRowsIgnoring`) | Definition 4.1(c), (d) |
| C ≡ C when either side owns a C, R standing in for a side without one: marks, tails, `Fail` heads, no other arguments (UnifyParts `unifyClauses`, Domain/Row `clauseRow`, UnifyRow `ignoringArguments`) | Definition 4.1(d) |
| installation's edge ρ partner ⊑ C label (Lend `assume`) | E2 (installed-C site; N8) |
| consumption: first occurrence, payloads, ρ ⊑ s, copies, extension t (UnifyMark `pairMarks`, `stageLabel`, `targetLabel`) | E2 |
| `defer` consumes d into the current row (Defer `checkDefer`, `ignoreMarks: false`) | E2 (site `defer`) |
| settling step (d): clause rows into C, installed C into ρ, deferred rows (Settle) | clause rows into C: E4, Definition 4.2 for a rigid c (3.5, S2-1); the others: E2 (settling sites) |
| side-condition per-key cycle test (§3.5 (c), SyncCycle, F2) | E2's per-key count on final rows |
| opening at use (MarkUse `openHandlers`) | E3 |
| local-annotation fresh marks and C for every handler type not inside another's rows (MarkUse `freshType`, `handlerRows`) | E1 with `Annotation` positions; the annotation C recorded by generation (`annotations`), read by E4′ (N1, N2, F6) |
| a handler literal's type copied into images (unification) | E1 at the literal's node and at each recorded unification (N5), including O1 (clause body, ClauseBody.purs:52) and O2 (`with` node, Install.purs:73), added in 3.4 (§4); records with several tails by O6's proposed definition; reasoned from §13a, open for O4's case (§2; 3.5: O4 decided as rule J, its case reasoned, resting on U8) |
| handler literal: c into R and C, C ⊑ c (Clauses `consumeBare`) | E4; Definition 4.2 for a rigid c, a departure from today's label-by-label c into C (3.5) |
| own abort (Frames `aborting`) | E4 |
| clause tail pass (TailPass) | E4 (implied by Definition 4.2 at c into R and C, 3.5) |
| owned C at a use (ResultClauses `ownClauses`); C = R's alias elsewhere (Install `clausesOf`) | §2 (recorded by generation in `instances`), E4′, E5, I3 |
| frame marks (Frames `framed`: FrameOwn, FrameOuter, FrameRigid) | E5 |
| installation pairing (Lend `partners`) | E5 |
| ExpectedHandler (Handler `withHandler`) | E5 |
| defer absence and demand (Defer `judge`, Frames `demanded`) | E6 |
| ExpectedNofail (MarkReport) | E7 |
| UnhandledEffect (Entry) | E8 |
| FailNeedsConcrete (Failure.purs:102) | E9 |
| EffectNotAllowed, MustBePure (Reject, Require) | E2, E10 (E10 is E2 at the stage sites targeting the declared row, §4) |
| CallbackRowLacks (CallbackParts) | E2; Definition 4.2 for a rigid-tailed stage (3.5, S3-3) |
| RowEquality (Argument, RowName) | E2 |
| LabelMismatch (Reject `RowPayload`), RowOccurs | E1, E2 |
| `handle` ambient (Handle `withFailures`) | E11 |
| step-5 mark check (Mark `violation`) | E12, §5 |

Exclusions, each with why it is safe or what it limits:
- **F1′ hook, correction S, termination T** (FX008 §3.4-3.5): they
  decide type solutions and acceptance order, not mark soundness (C,
  the frame edges and the tail pass carry soundness, FX008 §3.4). Safe
  for soundness, since a package is judged on its completed rows;
  limits correspondence: R0 may accept a program today rejects (FX008's
  gain1.wxw is such a case for revision 10 itself), which the shadow
  differential must report rather than count as agreement. Restated in
  3.5 (§R6 S3-5): for the hook, "safe for soundness" rests on
  Definition 4.2 at c_k into R and C. Today TailPass `ensure`
  constrains only R's and C's end variables, so what refuses p8 and p9
  today is plausibly the hook closing φ (Filing.purs:87, `closeTail`;
  O7), which carried the obligation that E2 as written in 3.4 lacked
  (reasoned from reading, not instrumented). With Definition 4.2 in
  the validator, excluding the hook loses no soundness obligation found
  so far (reasoned).
- **Step 6, closing metas to M**: display and erasure only (§5).
- **Resolve-time refusals** (FailNeedsConcrete at Resolve/Row.purs:82,
  NofailOnFail, MarkVariableOutsideSignature, HandlerMissing,
  HandlerDuplicate, HandlerOperation, RecordRowAsEffect,
  EffectRowAsRecord, RowSort): they precede generation, so no package
  exists for those programs.
- **InBothRows** (Lacked.purs): record disjointness, judged by G0's
  atoms, not an effect rule.
- **FX032** (operation `with` rows): unsupported, so it limits support
  (rule-1 `EffectsUnchecked`), never soundness.
- **Console frames**: not excluded (§R7 fix pass, S2-1). The validator
  generates frame edges for Console frames as for any frame (§14
  decision 1, ruled §18.86); today's Frames `framed` guard is a
  departure the validator does not reproduce. Unreachable while FX011
  stands. With the guard gone, the "Console labels N" row makes a
  Console frame's f equal to N, so once FX011 is lifted every failing
  user Console handler would be refused: conservative, and that row
  must be revisited with FX011.

Tests of this mapping (unrun; listed in §12 and revision 3's I10): one
forged-package fixture per refusal kind; one mutation per row of this
table that drops its obligation and flips a fixture.

## 13a. Unifier entry points (F5)

Done for §18.82 condition 4: an independent read-only audit (Opus, at
0c2ad60; nothing run by it), whose three headline programs the
controller then ran through today's checker (`waxwing emit`, at
0c2ad60's build). Every substitution writer was traced (Binding.purs
`bindType`, `bindTail`, `extendRow`; RecordTail.purs; MarkStore
`bindMark` through `equateMarks`); each caller is mapped below.
Standing: **reasoned** by reading, except where a run is named. The
search covered src/Features/Check outside Refute/, Strategy/, Decide*
and Entailed* (the G0 path, which unifies unmarked atoms and writes no
handler rows); the patterns are in the audit's report, not repeated.

**Result: §2's copies claim is false as written.** Two checker paths
put handler types into images with no recorded equation (O1, O2), and
four points of wording or definition differ from the code (O3-O6).
(Revision 3.4, on the author's rulings: O1 and O2 recorded and O6
stated in §4, O3 worded in §4; §2's claim corrected; O4, O5, O7 open.
The table keeps the audit's findings as found at 0c2ad60.)

| Entry point (code) | What it unifies or copies | Obligation |
|---|---|---|
| `unify` and every `require`/`expectType` caller (Apply `applyNext`, `applyValue`, `bindArrow`; Call `supplied`; Infer comparison, `if`, arithmetic; Arms; Match; RecordPattern; PatternRow; Handle; Function; Record; Extension; Defer; Failure `familyFixed`) | full types, Definition 4.1 for handler types | E1, at the rule where G0 records a `GenEqual` |
| ClauseBody.purs:52 (`require` of the clause body against the operation result instantiated by the handled label's arguments, rows closed) | e.g. a handler literal ≡ a written `Handler(Log with Console)` | **none: O1** (recorded in 3.4, §4) |
| Install.purs:73 (the `with` node's type is the body's type, by reference) | the body's type term, handler types included | **none: O2** (G0 gives a fresh `⟨p, res⟩`, Generate/Effect.purs E21: "no equation through the handler"; recorded in 3.4, §4) |
| `reexamine` = `improve unifyPlain`; RowMerge Cases `oriented`, `subtracted`, `moved` | records with several tails; field terms copied by reference | E1 only if E1 defines several-tailed record equality: **O6** (defined in 3.4, §4; proposed) |
| `unifyRecord`, RecordTail `bindTail`, `shareTails` | fields by label | E1 (records) |
| `settleRows` (Unify.purs:85-101, via Failure.purs `settleKeys`) | postponed row pairs, retried with full `unify` in their stored mode | by the pair's origin; a postponed C pair: **O5** |
| `consumeAt`, `consumeVia` (call, apply, pipe, perform, `fail`, `print`) | Directional; copies get a fresh top-level mark, arguments shared | E2 |
| `consumeLabels` (Defer; Settle deferred rows) | Directional, throwaway tail | E2 (`defer`, settling) |
| `consumeBare` (Clauses; Settle c into C) | Directional, `ignoringArguments` | E4; E2 settling; postponement **O5** |
| `consumeIgnoring` at `with` (Install.purs:60) | R into ρ, top-level marks ignored, arguments unified | E5 |
| `consumeIgnoring`, `consumeRelayed`, `closeTail` in the F1′ hook (Sync, Settle, Filing) | `labels(c) + φ` into R; closing φ closes R | excluded (§13); its effect on R is E4's c into R; stricter than a-min (correspondence only, O7) |
| TailPass `ensure`, `closeTail` | R or C tail to a rigid, or closed | E4 tail pass; E4′ closing |
| `Lend.assume`; Frames `markConstraints` | mark edges only | E2 installed-C site; E4-E6 |
| `handledMarks`, `unifyClauses` | Definition 4.1 (b), (d) | E1 via Definition 4.1; the alias: **O4** |
| `let`, locals, pattern binders, lambda and clause parameters (Block, Infer, Match, ClauseBody, Lambda) | the same type term, no unification | none needed: the image is the same variable (confirms §R5: `let h` shares the literal node's variable) |
| `handle`, `if`, `match` node types | the first part's term | E1 (G0 records the equations) |
| instantiation, `openHandlers`, `ownClauses`, `localMarks`, the literal, installation's `clausesOf` | construction of positions | §2 table, E3, E4′, `Equal` at the literal, E5 |
| diagnostic-only: Argument `sharedTail`; ArgumentRow `short`, `writes`; the Require hint; SettleChange `retry`; End `stillWaits`, EndReport; RowEntry (test entry only) | results discarded | none needed |
| `Lend.lend` | — | dead code: no caller in src |

**Open obligations.**
- **O1 (S1 for a-min, not for today's checker). Clause body against the
  operation result.** `effect Get(a) { fn get(): a; }` with a clause
  `get() => handler Log { log(n) => Fail.fail(E) }` under
  `Get(Handler(Log with Console))`, its result installed around
  `Log.log(1)`. Run (controller, `waxwing emit`): refused today, E_EFFECT
  "This function must be pure, but it performs Fail(E)" at the clause.
  Without an E1 here the literal's R, C and m are unconstrained against
  the written type that installation reads, so an honest package for
  the clause passes (reasoned). Same shape: test/fx008-probes/rev7/
  late1.wxw, rev8/one3.wxw. Proposed repair: generation records E1
  between the clause body's type and the instantiated operation result
  (with rows closed, as ClauseBody `instantiateType` does). **Recorded
  in 3.4** (decided; §4 "Where E1 is recorded"); equations.mjs's O1
  case and control (§12.1; bounded).
- **O2 (S1 for a-min). The `with` node's type.** `let h = with h0 {
  handler Log { log(n) => Fail.fail(E) } }; with h { Log.log(1) }`. Run:
  refused today, E_EFFECT "Unhandled Fail(E) in main". A forged image
  for the node's fresh variable (R closed, C ∅, m N) would be read by
  the enclosing installation, which E5 permits (reasoned). Proposed
  repair: E1 between the `with` node's variable and the body's type.
  **Recorded in 3.4** (decided; §4); equations.mjs's O2 case and
  control (§12.1; bounded).
- **O3 (wording). "Up to marks" is top-level only.** A consumption copy
  keeps its arguments, so nested marks and nested handler types are
  shared with the source (UnifyMark `freshened`, Binding `extendRow`);
  Definition 4.1 (d)'s "marks ignored" on R likewise ignores only R's
  labels' own marks, arguments being unified with marks (Unify.purs
  `unifyInference`, `unifyAt (level + 1)`). E2's copy condition and
  Definition 4.1 (d) must say so. **Worded in 3.4** (§4: E2's
  "Marks" paragraph, Definition 4.1(d)).
- **O4 (decision). The alias is R itself, not a copy.** When one side
  owns a C and the other does not, `unifyClauses` unifies the owned C
  with the other side's R, so unmatched own-C labels extend R's tail as
  bare labels (`present` zips arguments without an arity check,
  UnifyRow.purs:159). Definition 4.1 (d)'s "R's bare alias with R's
  positions" leaves open whether such labels join R. The audit predicted
  an unsound acceptance today (a clause performing `Cell.put(n)` with
  `n: Int` under `Cell(Bool)`, through `run(h: Handler(Log with ...e))`);
  run (controller): **refused today**, E_TYPE "Expected Cell(Bool),
  found Cell(Int)". So no checker defect is shown by that program; the
  definition must still choose (labels join R, or the alias is a copy)
  and keep a separating example.

  **The two candidate rules (after 3.4; author's ruling §18.83 item 3,
  no ruling yet).** Setting: T_O owns C; T_W owns none, its completed
  R_W = L_W + τ, τ closed or rigid. Both keep (a), (b) and R_O ≡ R_W
  ignoring top-level marks.
  - **Rule J (join; today's `clauseRow`).** The alias is R_W itself: C ≡
    bare(R_W) with marks, keys only, per-key counts equal, tails equal.
    A C label beyond R_W's recorded labels must be in the package's
    binding of R_W's flexible tail, hence in R_O through R ≡ R.
  - **Rule K (copy).** The alias is a separate bare copy with R_W's mark
    positions and a tail variable of its own ending at τ: every R_W
    occurrence pairs with C's occurrence of the same key and rank,
    marks equal; C ends at τ; C's further labels are free and do not
    enter R_W. If the copy shared R_W's tail *variable*, K would equal J
    on completed rows; Definition 4.1 (d)'s "with R's tail" must say
    which is meant (wording finding; resolved in 3.5: (d) says R's own
    tail variable, rule J).
  - Relation (reasoned): J implies K for every package. K implies J for
    satisfiability on recorded problems: shrinking every owned C in a
    connected component to its first count_R(κ) occurrences per key
    removes only equalities, frame edges and count demands, since E4
    pairs each clause label with C's first occurrences and E4′ records
    a C with exactly R's labels. Caveat: assumes C's own tail variable
    occurs in no row outside its C-class (true for `⟨p, result
    clauses⟩` and `⟨p, annotation clauses i⟩`; unchecked for a
    literal's C binding). In the occurs case a ResultC's tail is R's
    own variable, which occurs outside the C-class by definition;
    harmless, since that C's counts then equal R's (added in 3.5, §R6
    S3-6). Standing (3.5): this equivalence is **unestablished**. Its
    weakest step is the solved form for bindings: shrinking needs a C
    binding to reference no other flexible variable, which §2 states for
    image variables only (§R6; U8, §11: enforced since 7476097 for
    today's type and record-row bindings, not for effect rows or
    marks, which a-min must add).
  - **Ruling (3.5; decided, §18.85 item 3): rule J** for the reference
    specification (Definition 4.1(d)). Rule K is kept as an alternative
    whose equivalence with J on recorded problems remains unestablished;
    the choice does not rest on it.
  - Against Definition 4.1's argument (FX008 §5 point 1): J is direct
    (installation's alias equals the C of every owned type the value
    met, so it over-approximates what the clauses perform); K is safe
    too, but only through E4's c-into-R per-key count with R ≡ R. R's
    marks are dead under both; both read R_W's marks through the alias.
  - No separating program found. Bounded: u7.mjs (§11 U7) finds 3,741
    pairs whose satisfiability differs between K and the design, none
    with the annotation C's shape, though 1,944 package evaluations with
    that shape differ (worded in 3.5, §R6 S3-1). One
    program run, neutral between J and K: a ResultC stored in a written
    data field and installed around a `defer` under a failing `Log` is
    refused today (E_EFFECT "Expected nofail Log, found Log"), its
    control accepted; it shows the alias's marks are live today.
- **O5 (correspondence). A postponed C pair is retried with argument
  unification.** A stored pair keeps its mode but not its unifier
  (Subst.purs, `postponed`), and `settleRows` retries with `unify`, so a
  C ≡ C or `consumeBare` pair postponed on an unknown `Fail` head later
  unifies arguments. a-min compares C by keys only, so it may accept a
  program today refuses (not unsound; reported by the shadow
  differential). No example constructed.
- **O6 (definition). Records with several tails.** RowMerge copies field
  terms, handler types included, into result records by reference; E1
  covers them only once §4 defines equality for several-tailed records
  (disjoint union of images). **Defined in 3.4** (§4, "Records with
  several tails"; proposed). Standing corrected (§R7 S2-2): testable
  for rigid tails, where E1 between two-rigid-tail records is
  constructible today (research/amin-o6-probes: o6g, o6h accepted;
  o6i, a missing tail, and o6j, a field's handled mark, refused;
  observed, supporting evidence only); flexible-tail unfolding through
  calls is not constructible (o6d-o6f, o6k: "Cannot tell whether …").
  Oracle cases for o6g-o6j are owed, not built.
- **O7 (correspondence).** Today's c-into-R stage is `labels(c) + φ`
  and settling stages use throwaway tails; E4/E2 with s = c_k would ask
  c_k's tail to equal R's remainder, which the checker never imposes.
  Filing.purs closes φ, and so R, more strictly than a-min.

Consequences (as written for 3.3): §2's copies claim and P1 (§5)
stand only once O1 and O2 are recorded and O6 is defined; O4 needs the
author's choice; O3 is a wording fix to E2 and Definition 4.1. These
are additions of E1 sites and definitions within the representation,
not changes to it (the stop rule does not apply). In 3.4 they are
written into §4 (O1, O2 decided; O6 proposed; O3 worded); O4 stays
open (§13b's K1 likewise), O5 and O7 stay correspondence notes, and
§2's claim and P1, P2 carry the standing §2 and §5 now state. In 3.5,
O4 is decided (rule J) and K1 adopted (Definition 4.2), §0d.

## 13b. Conflicts found while building 3.3's oracle cases

The oracle agent and the controller ran the §12 programs through
today's checker (`waxwing emit`, 0c2ad60's build; scratch files, not
fixtures). Under §18.81 each conflict keeps its example and goes to the
author; none is resolved here.

- **K1 (decision; soundness candidate). Inclusion with a rigid-tailed
  source.** §12.1's N4 row predicts `fn st(h: Handler(State(Int))): Int
  with Log = with h { State.get() }` accepted; today refuses it, E_EFFECT
  "st performs Log, which its signature does not allow" (run twice,
  2026-10-24). R ends in st's rigid ambient ϱ, and today a rigid-tailed
  source cannot absorb ρ's extra labels: the remainder must be empty.
  E2 as written ("if s ends in a rigid ϱ, ρ ends in ϱ") drops that, so
  a-min accepts more than today. Reasoned argument that today's rule is
  soundness, not compatibility: with s = `ϱ` and ρ = `Log + ϱ`, the
  stage may perform any operation in ϱ; if ϱ is instantiated with a row
  holding `Log`, scoped-label dispatch sends that operation to ρ's first
  `Log`, which is not the handler ϱ's own `Log` names (Leijen 2005's
  shadowing, [L17] adapted). Unchecked; the same shape for an ordinary
  call stage would make E2's inclusion unsound, not only imprecise.
  Proposed: E2's rigid case requires ρ's labels after the matched ones
  to be empty (ρ = matched labels + ϱ), with the N4 program as the
  separating example. The oracle's N4 case follows the statements and
  so still reports accepted.

  **Investigated after 3.4 (author's ruling, dossier §18.83 item 2): E2
  as written is unsound; the condition is withdrawn (§18.84).** Two
  kinds of evidence, kept apart: **observed** (the Waxwing compiler's
  verdicts on p1-p9, c1-c4, s1, s1h, and the controls' runs) shows only
  what today's checker accepts and refuses, all probes refused; it
  shows no unsafe run, since none of these programs compiles today.
  **Simulated** (patched Go, sim4, sim6, sim7) shows what the run would
  be if a validator accepted them, which rests on rows and marks being
  erased before Go generation (so the accepted twin's Go with handlers
  swapped is that program's Go). The unsoundness claim rests on the
  simulations plus that erasure premise, not on a compiled program.
  An independent agent (Opus) traced it; the controller reran the key
  evidence. Programs, outputs and simulations
  are kept in research/amin-k1-probes/ (README there).
  - Semantics (read). Dispatch is by effect key alone, innermost frame
    first (Format/Go/Context.purs `waxwingFind`); instances of one
    effect share a runtime key, each with its own Go layout
    (Go/Effect.purs `perform` asserts it, "unreachable when well typed,
    by the first-occurrence rule"); rows are erased before Go. A row
    `l1 + … + ϱ` describes the frame stack by position, the k-th κ
    occurrence being the k-th κ frame (FX008 §3.1's invariant, on which
    [FX008-5] point 2 relies). E2-as-written types a computation of row
    ϱ under ρ = X + ϱ; if a caller instantiates ϱ with a label whose key
    occurs in X, the operation reaches X's frame while every static fact
    (payload, mark edge) was checked against ϱ's. The judgment is not
    stable under substitution: `ϱ ⊑ X + ϱ` holds, its instance `Y + τ ⊑
    X + Y + τ` misaligns Y's κ with X's.
  - Abort safety broken (p7). `fn a(q: Int -> Int with ...e, x: Int):
    Int with Log + ...e = q(x)`, called under an outer printing `Log`
    and an inner failing `Log` with `fn(y) => { defer Log.log(7); y }`,
    inside a `handle`. E2-as-written accepts an honest package: the
    callee has no matched pairs, copies or edges, and the caller's copy
    edge (outer `Log`, N) holds. Today refuses it (run: E_EFFECT, the
    FX017 diagnostic; the hinted twin is refused by the `defer` rule).
    Its run (simulated: the Go of the accepted control c3 with only the
    two handler literals swapped, the diff checked; rows are erased, so
    this is the Go a-min would compile): stderr `fail(E): E`, exit 1;
    the deferred `Log` reaches the failing frame and the typed abort
    escapes cleanup. Rerun by the controller.
  - Payload safety broken (p6, p2). An `Out(Text)` operation reaches an
    `Out(Int)` frame; simulated run: Go `panic: interface conversion`.
    Rerun by the controller.
  - The same hole at installation (p2, p4: K1 itself, BACKLOG FX027) and
    at clause rows into R and C (p8, p9). Every probe is refused today;
    controls c1-c4 accepted (run).
  - Not deliberate dynamic dispatch: with the equal-row form (FX017's
    hint) the types assign the inner frame and the run agrees (c2).
    E15 in research/effect-kinds/probes/ shows the documented dynamic
    behaviour, which is a different question.
  - Proposed premise (for the author; reasoned, not proved): if s ends
    in a rigid ϱ, ρ ends in ϱ and has exactly as many occurrences of
    every key as s (ρ = matched labels + ϱ). Applies at call, apply,
    pipe and stage sites, E4's c_k into R and into C, and E5's R into
    ρ; the installed-C site is unchanged (its soundness then rests on
    R ≡ ρ). Sufficiency: a key matched in s reaches ρ's first κ, paired
    with s's first; a key reached only through ϱ finds no X frames.
    Necessity: without lacks constraints or masking, any non-empty X
    gives a counterexample like p2, p4, p6, p7. No carve-out for
    argument-free, N-marked X is proposed (it would be invented and
    breaks FX008's positional invariant). (3.5: the site list gains
    callback, a call or apply stage, and E10, which is the stage sites,
    §R6 S3-3; the installed-C step is written under E5, §4, §R6 S3-4.)
  - Necessity, scoped in 3.5 (§R6 S3-2). The claim is necessity for
    FX008's positional invariant (the k-th κ occurrence of a row is the
    k-th κ frame, §3.1), which any non-empty X breaks under some
    instantiation of ϱ. It is not claimed for §14's two guarantees
    alone: an X that is argument-free and N for every valuation, or
    Console only, misroutes harmlessly for effect and abort safety (no
    payload layout to mismatch, no typed abort to escape). The carve-out
    for such X is rejected because it breaks the invariant that
    [FX008-5] point 2 relies on and would be invented machinery (ADR
    014), not because the guarantees fail.
  - Relation to today: the premise matches today's verdict on every
    probe (observed, not proved). FX017, FX018 (a) and FX027 are
    diagnostics of this one rule (BACKLOG FX017: "diagnostic only").
  - Completeness cost: none against today observed. Against
    E2-as-written it refuses programs safe in every run, e.g. s1, a
    callee `Log + ...e` given `fn(y) => y + 1` under one `Log` (run:
    refused today, FX017; the hinted twin prints `1`, `2`), K1's `st`,
    the FX027 program. The workaround is FX017's hint (friction FX028).
    Sound relaxations exist only as language features: lacks
    constraints on ϱ (Gaster and Jones 1996), or masking that skips a
    frame (Biernacki et al. POPL 2018; Leijen's `inject`, POPL 2017;
    Koka's `mask`); citations from memory, unverified. This bears on
    BACKLOG FX007: callback-row subsumption is unsound without one.
  - If adopted: §12.1's N4 row and the oracle's N4 case flip to refused
    (p1 separating), §14's rigid-remainder row is restated, and p2, p4,
    p6, p7 with their simulations become separating examples. None of
    this is done before the author rules.

  **Adopted in 3.5 (decided, §18.85 items 1, 2)** as a conservative
  validator restriction: Definition 4.2 (§4), one definition referenced
  from every site, clause rows into C included with the tail condition
  (S2-1). Done: §12.1's N4 row flipped (p1 separating; the oracle's
  case is not rerun here); §14's rigid-remainder row replaced by
  Definition 4.2, citing p2, p4, p6, p7 and their simulations as its
  separating examples (no oracle case built for them). A refusal means
  the validator cannot certify the candidate, not that the program is
  invalid or that this is final language policy; s1, `st` (p1), FX027's
  program and p9 are validator limitations (§4).

  Qualifications (§18.85 item 6). "No additional refusal found" against
  today rests on these probes (observed) and on reasoning (§R6:
  today's rigid-stage consumption fails on leftover target entries,
  UnifyRow.purs:180-194), not on a general compatibility result. A
  ResultC's own tail remains unexamined (open decision 3, §14). E10 is
  settled only by reading (§4 E10; reasoned, nothing run). Adopting K1
  closes neither a ResultC's tail nor the question of the whole
  judgment's soundness: the sufficiency argument checks each site
  separately and is not a substitution lemma (§R6).
- **K2 (example repair). The N1 program texts are refused today for a
  reason unrelated to C.** `fn mk(): Handler(nofail Ask with Log)` has
  R = `Log + ϱ_mk`, ϱ_mk occurring in mk's own row, so by `ownClauses`
  the ResultC's tail is R's variable and binds to the caller's rigid
  ambient (FrameRigid); the control with `nofail Log` is refused the
  same way (run). The owned-C cases hold as graphs only; §12.1's N1 row
  needs a program whose R is closed or `pure`-tailed. **Resolved in
  3.4** (§R5b): a closed R with a label is not writable today (a row
  ends in the implicit ambient unless written `pure` or with a spread,
  docs/language.md; `Handler(nofail Ask with Log + pure)` is E_SYNTAX
  "Expected a capitalized name", run);
  the replacement ends R in `...s` occurring only in mk's result, so
  the ResultC's tail is the use's own, and the annotation program
  ends R in the caller's named `...e`, the annotation C's tail being
  always fresh. Both are refused today for C's `Log` (FrameOuter), and
  their controls are accepted (§12.1, §12.2).
- **K3 (wording). E2 at `defer`.** Defer.purs `checkDefer` consumes d's
  labels with a fresh throwaway tail never joined to the enclosing row
  (`consumeLabels`); E2's general remainder clause, read literally,
  would bind d's tail to the remainder. E2's `defer` site uses the
  labels-only form, as the settling sites do. **Resolved in 3.4** (§4
  E2, "Labels-only sites").
- **K4 (wording). E2's remainder on completed rows.** On a completed
  package s's tail is rigid, closed or a hole; "s's tail variable's
  binding is the remainder" must be restated as a condition on the
  package's binding of the variable s ends in before completion, or
  dropped where it is a throwaway (K3, settling sites, closed sources).
  **Resolved in 3.4** (§4 E2, "Tails"): the remainder clause is dropped
  as an inference step; on completed rows the copies are labels of s
  matched by the per-key rule, a closed s has no tail condition, and a
  rigid s keeps the tail pass (K1 open).

Agreements (run): attempt A refused today (E_TYPE "Expected
Handler(nofail Ask with Log), found Handler(nofail Ask with nofail
Log)"), its control accepted; attempt B refused today
(DeferHandlerMayFail), its control accepted; the rigid-tail lambda
program accepted. O1 and O2 (§13a) refused today; O4's program refused
today.

## 14. What each obligation means, and why (§18.81)

Folded in revision 3.3 from r0-amin-obligation-semantics.md (proposed
there for the author, 2026-10-24), with rows added for Definition 4.1
and C ≡ C and the E1 exception and E4′ rows updated; that file is now
a pointer here. No code.

The author's rule (§18.81; decided): **today's compiler is the
compatibility baseline, not the correctness specification.** Every
validator obligation names its intended semantic property and the
independent argument for it. A rule supported only by existing
behaviour is a **compatibility obligation**. Where compatibility and
soundness appear to conflict, the separating example is kept and the
conflict comes to the author; old behaviour is not reproduced
automatically.

**Classes.**
- **S, soundness**: needed for a stated guarantee about running
  programs; the argument is named with its standing.
- **P, precision**: accepts more programs that are safe; such a rule
  widens acceptance, so its own soundness needs an argument too.
- **I, implementation**: required by lowering or the runtime's
  representation, not by the language's meaning.
- **C, compatibility**: supported only by what today's compiler does;
  no independent argument is claimed.

The guarantees in play: **effect safety** (every operation a running
program performs is handled by an enclosing handler of its effect; no
operation escapes `main` except Console) and **abort safety** (FX008
§3.1: under a row whose k-th κ occurrence is marked N for every value
of the mark variables, the k-th κ frame cannot end an operation in a
typed abort; hence no deferred expression ends in a typed abort).

**Arguments and their standing.**
- **[L05]** Leijen, "Extensible records with scoped labels", TFP 2005:
  row equality up to scoped-label order, row unification. Published.
- **[L17]** Leijen, "Type directed compilation of row-typed algebraic
  effects", POPL 2017: effect safety for row-typed algebraic effects
  with scoped labels (an operation goes to the innermost handler of its
  label). Published; Waxwing's consumption is a project variant of it
  (FX001), not the paper's rule.
- **[FX008-5]** FX008 design §5, "Soundness argument (a proof
  obligation)": abort safety from the least solution, honest frames,
  met assumptions, mark variables and `defer`. A project argument,
  reviewed against probes (revisions 6-7 found no unsound acceptance);
  **not proved**, not published.
- **[FX008-3.4]** FX008 design §3.4's per-rule justifications. Project
  arguments.
- **[§5]** §5 of this document: `holds` exact for every rigid valuation
  (universal), the correspondence with FX008's criterion (universal
  given P1-P3) and its bounded oracle.
- **[REP]** spec §6 and Specialize.purs `specializeWith`: program output
  does not depend on the representative a hole lowers to (tested with
  another representative; bounded).

**The obligations.**

| Obligation | Intended semantic property | Independent argument (standing) | Class |
|---|---|---|---|
| E1 type equality, rows up to scoped order | the two sides denote the same type, so a value of one may stand for the other | standard unification over rows [L05] (published) | S |
| E1 at a clause body against the instantiated operation result, rows closed (O1), and at a `with` node against its body (O2) (3.4) | a handler value produced by a clause, or by a `with` expression, carries the m, R and C of the type its consumers read | [FX008-5] point 1 (handler values reach installations only by type equality) (argued); the checker's own unifications at ClauseBody.purs:52 and Install.purs:73 as supporting evidence | S; separating examples equations.mjs O1, O2 (§12.1; bounded, graphs) |
| E1 on records with several tails: fields plus the disjoint union of the tails' images (O6; 3.4) | a field's type, handler types included, is the same wherever a record merge copies it | RowMerge copies field terms by reference (supporting evidence only); the composition's result `θ(r) ⊎ θ(s)` (dossier §3.2, C7b) | S, **proposed**; no separating example |
| E1 marks equal inside types (function types invariant) | a handler or callback passed by type carries the mark facts its type promises | [FX008-5] point 1 (handler values reach installations only by type equality, marks included) (argued); invariance is the conservative choice | S |
| Definition 4.1, handler-type equality (handled marks by equality; R with marks when neither side owns a C, R standing in as C; otherwise R ignoring marks and clauseRow ≡ clauseRow; a side without its own C uses R itself as C, rule J, decided §18.85) | a handler value carries, wherever it is installed, the m and C its type promises | [FX008-5] point 1, "Handler values reach installations only by type equality (C ≡ C, marks included)"; FX008 §3.4, "Two handler types unify C with C, marks included" (argued); Unify.purs and UnifyParts.purs as supporting evidence only | S; separating example attempt A (§12.2; bounded, derived.mjs; today refuses it, run; relabelled in 3.5) |
| C ≡ C with marks, tails and `Fail` heads, no other arguments (Definition 4.1(c), (d)) | an owned C's labels, assumption marks and tail survive every type equality, so no frame edge it implies is lost | [FX008-5] point 1 (argued); E5's FrameOuter and FrameRigid edges read C's labels and tail | S; separating example attempt B (§12.2; bounded, derived.mjs; today refuses it, run; relabelled in 3.5) |
| E1 exception: R ≡ ρ (E5) ignores marks; R ≡ R ignores marks only when either side owns a C (Definition 4.1(d)) | where a C carries the marks, R's marks are never read, so ignoring them loses nothing | [FX008-3.4] "R's marks are dead", [FX008-5] point 1 (argued) | P (sound by argument) |
| E2 labels matched by first occurrence per key; ρ holds at least as many (exactly as many for a rigid-tailed s: Definition 4.2) | effect safety: each label the stage may perform has a handler occurrence in the target, the innermost first | scoped-label dispatch [L17] (published, adapted); per-key counts give finite rows (FX008 §3.5 (c)) | S |
| E2 payloads equal | the handler that receives the operation is the one for its effect instance | [L17], [L05] (published) | S |
| Definition 4.2, rigid-tailed consumption (§4; replaces 3.4's "rigid ϱ needs ρ to end in ϱ", withdrawn, §18.84), at every site §4 lists | a computation that may perform anything in ϱ reaches, for every instantiation of ϱ, the frames ϱ's own occurrences name: the k-th κ occurrence of s is the k-th κ frame of ρ (FX008 §3.1's positional invariant) | K1's argument (§13b): with an extra κ in ρ, an instantiation of ϱ holding κ sends ϱ's operation to ρ's extra κ by scoped-label dispatch ([L05], [L17] adapted: Leijen's shadowing) (reasoned); sufficiency per site, not a substitution lemma (§R6; reasoned); necessity scoped to the positional invariant (§R6 S3-2); "ends in ϱ" from FX008 §3.5's tail pass (argued, rigid.wxw); separating examples p1 (refused today, run) and p2, p4, p6, p7 with sim4, sim6, sim7 (simulated) | S (reasoned); a conservative validator restriction (decided, §18.85); its lost acceptances (s1, p1, FX027's program, p9) are validator limitations |
| Departure: c_k into C under Definition 4.2 (today: label by label with a throwaway tail, Clauses.purs `file`, Consume `consumeBare`; TailPass `ensure` binds only C's end variable) | one definition of rigid-tailed consumption at every site, so a clause row and its C agree as R and ρ do | §18.85 item 2 (decided); with Definition 4.2 at c_k into R and E5, both readings seem to refuse the same programs (§R6 S2-1; reasoned, unrun) | S by Definition 4.2; not today's procedure |
| E2 remainder: none for a closed source (F7) | a closed stage performs only its labels, all matched | effect safety needs only the matched labels [L17] (published, adapted) | S |
| E2 edge mark(ρ) ⊑ mark(s) on matched pairs | assumptions are met: a computation assuming N runs under an N frame | [FX008-5] point 2 (argued) | S |
| E2 copies: fresh positions with mark(ρ) ⊑ mark(copy) | the copy inherits the assumption edge (soundness); fresh positions avoid merging unrelated handlers (precision) | [FX008-5] point 2 for the edge; [FX008-3.4] review I1 for freshness (argued) | S (edge), P (freshness) |
| E2 target extension t ⊑ mark(s) | a label added to a target's tail inherits the stage's assumption | [FX008-3.4] review rev6 I2 (argued) | S |
| E2 at `defer` (d into the enclosing row) | cleanup's assumptions are met by its registration context | [FX008-5] point 2, "cleanup runs in its registration context" (argued) | S |
| E2 installed-C site (per-key count; Lend `assume` edge) | the frame's clauses reach outer frames at least as strong as they assume | [FX008-5] point 1 (argued); for a rigid-tailed C, R ≡ ρ by §4 E5's step under Definition 4.2 (3.5; reasoned) | S |
| E3 opening at use (an M handled label in a parameter, an N one in the result, made fresh) | accepts handler values at weakening positions | [FX008-3.4] D3; callback rows never opened ("would be unsound") (argued) | P (sound by argument) |
| E4 c into C with marks (C ⊑ c); c into R ignoring marks | C over-approximates what the clauses perform, with their assumptions | [FX008-5] point 1 (argued) | S |
| E4 own abort: `Fail` or rigid tail in a clause gives M ⊑ m | a handler whose clause may abort by itself is not N | [FX008-5] point 1 (argued) | S |
| E4′ owned C not from a literal, recorded by generation: R's labels, bare; a ResultC's tail recorded by `ownClauses`' occurs rule (H′, the live compiler's behaviour), certified by the shadow validator under R's tail ("always R's tail", provisional, 2026-10-25, §R7b: a recorded fresh tail is bound to R's tail and the constraints are checked; refused as unsupported only when they fail); an annotation C's tail always fresh | the C a caller installs covers what the callee's or the argument's clauses may perform | ResultC tail under the restriction: R's tail, so P4 is not relied on; O-SUB and A1 remain (resultc-tail §6, unproved); H′'s fresh-tail typing is not certified, only the forced one; the earlier parametricity comment was refuted by FX033's x1; annotation tail: FX008 §3.4, review M5 (argued) | S; O-SUB and A1 open; fresh-tail typings uncertified until P4 is argued and reviewed (decision 3) |
| C rows bare (no label arguments) | marks attach to effect keys; dispatch is by key | Task 7 ruling; [FX008-5] point 1 reads C only for keys and marks (argued) | S by argument; C for the ruling |
| E5 R into ρ ignoring marks: inclusion for a closed R only; Definition 4.2 for a rigid-tailed R (3.5) | effect safety of the handler's inference row in its context | [L17] (published, adapted); marks dead (argued); Definition 4.2's row for a rigid-tailed R | S; separating example p1 (refused); closed-R inclusion control added in 3.5 (oracle agent; no result claimed here) |
| E5 frame edges m ⊑ f, paired ρ marks ⊑ f, rigid C tail gives M ⊑ f | frames are honest | [FX008-5] point 1 (argued) | S |
| E5 frame edges for Console frames too (uniform accounting; ruled §18.86, decision 1) | frames are honest, Console included | [FX008-5] point 1 (argued); today's Frames `framed` guard skips them, sound only while FX011 holds; no edge omitted without an argument that it is redundant | S; departure from today recorded |
| E6 no `Fail` and no rigid tail in d | cleanup neither fails nor performs an unknown effect | [FX008-5] point 4; spec's `defer` rule (argued) | S |
| E6 d's labels ⊑ N | cleanup's operations reach frames that cannot abort | [FX008-5] point 4 (argued) | S |
| E7 a call's `nofail` assumption | as E2's edge | [FX008-5] point 2 (argued) | S |
| E8 `main` within Console | effect safety at the top: only the runtime's Console handler exists | the runtime (spec §1); [L17]'s top-level condition (published, adapted) | S |
| E9 Fail payload head concrete | lowering needs a concrete error family for the Go layout | audit C6; lowering's family read (cited) | I |
| E10 body row within the declared row | the signature's row is a sound upper bound for callers | [L17] (published, adapted) | S |
| E11 ambient rows | defines E2's targets | definitional | — |
| E12 every edge for every rigid valuation | abort safety holds for every value of the mark variables | [FX008-5] point 3; [§5] (universal for `holds`; correspondence bounded) | S |
| Console labels N; `nofail(k) Console` recorded as N | the runtime is Console's only handler, which cannot abort | spec §1, FX008 §3.3 (argued) | S, while FX011 holds |
| hole defaults: type Int, record tail none | the program's output does not depend on the representative | [REP] (bounded) | I |
| hole default: effect tail the closed row | obligations judged at ∅ hold for every row lowering might choose, since lowering reads no effect row | audit §3 C1 (argued from the code) | S by argument |
| FX008's F1′ hook, correction S, termination T (excluded) | reproduce today's type solutions and acceptance order | FX008 §3.4's compatibility argument (argued) | C (excluded from the validator) |
| side-condition texts, diagnostic headlines | which message a refusal prints | today's behaviour only | C |

**Compatibility-only obligations.** The rules above supported only by existing
behaviour: the bare-C ruling as a ruling (its soundness has an argument),
FX008's F1′, S and T (already excluded from the validator), and diagnostic texts
and headlines. None is a soundness obligation of the validator; each is kept
only to match today's acceptance or output and is listed so it is not mistaken
for one. Definition 4.1 is not on this list: it is class S on FX008 §5's
argument, and today's agreement with it is supporting evidence (§18.82).

**Conflicts and decisions for the author.** Each keeps its separating
example; none is resolved by copying today's behaviour. The author
ruled on 1 and 4 and kept 3 open (dossier §18.86, 2026-10-24); 2 is
decided and listed as the precedent.

1. **Console frame guard** (E5; ruled §18.86, uniform accounting). Frames
   `framed` adds no edge for a frame marked N, which today means only a Console
   frame; the code says this "drops real demands" and that user Console handlers
   (D001) must revisit it. Separating example (unrun, not constructible today
   because of FX011): a user `Handler(Console …)` whose clause fails, installed
   around `defer print(1)`. Proposed: the validator generates the frame edges
   for Console frames too; that costs nothing today (unreachable) and stays
   sound if FX011 is lifted. **Ruled (§18.86): uniform accounting.** The
   validator generates the frame edges for Console frames as for any other
   frame. An edge may be omitted only with an explicit argument that it is
   redundant under the current typed-abort semantics; none is given here, so
   none is omitted. This departs from Frames `framed`'s guard; the shadow
   differential cannot show the difference today (FX011 makes the case
   unconstructible), and the departure is recorded so that lifting FX011 does
   not silently inherit the guard.
2. **FX032** (decided, §18.78): today's checker drops an operation's
   own `with` row, which accepts unsound programs; a-min records it as
   unsupported. Listed as the precedent for this rule.
3. **E4′'s ResultC tail rule rests on a parametricity claim in a code comment**
   (ResultClauses.purs; open). Update 2026-10-25: the claim was refuted by
   FX033's x1; the compiler now implements H′ as a narrow repair (branch
   fx033-resultc-tail), refusing c1 and x1z as a temporary precision limitation.
   Whether H′ suffices is still open: RC′ is argued, not proved. It is
   soundness-relevant (a ResultC's tail decides which outer frames its clauses
   can reach) and has no independent argument. The separating example now exists
   (FX033's x1, and Review 2's eight further channels), and the argument is
   written as RC′ (resultc-tail §6). **§R7 fix pass:** the shadow validator uses
   "always R's tail" provisionally (author, 2026-10-25; §0e item 2), so P4 is
   not relied on; RC′'s O-SUB and A1 remain whole-judgment obligations. (The
   annotation C's always-fresh tail does not rest on this claim.) **Kept open
   (§18.86)** until its exact claim and supporting argument are written and
   reviewed; it is not settled by analogy with other tails (the annotation C's,
   R's, or Definition 4.2's).
4. **Divergence, not a soundness conflict** (open): with F1′, S and T
   excluded, R0 may accept a program today's checker rejects (FX008's
   gain1.wxw is such a program for FX008 revision 10 itself). FX008
   argues these gains are sound. The shadow differential reports each
   such program for review rather than counting it as agreement or
   refusing it to match today. **Ruled (§18.86):** the differential
   reports F1′, S and T differences as separate, explained categories
   (one per excluded mechanism, each with the program, both verdicts and
   the mechanism's role); none is suppressed, and no existing comparison
   is weakened to absorb them.

Not covered here: proofs of any [FX008-5] point, which remain a proof
obligation; the effect-safety theorem for Waxwing's consumption
variant, for which [L17] is the published model, not a proof of this
rule.

## R1. Adversarial review 1 (2026-10-24): not ready

An independent reviewer (Opus, read-only; nothing run) reviewed these
statements at d7f30b0. The controller re-read F1's and F2's evidence
(the mark refusals `ExpectedNofail`, `HandlerMayFail` in
Domain/Problem.purs and the fixture pair
test/fixtures/r0/audit/expected-nofail.{inferred,selected}.json;
Generate/Operator.purs's Apply arrow with its row handle appearing only
inside a `GenEqual` atom) and they hold. The statements need revision
before approval. Findings, by severity:

**S1.**
- **F1. Marks cannot be judged.** Today's effect refusals include mark
  obligations (ExpectedNofail, HandlerMayFail, DeferHandlerMayFail,
  DeferHandlerVariable); D1/I3 forbid marks in images, D2 has no mark
  binding and D7's vocabulary has none, so O3's "marks judged by D6
  before Strip" has no data. The nofail fixture pair differs only by a
  mark: a rows-only D6 accepts both. Contradicts Q1's pre-Strip
  evidence. Fix: separate pre-Strip evidence (mark-variable and
  ⟨p, clauses⟩ bindings outside images, dropped after D6), or D6 infers
  marks (FX008's design as source; novelty).
- **F2. K2 is missing; nested rows unjudged.** A type equation between
  arrows, data or handler types also equates their rows
  (r0-erased-rows §2, K2). G0 judges erased atoms, so the row parts of
  every `Equal` atom and the rows nested in `Inline` images are judged
  by no one. Example: `fn f(h: Unit -> Unit with Log): Unit with pure =
  { let k = h; k(()) }` with the Apply arrow's row forged to `pure`.
  Fix: D7 re-reads every `Equal` atom at full types (row equality up to
  scoped-label order); I2 covers every row in any binding.
- **F3. D7 cites the wrong inventory and claims no completeness.**
  §2.1 lists where rows are made, not checked. The checking inventory
  is findings.md "Effect and coverage audit" (13 effect refusals),
  r0-erased-rows §2's K1, K1e, K2 and §7.1's counterexample; some are
  absence constraints (no rigid tail in a deferred row, no Fail label,
  `main` ⊆ Console). A dropped obligation makes D6 accept vacuously.
  Fix: I10, D7 complete for today's effect checks, with one forged-
  witness fixture per refusal kind and a mutation test per obligation
  kind; widen D7's form.
- **F4. The coupling is not tied down.** D7 "beside the recorded
  problem" is tied to neither the problem nor the witness (R026's
  shape); D8's "identical witness value" has no meaning in PureScript.
  Fix: D7 inside `RecordedProblem` (Domain.Recorded.Internal), so
  `elaborate`'s problem identity covers it; name where
  `validateEffects` runs (inside `certify` on the witness it builds, or
  in `elaborate` just before `build` on the same binding);
  `EffectsChecked` minted by one private function.
- **F5. One piece of information in two places.** A whole-row handle at
  Translate `rowOf Instantiated` would hold written labels (e.g.
  `State(a)`) that also live in ⟨p, inst a⟩'s `Inline`, unrelated by
  any check; likewise a new A11 slot and the over-application stage.
  Fix: written labels translate under θ; handles only at RowSort tails
  and the opened tail; A11's tail is the lambda's ⟨p, effect⟩; atom and
  IR stage rows share handles.

**S2.** F6 the online read-back is pre-Strip, so I3 refuses legitimate
witnesses unless the read-back strips (it must, untrusted; I3 checks).
F7 I3 must also refuse a wrong data row count, an out-of-scope or
wrong-sort rigid, one hole number at two sorts, a binding constructor
disagreeing with the variable's sort, and images naming problem
variables. F8 images naming effect-row problem variables is new
resolution machinery (occurs check), unflagged: forbid, or specify with
a source. F9 the fresh-hole numbering (Witness.purs) must count holes
inside rows; one hole number, one sort. F10 I2's source list is false
(instantiated signatures, builtins, body annotations, Fail payloads) and
"vice versa" is false (atom-only handles, clause rows). F11 I6's
structural test misses `translate … Rigidly` body sites (A11 itself),
Fresh.purs's `RowSort → Nothing`, constructor patterns and references.
F12 a `Free` that fails its obligations is checked-and-failed, not
`EffectsUnchecked`; its default is the closed empty row, argued as in
W §1.5. F13 `erase` must be sort-aware (R022) and must agree with
Generate.Elab.Recorded, the translator the atoms use: add that
differential. F14 the interim before D6 exists is unstated. F15 the I2
fixture does not separate (use a lambda passed to a `pure` parameter
with its row forged to Console; control: an unconstrained lambda). F16
O5 reopens Q3; O4 conflicts with O1. F17 positions for effect-row
variables are unspecified.

**S3.** A §-reference typo; ⟨p, clauses⟩ dropped silently; §6
understates changes to Atom.purs (`VarSort`, `Role`, `CheckedName`);
I7 can claim exact numbering (build already applies `holes`);
ReadBack.Type is trusted and serves the read-back, so D5 cannot simply
be it; the trust table lacks the read-back, Atom.purs, `bindingsOf`,
HoleContract and Elaborate, and `certify` is not "unchanged"; no
ambient-row field in generation's `Context`.

Reviewer's rulings to confirm: forged and non-online witnesses count
as a soundness threat (R026's model); gaps behind `Outside` markers
were kept at S1 where the statements claim coverage.

## R1a. Revision 2's answers to review 1

| Finding | Resolution in revision 2 |
|---|---|
| F1 marks | D3 pre-Strip evidence (marks, clause rows) in the package; D8 holds FX008's mark obligations; I12; the nofail fixture pair in §6 |
| F2 K2, nested rows | D8 re-reads every `Equal` atom at full types; I2 covers nested and atom-only rows; §6's K2 fixture |
| F3 inventory, completeness | D8 cites the audit table, K1, K1e, K2 and §7.1; absence forms; I10 with fixtures and mutations |
| F4 coupling | D8 inside the recorded problem; D10 validation inside `certify`, result in `Certified`; I11 |
| F5 two places | D5: labels under θ, handles only at tails; A11 reuses `⟨p, effect⟩`; stages shared |
| F6 pre-Strip read-back | I3: the read-back strips, `certify` checks; §6 stronger-side fixture |
| F7 I3 incomplete | I3's six conditions |
| F8 flexible references | D1 forbids them (ruling 2) |
| F9 hole numbering | I3 one sort per hole; I7 fresh numbering counts row holes |
| F10 I2's sources | I2 restated |
| F11 structural test | I6's added sites and scan |
| F12 `Free` reason, default | I5: closed empty row; `ObligationFailed` |
| F13 erase | D6 sort-aware, located; I4 against Generate.Elab.Recorded |
| F14 interim | §5 (ruling 3) |
| F15 I2 fixture | §6's replacement and control |
| F16 O4/O5 | `⟨p, clauses⟩` is evidence (D3); `main`'s slot decided (D5) |
| F17 positions | D4 |
| S3 (a)-(i) | references fixed; `⟨p, clauses⟩` restored; §7 lists the Atom.purs changes; I7 exact; D7 fresh reference; trust table extended; D10 replaces "identical value"; the `effectErased` case stays until validation exists, then compilation requires `EffectsChecked`; D8 threads the ambient row |

## R2. Adversarial review 2 (2026-10-24): not ready

A fresh independent reviewer (Opus, read-only; nothing run) reviewed
revision 2 at 3daf6f9. The controller re-read N1's and N2's evidence
(expected-nofail.inferred.json's note: "work's nofail Log reaches
caller's plain Log through r's record meta"; r0-erased-rows §7.1 item
3: `EffectsUnchecked` "stays Unresolved"; Strategy.purs `checked` turns
any `Certified` into an accepted Solution) and they hold. Review-1
status: F5, F8, F9, F11, F13, F16, F17 resolved; F1-F4, F6, F10, F12,
F14 partly (via the findings below); F7 resolved as text but not
checkable from the problem alone (N9).

**S1.**
- **N1. Marks carried by bindings have no evidence slot.** Marks are
  constrained through type equalities (FX008 §3.3-3.4); in the cited
  fixtures the `nofail` mark travels through stripped bindings (a
  record image, a lambda row, a stage row). Evidence only at recorded
  mark variables leaves the validator to infer the rest, or to treat
  every program whose marks pass through a binding as unsupported. Fix:
  evidence holds a mark for every label occurrence in every witness row
  and image (keyed by variable and label path), plus m and C for every
  handler type in an image; K2 compares marks except on inference rows;
  equivalently, a marked pre-Strip package of which `build` reads only
  the stripped projection.
- **N2. An effect failure would be a Solved verdict.** D10 puts
  `ObligationFailed` and `EffectsUnchecked` inside an accepted
  `Certified`, which `checked` turns into a Solution; rule 2 stops at
  the first acceptance. §7.1 item 3 (the author's) keeps
  `EffectsUnchecked` Unresolved, and ruling 3's "check failure" is a
  `CheckRefusal` in the code. Fix: `ObligationFailed` is a
  `CheckRefusal` (the run continues to other strategies);
  `EffectsUnchecked` is an Unresolved reason; or fold the standing into
  `Compilation` so that `Witnessed` implies `EffectsChecked`.
- **N3. Holes nested in rows have no explicit contract.** I5 covers
  `Free` at effect-row variables only; a type or record hole sitting
  only in an effect label argument is erased from the atoms and judged
  by no one. Fix: the validator judges every hole in a row at
  lowering's default (effect tail none, type Int, record tail dropped);
  say whether K2 compares holes syntactically or at defaults; extend
  r0-certify-argument C1-C2 to effect rows.

**S2.** N4 generation records no mark variables today; D3 and D8 must
enumerate FX008's mark sites (local annotations, the handler's m, each
installation's frame mark, opening at a use, consumption copies). N5
no slot for each clause's row, the deferred row, or the ambient rows of
`with`, `handle` and clause bodies; generation's context has no row
field. N6 D5 omits `⟨p, apply⟩`, a lambda's inner stage rows and
partial-application stages. N7 refusal kinds missing from D8:
LabelMismatch, row-driven TypeMismatch and InfiniteType, FX032; the
mutation granularity cannot detect a dropped FX008 constraint class;
use FX008's constraint generators as obligation kinds and its probes as
the oracle. N8 `SortMark` variables would enter Cov's domain with no
binding form, so every marked program would be `Uncovered`; the
exhaustive matches to change are unlisted. N9 I3 needs declaration
arities and effect rigids the recorded problem does not hold (an
amendment to `Fields`); the implicit ambient row variable counts as
declared. N10 the evidence domain must equal the recorded sites
exactly. N11 D10's change surface (Strategy.purs `checked`, `Solution`,
`Attempt`, `NoWitnessReason`, `certifySound`, the certify argument) is
unlisted. N12 the online read-back must compute a mark assignment (for
example the least solution of the mark graph) or honest packages fail.
N13 §6 lacks forged clause-row and mark evidence on programs accepted
today, rows nested in `Inline` images, missing or extra evidence; the
D5 fixture's expectation is indeterminate. N14 completeness of a
ground mark assignment relative to FX008's path criterion is a derived
claim needing an argument and a source (least solutions in a finite
lattice, e.g. Rehof and Mogensen 1999) and an oracle.

**S3.** Reject.purs's raise is at :78, not :69; fixture paths lack
`.json`; "Pottier 2014's solved forms" is unspecific; D10's "only
`EffectsChecked` builds" must be labelled post-interim; row inclusion
by consumption is FX001's design, not Leijen's (novelty flag).

Separating examples proposed by the reviewer (twelve, including the two
FX008 fixtures with free mark choices, two strategies where the first
fails effects, LabelMismatch, scoped order, Fail payloads, holes in
label arguments and nested tails, hole identity, a local-annotation
mark, missing and extra evidence, and the stage and Apply sites) are
to be added in revision 3.

## R3. Adversarial review 3 (2026-10-24): not ready; fixes local

A bounded independent review (Opus, read-only; nothing run) of revision
3 at 3bf8708, under §18.78's brief. The controller re-read T2-a's and
T5-a's evidence (Defer.purs consumes d into the current row with
`ignoreMarks: false`; `UnresolvedReason` has only the Inference,
Unsupported and Limit families) and they hold. The reviewer judged the
structure sound and the fixes local, and expects revision 3 to be
approvable once the nine findings marked below are resolved, pending
U1's and U6's oracle and written argument.

**Checked clean.** `holds` is sound and exact on normal forms,
including M on the left (universal argument). Per-valuation
satisfiability matches FX008's path criterion, and Mark.purs
`violation` agrees with the design's criterion. Cycles, constants,
several rigid variables, joins on flexible positions, and equalities
with constants all behave the same on both sides. Forged holes in label
arguments, at two sorts and in nested tails are refused (given U4).
Forged extra or missing sites are refused. "Fresh" means a fresh
position everywhere. Routing: a failed check lets later strategies
run; `Certified` is minted only through `certify`, so no strategy
reaches Solved without effect validation; an unsupported obligation is
refused alike by every strategy.

**S1.**
- **T2-a.** The edge ρ ⊑ d from consuming a deferred row into the
  enclosing row is missing: `defer` is not among E2's sites, E6 holds
  only absence and d ⊑ N, E10 checks containment only, and E12 collects
  edges from E2-E7. A forged package can mark d's Log N and pass, so
  `defer log(1)` under a failing handler would be accepted. Fix:
  `defer` joins E2's sites, and E12 collects the directional edges of
  E10's settling consumptions (deferred rows into their row, clause rows
  into C, installed C into ρ).

**S2 (several S1 risks if built literally).**
- T3-b one FX008 meta in two places: clause rows, deferred rows and
  copies would be both effect-row bindings and site facts; forging
  `HandlerLit.clauses` to `pure` could drop the own-abort constraint.
  Pick one home each; I3 forbids the other.
- T3-a E1's `Obligation` is undefined; recorded atoms are row-free, so
  nothing records the written side's rows, fixed marks or annotation
  mark positions, and a forged N nested in an image equated with a
  written M label would pass. Define E1's obligation with rowed and
  marked sides.
- T2-b the tail pass (a clause row ending in rigid ϱ needs R and C to
  end in ϱ) is unstated for clauses; consumption and containment are
  worded as procedure steps, not conditions on final rows.
- T2-d Task 9's as-built rule: a top-level result handler type at a
  use gets its own bare C; every other written handler type has C
  aliased to R; I3 must enforce the alias.
- T1-a the least-term construction must be stated over equality classes
  (union-find over E1 and callee-k sharing), a class holding a fixed
  term taking it; as written, a position equated with an unreached
  rigid k gets N and breaks the equality.
- T2-c callee mark variables at a use have no package position (they
  belong to the signature, not an image): add an `Instantiated` site.
- T2-e C rows are bare (no label arguments) and installation pairs C
  with ρ by key and position, recording mark edges only, not consuming.
- T5-a `EffectsUnchecked` is not reachable as an Unresolved reason as
  specified; add it as an `Unsupport` constructor read as a decline
  (like `RequirementOpen`), never as a `CandidateRefused` search fault;
  reconcile with r0-erased-rows §7.1 item 2's rule-1 placement.
- T1-b U1's premises (the package's graph is exactly FX008's, every
  meta has a position). T2-f `handle`'s ambient `Fail(E…) + ρ`. T2-g
  F1′, correction S and termination T need explicit exclusions
  (inference only; R0 may then accept programs today rejects, as gain1).

**S3.** T1-c the 36-pair check has no recorded location; T2-h smaller
mismatches (installation's unreachable case, Console frames, E1's
refusal list, nested marks in payloads); T3-c E5 must name the head's
marked type as the source of m and C; T3-d `Fail`'s placeholder is not
a `MarkTerm`; T3-e a fixture that `nofail(k) Console` is recorded as N;
T5-b an unsupported construct gives `NoCandidate`, not `Inconsistent`;
T5-c FX032's scope covers every perform site; two §12 wording items.

## R3a. Revision 3.1's resolution ledger for review 3

| Finding | Resolution in revision 3.1 |
|---|---|
| T2-a (S1) defer's edge | §4 E2 sites include `defer` and settling consumptions; E12 collects exhaustively; §7a trace; §12 fixture |
| T3-b two homes | §2 ownership table; site facts hold variable names; I3 refuses a second copy; §12 fixture |
| T3-a E1 sides | §4 E1 records full marked sides; §10 `Obligation`; §12 fixture |
| T2-b tail pass, final rows | §4 E2 final-row conditions with tails; E4 clause tail pass; §12 fixture |
| T2-d owned C, alias | §2 table (`ResultC`), E5, I3; §12 fixture |
| T1-a equality classes | §5 least terms over classes; oracle's per-position mutant shows the difference |
| T2-c callee marks | §2 `Instantiated` site; §12 fixture |
| T2-e bare C | §4 E2 (C bare, keys only), E5 pairing by key and position; §12 famw fixture |
| T5-a routing | §7: rule-1 `Unsupported EffectsUnchecked`; candidate failures `CheckFailed`; §12 fixtures |
| T1-b premises | §5 P1, P2 |
| T2-f `handle` | §4 E11; §12 fixture |
| T2-g exclusions | §13 with reasons |
| T1-c 36-pair check | §5 says where it is reported and that it is not in the repository |
| T2-h mismatches | E5's unreachable case and Console frames; E1's refusal list; E2 nested marks |
| T3-c head's type | E5 reads m and C from h's marked type |
| T3-d Fail placeholder | §2: the term N, never read, erased |
| T3-e Console | §2: I3 refuses a non-N Console term; generator records `nofail(k) Console` as N |
| T5-b NoCandidate | §7 routing |
| T5-c FX032 scope | §7 step 2 (every perform site's construct) and §9 |
| §12 wording | the E4/E5 row and "pinned" corrected |

## R4. Targeted confirmation review of revision 3.1 (2026-10-24)

An independent targeted review (Opus, read-only; one run of the
oracle, matching its README) at af588f6, under §18.79. The controller
re-read N2's and N3's evidence (Lambda.purs calls MarkUse `localMarks`,
whose `handlerRows` gives an annotation's outermost handler type its
own C; Decide.purs `untilVerdict` is `not blocked && (solved ||
refuted)`, so a blocked declaration still runs every strategy and
refuter, Solved being suppressed afterwards by `solvedUnlessBlocked`)
and they hold. No scope expansion found: every repair stays within the
representation and theorem scope.

**Confirmed sound.** `holds`, §5's argument (written constants are only
N, M or one rigid, which should become a stated premise), the `defer`
edges, §7a's trace (honest and forged packages refused; forged d = ∅
refused by the per-key count), failed-candidate routing, U6's refusal
coverage against every effect and mark `Problem` constructor, and the
exclusions' reasons. Ledger: T2-a, T3-a, T2-b, T1-a, T2-c, T2-e, T2-f,
T2-g, T2-h, T5-b and the §12 wording resolved; T3-b, T2-d, T5-a, T1-b,
T3-e, T5-c partly (below); T1-c resolved as disclosure; T3-d resolved
with wording off.

**Required before implementation approval.**
- **N1 (S1, plausible).** An owned C that does not come from a literal
  (`ResultC` from ResultClauses `ownClauses`; a lambda annotation's C
  from MarkUse `handlerRows`) is constrained by nothing: forged to the
  closed empty row it drops every FrameOuter and FrameRigid edge. Fix:
  an obligation that such a C holds bare(R) per key count, its tail as
  `ownClauses`' occurs rule gives (or the annotation's fresh tail); a
  §12 fixture (a handler returned as `Handler(nofail Ask with Log)` and
  installed under a plain `Log` row around a `defer`).
- **N2 (S2).** Lambda-annotation handler types own a C; §0 item 4's
  "every other C is R's bare alias" is false. Give that C a home.
- **N3 (S2).** "No strategy runs" under a rule-1 block is false (see
  above); the outcome, never Solved, holds.
- **N4 (S2).** Today R is consumed into ρ ignoring marks (Consume
  `consumeIgnoring`; a closed R gets a throwaway tail), so it is
  R ⊆ ρ, not R ≡ ρ; E5 as written would refuse programs today accepts
  (unrun example `fn st(h: Handler(State(Int))): Int with Log = with h
  { State.get() }`). A completeness loss. Fix: E5 is E2 with marks
  ignored.
- **N5 (S2).** State that a handler literal's recorded type names
  `HandlerLit.m`, `HandlerLit.c` and R's variable; that generation
  records an E1 wherever an image can copy a site position; restate P2
  per class (a meta shared between a site and an image is two positions
  joined by E1); fixture: a let-bound failing handler installed around
  a `defer`, its image mark forged to N.

**S3.** N6 §2's "site facts hold variable names, never rows"
contradicts `HandlerLit.c` and `ResultC` as rows. N7 §5 over-claims:
2,351 of the 200,000 random assignments passed `holds` (in a family
without equalities); the `two` family has at most one equality; the
mutants and the author's 36-pair check are not reproducible from the
repository (an injected-mutant module would make them so). N8 E2's
"installed C into ρ" and E5's "no consumption": say the site gives
E2's per-key count and Lend `assume`'s edge `mark(ρ partner) ⊑
mark(C label)`. N9-N12 the `Fail` placeholder wording; the Console
fixture; FX032's "every perform form"; §7a's probe citation
(test/fx008-probes/…) and label (bounded, not universal).

## R4a. Revision 3.2's resolution ledger for the targeted review

| Finding | Resolution in revision 3.2 |
|---|---|
| N1 (S1) owned C unconstrained | §2 rows for ResultC and the annotation C (labels and fixed marks derived from the recorded problem); E4′ (label count, order, tail rule); §12 rows; cases.mjs "owned C forged empty" with control and the earlier set |
| N2 annotation C | §0 item 4 corrected; §2 row; E4′; §12 row |
| N3 routing wording | §7: strategies run, acceptance suppressed by `solvedUnlessBlocked`; §12 routing row; behaviour unchanged |
| N4 inclusion | E5 consumes R into ρ ignoring marks (E2, inclusion); §13 rows; §12 row; cases.mjs "inclusion" |
| N5 copies | §2 "Copies through equations"; P2 per class; §13 row; §12 row; cases.mjs "let-bound handler" |
| N6 rows in sites | §2: site facts hold marks or variable names only; the literal's C is a binding |
| N7 oracle over-claims | §5 reports tried and passing separately; equality coverage expanded; `pairs36` and `mutants.mjs` reproducible |
| N8 installed C | E2: the installed-C site gives the per-key count and Lend `assume`'s edge only |
| N9 `Fail` placeholder | §2: N, edges hold trivially, I3 refuses another term |
| N10 Console fixture | §12 Console row |
| N11 FX032 perform forms | §9 lists every perform form |
| N12 §7a citation, label | §7a: bounded, the three named probes; cases.mjs |

## R5. Targeted re-review of revision 3.2 (2026-10-24): not ready

An independent targeted review (Opus, read-only; one run each of
run.mjs and mutants.mjs, both matching the README) at e26d76f, under
§18.80. The controller re-read F1's and F2's evidence (Unify.purs
`unifyInference`: "When neither type has a C of its own, C is R and its
marks are compared with it", marks ignored on R only when a side owns a
C, and `unifyClauses` comparing C rows separately; §10 still declaring
`ResultC { c ∷ MRow }`) and they hold. No scope expansion: every repair
stays within the representation and theorem scope.

Ledger: N3, N4, N7-N12 resolved; N2 resolved with wording off; N1, N5,
N6 partly (below).

**S1.**
- **F1. E1 omits C ≡ C, and ignores R's marks even when neither type
  owns a C.** E1 says marks are ignored on inference rows; today's
  checker compares R's marks when neither side owns a C, and compares C
  rows (marks, tails, `Fail` heads, no other arguments) whenever either
  side owns one. §13 has no `unifyClauses` row and its R ≡ R row is
  wrong. Attempt A (unrun; accepted under E1 as written with an honest
  package): `fn f(h: Handler(nofail Ask with Log)): Unit with Log = with
  h { Ask.ask() }; fn g(h2: Handler(nofail Ask with nofail Log)): Unit
  with Log = f(h2);`, today refused (N against M on R), lets a caller
  install a handler whose clause defers `Log.log` under a failing `Log`.
  Attempt B (unrun): `let h = if b then mk() else g` with
  `mk(): Handler(nofail Ask with ...s)` and `g: Handler(nofail Ask with
  ...r)`, the ResultC tail forged ∅, drops FrameRigid. Fix: E1 on
  handler types compares handled marks by equality, R ≡ R ignoring
  marks, and clauseRow ≡ clauseRow with marks, tails and `Fail` heads,
  a side without its own C contributing R's bare alias with R's
  positions; §13 rows; attempts A and B in cases.mjs with controls; a
  mutant dropping C ≡ C.
- **F2.** §10's `SiteFact += … ResultC { c ∷ MRow }` makes the ResultC a
  package-side row again, contradicting §2 and §18.80's single home.
  Remove it and name where the derived C is recorded.

**S2.** F3 the recorded problem cannot yet supply what E4′ derives
from: handler forms are `Outside HandlerType` markers today and
`Fields` holds no callee signature; record, at each use with a
top-level handler result, the derived C (R's labels bare with `Fail`
heads; each mark N, M or a reference to the `Instantiated` k; the tail
as R's variable, the use's own variable, or closed when R is closed),
and at each annotation the MTy with its C (own `Annotation` positions,
a fresh tail). F5 "every image copy arises from a recorded unification"
is unchecked against all unifier entry points (Merge `improve`,
Argument, ArgumentRow, Consume, RowEntry, EndReport): enumerate each in
§13.

**S3.** F6 an annotation C's tail is always fresh (E4′'s single rule
reads otherwise), and `freshType` gives a C to every handler type not
inside another's rows, not only the outermost. F7 E2's remainder lacks
a closed source; R's extension marks are read by the alias's `assume`
edge (harmless). Cases: m in the owned-C case is an `Opened` meta, not
the constant N (verdict unchanged); the owned-C case hard-codes the
derived C, so it shows unsatisfiability, not derivation; the inclusion
case is a set tautology that does not exercise E2's rigid-tail rule;
§12's "reproduced" rows sit under an "all unrun" header. Labels: §2's
copies claim and §0a's "cannot supply or forge" are unlabelled
universal or design claims.

Clean by reading: inclusion with C pairing (both take the r-th
occurrence of a key from the front); the per-key count against
`partners`; copies during consumption (fresh, with edges) and during
equality (same meta); monomorphic `let` (h shares the literal node's
variable).

## R5a. Revision 3.3's resolution ledger for the re-review

| Finding | Resolution in revision 3.3 |
|---|---|
| F1 (S1) E1 omits C ≡ C; R's marks ignored even with no owned C | Definition 4.1 (§4), cited from Unify `unifyHeads`, `unifyInference`, UnifyParts `handledMarks`, `unifyClauses`, Domain/Row `clauseRow`, UnifyRow `ignoringArguments`, `unifyRowsIgnoring`; E1 refers to it; §13 rows for arguments, handled marks, R ≡ R and C ≡ C replace the wrong R ≡ R row; §14 rows for Definition 4.1 and C ≡ C (class S); attempts A and B in §12.2 (reasoned, not run); oracle cases and the C-equality mutant are condition 5's parallel work, no result claimed |
| F2 (S1) `ResultC { c ∷ MRow }` in §10 | removed from `SiteFact`; the derived C is recorded by generation in `Fields.instances` (§2, §10); §12.2 "recorded ResultC" row |
| F3 (S2) no recorded inputs for derivation | §2 "What generation records" (today: `Outside HandlerType` markers, no callee signature in `Fields`); `instances` and `annotations` in §10; E4′ reads the records; §12.2 generation-side row |
| F5 (S2) unifier entry points unchecked | §13a: audit done; O1, O2 unrecorded (proposed E1s), O3-O7 (§18.82 condition 4); §2's copies claim, §0a item 2, U6 and the §13 copy row labelled open pending it. (3.4: the claim was false, not merely open; corrected in §2, §0a, §5, §11, §13; O1, O2 recorded; §R5b) |
| F6 (S3) annotation C tail always fresh; a C for every handler type not inside another's rows | §2 annotation row and "What generation records" (`freshType`, `handlerRows` run twice, `Hole <$> next`); E4′ split by kind; §0 item 4 corrected; §13 row; §12.2 row |
| F7 (S3) E2's remainder lacks a closed source; R's extension marks read by `assume` | E2 remainder states the closed-source case (Consume `consume`, UnifyMark `stageLabel`); §2's extension-marks row names its readers; §14 row; §12.2 row |
| S3: m in the owned-C case is an `Opened` meta | §12.1 limits note; changing the case is the oracle's work |
| S3: the owned-C case hard-codes the derived C | §12.1 limits note; derivation cases are condition 5's parallel work |
| S3: the inclusion case is a set tautology | §12.1 limits note; its replacement is condition 5's parallel work |
| S3: "reproduced" rows under an "all unrun" header | §12 split into §12.1 (reproduced, bounded) and §12.2 (unrun) |
| S3: §2's copies claim and §0a's "cannot supply or forge" unlabelled | §2: design and open (pending §13a); §0a item 1 design, item 2 open |
| §18.81 fold | §14; r0-amin-obligation-semantics.md reduced to a pointer; decisions 1, 3, 4 kept open |

## R5b. Revision 3.4's ledger for the author's rulings (2026-10-24)

Rulings on §13a and §13b, to be recorded as dossier §18.83. Runs:
today's compiler at this worktree's build (`node scripts/waxwing.mjs
emit`, scratch files outside the repository; src unchanged since
0c2ad60), and `node run.mjs` and `node mutants.mjs` in
research/amin-mark-oracle/ (both exit 0, 2026-10-24).

| Item | Resolution in revision 3.4 |
|---|---|
| O1 (S1 for a-min) clause body unrecorded | §4 "Where E1 is recorded": E1 between the clause body's type and the operation's result instantiated with the handled label's arguments, rows closed (ClauseBody.purs:52, `instantiateType`); equations.mjs "O1 clause body against the operation result": honest package refused, accepted without the equation; a package hiding `Fail(E)` refused under both by E4; control accepted (bounded); §12.1 row; §14 row; program and control run today (refused, E_EFFECT "This function must be pure, but it performs Fail(E)"; control accepted) |
| O2 (S1 for a-min) `with` node unrecorded | §4: E1 between the `with` node's variable and its body's type (Install.purs:73; replaces E21's "no equation through the handler"); equations.mjs "O2 with node against its body": forged image refused, accepted without the equation; honest refused under both; control accepted (bounded); §12.1 row; §14 row; run today (refused, E_EFFECT "Unhandled Fail(E) in main"; control accepted) |
| false completeness claim on recorded equalities | corrected everywhere it appeared: §0a item 2, §2 "Copies through equations" (what is recorded, what is open, standing reasoned outside O4), §5 P1 and P2 (open; P2 reasoned outside O4; P1 not "exactly" at O5, O7), §11 U6, §13's copy row and intro, §13a's result and consequences, §R5a's F5 row (a parenthetical; §R5a's text otherwise kept) |
| O3 (wording) top-level marks only | §4 E2 "Marks" paragraph and Definition 4.1(d): ignoring marks skips a label's own top-level mark only; arguments, nested marks and nested handler types, are equal by E1 (UnifyMark `pairMarks`, `freshened`; Unify `unifyAt (level + 1)`) |
| O6 (definition) records with several tails | §4 "Records with several tails": written fields plus the disjoint union of the tails' images, field types equal by E1, rigid tails equal as a multiset; **proposed**, reasoned from RowMerge's reference copies, no case; §14 row |
| instances and annotations | §2 "What generation records" and §10: approved for specification (statements only), unbuilt |
| K2 (examples) N1 programs refused for FrameRigid | §12.1's N1 row and §12.2's annotation row: new programs (R ending in a result-only `...s`; an annotation R ending in the caller's `...e`); run today: honest refused for C's `Log` ("defer must not fail, but it performs Ask, whose handler may fail", related "this handler's clauses perform Log, whose handler may fail"), controls accepted; `with Log + pure` in a handler type is E_SYNTAX; graphs unchanged and labelled as graphs; cases.mjs's comment updated |
| K3 (wording) E2 at `defer` | §4 E2 "Labels-only sites": `defer` and every settling consumption other than the installed-C site consume labels with a throwaway tail (Defer.purs `checkDefer`, Consume.purs `consumeLabels`, `consumeLabelsWith`; Settle.purs) |
| K4 (wording) remainder on completed rows | §4 E2 "Tails": completed sources end closed or rigid; the remainder clause dropped as an inference step; copies are matched occurrences of the completed source (reasoned); README limits note updated |
| K1 (potential soundness blocker) | investigated (§13b): E2's rigid clause is unsound with honest packages (abort escapes cleanup, p7/sim7; payload misdirected, p6/sim6; same at installation and clause rows); stronger premise proposed with its completeness cost, not adopted; E2 "Tails" marked; probes in research/amin-k1-probes/ |
| O4 (specification) | two candidate rules J and K written as conditions on completed rows (§13a), compared against Definition 4.1's argument; no separating program; wording finding on "with R's tail"; no ruling |
| U7 | own correspondence check, research/amin-mark-oracle/u7.mjs (§11): rule J agrees with the design on the fixed grammar; both mutants detected; K wider |

## R6. Targeted review of revision 3.4 (2026-10-24): ready for K1's ruling

An independent targeted review (Opus, read-only) at b34bbc0, under
dossier §18.82-18.84, with the author's two added questions (does the
premise close the failure; can it travel through another path). Runs
by the reviewer: run.mjs (exit 0, no disagreement), u7.mjs (exit 0),
the compiler on p1, p8, p9 (refused) and on K2's N1 program and its
control (refused; accepted). Not run by it: mutants.mjs, the Go
simulations (diffed only: sim7 differs from c3.go in the two handler
literals, sim6 from c1.go in the perform). The controller re-read S2-1
(Clauses.purs `file`: `consumeBare` into `setup.clauses`, labels only)
and it holds.

**Verdict.** Ready for the author's decision on K1; not ready for
implementation. With the premise adopted, no S1 found; without it, K1
is the S1 (§13b). The premise closes every demonstrated failure (p6,
p7 at the call stage; p2, p4 at E5; p8, p9 at c_k into R), per
declaration, so callers elsewhere are unaffected; the honest read-back
satisfies it wherever today accepts (today's rigid-stage consumption
fails on leftover target entries, UnifyRow.purs:180-194; reasoned,
matches every probe). Other paths with the premise in place: the
installed-C site, Definition 4.1's equalities, E1 copies, O2, O6,
settling's labels-only sites (but see S2-1), data-type row arguments,
handlers in data fields or effect arguments: closed (reasoned). The F1′
hook: closed for a-min, but see S3-5. Not examined: a ResultC's own
tail (open decision 3), E10 (S3-3). The sufficiency argument checks each
site separately; it is not a substitution lemma for the whole judgment.

**S2.**
- **S2-1. Clause rows into C are defined two ways.** E2's labels-only
  paragraph lists clause rows into C (throwaway tail, no tail
  condition, as Clauses.purs and TailPass `ensure` do); E4 says c_k into
  C uses "E2's conditions", and the premise lists "c_k into R and into
  C". With the premise at c_k into R, E5 and the installed-C count,
  both readings seem to refuse the same programs (reasoned), but built
  literally they are two validators. The K1 ruling should name one.
- **S2-2. The premise removes the only passing inclusion example
  §18.80 requires.** `inclusionN4` uses R ending in the rigid ambient;
  under the premise inclusion survives only for a closed R, which is not
  writable today. A passing case needs a literal whose closed R the
  package chooses, e.g. `with handler State(Int) { get() => 1, put(v)
  => () } { Log.log(1); State.get() }` under `Log + ϱ`, R := ∅ (unrun).
  If adopted: state that inclusion holds only for closed R and add that
  case.

**S3.**
- S3-1 U7's wording: "3,741 pairs" counts pairs whose satisfiability
  differs; 1,944 package evaluations with the annotation shape do
  differ; the ResultC shape (C's tail R's own variable) is outside the
  grammar.
- S3-2 K1's necessity and cost claims are overstated for §14's two
  guarantees: an argument-free X that is N for every valuation (or
  Console only) misroutes harmlessly; the carve-out's rejection rests
  on FX008's positional invariant, so scope necessity to the invariant.
- S3-3 the premise's site list omits `callback` (presumably a call
  site) and E10 (not examined).
- S3-4 "the installed-C site rests on R ≡ ρ" lacks a step: an owned C
  ends in a rigid ϱ its clauses reach only if some clause row ends in ϱ,
  which under the premise forces R to be that row.
- S3-5 §13's exclusion of the F1′ hook as "safe for soundness" depends
  on K1: today TailPass `ensure` constrains only R's end variable, so
  what refuses p8 and p9 today is plausibly the hook closing φ
  (Filing.purs:87; O7); restate the exclusion with the premise as its
  support.
- S3-6 O4's caveat list: in the occurs case a ResultC's tail is R's
  variable, which occurs outside the C-class by definition (harmless:
  counts then equal R's).
- S3-7 stale labels: attempts A and B now run (derived.mjs; today
  refuses them), but §12.2, §14 and §0b item 1 still say "reasoned, not
  run".
- S3-8 O1's wording: "row variables of the operation's declared
  result"; argument rows are closed at resolution (reviewer's probe:
  refused "This function must be pure, but it performs Ask").

**O4 (the author's question).** No separating example, agreeing with
the O4 analysis: in a component of owned Cs Definition 4.1 (d) makes
all R equal; every reader of an owned C's occurrences beyond R's count
is monotone (E5's frame edges, the installed-C count and `assume`,
other Cs, E4's c into C pairing first occurrences); E4′ records C with
R's labels; so truncating a K package gives a J package. Weakest step:
the solved form (§18.76 item 2) must cover bindings as well as images,
so a C binding references no other flexible variable; §2 states it for
image variables only. Semantic difference: under J an installation of
a value typed without C reads C = R_W, which J makes equal to the C of
every owned type the value met; under K, an owned C may hold later-rank
occurrences absent from R_W, constraining only installations that read
that owned type. Since E4 bounds the clauses by R, those occurrences
correspond to no operation any clause performs: K differs from J only
by phantom occurrences (wider on packages, equal on problems). Both
rules read R_W's marks through the alias for every frame a clause
reaches.

**Ledger.** F1 resolved (S3-7 labels); F2 resolved; F3 resolved as
specification; F5 partly (O4 open; Refute/, Strategy/, Decide*,
Entailed* excluded from the audit); F6 resolved by the text; F7
resolved. O1 resolved (S3-8); O2 resolved; O3 resolved; O4 not resolved
(no separating example; author decides); O5, O7 not resolved
(correspondence); O6 partly (reasoned sound and necessary; no case). K1
argument correct, premise closes the demonstrated failures, open on the
ruling with S2-1, S2-2; K2 resolved; K3 partly (S2-1); K4 resolved
(copies are matched occurrences, universal for today's remainder
construction). U7 partly (S3-1).

Checked clean: Definition 4.1 (a)-(d) against the code; E2's argument
and bare-C rules; `Unmarked` only on `Fail` labels; the O1 and O2
encodings; Install `clausesOf` against E5's alias; ResultClauses' tail
rule against §2; the sim diffs; §5's oracle.

Reviewer's rulings: Go simulations not run (not on its list); "unsafe"
read as §14's two guarantees (basis of S3-2); the solved form assumed
to cover bindings (O4 rests on it); S2-1 and S2-2 rated S2, since both
readings seem sound (S2-1 would be S1 if some construct reached c into
C labels-only without c into R).

## R6a. Revision 3.5's resolution ledger (2026-10-24)

Rulings on §R6, dossier §18.85. Statements only; nothing built. Runs in
this revision: `node u7.mjs` in research/amin-mark-oracle/ (exit 0,
6.5 s, counts as §11 U7 states); the code reading for E10 and the c
into C departure at this worktree (src unchanged since 0c2ad60).

| Finding or item | Resolution in revision 3.5 |
|---|---|
| S2-1 clause rows into C defined two ways | one definition: E4's c_k into C is under Definition 4.2 with the tail condition (§4 E4); clause rows into C removed from E2's sites and "Labels-only sites"; the departure from today (Clauses.purs `file`, Consume `consumeBare`, throwaway tail; SettleEntry `toClauses`; TailPass `both`/`ensure` binding only C's end variable) recorded with its reason under Definition 4.2; §13 rows; §14 departure row |
| S2-2 inclusion example lost | inclusion holds only for a closed R (§0a item 3, §4 E5, §14 E5 row); §12.1 closed-R row "added in 3.5 (oracle agent)", built through the recorded-input builder, result filled in §12.1 (honest accepted, near miss refused) |
| S3-1 U7 wording | §11 U7: 12,024 package evaluations differ; 3,741 pairs differ in satisfiability, none with the annotation C's shape; 1,944 annotation-shaped package evaluations differ; the ResultC occurs shape outside the grammar; narrow label of §18.84 item 4 kept; §13a's O4 bullet likewise |
| S3-2 K1's necessity overstated | §13b: necessity scoped to FX008's positional invariant; an argument-free X, N for every valuation, or Console only, misroutes harmlessly for the two guarantees; the carve-out rejected because it breaks the invariant and would be invented |
| S3-3 callback and E10 missing | callback in Definition 4.2's site list (a call or apply stage, Reject `rejected` → Callback `callbackLacks`); E10 settled by reading: no source of its own, a body's ambient row is its declared row (Function.purs `environment`), so E10 is the stage sites (§4 E10; reasoned) |
| S3-4 installed-C step missing | §4 E5 "Installed C under Definition 4.2": a rigid ϱ in an owned C that clauses reach needs a clause row ending in ϱ, which forces R to that row and ρ to R; an owned C's tail set to ϱ otherwise only adds FrameRigid (reasoned); §14 installed-C row |
| S3-5 F1′-hook exclusion depends on K1 | §13 exclusion restated: supported by Definition 4.2 at c_k into R and C; today the hook's closing of φ (Filing.purs:87) plausibly carried the obligation E2 as written lacked (reasoned, not instrumented) |
| S3-6 O4's caveat list | §13a: in the occurs case a ResultC's tail is R's own variable, occurring outside the C-class; harmless, since counts then equal R's |
| S3-7 stale labels on attempts A and B | §0b item 1 (a parenthetical), Definition 4.1's justification, §12.2's two rows, §14's Definition 4.1 and C ≡ C rows: bounded (derived.mjs), today refuses both (run) |
| S3-8 O1's wording | §4 "Where E1 is recorded": row variables of the operation's declared result replaced by the closed row; the label's argument rows closed at resolution (the reviewer's probe) |
| O4 (the author's question) | rule J (decided): Definition 4.1(d) says the alias is R itself, its own tail variable (wording finding resolved); rule K kept in §13a, its equivalence unestablished, weakest step the solved form for bindings (U8); §2, §5, §11 U6, §13 copy row note the decision |
| K1 | adopted as Definition 4.2 (§4); E2 "Tails" refers to it; §13b records the adoption and qualifications; §12.1 N4 flipped; §14 row replaced |
| §18.85 item 1 (K1 adopted) | Definition 4.2; "What a refusal means" paragraph; lost acceptances s1, p1, FX027's program, p9 as validator limitations |
| §18.85 item 2 (S2-1, departure) | as S2-1 above |
| §18.85 item 3 (rule J) | as O4 above |
| §18.85 item 4 (solved form for bindings) | not extended in prose; inspected: not enforced today, confirmed by a run (§11 U8: gap, proposed invariant and fixtures, unimplemented); referenced from §13a's weakest step, §2 and §5 |
| §18.85 item 5 (S3 fixes, N4, §14, closed-R control) | S3 rows above; §12.1 N4 row flipped and closed-R row added (no result claimed); §14 rows replaced or updated |
| §18.85 item 6 (qualifications) | §0d item 7 and §13b's "Qualifications": compatibility rests on probes and reasoning; a ResultC's own tail unexamined; E10 settled by reading only; K1 does not establish the whole judgment's soundness |
| §18.85 item 7 (bring back open obligations and check results) | for the controller: U8's inspection, the closed-R control's result, the oracle's N4 case under Definition 4.2; open still: O5, O7, O6 (no case), U2-U5, open decisions 1, 3, 4 (§14) |

## R7. Approval review of revision 3.6 (2026-10-25): ready with conditions

One independent read-only review (Opus), the tranche's stopping point
(closure checklist, critical path 1f); no revision 3.7 follows
automatically. Probes: research/amin-o6-probes/o6g-o6k and
research/amin-resultc-probes/review36/ (`.wxw.txt`); the controller
reran o6g (accepted), o6i (refused), aroundBothE (refused, "Expected
nofail(k) Log, found Log") and r1E (accepted) on this branch's build.

**Verdict.** No S1. The representation is approvable with conditions:
(a) S2-1; (b) S2-2; (c) S2-3 and S2-4; (d) the author's ruling on
fresh-tail ResultC uses. By 1f's criterion, (a)-(c) need a text fix or
the author's waiver before approval.

- **S2-1.** §4 E5 ("unless the frame is N (Console, …)") and §13's
  exclusions still state the Console frame guard that §18.86 overruled;
  §14 decision 1's heading says "open" and the compatibility-only list
  keeps the guard. Unreachable today (FX011); reachable when FX011
  lifts. With the guard gone, "Console labels N" refuses every failing
  user Console handler once FX011 lifts: revisit with that row.
- **S2-2.** O6's "no case constructible today" (§0e item 5) is false:
  two-rigid-tail record equalities are constructible (o6g, o6h
  accepted; o6i missing tail, o6j field mark, refused; observed). Only
  flexible-tail unfolding through calls is not (o6d-o6f, o6k).
- **S2-3.** O-SUB and A1 are obligations of the whole judgment (every
  polymorphic use, H′'s occurs case via P3, E5's installed-C step,
  Definition 4.2), not of the fresh-tail case. Only P4 is specific to
  the fresh-tail case; refusing fresh-tail uses removes only P4.
- **S2-4.** In §0e's table U4 is a soundness obligation (§8 S2), not
  completeness; O5 and O7 widen acceptance and need their exclusion
  arguments (bare-C; Definition 4.2 standing in for the F1′ hook);
  rows missing: O-SUB, U6/P1 (coverage, fixtures and mutants never
  run, including generation computing H′), U7 (correspondence only),
  P2 with the §13a audit's scope (Refute/, Strategy/, Decide*,
  Entailed* outside it).
- **S3.** "Always R's tail" emulated: aroundBoth refused, r1, r2, r9
  accepted (observed), replacing §0e item 2's "unestablished";
  `node k1.mjs` prints nothing, the closed-R line comes from run.mjs
  (§12.1's reruns paragraph is wrong on this; controller's error);
  §11 U8's heading and §2/§5's "rests on U8" need "extension to effect
  rows" wording; §14 decision 3 still asks for an example x1 now
  provides; the rule-J ResultC tail row should cite resultc-tail P9;
  E10's reading is itself a coverage claim; H′/RC′ missing from
  "Novel, for approval"; "probe r1" ambiguous with Review 2's r1;
  §0e item 7 should say "intended guarantees" (FX032 still open).

**Recommendation on fresh-tail uses (reasoned).** Do not certify them
until P4 is argued and reviewed: the cheapest restriction is a
validator-only "always R's tail", losing aroundBoth (pinned corpus
program) and k2f, keeping r1, r2, r9; it affects shadow certification
and A6 only, not live behaviour. No corpus-wide count exists.

**Effect-contract independence.** No §14 row settles one of the five
decisions (reasoned). Coupling points that would need amendment: E8
and "Console labels N" (decisions 2-4); E4's own-abort rule and E6,
which treat `Fail` as the only typed abort (decisions 1-2).

## R7a. The §R7 fix pass (2026-10-25)

The author ratified correcting all four S2 findings rather than waiving
them, with the S3 items, and "always R's tail" as a provisional
shadow-validator restriction. Text only; no design change intended.
Approval follows the author's inspection of this diff against §R7's
conditions; no further review cycle unless the correction changes the
design.

| Finding | Resolution |
|---|---|
| S2-1 Console guard text | §4 E5 states frame edges for every frame, Console included; §13 no longer excludes Console frames and notes the "Console labels N" consequence once FX011 lifts; the compatibility-only list drops the guard; §14 decision 1's heading says ruled |
| S2-2 O6 | §0e item 5 and §13a O6: testable for rigid tails (o6g-o6j), flexible-tail unfolding not constructible; oracle cases owed; FX034's location noted |
| S2-3 O-SUB and A1 | §0e item 2: only P4 is fresh-tail-specific; O-SUB and A1 are whole-judgment; table splits the rows |
| S2-4 table | U4 relabelled soundness; O5 and O7 "yes (argued)" with their exclusion arguments; rows added for O-SUB, U6/P1, U7, P2 and the audit scope; E10 as a coverage claim; rule J ResultC tail cites P9 |
| S3 stand-in results | §0e item 2: aroundBoth and k2f refused, r1, r2, r9 kept (stand-in); r1, r2, r9 exercise the fresh path but do not require a fresh tail |
| S3 k1.mjs attribution | §12.1 reruns paragraph corrected |
| S3 U8 wording | §11 U8 heading; §13a and §11 U6 cite U8's extension to effect rows |
| S3 decision 3 | example exists (x1); argument written as RC′; provisional restriction recorded |
| S3 Novel list | H′ and RC′ added |
| S3 "probe r1" | names test/fx008-defer-programs.mjs |
| S3 "today's guarantees" | "intended guarantees"; coupling points E8, Console-N, E4 own-abort, E6 named in §0e item 7 |
| Ruling: always R's tail | §0e item 2 and §14 decision 3; qualifications kept: removes P4 only where it prevents freshening, discharges no whole-judgment obligation, stand-in evidence only, losses visible under A6 (closure checklist) |

## R7b. E4′'s restriction procedure clarified (2026-10-25)

The author ratified one focused clarification, not a review cycle.
§R7a's E4′ wording rejected every ResultC recorded with a fresh tail
under H′. The stand-in that produced the evidence instead forces the
R-tail choice and then checks the resulting constraints. The two
procedures differ: r1, r2 and r9 exercise H′'s fresh path and survive
the stand-in, so their survival was no evidence for blanket refusal.

The ruled restriction is forcing: E4′ now binds a recorded fresh tail
to R's tail variable and checks; it refuses only when the constraints
fail. Blanket refusal is recorded as a stricter alternative that is
not the ruled one; its losses (r1, r2, r9 and more) are unmeasured.
Corrected: E4′, §0e item 2, the carried-obligations table's P4 row and
§13's E4′ row. The stand-in claims and A6 already describe forcing.
The representation stays acceptable with the named obligations open;
approval still waits for the author. No implementation is authorized.

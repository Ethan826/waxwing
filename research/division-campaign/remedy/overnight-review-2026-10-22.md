# Overnight work, 2026-10-21/22: what to check

Everything below is on local `main` (worktree `.claude/worktrees/
integrate`), from f7931ce to the commit that adds this file. Nothing is
pushed; `origin/main` is still 67ba706. Documents and statements only:
no compiler change, no new Lean proof. `node scripts/width.mjs` passes.
Diff for review: `git diff f7931ce main`.

Every document was written by subagents and then reviewed by other,
read-only subagents. The reviews found nothing blocking, and their
findings were applied. Those reviewers are the same kind of model as
the writers, so an outside check is still worth doing. The items most
worth checking come first in each section.

## 1. Inference foundations: assessment corrected, companion added

Files: docs/plans/2026-10-22-inference-foundations-assessment.md
(corrected) and docs/plans/2026-10-22-inference-foundations-
extension.md (new). Commits 7661170, 4ce8f74, 95b809b, 453356c.

Check first:

1. **The matrix statuses** (assessment §11, 63 rows: proved 2,
   argued 20, experimentally checked 1, proposed 16, unresolved 24).
   - Is each "argued" row really argued, or only proposed?
   - O31, O32, O37, O38 and O48 stayed "argued" because each row was
     split: the argued finding is in the row, and the proposed
     obligation moved to "Next action" or was made conditional on D1.
     The status reviewer had suggested "proposed"; I chose the split.
   - O15 is "experimentally checked" for a narrowed claim only.
2. **The recommended foundation**: EMLTI's presentation of HM(X), with
   Waxwing's row model as X (companion §1.4). It rests on O24
   (unresolved): that Waxwing's model is an EMLTI model and that
   EMLTI's ground inclusion coincides with `ValidOpen`.
3. **HM(X) against the 1999 journal version.** TAPOS 1999 (EPFL
   preprint) is cited as authoritative. Its completeness theorem,
   Theorem 12 on p. 13, needs X in 𝒳^a or 𝒳^r, a realizable Γ and
   satisfiable judgments. The workshop paper's Theorem 2 lacks these.
   Sulzmann's proofs [Sul97] could not be accessed.
4. **§9 case A.**
   - Under the substitution order, the written `submit` signature is
     not an instance of the inferred one. Under EMLTI's order it is,
     on O24's assumption.
   - "No principal writable `where` clause exists" rests on a bounded
     script run in a scratch copy (labels only), not recorded in the
     repository.
5. **IF6** now gives a determinacy criterion: evidence-relevant
   projected variables must be determined. It also says what happens
   when the criterion fails. An earlier false sentence (that a
   determined variable satisfies the hole contract) was removed.
6. **Author corrections from the queued request:**
   - forcedness is determinacy (Jones's unambiguity), not coherence;
   - OutsideIn(X)'s principality-on-success coexists with its
     incompleteness;
   - O8 now separates normalization equivalence from C1-M's
     monotonicity;
   - "no source" now means none of the sources read;
   - the proved claims are tied to their theorems (now
     `openCharacterization_scoped`, with its premises);
   - `d5_refused` is evidence about the cell checker only.
7. **Citations the audit corrected** (worth a spot check):
   - Koka 2017 Theorem 1: as printed, it claims a closed well-typed
     term never gets stuck, but a closed `op(v)` whose label is in ε
     is well typed and stuck.
   - OutsideIn(X): non-derivability rests on VarCon's term
     instantiation (Fig. 10, p. 25), not on BindA.
   - A quotation attributed to Jones–Gomard–Sestoft was not in the
     book and is now a paraphrase. A Pottier quotation had been
     spliced in reverse order.
   - EMLTI's open-world remark is on printed p. 423.
8. **Claims still taken from reader reports without checking**
   (companion §12):
   - the Martin–Nipkow, Flix, Pottier LICS and Simon readings reused
     from the repository;
   - ENC-S/ENC-C and the O(2^d·|R|) estimate;
   - the injectivity step in Jones's Theorem 5;
   - Inferno's letrec elaboration;
   - Leroy's Definitions 5-7 and Theorem 4;
   - JGS §5.5.1;
   - Koka 2017 Fig. 1.
9. **New combinations under ADR 014** (companion §8). Is anything that
   is invented machinery presented as composition?
10. **Author decisions** (companion §10): D1 (read-back versus a
    Pottier-style generation continuation), D2 (instance order and
    scheme language), D3 (when to state decision 6's C8 argument), D4
    (guards: wait, per decision 7). D5 is a recorded default; D6 is
    deferred with G2. Does each decision set out its options and
    consequences before asking?

## 2. R0 design tranche: reviewed and revised

Files: research/division-campaign/r0/{generation-interface,
recorder-rules,refusal-audit,boundaries}.md, witness/statements.md,
refute/statements.md. Dossier §18.67 (docs/plans/2026-10-20-record-
composition-dossier.md). Commits 3b2ebb8, 26ae371, f3858f8, f408670,
168d446, 8e274af, 2b73666, 6c65c2f, e1487a4, 61565ac, 8d3373a, 2443479.

Check first:

1. **Dossier §18.67's twelve author questions and their defaults.**
   Are they faithful to the documents? Q4's interim defaults (Resolve
   keeps refusing) and the Q7 and Q10 items were restored after a
   review.
2. **Type ownership.** T-R0a owns `CompileRefusal` (§6), W owns
   `Witness`, `SplitJudgement`, `AdmStatus` and Sc1-Sc3, and T-R0e owns
   `Construct` and the layers. Check that no document still defines a
   rival type.
3. **Choices I made as coordinator:**
   - R10: the post-Task-8 refusal is T-R0e's `ComposedTailsUnjustified`.
   - R11: T-R0e §7 gained a "was" column instead of edits to the
     documents that cite its old numbers.
   - `Inadmissible CallSite Int`: the `Int` is the callee's `VarId`.
   - `AdmittedStatus` (two constructors) is separate from W's
     three-constructor `AdmStatus`.
   - `type Site = Path`.
   - `AdmissionLimit LimitAt`.
4. **The verdict rules in T-R0a §5.3.**
   - Rule 1′ (second spread) applies only if the author classifies a
     second spread as S1. Until then Resolve refuses it, so the rule is
     not reached.
   - Rule 3 now gives `Unsupported` ahead of `Limit` and `Inference`
     when rule 1 or 1′ applies.
   - The verifier's first wording of rule 1′ contradicted §18.67 Q4,
     so the rule changed twice.
5. **The second spread at the verdict stage**: it is
   `Unresolved (Unsupported [SecondSpread])` when nothing else decides.
   The syntax alone supplies no contradiction, but a separately
   justified one may still be reported (§18.65; corrected after the
   external review, §18.68).
6. **Notes added from the inference extension** (2443479):
   - FK-0's target property is JGS's bounded static variation;
   - RC in Leroy's terms: a validator for a weaker property;
   - forcedness versus coherence in T-R0e layer P;
   - "interfaces before selection" as a proposed clause.

   EL3 and the D1-dependent items were not applied.
7. **CX's Lean statements** (CX-K, CX-P, CX-KP, CX-PR) build, from
   cache. They contain no theorem, `sorry` or axiom.

## 3. Cross-references and records

Commits 39320ad and a50db11 cover INF001, the assurance register,
source traceability and the BACKLOG INF001 and AS001 rows; check that
their counts match assessment §11. Commit b08c4d4 adds the progress
lines, and the resume note (RESUME.md §6) records this night's state.

## 4. Correction pass after the external review (2026-10-22)

Commits 7e4a763 through the one that adds this section. The six issues
and how they were answered:

1. **O24 and partial composition.** New note:
   docs/plans/2026-10-22-o24-emlti-correspondence.md. Disjoint
   composition cannot be an EMLTI constructor (Def. 10.2.5, p. 411),
   so it is encoded as a ternary predicate U with total constructors.
   The lemma statements M0, T1, T2, V, GI, GI-Open, GI-Atoms, GI-Fin
   and F are proposed; none is proved. O24 moved from unresolved to
   proposed.
   - Check T1 (rewritten after a review) and GI-Open's "family
     reading" of EMLTI's order. That reading is flagged as a new
     combination under ADR 014.
2. **D1 coverage.** "By construction" is gone. Three mechanisms are
   offered: (a) a statically declared read set, rejected when the
   value is built; (b) problem-scoped handles; (c) a coverage theorem
   over an independently fixed domain. O31 is now proposed.
3. **Strategy order.** T-R0a §5.3 now states only what soundness
   gives.
   - Option A (a refused candidate doesn't stop the run) and option B
     (order-dependence documented) are Q13 in dossier §18.68, with no
     default.
   - Option A's order-independence holds only under stated premises.
   - AT7's transitions were rewritten.
4. **R019 after Task 8.** This is an explicit compatibility decision
   with three options and no default (T-R0e §1.4; dossier Q5 amended).
   A probe is proposed before deciding.
5. **The bounded "no principal writable clause" result** is narrowed
   to what the scratch search showed; the universal claim is
   unresolved.
6. **Unsupported syntax** alone supplies no contradiction; a separately
   justified one may still be reported. The documents now say this
   consistently.

The review's D1-D6 recommendations are recorded as the reviewer's,
pending your confirmation (dossier §18.68; companion §10). Blanket
acceptance of Q1-Q13 and the implementation plan are held. Counts: 63
rows, 2 proved, 19 argued, 1 experimentally checked, 18 proposed, 23
unresolved.

One read-only review checked the correction pass (nothing blocking;
16 findings, all applied in the last commit). The last commit itself
was not re-reviewed.

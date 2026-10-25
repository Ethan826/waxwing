# A2: the trusted effect validator, options note (draft, 2026-10-25)

Status: **options for the author's choice; nothing chosen, nothing
authorized.** Closure checklist path 2 step 2c, row A2. Drafted with
the tranche 1 plan (docs/plans/2026-10-25-amin-tranche-1-plan.md) so
that inputs the validator needs are recorded by tranche 1 rather than
added later. Spec: docs/plans/r0-amin-statements.md (approved as a
representation at 535b780), §4 (obligations), §5 (marks), §6 (holes),
§7 (pipeline), §11 U8.

## What A2 decides

1. The algorithm of `validateEffects`, `certify`'s step (c): how a
   completed package is judged against E1-E12, with the published
   source and fidelity of each part.
2. The interim policy before the validator exists (F14).

It does not decide the read-back (tranche 2), I3's package checks
(their content is fixed by the statements) or any language policy.

## Trusted check and untrusted search, kept apart

The statements fix the split (§1, §8 S3; decided §18.76): soundness
holds for any candidate from any strategy, forged ones included. So:

- **Trusted:** `validateEffects` judges one completed package. It
  solves nothing: every binding and every mark term is given, and each
  obligation is a condition evaluated on them (§4: "none is an
  instruction to extend, bind or merge"). A defect here can certify a
  wrong program.
- **Untrusted:** the search that proposes the package, including the
  least mark terms (§5, "Two solutions, kept apart"). A defect there
  can only lose acceptances: the validator refuses a bad package.

This is the certifying-algorithm pattern: an untrusted producer, a
witness, and a small trusted checker [MMNS11]. Every option below keeps
it; they differ in what the trusted side recomputes.

## Components and their sources

| Part | What it checks | Source | Fidelity |
|---|---|---|---|
| V0 architecture | witness plus independent checker | [MMNS11] | faithful |
| V1 settling | holes to lowering's defaults before every obligation (§6) | certify argument C1-C2, extended (U4) | Waxwing rule; the ∅ default is flagged novel (§11) |
| V2 solved form | bindings for effect rows and marks are in solved form (U8's extension) | solved forms of unification problems [BS01] | faithful; extends the existing `solvedForm` (Strategy/Witness.purs) |
| V3 row equality | rows equal up to scoped-label order (E1) | [L05] | faithful |
| V4 consumption | per-key matching, the side condition, Definition 4.2 (E2, E4, E5, E10) | FX001/FX008 design | Waxwing-specific; flagged novel (§11) |
| V5 handler types | Definition 4.1 with rule J | FX008 §3.4, §5; rule J (§18.85) | Waxwing-specific |
| V6 marks | `holds` per edge on normal forms; `norm` equality per E1 mark pair (E12) | §5's argument; the satisfiability it mirrors is atomic constraints over a finite lattice [RM99] | adapted: the term check is derived (universal argument, bounded oracle), not published |
| V7 predicates | E6 (`defer`), E8 (entry), E9 (`Fail` heads concrete) | today's rules (Defer, Entry, Failure) | Waxwing-specific, direct |

V4, V5 and V6's term check are the Waxwing-specific parts; §11 already
lists them for ADR 014 approval. Nothing here adds a new one.

## Options for the mark check (V6)

**M-A. Check the package's mark terms, edge by edge.** For every edge
`x ⊑ y` that E2-E6 generate, `holds (norm x) (norm y)`; for every E1
mark pair, `norm` equality. Trusted code: normalization and a subset
test. This is the evidence model the approved representation states
(§5, `sites` carrying terms; §8 S3). Universal argument given P1-P3;
the bounded oracle (research/amin-mark-oracle) agrees on about 17.5M
graphs and detects three mutants.

**M-B. Recompute the path criterion inside the validator.** Build the
classes by union-find [Tar75] over E1 equalities and callee-k sharing,
then refuse when a forbidden path exists (FX008 step 5), ignoring the
package's terms. More trusted code (graph construction, union-find,
reachability) and no evidence to check; the package's mark terms
become unused. A departure from the approved representation's
evidence model, so it would need a ruling.

**M-C. M-A as the gate, M-B as a test-only differential.** The gate is
M-A; a test runs M-B (independent code, not today's Mark.purs
`violation`) on the corpus and requires the two verdicts to agree on
every honest package. Keeps the trusted base at M-A's size and gives
corpus-wide evidence for §5's claim beyond the oracle's grammar.

Recommendation (for the author to accept or reject): **M-C**. It keeps
the approved evidence model and the smallest trusted base, and the
differential tests the correspondence claim on real programs, which
the bounded oracle cannot.

## Options for rows (V3-V5)

**R-A. Evaluate each obligation on the substituted rows.** After V1
and V2, substitute bindings, normalize each row to its labels grouped
by key with per-key order kept [L05], and evaluate E1, E2 and
Definitions 4.1 and 4.2 directly. Each obligation is checked
independently, so a failure names its obligation (`ObligationFailed`).

**R-B. Encode effect rows as G0 atoms and reuse G0.** Rejected: G0
judges record rows, where a label occurs once and equality is the
relation. Effect rows allow repeated labels, compare by scoped order
and use consumption, not equality. The encoding would be invented
machinery standing between the obligations and a checker built for a
different relation.

Recommendation: **R-A**, the only option that evaluates the
statements' conditions as written.

## Interim policy before the validator (F14)

Ruling §7.1 item 2 (r0-erased-rows.md, 2026-10-23): every declaration
that reaches lowering has its effect obligations validated against the
witness used to build its checked representation; today's joint
checker supplies that validation for the strategy that runs it.
Shadow runs one strategy, `online`, which is that joint checker
(Decide/Shadow.purs). Proposed interim, stated explicitly:

1. While `online` is the only strategy, its acceptance stands, with
   effect assurance labelled "joint checker, untrusted" as §7.1 item 2
   says.
2. Any other strategy added before the validator: a Solved on a
   declaration with a non-empty `obligations` list becomes
   `EffectsUnchecked` (rule 1), so no candidate from it is certified
   with unchecked effects.
3. `Outside HandlerType` keeps every handler declaration blocked until
   the validator exists (tranche 1's boundary).

Item 2 is implementable in tranche 1 once obligations are recorded,
but no second strategy exists, so the plan leaves it to the tranche
that adds one.

## Inputs the validator needs, for tranche 1

Each item is either already in the statements or added by this note
(marked **new**). The plan's Tasks 1-9 record all of them.

1. Consumption obligations carry `marks` (ignore or not) and `bare`
   (§10), and **new:** the site's kind, so V4 applies Definition 4.2
   exactly at §4's listed sites and treats labels-only sites (`defer`,
   deferred rows) as closed sources.
2. **New:** each ResultC's tail variable identifiable as the use's own
   `⟨p, result clauses⟩` (its `VarInfo` origin), with R's tail variable
   in the same recorded instance type, so E4′'s forcing (§R7b) binds
   one to the other from the record alone.
3. **New:** a `flexEff` list of flexible effect-row variables beside
   `flexTy` and `flexRow`, so V2 and I3's domain check (N10) know every
   recorded effect-row position and its sort.
4. **New:** the set of mark positions (frame, `HandlerLit` m,
   `Opened`, `Annotation`, `Instantiated` k), recorded as a list rather
   than rediscovered from obligations, so the domain check compares two
   recorded sets.
5. `rigidMarks`, `effectRigids`, arities and ambient rows (§10).
6. `instances` and `annotations` with owned Cs (§2), referenced from
   E1 by site.
7. `Entry` only for `main`; `FailConcrete` at each `Fail` payload.

Items 1-4 change Task 1's types; none changes the approved
representation's meaning, which already names these facts. If the
author rules any of them out, the plan's Task 1 shrinks with it.

## Questions for the author

1. Mark check: M-A, M-B or M-C.
2. Rows: R-A (R-B is listed as rejected).
3. Interim policy items 1-3 as stated, or amended.
4. Inputs 1-4 recorded in tranche 1.

## References

Citations come from the repository's existing references and the
statements' reviews; they were not re-read against the sources for
this draft.

- [BS01] F. Baader, W. Snyder. Unification theory. Handbook of
  Automated Reasoning, ch. 8, 2001 (solved forms).
- [L05] D. Leijen. Extensible records with scoped labels. Trends in
  Functional Programming, 2005.
- [MMNS11] R. M. McConnell, K. Mehlhorn, S. Näher, P. Schweitzer.
  Certifying algorithms. Computer Science Review 5(2), 2011.
- [RM99] J. Rehof, T. Mogensen. Tractable constraints in finite
  semilattices. Science of Computer Programming 35, 1999.
- [Tar75] R. E. Tarjan. Efficiency of a good but not linear set union
  algorithm. JACM 22(2), 1975.

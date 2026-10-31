# A2 decision packet: the trusted effect validator (2026-10-31)

Status: **a packet for the author's decision; nothing chosen, nothing
implemented, no soundness claim.** Prepared under the overnight
authorization of 2026-10-30 (docs/plans/2026-10-30-overnight-
authorization.md, stream 3: documents and source verification only).
It builds on the options note (docs/plans/2026-10-25-amin-a2-options.md)
and the approved representation (docs/plans/r0-amin-statements.md,
revision 3.6 with §R7b and the 2026-10-30 amendments). Code citations
are to base f6aeda4 (branch r0-t2-d1). Task 9 (HandlerLit and Install
recording) is being implemented in parallel; where the validator reads
its records, this packet describes them as the statements and the Task
9 design note (docs/plans/2026-10-30-task-9-literal-design.md) give
them, not as built.

Labels used here, as in the statements: **decided** (the author's),
**universal** (an argument for all inputs), **bounded** (a check over
finite inputs, named), **observed** (a run), **reasoned** (an argument
from reading, checked by no run), **unrun** (a predicted outcome),
**open**. For components: **published** (a source states it),
**derived** (a Waxwing argument from published parts), **checked**
(bounded evidence exists), **unresolved**.

Nothing in this packet turns bounded or experimental evidence into a
soundness claim. The validator's soundness rests on the obligations in
statements §0e's carried table (O-SUB, A1, [FX008-5], Definition 4.2's
sufficiency, U4, U6/P1 and the rest), all still open.

## 0. Summary for the author

- **Sources.** Of the nine primary sources the options note and the
  statements cite for a validator component or its alternatives, four
  were read and confirm the cited claim (Baader-Snyder, Leijen 2005,
  Tarjan 1975, Biernacki et al.), three were read in part or through
  another version (Leijen 2017 as the 2016 technical report, McConnell
  et al. through Mehlhorn's slides, Gaster-Jones by abstract), and two
  could not be read (Rehof-Mogensen, paywalled, abstract seen only in
  secondary records; Dowling-Gallier, not cited today). One citation is
  unconfirmed: "Leijen's `inject`, POPL 2017" does not occur in the
  2016 report (§1).
- **Two fidelity labels in the options note are too strong** (§1, §8):
  V2's solved form is BS01's solved form plus a Waxwing restriction
  (images over declared rigids and holes only), not BS01 alone; V3's
  row equality is Leijen's relation with labels compared by key, as in
  Leijen 2017, plus marks, so "adapted", not "faithful".
- **One conflict** between the options note and the statements: the
  options note refuses a package binding of `⟨p, result clauses⟩` as
  `Malformed`, while statements §2's ownership table says the package
  holds that binding when the variable is the tail (§8, finding F1).
- **Recommendation** (§4; for the author's decision): M-C (M-A gated,
  M-B as an independent test-only differential) with R-A, E4′ forcing
  as §R7b fixes it, and the interim policy F14 items 1-3, with three
  additions the author would need to rule on: an explicit package type
  (Q4), an independent edge collector for the differential (Q5), and
  refusal constructors that keep validator limitations apart from
  obligation failures (Q10). Runner-up: M-D (both checks gated).
- **Blocking dependencies** for any implementation: no package type
  carries effect bindings or mark terms today (`Substitution = Map Var
  RTExpr`, src/Features/Check/Strategy/Candidate.purs:31); no read-back
  produces them (tranche 2); every handler declaration stays blocked by
  `Outside HandlerType`; Task 9's records are in progress.

## 1. Primary-source verification

Access date for every row: 2026-10-30. "Read" means the passage was
read in the fetched text, quoted or paraphrased below; nothing is
marked verified that was not read. Downloaded files were kept in the
session's scratch directory and are not part of the repository.

| Key | Bibliographic data | URL or DOI | What is cited, where | What the source says (read) | Verdict |
|---|---|---|---|---|---|
| [MMNS11] | R. M. McConnell, K. Mehlhorn, S. Näher, P. Schweitzer. Certifying algorithms. Computer Science Review 5(2):119-161, 2011 | doi:10.1016/j.cosrev.2010.09.009; slides https://people.mpi-inf.mpg.de/~mehlhorn/ftp/WuhanFAW.pdf | options note "V0 architecture": an untrusted producer, a witness and a small trusted checker | The paper itself was not accessible. Mehlhorn's slides (an author's talk) state, p. 7: a certifying program "returns the function value y and a certificate (witness) w", and "there is a simple program C, the checker, that verifies the validity of the proof"; p. 19: W is a witness predicate for f when "∀x, y (∃w W(x, y, w)) iff (y = f(x))", W is trivially decidable, and "W(x, y, w) ⟹ (y = f(x)) has a trivial proof" | **partly**: the pattern is confirmed from an author's slides, not the paper; the paper's section numbers are unchecked. Fidelity note in §2: Waxwing certifies only acceptances (a one-sided witness); refusal is not certified |
| [L05] | D. Leijen. Extensible records with scoped labels. Trends in Functional Programming 6, 2005, pp. 179-194 (draft read: revision 76, 2005-07-23) | https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/scopedlabels.pdf | statements §4 ("rows are compared up to scoped-label order"), §14; options note V3 | §3.1, Figure 1: rule (eq-swap) lets the first two fields of a row be swapped "if (and only if) their labels are different", so a field can be moved "repeatedly to the front of a record, but not past an equal label"; §3.2: duplicate labels are kept and `{x :: Int, x :: Bool}` and `{x :: Bool, x :: Int}` are "not equivalent". §7.1, Theorems 1-2: row unification is sound and complete | **verified** for equality up to permutation of distinct labels (draft; the TFP proceedings text was not accessed). Fidelity note in §2: Waxwing compares labels by key, not by label with type |
| [L17] | D. Leijen. Type directed compilation of row-typed algebraic effects. POPL 2017, pp. 486-499 (read: Microsoft technical report, August 2016) | https://www.microsoft.com/en-us/research/wp-content/uploads/2016/08/algeff-tr-2016-1.pdf | statements §14: effect safety for row-typed effects with scoped labels; an operation goes to the innermost handler of its label; §13b: Leijen's `inject` | §3 (report): the row equivalence "is essentially the same as for the scoped labels record system [21] with the difference that we ignore the type arguments when comparing labels", and duplicate labels are allowed (`⟨exc, exc⟩` differs from `⟨exc⟩`). §4.2: "only the innermost handler containing a clause for op, can handle the operation". §4.3, Theorem 1 (semantic soundness) and Lemma 4b (an operation of l in a well-typed context has l in its effect). No occurrence of `inject` or `mask` in the report | **partly**: the effect-safety and innermost-handler claims are confirmed in the 2016 report, not the POPL text. The `inject` citation in statements §13b is **unconfirmed** (absent from the report; POPL version not accessed) |
| [BS01] | F. Baader, W. Snyder. Unification theory. In A. Robinson, A. Voronkov (eds.), Handbook of Automated Reasoning, vol. I, ch. 8, Elsevier, 2001 | https://www.cs.bu.edu/fac/snyder/publications/UnifChapter.pdf | options note V2: "solved forms of unification problems [BS01]; faithful" | §2.2.3, p. 448: "An idempotent substitution {x1 ↦ t1, ..., xn ↦ tn} may be represented by a set of equations {x1 ≐ t1, ..., xn ≐ tn} in solved form, i.e., where each xi has a single occurrence in the set." Lemma 2.2 (p. 450): every sequence of rule U's transformations ends in ⊥ or a solved-form system; Corollary 2.3: the result is idempotent | **verified** for the definition; **citation too strong** as used: BS01's solved form permits an image to mention a variable outside the domain, which U8's `solvedForm` refuses. The BS01 part corresponds to `generic` (Candidate.purs:33-44); the rest is the decided restriction of §18.76 item 2 (§2, §8 F2) |
| [RM99] | J. Rehof, T. Æ. Mogensen. Tractable constraints in finite semilattices. Science of Computer Programming 35(2-3):191-221, 1999 (SAS 1996, LNCS 1145) | doi:10.1016/S0167-6423(99)00011-8 | options note V6: "the satisfiability it mirrors is atomic constraints over a finite lattice [RM99]" | Not readable (publisher 403). Crossref confirms title, authors, volume, pages. Secondary records give the abstract: definite inequalities over a finite meet-semilattice, generalizing Horn clauses, satisfiable in linear time; any strict extension NP-hard. A slide summary (not by the authors) describes the solver as computing the least solution and then checking constant upper bounds | **not accessible** (primary). The secondary abstract is consistent with the cited satisfiability claim; it does not cover the quantification over every valuation of rigid marks, which §5's argument adds (§2) |
| [Tar75] | R. E. Tarjan. Efficiency of a good but not linear set union algorithm. JACM 22(2):215-225, 1975 (read: UC Berkeley memo ERL-M434, 1974-03-28) | doi:10.1145/321879.321884; https://www2.eecs.berkeley.edu/Pubs/TechRpts/1974/Archive/ERL-m-434.pdf | options note M-B: union-find over E1 equalities and callee-k sharing | Abstract (memo, p. 1): FIND and UNION on disjoint sets; for O(n) instructions, k1·n·α(n) ≤ t(n) ≤ k2·n·α(n), α a functional inverse of Ackermann's function | **verified** (memo version; JACM bibliographic data confirmed by the MIT JACM bibliography) |
| [DG84] | W. F. Dowling, J. H. Gallier. Linear-time algorithms for testing the satisfiability of propositional Horn formulae. J. Logic Programming 1(3):267-284, 1984 | doi:10.1016/0743-1066(84)90014-1 | not cited today; a candidate foundation for M-B's per-valuation check (two-point atomic constraints are Horn clauses) | Only bibliographic data and the abstract's first sentence seen in index records; the paper was not read | **not accessible**; not relied on by any claim here |
| [GJ96] | B. R. Gaster, M. P. Jones. A polymorphic type system for extensible records and variants. Tech. report NOTTCS-TR-96-3, University of Nottingham, 1996 | https://web.cecs.pdx.edu/~mpj/pubs/polyrec.html | statements §13b: "lacks constraints on ϱ" as a sound relaxation of Definition 4.2 (a language feature, not a validator part) | Abstract (index pages): records and variants typed with predicates on types that capture presence or absence of fields, on qualified types | **partly** (abstract only): consistent with "lacks constraints" |
| [BPPS18] | D. Biernacki, M. Piróg, P. Polesiuk, F. Sieczkowski. Handle with care: relational interpretation of algebraic effects and handlers. PACMPL 2(POPL), article 8, 2018 | doi:10.1145/3158096; https://ii.uni.wroc.pl/~ppolesiuk/papers/popl18.pdf | statements §13b: "masking that skips a frame" as a sound relaxation (a language feature) | §1, p. 4: "we introduce a new construct, lift, written [−]l, which dynamically creates a new occurrence of a particular effect l in the type, pushing the original occurrences deeper in the row"; §4.4 generalizes it | **verified** for the cited claim |

Not cited by the options note or the statements, so not verified:
Rémy's record rows (named in ADR 014 as an example; no A2 component
rests on them), Tarjan's 1972 strongly connected components (M-B needs
only reachability), BAPA and set-constraint sources (no A2 component
uses them). Project arguments ([FX008-5], [FX008-3.4], FX001's
consumption) are not publications; their standing is in statements §14.

## 2. Components of `validateEffects`

Each row names what trusted code does, the published foundation, its
fidelity (ADR 014: faithful, adapted with how, or invented), the
Waxwing-specific obligations it must discharge, and its label.
"Invented" items are already on statements §11's "Novel, for approval"
list unless marked **new**; this packet adds none.

| # | Component | Published foundation | Fidelity | Waxwing obligations it must discharge | Label |
|---|---|---|---|---|---|
| V0 | Architecture: the search proposes a package; trusted code judges it and mints the one `Certified` | [MMNS11] (pattern; slides read) | **adapted**: a one-sided witness. MMNS's witness predicate is "(∃w W(x,y,w)) iff y = f(x)"; Waxwing certifies acceptances only, and a refusal means "cannot certify" (statements §4 Definition 4.2, E4′), never "invalid". The "iff" corresponds to §5's completeness direction plus U2 | soundness for any candidate, forged included (§1, §18.76 item 4); one minting site (Strategy/Substitution.purs:53-58 today); `build` reads only `strip σf` (§2 "Stripped projection") | published (pattern); derived (one-sided use) |
| V1r | Reading the package: map each recorded variable and position to its binding or term | none needed (lookup) | — | I3's exact domain (§2, N10): the package's domain equals `flexEff`, `positions` and the type variables exactly; one home per fact (§2 table) | derived (design) |
| V1 | Settling: holes to lowering's defaults (type Int, record tail none, effect tail closed ∅) before G0 and every obligation | certify argument C1-C2 (project) | **invented** for effect rows (the ∅ default is on §11's list) | U4 (open): obligations judged at ∅ hold for every row lowering might choose; one sort per hole across three sorts (type, record row, effect row) | derived; unresolved (U4) |
| V1a | E4′ forcing: for each recorded ResultC whose tail is `⟨p, result clauses⟩`, add `⟨p, result clauses⟩ ↦ σs(t)`, t R's tail variable in the same instance type | none | **invented** (the provisional restriction ruled 2026-10-25, §R7b) | deterministic from the record and σs; never a bare variable reference; certified typing is the forced one (no relation to H′'s live typing claimed); removes reliance on P4 only | derived; decided as restriction |
| V2 | Solved form over σf: idempotence plus images over declared rigids at their sort and holes of one sort, for type, record-row and effect-row bindings and for `J S` terms (S ⊆ `rigidMarks`) | [BS01] §2.2.3 (idempotence) | **adapted**: BS01's solved form is idempotence; the "no unbound flexible reference" part is the decided §18.76 item 2 restriction (U8), not BS01 | U8's extension to effect rows and marks (§11 U8, not built); A2 of §8 (the restriction rejects no honest package; U3) | published (idempotence); decided (restriction); unresolved (U3) |
| V3 | Row equality up to scoped order (E1 rows; Definition 4.1(c), (d)) | [L05] Figure 1, (eq-swap); [L17] §3 (labels compared ignoring arguments) | **adapted**: (i) labels are compared by key (`labelKey`, src/Domain/Row.purs:102; a `Fail` label keyed by its payload's head), as [L17] compares effect labels ignoring arguments; (ii) each same-key pair is then compared by E1 on arguments and by mark equality on normal forms; (iii) the normal form "labels grouped by key, per-key order kept, then the tail" is a characterization of (eq-swap)'s closure that L05 does not state as such | E1's "marks equal on normal forms"; E9 must hold first (keys need concrete `Fail` heads) | published (relation); derived (key and normal-form characterization; needs its own bounded check, §7) |
| V4 | E1 structural equality of marked types, recursive through arrows, records, data arguments and labels | Robinson-style term equality; [L05] for rows | **faithful** for the structure (no unification: σf is applied, then compared) | invariance of marks inside types (statements §14 "E1 marks equal inside types"); records with several tails by O6's proposed definition (unchecked) | published (structure); derived (O6, proposed) |
| V5 | Definition 4.1 at every pair of handler types, rule J | none | **invented** (FX008 §3.4, §5 point 1; rule J decided §18.85) | (a) same effect, argument lists equal by E1; (b) handled marks equal; (c) no owned C: R ≡ R′ with marks; (d) an owned C: R ≡ R′ ignoring top-level marks, clauseRow ≡ clauseRow′ keys only, marks and tails equal, R itself as the alias | derived; checked (u7.mjs, derived.mjs, bounded) |
| V6 | E2 per-key matched-pair consumption: the r-th κ of s with the r-th κ of ρ; count(ρ, κ) ≥ count(s, κ); matched arguments equal (C rows bare: keys only); no tail condition for a closed s | [L17] (innermost-handler dispatch, adapted) | **invented** (FX001's consumption; on §11's list) | site list of §4 E2, `fail` included (amendment 2026-10-30); labels-only sites (`defer`, deferred rows) take s as closed; marks ignored at E4's c_k into R and E5's R into ρ | derived; checked (rows.mjs, bounded) |
| V7 | Definition 4.2: a source ending in rigid ϱ needs ρ = matched labels + ϱ, exact per-key counts | [L05] (scoped order), [L17] (dispatch) | **invented** (K1, adopted as a conservative restriction, §18.85) | applied at exactly §4's site list; refusal means "cannot certify"; known lost acceptances s1, p1, FX027's program, p9 | derived; decided as restriction; checked (k1.mjs, bounded); sufficiency reasoned per site |
| V8 | Mark normalization (`norm (J ∅) = N`) and `holds x y` (`x = N`, or `y = M`, or `J S ⊆ J T`) | none for the term language; two-point lattice | **invented** (on §11's list: "the mark-term evidence") | holds exactly when x ⊑ y for every valuation (§5, universal); `norm` equality exact for every valuation (reasoned in §6 A3); Console labels N, `Fail` labels N | derived (universal argument); checked (pairs36, oracle, bounded) |
| V9 | E12 edge collection: every edge E2-E6 generate, from completed rows under σf, plus E1's mark equalities | FX008 §3.4-3.5 (project) | **invented** (FX008's generators read on completed rows) | exhaustive: matched-pair edges at every E2 site; E4's `M ⊑ m`; E5's `m ⊑ f`, paired ρ marks `⊑ f`, a rigid C tail's `M ⊑ f`, for every frame, Console included (§18.86); E6's `⊑ N`; E7 as E2's edge | derived; unresolved (P1/U6: the recorded graph is FX008's) |
| V10 | E8 entry: `main`'s completed row within Console | [L17] top-level condition (adapted) | **adapted** (Console as the only root; amendment 2026-10-30: main's open tail is one minted flexible variable shared with its ambient row) | the `Entry` row's minted `EntryTail` variable is bound by the package and judged after settling | published (adapted); decided (amendment) |
| V11 | E9: each `Fail` payload's head concrete after settling | lowering's family read (project) | Waxwing-specific (class I) | interaction with the type-hole default Int is open (Q6) | derived; open |
| V12 | I3 malformedness: variable restrictions, arities, one sort per hole, binding constructor matching sort, Console N, `Fail` N, single homes, exact domain, no package binding where the record owns the fact | none | **invented** (on §11's list) | refuses every package slot the record owns (ResultC and annotation C labels and fixed marks; F1 below) | derived (design) |

Not in the validator (statements §13 exclusions): F1′, correction S,
termination T; step 6's closing of metas to M. The validator performs no
search: no binding is chosen, no mark solved, no row extended, except
V1a's forced binding, which the record and σs determine.

## 3. The options compared

### 3.1 Options

The options note's mark options M-A, M-B, M-C and row options R-A, R-B,
with two further combinations found while preparing this packet (M-D,
M-E). Rows are independent of the mark option except where noted.

| Option | What the trusted side recomputes | Complexity (reasoned) | Trusted base (relative) | Needs recorded or in the package | Relies on | Known risks |
|---|---|---|---|---|---|---|
| **M-A** term check | `norm` and `holds` per edge; `norm` equality per E1 mark pair; edges (V9) from completed rows | O(E·k) for E edges and k rigid marks (subset test), after row matching | small: normalization, subset test, plus V9 | a term for every position and every label inside a binding | §5's `holds` argument (universal); P1 for correspondence | a wrong edge collector (V9) is invisible to M-A itself; completeness depends on the read-back supplying least terms (U2) |
| **M-B** path criterion | union-find classes [Tar75] over E1 equalities and callee-k sharing; reachability from each atom (FX008 step 5); ignores package terms | O((V+E)·α) for classes plus O(E·atoms) reachability (as Mark.purs:50-53 states for `violation`) | larger: graph construction, union-find, reachability, clash detection, plus V9 | no mark terms (they become unused data) | FX008's criterion (project); P1 | departs from the approved evidence model (§5, §8 S3); the certified package would carry unchecked terms that `strip` erases (§5's "Two solutions" and R026's coupling: the witness is built from what was judged) |
| **M-C** M-A gated, M-B test-only | as M-A | as M-A in the gate | as M-A | as M-A | as M-A; the differential tests §5's two directions on corpus packages | the differential is only as independent as its edge collector (Q5); it cannot run on real handler programs until a read-back produces effect packages (tranche 2) |
| **M-D** M-A and M-B both gated | both | sum | largest | as M-A | as M-A | by §5's soundness direction (an assignment passing every edge implies satisfiability), M-B can refuse only when M-A has a bug, so it adds defense against M-A's implementation faults at the cost of trusted size; a disagreement becomes a refusal, hiding it from the differential |
| **M-E** recompute least terms in the validator, then `holds` | least terms per class (search in trusted code) | as M-B plus M-A | largest | no terms | §5 | violates "the trusted side searches for nothing" (options note; §4 of the statements); listed to be rejected |
| **R-A** evaluate each obligation on substituted, settled rows | V3-V7 directly, obligation by obligation | linear in rows after grouping by key | as V3-V7 | completed rows from bindings | [L05], [L17]; Definitions 4.1, 4.2 | none beyond the components' |
| **R-B** encode effect rows as G0 atoms | G0 | — | reuses G0 but adds an encoding | — | G0 judges record rows (one label once, equality) | invented machinery between the obligations and a checker for a different relation (options note); rejected there |

### 3.2 Restrictions table

Every restriction the representation adds beyond the intended meaning
(statements §14's guarantees: effect safety and abort safety), why it
is believed harmless or accepted, and the example built to challenge
it.

| # | Restriction | Why accepted | Challenging example | Standing |
|---|---|---|---|---|
| T1 | Definition 4.2: a rigid-tailed source needs an exactly matching target | FX008's positional invariant; soundness counterexamples p2, p4, p6, p7 (simulated) without it | s1, p1 (`st`), FX027's program, p9: safe in runs (s1's hinted twin prints `1`, `2`), refused | decided (§18.85); losses listed |
| T2 | E4′ forcing ("always R's tail") | removes reliance on P4 | aroundBoth's `prefix()`, k2f refused; r1, r2, r9 kept | decided (§R7b); stand-in evidence only |
| T3 | Solved form: images over declared rigids and holes only | §18.76 item 2 | a program whose only honest package needs an unresolved flexible reference (none known; corpus count 0 of 14,867 `Inline` images over Solved rows, test/r0-elab-corpus.serial.test.mjs, statements §11 U8) | decided; U3 open |
| T4 | Effect-row holes judged at ∅ | lowering reads no effect row (audit C1) | a hole tail whose ∅ default refuses while some other row would accept (statements §12.2 "nested tail" predicts refusal for a forged image) | U4 open |
| T5 | Marks inside types invariant (E1 marks equal) | [FX008-5] point 1; conservative | a callback whose parameter mark could soundly be weakened (variance) is refused | decided as S; precision loss accepted |
| T6 | C rows bare, keys only | dispatch is by key | famw: `Fail(Job)` in C against `Fail(Job(Int))` in ρ, predicted accepted (§12.2) | ruling (Task 7) |
| T7 | Console labels N; Console frames counted uniformly | runtime is Console's only handler (FX011) | a user Console handler once FX011 lifts: every failing one refused | decided (§18.86); revisit with FX011 |
| T8 | Mark terms only N, M, `J S` | least terms are joins of rigid constants (§5) | a graph needing a meet (none: the least solution needs only joins, §5's FX008 ⇒ package argument) | universal given P1-P3 |
| T9 | `Unsupported` kinds (FX032's operation `with` rows; `UnframedInstall`) block at rule 1 | not modelled | §12.2 FX032 row; Task 9's non-`MHandler` `with` | decided |
| T10 | `Outside HandlerType` keeps every handler declaration blocked | tranche 1's boundary (F14 item 3) | every handler program: validator verdicts are observable as suppressed attempts only | decided |
| T11 | Rule J: an alias is R itself | §18.85 item 3 | rule K's 12,024 wider package evaluations (u7.mjs, bounded); no separating program found | decided |
| T12 | Refusal reporting: one `ObligationFailed` per candidate | determinism | a candidate failing two obligations reports only the first in recorded order | proposed here (Q7) |

### 3.3 Soundness pass (try to make the validator accept an invalid
problem)

Each attempt names the defense and its standing.

1. **Forge a mark term** (§7a's `defer` forged to N). Defense: E2's edge
   at `defer` (V9) refuses `M ⊑ N`. Bounded (cases.mjs).
2. **Forge an owned C** (empty ResultC or annotation C). Defense: I3
   (V12) refuses any package slot for it; labels are derived from the
   record. Design; bounded as a graph (cases.mjs "owned C forged
   empty").
3. **Bind `⟨p, result clauses⟩` in the package** to a value other than
   R's tail image. Defense: depends on F1 (§8): under the options note,
   I3 refuses it; under statements §2's table as written, the package
   binding exists and V1a would have to override or conflict with it.
   **Open until the author resolves F1.**
4. **Leave a flexible reference in an image** (U8's gap). Defense: V2
   over σf for effect rows and marks. Not built; the type and record
   part is observed refused today (test/r0-u8-solved-form.test.mjs).
5. **A term `J S` with a name outside `rigidMarks`.** Defense: V2/V12.
   Design; no fixture yet.
6. **Accept a contract valid at one valuation only** (`J {k} ⊑ N`).
   Defense: `holds` is universal over valuations (§5). Universal; the
   one-ground-valuation mutant is detected (mutants.mjs, bounded).
7. **Drop an edge in the collector** (V9). Defense: none inside M-A;
   only the restored-defect proofs per obligation kind (closure
   checklist A2's mutation per obligation kind) and, under M-C, an
   independent collector (Q5). **This is M-A's main soundness exposure
   to implementation error.** Reasoned.
8. **A missing obligation in the record** (generation's coverage, P1,
   E10 settled by reading only, §13a's audit scope excluding Refute/,
   Strategy/, Decide*, Entailed*). Defense: none in the validator; U6
   is generation's obligation. Open.
9. **Rigid-tailed inclusion** (K1). Defense: V7. Bounded (k1.mjs); its
   sufficiency is reasoned per site, not a substitution lemma.
10. **Forcing with the wrong order** (force before settling, or bind to
    the variable t rather than σs(t)). Defense: §R7b's fixed order;
    the second variant is refused by V2 (a bare flexible reference).
    Reasoned; §5's E5a gives the fixtures.
11. **A package whose terms satisfy every edge but whose graph FX008
    would refuse.** Impossible by §5's soundness direction (universal:
    each edge holding for every valuation gives a per-valuation
    solution). Holds for the graph a-min records; that this graph is
    FX008's is P1.

### 3.4 Completeness pass (start from a valid construction and try to
make the validator refuse it)

1. **Least terms not supplied** (the read-back closes metas to M,
   FX008's step 6). M-A refuses an honest program; M-B accepts.
   Defense: §5 "Two solutions, kept apart"; the M-C completeness
   direction detects it. Reasoned; example E3 below.
2. **The restriction losses** T1, T2: refused by design, listed.
3. **Solved form refusing an honest package** (U3; A2 of §8). Open;
   the type part has a corpus count of 0 offending images.
4. **Holes at ∅** (T4, U4). Open.
5. **Row equality implemented as multiset equality** (wrong) or as
   label-with-arguments order (L05 literally, wrong for effect labels):
   the second would let `State(Int) + State(Bool)` and `State(Bool) +
   State(Int)` swap, which [L17] forbids, so it accepts more, not
   less; listed under soundness separations (E7).
6. **E9 under the type-hole default**: a payload whose head is a hole
   settles to Int, so E9 passes; whether that is the intended reading
   is Q6.
7. **Definition 4.1 refusing a pair today accepts** (O5, O7: today is
   stricter, so a-min accepts more, not less). Correspondence notes;
   the differential reports them.

## 4. Recommendation (for the author's decision)

**Recommended: M-C with R-A,** the forcing procedure of §R7b, and the
interim policy F14 items 1-3 as the options note states them, plus
these three items, each needing a ruling (§6):

1. **An explicit package type** (Q4) as part of A2's interface: marked
   images for type variables (`MTy`, not `RTExpr`), effect-row bindings
   (`EVar ↦ MRow`), a term per recorded `Position`, and a term on every
   label inside a binding. Without it no validator code can be written,
   and the read-back (tranche 2) has nothing to target.
2. **An independent edge collector for M-B** (Q5, option b), written
   apart from V9, so the differential tests E12's exhaustiveness as well
   as §5's two directions.
3. **Distinct refusals for validator limitations** (Q10): Definition
   4.2 and forcing failures reported apart from `ObligationFailed`, so
   A6's losses can be counted and are never read as "invalid program".

**Argument.**
- It keeps the approved evidence model (§5, §8 S3): the package's mark
  terms are judged, so `Certified` carries only judged data (R026).
- Its trusted mark check is the smallest of the options: normalization
  and a subset test, with a universal argument (§5) and bounded
  evidence (oracle and pairs36). M-B's graph machinery stays outside
  the trusted base.
- R-A evaluates the statements' conditions as written, so each
  refusal names an obligation, and each component maps to one row of
  §2's table.
- The differential, given an independent collector, is the only
  planned check of P1-adjacent claims on real programs, beyond the
  oracle's grammar (two rigid marks, at most four positions).
- It matches the author's stated direction (§18.97: "M-A gated, M-B as
  an independent test oracle and R-A").

**Runner-up: M-D** (both gated). It buys defense against an M-A
implementation bug at the cost of trusted size and of turning every
disagreement into a silent refusal. It would become preferable if the
author wants defense in depth over a smaller trusted base, or if M-A's
implementation review finds the term check harder to audit than
expected.

**What would change the recommendation.**
- A demonstrated honest program whose least-term package cannot be
  expressed in N, M, `J S` (contradicting T8): then M-B, with a
  ruling on the evidence model.
- A differential disagreement in either direction on the corpus: stop
  and bring it to the author; neither side is presumed right.
- If the author rules that the package type belongs to tranche 2
  (Q4), A2's implementation waits for that, and the recommendation
  stands but its first task moves.
- If F1 is resolved toward statements §2's table (the package binds
  `⟨p, result clauses⟩`), V1a must define how forcing treats an
  existing binding (override, require equality, or refuse), which is a
  new semantic choice.

## 5. Separating examples

Verdicts are per option or per implementation variant. "Refused"
means `validateEffects` refuses the candidate (a `CheckFailed`
attempt); "Malformed" is I3's refusal. Every verdict below is
**reasoned** unless marked otherwise; none was run for this packet.

| # | Program or package | Right (M-A, R-A, forcing) | Variant verdicts | Standing and source |
|---|---|---|---|---|
| E1 | §7a's `work` with control row `nofail Log` (honest least term x = N) and the same package with x forged to M | honest: accepted; forged: refused (E6 `M ⊑ N`) | M-B: both accepted (graph satisfiable; terms ignored); M-D: forged refused | reasoned; the program's graph is in cases.mjs (bounded, for the forged-N direction) |
| E2 | §12.2 "rigid marks": `fn h(g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log = { let r = fn(u: Unit) => g(u); r(()) }`, lambda mark forged to N | refused (`J {k} ⊑ N` is `{k} ⊆ ∅`) | one-ground-valuation (k = N) implementation: accepted (wrong); M-B: accepted (ignores terms); with the least term `J {k}`: accepted by all | unrun prediction (§12.2); the mutant is detected in mutants.mjs (bounded) |
| E3 | a flexible mark x whose only edge is `x ⊑ N` (a `defer` of a label with no lower bound), package from a read-back that closes metas to M (step 6) | refused (`M ⊑ N`) | M-B: accepted; M-C differential: flags a completeness-direction failure (satisfiable graph, honest-path package refused) and so a read-back defect | reasoned; separates the read-back's least terms from step 6 |
| E4 | §12.2 "normalization": the context mark spelled `J ∅` and spelled N | identical verdicts; `J ∅ ⊑ N` holds | no-normalization implementation: refuses `J ∅ ⊑ N` (wrong) | unrun; mutant detected (mutants.mjs, bounded) |
| E5a | r1 (test/fx008-defer-programs.mjs), a ResultC recorded with the fresh tail `⟨p, result clauses⟩` | forced to σs(R's tail); accepted when constraints hold | blanket refusal of fresh tails: refused (wrong, the stricter unruled alternative); forcing to the bare variable t: refused by V2 as an unsolved image (wrong) | stand-in observed for r1, r2, r9 kept (statements §0e item 2); variants reasoned |
| E5b | aroundBoth's `prefix()`; k2f | refused (forced constraints fail; "Expected nofail(k) Log, found Log" in the stand-in) | an implementation trusting H′'s recorded fresh tail: accepted (not certified by the ruling) | stand-in observed (§R7) |
| E6 | a package binding `⟨p, result clauses⟩` to ∅ for the use in §12.2's "attempt B" | per options note: Malformed; per statements §2 table: binding read, then forcing must decide (F1) | an implementation letting the package's binding win: accepted the forged ∅ before E5's frame edges see C's tail | reasoned; this is F1's separating example |
| E7 | §12.2 "E1 order": `fn f(h: Unit -> Unit with State(Int) + State(Bool)): Unit -> Unit with State(Bool) + State(Int) = h;` | refused | multiset row equality: accepted (wrong); L05 applied with arguments as part of the label (no key): accepted (wrong; [L17] §3 compares effect labels ignoring arguments) | unrun prediction; source comparison read (§1) |
| E8 | §12.2 "E2 payloads": `fn g(h: Unit -> Unit with State(Int)): Unit with State(Bool) = h(());` | refused (matched arguments differ) | keys-only consumption: accepted (wrong) | unrun |
| E9 | §12.1 N4, p1: `fn st(h: Handler(State(Int))): Int with Log = with h { State.get() }` | refused (Definition 4.2 at E5) | withdrawn rule ("ρ ends in ϱ"): accepted | bounded (run.mjs, observed rerun 2026-10-25); today refuses (observed) |
| E10 | §12.1 closed-R inclusion: `with handler State(Int) { get() => 1, put(v) => () } { Log.log(1); State.get() }` under `Log + ϱ`, R := ∅; near miss R := `[] + ϱ` | honest accepted; near miss refused | Definition 4.2 applied to closed sources too: honest refused (wrong) | bounded (k1.mjs via run.mjs, observed rerun) |
| E11 | §12.2 "attempt A": `fn f(h: Handler(nofail Ask with Log)): Unit with Log = with h { Ask.ask() }; fn g(h2: Handler(nofail Ask with nofail Log)): Unit with Log = f(h2);` | refused (Definition 4.1(c), marks on R) | E1 ignoring R's marks on every handler type: accepted (wrong) | bounded (derived.mjs); today refuses (observed) |
| E12 | §12.2 "closed source (F7)": `fn g(h: Unit -> Unit with Log): Unit with Log + Ask = h(())` | accepted; no copy edge for `Ask` | a remainder rule applied to closed sources: refused or extra edge (wrong) | unrun |
| E13 | §12.2 "domain exact": an extra mark for a nonexistent site; a missing frame mark | Malformed, both | an open evidence domain: accepted / defaulted (wrong) | unrun |
| E14 | §12.2 "Console (T3-e, N10)": `fn g(h: Unit -> Unit with nofail(k) Console): Unit with Console = h(())`, a package giving Console's mark M | Malformed | Console marks as positions: judged by `holds` instead | unrun |
| E15 | a `fail(E)` inside a pure callback (amendment 2026-10-30: `fail` joins E2's sites) | refused (E2 at `fail`'s site) | collector without the `fail` site: accepted (wrong) | the registered proof for the generation side exists (§18.124 ruling 1); validator side unrun |

## 6. Assumptions and open questions

**Assumptions** (each is what this packet takes as given; any may be
wrong):

- A1. The statements (revision 3.6, §R7b, 2026-10-30 amendments) are
  the specification; the options note's §18.97 corrections apply.
- A2. The validator runs inside `certify` as step (c), after I3 and
  after settling and G0, and stays the only minting path
  (Strategy/Substitution.purs:53-58).
- A3. `norm` equality is exact for every valuation: M differs from any
  `J T` at the all-N valuation; `J S` and `J T` with S ≠ T differ at a
  valuation setting one element of the symmetric difference to M
  (reasoned here; not in §5, which argues `holds` only).
- A4. E12's edges are computed by trusted code from completed rows,
  not read from a recorded edge list (statements §4 E12).
- A5. Task 9 records `HandlerLit { m, inference, clauses, clauseRows }`
  and `Install { frame, handler, ambient }` as
  src/Domain/Recorded/Effect.purs:128-134 declares them, with the
  literal minting `EffFresh p (Clauses k)` shared with the clause
  ambient row (§18.124 Q5), and `UnframedInstall` for a `with` whose
  handler is not an `MHandler`.
- A6. The statements' §10 signature `Consume { source ∷ Var, target ∷
  RowRef }` is superseded by the code's `source ∷ MRow, target ∷ MRow`
  (Effect.purs:121-127); the validator reads the code's shape.

**Open questions** (each answerable yes/no or by choosing):

- **Q1.** Mark check: M-A, M-B, M-C or M-D? (Recommended M-C.)
- **Q2.** Rows: R-A? (R-B stays rejected.)
- **Q3.** Interim policy F14 items 1-3 as the options note states them:
  yes or amended? (Item 1 is today's state; item 2 has no second
  strategy to apply to; item 3 is enforced by `Outside HandlerType`.)
- **Q4.** Is the package type (marked type images, effect-row
  bindings, a term per `Position`, terms on labels inside bindings) part
  of A2's specification (yes) or of tranche 2's read-back (no)?
- **Q5.** The M-B differential's edges come from: (a) the validator's
  own collector V9 (tests only the term judgment); (b) an independent
  collector written from statements §4 (also tests E12's
  exhaustiveness); or (c) the live checker's `MarkStore` graph (tests
  P1, but reuses today's code as the reference, which §18.81 makes a
  baseline, not a specification)? (Recommended b.)
- **Q6.** E9 after settling: does a `Fail` payload whose head is a hole
  pass E9 at the type default Int (yes), or must E9 refuse a hole head
  before settling (no)? If no, §6's "settling before every obligation"
  needs an exception for E9.
- **Q7.** On several failing obligations, report the first in recorded
  order only (yes), or all (no)?
- **Q8.** F1: is a package binding of `⟨p, result clauses⟩` Malformed
  (the options note, yes) or held by the package as statements §2's
  table says (no)? If no: does forcing override it, require it to equal
  σs(t), or refuse?
- **Q9.** Extend the pinned `solvedForm` (Strategy/Witness.purs:86) to
  effect rows and marks (a re-pin of an existing trusted module), or put
  V2's effect part in a new trusted module beside it?
- **Q10.** Add refusal constructors that separate validator limitations
  (Definition 4.2; forcing failure) from `ObligationFailed`, so the
  shadow differential and A6 count them apart: yes or no?
- **Q11.** Until a read-back produces effect packages, is M-C's
  differential accepted as fixture-only (hand-built honest and forged
  packages), with the corpus differential deferred to tranche 2: yes or
  no?
- **Q12.** The two fidelity corrections of §8 (F2, F3): accept them as
  written into the options note's components table, yes or no?

## 7. Implementation outline (not authorized work)

Nothing here is authorized; it is the shape of a plan the author could
authorize after answering §6.

**Data flow.** `certify problem package`:
(a) I3 over the package against `fields problem` and its
`effects ∷ EffectProblem` (V12) → (b) settle σ to σs (V1) and run G0 on
`erase` as today → (c) `validateEffects`: force (V1a) to σf → solved
form over σf (V2) → for each `Placed Obligation` in recorded order,
evaluate it under σf (V3-V7, V10, V11) and collect its edges and mark
equalities (V9) → judge each edge by `holds` and each equality by `norm`
equality (V8) → `Certified Valid (Witnessed (strip σf))`.

**Modules** (all trusted unless marked; names are placeholders):

| Module | Content | Trusted |
|---|---|---|
| Domain/Verdict/EffectPackage | the package type (Q4): marked images, effect bindings, terms | yes (constructors) |
| Features/Check/Strategy/Effects/Term | `MarkTerm`, `norm`, `holds`, `sameTerm` | yes |
| .../Effects/Settle | hole defaults for effect rows and marks; σ → σs | yes |
| .../Effects/Force | V1a | yes |
| .../Effects/Solved | V2's effect part, or an extension of Witness `solvedForm` (Q9) | yes |
| .../Effects/Rows | completed rows, key grouping, row equality, matching, Definition 4.2 | yes |
| .../Effects/Handler | Definition 4.1 with rule J | yes |
| .../Effects/Edges | V9 per obligation kind | yes |
| .../Effects/Validate | `validateEffects`: order, refusals | yes |
| .../Effects/Malformed | I3 | yes |
| test oracle (M-B) | independent collector (Q5 b), union-find, reachability | no (test only) |

**Interfaces to the recorded problem** (read only): `obligations`,
`nodes`, `instances`, `annotations`, `rigidMarks`, `effectRigids`,
`arities`, `ambient`, `flexEff`, `positions`, `signature`
(src/Domain/Recorded/Effect.purs:176-188). Depends on Task 9 for
`HandlerLit` and `Install` contents and for `Clauses k` minting; on
Task 14 for the effect pin and coverage reconciliation; on tranche 2 for
honest packages.

**Test plan** (each claim with its oracle or fixture):

| Claim | Check |
|---|---|
| `holds` exact for every valuation | pairs36 over two rigid marks (exists, bounded); a property test over random terms and every valuation of up to four marks |
| `norm` equality exact (A3) | the same property test, equality form |
| row equality equals (eq-swap)'s closure under key comparison | bounded oracle: enumerate rows of up to four labels over keys A, B and two argument values, compute the closure of adjacent swaps of distinct keys by search, compare with the grouped normal form |
| matching and counts (E2) | rows.mjs-style brute force over small rows; must-fail fixtures E8, E12 |
| Definition 4.2 | k1.mjs cases as fixtures (E9, E10) with the withdrawn-rule mutant |
| Definition 4.1 | derived.mjs attempts A, B as fixtures; u7.mjs's two mutants |
| forcing | E5a, E5b fixtures; the bare-variable and blanket-refusal mutants |
| solved form extension | must-refuse fixtures per U8's list (unbound reference, nested, wrong-sort rigid, made row, `J S` outside `rigidMarks`) with honest controls |
| I3 | E13, E14, F2 and F6's Malformed fixtures |
| every refusal kind | one forged-witness fixture per refusal kind (closure checklist A2) |
| every obligation kind | one registered restored-defect proof per obligation kind (drop it, a fixture flips) |
| §5 both directions | M-C differential: soundness direction on honest and forged packages, completeness direction on least-term packages; fixture-only until tranche 2 (Q11) |
| collector exhaustiveness | differential with the independent collector (Q5 b); E1, E15 as fixtures |

**Order of tasks.** (1) package type, after Q4; (2) Term with its
property tests; (3) Settle, Force, Solved with fixtures; (4) Rows with
the bounded row oracle; (5) Handler; (6) consumption and Definition
4.2; (7) Edges; (8) Validate over every obligation kind; (9) Malformed;
(10) wiring into `certify` with the one minting site and pins; (11) the
M-B oracle and differential; (12) forged fixtures and restored-defect
proofs, registered.

**Trusted surface.** Every module in the table marked trusted, the
package type's constructors, the new `CheckRefusal` constructors, and
`certify` itself; each pinned in scripts/trusted-surface.json with its
token review (docs/engineering.md). The M-B oracle is test-only and
must not be reachable from live compilation.

## 8. Findings in the options note and statements

- **F1 (conflict; options note "E4′'s forcing step" item 1 against
  statements §2's ownership table, ResultC row).** The note refuses a
  package binding for any `⟨p, result clauses⟩` variable as
  `Malformed`; the table says "the package holds only the binding of
  `⟨p, result clauses⟩` when that variable is the tail". §R7b amended
  E4′ but not the table. Q8.
- **F2 (fidelity too strong; options note V2).** "Solved forms [BS01];
  faithful": BS01 §2.2.3 defines solved form as each domain variable
  occurring once (idempotence), which `generic` checks
  (Candidate.purs:33-44). U8's `solvedForm` (Witness.purs:86-98) also
  refuses images naming flexible variables outside the domain, a
  Waxwing restriction (§18.76 item 2). Proposed label: adapted.
- **F3 (fidelity too strong; options note V3).** "[L05]; faithful":
  L05 compares labels by name, with field types compared after
  isolating; Waxwing compares effect labels by key, as [L17] §3 does
  ("we ignore the type arguments when comparing labels"), keys `Fail`
  by payload head, and compares marks. Proposed label: adapted, citing
  [L17] beside [L05].
- **F4 (unconfirmed citation; statements §13b).** "Leijen's `inject`,
  POPL 2017" is not in the 2016 technical report; the POPL text was
  not accessed. The other two relaxation citations there are confirmed
  (Biernacki et al. `lift`, §1) or consistent at abstract level
  (Gaster-Jones).
- **F5 (unaddressed input; options note "Inputs").** The note lists
  what the recorded problem needs but not the package's shape; today's
  `Substitution` is unmarked (`Map Var RTExpr`, Candidate.purs:31), so
  E1 over `MVar` and every mark term have no carrier. Q4.
- **F6 (stale interface text; statements §10).** `Consume`'s fields are
  `Var` and `RowRef` there and `MRow` in code (Effect.purs:121-127);
  `HandlerLit` gains `clauseRows` and `Install` holds `handler ∷ MTy`
  and `ambient ∷ MRow` in code. Text only.
- **F7 (status; options note "Inputs" items 1, 3, 4).** Site kinds,
  `flexEff` and `positions` are built (Effect.purs:95-108, 185-186).
- **F8 (scope note; options note V6).** [RM99] concerns satisfiability
  of definite constraints; it bears on M-B, not on M-A's term check,
  and does not cover the quantification over rigid-mark valuations,
  which §5 argues separately. The note's wording ("the satisfiability
  it mirrors") is accurate if read that way.
- **F9 (code fact, not a defect).** Live UnifyMark `equateMarks` skips
  `Unmarked` (UnifyMark.purs:140-145) and Frames `framed` still skips N
  frames (Frames.purs:49-51); the validator departs from both by design
  (every label carries a term; uniform Console accounting, §18.86).

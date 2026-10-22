# The `divide5` gap: a blocker-first proposal

Revision 2 (2026-10-21), replacing the draft at 17da85d after its two
adversarial reviews and the author's rulings (dossier §18.59-18.64).
**Statements and proposals only:** no prototype, no proofs, no compiler
change, no selection rule chosen, no representation chosen. Labels:
**cited** (file:line or section), **checked** (a recorded run or a
proved theorem), **argued** (reasoning, unchecked), **proposed** (a
design choice for the author), **predicted** (about today's compiler,
not run). Sources: parts R1-R8 (read-only), the `walk` probe
(docs/findings.md, "R010 and composed rows"), two reviews of the draft.

## 1. Where things stand

**Established (checked, research model; §18.56-18.59):** the cell
checker's acceptance implies `ValidOpen` (`cellOpenImpl`); its queries
are exact on `LDFragment`; `divide5` is `ValidOpen` for every label list
(`d5_open`), inside the fragment, and refused by every cell certificate
when the list is non-empty (`d5_refused`). **The checker is incomplete
on the fragment;** exact queries cannot compensate for a certificate
language that cannot express the witness. Nothing below changes those
results.

**Three separate gaps** (argued; §3, §6, §7):

- **G1, written-label splits:** the cell format cannot say "this
  written label goes to `u` if `s` lacks it, to `t` otherwise".
- **G2, field references:** some valid problems need a certificate to
  name a field's type through another row; no current or proposed
  certificate expresses it.
- **G3, compilation policy:** a certified `divide5`-shaped program
  still cannot compile under decision 3, because its split is not
  forced and no annotation can write it.

**Blockers, in the order this proposal treats them:** R0, a complete
constraint problem (§2); a termination contract for key-dependent
witnesses (§3); witness and lowering interfaces measured against both
(§4). G3 (§5) and G1 (§6) come after. Nothing here authorizes work;
§9 lists decisions and the tranches each would need.

## 2. R0: the complete constraint problem

### 2.1 Requirement (§18.61)

For supported source programs, obtain the complete constraint problem,
or justify an earlier rejection, before depending on an interchangeable
checking strategy. Until R0 holds, every claim that the recorder or
problem type is independent of the checking strategy is conditional.

### 2.2 What today's compiler does (cited, R7)

- `checkFunction` is one `Either` chain (src/Features/Check/
  Function.purs:77-98): a refusal ends generation for that body, and
  `check` (src/Features/Check.purs:22) then skips every later
  declaration.
- The end of a body is not where `B` ends. `waitingAtEnd` (Function.purs:
  89; EndReport.purs:30-47) runs before the printability and
  comparability walks (Function.purs:96-97) that produce the
  requirement atoms `BQ`. Its failures (D4 "Cannot tell …", undecided;
  D6, H's refusal "must be …, but neither … can hold …"; and
  placeholder, depth and internal errors; EndReport.purs:36-42) return
  no state, so `B` and `BQ` are both lost.
- Rule H runs at two sites: at the end of the body, and earlier inside
  `settleRestricted` through `familyUnknown` (Failure.purs:79, 93,
  98-102).
- **Moving the end-of-body gate alone does not suffice:** a refusal
  during generation leaves only a prefix of `B` (§18.61).

### 2.3 Classes of refusal (R7's inventory, condensed)

Not every error needs a signature counter-instance (§18.61). Classes:

| Class | Justification | Examples (R7 §1) | May stop generation? |
|---|---|---|---|
| a | the language's static rules (syntax, names, sorts, kinds, arity, effect rules, coverage) | Resolve/*, SortConflict, Arity, Coverage; effect-row unifier failures (`RowMissing` etc. are effect rows, not records) | yes; effect refusals only when they do not depend on record metas bound by the online solver (otherwise class f) |
| b′ | policy on a satisfiable but degenerate declared `D` | `r disjoint r`, `{...r, ...r}` in a signature | yes, worded as policy |
| b | contradictory declared hypotheses | none reachable: source `D` is always satisfiable (`clauseOnly_satisfiable`, checked) | — |
| c | a semantic contradiction: (c1) derived from original recorded atoms and `D` alone, never from the online substitution's choices, by a rule proved sound for `ValidOpen` over the divisible typed model under the ∀rigid/∃flexible structure (its premises imply some rigid assignment satisfying `D` admits no flexible solution); or (c2) a checked counter-instance (CX: a finite rigid assignment satisfying `D` at which `B` is refuted) | candidates, each pending a soundness statement: a ground head clash between original atoms, an occurs check on original atoms, `lacks`/`disjoint` refutations whose premises are original atoms only | yes, recording the rule's soundness theorem (c1) or the checked counter-instance (c2) as evidence; verdict Contradiction |
| d | assumes an indivisible rigid row or a uniform per-label choice | H's rigid atom (Homes.purs:31-34; false for `route`, checked; predicted for `submit`); H's label atom (Homes.purs:29-30); `lacks`/`disjoint` failures after `shareTails` with flexible field types; printability/comparability judged on an unforced settled type | **no** |
| e | solver incompleteness, limits, defects, unsupported constructs; **and any refusal that relies on bindings the online solver chose ("bound so far"), or on a c1 rule whose soundness is not yet proved** | D4 "Cannot tell"; depth and fuel limits; Internal; the several-tail placeholder; today's `lacks`/`disjoint`/head-clash refusals on substituted atoms | **no** (Unresolved, Unsupported or defect; the problem is preserved for a later strategy) |
| f | unclear | principality of `shareTails`; pattern growth and arm order; effect refusals caused by record-solved metas | **no** (until settled by the evidence R7 names) |

**The `walk` probe's three findings (two refusals and one
admission) stay separate** (§18.63; checked
run): W1, D4 "Cannot tell whether walk's u or v holds walk's u" at
check (class e; the problem is valid with the identity split, argued);
W2, R010 admissibility, whose code (`bareRow`, NestedArguments.purs:
78-81) admits a composed `{ ...u, ...v }` against the documented
single-tail rule (BACKLOG R019, open); W3, the several-tail
placeholder at specialization (Task 8). Fixing one discharges none of
the others. "Identity is the only admissible split" holds only under
the documented rule; building `walk` without a caller does not
validate specializing or running a called `walk`; the annotation
result covers only the forms tested.

### 2.4 Proposed boundary

- **Complete constraint problem** (proposed, from recorder-spec §2.1):
  `D` computed from the resolved declaration; `B` holding, for every
  syntactic occurrence in the body (dead `let`s included), the atoms
  translation.md §2.3 assigns, with its fresh variables; `BQ` from
  walking the unsettled body; `outside` markers for constructs the
  model cannot express. **Criterion:** the atoms one occurrence
  contributes do not depend on how any other atom was solved.
- **The ∀/∃ structure is preserved:** one level per declaration, rigid
  variables universal, flexible ones existential and dependent on all
  rigid ones; the `vars` map from problem variables to checker metas
  and checked-IR names keeps that structure and composes the online
  substitution (cited recorder-spec §2.1; recorder-interface §2).
- **Three grounds, kept apart** (§18.64 follow-up): (1) a
  contradiction derived from the complete premises available by a rule
  proved sound for the semantics; (2) a checked counter-instance
  refuting the signature (CX); (3) failure of the current solver to
  find a solution. Only (1) and (2) justify a semantic rejection; (3)
  preserves the problem for a later strategy. A rule applied to
  original recorded atoms and `D` is monotone, so it stays sound on a
  prefix of `B`; a rule applied to atoms rewritten by the online
  substitution is not, because the substitution embeds choices.
- **Who may stop early:** classes a and b′ (static rules and policy,
  worded as such); class c only on ground (1) or (2). A contradiction
  reached only through bindings the online solver chose is not
  semantic evidence: it is class e, does not stop generation, and
  preserves the complete problem. An unjustified refusal in one
  declaration does not hide later declarations.
- **New acceptance test** (proposed, T-R0): for each refusal in classes
  d and e, and each refusal that today rests on solver-chosen
  bindings, a fixture whose online solver refuses partway, and whose
  recorded problem equals an independent syntax-directed translation,
  not a prefix.
- **Two designs, for the author** (recon §6 Q1): (i) generate-then-
  decide, a syntax-directed recorder over the resolved AST, with the
  online solver as one candidate search; (ii) online with advisory
  refusals: a class-d or -e failure records its atom, keeps the
  pre-step substitution and taints the body, so later refusals in it
  are advisory; outcomes carry state instead of `Either Diagnostic
  State`; the `BQ` walks run before the verdict. In (ii), shape
  decisions on a non-record (Extension, Record select, patterns,
  application) record their atom and continue with fresh variables.
  §18.17 item 6 already prefers a certificate gate; this is a
  different axis (where recording happens).
- **Scope:** any compiler change here (H made advisory, outcome types,
  a new recorder) needs its own tranche; repairing `route` stays out
  of scope (§18.17 item 7, §18.61).

## 3. The termination contract

### 3.1 Why it comes before representation (§18.64)

R010 justifies termination of specialization (design spec §4.2,
summarized in ADR 007 "The instantiation rule"): within a
recursive component, each type argument is a bare variable of the
caller or mentions no variable, and **a hole counts as ground** because
specialization fixes it to one ground type (cited Instantiation.purs:
22-24; ADR 007:82). A divided part's meaning varies with the
specialization key. So if divided parts are represented as ordinary
holes, R010's argument no longer applies (cited R8 §0.2). That does
not prove specialization diverges; it means the justification is
missing (§18.64 item 1).

### 3.2 Requirements (proposed, from §18.64)

- **T1, distinguishable names:** witness-bound names are
  distinguishable from genuinely unconstrained holes, by a constructor
  or enforced metadata, so no pass silently treats them as ground.
- **T2, a stated finiteness theorem:** a finite set of reachable
  specialization keys, or a decreasing measure, and a proof that
  recursive witness evaluation preserves it. Determinism and finite
  ingredients do not suffice: a deterministic step can wrap its input
  in a fixed constructor at every recursion (§18.64 item 2).
- **T3, the rule's form:** whatever R010 judges (formula tails, witness
  terms, name supports, or the problem's form) must be syntactic enough
  to check, with T2 as its justification.
- **T4, R019 first:** whether composed tails are admissible (today's
  code) or not (today's docs) is decided before T2 is stated; admitting
  them needs its own termination argument (§18.63).

### 3.3 What is known (argued, R8 §3)

split-selection §2.3 bounded keys by "a restriction's image is a
sub-row of an entering key's rows", with "one per call" supplied by the
lexicographic rule, which §18.17 item 2 rejected. A finiteness argument
needs (i) every image built from the entering key's fields plus the
component's finitely many written labels and types, and (ii) the
witness at a key a function of that key. (i) holds for presence-only
witnesses and bare field references; it **fails for skeletons over
references** (e.g. `{a: List(A(r,a))}` in a recursive component) unless
they are refused there. Even with (i) and (ii), §3.2 T2 must be proved,
not assumed.

## 4. Witness and lowering interfaces, measured against R0 and §3

### 4.1 What lowering needs (argued, R5)

Per specialization key: for each flexible name, its ground row or
type. Not pieces, cubes, cells, patterns or certificate tables.
Checked IR already carries names inside `Ty` in every position a
divided part reaches (slots, result types, `g(x: a): a`, constructor
instantiations, nested fields; cited Checked/Internal.purs:25-90), so
**binding witnesses per name, not per call slot,** handles flow through
types without changing `Ty`'s constructors (R8 §0.1).

### 4.2 Options (R8; none chosen)

| | A: presence formulas in `Ty` | B: per-name typed witness metadata | C: names plus a per-key table | D: solve per key in Specialize |
|---|---|---|---|---|
| typed fields, field references | needs a field-reference node too | yes (references `A(r,l)`, `X(r,S)`, `T(n)`) | as the table's filler | free at the key |
| flow through types | yes, formulas duplicated | yes, per name | yes | yes, via names |
| strategies with no constructive witness | no | no | as the filler | yes |
| change to `Ty` | yes, every phase | none (e.g. `Ty WVar`) | none, or one name constructor | none |
| T1 (distinguishable names) | by syntax | by metadata or constructor | needs a constructor or metadata | needs a constructor or metadata |
| T2/T3 judged on | formula tails | witness terms | name supports | problem form, or a semantic bound |
| who chooses (G3) | Check | Check or a Selection component | the filler | Specialize's tie-break |

Per-name typed metadata (B, possibly with C's names) is a candidate
the author asked to retain; it is not selected (§18.64). Option A has
the largest blast radius (every pass over `Ty`; structural equality is
not semantic equality of formulas).

### 4.3 Correspondence and trust (proposed; none stated)

Common to all options: **K**, each reached key read through a
representation map is a rigid assignment satisfying the declaration's
`D`; **V**, each strategy's `Sound_F` (acceptance ⇒ `ValidOpen`);
**Lay**, lowering bindings to layouts commutes with that map, including
Task 8's canonical union; **U**, under decision 3 a forced split is the
same in every solution; **T**, §3; **R**, recorder correctness. Per
option: A, denotation of formulas and conservative extension of every
pass; B, adapter lemma (the witness evaluated at a ground instance of
pattern π equals the format's instantiation transferred to it), scope
of references, coverage of names; C, a substitution lemma for lowering
and a support rule for R010; D, solver completeness and determinism,
and **representation correspondence for the solver's bindings**: D
removes the symbolic certificate-to-witness adapter, not the path from
bindings to lowering (§18.64 item 4).

**Trust boundary.** The witness adapter is inside the lowering trust
boundary (§18.61). A ground re-check of `B` at each key narrows the
adapter's obligation; it does not make the adapter irrelevant unless
every relevant obligation is checked against the right key and
bindings. Recorder completeness, binding-to-layout correspondence,
admissibility and behavior preservation stay separate, and a failed
internal re-check is never evidence that the program is invalid
(§18.64 item 3).

### 4.4 Strategy interface (proposed; conditional on R0)

Each checking strategy is an injected value (AGENTS.md): a guard, an
untrusted search, a trusted `check`, and, if constructive, a witness
description. Each supplies `Sound_F`; today's cell format has it
(`cellOpenImpl`, checked). A refuter supplies `Refute_sound` (CX below).
Open points (review): whether `guard` is only a pre-filter (the cell
`check` already contains `fragmentS`); how `Cert tag` is represented in
PureScript; whether a non-constructive strategy may exist (then D or a
fallback). **Goal, conditional on R0 and on `Core` sufficing for every
format:** a new format is a new value; recorder and problem type are
unchanged; the verdict type gains only reason constructors.

**Verdicts** (names from docs/engineering.md): Solved (some strategy
accepted); Contradiction (separate evidence: a finite rigid assignment
over the bases plus fresh ones, satisfying `D`, and a refutation of
`B` there); Unresolved (everything else, with a reason ADT). Proposed
**CX**, unstated in Lean: for an injective `i : B → B₁` and a ground
substitution ρ of the rigid variables denoting a finite θR (finite at
every depth), `Sat θR (P.mapBase i).D` and `decideCall` false on
`(P.mapBase i).B` under ρ imply `¬ ValidOpen P`; it needs a substitution lemma
and `DecidableEq` on the extended
bases. `divide5` refused by every current certificate is Unresolved.

## 5. G3: compiling an unforced split

### 5.1 Four obligations, stated separately (§18.62)

- **Semantic validity:** a certificate establishes `ValidOpen`, CX
  refutes it; otherwise the verdict is Unresolved.
- **Acceptance requirements:** "forced" accounts for the complete
  semantic typing obligations, including printability and
  comparability wherever required; a split satisfying only the row
  equations is insufficient (§18.62 item 1).
- **Admissibility:** R010 stays separate. If several splits satisfy
  typing but only one passes the compilation restriction, it is the
  *only admissible split*, not a forced one. Selection respects both
  without conflating them.
- **Behavior preservation:** no behavioral difference between valid
  splits has been demonstrated. The exact proved fragment
  (`eval_split`, §18.21): projection-free split variants evaluate every
  projection-free λ-split term alike at every pair of keys, for the
  λ-split reference evaluator only; compiled Go agreeing with it is assumed
  (A-go), and the
  same-layout claim assumes Task 8's canonical form and M14 (cited
  split-selection §2.1, §5). It is not a whole-language theorem.

### 5.2 Acceptance examples (R6; programs and full tables in R6)

| Example | What the split changes | Note |
|---|---|---|
| L1 `divide` at a ground call | callee key only; same output | indistinguishable, under the assumptions above |
| A1 printability on a part (E2) | acceptance: one split prints, another is refused | lex accepts; "u = r∖s" refuses |
| D-acc `divide5` with `show` on `q` | acceptance, the reverse way | `d5Wit` accepts; `sigma5` and lex refuse: no fixed directional rule is safe |
| A2 comparability (cmp-open) | acceptance; and swapping tail order flips lex | presentation sensitivity, the substance of §18.17 item 2 |
| A3 `walk` (R010) | admissibility: under the documented single-tail rule, one admissible split among valid ones; today's code also admits the composed-tail split (R019, open) | probe: today refused earlier, at check (W1) |
| A4 interface inferred after choosing | which callers are accepted | selection must follow inference |
| A5 limits | key count under the 10,000 limit | the rule must be a function of (callee, key) |
| B2, B3 (future: projection; class-driven synthesis) | behavior | would break invariance; a rule must not apply outside the established fragment |
| F1-F3 forced and written controls | none (forced) | today refuses some forced splits (c21, O4) |

**Corrected witness table** (§18.62 item 3; definitions: `sigma5`,
research/composition-proofs/Composition/Sig/ProjectionDefs.lean:
197-200, sends `r`'s unwritten labels to `q`; `d5Wit`, Composition/
Typed/Cell/Proofs/W7/Divide5.lean:29-33). At `r = {x, y}`, `s = {}`,
`s2 = {}`, `as = [x]`:

| Witness | u | t | q |
|---|---|---|---|
| `sigma5` | {x} | {} | {y} |
| `d5Wit` | {x, y} | {} | {} |
| rejected lexicographic rule | {} | {x} | {y} |

### 5.3 Properties a rule would need (R6; no rule chosen)

Validity at every reached key; conservative over forced and written
splits; a function of the recorded problem and the key only; independent
of certificate format (byte-identical Go across adapters: a goal,
conditional on forcedness being decided, every type being determined
at each key, each adapter's lemma, and lowering reading only the
evaluated witness); respects requirement atoms and admissibility (P5:
valid and admissible, or Unresolved); stable under unrelated and
presentation-only changes (§18.31); uniform across keys; after
inference; confined to the fragment where behavior is established;
predictable from signatures. The rejected lexicographic rule fails
several (A2, A3, D-acc); the certificate's own witness fails format
independence and requirement atoms. **Selecting the identity witness
for `walk` is not presented as a remedy** (§18.63).

## 6. G1: the two certificate remedies (after the blockers)

### 6.1 One-literal guards on written labels (R2, corrected)

Format (proposed): `⟨row r, labels L, guard Option (row × Bool),
cubes⟩`, the guard on written labels only, its literal **evaluated in
θs**; `GenericInst`'s third conjunct is used only in proofs, so no new
evidence premise (argued; soundness review). New query, corrected:
`possWL r l K = decide (l ∈ written P) && cellPossS P ((r,true) :: K ++
[(x,false) | lacks x l ∈ D])`, polynomial by Horn least models with one
literal; two literals give 2-SAT; three or more open. Partition
(argued; the soundness review agreed): one literal splits a label two ways by
one rigid row; **one literal suffices at `l` iff some rigid `x` (or
none) gives a two-way split `{x present, x absent}` whose sides each
have a target admitted on that whole side.** `divide5`: three pieces,
O(m) labels. **`chain3`** needs two literals (valid: argued by the
routing "not c → u2; c ∧ not d → u3; c ∧ d → u1";
refusal by every one-literal certificate argued by enumerating the
exclusive literal pairs; a reviewer's unrecorded bounded evaluation
agrees on validity). Proposed as a separate checker beside the
reviewed one, with a conservative-extension theorem, so no accepted
theorem changes.

### 6.2 Pattern-dependent selection (R3, corrected)

A binary tree on literals `(x, l, b)`, `x` rigid, `l` written; leaves
are ordinary cell certificates (a flat list is rejected: its coverage
check is coNP-hard, argued).

**Leaf problem** (route a): for path literals `L`, `P_L = ⟨rigidTy,
rigidRow, D ++ A_L, B⟩`, where `A_L` adds `lacks x l` for each
negative literal and `lacks y l` for each `y` declared disjoint from
`x` (either order) for each positive literal. `cellOpenImpl` applies to
`P_L` verbatim (checked: it quantifies over every problem).

**Leaf conditions versus path conditions** (§18.62; argued, soundness
review): for any finite rigid assignment `θR` satisfying `D`, the
**path condition** (`θR`'s presence at each literal's row and label
matches the literal) **implies** the leaf condition (`Sat θR D_L`).
The converse fails for positive literals: `D_L` does not force `x` to
hold `l` (and adds nothing when `x` has no declared neighbours). So
leaves overlap, which is fine for validity. **The construction is
sound but potentially incomplete;** and the witness adapter must pick
an applicable leaf by the path condition at the key, which T2′ below
guarantees exists, not merely use a validity proof.

**Obligations** (proposed statements): T0 validation (literals on rigid
rows and written labels; unsatisfiable paths pruned); T1′ `P_L` stays
in the fragment, `written` unchanged as a label set, `thetaFree`
extensionally equal; T2′ every finite `θR` satisfying `D` reaches a
leaf whose path condition it meets, hence `Sat θR D_L`; T2″
`(P_L).mapBase i = (P.mapBase i)_L`; T3′ every leaf `ValidOpen` ⇒ `P`
`ValidOpen`; T4 tree soundness from `cellOpenImpl`, T2′, T2″, T3′.
Query equivalence with a relativized checker holds only when a path's
literals are jointly satisfiable under `D`.

**Size** (argued, corrected proof idea): every root-to-leaf path must
carry, for each written label `a`, a literal on `s` or `s2` at `a`, or
`(r, a, false)`; otherwise `d5_refused`'s argument refuses the leaf.
So `divide5` with m labels needs at least 2^m leaves (and 2^m suffice).
Measured precedent: strategy B, `divide3` at m = 16, 65,536 leaves,
43.1 MB (cited star/report.md §4.3).

### 6.3 Comparison and the gap neither closes

| | Guards | Selection (route a) |
|---|---|---|
| `divide5` | 3 pieces, O(m) | ≥ 2^m leaves |
| `chain3` | refused (needs 2 literals) | expected accepted per label (unchecked) |
| G2 | refused | refused |
| new semantics | guarded pieces, semantic `sameW`, `possWL` | none |
| proof delta | ~2-3 wave-sized streams | ~1-2 streams |
| precedent | `sigma5` (projection format) is already one-literal guarded; novel: guards on written labels in the cell format | P9s `checkAll`, strategy B; novel: positive literals as neighbour `lacks`, the case split, the cell size bound |
| author's earlier ruling | — | a certificate-supplied split tree; §18.54 item 3 left it unadopted pending its own statements and review |

**G2** (argued; a reviewer's unrecorded bounded evaluation agrees): rigid `r`;
flexible `x, y, β`;
`D = []`; `{...r, ...x} = {a: β, ...y}` is valid, and no certificate
value denotes `r`'s field type at a generic instance (no `CellV`
reaches it; `rty` reaches rigid type variables only), so every
certificate is refused under any guard language and selection tree.
The earlier `pick` example is withdrawn: with `q`, `s` rigid it is
invalid at `q = s = {}` (argued; a reviewer's unrecorded
bounded evaluation agrees); with only `q` rigid it is
this example renamed. G2 stays under the field-reference deferral
(§18.54).

## 7. The architectural test: `submit` end to end

Source (R1; existing syntax): `file(doc: {...u, ...t, ...q}, inbox:
{...s}, archive: {...s2})` with `where u disjoint s, t disjoint s2,
q lacks {id}`, and `submit(doc: {...r}, inbox: {...s}, archive:
{...s2}) where s disjoint s2 = file(doc, inbox, archive)`. Its hand
translation `route5Sig [id]` (a name for this translation; not a Lean
definition) keeps the call's copies `s'`, `s2'` and `file`'s implied
pairwise disjointness; equivalence with `divide5Sig [id]` is argued,
not proved; a reviewer's unrecorded bounded evaluation finds both
valid.

| Stage | Today | With R0 | With a G1 remedy | Compilation |
|---|---|---|---|---|
| record | lost if H refuses (predicted D6 "neither … can hold …", as checked for `route`) | complete `B`, `BQ` | same | — |
| cell strategy | — | refused → Unresolved (NoAcceptedCertificate) | — | — |
| guard strategy | — | — | `sigma5`-shaped certificate, once G-obligations are proved → Solved | — |
| selection strategy | — | — | root literal on `(s, id)`, two leaves (m = 1; this program does not exercise the 2^m bound) → Solved | — |
| witness adapter | — | — | `u` = `r` where `s` lacks the label, `t` = `r` where `s` holds it, `q` = `r`'s rest or empty, per format | — |
| admission | — | — | — | decision 3: "valid; split not determined" (G3), unless C8 and a rule are adopted |

## 8. Change impact when a G1 extension arrives

| Component | Status |
|---|---|
| bridge (B5, `openCharacterization`, `openToFin`), CV1, `cellShape_thetaFree`, CG, CI5 | proved; unchanged definitions (argued for guards) |
| cell checker theorems (waves 1-2) | proved; stay true of the cell checker; transfer to guards via conservative extension, to selection per leaf |
| recorder, recorded problem, translation rules | goal, conditional on R0 and on `Core` sufficing for every format |
| verdict type, diagnostics, refuter | goal, conditional on R0 and on CX being stated and proved |
| certificate type, checker, its proofs, search | new per format |
| witness adapter and its lemma | new per format (option B); absent in D, replaced by representation correspondence |
| witness representation, lowering, layouts, Go | goal, conditional on §3's termination contract, §4.3's obligations, Task 8 and M14 |
| admissibility (R010), decision-3 policy, selection interface | goal, conditional on R019's contract, T2, and a forcedness decider |

## 9. Decisions for the author, with consequences and obligations

1. **R0 design: generate-then-decide or online with advisory
   refusals** (§2.4). Consequences: (i) means a syntax-directed recorder
   and the online solver demoted to a search; (ii) keeps the solver but
   needs outcome types, tainting and a substitution-independence proof
   for every hook. Remaining obligations either way: T-R0 fixtures; the
   refusal audit (class c: a soundness statement for each c1 rule, or
   counter-instance fixtures for c2; `shareTails` principality); CX. Candidate
   tranches (R7, none started): T-R0a
   generation/verdict interface; T-R0b syntax-directed recorder
   specification; T-R0c refusal audit with counter-instance fixtures
   (can start independently); T-R0d CX and a refuter; T-R0e separating
   decision-3 admission, R010 descriptions, Task 8 and support
   boundaries.
2. **R019's contract** (§3.2 T4): admit composed tails (needs a
   termination argument) or narrow the code (rejects accepted
   programs). Prerequisite of the termination theorem.
3. **The termination statement** (§3.2 T2) and the name marker (T1):
   which finite-key statement or measure, judged on which form.
   Consequence: it constrains which witness representation is viable.
4. **Witness representation** (§4.2): A, B (per name), C, D, or a
   hybrid; and whether every strategy must be constructive.
   Obligations: §4.3's common and per-option correspondences.
5. **Ground re-check at keys** (§4.3): narrows the adapter's trust;
   obligations: re-check soundness, and that it reads the right key
   and bindings; it never yields "invalid".
6. **G3:** whether to pursue C8 for a fragment plus a selection rule
   (§5.3's properties); without it, `divide5`- and `route`-shaped
   programs are valid but not compilable.
7. **G1 extension, after the above:** guards (separate checker,
   conservative extension, ~2-3 streams) or selection (route a, ~1-2
   streams, exponential certificates; reintroduces a split tree), or
   neither yet. Before either: `chain3`'s validity and the partition
   lemma stated precisely.
8. **G2:** field references stay deferred (§18.54); R3's example is
   recorded as valid but uncertified.
9. **A distinct error code for Unresolved** (changes pinned fixture
   codes; recon §4.2).

## 10. Plans to revise before implementation

| Plan | Coupling | Revision (proposed) |
|---|---|---|
| recorder-spec §5.2, §6, Q10; recon step 6 | recorder inside a verdict-making solver; atoms stored in the substitution | §2 (R0) |
| recon §0, §2.4, §5.3 | `Judge` (End.purs:39, a per-predicate H type) as the plug point | a whole-problem end-of-body interface |
| recon §2.2, §3.3, §3.4, §4.3, §5.1 steps 5, 8, 9, §5.2 risk 1, §6 Q6, Q7 | built on porting P9s `checkAll` | per strategy: port `check_F`, differential per tag, cost per strategy |
| recon §2.3, §3.2, step 7 | P9s `interp`/`hS`; certificate in checked IR | §4 |
| recorder-spec §3 "covered by", §7; recorder-interface §6 | guarantees via `checkAll_validFin` | per strategy via `Sound_F` |
| recorder-spec §8 P1, P1b | stated over `ValidFin` and a `checkAll`-named checker | `ValidOpenR`, `Sound_F`-shaped |
| recorder-spec H2, §4 row H2 | decision 3 rendered as Unresolved | a separate admission refusal |
| recorder-spec T8a; recon step 4; recorder-interface §5 | online σ read as a P9s certificate | a per-format adapter on the search side |
| recorder-spec §2.4 (`slots`), H1, H4, L9, P3, P5 | admissibility and lowering over certificate syntax | witness description (§4) |
| recorder-spec §2.5 `Outside RequirementAtom` | a checker limit encoded as a model gap | an `Unsupported` reason |
| recorder-interface §0, §2, §4 | output to the P9s oracle format; effect rows dropped; superseded types | mark superseded; follow recorder-spec |
| split-selection §2.1, §2.2, §2.3, §3.5, §5 | witness forms by format; R010 argument rests on the rejected rule; solver dependencies | §3, §4; §2.3's premise lost |
| translation.md §2.1, §2.4, §4, §5 | verdicts for `ValidFin`/P9s; presence-projection exactness and region sizes | restate as `ValidOpen`; label P9s-specific claims |
| ADR 007 (holes ground) | key-dependent names | §3.2 T1 |
| docs/language.md Tranche B paragraph | stale (placeholder now at specialization) | recorded in findings; doc not changed here |

## 11. Unresolved couplings

1. R0's design (§9 item 1) and the refusal audit (class c premises).
2. `ValidOpenR` for requirement atoms is unstated (recorder-spec P1
   states only `ValidFinR`); until then problems with non-empty `BQ`
   are Unsupported for every strategy.
3. CX and its substitution lemma.
4. Termination (§3) and R019.
5. Forcedness is a "for all solutions" property; who decides it on the
   typed fragment, where type variables couple labels.
6. The adapter or representation correspondence (§4.3).
7. Keys to model instances, including constructs outside the fragment
   (recon risk 3), and that reached keys satisfy their `D`.
8. Requirement atoms and witness choice (E2): acceptance depends on
   the split.
9. Task 8 and M14 are prerequisites; same-layout is assumed.
10. Per-key solving cost (option D), unmeasured.
11. Slicing (S1/S2) between recorder and checker must quantify over the
    original recorded problem.
12. `route5Sig` versus `divide5Sig`: argued equivalent, not proved.
13. Effect/record independence (recon risk 6): effect refusals consume
    record-solved metas.

## 12. Provenance and reviews

Parts (read-only): R1 the program and translation; R2 guards; R3
selection; R4 front half; R5 back half; R6 G3 examples; R7 R0
inventory; R8 witness representations. The `walk` probe (§18.62 item
2). Reviews of the draft at 17da85d: architecture ("not ready for
approval": R0 incomplete, unconditioned independence claims, no
restrictions tables, missed couplings) and soundness (`pick` false;
query equivalence, `possWL`, byte-identical Go, reuse claims
overstated; `chain3`, R3's example, the partition lemma, the case
split, the 2^m bound and CX's core hold). This revision applies both
and the author's rulings §18.61-18.64. A targeted re-review of this
revision (at 7a8610a) found the rulings and promised corrections
applied, 23 of 26 citations accurate, and twelve findings, all applied
here: the class-c conflation of semantic grounds with solver state
(the author's added check), `walk`'s admissible split stated without
its condition, three citations, CX's missing `i`, and labelling of
unrecorded evaluations. The parts' and reviews' reports are not stored
in the repository; their findings are summarized here and in the
dossier. Restrictions tables for the
witness options are in R8's report and summarized in §4.2; for guards
and selection in §6.

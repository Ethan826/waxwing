# Record composition: definitions and claims (statements-first dossier)

Date: 2026-10-20. Status: draft for the author's review. Approval of
this phase covers definitions, claim statements and counterexample
exploration. It does not cover proofs, adopting solver machinery or
changing the compiler; those come back to the author with the completed
dossier (ADR 014; the assessment's decision 1).

Sources: docs/plans/2026-10-20-composition-foundation-assessment.md
(§4.8-§4.12, with their evidence); requirements:
docs/plans/2026-10-20-composition-acceptance-programs.md. Candidate
foundation: Wand, Type inference for record concatenation and multiple
inheritance (LICS 1989), with Sulzmann's HM(RECc) (thesis 2000, §5.1.2)
as a second statement of the same deduction.

Every claim below carries one status, its assumptions and its source:

- **published**: stated and proved in a cited source, for the system
  cited (a transfer to Waxwing is a separate claim);
- **derived**: argued here from published results; not yet proved or
  checked by a proof assistant;
- **checked**: supported by executable evidence on finite cases (an
  oracle over small domains, or a run of a published implementation);
  evidence, not proof;
- **unresolved**: stated, with no argument yet.

## 1. Definitions

**D1. Labels and types.** `L` is an infinite set of labels. Types are
built from base types, function types and record types. A *row* is a
finite partial map from labels to types; `dom ρ` is its set of labels.
The record type `{ρ}` is exact: a value of that type has exactly the
fields `dom ρ`, with those types. Two record types are equal iff their
rows are equal as maps.

**D2. Variables.** Type variables range over types and row variables
over rows. Each variable of a checking problem is either *flexible*
(the checker may choose it: instantiations at a call, unannotated
lambdas) or *rigid* (the function must work for every value of it: the
row variables of a declared signature, inside its body). An assignment
`θ` maps every variable to a ground type or row.

**D3. Disjoint composition** (Waxwing's spread). For rows `ρ1`, `ρ2`:
`ρ1 ⊎ ρ2` is defined iff `dom ρ1 ∩ dom ρ2 = ∅`, and is then their
union. The type `{ ...r, ...s }` denotes `{θ(r) ⊎ θ(s)}`; writing it
carries the requirement that `θ(r)` and `θ(s)` are disjoint. Grouping
and order do not matter where defined (⊎ is associative and
commutative as a partial operation).

**D4. Biased composition** (Wand §2). `ρ1 ◁ ρ2` is always defined: the
fields of `ρ2`, plus those of `ρ1` whose labels `ρ2` lacks. The right
operand wins on overlap. (Sulzmann's §5.1.2 operator is biased the
other way; the side does not matter below.)

**D5. Constraints.** Atomic constraints: type equality `τ1 = τ2`;
`r lacks { l }` (`l ∉ dom θ(r)`); `r disjoint s` (`dom θ(r) ∩ dom θ(s)
= ∅`); field presence `l ∈ r : τ` (`θ(r)(l) = τ`). Constraint sets are
conjunctions. `sol(C)` is the set of assignments satisfying `C`. `C`
*entails* `c` (`C ⊨ c`) iff every member of `sol(C)` satisfies `c`.

**D6. Checking problems.** A call site gives a constraint set over
flexible variables only. A declared signature `∀ā. D ⇒ τ` with body
constraints `B` gives the *signature problem*: for every assignment
`θR` of the rigid variables `ā` that satisfies `D`, some assignment
`θF` of the body's flexible variables satisfies `B` (a ∀∃ statement,
not a satisfiability question).

**D7. Wand's encoding** (Wand §5, published for D4). Per label `l` and
per record, a *presence* `pres(τ)` or `absent`. For each occurrence of
a composition with left presence `f`, right presence `g` and result
presence `h`, per label: `(g = pres(τ) ∧ h = g) ∨ (g = absent ∧ h = f)`.
Each occurrence has its own `h`. A problem is typable iff some disjunct
of the disjunctive normal form, as a unification problem, has a
solution (§5 Theorem, §6 Theorem and Corollary).

**D8. The disjoint restriction of D7** (this dossier). The same, with
the first disjunct strengthened: `(g = pres(τ) ∧ f = absent ∧ h = g) ∨
(g = absent ∧ h = f)`. It is the per-label form of Makholm and Wells's
symmetric Casino rule (TR §2, Fig. 2, published, without row variables)
and of Simon's `¬(f1 ∧ f2)` (PLDI 2014 §5, published, over presence
flags with one shared type).

## 2. Verdicts and what each gives compilation

A procedure answers a checking problem with one of three verdicts.
Each verdict states what it guarantees; compilation may use only that.

- **Solved(σ, C′, W)**: `σ` is a substitution, `C′` a residual
  constraint set and `W` a witness assignment. Guarantees: (i) `C` and
  `C′σ` have the same solutions on the problem's variables; (ii) `W`
  satisfies `C′`, so `C` is satisfiable; (iii) for a signature problem,
  the ∀∃ statement of D6 holds. Compilation receives `σ`, `C′`, and the
  set of variables that `C′` leaves *undetermined* (several values in
  `sol(C′)`); §4 says when it may use `W` for them.
- **Contradiction(E)**: `sol(C)` is empty (for a signature problem:
  there is a `θR` satisfying `D` for which no `θF` exists). `E` is
  evidence a reader or test can check: a refutation from the rules, an
  exhausted case split, or, for a signature, the counter-instance `θR`.
  Compilation receives nothing; the program is ill-typed.
- **Unresolved(C′)**: the procedure stopped without deciding.
  Guarantees only (i). Compilation receives nothing; the diagnostic must
  say the checker could not decide, never that the program is wrong.

A procedure is *sound* if Solved and Contradiction always meet their
guarantees, *refutation-complete* if it never answers Unresolved for an
unsatisfiable problem, and *complete* if it never answers Unresolved.
An incomplete procedure is acceptable only if it answers Unresolved,
never Contradiction, where it cannot decide, and if the required
programs (4, 5, 11 and their controls) never reach Unresolved.

## 3. Claims

### 3.1 Composition: what transfers from Wand

- **C1** (derived; assumptions D3, D4). Where `dom ρ1 ∩ dom ρ2 = ∅`,
  `ρ1 ⊎ ρ2 = ρ1 ◁ ρ2 = ρ2 ◁ ρ1`. So a disjoint composition is a biased
  composition plus the disjointness requirement, and the requirement is
  the only difference.
- **C2** (derived from Wand §5 by C1). D8 is sound and complete for D3
  on ground rows: an assignment satisfies D8's constraints for an
  occurrence iff the two parts are disjoint and the result is their
  union.
- **C3** (published for D4, Wand §5-§6; transfer to D8 derived).
  Satisfiability of a call-site problem built from D5's atoms and
  compositions is decidable: finitely many disjuncts, each a
  unification problem. Assumption: the finite reduction of C4.
- **C4** (published for D4 without `lacks`, Wand §5 and §7's padding;
  with D5's atoms and rigid variables, unresolved). Only the labels
  written in the problem matter, plus one stand-in per row variable for
  "all other labels". The reviewer's caution applies: presence is
  finite, field types and unknown tails are not; the claim is that the
  disjuncts reduce to unification problems over finitely many label
  positions, and that needs its argument for D5's atoms.
- **C5** (published, Wand §5 "for each occurrence"; Sulzmann Remark 5;
  Palsberg and Zhao Def 5.3). Field types are per record: two
  compositions sharing a part have independent result fields. This is
  what keeps program 11.

### 3.2 Three different questions about a split

For a composition `{ ...r, ...s }` meeting a record whose fields are
known (a call), three claims are separate, and only the first is what
Wand's typability gives:

- **C6, a satisfying split exists** (C3): some assignment of `r` and `s`
  satisfies the problem. Decides acceptance and the negative controls.
- **C7, a placement is forced** (derived from Jones, FPCA 1995 §4.1,
  published: improvement is sound iff it does not change the set of
  solutions). `l ∈ r : τ` may be added to `C` iff `C ⊨ l ∈ r : τ`. By
  D5 that holds iff `C ∧ r lacks { l }` is unsatisfiable, so forced
  placement is decided by C6's procedure, once per label and part.
  Sulzmann's REC5-REC6 are instances (published, axioms; his printed
  closure misses the closed-result case, assessment §4.10).
- **C8, the split does not matter to meaning** (unresolved). See §4.

Program 4's split is forced (C7): with `r ⊎ s = { admin }` and `s
lacks { admin }`, adding `r lacks { admin }` leaves no solution. The
same interface called without the `lacks` fact has two solutions; C6
holds, C7 holds for neither placement, and only C8 could let the
program compile.

### 3.3 Signatures

- **C9** (unresolved). Checking a declared signature (D6) against
  composition constraints is decidable, by a procedure to be found. No
  examined system gives one: Wand decides only whether a monotype is an
  instance (§6, published); Pottier gives a sound, incomplete scheme
  comparison without composition (thesis ch. 9, published); Madsen and
  van de Pol handle rigid variables as ∀∃ in Boolean unification
  (OOPSLA 2020 §3.2, published, for Boolean formulas, not rows). Routes
  to examine, not designs.
- **C10** (derived; D2, D6). A Contradiction for a signature has a
  checkable witness: the counter-instance `θR`. Program 6's negative
  control has one for every `θR` (the promised `extra` never appears in
  `θ(r) ⊎ θ(s)` when `r`, `s` lack it; if they may hold it, the instance
  where they do not).
- **C11** (derived). The syntactic case suffices for program 6: the
  body's constraint `r disjoint s` (from instantiating `join` at the
  rigid `r`, `s`) is literally one of the declared clauses, so `D ⊨ B`
  by inclusion. This decides program 6, not the general C9.
- **Question for the author.** A signature whose clauses `D` have no
  solution makes D6 hold vacuously. Should a declaration with
  unsatisfiable clauses be refused (C6 applied to `D`)?

## 4. When alternatives may remain

Monomorphized Go needs every record value's fields fixed. After a
Solved verdict, a row variable may still be undetermined (program 4
without its `lacks`; O4's two-solution variant). A search that finds
one layout (Palsberg and Zhao's `S_R`, Def 5.6; Wand's first unifiable
disjunct) shows the program has a meaning for that layout. It does not
show the program means the same for every layout.

- **C8, split irrelevance** (unresolved). If no construct of the
  language can observe how a record of type `{ ...r, ...s }` divides
  between `r` and `s`, then every satisfying split gives the same
  observable behaviour, and the checker may fix the witness `W`
  deterministically (for example, the least split in label order).
  Assumption to establish by inventory, construct by construct: field
  access, `without`, rest binders, spreads, equality, `show`, effects
  and handlers, specialization keys (the generated code differs in names
  only), program 7's per-field dictionaries (their labels come from the
  caller's argument), and any future class instance selected by a row.
  A construct that observes the split makes C8 false for programs that
  use it; those programs would need the split forced (C7) or written.
- **Policy, for the author** (decision 3). Alternatives may remain past
  checking only when C8 holds for the program; otherwise the checker
  refuses with a diagnostic naming the undetermined variable and its
  alternatives. That diagnostic is not a Contradiction.

## 5. The programs and controls against the claims

| Program | Constraint at the deciding point | Expected verdict | Claims used |
|---|---|---|---|
| 3 `join({ name }, { age })` | `r ⊎ s` with both known | Solved, no residual | C2, C3 |
| 3 overlap `join({ a }, { a })` | `r ⊎ s`, both hold `a` | Contradiction (Wand's D7 accepts: the transfer difference) | C1, C2 |
| 4 `acceptsParts({ admin: false })` | `r ⊎ s = { admin }`, `s lacks { admin }` | Solved; `r = { admin: Bool }`, `s = {}` forced | C3, C7 |
| 4, negative | both lack `admin` | Contradiction | C3 |
| 4 without `lacks` | `r ⊎ s = { admin }` | Solved with `r`, `s` undetermined; compiles only under C8 | C3, C8 |
| 5 `composeRequirements(join, restricted)` | `u ⊎ v = { x, y }`, `u lacks { y }`, `v lacks { x }` | Solved; `u = { x }`, `v = { y }` forced | C3, C7 |
| 5, both lack `y` | `u ⊎ v = { x, y }`, `u`, `v` lack `y` | Contradiction | C3 |
| 6 `forwarded` | body `r disjoint s` under declared `r disjoint s` | Solved | C11 |
| 6, negative (promises `extra`) | `{ extra, ...r, ...s } = { ...r, ...s }` for all `θR` | Contradiction, counter-instance | C10 |
| 11 `both` | `q lacks { a }`; `q ⊎ { a: Int }`, `q ⊎ { a: Bool }` | Solved, two independent results | C2, C5 |
| 11, negative `both({ name, a: 2 })` | `q = { name, a }`, `q lacks { a }` | Contradiction | C3 |

Program 5's higher-order step also needs `join`'s constrained scheme
instantiated with its `disjoint` clause carried into the call's
constraint: HM(X) instantiation (Odersky, Sulzmann and Wehr, TAPOS
1999, published). Program 8's local generalization with residual
constraints is out of this dossier's scope and listed in §7.

## 6. Counterexamples a procedure must handle

From the implementations examined (assessment §4.10-§4.11; probes in
research/composition-assessment/wand/):

| Case | Found in | Required verdict |
|---|---|---|
| `(r ⊎ s).x` used as Int and as Text | Gonzalez: accepted with contradictory residual constraints | Contradiction (Solved needs (ii)) |
| `x: (k: k x + k x) (y: 0)` | Gonzalez: occurs check on `a = a` | Solved |
| a composition nested in a field's type, then that field's field used at the wrong type | Gonzalez: accepted (substitution misses nested fields) | Contradiction |
| `concat(α, β, { admin })` with `β lacks admin` | Sulzmann's printed closure: placement not derived for a closed result | `α` holds `admin`, forced (C7) |
| overlap of two known records | Wand, Gonzalez: accepted (biased) | Contradiction (C2) |
| program 4 and 5 calls | Waxwing today: D4, Unresolved | Solved (C3, C7) |

## 7. Obligations, by status

| Id | Claim | Status | Next evidence |
|---|---|---|---|
| C1 | disjoint = biased + disjointness | derived; checked (oracle) | proof |
| C2 | D8 encodes ⊎ | derived; checked (oracle, all 64 triples) | proof |
| C3 | call-site satisfiability decidable | published (D4); derived (D8) | depends on C4 |
| C4 | finite label reduction with D5's atoms | partly published; unresolved | argument |
| C5 | per-record field types | published | program 11 probes (Wand, run) |
| C6 | a split exists | = C3 | |
| C7 | forced placement = entailment, by refutation | derived (Jones); checked on programs 4, 5 | proof |
| C8 | split irrelevance | unresolved | construct inventory |
| C9 | signature checking decidable | unresolved | examine the three routes |
| C10 | signature Contradiction has a counter-instance | derived; checked on program 6's control | proof, with C9 |
| C11 | program 6 by inclusion | derived | |
| - | `let`-generalization with residual constraints (program 8) | published in general (HM(X)); with D8, unresolved | after C9 |
| - | lowering preserves checking's meaning | unresolved | translation and differential tests |

"Oracle" means a bounded enumerator over small label sets and base
types: evidence, not a complete reference (C4 is what would make it
one).

## 8. Counterexample exploration, and what comes next

Run (2026-10-20): research/composition-assessment/oracle/oracle.mjs
enumerates every row over five labels and three base types (1,048,576
pairs) and checks C1, C2 (all 64 presence triples), C7 on programs 4
and 5 (entailment and refutation agree; not forced without the
`lacks`), C10 on program 6's control (2,401 declared instances, each a
counter-instance) and every row of §5 except 6 and the implementation
counterexamples of §6, which need a checker, not an enumerator. 18 of
18 checks hold. Two mutants show the checks can fail: biased union in
place of ⊎ fails C1, program 3's overlap and program 4 without its
`lacks` (5 solutions instead of 2); D8 without `f = absent` fails C2.
No counterexample was found. The oracle evaluates ground assignments,
so it says nothing about C4, C8 or C9, which stay unresolved.

Next, on the author's word: no proofs, no solver design and no compiler
change before the author approves, edits or cuts the claims.
The author then approves, edits or cuts the claims; proofs and any
adoption come after, as ADR 014 and the assessment's decision 1 set
out.

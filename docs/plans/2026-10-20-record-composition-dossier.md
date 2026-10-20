# Record composition: definitions and claims (statements-first dossier)

Date: 2026-10-20, revised the same day after the author's review (§8);
first proof milestone the same day (§9). Status: for the author's
review at the milestone; no decision procedure or compiler change
authorized. Approval of
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

## 2. Verdicts, for calls and for signatures

A procedure answers a checking problem with one of three verdicts. A
call and a signature ask different questions (D6), so the verdicts are
stated for each. Compilation may use only what a verdict guarantees.

### 2.1 Calls: does a solution exist?

The problem `C` has flexible variables only.

- **Solved(σ, C′, W)**: `σ` is a substitution, `C′` a residual
  constraint set and `W` an assignment. Write `eq(σ)` for the binding
  equations `x = σ(x)`, one per variable `σ` binds. Guarantees: (i)
  `C` and `eq(σ) ∧ C′` have the same solutions on the problem's
  variables (the bindings are kept: applying `σ` to `C′` alone would
  lose them, since solving `x = Int` leaves `σ = [x ↦ Int]` and an
  empty `C′`); (ii) `W` satisfies `eq(σ) ∧ C′`, so `C` is
  satisfiable. Compilation receives `σ`, `C′`, and the variables left
  *undetermined* (several values among the solutions); §4 says what it
  may do with them.
- **Contradiction(E)**: `sol(C)` is empty. `E` is evidence a reader or
  test can check: a refutation from the rules or an exhausted case
  split. Compilation receives nothing; the program is ill-typed.
- **Unresolved(C′)**: the procedure stopped without deciding.
  Guarantees only (i). Compilation receives nothing; the diagnostic must
  say the checker could not decide, never that the program is wrong.

### 2.2 Signatures: does every permitted instance have a solution?

The problem is `∀ā. D ⇒ ∃b̄. B`: rigid `ā` with the declared clauses
`D`, flexible `b̄` with the body's constraints `B`.

- **Solved(σ, B′)**: guarantees the quantified statement itself: for
  every `θR` satisfying `D` some `θF` satisfies `B`. One satisfying
  pair `(θR, θF)` does not establish it, and `D ∧ B` can have
  solutions while the signature fails: a body that writes `admin`
  beside `...r` needs `r lacks { admin }`, which some `θR` meet and
  `θR(r) = { admin: Int }` does not. The residual
  `B′`, with `σ` binding flexible variables only, keeps the rigid and
  flexible variables apart and the quantifier order: `∀ā. D ⇒ ∃b̄. B`
  and `∀ā. D ⇒ ∃b̄. eq(σ) ∧ B′` must be equivalent, and any part of
  `B′` that mentions rigid variables only must be entailed by `D`, or
  the verdict is not Solved.
- **Contradiction(θR, E)**: two parts, both required. `θR` is a rigid
  assignment that satisfies `D` (checkable by evaluation), and `E` is a
  call-site Contradiction (§2.1) for `B` with `θR` substituted: no
  flexible assignment works for that instance. The instance alone shows
  which declared inputs fail, not that the search for `θF` is empty.
- **Unresolved(B′)**: as for calls; no claim about the signature.

### 2.3 Declarations

Author's decision (2026-10-20): a declaration whose `where` clauses `D`
are unsatisfiable is refused, reporting that its requirements are
contradictory, and its body is not checked against them vacuously.
`D` is checked as a call-site problem with `ā` treated as flexible:
Contradiction refuses the declaration; Unresolved is reported as
Unresolved, never as a contradiction.

### 2.4 Soundness and completeness

A procedure is *sound* if Solved and Contradiction always meet their
guarantees, *refutation-complete* if it never answers Unresolved for a
problem that fails, and *complete* if it never answers Unresolved. A
call fails when `C` has no solution. A signature fails when its
quantified statement is false: some `θR` satisfies `D` and no `θF`
satisfies `B` for it. That is not the unsatisfiability of `D ∧ B`,
which can have solutions while the signature fails (§2.2).
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
- **C7, a placement is forced.** Improvement (Jones, FPCA 1995 §4.1,
  published) may add `l ∈ r : τ` to `C` iff `C ⊨ l ∈ r : τ`. That has
  two parts, presence and type, and they are separate claims:
  - **C7a, presence** (derived; D5). `C ⊨ l ∈ dom r` iff `C ∧ r lacks
    { l }` is unsatisfiable. So forced presence is decided by C6's
    procedure, once per label and part.
  - **C7b, type** (derived; D3). Presence fixes no type: if `C` fixes
    `r = { x: Bool }`, then `C ∧ r lacks { x }` is unsatisfiable while
    `C ⊭ x ∈ r : Int`. (The first version of this dossier stated C7 as
    "`C ⊨ l ∈ r : τ` iff `C ∧ r lacks { l }` is unsatisfiable", which
    this example refutes.) The claim: if `C ⊨ l ∈ dom r` and every
    solution gives the composition's result `θ(r) ⊎ θ(s)` the field `l
    : τ`, then `C ⊨ l ∈ r : τ`, because a disjoint union takes `l`'s
    field from the part that holds it. Programs 4 and 5 meet both
    premises: the result is the caller's known record.

  Sulzmann's REC5-REC6 state C7a and C7b together for `concat` (published,
  axioms; his printed closure misses the closed-result case, assessment
  §4.10).
- **C8, the split does not matter to meaning** (unresolved). See §4.

Program 4's split is forced: with `r ⊎ s = { admin: Bool }` and `s
lacks { admin }`, adding `r lacks { admin }` leaves no solution (C7a),
and the result's `admin` is `Bool`, so `r`'s is (C7b). The same
interface called without the `lacks` fact has two solutions; C6 holds,
C7a holds for neither placement, and the program compiles only under
§4's policy.

### 3.3 Signatures

- **C9** (unresolved). Checking a declared signature (D6) against
  composition constraints is decidable, by a procedure to be found. No
  examined system gives one: Wand decides only whether a monotype is an
  instance (§6, published); Pottier gives a sound, incomplete scheme
  comparison without composition (thesis ch. 9, published); Madsen and
  van de Pol handle rigid variables as ∀∃ in Boolean unification
  (OOPSLA 2020 §3.2, published, for Boolean formulas, not rows). Routes
  to examine, not designs.
- **C10** (derived; D2, D6, §2.2). A signature's Contradiction has
  checkable evidence in two parts: an instance `θR` satisfying `D`, and
  a call-site Contradiction for the body at that instance. For program
  6's negative control every `θR` satisfying `D` (`r disjoint s`, both
  lacking `extra`) is such an instance: the parameter types are exact
  records, so the flexible parts of `join`'s instantiation must equal
  `θR(r)` and `θR(s)`, and then the promised `{ extra } ⊎ θR(r) ⊎
  θR(s)` differs from the body's `θR(r) ⊎ θR(s)`; no flexible
  assignment remains.
- **C11** (derived). The syntactic case suffices for program 6: the
  body's constraint `r disjoint s` (from instantiating `join` at the
  rigid `r`, `s`) is literally one of the declared clauses, so `D ⊨ B`
  by inclusion. This decides program 6, not the general C9.
- **Unsatisfiable clauses** make D6 hold vacuously; §2.3 records the
  author's decision to refuse such declarations.

## 4. When alternatives may remain

Monomorphized Go needs every record value's fields fixed. After a
Solved verdict, a row variable may still be undetermined (program 4
without its `lacks`; O4's two-solution variant). A search that finds
one layout (Palsberg and Zhao's `S_R`, Def 5.6; Wand's first unifiable
disjunct) shows the program has a meaning for that layout. It does not
show the program means the same for every layout.

- **C8, split irrelevance for a fragment** (unresolved). For a stated
  fragment of the language: if no construct in it can observe how a
  record of type `{ ...r, ...s }` divides between `r` and `s`, then
  every satisfying split gives the same observable behaviour, and the
  checker may fix the witness `W` deterministically (for example, the
  least split in label order). This is a theorem about a fragment. It
  is not a procedure that recognizes every program whose split is
  irrelevant, and none is promised: deciding whether two executions
  behave the same is not attempted.
  Assumption to establish by inventory, construct by construct: field
  access, `without`, rest binders, spreads, equality, `show`, effects
  and handlers, specialization keys (the generated code differs in names
  only), program 7's per-field dictionaries (their labels come from the
  caller's argument), and any future class instance selected by a row.
  A construct that observes the split makes C8 false for programs that
  use it; those programs would need the split forced (C7) or written.
- **Policy** (author's decision, 2026-10-20; decision 3). An arbitrary
  split must not change observable behaviour. Initially the checker
  requires a split that is forced (C7) or written by the programmer;
  otherwise it refuses with a diagnostic naming the undetermined
  variable and its alternatives, which is not a Contradiction. Once C8
  is established for a fragment, programs within that fragment may
  leave the split undetermined and compile with the deterministic
  witness.

## 5. The programs and controls against the claims

| Program | Constraint at the deciding point | Expected verdict | Claims used |
|---|---|---|---|
| 3 `join({ name }, { age })` | `r ⊎ s` with both known | Solved, no residual | C2, C3 |
| 3 overlap `join({ a }, { a })` | `r ⊎ s`, both hold `a` | Contradiction (Wand's D7 accepts: the transfer difference) | C1, C2 |
| 4 `acceptsParts({ admin: false })` | `r ⊎ s = { admin }`, `s lacks { admin }` | Solved; `r = { admin: Bool }`, `s = {}` forced | C3, C7a, C7b |
| 4, negative | both lack `admin` | Contradiction | C3 |
| 4 without `lacks` | `r ⊎ s = { admin }` | Solved with `r`, `s` undetermined; refused as undetermined under §4's policy until C8 covers it | C3, C8 |
| 5 `composeRequirements(join, restricted)` | `u ⊎ v = { x, y }`, `u lacks { y }`, `v lacks { x }` | Solved; `u = { x }`, `v = { y }` forced | C3, C7a, C7b |
| 5, both lack `y` | `u ⊎ v = { x, y }`, `u`, `v` lack `y` | Contradiction | C3 |
| 6 `forwarded` | body `r disjoint s` under declared `r disjoint s` | Solved | C11 |
| 6, negative (promises `extra`) | `{ extra, ...r, ...s } = { ...r, ...s }` | Contradiction: an instance `θR` and no flexible assignment for it | C10 |
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
| `concat(α, β, { admin })` with `β lacks admin` | Sulzmann's printed closure: placement not derived for a closed result | `α` holds `admin`, forced (C7a, C7b) |
| overlap of two known records | Wand, Gonzalez: accepted (biased) | Contradiction (C2) |
| program 4 and 5 calls | Waxwing today: D4, Unresolved | Solved (C3, C7a, C7b) |
| `r = { x: Bool }`, asked whether `x ∈ r : Int` is forced | the first version of C7 | not forced: presence is, the type is `Bool` (C7a, C7b) |

## 7. Obligations, by status

| Id | Claim | Status | Next evidence |
|---|---|---|---|
| C1 | disjoint = biased + disjointness | proved (Lean, `c1`) | |
| C2 | D8 encodes ⊎ | proved (Lean, `c2`; D7 encodes biased, `d7_biased`) | |
| C3 | call-site satisfiability decidable | published (D4); derived (D8) | depends on C4 |
| C4 | finite label reduction with D5's atoms | partly published; unresolved | argument |
| C5 | per-record field types | published | program 11 probes (Wand, run) |
| C6 | a split exists | = C3 | |
| C7a | forced presence = refutation of `lacks` | proved (Lean, `c7a`) | |
| C7b | forced type from a known result under ⊎ | proved (Lean, `c7b`; first C7 refuted, `first_c7_false`) | |
| C8 | split irrelevance for a stated fragment | unresolved | construct inventory |
| C9 | signature checking decidable | unresolved | examine the three routes |
| C10 | signature Contradiction = instance + call-site Contradiction | proved (Lean, `c10`, `sigFails_iff`) | finding evidence is C9 |
| C11 | program 6 by inclusion | proved (Lean, `c11`, `p6_holds`) | |
| - | `let`-generalization with residual constraints (program 8) | published in general (HM(X)); with D8, unresolved | after C9 |
| - | lowering preserves checking's meaning | unresolved | translation and differential tests |

"Oracle" means a bounded enumerator over a fixed small domain of labels
and base types: evidence on that domain. C4 would not make it complete:
a reduction's finite bound depends on the input, so no fixed domain
covers every input. A complete reference procedure would need C4 proved
and a decision procedure for the reduced problems.

## 8. Counterexample exploration, and what comes next

Run (2026-10-20, second revision): research/composition-assessment/
oracle/oracle.mjs enumerates every row over five labels and three base
types (1,048,576 pairs) and checks C1, C2 (all 64 presence triples),
C7a and C7b on programs 4 and 5 (and not forced without the `lacks`),
the counterexample that refutes the first statement of C7, C10 on
program 6's control (for each of 2,401 declared instances, every
flexible pair meeting the parameter types) and every row of §5 except 6
and the implementation counterexamples of §6, which need a checker, not
an enumerator. 23 of 23 checks hold. Mutants show the checks can fail:
biased union in place of ⊎ fails C1, program 3's overlap and program 4
without its `lacks`; D8 without `f = absent` fails C2; program 6's
promise without `extra` fails C10. The oracle evaluates ground
assignments over a fixed domain, so it says nothing about C4, C8 or C9.

Revision history: the second revision (after the author's review)
split C7 into presence and type (C7a, C7b; the first statement was
false), required a call-site Contradiction beside the counter-instance
in C10, stated the verdicts separately for calls and signatures (§2),
recorded the author's decisions on unsatisfiable clauses (§2.3) and on
undetermined splits (§4), restated C8 as a theorem about a fragment,
and withdrew the remark that C4 would make the oracle complete.

## 9. First proof milestone (Lean 4)

Authorized by the author after the second revision: definitions, C1-C2,
C7a-C7b with the counterexample, C10's evidence principle and C11, and
the required programs. Proofs: research/composition-proofs/ (its README
has commands, files and every definitional choice); Lean 4.35.0, no
Mathlib. A clean build checks every proof with no warnings; no `sorry`,
`admit`, `native_decide` or declared axiom.

Exact theorem statements, in the dossier's terms (Lean names in
brackets):

- C1 [`c1`]: if `Disjoint r s` then `union r s = biased r s` and
  `union r s = biased s r`.
- C2 [`c2`]: `DUnion r s u ↔ ∀ l, D8 (r l) (s l) (u l)`; per label
  [`c2_label`]; and Wand's D7 at every label iff `u = biased r s`
  [`d7_biased`].
- C7a [`c7a`]: for any problem `C`, part and label, `C ⊨ part has l`
  iff `C ∧ part lacks l` has no solution.
- C7b [`c7b`]: if `C ⊨ r has l`, `C ⊨ DUnion r s u` and `C ⊨ u l =
  τ`, then `C ⊨ r l = τ`.
- First C7 refuted [`first_c7_false`]: with one label and `C` fixing `r
  = { x: Bool }`, the first statement's two sides differ.
- Signature failure [`sigFails_iff`]: "some `θR` satisfies `D` and no
  `θF` satisfies `B`" iff the quantified statement is false (classical).
- C10 [`c10`]: a `θR` with `D θR` and a proof that no `θF` satisfies
  `B θR` give signature failure. No procedure to find them is assumed.
  [`instance_alone_insufficient`]: an instance satisfying `D` is not by
  itself failure.
- C11 [`c11`]: if `B ρ φ ↔ P ρ ∧ E ρ φ`, `D ⊨ P` and every `ρ` has some
  `φ` with `E ρ φ`, the signature holds.
- §2.2's example [`fails_while_satisfiable`]: `D ∧ B` has a solution and
  the signature fails.
- Programs [`p3_overlap`, `p4_solved`, `p4_admin_forced` (through `c7a`
  and `c7b`), `p4_split_forced`, `p4_negative`,
  `p4_no_lacks_two_solutions`, `p5_solved`, `p5_split_forced`,
  `p5_negative`, `p11`, `p11_negative`, `p6_holds`,
  `p6_negative_refuted` (every declared instance), `p6_negative_fails`].

Assumption dependencies (`#print axioms`, axioms.out): only `propext`,
`Quot.sound` and, in `sigFails_iff` alone, `Classical.choice`.

Changed or added definitions: rows are all functions to `Option Ty`
(finiteness not assumed; the theorems hold for every finite map);
problems are predicates on assignments, not constraint syntax; the
programs are stated at their deciding constraint, written by hand, so
the step from Waxwing source to constraint is not formalized; program
6's body constraint is written by hand. §2.1's binding equations
(`eq(σ)`), C3, C4, C8 and C9 are not formalized.

Not vacuous: each Solved problem is shown satisfiable, and mutants
fail to check (program 4 without its `lacks`: `p4_admin_forced` and
`p4_split_forced`; `DUnion` without disjointness: `c2`, and program
proofs whose failures are partly structural).

Remaining targets, unchanged: C4 (finite reduction), C8 (irrelevance
for a fragment), C9 (signature checking, a conjecture to establish or
narrow). Next review point: the author's reading of these statements,
before any decision procedure or compiler change.

The author accepted this milestone (2026-10-20) with qualifications,
recorded here: rows as arbitrary maps suit the universal identities,
but existence and decision results must guarantee finite witnesses;
problems as predicates prove no algorithm; the program proofs use a
fixed six-label universe and do not show that further labels can be
ignored (that is the reduction's work). The milestone does not
establish inference completeness, signature decidability or compiler
correctness.

## 10. Second milestone: the call-site foundation

Authorized: constraint syntax and its interpretation; substitution and
the binding-equation correspondence, proved; the finite-reduction
theorem for existential call-site satisfiability, stated and brought
back before any proof. C8 and the general C9 are deferred; forced or
written splits (§4) let C8 wait.

### 10.1 Syntax and interpretation (definitions; Lean: Syntax.lean)

Type variables and row variables are numbered, and at a call site all
are flexible. Type expressions: base types, functions, type variables,
and record types written as fields plus row tails, `{ l1: t1, ...,
...r, ...s }`, nested to any depth. Atoms: `t = u`, `r lacks { l }`,
`r disjoint s`, and the unsatisfiable `ff`. A problem is a finite list
of atoms. Ground types are base types, functions and records whose rows
map labels to ground types. A record type denotes the disjoint
composition of its field rows and tails, and is undefined if two of
them share a label; an equation holds when both sides are defined and
equal. User-defined type constructors are not modelled.

### 10.2 Substitution and binding equations (proved; Lean:
Subst.lean, Correspond.lean, Binding.lean)

A substitution is a finite list of bindings, type variables to type
expressions and row variables to fields plus tails, applied once and in
parallel. `eqs σ` is `x = σ(x)` for each binding (for a row variable,
`{ ...r } = { fields, ...tails }`). Proved:

- `subst_evalT`: if an assignment satisfies `eqs σ`, every expression
  and its substitution have the same value (both undefined, or both
  defined and equal).
- `subst_sat`: under `eqs σ`, a problem and its substitution have the
  same solutions; `lacks` and `disjoint` on a bound row variable become
  the corresponding facts about its written fields (checked statically)
  and its tails.
- `binding_correspondence` (§2.1 (i)): if every solution of `C`
  satisfies `eqs σ`, then `C` and `eqs σ ++ Cσ` have exactly the same
  solutions.
- `bindings_needed`: the equations cannot be dropped. With `C` the
  single atom `x = true` and `σ = [x ↦ true]`, `Cσ` is `true = true`,
  satisfied by an assignment with `x = false`, which `C` excludes.

Dependencies: `propext`, `Quot.sound`, `Classical.choice` (partial
composition is defined classically; disjointness of arbitrary maps is
not decidable). Mutant: with `lacks` ignoring a bound row's fields,
`subst_lacks` fails.

### 10.3 The finite reduction: revised statements, proved

The author's review of the first statements (2026-10-20) found four
points; each is applied:

1. **Directional evaluation.** Restriction preserves a successful
   evaluation but not an undefined one: two rows overlapping only at an
   unwritten label compose once it is removed. R1 needs only the
   directional lemma `evalT_restrict` (if `t` evaluates to `g` under
   `θ`, and `t`'s written labels are in `L`, then `t` evaluates to `g`
   restricted to `L` under `θ` restricted to `L`). The first text's
   "commutes with evaluation" was too strong.
2. **Finite freshness.** `FreshFor` now asks for distinct fresh indices
   only for the pairs a pattern uses (a row variable of `C`, a label of
   `C`) and only that they avoid `C`'s type variables. `freshAlloc`
   allocates them explicitly (past the largest type variable, numbered
   by position in `pairsOf C`), and `freshAlloc_fresh` proves it meets
   `FreshFor`. Enumeration is now its own statement, `R2Enum`.
3. **Pointwise, not global.** One pattern adds equations that other
   solutions of `C` violate, so `binding_correspondence` does not
   apply. R2 is proved with the pointwise `subst_sat`, building in each
   direction an assignment that satisfies the chosen pattern's
   equations. R2 preserves existence across the enumerated patterns; no
   single pattern preserves `C`'s solutions.
4. **Decidable base types.** `R3Spec` now takes `DecidableEq B`.

Proved (Lean; clean build, no `sorry`; axioms `propext`, `Quot.sound`,
`Classical.choice`):

- **R1** (`r1`): `C` has a solution iff it has one in which every row,
  at every depth, has its labels among those written in `C`
  (`AssignWithin (labelsOf C)`). Such a witness is finite.
- **R2** (`r2`): for any `fresh` with `FreshFor C fresh`, `C` has a
  solution iff some pattern `π` gives a closed problem
  `patternProblem C π fresh` with a solution.
- **R2′** (`r2Closed`): every pattern's problem mentions no row
  variable.
- **R2Enum** (`r2Enum`): the same with `π` ranging over the finitely
  many patterns `patternOf S`, `S` a sublist of `pairsOf C`
  (`2^|pairsOf C|` of them); every pattern agrees on `pairsOf C` with
  one of them (`patternProblem_congr`, `filter_mem_subsets`).
- **Allocation** (`freshAlloc_fresh`): `FreshFor C (freshAlloc C)` for
  every `C`, so R2 and R2Enum apply to every problem.

Supporting results: `sat_congr` (a problem's truth depends only on the
variables it mentions), `evalF_patternFields` (a pattern's record over
labels without repeats evaluates to its pattern row), `dedup` with
`mem_dedup` and `nodup_dedup` (the written labels without repeats).

Not vacuous: `freshAlloc_fresh` discharges R2's premise for every
problem. Mutant (scratch copy, not kept): with every row variable
sharing one fresh type variable per label (`fresh 0 l` for `fresh r
l`), R2's forward proof fails where it reads each row variable's own
field types: the independence the reduction relies on.

**What represents unnamed labels.** Nothing, at a call site: R1. The
argument holds only because every variable is existential; a rigid
row ranges over labels nobody wrote, so signature checking (C9) needs a
stand-in for "the rest" of each rigid row, and R1 does not transfer.

**Why field types stay independent.** Each row variable gets its own
type variable at each label (`fresh r l`), and each record written in
`C` is a separate expression; nothing relates two of them unless an
equation in `C` does. The mutant above shows the proof depends on it.
Program 11: `q`'s pattern has `a` absent, and `{ ...q, a: 1 }` and `{
...q, a: true }` are two expressions with unrelated `a` fields.

## 11. R3 proposed: deciding closed problems (not implemented)

For the author's review before any implementation.

**Input.** A closed problem: atoms `t = u` and `ff` only (R2′; no
`lacks` or `disjoint`, which mention row variables), over base types,
functions, type variables and records written as fields with no tails.

**Algorithm** (Robinson 1965; in the transformation form of Martelli
and Montanari 1982, published), as a computable Lean definition:

1. If `ff` occurs, answer false.
2. If any record written in the problem repeats a label, answer false:
   its value is undefined, so the atom containing it fails. Otherwise
   every expression in the problem is defined (a lemma to prove), and
   an atom `t = u` holds iff `t` and `u` have equal values.
3. Unify the list of equations, carrying a substitution:
   - `t = t` (syntactically equal): drop.
   - `x = t` or `t = x`, `x` a type variable: if `x` occurs in `t`
     (and `t` is not `x`), answer false (occurs check: ground types are
     finite trees); otherwise substitute `t` for `x` in the remaining
     equations and record the binding.
   - `b = b'` (base types): drop if equal (`DecidableEq B`), else false.
   - `t → u = t' → u'`: replace by `t = t'` and `u = u'`.
   - two records: false unless their label sets are equal (each
     without repeats, by step 2); otherwise one equation per label
     between its two field types, in any order.
   - any other pair of constructors: false.
   - no equations left: true.

**Termination measure** (Martelli and Montanari; Baader and Snyder,
Handbook of Automated Reasoning, §2): lexicographic on (the number of
distinct type variables in the equations, the total size of the
equations, the number of equations of the form `t = x` with `t` not a
variable). Each step lowers it: eliminating a variable removes one from
the equations (the occurs check ensures it does not reappear);
decomposition and dropping keep the variables and lower the size;
orienting `t = x` to `x = t` lowers the third component. Records count
as the sum of their field sizes plus one.

**Correctness statements to prove** (with `f` the computable
definition above):

- **U1, soundness**: if `f C = true` then `C` has a solution. Witness:
  the final substitution, with every unbound type variable given the
  empty record `{}`, which exists for any `B`.
- **U2, completeness**: if `C` has a solution then `f C = true`. Each
  transformation preserves the set of solutions (on the problem's
  variables), and each false answer has no solution (a constructor
  clash, an occurs-check failure on finite trees, unequal label sets,
  a repeated label, or `ff`).
- **U3, termination**: by the measure, as Lean's well-founded
  recursion requires.
- **R3**: `R3Spec f` from U1 and U2.
- **Call sites**: `decideCall C`, which tries `f` on `patternProblem C
  (patternOf S) (freshAlloc C)` for each sublist `S` of `pairsOf C`,
  answers `true` iff `C` has a solution (R2Enum, `freshAlloc_fresh`,
  R2′, R3).

**What this does not give.** `decideCall` decides whether a call has a
solution: it can find a pattern, but choosing one is not solving, since
one pattern does not preserve the call's solutions (§10.3, point 3). A
Solved verdict with a residual (§2.1) needs more: either the
alternatives kept, or a pattern shown forced (C7). Signatures (C9) and
split irrelevance (C8) are untouched. The search tries up to
`2^|pairsOf C|` patterns (a worst-case fact, §4.8's complexity note).

**Lean obstacles expected.** Decidable equality for the mutual type of
expressions (derived or written by hand); substitution inside the
algorithm reusing `substT` with a type-only substitution; the measure's
proof for the record case; and the lemma that every expression of a
closed problem with label-distinct records is defined.

## 12. Third milestone: the closed-problem decider (R3) and call sites

Authorized after the author accepted the reduction milestone. Proved in
Lean (research/composition-proofs/Composition/Unify/; clean build, no
`sorry`; axioms `propext`, `Quot.sound`, `Classical.choice`, the last
from the classical semantics of composition, not from the decider).

**The decider.** `unify` is §11's algorithm as a computable Lean
definition over lists of equations: drop `x = x`; eliminate `x = t` and
`t = x` by `[x ↦ t]` after the occurs check; compare base types
(`DecidableEq B`); decompose functions; decompose records one field at
a time (`removeField`: the left record's first label must occur in the
right record, the field types are equated, and the remaining fields are
compared); anything else is false. `decideClosed` first checks that
every atom is an equation between well-formed sides (no tails, no
repeated label), and `decideCall` tries `decideClosed` on every
enumerated pattern with the explicit fresh allocation.

**Statements proved.**

- U3, termination: `unify` is accepted by Lean's well-founded recursion
  on the measure (distinct type variables, total size), each of its
  eight recursive calls proved to lower it, the record step included
  (`removeField_size`: two fewer units).
- U1, soundness (`unify_sound`): on equations between well-formed
  sides, `unify E = true` gives a solution.
- U2, completeness (`unify_complete`): on such equations, a solution
  gives `unify E = true`.
- R3 (`r3`): `R3Spec decideClosed`, from U1, U2 and two facts about
  closed problems: a well-formed expression is always defined
  (`wf_defined`), and a closed expression that evaluates is well formed
  (`defined_wf`), so a problem failing the check has no solution.
- Call sites (`decideCall_correct`): `decideCall C = true` iff `C` has a
  solution, for every call-site problem, from R2Enum, `freshAlloc_fresh`,
  R2′ and R3.

**The reviewer's two points.**

- Eliminated bindings: elimination is justified through the binding
  equation `x = t` (`eqs_elim`) and the pointwise `subst_sat`, in both
  directions (`elim_sound`, `elim_complete`), not through the remaining
  equations alone. The witness is built as the recursion returns: the
  solution of the substituted rest is extended with `x` set to the value
  of `t` under it, so a chain `x = y, y = Bool` resolves `y` first and
  then `x`; the examples check both a consistent and an inconsistent
  chain.
- The occurs check against the actual model: `G`'s records hold
  arbitrary functions, so ground values are not assumed to be finite
  trees. The immediate-part relation is proved well-founded by `G`'s own
  induction (`acc_part`, through the nested `Option`), so no value is a
  proper part of itself (`not_part_self`, which depends on no axioms);
  a variable inside an expression that is not a variable denotes a
  proper part of its value (`proper_occurs`), so `x = t` then has no
  solution (`occurs_unsat`).

**Executable examples** (`Examples.lean`, `#guard`, checked at build
time by Lean's evaluator; a planted false guard fails the build):
program 4 (true), its negative control (false), program 4 without its
`lacks` (true: satisfiable, two splits); program 5 (true) and both
parts lacking `y` (false); program 11 (true) and its negative control
(false); program 3's overlap (false); Gonzalez's contradictory residual
(false, and true with one use), self-unification (true), and nested
field substitution (false at the wrong type, true at the right one);
the occurs check `x = x → Int` (false); chains (true, false); a record
repeating a label (false). These rest on Lean's compiler and evaluator,
not its kernel; `decideCall_correct` gives them their meaning.

**Mutant.** With a base-type mismatch answering true, `unify_sound` no
longer checks. Mutants that add or remove a recursive call fail first
in the positional termination proofs, a structural failure and weaker
evidence.

**Semantic model.** Unchanged: the same syntax, ground values (rows as
arbitrary maps) and semantics as §10. Added: the computable checks
`wfT`, `noDupB`, and the decider; R3Spec's `DecidableEq B` (§10.3).

**What this does not give.** `decideCall` decides whether a call has a
solution. It does not select a split for compilation, does not justify
a compiler's Solved verdict with a residual (§2.1), and does not touch
signatures (C9) or split irrelevance (C8). It tries up to
`2^|pairsOf C|` patterns, a worst-case fact. The step from Waxwing
source to constraint problems is not formalized; the examples are
written by hand.

The author accepted this milestone (2026-10-20): for every problem in
the formalized call-site language, a terminating, computable function
decides satisfiability, with checked soundness and completeness. Not
established: a complete Waxwing checker. The translation from Waxwing
source is hand-written, and the formal language does not cover every
type construct of the compiler.

## 13. C9, signature checking: statements first

Authorized: the quantified language, a proposed procedure with its
sources and departures, separate claims, examples separating
satisfiability from validity, and an account of unnamed labels in
rigid rows. Not authorized: proofs of the procedure, the procedure's
implementation, C8, extracting a split, residual alternatives, compiler
integration. Lean: research/composition-proofs/Composition/Sig/
(definitions and checked examples only; no procedure).

### 13.1 The quantified language (Lean: `SigProblem`, `Valid`)

A signature problem has rigid type variables and rigid row variables
(the declaration's `∀`, read inside the body), declared clauses `D`,
and body constraints `B`, all in the call-site atoms of §10 (`=`,
`lacks`, `disjoint`, `ff`).

- **Scope** (`Scoped`): `D` mentions rigid variables only. In Waxwing,
  `D` is the `where` clauses (`lacks` with written labels, `disjoint`
  between rigid rows); `B` is everything the body's checking produces,
  including the instantiations of called functions (flexible) and the
  links between parameters, results and their uses.
- **Quantifiers** (`Valid`): for every rigid assignment satisfying `D`
  there is a flexible assignment satisfying `B`, rigid variables taking
  their values from the first and flexible ones from the second
  (`combine`). Every flexible variable may depend on every rigid one; no
  rigid variable depends on a flexible one; there is no further
  alternation. Rigid variables are never bound by solving.
- **Range of rigid rows.** A rigid row ranges over all rows: any labels,
  written or not, at any field types, and possibly empty.
- **Assumption for the completeness claim (S2).** Infinitely many
  labels (Waxwing's labels are identifiers). Base types may be finite.

### 13.2 Examples (Lean, proved: Sig/Validity.lean, Sig/Examples.lean)

| Problem | Satisfiable `D ∧ B` | Valid | Lean |
|---|---|---|---|
| `∀ r.` body needs `r lacks { l }`, no clause | yes | no | `lacks_sat_not_valid` |
| `∀ r s.` body needs `r disjoint s`, no clause, no label written | yes | no; yes over rows restricted to written labels | `unnamed_labels_matter` |
| the same with `where r disjoint s` | yes | yes | `declared_disjoint_valid` |
| `∀ a.` body needs `a = Int` | yes | no | `rigid_type_not_valid` |
| program 6, `forwarded` with `where r disjoint s` | yes | yes | `p6Sig_valid` |
| `∀ r s. r disjoint s ⇒ ∃ u v. { ...u, ...v } = { ...r, ...s }, u lacks admin` | yes | yes, with `u`, `v` chosen by which of `r`, `s` holds `admin` | `depSig_valid` |
| the same, either fixed choice of `u` | | fails for some `r`, `s` | `depSig_needs_dependence` |

The second row is the reason the existential reduction must not be
reused: restricting rigid rows to the written labels (`ValidWithin`)
validates a signature that fails when both rows hold the same unwritten
label. The last two rows show that the flexible solution must be
allowed to depend on the rigid assignment.

### 13.3 Unnamed labels in rigid rows

A rigid row is split into its **written part** (its presence and field
types at the labels written in `D` and `B`) and its **rest** (every
other label). No atom names a label of the rest, so no constraint can
require a particular unwritten label to be present or absent. Three
facts about rests matter, and the procedure keeps each:

1. Rests may be non-empty, at arbitrary field types. Equating `{ ...r }`
   with a closed record therefore fails for some instance.
2. The rests of two rigid rows may overlap, unless `D` declares them
   disjoint (`unnamed_labels_matter`). A composition containing both
   is defined for every instance only under that declaration.
3. Different rigid rows' rests are not equal unless the rows are the
   same variable.

R1 does not transfer: it restricts existential solutions, and a rigid
row is universal. The restriction it licenses for flexible rows is
unaffected.

### 13.4 Proposed procedure P9 (restricted; not implemented)

Input: a scoped signature problem whose `D` consists of `lacks` and
`disjoint` atoms (Waxwing's clauses). Let `L` be the labels written in
`D` and `B`, and `R` the rigid rows.

0. If `D` has no solution (decided by `decideCall`, rigid variables
   read as flexible), the declaration is refused (§2.3).
1. Enumerate the **rigid presence patterns**: for each rigid row and
   each label of `L`, present or absent, consistent with `D` (a `lacks`
   clause forces absence; a `disjoint` clause forbids presence in both).
2. For each pattern, form `B_π`: replace each rigid row `r` by the
   record of its present labels at fresh **rigid type constants**
   `a(r, l)`, with one **rest constant** `ρ̂r` as its tail. Rigid type
   variables become rigid type constants.
3. Decide whether `B_π` has a flexible solution, where a rigid type
   constant equals only itself (or a flexible variable bound to it), a
   rest constant is an opaque part that a flexible row may contain
   wholly or not at all, and a composition containing both `ρ̂r` and `ρ̂s`
   is defined only if `D` declares `r disjoint s` (or `s disjoint r`).
4. Valid iff step 3 succeeds for every pattern. Otherwise the failing
   pattern, its generic instance (S2) and the step-3 refutation form the
   Contradiction evidence C10 asks for.

| Part | Source | Status |
|---|---|---|
| rigid type variables as constants (skolemization) | Odersky and Läufer, POPL 1996; Peyton Jones, Vytiniotis, Weirich and Shields, JFP 2007; standard in GHC, PureScript, Koka | published; cited, not re-read for this section |
| rigid row variables as opaque tails | implemented in PureScript (probe: program 6 compiles) and Koka's effect rows | implemented elsewhere; a formal source to be found |
| entailment of declared `lacks` and `disjoint` | Gaster and Jones 1996 (`lacks` in qualified types); Chlipala, Ur, PLDI 2010 (disjointness from assumptions) | published; cited, not read |
| patterns over rigid rows and written labels | §10's R2 with `∀` in place of `∃` | derived |
| rests as opaque parts with a declared-disjointness side condition | this dossier | derived; the departure needing proof |
| step 3's solver | R3's unifier extended with constants | derived; to be written and proved |

### 13.5 Claims (statements; none proved)

- **S1, soundness**: if P9 answers valid, the signature is valid.
  Argument to formalize: a step-3 solution is generic, so for any rigid
  assignment consistent with a pattern, mapping each `a(r, l)` to its
  value and each `ρ̂r` to `r`'s rest turns it into a solution (a
  homomorphism that commutes with evaluation); compositions containing
  two rests stay defined because their rows are declared disjoint.
  Unresolved.
- **S2, completeness**: if the signature is valid, P9 answers valid.
  Argument to formalize: for each pattern, choose a generic instance
  `θ*`: rigid type constants as pairwise distinct ground values that
  nothing in `B` can denote (records over fresh labels, needing
  infinitely many labels), and rests as fresh labels, with one fresh
  label shared by both rests of every pair not declared disjoint. A
  solution at `θ*` then corresponds to a step-3 solution (fresh values
  behave as constants), and undeclared compositions of two rests fail
  at `θ*` as step 3 says. The genericity lemma ("fresh values behave as
  constants") and the claim that rests may be taken non-empty without
  loss (no atom can require an unwritten label to be absent, except
  through a closed record, which then fails at `θ*` as it must) are the
  main obligations. Unresolved.
- **S3, termination**: finitely many patterns (at most `2^(|R|·|L|)`),
  each decided by a terminating step 3. Unresolved until step 3 exists.
- **S4, dependence**: within one pattern a single generic solution
  serves every instance (part of S1); across patterns the solutions may
  differ, as `depSig_valid` and `depSig_needs_dependence` require.
- **S5, evidence**: a failing pattern's `θ*` is a concrete rigid
  assignment satisfying `D`, and step 3's refutation transfers to it
  (part of S2), so the evidence meets C10 (`c10`, proved).

### 13.6 What remains outside

- Program 8 (local generalization), effect rows, and type constructors
  other than base types, functions and records.
- Selecting a split for compilation, residual alternatives, C8 (still
  waiting under the forced-or-written policy), compiler integration.
- Complexity: exponential in the rigid rows times the written labels,
  then in step 3's own patterns; a worst-case fact, not a reason to
  refuse (§4.8).

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

### 13.1 The quantified language (Lean: `SigProblem`, `ValidAll`)

A signature problem has rigid type variables and rigid row variables
(the declaration's `∀`, read inside the body), declared clauses `D`,
and body constraints `B`, all in the call-site atoms of §10 (`=`,
`lacks`, `disjoint`, `ff`).

- **Scope** (`Scoped`): `D` mentions rigid variables only. In Waxwing,
  `D` is the `where` clauses (`lacks` with written labels, `disjoint`
  between rigid rows); `B` is everything the body's checking produces,
  including the instantiations of called functions (flexible) and the
  links between parameters, results and their uses.
- **Quantifiers** (`ValidAll`, named `Valid` until §14.8): for every
  rigid assignment satisfying `D` there is a flexible assignment
  satisfying `B`, rigid variables taking their values from the first
  and flexible ones from the second (`combine`). Every flexible
  variable may depend on every rigid one; no rigid variable depends on
  a flexible one; there is no further alternation. Rigid variables are
  never bound by solving.
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
3. Different rigid rows' rests may be equal (both empty, for instance)
   and may differ; nothing guarantees either. (The first text said they
   are not equal; corrected after review, §13.7.) Distinct constants in
   a procedure must not stand for "their instances differ".

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
- **S2, completeness** (refuted for P9 as written, §13.7): if the
  signature is valid, P9 answers valid.
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
- **S5, evidence** (construction inadequate, §13.7): a failing pattern's
  `θ*` is a concrete rigid assignment satisfying `D`, and step 3's
  refutation transfers to it (part of S2), so the evidence meets C10
  (`c10`, proved).

### 13.6 What remains outside

- Program 8 (local generalization), effect rows, and type constructors
  other than base types, functions and records.
- Selecting a split for compilation, residual alternatives, C8 (still
  waiting under the forced-or-written policy), compiler integration.
- Complexity: exponential in the rigid rows times the written labels,
  then in step 3's own patterns; a worst-case fact, not a reason to
  refuse (§4.8).

### 13.7 Review: P9's completeness refuted; restrictions and challenges

The author's review (2026-10-20) found two counterexamples. Both are
checked independently in the semantic model
(research/composition-proofs/Composition/Sig/Adversarial.lean):

- **Divided rests** (`splitSig_valid`, `wholeRest_fails`). `∀ r s t. s
  disjoint t ⇒ ∃ u v. r = u ⊎ v ∧ u disjoint s ∧ v disjoint t` is
  valid: `u` takes `r`'s fields at labels `s` lacks, `v` the rest. No
  label is written, and `r = u ⊎ v` confines `u` and `v` to `r`, so
  P9's whole-rest placement allows only `u = r` or `u` empty; each
  fails for some permitted assignment. **S2 is refuted for P9 as
  written.**
- **Fresh records are not opaque** (`recSig_not_valid`,
  `recSig_hard_instance_solvable`). `∀ α. ∃ r. α = { ...r }` is invalid
  (α may be a function type), but at S2's proposed hard instance, α a
  record over a fresh label, the body has a solution: a row variable
  absorbs the record whole. Fresh labels prevent naming fields; they do
  not make a value uninspectable. **S5's hard-instance construction is
  inadequate.**

Following the author's process direction (docs/engineering.md,
"Adversarial review of proposed procedures"), every restriction P9's
representation adds beyond the semantics, and a challenge to each:

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| a rest is placed in a flexible row wholly or not at all | no atom names an unwritten label | `splitSig`: a valid signature divides `r`'s rest by membership in `s` | refuted (completeness) |
| one generic solution per written-label pattern | instances agree on written labels | the same: the solution depends on unwritten labels' membership in other rigid rows | refuted as stated |
| rigid type constants stand for arbitrary types; a fresh record realizes one | fresh labels cannot be named | `recSig`: a row variable absorbs any record; similarly an arrow is matched by `∃ x y. α = x → y` | the proposed construction refuted; whether any uniform hard instance exists is open |
| distinct rest constants | rows are different variables | instances may make rests equal or overlapping; a success relying on distinctness is unsound | soundness obligation (below) |
| a composition holding two rests needs a declared `disjoint` | undeclared rests may overlap | soundness pass: `∀ r s. ∃ u v. u = r ∧ v = s ∧ u disjoint v`, no clause, is invalid; a side condition on compositions alone would accept it, since `u` and `v` hold distinct rests | side condition must cover every requirement that two rests be disjoint: compositions, `disjoint` atoms, and records holding both |

**Revised standing.**

- **P9 becomes a candidate sound, incomplete checker (P9s).** Failure
  to find a whole-rest solution means Unresolved, not Contradiction,
  unless independent counter-instance evidence is found (C10: an
  instance satisfying `D` and a refutation of the body at it). Its
  soundness claim **S1** stands, restated: the disjointness side
  condition covers every requirement that two rests be disjoint.
  Unresolved; it must survive a soundness adversarial pass before any
  proof.
- **S2 refuted for P9; S5's construction inadequate.** The proposed
  single hard-instance construction fails (`recSig`); whether some other
  uniform hard instance exists is not established. Until one is,
  counter-instances are found per failure.
- **For completeness, a finer representation (statement only).**
  Partition the unwritten labels by their membership in the rigid rows
  (the Venn regions of the rigid rows' domains). A declared `r disjoint
  s` empties every region in both; each region is present in each of
  its rows at that row's own field types, so the opaque parts are
  (region, row) pairs. `splitSig`'s `u` is the regions in `r` but not
  `s`, its `v` those in `r` and `s`. Conjecture **CR**: no constraint
  in this language distinguishes two unwritten labels of the same
  region, so region granularity suffices. Unresolved; a lead, not read:
  Kuncak, Nguyen and Rinard, Deciding Boolean Algebra with Presburger
  Arithmetic (JAR 2006), which decides set constraints through Venn
  regions. Before any proof, CR gets its own restrictions table and the
  bounded oracle below.
- **Bounded ∀∃ oracle (proposed, not built).** Enumerate small
  signature problems, evaluate validity over rigid assignments drawn
  from the written labels plus two unwritten ones and a small type
  universe, and compare with P9s's answers (it must never say valid
  when the bounded evaluation says invalid) and with the region
  representation's. The concrete-row oracle of §8 could not expose this
  gap. Bounded evidence still.
- C9's decidability is not refuted; only this procedure's completeness.

### 13.8 Bounded ∀∃ oracle and the BAPA reading

Authorized (2026-10-20): the research oracle, source reading and
adversarial exploration. Not authorized: proofs of CR, adopting P9s,
compiler changes. A good bounded comparison earns another statement
review; it does not establish completeness.

**The oracle** (research/composition-assessment/sig-oracle/, README
there). Bounded semantics: the written labels plus two unwritten ones;
rigid rows over `Int`/`Bool`; type variables over `Int`, `Bool`, `{}`,
`(Int->Int)`; flexible rows over those four; flexible type variables
also over the values the problem's own subexpressions build. "Invalid"
means invalid in the bounded model, a candidate counter-instance only.
P9s runs in its generic model with the widened side condition.

| Run | Problems | P9s valid, bounded invalid | Bounded valid, P9s unresolved |
|---|---|---|---|
| hand challenges (aliases, chains, rest equality, rigid types, nested records, field types, empty regions) | 20 | 0 | 1 (`split`) |
| generated, plain grammar | 3000 | 0 | 0 |
| generated, split-biased grammar | 5000 | 0 | 16, all the `split` shape up to symmetry |

Power checks: P9s without its side condition gives 15 candidate
unsoundnesses in 300 problems, each still invalid with larger bounds;
the plain grammar has little power against completeness (it never
produced `split`), so the biased mode was added. Two of my challenge
predictions were wrong and are recorded in the README (a trivially
valid challenge, and a bounded-domain artifact that was then fixed).

Reading of the evidence: no case was found where P9s accepts an invalid
problem, within these bounds and shapes. That is bounded evidence for
S1, not a proof; S1 stays unresolved.

**The BAPA reading** (research/composition-assessment/bapa/README.md;
Kuncak, Nguyen and Rinard, JAR 2006, read in full from the author
preprint; FroCoS 2009 and VMCAI 2010 skimmed).

- What transfers. The **presence part** of a signature problem, with
  labels as elements and row domains as sets, is expressible in BAPA
  (the reader's encoding, not the paper's): `disjoint` as an empty
  intersection, `lacks l` as non-membership of a singleton, the
  definedness of a composition as an emptiness atom, record equations'
  presence half as set equality. BAPA allows ∀∃ over sets and is
  decidable (Theorem 3, p.15). So the label-membership half of C9 has a
  published decision procedure; it is not CR.
- What it says against CR as stated. In BAPA an existential set may take
  part of a region (Lemma 1, p.13), and under quantifier alternation
  region cardinalities matter beyond emptiness (Lemma 10, p.20). The
  paper proves the region reduction for a language with no symbols for
  individual elements and states no indistinguishability lemma.
- What it leaves open: per-label field types (one label at different
  types in two rows), rigid field types quantified per label, field-type
  equations across rows, nested records and type variables that may be
  records (`recSig`). Nothing read covers a quantified logic of sets
  with per-element attributes; VMCAI 2010 shows quantified BAPA with
  one unary function is undecidable, by a cardinality argument that
  Waxwing's language lacks, so it does not settle Waxwing's case.

**Revised standing of CR.** CR as stated (whole regions suffice, by
indistinguishability) has no support in the reading and is not to be
pursued as stated. The reading's open obligations for a typed version,
in its list: whether Waxwing's positive atoms (no negation, no
cardinality) need only emptiness per region; whether flexible rows ever
need part of a region (in `split` whole regions suffice); how
per-label field types are quantified and equated; nested records and
record-valued type variables; finite rows over infinitely many labels
(§8.1 of the paper states the lemma without the algorithm). These are
questions for the next statement review, not claims.

### 13.9 The author's review of §13.8; two tracks

The author's review (2026-10-20) separates two tracks:

- **P9s soundness**, a bounded proof target: formalize the exact
  procedure the oracle runs and prove that every acceptance establishes
  validity, keeping its incompleteness explicit. Statements in §14.
- **Complete typed signature checking**, still research. BAPA supplies
  set machinery for presence, not field types, nested types or their
  interaction with quantification.

A proved P9s could certify the signatures it handles and answer
Unresolved elsewhere. **That would not approve its limitations as
Waxwing's final behaviour**: completeness research and the
acceptance-program criteria stay open.

**Region questions, kept as questions.** Each needs its own argument;
`split` establishes none of them (in `split` whole regions happen to
suffice, which is one example, not a lemma).

- Q1. Does Waxwing's restricted atom language (positive atoms, no
  cardinality) remove the need to track region sizes?
- Q2. Can existential rows always take whole regions?
- Q3. If Q1 or Q2 holds for presence alone, does it survive independent
  per-label field types and nested records?

**The presence-to-BAPA correspondence, stated.** §13.8's "presence fits
BAPA" named similar operators; the review asks for the translation.
Four semantics are in play and differ:

| Semantics | Labels | Rows | Where |
|---|---|---|---|
| Waxwing | infinitely many (identifiers) | finite | the language |
| the dossier's `Valid` (now `ValidAll`) | any type `Label` | any partial map, infinite ones included | Rows.lean, a definitional choice "for review" |
| JAR BAPA (main text) | a finite universe `U`, `MAXC = \|U\|` | every set is finite | syntax Fig. 3, p.5; `MAXC` p.6 |
| JAR BAPA §8.1 | a countable universe | finite or infinite, `inf(b)` flags | pp.25-26, a sketch |

Finding: the dossier's Lean `Valid` quantifies over arbitrary partial
maps. Rows.lean's note that its theorems hold "for all partial maps,
finite ones included" is true of universally quantified statements; it
does not carry a ∀∃ statement to finite rows: restricting the rigid
side alone only removes cases, but finite semantics restricts the
flexible witnesses too, and a witness over partial maps may be
infinite. Which
of §13's Lean examples hold over finite rows is not checked. S1 below is
stated for both semantics.

The proposed translation (statement; no claim it is correct):

- Fragment. Problems whose equations relate two record expressions;
  field types ignored. The **presence abstraction** of a problem
  replaces each row by its domain and each record expression
  `{ l1: _, ..., ...r1, ..., ...rk }` by `{l1} ∪ ... ∪ dom r1 ∪ ...`,
  defined iff the parts are pairwise disjoint.
- Atoms. `lacks r l` as `e_l ∩ x_r = 0`; `disjoint r s` as
  `x_r ∩ x_s = 0`; an equation as set equality of both sides plus one
  emptiness atom per pair of parts on each side; `ff` as false.
- Constants. Each written label `l` is a set variable `e_l` with
  `|e_l| = 1`, pairwise disjoint, quantified outermost.
- Quantifiers. `∀` over rigid sets, `∃` over flexible ones.
- Universe. Formulation F1: the main text's finite universes. Candidate
  statement: Waxwing presence validity holds iff the sentence is true in
  every finite universe with at least `|L|` elements. Formulation F2:
  §8.1's countable universe with `inf(x) = 0` on every quantified set,
  closer to Waxwing literally but resting on a sketch.

Obligations of F1, none discharged: (a) a flexible row never needs a
label outside the written labels and the rigid rows' domains (a
candidate argument: removing such a label from every flexible row
preserves each presence atom, since no rigid row or written field holds
it); (b) with (a), rigid assignments over a finite universe embed into
Waxwing's labels and back; (c) the written-label singletons' place in
the prefix (∃ or ∀ outermost should agree, by symmetry of a language
with no element symbols; unproved); (d) "every finite universe" as one
PA sentence by quantifying `MAXC` after the algorithm α, a step of this
reader's, not checked against the paper. Separately, unproved: typed
validity implies presence validity (a typed solution gives a presence
solution, and every presence assignment extends to a typed one), so
the translation could refute but not confirm a typed signature.

## 14. P9s soundness: statements first

Authorized (the author's review of §13.8, 2026-10-20): P9s's soundness
dossier, with the exact symbolic assignments, disjointness obligations,
acceptance rule and the interpretation into arbitrary ground rigid
assignments. Not authorized: proofs (they follow approval of these
statements), adopting P9s, compiler changes. Status labels as at the
head of this dossier; nothing here is proved.

The statements describe what the oracle runs
(sig-oracle/p9s.mjs), without its bounds on the flexible search. The
bounds only remove candidate solutions, so every acceptance the oracle
reports is an acceptance in the sense below.

### 14.1 Input and patterns

- **Input.** A scoped signature problem `P` (§13.1): rigid type
  variables `Tr`, rigid rows `R`, clauses `D`, body `B`. `L` is the set
  of labels written in `D` and `B`. `Δ` is the set of ordered pairs
  `(r, s)` and `(s, r)` for each `disjoint r s` in `D`. P9s reads only
  `D`'s `lacks` and `disjoint` atoms, and S1 below is stated for any
  scoped `D`.
- **Patterns.** A pattern is `π : R × L → Bool`. It is *consistent*
  with `D` if `lacks r l ∈ D` gives `¬π(r, l)` and `disjoint r s ∈ D`
  gives `¬(π(r, l) ∧ π(s, l))` for every `l ∈ L`. The pattern of a
  rigid assignment `θ` is `π_θ(r, l) = (θ.row r l ≠ none)`.

### 14.2 The generic model of a pattern

- **Generic labels and base types.** Labels `Label ⊕ R`; `ρ_r` is
  `inr r`, the **rest label** of `r`. Base types `B ⊕ K`, with
  constants `A(r, l)` for each `r ∈ R`, `l ∈ L` (as p9s.mjs builds
  them; those with `¬π(r, l)` occur in no rigid row but `σ` may use
  them), `R(r)` for each `r ∈ R`, and `T(n)` for each `n ∈ Tr`.
  `P`'s syntax is carried over by `inl` on labels and base types.
- **The generic rigid assignment** `γ_π`: row `r` is
  `{ l: A(r, l) | π(r, l) } ∪ { ρ_r: R(r) }`; type variable `n` is
  `T(n)`.
- **Well-formed generic values** `W_π` (the symbolic assignments). A
  generic row is well-formed if its field types are well-formed and:
  (W1) its labels lie in `inl L ∪ inr R`;
  (W2) it holds `ρ_r` only at `R(r)`;
  (W3) for distinct `r`, `s` whose rest labels it holds, `(r, s) ∈ Δ`.
  A generic type is well-formed if every row occurring in it, at any
  depth, is.
- **Disjointness obligations** (generic satisfaction `⊨Δ`, otherwise
  §10's `Holds`):
  (D1) a record expression's value is undefined unless the row it
  composes is well-formed (checked at every record expression, at any
  depth);
  (D2) `disjoint x y` holds iff the rows share no label and every pair
  of distinct rests `ρ_r` in `x`, `ρ_s` in `y` has `(r, s) ∈ Δ`.
- **Acceptance rule.** P9s accepts `P` iff for every pattern `π`
  consistent with `D` there is a flexible assignment `σ_π` with values
  in `W_π` such that `combine(γ_π, σ_π) ⊨Δ B`. Otherwise it answers
  Unresolved, never Contradiction (§13.7).

The family `(σ_π)` is a **certificate**. As defined here it is
semantic: `σ_π`'s rows are functions, so W1 and equality of values are
not decidable on it (the author's review, §14.8). Checking certificates
mechanically needs a finite syntactic representation of generic values;
that is deferred. Finding one is a separate question again (S3, the
step-3 solver). Neither is needed for soundness.

### 14.3 The interpretation

Given `θ` with `θ ⊨ D` and `π_θ = π`, and any ground type `c`, define
`h = h_{θ,c}` on generic values:

- `h(inl b) = b`; `h(A(r, l)) = θ.row r l` if `π(r, l)` (present,
  since `π_θ = π`), and `c` otherwise; `h(T(n)) = θ.ty n`;
  `h(R(r)) = c`; arrows homomorphically.
- On a well-formed row `ρ`: written labels map field by field,
  `hRow ρ (l) = h(ρ(inl l))` for `l ∈ L`; each rest label `ρ_r` in `ρ`
  is replaced by `rest_θ(r)`, `θ.row r` restricted to labels outside
  `L`. A record maps to the record of `hRow` of its row.
- On a flexible assignment, `hσ = (h ∘ σ.ty, hRow ∘ σ.row)`.

`c` is arbitrary: `R(r)` used as a type on its own (not as a rest's
field type), and `A(r, l)` with `¬π(r, l)`, carry no information about
`θ`, and S1 holds for every choice (S1-fin for every finite `c`).

### 14.4 Statements

- **L1, coverage.** `θ ⊨ D` implies `π_θ` is consistent with `D`.
- **L2, definedness.** For every well-formed `ρ`, `hRow ρ` is defined
  (no label occurs twice), and for well-formed `ρ`, `ρ'` whose
  composition is defined and well-formed,
  `hRow(ρ ⊎ ρ') = hRow ρ ⊎ hRow ρ'`, defined. Argument to formalize:
  written labels stay written; rests lie outside `L`; two rests in one
  well-formed row are declared disjoint (W3) and `θ ⊨ D` makes them
  disjoint; one rest twice is excluded by the generic composition.
- **L3, commutation.** For every expression `t` and `σ` with values in
  `W_π`: if `t` evaluates to `g` under `combine(γ_π, σ)` with (D1),
  then `t` evaluates to `h(g)` under `combine(θ, hσ)`. Key cases: a
  rigid tail, `hRow(γ_π.row r) = θ.row r` (uses `π_θ = π`); a rigid
  type variable, `h(T(n)) = θ.ty n`; a composition, L2; nested records
  and arrows, induction.
- **L4, atoms.** For each atom `a` of `B`,
  `combine(γ_π, σ) ⊨Δ a` implies `combine(θ, hσ) ⊨ a`: an equation by
  L3 (h is a function); `lacks r l` (every `lacks` label is in `L`):
  for a flexible `r` because `hRow` preserves presence and absence at
  written labels, for a rigid `r` because `π_θ = π` (the rigid side of
  `combine(θ, hσ)` is `θ`, not an image under `h`); `disjoint` by (D2),
  W3 and `θ ⊨ D`, rests lying outside `L`; `ff` never holds.
- **S1, soundness.** If P9s accepts `P`, then `ValidAll P`. Shape: given
  `θ ⊨ D`, L1 gives a consistent pattern, the certificate gives
  `σ_{π_θ}`, and `hσ` satisfies `B` at `θ` by L4.
- **S1-fin, soundness for Waxwing's finite semantics.** The same for
  `ValidFin` (to be defined: rigid and flexible rows finite at every
  depth), for any finite `c`. By W1 generic rows are finite, and
  `hRow` adds only `θ`'s finite rests, so `hσ` is finite when `θ` and
  `c` are.

What S1 does not claim: completeness (`split` is valid and
Unresolved), any Contradiction verdict, termination of a search for
certificates, or anything about Q1-Q3.

### 14.5 Restrictions table, soundness pass

Restrictions the generic model adds beyond the semantics, each with the
challenge built for it. This pass looks only for acceptances that do
not transfer; completeness was §13.7's pass.

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| a rest is one label at one constant | `h` expands it wholly into `θ`'s rest, the same rest wherever it occurs | `equal-rests`, `alias`, `alias-chain`, `nested-alias` | checked (bounded) |
| `R(r)`, and `A(r, l)` with `¬π(r, l)`, usable as types on their own | neither occurs in `γ_π` as a type on its own, so nothing ties it to `θ`; `h` sends both to `c` | S1 for every `c`; the oracle runs two | argument only: no solution found in 1,678 solved patterns uses either (the search tries ground values first), so the two `c` were never exercised (found by the adversarial reviewer) |
| generic rows hold only written labels and rests (W1) | needed by `h`: a generic label `k ∉ L` would clash with a rest holding `k` | soundness requires it of `h`; whether a looser model still gives sound verdicts is not claimed | restriction kept |
| (D1) at every record expression, at any depth | compositions inside fields expand too | `nested-alias` (declared, accepted), `nested-alias-undeclared` (not accepted) | checked (bounded) |
| (D2) on `disjoint` atoms | two rests may overlap unless declared | `alias` (undeclared): the mutant without the side condition accepts, and the check finds the failure | checked; mutant fails |
| W3 on rows not composed anywhere | `hRow` must be defined on every value of `σ`, used or not | a row holding two undeclared rests, used only by `lacks`: verdicts unaffected (`{}` also works), `h` undefined | needed by `h`; not exercised: no such challenge exists, and the mutant's L2 failures all come from composed rows (`compose-undeclared`, `nested-alias-undeclared`) |
| patterns fix only written labels | `θ`'s other labels are its rests, outside `L` | L1; `lacks-declared`, `tyvar-field` | checked (bounded) |
| distinct constants `A(r, l)` | atoms are positive: identifying constants under `h` cannot falsify an equation that holds | `types-differ` (generic rejects; incompleteness only) | argument in L4 |

### 14.6 Claim-level check of the interpretation

sig-oracle/check-interpretation.mjs checks L2, L3 and L4 directly. For
every pattern P9s solves (also in problems another pattern leaves
Unresolved), it takes the generic solution found, maps it by `h`
(sig-oracle/interpret.mjs) into every bounded rigid assignment of that
pattern satisfying `D`, for two choices of `c`, and checks that `h` is
defined, that every subexpression of `B` the generic model defines
evaluates to the image of its generic value, and that `B` holds.

| Run | Problems | Patterns solved | Instances | L2, L3, L4 failures |
|---|---|---|---|---|
| challenges (23, three added for aliases and nesting) | 23 | 20 | 1,898 | 0 |
| `1000 5` (plain and split grammars, with the challenges) | 2,023 | 1,307 | 261,950 | 0 |
| `300 9 larger` (three unwritten labels, `{}` as a rigid field type) | 623 | 391 | 6,255,998 | 0 |
| mutant: no side condition, challenges only | 23 | 28 | 3,806 | L2 672, L4 656 |
| mutant, `300 5` | 623 | 576 | 183,204 | L2 25,712, L4 55,888 |

Bounded evidence for L2-L4 at these sizes; no proof. L3 never fails
alone in the mutant (a clash stops `h` first), so its separate power is
untested. The rigid side sampled is small: rigid type variables over
`Int`, `Bool`, `{}`, `(Int->Int)`, rigid fields `Int` and `Bool` (and
`{}` with `larger`). Rigid type variables that are records with labels,
nested rigid fields and infinite rows have no check behind them; for
those the hand arguments of L2-L4 are all there is.

**Adversarial review** (an independent reviewer, tasked with finding a
false statement or missing case; 2026-10-20). No counterexample to S1
or L1-L4. Corrections taken: constants `A(r, l)` with `¬π(r, l)`, which
the code builds and `h` left undefined (now sent to `c`, in the
statement and in interpret.mjs); L4's reason for `lacks` on a rigid
row; S1-fin needs a finite `c`; two table rows above claimed checks
that never ran; three slips in §13.9 (count of semantics, page of
Fig. 3, the finite-rows sentence).

### 14.7 For the author

1. Approve or amend the statements 14.1-14.4 (W1-W3, D1-D2, the
   acceptance rule, `h`, L1-L4, S1, S1-fin).
2. The encoding of a rest as one label `ρ_r` at a constant `R(r)`, and
   its expansion by `h`, are this dossier's (derived, not from a source;
   skolemization itself is published, §13.4). Flagged under ADR 014 as
   novel machinery.
3. Whether S1-fin, rather than S1 over partial maps, is the target, and
   whether `Valid` itself should move to finite rows (§13.9's finding).
4. Proposed Lean files after approval: Sig/Generic.lean (generic model,
   `W_π`, `⊨Δ`), Sig/Interp.lean (`h`, L2, L3), Sig/Soundness.lean (L1,
   L4, S1, S1-fin).

### 14.8 Approval, amendments, and the proofs (Lean)

The author's review (2026-10-20) approved proof work on L1-L4, S1 and
S1-fin, with two clarifications, and decided the four points of §14.7:

- **Certificates.** Semantic certificates and executable ones are
  separate. §14.2 now says so; this milestone proves the semantic S1.
- **L3's scope.** L3 covers expressions whose labels are written labels
  of the problem; expressions of `B` meet it. Rigid variables need no
  separate premise (the generic assignment gives each its constant).
- **Machinery.** The rest-label encoding and its expansion by `h` are
  authorized for investigation and proof under ADR 014. This does not
  authorize adopting P9s in the compiler.
- **Finite semantics.** S1-fin is the primary Waxwing result. `Valid`
  is renamed `ValidAll` (all partial maps, infinite rows included), and
  `ValidFin` is added beside it: rigid values and flexible witnesses
  are finite at every depth. No earlier statement changed meaning.
- **Files.** Generic model, interpretation and soundness separate;
  finite values in their own modules.
- **D's satisfiability** stays separate: when `D` is impossible,
  `ValidAll` and `ValidFin` hold vacuously, but `Accepts` (and
  `checkAll`, §15) need not accept, since pattern consistency ignores
  equations and `ff` (wording corrected in the author's review of §15).
  Waxwing refuses such a declaration separately (§2.3).

**A change found during formalization, for review.** The proofs need
less than §14.2 states, and they assume only what they need:

| §14.2 | In the proof | Why |
|---|---|---|
| W1 (rows hold only written labels and rests) | dropped | `h` reads a row only at written labels and at rests of rigid rows; an unwritten `inl` label is ignored |
| W2 (a rest only at `R(r)`) | dropped | `h` ignores the field at a rest label |
| W3 on every row of `σ` | only on values the body's equations build (D1) | `h` needs a unique source for an unwritten label only inside a composition; D2 covers `disjoint` atoms |
| `h(A(r, l))`, `h(T(n))` | `c` also when `r` or `n` is not rigid | keeps `h` finite (S1-fin) without assuming anything of `θ`'s non-rigid values |
| certificates | finite at every depth (`FinAssign`), used only for S1-fin | |

The acceptance rule is therefore weaker, and S1 stronger, than
approved. W1-W3 remain what P9s's search produces (the oracle's
certificates satisfy them); they are no longer premises of the theorem.

**Proved** (research/composition-proofs/Composition/Sig/; Lean 4.35,
`lake build` clean, no `sorry`, standard axioms only):

| Statement | Lean | File |
|---|---|---|
| generic model, D1, D2, `Accepts` | `Const`, `liftT`, `WFG`, `genAssign`, `HoldsG`, `Certifies`, `Accepts` | Generic.lean |
| finite semantics | `FinG`, `FinAssign`, `ValidFin` | Finite.lean |
| `h` | `interp`, `hRow`, `hAssign` | Interp.lean |
| L2 | `restWit_unique`, `hRow_disjoint`, `hRow_union`, `composeAll_hRow` | Interp.lean |
| rigid rows map to `θ` | `hRow_genRow`, `combine_hAssign` | Commute.lean |
| L3 | `interp_evalT`, `interp_fieldRows` | Commute.lean |
| finiteness preserved | `interp_fin` | FinitePres.lean |
| L1 | `consistent_presenceOf` | Soundness.lean |
| L4 | `holds_interp` | Soundness.lean |
| S1 | `s1 : Accepts P → ValidAll P` | Soundness.lean |
| S1-fin | `s1_fin : Accepts P → ValidFin P` (with `c` the empty record) | Soundness.lean |

Mutants (isolated copies, deleted): replacing D1's well-formedness with
`True` breaks L4's equation case, and replacing D2's declared pair with
`True` breaks its `disjoint` case. This shows the proof uses both
obligations. The oracle's mutant (§14.6) shows that without them
acceptance would be unsound.

**The disclosed gaps, exercised deliberately**
(sig-oracle/deliberate.mjs). Five hand-built certificates, each first
checked in the generic model: `R(r)` as a type on its own, alongside
the rest it names; `A(r, l)` for a label the pattern marks absent, in a
flexible row and a type variable; a rigid type variable inside a record
with a rest; a rigid row holding a written label, nested in a field; and
the same with the label absent. The `rich` rigid domain adds rigid
fields `{z1:Int}` and `{a:Bool}`, and rigid type variables `{a:Int}`,
`{z1:Bool}`, `{a:{z1:Int}}`, `({z1:Int}->Int)`.

| Run | Instances | L2, L3, L4 failures |
|---|---|---|
| deliberate, default domain | 162 | 0 |
| deliberate, `rich` | 352 | 0 |
| challenges, `rich` | 6,864 | 0 |
| generated `300 5 rich` (both grammars, with the above) | 242,354 | 0 |
| power: `h` corrupted on present constants, `rich` | 352 deliberate, 6,864 challenges | L3 96 and 5,376 |

Infinite rows still have no executable check; S1 covers them by proof.

**Still open, as separate decisions:** completeness (Q1-Q3, `split`),
the search for certificates and an executable certificate format, the
final acceptance policy for signatures P9s leaves Unresolved, and
compiler integration.

**Accepted** (the author's review, 2026-10-20), including the weakened
premises, with one precision kept: `Accepts` still requires finite
certificate assignments; the milestone removes W1-W3 as blanket
restrictions, not every premise. What is proved: the formal semantic
acceptance rule guarantees signature validity, with finite flexible
witnesses for finite rigid inputs. What is not: the executable oracle's
acceptances are not certified (§15). This accepts the soundness result;
it does not adopt P9s as Waxwing's checker.

## 15. A verified certificate checker: statements first

Proposed by the author (2026-10-20) as the next bounded milestone: a
checked connection from an executable certificate format to `Accepts`.
Search stays untrusted; whatever it produces must pass a checker proved
to imply `Accepts`. Under the proof-dossier policy these are statements
for approval; nothing here is written in Lean yet, and nothing is
proved.

### 15.1 Source

| Part | Source | Status |
|---|---|---|
| untrusted search, certificate, verified checker | certifying algorithms: McConnell, Mehlhorn, Näher and Schweitzer, *Certifying algorithms*, Computer Science Review 5(2), 2011; translation validation, Pnueli, Siegel and Singerman, TACAS 1998, and Necula, PLDI 2000 | published; cited, not re-read for this section |
| finite association lists for records, order-insensitive equality | standard representation of finite maps | standard; no single source |
| the checker's evaluator, the pattern enumeration | this dossier, over §14's definitions | derived |

No new semantic machinery: the checker soundly checks `Certifies` for
finitely represented values (K4, one direction; the converse is not
claimed), and §14's theorems do the rest.

### 15.2 Definitions (proposed)

Assumptions: `DecidableEq Label` and `DecidableEq B` (base types must be
compared; R3 makes the same assumption, Reduction.lean), and an instance
`DecidableEq (Const Label)`, to be written in the new file (Generic.lean
derives none). `SG` is a nested inductive, and Lean 4.35 cannot derive
`DecidableEq` for it; `eqS` and the recursions of K2 and K3 are written
by hand.

- **Syntactic generic values** `SG`: `base (b : GB)`, `arrow SG SG`,
  `record (List (GL × SG))`. A record's list may be in any order; its
  denotation looks a label up by its first occurrence, so every list
  denotes a finite row.
- **Denotation** `⟦·⟧ : SG → GG`, and for rows `⟦fs⟧ : Row GL GG`.
- **Syntactic certificate** `Ĉ` for a pattern: finite lists of type
  variable and row variable bindings; an unbound variable denotes the
  empty record. `⟦Ĉ⟧ : Assign GL GB`.
- **Finite patterns.** A finite pattern is a list of pairs `(r, l)`
  with `r ∈ P.rigidRow` and `l ∈ written P`; it denotes
  `π_p r l = ((r, l) ∈ p)`. `patterns P` enumerates every sublist of
  `P.rigidRow × written P` (deduplicated), one per subset.
- **Executable evaluator** `evalS P p Ĉ : TExpr GL GB → Option SG`.
  Its rigid part is `genRow` in list form for `π_p` and mirrors its
  checks: `inl l` only if `l ∈ written P` and `(r, l) ∈ p`, rigid rows
  only for `r ∈ P.rigidRow`, constants `T(n)` only for
  `n ∈ P.rigidTy`. Compositions are defined iff the parts' denoted label
  sets are disjoint (decided on the lists).
- **Decidable checks**, each on denotations, never on raw lists: a
  record is read at the first occurrence of each label, so `wfS`
  recurses only into first-occurrence entries, and `eqS` compares the
  two lookups over the union of both lists' labels. `wfS` decides `WFG`
  (W3 at every depth); `eqS` decides equality of denotations;
  `checkAtom` decides `HoldsG` for one lifted atom, with D1 and D2 (D2
  ranges over the finite `P.rigidRow`; `ff` gives false);
  `consistentS` decides `Consistent` for `π_p` over `D`'s atoms.
- **The checker.** `checkCert P p Ĉ := ∀ a ∈ P.B, checkAtom` and
  `checkAll P certs := ∀ p ∈ patterns P, consistentS P p →
  checkCert P p (certs p)`, both `Bool`, both computable (no
  `noncomputable`, no classical choice), so `#eval` and `#guard` run
  them.

### 15.3 Statements (proposed; none proved)

- **K1, denotation is finite.** `FinAssign ⟦Ĉ⟧` for every `Ĉ`.
- **K2, decisions are correct.** `eqS s t = true ↔ ⟦s⟧ = ⟦t⟧`;
  `wfS s = true ↔ WFG P ⟦s⟧`; `consistentS P p = true ↔
  Consistent P π_p`.
- **K3, evaluation agrees**, for every list `p` (not only those in
  `patterns P`, since `evalS` makes `genRow`'s checks). `evalS P p Ĉ t =
  some s →
  evalT (genAssign P π_p ⟦Ĉ⟧) t = some ⟦s⟧`, and `evalS P p Ĉ t = none →
  evalT (genAssign P π_p ⟦Ĉ⟧) t = none`. (Only the first is needed for
  soundness; the second makes a rejection mean the certificate fails,
  not that the evaluator gave up.)
- **K4, one pattern.** `checkCert P p Ĉ = true →
  Certifies P π_p ⟦Ĉ⟧`.
- **K5, pattern coverage.** For every `π` with `Consistent P π` there
  is `p ∈ patterns P` with `Consistent P π_p` and `genAssign P π σ =
  genAssign P π_p σ` for every `σ`. (Argument to formalize: `genAssign`
  reads `π` only at rigid rows and written labels; restricting `π`
  there keeps consistency, since restriction only turns presences
  off.)
- **K6, the checker implies acceptance.** `checkAll P certs = true →
  Accepts P`, hence (with §14.8) `ValidAll P` and `ValidFin P`.

Not stated for this milestone, so that the gap is explicit:

- **K7, no loss against `Accepts`** (unresolved, not proposed): every
  semantic certificate can be replaced by the denotation of a syntactic
  one. Without it a signature could be accepted semantically and still
  have no certificate the checker can see. Not a representation fact
  alone: `FinAssign σ` bounds each value but not how many variables
  `σ` binds, so K7 needs a congruence lemma for `HoldsG` (it depends
  only on the variables an atom mentions, including the rows D2 reads;
  `sat_congr` covers `Holds` only). Left out to keep the milestone
  bounded.
- Anything about search: when the oracle fails to find a certificate,
  the answer stays Unresolved.

### 15.4 Restrictions table, soundness pass

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| records as lists, first occurrence wins | the denotation is fixed by the lookup; duplicates never change what K4 claims about `⟦Ĉ⟧` | `record [(inl a, {}), (inl a, record [(inr 0, _), (inr 1, _)])]`, rows 0 and 1 undeclared: the denotation is well-formed, so a `wfS` walking every entry would make K2's ← false (found by the adversarial reviewer); `wfS` and `eqS` read first occurrences only | K2, with §15.2 as amended |
| order-insensitive equality | two lists in different orders denote one row | `{a, b}` against `{b, a}`; nested records in different orders | K2 |
| unbound variables denote the empty record | for soundness nothing is needed: K4 is a claim about `⟦Ĉ⟧`, which binds them to `{}` (whether this loses certificates is K7's congruence question) | a certificate omitting a variable `B` uses: `checkAtom` must evaluate it as `{}`, not fail open | K3 |
| patterns only over `rigidRow × written P` | `genAssign` reads nothing else | an unscoped `D` naming a non-rigid row in `lacks`: `π_p` is false there, which consistency allows | K5 |
| `D`'s satisfiability not checked | when `D` is impossible, `ValidAll` and `ValidFin` hold vacuously, while `Accepts` and `checkAll` need not accept; Waxwing refuses such declarations separately (§2.3) | with only `lacks` and `disjoint`, `D` is always satisfiable (all rigid rows empty); an impossible `D` needs `ff` or an equation | outside the checker, as approved |
| decidable base types | equality of `B` is compared | none in the semantics; a cost on the type `B` | assumption |

### 15.5 Proposed evidence besides the proofs

- `#guard checkAll` on the accepted challenges (`alias-declared`,
  `nested-alias`, `tyvar-nested-rest`, `nested-same`, `lacks-declared`,
  `tyvar-field`, `rigid-type-free`, `empty-split`), with certificates
  exported from the untrusted oracle: the oracle finds, Lean checks.
- `#guard` that `checkAll` rejects deliberately broken certificates (a
  rest composed with an undeclared rest; a flexible row missing a
  required label), so the checker is not vacuous.

Files (proposed): Sig/Syntactic.lean (`SG`, denotation, K1),
Sig/Check.lean (`evalS`, `eqS`, `wfS`, `checkAtom`, K2-K4),
Sig/Patterns.lean (`patterns`, K5, K6), Sig/CheckExamples.lean
(§15.5).

### 15.6 For the author

1. Approve or amend K1-K6 and the definitions in §15.2.
2. Whether K7 (no loss against `Accepts`) belongs in this milestone.
3. The assumptions `DecidableEq B` and the new `DecidableEq (Const
   Label)` instance.

**Adversarial review** (independent reviewer, 2026-10-20): no false
statement among K1-K6. Corrections taken: `wfS` and `eqS` defined on
denotations (a naive walk makes K2 false); the missing `DecidableEq
(Const Label)`; `SG`'s equality written by hand; `evalS` takes `P`
and `p` and mirrors `genRow`'s checks, so K3 holds for every `p`;
"decides" weakened to "soundly checks"; K7's gap is congruence, not
representation. Confirmed: K1, K5 (restriction only turns presences
off, and both clauses of `Consistent` are antitone), K6 from `s1` and
`s1_fin` (neither needs `Scoped`), and the satisfiability row. Also
noted: `Consistent` ignores `eq` and `ff` atoms in `D`, so even
`D = [ff]` demands a certificate per pattern; `Accepts` is never
vacuously true.

### 15.7 Approval and the three details

The author's review (2026-10-20) approved K1-K6 and the file plan, kept
K7 out (its absence limits representation completeness, not the
guarantee for certificates that pass, and K7 would not make P9s
complete), and accepted `DecidableEq B` and an instance for `Const`
derived from its constructors (no axiom). Three details made explicit:

- **Duplicate variable bindings**: read at the first occurrence
  (`List.lookup`), in the denotation (`denCert`) and in the evaluator
  (`tyS`, `rowS`) alike; K3 proves the two agree.
- **Certificate tables**: a list of pattern and certificate entries
  (`CertTable`). `lookupCert` finds the first entry holding the same
  set of pairs (`samePattern`, so order and repetition in a pattern do
  not matter); a missing pattern gets the empty certificate.
- **Duplicates belong only to the representation.** A list may repeat a
  label; it denotes its first occurrence. A composition whose parts
  share a label is still undefined (`composeS`), so Waxwing's rule that
  overlapping spreads are rejected is unchanged. Tested both ways
  (`dupList`, `overlap`).

### 15.8 The proofs (Lean) and the evidence

Proved (research/composition-proofs/Composition/Sig/; clean build, no
warnings, no `sorry`):

| Statement | Lean | File |
|---|---|---|
| `SG`, `den`, `Cert`, `denCert` | definitions | Syntactic.lean |
| K1 | `fin_denCert` | Syntactic.lean |
| evaluator, K3 | `evalS`, `evalT_den` (`evalT` is `evalS` mapped by `den`, defined or not) | Check.lean |
| K2, equality | `eqS_iff` | Decide.lean |
| K2, well-formedness | `wfS_iff`, `declaredS_iff`, `restsOkS_iff` | WellFormed.lean |
| K4 | `checkAtom_sound`, `checkCert_sound` | Decide.lean |
| K2, consistency | `consistentS_iff` | Patterns.lean |
| K5 | `pattern_cover` | Patterns.lean |
| K6 | `checkAll_accepts`, `checkAll_validAll`, `checkAll_validFin` | Patterns.lean |

`Check.lean` of the approved plan is split in three (Check, WellFormed,
Decide) to keep files under the 250-line limit. `checkAll` itself
depends on `propext` and `Quot.sound` only: it is computable, and
`#guard` runs it. The theorems about it use `Classical.choice` through
§14's classical semantics.

**Evidence** (Sig/CheckExamples.lean, `#guard`, evaluated, not
kernel-checked):

- **Oracle certificates.** sig-oracle/export-lean.mjs writes
  Sig/CheckData.lean (generated): the 49 problems P9s's untrusted search
  accepts among the challenges, the five deliberate certificates and
  100 generated problems, with one certificate per consistent pattern.
  All 49 pass `checkAll`, so by `checkAll_validFin` each signature is
  valid in Waxwing's finite semantics.
- **Representation boundaries**, each with a passing control: an
  omitted needed binding fails; an omitted unneeded one does not; a
  missing table entry fails; shadowed duplicate bindings and entries
  pass when the first is right and fail when it is wrong; reordered
  fields in a nested record pass; a wrong field type fails; the same
  certificate fails once `D`'s clause is removed (D2).
- **Duplicates against overlap**: a list `[a: Int, a: Int]` is one
  field and passes (`dupList`); a composition `{ ...u, ...r }` with both
  holding `a` is refused (`overlap`, and `evalS` returns none).
- **A gap the checker caught in a hand-written example**: `nested` first
  omitted `r lacks b`, so the pattern where `r` holds `b` had no
  certificate and `checkAll` refused it. It is kept as a test.
- **Mutant** (isolated copy, deleted): dropping D2 from `checkAtom`
  breaks K4's proof; with that proof stubbed out, the broken-certificate
  `#guard` fails too.

**Still open, as separate decisions:** K7, certificate search beyond
the oracle (which stays untrusted), completeness, the policy for
Unresolved signatures, source-to-constraint translation, compiler
integration. This milestone gives a checked guarantee for supplied
certificates; it adopts nothing.

**Accepted** (the author's review, 2026-10-20). The guarantee: for any
supplied certificate table, if `checkAll` returns true, the modeled
signature is valid, with finite witnesses for finite callers. The
search may be buggy or incomplete without weakening it. Qualification
kept: the general implication is kernel-checked; the 49 individual
acceptances are `#guard`s, run by Lean's evaluator. No compiler
adoption or integration follows.

## 16. K7, no loss against `Accepts`: statements first

Proposed by the author (2026-10-20) as the next bounded milestone:
whether every semantic certificate can be replaced by a finite
syntactic one that `checkAll` accepts. Statements for approval; nothing
proved. K7 would close the gap between §14's semantic acceptance rule
and §15's executable representation. It would not make P9s complete
for valid signatures: `split` is valid and the search finds no
certificate for it. Whether `Accepts splitSig` fails is not proved
(`wholeRest_fails`, §13.7, is about ground placements, not about
`Accepts`); see the optional K8 below.

### 16.1 Statements (proposed; none proved)

- **K7a, congruence.** `HoldsG P Γ a` depends only on the type and row
  variables `a` mentions: if `Γ` and `Γ'` agree on them, `HoldsG P Γ a
  ↔ HoldsG P Γ' a`. (D2 reads `Γ.row x` and `Γ.row y` only, so the
  variables of the `disjoint` atom suffice; the equation case uses
  `evalT_congr`, Closed.lean.)
- **K7b, representation.** Every finite generic value is a denotation:
  `FinG g → ∃ s, den s = g`; and every row `f` with
  `FinG (.record f)` is `denRow fs` for some list `fs`.
- **K7c, the checker is complete for one atom.** The converse of
  `checkAtom_sound`: `HoldsG P (genAssign P (patternOf p) (denCert C))
  a → checkAtom P p C a = true`. (Argument: K3 is an equation, and K2's
  three decisions are equivalences.)
- **K7d, dropped after review.** It said `checkCert` reads a pattern
  only as a set. True, but not needed: if `lookupCert` returns an entry
  stored under `q` with the same pairs as `p`, then `patternOf q =
  patternOf p` as functions, so that entry's certificate already
  certifies `patternOf p`, and K7c applies at `p` directly.
- **Lifting keeps variables** (a small lemma K7 needs):
  `atomTyVars (liftAtom a) = atomTyVars a`, and likewise for row
  variables.
- **K7, no loss.** `Accepts P → ∃ T, checkAll P T = true`. With K6:
  `Accepts P ↔ ∃ T, checkAll P T = true`.

Argument to formalize for K7: for each consistent finite pattern `p`,
`Accepts` gives a certificate `σ` for `patternOf p`; K7b represents
`σ`'s values at the finitely many variables of `B` as a syntactic
certificate `C`; `denCert C` agrees with `σ` on those variables (other
variables denote `{}`), so by K7a the generic atoms still hold, and by
K7c `checkCert P p C = true`. The table lists one such entry per
consistent pattern; whichever entry `lookupCert` finds has the same
pairs, hence the same `patternOf`. Repeated pairs are the ordinary case
(`written P` repeats a label whenever it is written twice), not an edge
case.

What K7 does not give: a way to compute `T` (it is an existence
statement over semantic certificates), any claim that the oracle's
bounded search finds `T`, or completeness of P9s.

### 16.2 Restrictions table, completeness pass

The direction is reversed from §15.4: the question is whether the
syntactic side loses any semantic certificate.

| Restriction of the syntax | Believed harmless because | Challenge | Status |
|---|---|---|---|
| finitely many bindings, the rest `{}` | `B` mentions finitely many variables (K7a) | a semantic certificate binding every variable to a non-empty value (§15.6's review) | K7a |
| records are finite lists | `Certifies` requires `FinAssign`: every row finite at every depth | a value finite at the top with an infinite nested row: excluded by `FinG`'s depth | K7b |
| base types and constants as `GB` | `SG.base` takes any `GB` | none | definitional |
| patterns looked up by set | an entry with the same pairs has the same `patternOf` | two sublists with the same pairs in `patterns P` (routine: any label written twice) | by `patternOf`'s definition |
| `DecidableEq B` | needed only to run the checker | none for existence | assumption |

Distinguishing example for K7 (to check after proof): a problem
writing a label twice, so `patterns P` holds lists with the same pairs,
and a table built from semantic certificates passes.

### 16.3 Optional: K8, P9s's incompleteness in the formal model

- **K8** (statement only, offered, not proposed by default):
  `¬ Accepts splitSig` while `ValidAll splitSig` (proved,
  `splitSig_valid`). It would show, in the model rather than in the
  bounded oracle, that `Accepts` is strictly stronger than validity,
  so the incompleteness §13.7 found is a property of P9s's acceptance
  rule and not only of the oracle's search. Argument: no label is
  written, so every pattern gives the same generic assignment; the
  equation makes `u ⊎ v` equal `r`'s generic row `{ inr 0: R(0) }`
  (which also excludes arbitrary generic labels in `u` or `v`, W1 not
  needed), so exactly one of them holds `inr 0`; D2 then needs
  `Declared 0 1` or `Declared 0 2`, and `D` declares neither. The
  adversarial reviewer proved this in a scratch Lean file (about 45
  lines, no `sorry`); it is not in the repository and waits for your
  decision.

### 16.4 For the author

1. Approve or amend K7a-K7c, the lifting lemma, and K7.
2. Whether K8 joins this milestone.
3. Proposed files: Sig/Congr.lean (K7a), Sig/Represent.lean (K7b),
   Sig/Complete.lean (K7c, K7), and Sig/SplitNotAccepted.lean if K8
   is included.

**Adversarial review** (independent reviewer, 2026-10-20): no false
statement. K7d's stated role was wrong (it is not needed; dropped). The
lifting lemma was missing (added). Confirmed by hand: K7a (D2 reads
only the atom's two rows), K7b (classically, filtering the `FinRow`
list to present labels), K7c for all four atoms (the equation case's
`wfS` on one side suffices, since both sides denote the same value),
K7's argument (`consistentS_iff` gives each pattern's consistency
directly; `pattern_cover` is not needed). K8 proved in scratch Lean.

### 16.5 Approval and the proofs (Lean)

The author's review (2026-10-20) approved K7a-K7c, the lifting lemma
and K7, included K8, and asked for `ValidFin splitSig` alongside the
unrestricted result. Details kept: K7a compares complete assigned
values, nested field types included; K7b is an existence result and is
not described as a conversion algorithm; the lookup step is explicit.

Proved (research/composition-proofs/Composition/Sig/; clean build, no
warnings, no `sorry`):

| Statement | Lean | File |
|---|---|---|
| K7a | `holdsG_congr` (hypotheses: equal values at the atom's variables) | Congr.lean |
| lifting keeps variables | `atomVars_liftAtom` | Congr.lean |
| K7b | `represent`, `represent_record` | Represent.lean |
| K7c | `checkAtom_complete` | Complete.lean |
| a semantic certificate has a syntactic one, valid at every pattern with the same `patternOf` | `checkCert_of_certifies` | Complete.lean |
| the lookup step | `patternOf_same`, `table_exists` | Complete.lean |
| K7 | `accepts_checkAll`; with K6, `accepts_iff_checkAll : Accepts P ↔ ∃ T, checkAll P T = true` | Complete.lean |
| K8 | `splitSig_not_accepts` (adapted from the §16 reviewer's scratch proof) | SplitNotAccepted.lean |
| `split` valid in the finite semantics | `splitSig_validFin`, with `finG_part` (parts of a finite row are finite) | SplitNotAccepted.lean |
| the boundary | `semantic_rule_boundary` | SplitNotAccepted.lean |

**The distinction, as proved** (`semantic_rule_boundary`): every
signature admitted by the semantic rule has some finite table the
executable checker accepts. Some valid signatures are nevertheless
excluded by that semantic rule: `splitSig` is valid over all partial
maps and over finite values, and `Accepts` refuses it.

Notes:

- `represent` needs no `Classical.choice` (it eliminates existentials
  inside `Prop`); it is still not executable, since it speaks of
  semantic values whose records are functions. The theorems using it
  depend on all three standard axioms through the classical semantics.
- Mutant (scratch, deleted): the same proof script run on a copy of
  `splitSig` that also declares `disjoint 0 1` fails exactly where it
  needs that pair undeclared (`hnd01`).
- The distinguishing example of §16.2 (a label written twice, so
  `patterns P` holds lists with the same pairs) is the ordinary case:
  `lacks_declared` and most exported problems write a label more than
  once, and they pass `checkAll` (§15.8). The table K7 constructs is
  not computable, so it has no `#guard`.

**Still open, as separate decisions:** which valid signatures P9s
leaves Unresolved (`split` is one; a complete procedure is research),
whether Waxwing source produces the intended constraints, how accepted
constraints justify compilation and split selection, and compiler
integration. None is adopted by this milestone; neither is the
boundary as final language policy.

**Accepted** (the author's review, 2026-10-20). Three things are now
distinguished: call-site satisfiability has a terminating, sound and
complete decision procedure (§12); the executable checker loses
nothing relative to `Accepts` (K7); `Accepts` excludes some valid
signatures (K8), a gap in the semantic rule, not in the table format
or the oracle's search. More searching cannot make this checker certify
`splitSig`. Not approved: P9s's boundary as language policy, compiler
integration.

## 17. The source-level boundary

Requested by the author (2026-10-20) before any further procedure:
ordinary Waxwing functions the checker certifies, valid functions it
cannot, and whether `splitSig`'s pattern arises from the intended
source fragment. Programs and translations:
sig-oracle/source-boundary.mjs; Lean: Sig/SourceBoundary.lean.

### 17.1 Translation (by hand; no translator is implemented)

These rules are this dossier's reading of docs/language.md and of the
convention §13.1 and `p6Sig` already use. The compiler's own constraint
generation is not consulted, so a translation is a claim about the
intended language, not about the implementation.

| Source | Signature problem |
|---|---|
| a declaration's row and type variables | rigid |
| written `where` clauses | atoms of `D` |
| a tail written beside fields, `{ a: T, ...r }` | `r lacks a` in `D` (language.md: "each tail lacks the labels written beside it") |
| two tails in one signature record, `{ ...r, ...s }` | `r disjoint s` in `D` (language.md, Tranche B: "a parameter or result type that writes both into one record") |
| a call `f(e1, ...)` | fresh flexible copies of `f`'s variables; each argument's type equals the instantiated parameter type; `f`'s clauses, written and implied, as atoms of `B` |
| a field access `e.l` | `type(e) = { l: α, ...ρ }`, with `α`, `ρ` flexible |
| a record literal `{ ...e, l: e' }` | the record type of its parts (defined only if they are disjoint) |
| `let x = e` | `x` has `e`'s type (monomorphic, as today) |
| the body | its type equals the declared result |

Not modeled: string interpolation (so `greeting` returns `person.name`
rather than the program 1 string), effects (programs 9, 10), the merge
API of program 7 (unspecified), local generalization (program 8A).

### 17.2 Results

| Function | Source shape | Bounded | P9s | Lean |
|---|---|---|---|---|
| `greeting` | field access through a rigid tail | valid | certified | `greeting_validFin` |
| `mark` (program 2) | extension under `lacks` | valid | certified | `mark_validFin` |
| `markAll` | forwards to `mark` | valid | certified | `markForwarded_validFin` |
| `join` (program 3) | two spreads under `disjoint` | valid | certified | `join_validFin` |
| `forwarded` (program 6) | forwards to `join` | valid | certified | `forwarded_validFin` |
| `join3` | `join(join(a, b), c)`, a part holding two rests | valid | certified | `join3_validFin` |
| `both` (program 11) | one input extended at two field types | valid | certified | `both_validFin` |
| `wrapAccepts` | a generic caller of program 4's `acceptsParts` | valid | certified | `wrapAccepts_validFin` |
| `bad`: `{ ...a, ...b }` without a clause | | invalid | Unresolved | |
| `bad`: `p.name` through `{ ...r }` | | invalid | Unresolved | |
| `route` | a generic caller of `divide` (below) | valid | Unresolved | `routeSig_validFin`, `routeSig_not_accepts` |
| `route` with `r disjoint s` added | | valid | certified | `routeNarrowed_validFin` |

"Certified" means: the untrusted search found a table, and the kernel
checks it (`checkAll ... = true` by `decide`), so `checkAll_validFin`
gives validity of the translated problem in the finite semantics. The
same holds for every exported table, the earlier 49 included
(`exported_all_pass`, kernel `decide`): §15.8's qualification that those
acceptances were evaluator checks no longer applies. The two invalid
controls are Unresolved, as P9s never answers Contradiction; the
bounded oracle finds counter-instances for both.

### 17.3 Does `splitSig`'s pattern arise from source?

Yes, from features the intended fragment already contains:

~~~waxwing
fn divide(whole: { ...u, ...v }, left: { ...s }, right: { ...t }): Int
  where u disjoint s, v disjoint t = 0;

fn route(x: { ...r }, y: { ...s }, z: { ...t }): Int
  where s disjoint t =
  divide(x, y, z);
~~~

`divide`'s two-tailed parameter is program 4's shape; its clauses are
program 3's; the generic call is program 6's. Checking `route` gives
`splitSig` plus aliases: `r` must be divided between `u` and `v` by
membership in `s`. It is valid (`routeSig_validFin`: `u` takes `r`'s
fields outside `s`, `v` those inside, which `t` lacks), and the semantic
rule refuses it (`routeSig_not_accepts`), so no table certifies it.

What a programmer meets: a generic function passing its own record to an
API whose two-tailed parameter has a disjointness requirement on each
part, against different other arguments. One narrower-signature
workaround P9s certifies is `where r disjoint s` (`where r disjoint t`
also gives an immediate placement); either changes the contract, and
callers whose `x` overlaps that argument would then be rejected. It is
a documented workaround, not equivalent behaviour.

Whether this occurs in practice is not settled here. In the eleven
acceptance programs no signature check has this shape (by reading:
programs 1, 2, 3, 6 and 11 are certified above; program 4's and 5's
bodies are trivial and their calls are in `main`, decided at the call
site; 7, 8A, 9 and 10 are outside the model). So the limitation is
reachable from the intended fragment, and absent from the acceptance
programs.

### 17.4 For the author

Which missing cases need further research: `route`'s shape (a
rigid row divided by membership in other rigid rows) is the only valid
family found so far, in this investigation (the oracle's runs and this
section), that P9s cannot certify. That scopes the search done; it is
not a characterization of every case P9s misses.
The choice is yours: research a procedure that divides rigid rests
(Q1-Q3 of §13.9 become its questions), or accept the narrower-signature
workaround for now, recorded as a known limitation, not as final
policy.

**Accepted** (the author's review, 2026-10-20), with the two wording
corrections above. Direction: research division of rigid rests before
compiler integration; keep P9s as the proved conservative baseline for
comparing candidates. The source-to-constraint translation stays a
separate, stated assumption. Authorized: a focused research proposal
(§18), not a new solver, and not the workaround as language policy.

## 18. Dividing rigid rows: a research proposal

Authorized (the author's review of §17, 2026-10-20): a focused research
proposal. Not authorized: a solver, proofs, the workaround as policy,
compiler integration. P9s stays the proved conservative baseline: any
candidate must accept everything P9s accepts and be compared with it on
the same problems. Source reading:
research/composition-assessment/division/ (three notes; what was read,
from where, and which sentences are the readers' inferences).

### 18.1 The capability, stated exactly

P9s's witnesses take each rigid row's rest whole or not at all. The
missing capability is a **term witness**: a flexible row's value may be
a rigid row restricted to a set term over the rigid rows' domains and
the written labels.

- Set terms: `T ::= ∅ | dom r | {l} | T ∪ T | T ∩ T | T ∖ T`, for rigid
  rows `r` and written labels `l`. No absolute complement: rows are
  finite.
- A typed term witness for a flexible row is `⊎ᵢ rᵢ|Tᵢ ⊎ F`: parts of
  rigid rows, each restricted to a set term, the parts pairwise
  disjoint, plus written fields `F`. Field types come with the parts
  (`rᵢ`'s type at each label of `rᵢ|Tᵢ`).
- P9s's witnesses are the special case `Tᵢ ∈ {∅, dom rᵢ ∖ L}` together
  with written fields; `route` needs `u = r|(dom r ∖ dom s)`.

The research question, in two halves:

- **Presence.** Are term witnesses enough for every valid problem's
  label sets, and is validity then decidable by elimination plus a
  check over regions?
- **Types.** Are typed term witnesses enough when field types are
  independent per row and per label, so that the same label may carry
  different types in two rigid rows?

### 18.2 What the sources give

| Finding | Source | Status |
|---|---|---|
| ∃-elimination: `f(x̄) = 0` is solvable iff `f(0, …)·f(1, …) = 0` is; the witness is a Boolean term in the remaining variables and constants (Boole's reproductive and particular solutions; Löwenheim's) | Martin and Nipkow, JSC 1989, Lemma 3.3, Thms 3.4, 3.6, §6.2; Rudeanu 1974 via Wernhard | published; read (author preprint), Rudeanu second-hand |
| holds in any Boolean algebra; Boolean unification is unitary; solvability can be decided in the finite subalgebra the constants generate; hypotheses on constants by presented algebras (Lemma 4.5) | Martin and Nipkow, §§3-5 | published; read |
| cardinalities enter only with negated atoms or counting atoms; positive equations ask only whether regions are empty | KNR (BAPA) TR §2, Lemma 1; Jeřábek's notes, Thms 2, 3, 17 | the count statements are published; "positive equations ask only emptiness" is the reader's inference |
| ∀∃ Boolean problems in HM inference: successive variable elimination with rigid variables as constants, then a validity check; complete for its problem; Π₂ᴾ | Madsen and van de Pol, OOPSLA 2020, §3.2, §3.5, Thm 3.15; Flix compiler source | published and implemented elsewhere; read |
| no implemented type system handles hypotheses relating rigid variables (our `s disjoint t`) | the same, and S2, S5, S7 of the note | absence in what was read |
| Flix's current effect solver: finite and cofinite constant sets in an infinite universe, element constants, Zhegalkin normal forms | Flix source (`SetFormula`, `CofiniteIntSet`) | implemented; read (code comments) |
| typed row theories (Rose, Rω, Ur) can state a split but derive none from assumptions on rigid rows; none claims complete entailment; none relates field types of overlapping rows | Morris and McKinna 2019; Hubers and Morris 2023, §3.4, §4.5, §7; Chlipala 2010, §§1, 4 | published; read in full |

Gaps the readers found, none covered by a source read:

- **Finite rows.** Finite sets of an infinite universe form a Boolean
  ring without unit, not a Boolean algebra. The reader conjectures that
  witnesses can stay within the rigid rows' domains and the written
  labels (§13.9's obligation (a) is the same claim).
- **Written labels as constants.** `{l} ≠ ∅` is not an equation, so a
  plain identity check is sound and incomplete when hypotheses could
  contradict it (the reader's counterexample: `∀ X. c = ∅ ⇒ X = ∅`).
  P9s enumerates written-label patterns instead of treating labels as
  algebra constants, which may avoid this; not checked.
- **Per-label field types.** Nothing read combines Boolean constraints
  with types indexed by elements.

### 18.3 Proposed statements (for approval; none argued yet)

Labels as at the head of the dossier.

- **D1, presence elimination** (derived from Martin and Nipkow): for the
  presence abstraction of a problem (§13.9), with written labels fixed
  by a pattern, validity equals validity of the problem obtained by
  eliminating each flexible set by Boole's rule, decided by a check over
  the regions of the rigid sets.
- **D2, term witnesses suffice for presence** (derived): a valid
  presence problem has witnesses that are set terms (§18.1), hence
  unions of whole regions; in particular finite (the gap above).
- **D3, typed transfer** (unresolved, the main question): a valid typed
  problem has typed term witnesses; equivalently, validity can be tested
  at a generic instance where every (rigid row, region) pair carries
  its own fresh field types.
- **D4, a candidate checker** (to design only after D1-D3 are
  reviewed): P9s's generic model with one opaque part per (rigid row,
  region) instead of one rest per rigid row. Its soundness should
  follow §14's interpretation, with `h` expanding each part; its
  completeness would rest on D2 and D3.

### 18.4 Restrictions table, challenged before any proof

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| existential rows take whole regions | Boole's solutions are terms over the rigid sets (published, for Boolean algebras) | finite rows are not a Boolean algebra; BAPA lets existential sets take part of a region (Lemma 1), with negation or counts | the author's caution: not assumed; D2 must be argued for Waxwing's positive atoms and finite rows |
| no region sizes | Waxwing's atoms are all equations to `∅` (`lacks`, `disjoint`, record equations, composition definedness) | find a Waxwing atom or source construct that expresses `≠ ∅` or a count | to check against §17.1's translation |
| one opaque part per (rigid row, region) carries independent types | labels of one region are interchangeable for presence | **type-agreement placement**: a valid problem whose witness must place a shared label by whether `r` and `s` give it the same type, which is not a set term over domains | open; the first target for the bounded oracle |
| written labels by patterns, not as algebra constants | patterns fix each written label's presence, so `{l} ≠ ∅` never needs to be an equation | the reader's `c = ∅ ⇒ X = ∅` family, under patterns | to check |
| witnesses within the rigid domains and written labels | a fresh label removed from every flexible row preserves positive atoms (§13.9 (a)) | a constraint that holds only with a flexible row non-empty outside the rigid domains | to argue |
| nested records and record-valued type variables are outside the presence part | handled by `h` as in §14 | `recSig`-like problems combined with division | open |

### 18.5 Proposed next steps (each for approval)

1. A typed bounded oracle for D3: rigid rows over shared labels at
   different types, flexible rows ranging over typed term witnesses,
   compared with bounded validity; aimed first at type-agreement
   placements. P9s and the term-witness model run side by side.
2. Statement review of D1-D3 with the oracle's results, then proofs in
   Lean if approved (the presence half first, building on §13.9's
   translation).
3. Only then D4's design, with its own restrictions table, compared
   with P9s on the challenges, the generated problems and §17's source
   programs; `route` must be certified and nothing P9s certifies lost.

Leads not yet read: Rudeanu's and Brown's books, Büttner and Simonis,
Baader 1998, Flix's OOPSLA 2023 and 2025 and POPL 2026 papers (behind
access checks), Harper and Pierce 1991, Pottier ESOP 2000, Rémy's
"Typing record concatenation for free".

### 18.6 Amended statements (the author's review of §18, 2026-10-20)

The review approved the typed bounded oracle, asked for D1-D3 to be
amended before they become proof targets, and kept D4, proofs and
compiler integration as separate approvals. The amendments replace
§18.3's D1-D3.

**The presence fragment.** Labels form an infinite set `ℒ`; `L ⊆ ℒ` is
the finite set of written labels. Set variables: rigid `X₁…Xₙ` and
flexible `Y₁…Yₘ`, ranging over **finite** subsets of `ℒ`. Set
expressions `e ::= X | Y | {l} | e ∪ e` (`l ∈ L`), the presence of a
record expression's parts. Atoms, each of the form "something is
empty":

- `e₁ ∩ e₂ = ∅`, from `disjoint` and from the definedness of a
  composition (one atom per pair of its parts);
- `l ∉ e`, from `lacks`;
- `e₁ = e₂`, the presence half of a record equation (`e₁ ∖ e₂ = ∅` and
  `e₂ ∖ e₁ = ∅`).

A presence problem is `∀ X̄. D(X̄) ⇒ ∃ Ȳ. B(X̄, Ȳ)`, `D` over rigid
variables only (declared and implied clauses, §17.1), `B` the body's
atoms. Hypotheses mean exactly that: only rigid assignments satisfying
`D` are quantified over.

**Written labels by patterns.** A pattern `π` fixes `Xᵢ ∩ L`. Write each
rigid set as `Xᵢ = Pᵢ ∪ Rᵢ`, with `Pᵢ ⊆ L` fixed by `π` and `Rᵢ ⊆ ℒ ∖ L`
its rest, and each flexible set as `Yⱼ = Qⱼ ∪ Sⱼ`, `Qⱼ ⊆ L` and
`Sⱼ ⊆ ℒ ∖ L`. Every atom then splits exactly into a written part (over
the `Pᵢ` and `Qⱼ`, finitely many cases) and a rest part (over the `Rᵢ`
and `Sⱼ`, with no constants), because each atom is a conjunction over
labels and `L` and `ℒ ∖ L` are disjoint. Labels are thus never algebra
constants, which is meant to avoid the singleton gap (§18.2); that the
split is exact is obligation O2 below.

- **D1, presence elimination** (a **proposed adaptation** of Martin and
  Nipkow's Lemma 3.3 and Boole's method, §18.2; not derived until
  O1-O3 are discharged): for each pattern `π` and each written choice
  `Q̄`, the rest part is valid iff the result of eliminating `S̄` by
  Boole's rule is implied by `D`'s rest part, and that implication is
  decided region by region (on `{0, 1}` per region of the `Rᵢ`).
  - O1: elimination and the identity check are correct for finite
    subsets of an infinite set, which form a Boolean ring without unit,
    not a Boolean algebra.
  - O2: the split into written and rest parts is exact for every atom
    of the fragment, `D`'s included.
  - O3: a written choice `Q̄` that works may depend on `π` but not on
    the rests; and the rests' problem does not depend on `Q̄` beyond
    the written part.
- **D2, uniform term witnesses for presence** (unresolved): if a
  presence problem is valid, then for each pattern `π` there are one
  written choice `Q̄` and one tuple of set terms `t̄` (over `R̄`, with
  `∪`, `∩`, `∖`, no complement) such that `Sⱼ := tⱼ(R̄)` satisfies `B`
  for **every** `R̄` in `π` satisfying `D`. Finding a term for each
  assignment separately is a weaker property and does not suffice.
  Witnesses stay finite and inside the rigid rests: each `tⱼ(R̄) ⊆ ⋃ Rᵢ`
  because no term uses a complement. `route`: `S_u = R_r ∖ R_s`.

**Types.** "Equivalently" is withdrawn: D3a and D3b are separate
conjectures, and neither currently establishes the other.

- **D3a, uniform typed term witnesses** (unresolved): if a typed problem
  is valid, then for each pattern `π` there is one **typed template**
  that works for every rigid assignment in `π` satisfying `D`. A typed
  template gives each flexible row, at each written label, absent or a
  field template (a rigid row's field there, a rigid type variable, a
  ground type), and at each Venn cell of the rigid rows (a nonempty set
  `S` of rigid rows holding the label), absent or one source row
  `r ∈ S` whose field it copies; a flexible type variable gets a field
  template or a record template.
- **D3b, a generic instance suffices** (unresolved, needs its own
  construction and transfer argument): for each pattern `π`, a
  specified generic rigid assignment `θ*_π` such that solvability of
  `B` at `θ*_π` implies validity in `π`. The construction must respect
  hypotheses that force field types to agree: where `D` makes `r` and
  `s` equal on a cell (`r = s`, `r = s ⊎ t`), the generic instance must
  give both one shared fresh type there. Independently fresh types
  would violate those hypotheses and make `θ*_π` fall outside `D`.
- **D4** stays a later design, after D1-D3 are reviewed with the
  oracle's results.

### 18.7 The typed bounded oracle: first pass

sig-oracle/templates.mjs and typed-oracle.mjs (README, "The typed
term-witness oracle"). Three independent checks over the same bounded
rigid assignments (written labels plus `z1`, `z2`; rigid fields `Int`,
`Bool`; so two unwritten labels of one cell can relate equally or
unequally across rows): bounded validity with unrestricted witnesses;
**uniform** templates, one per written-label pattern for every rigid
assignment of it; per-assignment templates, only where no uniform one
exists. Templates are searched exhaustively over cells and field-source
choices, with no expression-depth limit. When bounded validity fails at
an assignment θ*, one search at θ* decides both that no uniform
template exists and whether the bounded flexible domain was too small.

First pass excludes problems with records nested in fields
(`nested-same`, `nested-two`, `nested-alias`,
`nested-alias-undeclared`, `tyvar-nested-rest`): their field templates
would need nested records, which this pass does not enumerate.

| Run | Problems | Bounded invalid, no template | Valid, template, P9s certifies | Valid, template, P9s Unresolved | Separations, power or P9s flags |
|---|---|---|---|---|---|
| named: 6 typed challenges, 18 first-pass challenges, 12 source programs (all as predicted) | 36 | 15 | 16 | 5 (`split` twice, `route`, `shared-part-equal-rows`, `agreement-hypothesis`) | 0 |
| generated, seed 3 | 300 | 115 | 181 | 4 | 0 |
| generated, seed 11 | 300 | 94 | 199 | 7 | 0 |

- **No separation**: every bounded-valid problem has a uniform typed
  template, so no type-dependent placement and nothing beyond term
  witnesses was found in this fragment at these bounds.
- **`route` and `split`** have uniform templates (`u` takes the cells of
  `r` outside `s`, `v` those inside), as do problems whose hypotheses
  force agreement (`r = s`, `r = s ⊎ t`) and the controls with shared
  parts. Every problem P9s certifies has a template (no P9s flag).
- **Larger bounds** (three unwritten labels, `{}` as a rigid field
  type): the uniform templates of `split`, `route`, `forwarded`,
  `join3`, `agreement-hypothesis` and the two shared-part controls still
  hold (up to 21,952 rigid assignments each).
- **Controls**: the invalid challenges (`alias`, `compose-undeclared`,
  `equal-rests`, `types-differ`, `shared-part`, `split-undeclared`, the
  two source `bad` functions) have no template at their counter-instance.
- **Power** (scratch copies, deleted): templates copying a fixed type
  rather than the source's are flagged as separations and as P9s
  inconsistencies; templates not grouped by pattern make `depSig` show
  "no uniform template, per-assignment found", so the detector reports
  the distinction the author asked to preserve.

**Revised standing.**

- D2 and D3a: bounded evidence only, within the first-pass fragment (no
  records nested in fields, one written label, at most three rigid and
  three flexible rows). Not established: larger fragments, nested
  records, record-valued type variables in fields.
- D3b: not tested; it needs its generic-instance construction first
  (§18.6), which this pass does not provide.
- D1: unchanged, a proposed adaptation with obligations O1-O3.
- Next, each a separate approval: a second pass covering records nested
  in fields (finite but larger template spaces); the D3b construction;
  then proofs of D1 and D2 if approved; D4 after that.

### 18.8 Second pass: grammar and bounds, fixed before running

The author's review of §18.7 (2026-10-21) approved a focused second pass
for nested records and deferred D3b until it is reviewed. Corrections:

- **"Exhaustive" means within the stated template grammar** (and bounds).
  It does not show that the grammar expresses every necessary witness;
  §18.7's first-pass result is "no separation within that grammar".
- **D3a's type-template grammar was incomplete.** The semantic language
  has function types: `∀ α. ∃ β. β = α → α` is valid and needs a
  template that builds a function type. D3a now uses the grammar below,
  function templates included.

**Template grammar (D3a, and the second pass).**

- Leaves: `A(r, l)` (rigid row `r`'s field at written label `l`, under
  a pattern where `r` holds `l`), `T(n)` (rigid type variable `n`), and
  ground types `g` (the problem's base types, `Int`, `Bool`).
- Skeletons `Sk(P)`: the constructor shapes of the problem's own type
  subexpressions. An arrow's skeleton is the arrow of its parts'
  skeletons, and a record's is its written labels with their fields'
  skeletons and one cell map for its tails. A base type or type variable
  becomes a hole.
- `Temp₀` is the leaves. `Temp_{k+1}` is `Temp_k` together with every
  skeleton of `Sk(P)` whose holes are filled from `Temp_k` and whose
  record nodes each get a cell map (per cell, absent or a source row in
  the cell) if the skeleton's record has tails; a record written
  without tails has no cell map. (Refinement recorded before running.)
- Flexible type variables range over `Temp₂`. Flexible rows: each
  written label absent or a template from `Temp₁`, and a cell map.
- **Exhaustive within this grammar**: every combination is enumerated
  (the cell maps and field-source choices included). A separation found
  inside it is real for that grammar; finding none says nothing about
  witnesses outside it (for instance a shape the problem never writes,
  or nesting beyond `Temp₂`).

**Bounds.** Labels: the problem's written labels plus `z1`, `z2`. Rigid
row fields: absent, `Int` or `{q:Int}` (a record, so nested field
values occur in rigid rows). Rigid type variables: `Int`, `Bool`,
`{}`, `{q:Int}`, `(Int->Int)` (record- and function-valued; the same
list bounded validity uses for flexible type variables). Bounded
validity's flexible domain: `Int`, `Bool`, `{}`, `(Int->Int)`,
`{q:Int}` and the values the problem's own subexpressions build.

**Uniformity** as before: one template per written-label pattern,
fixed before any rigid assignment is seen, for every assignment of the
pattern satisfying `D`. The template may not change with nested field
values or their equalities.

**Problems.** The five excluded challenges; new ones combining division
with nested field types, record-valued rigid type variables, and
hypotheses requiring nested types to agree; passing controls for
template construction (a nested record assembled from rigid inputs, a
function type assembled from a rigid type variable) and P9s-certified
cases; broken controls. Stop at a separation or at the end of the pass.

**Search method (recorded before running; it changes speed, not the
grammar).** Every atom is a conjunction over (position, label) pairs,
and the labels split into the Venn cells of the rigid rows (per rigid
assignment) and the rest. So the search first fixes each template's
shape (constructors, leaves, written fields) and checks the atoms on
the labels outside every cell; then, for each cell independently, it
chooses the cell-map entries of every record node and checks the atoms
projected onto that cell's labels, for every rigid assignment. A
template exists iff a shape passes and every cell has entries. The
projection applies to every record at every depth, rigid values
included. Cross-check: on §18.7's first-pass problems the new search
must agree with the first-pass engine.

### 18.9 Second pass: what happened

Recorded in the order it happened, because two problems were found
during the pass.

**1. A search bug, caught by the cross-check.** The first version of
the decomposed search projected inputs but not the values an equation's
sides evaluate to, and dropped a written field's whole subtree from the
cell blocks. Part A (the decomposed search against the first-pass
engine, on §18.7's 36 problems) showed two mismatches (`tyvar-field`,
`src-both`). The fix partitions positions by path: a position reached
through non-cell labels only is in the block outside the cells; a cell
label's whole subtree is in its cell's block; equation values are
projected after evaluation. After the fix: part A, 0 mismatches of 36.
A first part-B run made with the earlier version is void (it showed a
spurious "template at the counter-instance" for `nested-two`).

**2. An independent check of nested positions.** Part A cannot test
nested positions (the first-pass problems have none), so
sig-oracle/nested-brute.mjs searches the same grammar without
decomposition: every shape and every cell-map entry of every record
node, checked on whole values. Part C compares it with the decomposed
search on the six nested problems small enough to enumerate: 0
mismatches, in both grammars below.

**3. A gap in the grammar as specified (§18.8).** A record node with
tails stands for rows that, under a pattern, may hold written labels;
the grammar gave such a node a cell map but no written fields (only
flexible rows had them). So `nested-same` (`x = { f: { ...r } }` where
`r` may hold the written label `f`) has no template in the grammar, yet
P9s certifies it: P9s's own witness falls outside §18.8's grammar. The
pass flags this as "P9s without template", which is what the flag is
for. This is a defect of the grammar written in advance, not evidence
about division.

**Amended grammar, after a run (for review).** A record node with tails
also gets, at each written label its skeleton does not write, absent or
a leaf template, as a flexible row does. Both grammars are reported
below, separately; nothing about the specified grammar's results is
replaced.

**Results** (both grammars, each on the same 29 problems: the five the
first pass excluded, the eight nested challenges, sixteen P9s-certified
named problems; eight parallel shards):

| Grammar | Agree (as predicted) | Flagged |
|---|---|---|
| as specified (§18.8) | 25 | `nested-same`, `nested-alias`, `tyvar-nested-rest`: P9s certifies, no template; `division-in-field`: bounded valid, no template ("beyond the grammar"). All four are the tail-node gap of item 3 |
| amended (item 3) | 29 | none |

Under the amended grammar every prediction holds: division inside a
field and inside a function type, a record-valued rigid type variable
divided by another row, and a hypothesis making nested types agree all
have uniform templates; the broken controls (`nested-two`,
`nested-alias-undeclared`, `nested-agreement-missing`,
`nested-rigid-mismatch`) have none; the template-construction controls
(`function-from-rigid`, `record-from-rigid`) and every P9s-certified case
pass. Cross-checks: part A (against the first-pass engine) 0 mismatches
of 36 in both grammars; part C (against brute force) 0 of 6 in both.
Power check (scratch copy, deleted): with function skeletons removed,
`division-in-function` becomes "beyond the grammar" and
`function-from-rigid` is flagged.

### 18.10 Adversarial review of §18.6-18.9, and further reading

An independent reviewer (2026-10-21) found no disagreement between the
decomposed and brute-force searches (196 random small problems with
cell labels at nested positions, inside arrows and in rigid type
variables' values; and a hand argument for the path partition). Defects
found, all corrected or recorded:

- §18.7's table counted 19 first-pass challenges; there are 18 (fixed).
- **The first-pass grammar was not exhaustive for its own fragment.**
  `inFirstPass` admits records inside arrows, but `needsRecord` offers a
  record template only to a type variable equated with a record at the
  top of an equation, and the first pass has no function templates. Two
  problems (`∀ r. ∃ β. β → Int = {...r} → Int`; `∀ α. ∃ β. β = α → α`)
  are valid and P9s-certified but have no first-pass template; the
  second-pass search finds both. §18.7's "exhaustively" holds only for
  that narrower grammar; its results stand as a statement about it.
- The flag "BUG: P9s without template" conflated a grammar gap with a
  P9s defect. Renamed "P9s witness outside the grammar, or a P9s
  defect" in both oracles.
- When a template is found at the counter-instance θ* (the power case),
  nothing follows about uniformity; both classifiers reported
  `uniform: false`. They now report it unknown. No run had that case.
- §18.9 promised results it did not yet contain (now added above).
- **The presence fragment is exact only for flat rows.** With nesting
  or type variables, an equation can tie a row's labels to a value
  (`{ f: {...Y} } = {...X}` makes `Y`'s labels those of `X`'s field
  `f`), which no set atom over `X`, `Y` states. D1 and D2 are about the
  presence fragment as defined, not about the presence of every typed
  problem; transferring them needs the problem's equations to relate
  flat record expressions, or a separate argument.
- **D3b must handle hypotheses tying rigid type variables to rows**
  (`α = { ...r }`, `{ f: { ...r } } = { f: α }`): the generic `α` must
  be built from the generic `r`. P9s's patterns ignore `D`'s equations
  (sound, §14) so its generic instance can fall outside `D` there.

Further reading (research/composition-assessment/division/
concatenation-leads.md): Pottier's filters (LICS 2003; Leijen's citation
was to this paper, not ESOP 2000) are constant label sets; his theorems
decide satisfiability, not entailment. Rémy 1992 types concatenation as
composition of row transformers and cannot split a row. Harper and
Pierce 1991 forbid `a \ l` for a variable `a` and read disjointness only
from declarations. Baader 1998: Boolean unification with constants is
the conjunctive ∀∃ fragment, Π₂ᴾ-complete, and a single-equation
sentence holds in all Boolean algebras iff in the two-element one
(Thm 6); constants are uninterpreted and field types are not covered.
None divides a row by membership in another from assumptions.

### 18.11 Presence proofs: the shared interface

Authorized (the author, 2026-10-21): proof work on D1's O1-O3 and on D2
for presence, in parallel, with one owner for the shared definitions and
exact statements, isolated worktrees, integration through that owner,
and an adversarial review of the combined statements and assumptions.
Finite rows, declared hypotheses, per-pattern uniformity and the stated
witness grammar are preserved; any change comes back for review. D3b,
D4, compiler changes and solver integration stay unauthorized.

The interface is research/composition-proofs/Composition/Presence/
Defs.lean (statements only). Two findings while writing it, before any
proof:

- **O3 as first conceived is false.** "Valid iff the written part is
  valid per pattern and the rest part is valid" fails when `D` is
  impossible on the written labels (for example `{a} ∩ {a} = ∅`): the
  problem is then valid vacuously while the rest part can fail. O3 now
  has the disjunct "or `D` is impossible on the written labels". This is
  a missing assumption, reported; it is the vacuity case of §14.8, not a
  change to the model.
- **O1 takes the per-region form.** Every atom is a per-label condition,
  so the rest part over finite sets is valid iff for every membership
  vector `b` (a label's membership in the rigid sets) that `D` allows,
  some flexible vector `s` satisfies `B`: the two-valued check region by
  region. Boole's rule (`∃ y. f(y) ⇔ f(0) ∨ f(1)` at one label) is one
  way to compute that inner existential; the substance of O1 is the
  reduction, where finite rows and infinitely many labels are used
  (`InfiniteLabels`).

Statements (Lean names): `O2` (each atom splits exactly into its
written and rest parts, each part local, written labels empty on the
rest); `O3` (validity iff `D` impossible on written labels, or
`WrittenValid ∧ RestValid`); `O1` (with infinitely many labels,
`RestValid ↔ BitValid`); `D2` (with infinitely many labels, a valid
problem has, per pattern satisfying `D`, one written choice and one
tuple of set terms over the rests, without complement, working for
every finite rest assignment satisfying `D`, the witnesses inside the
rigid rests).

### 18.12 Presence proofs: results

Proved (research/composition-proofs/Composition/Presence/; one build,
no warnings, no `sorry`, the three standard axioms):

| Statement | Lean | File | Proved in |
|---|---|---|---|
| O2: the written/rest split is exact, each part local | `o2` | O2.lean | its own worktree |
| O3: valid iff `D` impossible on written labels, or `WrittenValid ∧ RestValid` | `o3` | O3.lean | its own worktree |
| O1: with infinitely many labels, `RestValid ↔ BitValid` | `o1` | O1Bits.lean, O1.lean | its own worktree |
| D2 (presence): uniform complement-free term witnesses per pattern | `d2_of` (from O1, O2, O3), `d2` | D2Terms.lean, D2.lean, Main.lean | its own worktree; instantiated at integration |
| the rest part is a finite, computable check | `bitCheck_iff`, `restValid_iff_bitCheck` | Decide.lean | its own worktree |
| validity is a finite, computable check | `writtenCheck_iff`, `dWritten_iff`, `valid_iff_validCheck` | DecideWritten.lean, DecideValid.lean | its own worktree |
| non-vacuity | `split_valid`, `split_bit`, `bad_not_valid`, `tiny_rest`, `tiny_not_bit`, `infNat`, `not_infBool` | Examples.lean | the reviewer, restyled |

Integration: one owner (this session) copied the four results into the
main checkout; four helper names that two worktrees had defined
independently (`SExpr.rigids`, `PAtom.rigids`, `evalB_zero`,
`labels_written`) were renamed in D2's files; the worktrees were then
removed (their branches kept). No statement was changed during the
proofs; the only finding before them was O3's vacuity disjunct
(§18.11).

**Adversarial review of the combined statements** (independent reviewer,
2026-10-21): no false and no vacuous theorem; each has content, checked
in Lean (the examples above). `split` in presence form is valid through
`o3` and `o1` and `d2` applies to it; with one label (`Unit`), O1's
equivalence fails, so its hypothesis does work. Points recorded:

- **"Decided" is not yet formal.** `BitValid` still quantifies over
  functions `Nat → Bool`; a lemma that it equals a finite check over the
  mentioned indices, with a computable checker, is needed before D1 can
  be called decided. Being proved now (within D1's authorization).
- **D2 is existence only**: its terms are chosen classically; producing
  them needs a separate constructive statement.
- **`Scoped` is decorative**: `D` is evaluated with no flexible set, so
  a flexible variable in `D` reads as empty; O1 and O3 hold without it.
  Recorded in Defs.lean.
- D2 is stronger than stated: its terms do not depend on the pattern.
- Nothing here transfers to typed records; D3a and D3b are untouched,
  and the presence fragment is exact only for flat rows (§18.10).

**The finite check** (Decide.lean, proved in its own worktree,
integrated): `bitCheck`, a computable `Bool` check over the bit vectors
on the mentioned rigid and flexible indices, with `bitCheck_iff :
bitCheck P = true ↔ BitValid P` (no `Classical.choice`) and
`restValid_iff_bitCheck : InfiniteLabels Label → (RestValid P ↔
bitCheck P = true)` (built from O1's two halves, so without `Scoped`).
`#guard`s: the presence `split` gives true; without its clause, false;
`r₀ ∩ r₀ = ∅`, false.

**The written part and the whole** (DecideWritten.lean,
DecideValid.lean; proved in its own worktree, integrated; assumes
`DecidableEq Label` there only): `writtenCheck_iff : writtenCheck P =
true ↔ WrittenValid P`, `dWritten_iff` for the vacuity disjunct, and
`valid_iff_validCheck : InfiniteLabels Label → Scoped P → (Valid P ↔
validCheck P = true)` with `validCheck P = !dSatCheck P || (writtenCheck
P && bitCheck P)`, computable. `#guard`s: split valid, and invalid
without its clause; `keepOut` invalid because of its written part alone
(`bitCheck` true, `writtenCheck` false), valid with `lacks`; a problem
whose `D` is impossible on written labels, vacuously valid.

**Standing.** For the presence fragment as defined (finite rows,
declared hypotheses, per-pattern uniformity, infinitely many labels),
**D1 holds and validity is decided** by a computable check, and D2
holds (uniform complement-free term witnesses, existence only). Not
established: any typed statement (D3a, D3b), a constructive witness
procedure, D4. The presence fragment is exact for typed problems only
with flat rows (§18.10).

### 18.13 Acceptance of the presence milestone; the parallel campaign

The author (2026-10-21) accepted the presence milestone and §18.9's
grammar amendment within their stated scope. This closes the
presence-only decision problem, not typed row division. Qualifications
kept prominent:

- **Flat presence only.** Nested typed equations need a separate
  transfer argument; nothing here establishes D3a.
- **Validity includes vacuity.** An impossible `D` makes the
  implication valid; refusing unsatisfiable declarations is a separate
  policy that needs its own check.
- **Witness existence is not witness generation.** `validCheck` answers
  validity; D2 gives no executable procedure for the terms.
- **`Scoped` stays on the public result** (`valid_iff_validCheck`) even
  where intermediate lemmas do not need it: the broader reading
  evaluates flexible variables in hypotheses as empty, which is not the
  intended declaration language.
- The amended-grammar runs (§18.9) are exploratory evidence. Future
  confirmation runs freeze their grammar beforehand.

**Authorized, in parallel** (streams 1-7; the assurance stream 8 was
not taken): (1) the D3b construction, statements first, then proof
attempts after an independent adversarial review of its exact
statements (soundness and completeness passes separately); (2) an
attack on D3a, kept a separate conjecture; (3) a constructive presence
witness procedure, proved in Lean; (4) typed oracle expansion under a
frozen grammar; (5) a source-to-constraint specification for the
intended record fragment; (6) compilation and split selection; (7)
read-only integration reconnaissance. D4 may be drafted as a candidate
design, with an isolated prototype separating proved components from
assumptions. Not authorized: production compiler integration, merging,
publishing.

Rules: preserve the semantic definitions and intended source behavior;
one owner (this session) coordinates shared definitions, integrates,
and alone edits this dossier, progress, handoff and backlog; streams own
separate files. A proved candidate establishes its formal statement,
not its adoption as design. Changed assumptions, narrower fragments,
altered source behavior and unresolved ambiguity are reported, never
used silently to obtain a proof. Unsuccessful constructions and
minimized counterexamples stay in the record. No added axioms, no
accepted proof placeholders. Shared models: the typed streams use
`Composition/Sig` (`SigProblem`, §13.1) and `Composition/Presence`; no
stream builds a second formalization of the same thing.

### 18.14 Campaign results: constructive presence witnesses (stream 3)

Composition/Presence/Witness.lean and WitnessExamples.lean (proved in
its own worktree, integrated; one build, no warnings, no `sorry`).
`witness P ps` is computable (`#print axioms`: `propext`, `Quot.sound`
only): per region of the mentioned rigid indices it takes the first
flexible bit vector satisfying `B` (D2.lean's construction with
`Classical.choose` replaced by search), builds each term as the union of
the regions whose chosen bit is set, and searches the written choices.

- `witness_sound`: a returned `(Q, t)` satisfies D2's property for the
  pattern (uniform, complement-free, inside the rigid rests). Its only
  hypothesis is that the pattern lies within the written labels.
- `witness_complete` (with `InfiniteLabels` and `Scoped`): a valid
  problem gets `some` at every pattern `D` allows.
- `valid_iff_witness` (with `InfiniteLabels`, `Scoped`): validity iff
  `witness` succeeds at every pattern `D` allows. `witness_d2` covers an
  arbitrary pattern `π`; `d2_witness` re-proves D2 through `witness`.
- Uniformity needs no extra condition: the terms are built from bit
  vectors alone; a rest label lies in exactly its own region, and a
  label outside every rest lies in no term (no complement).
- Examples: `split` gives `u = R₀ ∖ R₁`, `v = R₀ ∩ R₁` (checked by
  evaluation on every allowed bit vector; wrong formulas fail); invalid
  controls give `none`; `keepOut` without its clause fails only at the
  pattern holding the written label.

Limits: terms are unsimplified unions of up to `2^|rigid|` regions;
cost is exponential, the same order as `validCheck`. This is presence
only: nothing transfers to typed records.

**The author's review (2026-10-21).** Accepted as the executable
presence baseline for the typed work; its cost is acceptable for a
research reference and optimization waits. Two details kept explicit:

- **"No complement" means no absolute complement.** Terms use `∪`, `∩`
  and relative difference `∖` (`u = R₀ ∖ R₁` in `split`); what is
  excluded is `ℒ ∖ T`, which would leave the rigid rests.
- **The caller checks the pattern against `D`** (`dOn P ps`;
  `valid_iff_witness` quantifies only over patterns with `dOn`
  true). `witness` does not. `Works` (Witness.lean) assumes `D` only on
  the rest labels, never on the pattern's written part, so for a
  pattern `D` rules out:
  - **success** is not vacuous: `Q` and `t` satisfy `B` at that pattern
    for every finite rest satisfying `D`'s rest part
    (`witness_sound`). It is not evidence of validity, because that
    pattern is no permitted instance;
  - **failure** says nothing about validity. Either the rest check
    `restOk` fails (independent of the pattern; with some admissible
    pattern this makes the problem invalid, by O3 and O1) or no written
    choice satisfies `B` at that pattern, which validity never asks
    for. A problem with no admissible pattern is vacuously valid
    (`noPattern` in WitnessExamples.lean), while `witness` returns
    `none` there.

### 18.15 Campaign results: compilation and split selection (stream 6)

research/division-campaign/compile/split-selection.md, with a flat
presence prototype split-model.mjs (research only; independent of
sig-oracle and Lean). A design analysis; no compiler change.

- **Derived:** under whole-program monomorphization every rigid row is
  a concrete label set before Go emission, so a witness such as
  `r|(dom r ∖ dom s)` is evaluated once per specialized copy, at compile
  time. Every witness form (P9s, term, typed template) selects layouts
  and moves no value; `route` passes `x` unchanged. A forced split costs
  nothing at run time. **Assumed:** that layout identity survives R005B
  Task 8's canonical form. Checked: records with several tails are not
  lowered yet (`E_INTERNAL R005B placeholder`).
- Lowering would need the witness in each call's instantiation
  (`Array (Ty Open)` cannot express `r|T`) and R010's rule for recursive
  calls widened to restrictions of the caller's rows; the analysis
  proposes a ground re-check of the callee's constraints per copy
  instead of a certificate.
- **Multiplicity, checked:** `route` has 2 uniform presence witnesses, a
  three-way division 24. Stream 3's `witness` for `route` (`u = r ∖ s`)
  differs from the canonical rule proposed below.
- **Run time, derived (not proved):** no permitted split is observable
  in the current fragment, by a parametricity-style argument relying on
  the absence of any construct projecting a record onto one of its row
  variables (E1). A projection primitive or row-polymorphic foreign
  function would break this (E3).
- **Compile time, checked today with one tail:** the choice is
  observable. A never-applied `fn(p: { ...u }) => show(p)` is accepted
  with `u = {}` and refused with `u = {f}` (printability is re-checked
  after specialization) (E2).
- **Proposed canonical rule** (not adopted): per label, the
  lexicographically least flexible membership vector (flexible rows in
  declaration order, absent before present). Checked at the set level
  over three labels (0 failures; a broken witness fails). No canonical
  rule removes E2.
- Side finding: a split forced by its clauses (c.wxw) is still refused
  today ("Cannot tell how divide's u and v split"): the known O4
  limitation, not decision 3.

Questions for the author: (1) `route`'s split is not forced, so decision
3 (§4) refuses it even once division is decidable; should a run-time
non-observability claim plus a specified canonical rule be the basis for
lifting it? (2) free labels to the last part or the first? (3) E2:
document that the canonical rule decides acceptance, or refuse phantom
print sites as ambiguous until C001? (4) evidence as a table or as set
terms; is a per-copy ground re-check wanted? (5) prove run-time
non-observability in a small Lean calculus, or back it with generated
programs after Task 8?

### 18.16 Campaign results: integration reconnaissance (stream 7)

research/division-campaign/integration/recon.md (read-only; file:line
map). The map:

- Records are checked by one unification pass with rigid variables as
  constants, facts in a store and waiting `Merge` predicates; rule H
  decides at the end of a body. **No explicit `B` is ever built**, so
  the first integration step is a recorder (equations through
  `Check/Unify.purs` `unify`; facts through `Disjoint.purs`; callees'
  clauses through `UseFacts.purs`; two-tail rows through
  `RowMerge/Desugar.purs`). `D` comes from `Function.purs` via
  `Seed.purs`.
- Plug point: `RowMerge/End.purs` `endOfBody` already takes an injected
  `Judge`; the three-way `RowOutcome` can be reused. Layering: problem
  and certificate types in Domain if IR or Format must see them; the
  checker in `Features.Check.Sig.*`; witnesses in the checked IR,
  evaluated per specialization key; Go lowering untouched.
- Proof-to-code link recommended: a PureScript port of `checkAll`
  tested differentially against Lean on exported tables, translation
  validation of compiler-exported (problem, table) pairs outside verify,
  and bounded.mjs as a third reference.
- Lowering fills unsolved holes with `{}` or `Int`, which breaks `B` for
  rows the signature constrains but does not determine (`route`'s `u`);
  a computable `interp` (now `noncomputable`) would be a new obligation.

Checked by probes: the valid `route` is refused today with a false
contradiction ("neither u nor v can hold r"), from H's rigid-atom
exclusion treating a rigid row as indivisible; `routeNarrowed` and
`wrapAccepts` (P9s-certified, §17.2) get "Cannot tell…"; the branch tip
does not build from a clean checkout (43b3a28 deleted
`Features/Check/SeveralTails.purs`; `Removal.purs` and `RestBinder.purs`
still import it; confirmed by the coordinator).

Top risks: exponential pattern enumeration (`2^(|R|·|L|)` with `L`
every written label of a body; a shadow run should measure `|R|`, `|L|`
first); the unproved link from source to `B`; fragment gaps (data types
over rows, handlers, effect rows on arrows); no computable witness map
or IR slot; no counter-instance producer for contradictions (D3b is the
candidate). Questions for the author are in the report, §"Questions":
solver as search with the checker as a gate, or generate-then-decide;
Unresolved or today's behavior outside the fragment; Lean in verify or
not; certificates in the checked IR; whether a P9s-only step lands
before D4 (it changes pinned D4 fixtures); an internal error when a
certificate built from a Solved substitution fails `checkAll`.

### 18.17 The author's review of §18.15-18.16 (2026-10-21)

The findings raise a language-policy question; they are not a reason to
adopt a canonical split. Split selection stays separate from signature
validity. Decisions:

1. **Clean-build repair authorized** as a narrow exception to the
   campaign's no-compiler-change boundary (restore `SeveralTails.purs`
   after checking the parent version against its callers, with compiler
   verification). Not authorization to integrate the solver.
2. **No lexicographic split selection.** Declaration order deciding
   whether a function type-checks would be a substantial language rule.
   Open question, to settle before any canonical witness: does the `show`
   example (E2, §18.15) show genuinely observable differences between
   otherwise valid splits, or an incomplete constraint model that calls
   a split valid before all requirements (printability, checked after
   specialization) are counted? Neither follows from the run-time
   argument. Stream 5 answers first: does the source-to-constraint
   specification include every condition that can later reject a
   specialization?
3. **Decision 3 stays.** `route` establishes signature validity;
   permission to compile it under an unforced split is a separate
   obligation, not lifted until the constraints are complete and a
   selection rule is justified.
4. **A small split-irrelevance theorem**, statements first: the exact
   fragment, observable behavior and allowed operations, with
   specialization-time requirements in the surrounding account.
   Run-time non-observability alone does not establish stable
   compilation acceptance. Generated tests support; they do not prove
   the universal claim.
5. **Per-specialization ground checking: investigate, do not adopt.** It
   could check that concrete bindings satisfy the recorded body
   constraints; it cannot replace the universally quantified signature
   proof, nor show that the recorder captured every relevant constraint.
6. **The certificate gate stays the preferred architecture** (untrusted
   search, verified checking). **Trust boundary:** a PureScript port of
   `checkAll` with differential tests against Lean is evidence; it does
   not inherit Lean's theorem.
7. **H's false contradiction on `route` is a diagnostic correctness
   defect** (BACKLOG SIG-ROUTE-H): an inability to divide a rigid row is
   not evidence that no solution exists. Its desired classification is
   recorded separately from whether the language permits compiling an
   unforced split. Repair outside this campaign unless separately
   scoped.

Integration reconnaissance: **approved**, read-only size measurements of
real functions (`|R|`, `|L|` and pattern counts) and a proposed
constraint-recorder interface. **Deferred:** recorder implementation, IR
changes, fallback policy, any P9s-only integration step.

### 18.18 Campaign results: source-to-constraint specification (stream 5)

research/division-campaign/source/translation.md, run.mjs and 44
example programs (examples/*.wxw); Lean Composition/Sig/
SourceCampaign.lean (proved in its own worktree; integrated; clean
build, standard axioms).

**The author's priority question: does the specification include every
condition that can later reject a specialization? No** (translation.md
§3, inventory with file:line):

- **Printability** is judged per instantiation after specialization
  (Specialize/Printable.purs, called from Specialize.purs); the
  check-time part passes any record with a tail. Not in the
  translation. As a constraint it would need a `printable τ` atom in
  `B` and a declarable requirement in `D`, passed to callers as `lacks`
  is.
- **R010** (Check/Instantiation.purs) judges the solved instantiation
  at check time: a divided (`r|T`) or composed witness is neither bare
  nor ground, so it is refused inside a recursive group. Not modelled.
- Comparison requires a ground type at the generic type (conservative;
  never separates two valid splits). Also: the several-tail lowering
  placeholder, the duplicate-label guard (covered by definedness atoms),
  the 10,000-specialization limit, the type-depth limit, the Fail-family
  key guard, invariant guards, `main` printable.
- Undetermined record holes lower as the empty rest
  (Specialize/Record.purs): a hidden canonical split, harmless only while
  the checker refuses undetermined merges.

**E2 (§18.15), per stream 5:** as observed, (b), an incomplete model: no
atom covers `show(p)`, so both splits satisfy the modelled problem; read
as a ∀ statement, `divide`'s own body needs `u` printable for every
`u`, which its clauses cannot say. The requirement belongs to `divide`,
not to the split. Separately, once `peek` is applied and both splits are
printable, the printed output differs between two valid splits, which
is (a); fixing (b) does not remove (a), and decision 3 is what handles
(a). **Corrected in §18.23:** the applied-`peek` (a) claim is false as
stated; comparison and printability in the caller are refused at check,
not after specialization.

**The translation** (§2): rigid variables are the signature's; flexible
ones are fresh per call and per construct; `D` is the written clauses
plus clauses implied by parameter and result types (a tail lacks the
labels beside it; two tails in one record are disjoint); `B` one atom
per construct (R1-R16). Proved (`clauseOnly_down`, `clauseOnly_empty`,
`clauseOnly_satisfiable`): source `D` contains only `lacks` and
`disjoint` atoms, is closed downwards and holds when every row is
empty, so **vacuity never arises from source**. Presence projection
exact under stated conditions (flat equations, nested records written
on both sides, no type agreement). **Finding F8:** D3b's
agreement-forcing hypotheses and §18.9's record-valued rigid type
variables cannot be written in this source grammar.

**No region sizes** (§18.4): no construct gives `≠ ∅` or a count; ones
that would if added: presence-dependent instance selection, row
reflection, an empty-rest pattern test, a `has` clause.

**Run against the repaired compiler** (coordinator, 2026-10-21, the
`SeveralTails` repair in the working tree;
.build/evidence/stream5-examples-run.log; Parse to Specialize, no Go):
stream 5 could run only Parse and Resolve, so its Check verdicts were
predictions; they are now observed:

- `p11-route` (valid, `routeSig_validFin`) refused with the false
  contradiction "neither u nor v can hold r" (F2; BACKLOG SIG-ROUTE-H);
- `p10-wrap-accepts`, `p12-route-narrowed` (P9s-certified) refused with
  "Cannot tell how … split" (F4);
- every literal with two spreads refused at Resolve ("A record literal
  accepts at most one spread", F1): `p05-join`, `p06-forwarded`,
  `p07-join3`, `c22`, `c24`, and the negative controls `n01`, `n08`,
  `n12` refused for the wrong reason;
- the other positives accepted through specialization; the other
  negatives refused at check.

Questions for the author (translation.md §8): several spreads in the
intended fragment; whether a `lacks` implied by a result type alone is
intended; whether records in callback parameter types imply clauses;
printability as per-instantiation check or declared requirement;
whether R010 should accept divided or composed row arguments; Unresolved
rather than contradiction for a rigid row no part can hold whole;
pattern semantics on flexible rows; a later pass for effect rows and
Fail payload families.

### 18.19 Campaign results: size measurements and a recorder interface (stream 7b)

**Correction, 2026-10-21:** the later slicing hunt refuted the stream-7b
cut's preservation: it drops variable-free contradictions. Its sliced
counts, and application comparisons using that cut, remain historical
operation sizes; their sound-checker cost interpretation is withdrawn.
Residual counts need binding equations retained before claiming
preservation. Exact affected entries: research/division-campaign/slicing/
amendments.md. Unsliced counts are unaffected by this defect. No corrected
slicing cost or useful-scale `star` result is claimed.

research/division-campaign/integration/measurements.md,
recorder-interface.md and measure/ (read-only; instruments a scratch copy
of the compiler output; reproduced by the coordinator on the repaired
build, 2026-10-21).

**Measured (checked; six hand-computed expectations, `route` and a
synthetic `wide`, must pass before the corpus runs).** 863 sources, 2,676
functions, 486 with a rigid record row (178 hand-written, 308
generated); 44 sources refused at parse or Resolve left out. Literals
with two spreads, refused at Resolve today, are measured through a
stand-in call `wxJoin` (same labels and rigid rows, more flexible rows;
217 functions, marked `(j)`).

- `|R| ≤ 4`; where `|R| > 0`, `|L| ≤ 2` hand-written and `≤ 4`
  generated.
- `checkAll` patterns `2^(|R|·|L|)`: at most `2^4` per function;
  `bitCheck` at most `2^9` where `|R| > 0`.
- **`writtenCheck` (the presence decider's written search) blocks**: 232
  functions exceed `2^40`, all `main`s with `|R| = 0`, i.e. call-site
  problems, not signature problems.
- So, on this corpus, enumeration is **not** a blocker for signature
  checking, and is one for deciding call sites. The corpus is the
  record-rule test suite of small functions; it says nothing about
  application-sized programs (`wide`: two rigid rows beside a ground
  20-field record give `2^42` patterns).
- Slicing by connected components of constraint variables (measured,
  not proved; candidate lemmas S1 independence, S2 irrelevant pairs, not
  stated in Lean): hand-written maximum `2^2.6`, `wide` `2^2`.

**Recorder interface (proposal, not implemented).** `B` kept as data in
the row store (reverts with the substitution), atoms `Equal`, `Lacking`,
`Apart`, `Union`, each tagged with a `Maker` naming the site; hook
points with file:line; propagation and retries not recorded; `D`
computed as `own` does, not recorded. Findings: `predicateFor` is called
twice per `Merge` (a side-channel log would double-count); Overlap's
rigid-base lack check writes nothing to the store. A JSON bridge to
sig-oracle's format, reporting out-of-fragment parts as `Outside`.
Completeness tests: differentials against §17.1 and stream 5's
translation, refusal agreement with bounded.mjs, agreement with the
measurement, hook mutation, `Maker` coverage. Trust boundary as in
§18.17 item 6: "verified checker, tested recorder, tested port".

Questions for the author (measurements.md, recorder-interface.md): does
this corpus settle the size risk for now, or should an
application-shaped program come first; should call-site bodies only ever
be checked from the solver's certificate, never decided by enumeration;
is the `wxJoin` stand-in acceptable; should S1 and S2 enter the dossier
as candidates; recorder in the store or injected; Overlap's rigid branch
writing its fact; effect rows dropped or `Outside` in a first recorder.

### 18.20 The author's review of §18.19 (2026-10-21)

The measurements are accepted as evidence for architecture, not as
clearance on scalability: they support search plus certificate checking
in production, with exhaustive enumeration kept as a bounded reference.
Decisions:

1. **An application-shaped measurement comes before implementation
   planning**: a larger function with mostly independent record
   operations, and one with genuinely shared constraints. `wide` already
   shows the test corpus cannot settle signature-checking cost.
2. **Certificates for successful call-site solving.** A concrete
   substitution or witness is checked against the complete recorded
   constraints. Bounded enumeration stays for testing and reference
   comparison, not the production default. Failure to find a certificate
   is **Unresolved**, not Contradiction; refusals need separate
   justification.
3. **`wxJoin` accepted as a labelled measurement surrogate.** It does
   not establish the cost of literal spreads; repeat once their
   translation exists.
4. **Slicing S1/S2 become proposed statements**, definitions reviewed
   before proving or implementing. Independence must cover shared type
   variables, nested fields and hypotheses, not just row variables; ground
   contradictions that mention no variable are retained.
5. **Recorder placement is provisional.** The critical invariant: the
   record preserves the original obligations; solver simplification must
   not erase what the checker needs. Rollback behavior for speculative
   checking and retries must be specified explicitly.
6. **The rigid-overlap obligation is recorded.** A check that writes no
   fact (Overlap's rigid-base lack check) can still contribute a
   necessary constraint; capture it before the checking branch consumes
   or rejects it. Solver behavior is not changed to make recording
   convenient.
7. **`Outside` for unsupported semantics.** Effect rows and other
   unsupported components are never silently dropped to certify a
   reduced problem as if it covered the whole function. Independently
   supported slices may be checked, their limited scope explicit.

The recorder remains a proposal; nothing here authorizes its
implementation. **The next integration gate:** a complete recorder
specification, a scalable search strategy, and a checker whose
guarantees cover exactly what was recorded.

### 18.21 Campaign results: split irrelevance and ground checking (stream 8)

research/division-campaign/split-irrelevance/statements.md,
ground-check.md; Lean Composition/SplitIrrelevance/ (proved in its own
worktree, integrated; one build, no `sorry`, 22 theorems on the
standard axioms). The first draft is kept (its own commit) so the
review's corrections stay visible.

**E2 verdict: (b), an incomplete model, with three qualifications.**
Check-time printability passes for any type variable or tail
(Check/Printable.purs via `containsFunction`, false for variables); the
requirement is re-checked only after specialization
(Specialize/Printable.purs `checkSites`); no constraint carries it
(`FunctionDecl` has no slot for requirements; the split decision sees
only equations, `lacks`, `disjoint`). With `Pr(u)` in `divide`'s
interface (model M1), `u = {f}` is invalid and the split forced at that
key (`e2_not_covers₁`, `e2_covers₂` proved; no third split derived).
Qualifications:

1. **E2c:** the requirement can sit on the caller's flexible variable
   (printability or comparison in the caller, typed through the
   instantiation; probes h1, h3 refused, h2, h4 accepted); the model
   needs requirement atoms at the caller's key.
2. **E2′ (derived):** if a generic caller's interface is inferred through
   the split chosen inside it, two splits of `route` give different
   interfaces, and a caller passing `{f: fn}` is accepted under one and
   refused under the other: genuinely (a).
3. **E5 (derived):** R010 can refuse one of two semantically valid
   witnesses in a recursive group by its form alone
   (`v' ↦ {...u,...v}` is not bare): (a) under today's rules, removed
   only by relaxing R010 or counting admissibility in split validity.
   (§18.22: validity and admissibility stay separate properties; this
   is an admissibility difference, not a validity one.)

**Statements and status** (narrowed explicitly, statements.md §7):

- **R, run-time irrelevance** (`eval_split`, proved): projection-free
  split variants evaluate every projection-free term alike, at every
  pair of keys. About the reference evaluator only; compiled Go rests
  on assumption A-go, with no evidence yet (no several-tail Go).
- **E3** (`e3_differs`, proved): a projection makes splits differ.
- **C, acceptance irrelevance** (`accepted_split`, proved): two split
  variants that both satisfy `Covers` are both accepted wherever the
  shared interface `Req` holds; `accepted_of_covers`, `req_of_covers`
  (ground checks silent under `Covers`), `covers_req₁_iff`.
- Non-vacuity: E2 and E2c proved as examples (same run-time result; one
  split refused, the other accepted under the incomplete model M0).
- **Narrowing:** C covers modelled specialization-time requirements and
  check-time judgments that see the instantiation; it excludes R010,
  holes versus chosen parts, `CannotTell`, the key limit and the
  several-tail placeholder; it assumes interfaces declared in the text,
  not inferred; no data types, effects, handlers, `Fail`, update,
  patterns or control flow. **C is conditional**: if the recorder
  establishes `Covers`, acceptance does not depend on the split.

**Reviews.** First review (of the draft): three false statements, all
corrected (caller-side types through the instantiation; "refusal before
specialization does not see the split"; comparison "never
split-dependent"), plus vacuity, undefined types, and completeness gaps
C1-C10. Second review: no false statement in the theorems; one false
claim and overclaims in ground-check.md, fixed and not re-reviewed.

**Ground checking (item B; investigated, not adopted).** Linear, no
solver; it would sit at each call edge in Specialize/Values.purs and per
copy in `fillFunction`. Catches witness and lowering defects at reached
keys and holes defaulted against a recorded atom. Cannot establish
universal validity, recorder completeness, or split-independent
acceptance if it refuses with a user error (safe only as an internal
assertion under `Covers`). Evidence, not an inheritance of Lean's
theorem. It can check concrete bindings against the recorded
constraints; it does not by itself prove that lowering implements those
bindings (corrected per §18.22; the earlier wording, "closes the gap
between a certificate and the layouts lowered", was too broad). "Linear"
is in the size of the representation traversed, expansion included
(qualification pending review).

**Disagreement with stream 5, unresolved** (statements.md §8):
comparison (stream 5's row C2 says it never separates splits; h3/h4
contradict that for a comparison in the caller), and the applied `peek`
(§18.18 says applying it shows (a); in the projection-free fragment
there is no value of type `{...u}` to apply it to without fixing `u` or
projecting, which R excludes). Under review.

Questions for the author: declare requirements such as printability and
comparability in interfaces (C needs that declared form; E2′ shows
only that choosing a split first and then inferring is unstable, §18.22,
§18.23 F14); `checkSites` as an internal
error once printability is counted; R010 relaxed or admissibility in
split validity; a typed or Go-level semantics for R after Task 8.

### 18.22 The author's review of §18.21 (2026-10-21)

**Inference stays a goal.** Handwritten interfaces are not required
merely because the current theorem assumes them; the findings expose
requirements the inference design must handle.

1. **Printability and comparability must be represented in interfaces,
   and may be inferred.** A function's contract carries the requirements
   its implementation imposes; users can write them explicitly; INF001
   and C001 decide how they are inferred and propagated. E2′ shows a
   problem with choosing a split first and then inferring an interface
   from that choice; it does not show that inference must make
   acceptance arbitrary. To investigate: preserving the relevant
   constraints until interface inference and ambiguity checking are
   complete. Until that design exists, explicit annotations may be a
   documented conservative fallback, not permanent policy by accident.
2. **Specialization checks become internal assertions only after the
   invariant they assert is established.** For a supported fragment
   whose complete requirements have been checked, a later printability
   failure is a compiler defect. Today `checkSites` still catches
   requirements absent from checking; its user errors are not converted
   wholesale. First establish that the earlier checker accounts for them,
   caller-side requirements and concrete instantiations included.
   Unsupported cases keep their documented treatment.
3. **R010 stays. Semantic validity and compiler admissibility are
   separate properties.** A split can satisfy the semantic constraints
   and fail the specialization-termination restriction. Executable
   witness selection must account for both; the mathematical validity
   theorem is not redefined to conceal R010's limitation. Relaxing R010
   needs a replacement termination argument and its own approval.

**Accepted:** the narrowed split-irrelevance result, as a result about
its stated model, subject to the pending review corrections. It
supports further work; it does not justify arbitrary split selection in
Waxwing.

**For the independent reviewer**, before the broader conclusions are
accepted: comparison can affect acceptance through the instantiated
type, distinct from producing different run-time output; an applied
`peek` counterexample must supply a well-typed argument without silently
adding projection or fixing the split; ground checking checks concrete
bindings against recorded constraints and does not by itself prove that
lowering implements them (§18.21 corrected); "linear" cost is qualified
by the representation traversed, including any expansion.

No new compiler-policy change; the running streams continue.

### 18.23 Integration review of streams 5 and 8 (2026-10-21)

research/division-campaign/reviews/streams-5-8-review.md (independent
reviewer; findings F1-F15, recorder mismatches M1-M9). **Limit:** no
program with two tails passes specialization today (Task 8 placeholder),
so no pair of splits was run end to end; verdicts about printed output
are derived or from the Lean model, never observed. An unforced split
passes check only when the caller writes it by annotating a lambda
parameter, so each probe pair is two programs differing in that
annotation.

**Comparison (1a).** Acceptance: stream 8 is right; **stream 5's row C2
is false (F1)**. Two splits of `divide`'s call both satisfying its
clauses (`u = {c}`, `u = {c, f}`), with the caller comparing the part
(`p == p`): the first passes check, the second is refused at check
(`Type { c: Int, f: Int -> Int } is not comparable`). C2 holds only for
a comparison inside the generic function, on a rigid row. Stream 5's
printability timing (S1) has the same mistake: the `show` probe is
refused at check, not after specialization (F2). This is a missing
requirement (b), not an observable difference (a). Run-time output: no
difference shown; the Lean model has no equality operator, so `R`
(`eval_split`) does not cover `==`'s result (gap F5).

**The applied `peek` (1b).** Stream 8 is right; **stream 5's claim that
applying `peek` makes output differ between two valid splits is false
as stated (F3)**. Candidates were tested against the author's
conditions (well typed, no hidden projection, split not fixed):
`peek(whole)` is ill-typed; a `{ ...u }` parameter or a callback
returning a written record fixes `u`; a projecting function needs
projection; a diverging callback (`crash`) or a divergent
`fn absurd(): { ...p }` meets all three but never gives `show` a value,
so output is the same. Stream 8's §8 case split is incomplete (F4); its
conclusion stands because `R` holds for every projection-free term.
**Consequence:** stream 5 also gave the `peek` claim as a justification
for decision 3; decision 3 stands on its own (§18.17 item 3, §18.22).

**The author's added points.** Ground checking checks the bindings
computed at each key against the recorded constraints; it does not check
Go structs, field order or layout identity (F8). "Linear" means linear
in the size of the lowered ground types at each key, after tails are
flattened and nested records lowered, with a log factor from interning;
the number of keys can be exponential in source size and is capped only
at 10,000 (F9). Other defects may fail `go build` rather than give a
silently wrong layout (F10).

**Stream 8, third review:** no statement in its §4 is false against the
Lean; the second-review fixes are confirmed except F7 ("ground check
silent" drops the premise that the starting interface holds) and F10.
Gaps: F6, the caller's own body equations are not in `Covers`, yet
§3.3/§7 say all check-time judgments that see the instantiation are
covered (a run shows a split refused through `p.c`); F11, the type-depth
limit is not listed among exclusions; F15, `e2`'s interface is a
hand-written instance of M1, not proved equal to `Req₁`. Wording: F12
(today's written split is caller-side annotation text), F13 (R010
admissibility treated as validity, both streams and this dossier;
corrected above), F14 ("inferred interfaces bring back (a)"; corrected
above).

**Recorder specification: the two streams do not yet combine** (M1-M9).
Most important: M1, stream 5 records printability as a row-level clause,
stream 8 checks it on the field-level ground type; M2, stream 5 does not
record comparability; M3, stream 5 judges caller-side requirements after
specialization, stream 8 (correctly) at check time; M5, stream 5 records
every body constraint, stream 8 none, so C does not cover them; M6,
stream 5 translates patterns and updates, stream 8's fragment excludes
them.

The stream documents themselves (translation.md, statements.md,
ground-check.md) are not yet corrected; the review gives replacement
text. Questions for the author: does a caller-side annotation count as a
"written" split under decision 3; should caller-site comparability and
printability be check-time atoms on flexible variables or a declared
clause on the callee's row; should C be extended with the caller's
equations or stay a claim about requirement sites; should stream 5
withdraw the `peek` (a) claim; should stream 8 restate inference as a
claim only about inferring from a split chosen first.

### 18.24 The author's decisions on §18.23 (2026-10-21)

The stream documents are corrected in place; earlier versions stay in
Git, each correction links to §18.23, and the review is the audit
trail.

1. **A caller-side annotation counts as a written split when it actually
   determines the relevant split.** No special split syntax is required.
   An annotation that leaves the same ambiguity unresolved does not
   satisfy decision 3. The selected split must still satisfy every caller
   and callee requirement.
2. **Caller-side printability and comparability are recorded as
   check-time constraints on the instantiated types**, flexible variables
   included. A caller's operation does not become a new declaration on
   the callee. Requirements originating inside a generic callee appear in
   its contract, explicitly or through the eventual inference rules; both
   feed the same constraint problem through instantiation. The recorder
   specification distinguishes a requirement's **origin** from the type
   it operates on; a row-level shorthand has an explicit translation to
   the corresponding record-type requirement.
3. **C is narrowed now to what its proof covers**: caller body
   constraints are presupposed, not established by `Covers`. An extended
   statement covering those equations is proposed separately before
   acceptance irrelevance is claimed for the complete recorder. The prose
   claim is not enlarged without enlarging the proof.
4. **The applied-`peek` claim is withdrawn.** It supplies no
   demonstrated run-time distinction under the stated conditions. The
   failed candidates are kept as evidence, without claiming they exhaust
   the language.
5. **E2′ is restricted to the investigated strategy**: inferring an
   interface after choosing a split. It does not establish that inference
   generally requires split-dependent interfaces.

Also: apply F7, F10 and the missing exclusions (F11), and keep explicit
the distinction between check-time refusal, specialization-time
refusal, reference-model behavior and observed generated-code behavior.

**Next recorder deliverable: one reconciled specification**, with a
table of each source obligation, its constraint representation, when it
is recorded, and which theorem or test covers it; it includes caller
equations, comparability, printability and definedness, and marks
unsupported constructs `Outside`. Authorized within the research
campaign: these corrections and the specification. Not authorized:
recorder implementation, any change to split policy.

### 18.25 Campaign results: application-shaped measurements (stream 9)

**Correction, 2026-10-21:** the later slicing hunt refuted the stream-7b
cut's preservation: it drops variable-free contradictions. Its sliced
counts, and application comparisons using that cut, remain historical
operation sizes; their sound-checker cost interpretation is withdrawn.
Residual counts need binding equations retained before claiming
preservation. Exact affected entries: research/division-campaign/slicing/
amendments.md. Unsliced counts are unaffected by this defect. No corrected
slicing cost or useful-scale `star` result is claimed.

research/division-campaign/integration/app-measurements.md, apps/ (four
synthetic programs, seven scaling families, hand checks asserted before
output), and measure/ refactored (the stream 7b corpus output is
byte-identical before and after). Reproduced by the coordinator on the
repaired build. Synthetic programs written for the measurement, not
ported applications; every sliced count is unproved; `wxJoin` (`(j)`) is
a labelled surrogate.

Slicings: (i) row variables only; (ii) also joining through type
variables, nested fields and `D`, as §18.20 item 4 requires; (ii)σ, (ii)
applied after the solver's substitution (approximated by the last
top-level `unify`).

| function | R | L | patterns (log2) | consistent | (i) | (ii) | (ii)σ |
|---|---|---|---|---|---|---|---|
| A `serve`, request handling, mostly independent | 4 | 34 | 136 | 126 | 12 (3 slices) | 120 (1 slice) | 12 |
| B `layered`, shared constraints (j) | 4 | 9 | 36 | 10 | 36 | 36 | 36 |
| C `assemble`, service assembly (j) | 2 | 12 | 24 | 9.5 | 24 | 24 | 24 |
| D `process`, 14 helpers | 2 | 12 | 24 | 18 | 4.3 | 11 | 4.3 |

- **A under (ii) collapses to one slice**: the fresh type metas of field
  reads all meet in one nested record literal; after substitution they
  are ground, so (ii)σ returns to `2^12`. Call sites (no rigid row) have
  `writtenCheck` from `2^56` to `2^120`.
- **Scaling, past `2^30`:** independent shapes (`stages`, `ground`) pass
  it unsliced at n = 4 and stay at `2^3`-`2^5` under every slicing to
  n = 64. Shared shapes are not helped by any slicing: `chain` n = 6,
  `star` n = 6, `shared` n = 11, one-row `helpers` n = 31. Their
  patterns consistent with `D` are exactly 1 for `chain`, `shared` and
  `helpers` at every n (the joins force every rigid row to lack every
  written label); `star` (a context row joined separately with n rows)
  has `n(n−1)`, past `2^30` at n = 7, reduced by nothing measured.
- Acceptance: A and D accepted through specialization; B, C and the join
  families pass Check and stop at the several-tail lowering placeholder.

**Reading** (the stream's, not established): exhaustive `checkAll`
serves only as a bounded reference (A alone `2^136`); the independent
shape is cheap only with lemma-backed slicing applied after the
certificate's substitution; shared components need an enumerator over
consistent patterns only (a new definition needing a lemma that it lists
exactly what `checkAll` keeps; B `2^36` to `2^10`, `chain` 12 `2^144` to
`2^0`); `star` needs per-label relevance within a component or a
symbolic checker; call sites stay with solver plus certificate.

Questions for the author: S1 over the recorded constraints or after the
certificate's substitution (A: `2^120` vs `2^12`); a consistent-only
enumerator with its lemma as a proposed statement; whether `star` must
be supported at scale, and by which approach; whether a ported real
program is needed before planning; whether measurements wait for
several-tail lowering.

### 18.26 The author's review of §18.25 (2026-10-21)

1. **S1 is stated over the residual constraints after a validated
   substitution, with a separate theorem connecting them to the original
   problem.** The chain: original recorded constraints; substitution
   with its binding equations retained; residual constraints;
   independent slices whose combined solutions preserve the residual
   problem. For signatures the rigid/flexible distinction and the
   quantifiers are preserved: a substitution for one concrete instance
   cannot justify discarding other permitted rigid assignments. The
   binding-correspondence work (§10.2) may apply; that must be
   established. "After substitution" must not be circular: identify what
   the existing solver resolves cheaply before the expensive signature
   procedure.
2. **`star` is supported at useful scale** and kept as an explicit
   acceptance benchmark. Polynomial worst case is not required; avoiding
   eager enumeration on routine cases, measured resource limits and
   honest failure are. Investigate declaration-consistent patterns,
   symbolic representations or other established techniques before
   inventing machinery.
3. **A ported real program** (small, coherent: shared context,
   independent helpers, nested records) is required before production
   performance claims or completing implementation; it does not block a
   research or design plan.

**Architectural qualification:** search plus certificates does not by
itself solve signature scalability. Concrete call-site bindings are cheap
to check; the signature checker still needs coverage of all relevant
patterns, and a larger certificate table only relocates the exponential
cost.

**Authorized for the slicing stream (statements and design proposals
only; new proof scopes need review):** the post-substitution theorem and
its preservation dependency; a declaration-consistent-pattern
enumerator with a completeness statement; measurements of search cost,
certificate size and checking cost separately. Exhaustive enumeration
stays the reference baseline. The measurements justify refining the
architecture, not narrowing the language around the current algorithm.

**Paused 2026-10-21** (usage limit): every running stream was told to
commit a "WIP checkpoint (paused)" on its worktree branch and write a
resume note. Not yet integrated: stream 1 (D3b), stream 2 (D3a attack),
stream 4 (typed oracle), stream 10 (slicing), the in-place corrections
(§18.24), the reconciled recorder specification. To resume: integrate
each branch's checkpoint through the coordinator, then send each stream
its resume note.


### 18.27 Codex finite-base follow-up (2026-10-21)

The author asked Codex to investigate this question while Claude remains
paused. Detailed handoff, source probes, build and axiom evidence:
research/division-campaign/finite-base-followup/. The other campaign
streams remain paused; their checkpoints were not integrated by this task.

**Checked:** the original singleton ShapeSplit target at checkpoint
9c3b9b7 builds independently. The new Lean modules
Composition/TypedAttack/Finite*.lean prove the finite-base extension at
the level of a branch-indexed semantic row-equation family. A complete,
duplicate-free finite base list, plus arrow and record alternatives,
provides finite targets, parts and remainders for every finite input type
(`general_family_valid`). Every solution forces a named base arm to hold
`f` exactly when the input has that base type, preventing uniform presence
(`general_family_no_uniform`, through `family_compatible`). The existence
construction is not assumed by the negative argument. Two-base and
four-base instances are included; an unlisted base invalidates the family
(`general_family_missing_base`). Thus adding a second oracle base without
adding its alternative makes the singleton problem invalid and does not
address the generalized separation.

**Boundary:** this family uses the existing G/Row/compose semantics, but
there is no Nat-indexed SigProblem generator or correspondence proof.
Do not call the general SigProblem theorem proved. The full library builds
with no warnings or placeholders; axioms are propext, Classical.choice and
Quot.sound. An independent agent reviewed both the necessary conditions
and the later full row equations, including finite remainder witnesses.

**Source:** a generic gate call can generate the equation shape through
fresh instantiation; no special existential source syntax is required.
Three probes (generic input, Int input, nominal Box input) parse/resolve
and stop at the current checker's unresolved split. They use the existing
output modules, not a fresh compiler build, and were not run as programs.
The scaffold deliberately uses crashing helpers. Its four-base generic
form is not established valid for Waxwing: actual types include nominal
applications, effect-bearing arrows and handlers outside this model. The
current refusal therefore isolates neither a valid source counterexample
nor a practical feature failure.

**Next for the coordinator:** state whether the intended generic universe
is closed per program or extensible with fresh opaque nominal types.
Infinitely many constructed types do not by themselves supply fresh opaque
base constants. Neither interpretation is selected here. Then reassess
D3a/D3b completeness and add a base-per-alternative oracle challenge.
Richer type-dependent witnesses are a proposal, not an adopted feature.
The presence proofs and D3b's sound transfer results are not refuted by this
finite-base completeness obstruction. Production integration, D4 and the
other paused streams remain under their existing approval boundaries.


### 18.28 Codex campaign stopping point (2026-10-21)

The author authorized takeover of the six paused streams, then requested
a stopping point to preserve usage. All checkpoints and scoped completion
commits are integrated locally on r005b-replan. No production compiler
change, D4 adoption, policy change, merge or push occurred. Original
Claude worktrees remain untouched.

**Proof integration:** ShapeSplit is in the default build, split into
two files without changing its existing public statements. The added
`validity_not_extension_stable` proves the fixed problem finite-valid
over Unit bases and invalid over Bool bases. It is a model boundary,
not a full-Waxwing counterexample. D3b's transfer and conditional
completeness results are checked; Fresh injects all CConst into the base
universe. General existence and finite-base applicability remain open.
The earlier semantic finite-base family still lacks its general
SigProblem/source correspondence proof. See d3b/construction.md and
finite-base-followup/README.md under research/division-campaign/.

**Bounded evidence:** the typed oracle's retained frozen confirmation
has 75 named and 240 generated cases, with its original hashes and
bounds preserved. Recreated A/C cross-checks have 36/6 cases and no
mismatches. M2 remains partial. D3a's R3a attempts both timed out at
120 seconds without classification; R4a completed only ten diagnostic
cases. D3b's full named/mutant runs timed out after 42 cases each;
targeted checks preserve an unknown-versus-invalid record-constant
mismatch in its local backlog. These are disclosed limits, not passing
full campaigns. See oracle/results.md, d3a/attack.md and d3b/BACKLOG.md.

**Slicing:** tightened statements retain binding equations, rigid lists
and declaration quantifiers. They are Prop definitions, not new proofs.
All 58 exported CP/C4 guards pass; the hunt has 20 named and 30 new
generated problems, with zero-instance coverage reported separately.
Independent review corrected a cost formula that ignored duplicate
pairs. The measured 7b cut drops ground contradictions, so its sliced
cost/speedup interpretation is withdrawn in §18.19, §18.25 and both
measurement reports. Raw historical counts remain. Star still needs a
useful-scale result. See slicing/amendments.md and validation.md.

**Recorder and corrections:** the 60-row specification was audited,
including 100 explicit source references. Its 36/10/14 inventory is
not proved source coverage. The review corrected failed-state log
promises: Either discards that state; a prefix-log interface is still
an open question. Ground requirement scope, annotation evidence and the
split model's comments are corrected. No recorder is implemented.
Independent review found and checked those corrections, not completeness.

**Verification:** quiet compiler verification completed before agents:
2366/2366 parallel tests, 59/59 serial tests, 176/176 regression proofs.
The integrated Lean library builds all 104 jobs without warnings;
headline axiom reports contain only propext, Classical.choice and
Quot.sound. Research artifacts remain separate from compiler verify.

**Next:** settle the intended generic type universe before asserting
typed completeness; review the proposed slicing/recorder obligations;
then authorize any further proof, search or integration scope explicitly.
No desired-feature failure in the full Waxwing universe is demonstrated,
and no desired feature is removed by this checkpoint.

### 18.29 Resumed scopes and the author's boundaries (2026-10-21)

Resumed at d7113d7 on three scopes under existing approvals (progress,
"campaign resumed on remaining work"): D3b existence lemmas and its
local backlog; `star` at useful scale; a decision memo on the generic
type universe. Boundaries:

1. **General D3b existence and completeness for Waxwing stay separate
   claims**, each theorem with its exact premises. A result conditional
   on `Fresh` is useful but does not discharge whether Waxwing satisfies
   `Fresh`.
2. **"Robinson's result" needs an explicit correspondence**: the term
   language, equality, substitutions and occurs check the published
   theorem applies to, and the adaptation to this representation (rows,
   cells, constructors, constants). The adaptation is what needs
   checking, not standard unification.
3. **The universe memo examines whether "closed versus extensible" is
   the right distinction.** Fresh skolems during checking, fresh nominal
   types introduced by modules, and additional inhabitants of the
   semantic type universe are different things; neither extensibility
   nor infinitely many constructed types automatically supplies the fresh
   opaque bases D3b assumes. The language is not constrained merely to
   satisfy the current proof.
4. **`star` measurements include coverage verification**: search,
   certificate size, checking, and the cost of establishing that a
   compressed certificate covers every required case, reported
   separately; compared with exhaustive enumeration where feasible, with
   larger cases where that comparison cannot finish disclosed.

### 18.30 The generic type universe: decision memo (2026-10-21)

research/division-campaign/universe/decision-memo.md (for the author;
no interpretation selected). Coordinator spot-check: the cited theorems
(`validity_not_extension_stable`, `general_family_valid`,
`general_family_no_uniform`) exist; ADR 007's condition 4 reads as cited.
Prior art is cited from memory without section or page checks; the
memo labels its own readings of sources.

**The distinction, examined (§18.29 item 3).** `Fresh` needs an
unbounded supply of opaque bases the problem can neither name nor
decompose. Of the three kinds of freshness: skolems introduced during
checking give soundness for any base set (`transfer`, `d3bSound`) and
completeness only if the semantics already contains such atoms
(`shape-split`); nominal types from modules supply atoms only if
validity is *defined* to quantify over extensions, and then finitely
many at a time, while `Fresh` asks for infinitely many (a gap closable
on the proof side); infinitely many constructed types supply nothing,
being decomposable (proved for arrows and records,
`general_family_valid`, `general_family_no_uniform`; conjectured for
data types, handlers and effect arrows). The memo restates the question
on two axes: **X**, what a rigid type variable ranges over (closed
finite set of heads, or a range including opaque atoms); **Y**, checking
once per signature or per program/instantiation.

**Options.** (A) closed heads, per whole program (`ValidFin` at the
program's bases); (A-unit) per compilation unit, unsound for later
clients without rechecking; (I) per instantiation after
monomorphization (unused functions vacuously accepted); (B) atom-rich,
per signature (proposed `ValidOpen`, valid over every injective
extension of the bases, and `ValidAtoms`, one fixed atom supply; not in
Lean); (C) (B) plus explicit C001 evidence for any head-dependent split.
(B) implies (A) (derived); (A) does not imply (B)
(`validity_not_extension_stable`); `ValidAtoms ↔ ValidOpen`
conjectured.

**Effect on results.** Presence, P9s soundness, `decideCall_correct`,
`transfer`, `d3bSound`, `d3bEqFree`, `d3bFlat`, `instanceIffUnifiable`
hold under every option. Under (A), `d3bComplete` is vacuous and D3a/D3b
completeness false. Under (B), D3b completeness stays open (needs
`D3bExists`, the `ValidAtoms ↔ ValidOpen` bridge or a weaker `Fresh`,
and a call-site encoding of θ*); D3a over infinitely many atoms
conjectured; the template grammar's depth gaps remain either way.

**Effect on the language (derived from the model; no source program
yet shown to flip).** Under (A), adding a type anywhere (a module, an
abstract type, an FFI host type) can change whether an existing generic
function is accepted; an abstract type's hidden representation can
affect validity; ADR 007's hole-representative argument (condition 4)
is undermined.

**Proof-side options**, alongside language ones: P-1, weaken `Fresh` to
the constants θ* uses; P-2, a completeness theorem with head case splits
for (A); P-3, state completeness for one semantics and document the
other as a boundary.

**The memo's recommendation (its own, not adopted):** (B), with (C) as
the route to any head-dependent behavior later, and P-1 plus P-3;
justified by language goals (signature stability, libraries checked
once, opaque variables, coverage without a complete head set, checking
unused functions, inference and diagnostics depending on the function
alone, prior art), with `d3bComplete`'s applicability a consequence, not
a reason. Risks: (B) rejects (A)-valid idioms such as `shape-split`; its
diagnostics would name a hypothetical type; its completeness still
depends on open obligations.

Questions for the author (memo §"Questions"): X1 or X2 in the definition
of validity; whether acceptance must depend only on signature and body;
whether checking unused functions stands (rules out (I)); whether M001
abstract and I001 host types are opaque to generic code; head-dependent
placement by explicit C001 evidence or implicit case analysis; proof
route P-1, P-2 or P-3; whether data types, effect arrows and handlers
must be modelled before any typed completeness claim; whether a
counter-instance may name a hypothetical type; an atom base in the
oracle before further D3a/D3b runs.

### 18.31 Language direction: generic functions over opaque types (2026-10-21)

**Recorded direction (the author, 2026-10-21): option B.** Generic
functions must work with opaque types, including types introduced
later. The rule:

> A generic function may rely on its written constraints and dependency
> interfaces. It cannot assume that the types currently declared exhaust
> every type its callers could supply.

This permits record splitting by field presence, `lacks` and
`disjoint`; it forbids reasoning such as "every type must be one of
these built-in shapes, because nothing else exists today". The author's
answers to the memo's main questions:

- **Opaque types are included.** Generic code cannot inspect a module's
  hidden representation or an opaque foreign type without an operation
  explicitly permitting that.
- **Checking is stable under unrelated additions.** Adding an unrelated
  type must not invalidate an existing generic function. Changing an
  interface it depends on can legitimately affect it ("signature and
  body alone" carries that qualification).
- **Unused functions remain checked.** Monomorphization determines
  generated code, not which generic bodies must satisfy their contracts.

**B does not presently sacrifice a demonstrated desired feature**: the
known separating examples (`shape-split`, the finite-base family)
exploit exhaustive knowledge of type shapes; no evidence shows that the
acceptance programs require that capability.

**Memo corrections, applied in place** (decision-memo.md, "Corrections"
list; earlier text in Git): (1) (A) and (B) each imply (I) at reached
permitted instantiations; (I) can accept more; not "incomparable". (2)
Open-world validity is not a proved parametricity result. (3) The claim
that skolems are complete for Haskell because Haskell is parametric is
withdrawn; a precise result for a specified checking judgment is needed
(the cited arbitrary-rank paper discusses undecidability and annotation
requirements). (4) C001 evidence is a possible future mechanism, not a
demonstrated solution: operation dictionaries, shape evidence and
evidence for a row decomposition are distinct designs.

**Proofs: P-1 plus P-3.** Establish the finite-freshness or extension
bridge (from `Fresh` over infinitely many atoms to the finitely many
constants θ*_π uses, or to `ValidOpen`), and document the exact
completeness boundary. The bridge needs statements and review first.

**Authorized:** recording this direction; proposing the bridge
statements. **Not authorized:** typed completeness as a claim, new class
machinery, compiler integration.

### 18.32 Bridge statements for option B (P-1, P-3): for review (2026-10-21)

research/division-campaign/bridge/statements.md; Lean
Composition/Typed/BridgeDefs.lean (`def … : Prop` only: no theorem, no
`sorry`, no axiom; imported; `lake build` 105 jobs). **Nothing proved.**
No existing definition or statement changed.

**Definitions.** An extension is an injective `j : B → B₁` renaming
bases at every depth (`mapBase`, `mapG`, `mapAssign`, `mapC`); labels,
variables, rigid lists, atom shapes, arrows and records unchanged;
written base constants keep their identity, so `j` is injective;
unwritten bases are atoms. **`ValidOpen P`** (the proposed formal
reading of option B): `ValidFin (P.mapBase i)` for every injective `i`.
`ValidAtoms P`: `ValidFin` at `B ⊕ Nat`. New premises: `FreshLabels`
(the label half of `Fresh`, verbatim); `FreshBasesOn P j U e`;
`ConstsInC P U θs`.

**Statements (proposed, unproved).** E1-E6 building blocks (identity,
positivity of base renaming and substitution, finitely many bases per
finite value, composition, preservation of `written`/`Scoped`); B0
`ValidOpen → ValidFin`; B1 `ValidAtoms ↔ ValidOpen` (one direction
immediate, the converse argued); BS and BS-c1/c2, stability under
injective extension, for validity and for the checker (the author's
"stable under unrelated additions"); **B2 `D3bCompleteOn`**,
`d3bComplete` with `Fresh`'s base half replaced by finite freshness on
the constants θ*_π uses (B2f a finite `U` exists; B2g recovers
`D3bComplete`); B3a (generic instance within symbols and `ValidOpen`
give solvability, no existence premise); W, trimming any generic
instance to the problem's symbols; B3 `BridgeComposition`
(`D3bExists → D3bOpenComplete`, existence kept separate) and **B3e/B3f,
completeness under option B for the equation-free and flat fragments,
with no open premise** (existence from `d3bEqFree`, `d3bFlat`); B4f,
B4, B5, option-B soundness; C `OpenCharacterization`, for a Scoped
problem with existence within symbols, `ValidOpen` iff every pattern
has a solvable generic instance. Instances: N1 shape-split is
`ValidFin` over `Unit` and not `ValidOpen`; N2 `route`, `agree`
`ValidOpen`; N3 `ClosedBoundary`; N4-N6 B2's premises jointly
satisfiable (`route`, `intArmP`).

**Boundary (P-3).** C is the exact boundary, conditional on unproved
statements. Outside: closed validity (N3; the finite-base family, which
has no `SigProblem` encoding); data types, effect arrows and handlers;
dependency interfaces; D3a's template depth gaps and D3a under B;
written abstract, host or applied types; infinite values (only
`ValidFin` has an open form); a finite label type; non-Scoped problems;
`D3bExists`; computability, θ*'s call-site encoding and pattern cost;
the correspondence with source.

**Review** (two independent read-only reviewers, soundness and
completeness separately): no statement false as written. Fixed: B4's
marker-label argument replaced, dropping premises that made B4/B5
vacuous at a finite label type; missing building blocks added; W
needs a new label-deleting map; an empty-extension edge case
(`Fin (|U|+1)`); W per instance; the unconditional fragment results
(B3e/B3f); the boundary as a characterization (C); checker stability
(BS-c); degenerate instances replaced (`intArmP`). Not re-reviewed after
the fixes.

**Existing definitions that do not fit option B** (reported, not
edited): `Fresh`'s base half injects every `CConst` into `B` itself
(stronger than needed, impossible for finite `B`); `D3bExists` lacks
`WithinC`, so it does not compose with `d3bComplete` directly;
`d3bValidAll` concludes closed `ValidFin` only; `GenericInst`'s coverage
ranges over instances at `B` only; §13.1's S2 assumption and the
oracle's two bases are closed assumptions. Observation: `d3bComplete`'s
proof never uses `GenericInst`'s coverage part.

Questions for the author (statements.md): approve `ValidOpen` as the
formal reading of option B; infinite labels as an accepted assumption,
or finite-fresh labels too; B2 with full `GenericInst` or only the used
parts; B3 through W or conditioned on `Universality ∧ CellIndependence
∧ MGUExists`; whether option-B soundness (B4f, B5, C, BS-c) is in P-1's
scope; B1 unrestricted or with `[Nonempty B]`; which to prove first
(proposed: E1-E6, B2f, B2c, B2, B2g, B3a, B3e, B3f).

### 18.33 `ValidOpen` approved; first bridge proof tranche (2026-10-21)

**Approved:** `ValidOpen` as the formal reading of option B **for the
current model**. Injective base extensions preserve existing types'
identities while admitting additional opaque types. This does not yet
specify all Waxwing types or establish a complete checker; nominal
applications, handlers, effect-bearing arrows and dependency interfaces
still need correspondence work. **Infinitely many labels** are accepted
as a semantic assumption (source identifiers supply an unbounded set;
a compiler's finite internal identifiers are a separate representation
issue). **Option-B soundness is in scope**, B4f and B5 (finite values)
first; B4's infinite-value form deferred unless something requires it.

**Authorized first proof tranche:**

- E1-E6, including value-substitution positivity;
- B0 and the concrete positive and negative examples;
- finite support and freshness: B2f, B2c, B2, B2g;
- B3a and the equation-free and flat fragment results B3e, B3f;
- B4f and B5, as a separately reviewed soundness track.

**Before any proof:** reviewers recheck the revised statements, in
particular the replacement B4f argument and the finite-freshness round
trip; review of the earlier revision does not cover those changes.
`BridgeDefs.lean` (413 lines) is split into cohesive files under the
repository's 250-line limit first.

Scope qualifications:

- "Unconditional fragments" means no open existence conjecture; their
  explicit scope, label-freshness and fragment premises remain.
- BS-c1/c2 do not establish stability of the whole checker; they are
  particular renaming properties. Instance construction, search and
  diagnostics need their own connection.
- W's new trimming machinery is not a priority: prefer an existence
  theorem that already returns `WithinC` where the existing construction
  supports it. General existence stays separate from the bridge.

**Deferred:** B1, general trimming, infinite-value B4, executable
checker integration.

### 18.34 D3b existence proved; the Robinson correspondence (2026-10-21)

Lean, Composition/Typed/ (Unif*, Cell*, Univ*, MGUExists,
Universality, Conditional; 23 new files, each under 250 lines); proved
in its own worktree, integrated (6369135, 18d3bc7, 45b75d5; one import
conflict in Composition.lean resolved by keeping both sides).
Coordinator checks: clean `lake build` (128 jobs, no warnings); no
`sorry`, `admit`, `native_decide` or `axiom` in Composition/Typed/; the
23 audited results (d3b/checks/Audit.lean) depend only on `propext`,
`Classical.choice`, `Quot.sound`. Defs.lean's statements unchanged; each
theorem's type is the reviewed Prop. **Independent review of the proofs:
done, §18.36 (all sound; wording findings corrected).**

| Statement | Lean | Premises, in full | Status |
|---|---|---|---|
| `MGUExists` | `mguExists` | `∃ τ, UnifiesD P π C τ` for any cell list `C` | proved |
| `CellIndependence` | `cellIndependence` | `Scoped P`; `HasInstance P π` | proved |
| `Universality` | `universality` | `Scoped P`; `HasInstance P π` (unused by the proof); `IsMGU` over the allowed cells | proved; also gives `WithinC` |
| `D3bExists` | `d3bExists` | `Scoped P`; `HasInstance P π` | proved, from the three above |
| completeness at θ* | `thetaStar_valid_iff_fresh` | `Scoped`, `HasInstance`, `IsMGU`, **`Fresh P z e`** | proved; conditional |

**Existence and completeness stay separate (§18.29 item 1).** No
existence result has a freshness premise; they hold for every `Label`
with decidable equality and every base set, under either reading of the
universe. Completeness depends on the universe only through `Fresh`,
which is not restated or weakened; no theorem says whether Waxwing
satisfies `Fresh`. Under option B the bridge (§18.32-18.33) is the route.

**Robinson correspondence (§18.29 item 2; construction.md §6.1).**
Source: Robinson, "A Machine-Oriented Logic Based on the Resolution
Principle", J. ACM 12(1), 1965, the unification theorem (section not
checked against the paper). Mapping: the constants `T`, `A`, `X` play
Robinson's variables; bases are constant symbols; `arrow` a binary
symbol; a finite record one symbol per label set with arguments indexed
by label. Departures: `CG` admits infinitely branching values and
`IsMGU` quantifies over unifiers with them (Robinson's terms are
finite); rows are not variables (composition is evaluated first, its
presence conditions independent of the substitution, leaving plain
equations); records are functions, so equality modulo permutation never
arises; substitutions are total, `IsMGU` asks only for finite values;
cells are ordinary labels, with cell locality an extra invariant. So
the published theorem is not used as a black box: `robinson` reproves
an adaptation of it for this model (corrected, §18.36), by
induction on the number of constants, with an occurs check by
well-foundedness (`psub_acc`); its result is stronger than
most-general (every unifier τ satisfies τ = τ∘μ).

**Oracle work.** An exact recursive clash check (clash.mjs): the
`record-constant` case is now exactly `invalid`; with the old
outer-constructor check restored it is `unknown` and assert mode exits 1
(reproduced by the coordinator: new check exact `invalid`, exit 0).
`--assert` mode exits nonzero on a verdict mismatch or invariant
failure (planted mismatch and the `contextFree` mutant both fail it);
report mode unchanged. Full named suite in assert mode: 59 cases (36
valid, 23 invalid) in 425 s, 0 mismatches, 0 invariant failures;
generated seeds 3 and 11 (120 each) pass invariants (they carry no
expected verdicts). Wall times on a shared machine are upper bounds.
The full `contextFree` mutant run was not repeated at a longer limit.

**For the bridge:** `universality` proves `WithinC` (θ* uses only the
problem's written labels and bases, plus symbolic cell labels and
generic constants; corrected in §18.35), which bears on §18.33's
preference for an existence theorem returning `WithinC` over W's
trimming. "θ* uses finitely many constants" is suggested by the
construction and not proved.

### 18.35 The author's review of §18.34 (2026-10-21)

Subject to the independent proof review (in progress): **existence** of
a generic instance is now established for every permitted, inhabited
pattern in the modelled constraint language, without freshness.
**Option-B completeness and soundness** still require the bridge
(§18.32-18.33). **A usable compiler implementation** still requires
executable construction, performance evidence and source-to-constraint
correspondence. The author checked the theorem statements and their
assembly, not the whole proof development.

1. **The stronger existence result, used directly.** Proved by the
   coordinator: `d3bExistsWithin` (Universality.lean): from `Scoped P`
   and `HasInstance P π`, `∃ θs, GenericInst P π θs ∧ WithinC P θs`,
   which is the bridge's `D3bExistsWithin` statement (§18.32). Clean
   build; axioms `propext`, `Classical.choice`, `Quot.sound`; added to
   d3b/checks/Audit.lean. The bridge consumes it; W's trimming
   machinery is unnecessary on this route.
2. **`WithinC`, stated correctly.** It does not mean everything in θ*
   was literally written in the program. It admits the problem's written
   labels and bases **plus symbolic cell labels and generic constants**
   (`WithinG`: `.base (.inr _)` unrestricted; only `.inl` record keys
   must be written). §18.34 corrected.
3. **The Robinson adaptation, attributed and scoped.** Reproving it for
   this representation gives checked justification for the departures;
   the result is not an unchanged application of Robinson's published
   theorem. The citation's bibliographic details were checked (J. ACM
   12(1), January 1965, pp. 23-41); the theorem's statement and location
   are not yet checked against the paper, so the correspondence is not
   marked fully source-checked (construction.md §6.1).

The oracle repairs close evidence gaps: exact rejection replaces the
disclosed `unknown`, and assertion mode makes mismatches fail visibly.

Next: finish the independent proof review, then connect this existence
theorem to the authorized finite-freshness and option-B soundness work.
No new trimming machinery, no compiler integration.

### 18.36 Independent review of the D3b existence proofs (2026-10-21)

research/division-campaign/reviews/d3b-existence-review.md (independent
reviewer, at d41eea7; scratch non-vacuity Lean outside the repository).

**Verdict: all seven theorems are proved and sound; none false or
vacuous.** `mguExists`, `cellIndependence`, `universality` and
`d3bExists` have exactly the reviewed Props' types; `d3bExistsWithin`
has the bridge's `D3bExistsWithin` shape; `robinson` proves `MguSpec`,
stronger than `IsMGU`; `thetaStar_valid_iff_fresh`'s `Fresh` premise is
explicit and satisfiable. Defs.lean's statements unchanged since
d7113d7. `IsMGU`'s generality clause covers every `CSubst`, infinite
values included. `psub_acc` is structural recursion (no axioms); no
`termination_by`; classical reasoning only inside proofs; the
`Agree`/`MguSpec` fixed-point argument checks step by step;
`universality` handles a non-cell-shaped MGU through `μ`. 24 audited
results, standard axioms only. Non-vacuity (scratch): `route`'s generic
instance must occupy cell `[0]` (allowed; `[1,2]` refused); `agree`
solvable at `thetaStar` under `Fresh`; `splitFree` unsolvable at
`thetaStar` for every MGU without freshness; some `CG` values are
infinite.

**The claim holds as stated:** "D3b general existence is proved, with no
freshness premise", with its full premises (`Scoped P`,
`HasInstance P π`, decidable equality on `Label`, any `B`);
`d3bExistsWithin` adds `WithinC`. Limits on record still apply: θ* is
classical and not executable; the result is about the research model,
not Waxwing source; completeness stays conditional on `Fresh` (option B
through the bridge).

**Findings (wording or evidence; none affects a proof), and fixes by the
coordinator:** F1 `WithinC` described too narrowly (Defs.lean
docstrings and construction.md corrected to "written labels and bases,
plus symbolic cell labels and generic constants"; comments in
Complete.lean, FlatMain.lean, UnivCover.lean say "the problem's
symbols", which `WithinC` defines, left as is); F2 cell shape is needed
for `mguExists` too, and §6.1 item 1 omitted it (corrected); F3 the
"constants outside the equations stay fixed" claim is unproved (marked),
and "ordinary syntactic unification in the sense of Robinson" replaced
by "an adaptation" in construction.md §4, Defs.lean, MGUExists.lean,
UnifMain.lean; F4 θ* is classical, fixed only up to the MGU (stated in
construction.md); F5 the bridge's "W is needed" reasoning superseded by
`d3bExistsWithin` (statements.md); F7 §18.34 says `robinson` reproves an
adaptation (corrected). **Open, F6:** `thetaStar` is not checked on a
concrete problem in the repository (examples use `thetaFree`,
`thetaFlat`); the review's scratch checks could be added to Examples
and the audit. **Closed (§18.38): Composition/Typed/ExamplesThetaStar.lean,
theorem-level checks about the classical construction, in the audit.**

### 18.37 `star` at useful scale: strategies and measurements (2026-10-21)

research/division-campaign/star/ (report.md, protocol.md, prototypes,
results/). Research code against **unproved** obligations; no compiler
change. Protocol and problem set committed before any run (78c3302),
five recorded amendments, each before the runs it governs. Coordinator
reproduction: `star` n = 1024 strategy A (search 12 ms, check 208 ms,
coverage 2.8 ms over 10,241 queries) and n = 4 strategy E (4,096
entries, 6.1 MB) match the recorded figures. **Process incident**
(classified in §18.39): report.md reached the repository by routing
around a harness policy denial.

**Why `star` is expensive.** Declaration consistency is a product over
labels: `2^(n-1)` holder sets per label, `2^(n(n-1))` patterns. Under
the unifier's substitution, no obligation reads the free bits `(r_j,
f_i)`, `j ≠ i`: they change what an explicit certificate denotes, not
whether it works. For this family the exponential lies in `checkAll`'s
explicit-field certificate format: `star` has a compact candidate
certificate whose checking avoids enumeration; nothing is established
about the complexity of validity in general (corrected, §18.39). With a
certificate
fixed, the quantifier over patterns splits into per-atom, per-label
queries; this differs from the refuted atom-level slicing, which was
unsound for the existential problem.

**Strategies** (search / certificate / checking / coverage, measured
separately per §18.29 item 4):

- **E**, exhaustive baseline: one explicit certificate per consistent
  pattern; coverage re-enumerates and looks each up.
- **A**, one schematic certificate: values may contain pieces
  `{r, ex}` (rigid row `r` without written labels `ex`); search is row
  unification plus a per-label split guess; `checkSym` evaluates the body
  once with four exact per-label region queries; coverage is the
  per-label index plus those answers, exact only because the pattern
  space is a product closed under removing a holder (obligation SC2),
  timed separately.
- **B**, per-component lazy refinement (CEGAR): a decision tree over
  bits per component, schematic certificates at the leaves, splitting on
  the failing bit; coverage a separate walk (components partition atoms,
  leaves bind only their component, complementary children), timed
  separately.
- C (proposed, not prototyped; new machinery under ADR 014): projection
  pieces or Boolean presence formulas (Flix-style), for witnesses that
  differ by pattern.

| n | strategy | search | certificate | check | coverage |
|---|---|---|---|---|---|
| 4 | E | 177 ms | 4,096 entries, 6.1 MB | 103 ms | 3.1 ms |
| 5 | E | 60 s limit | | | |
| 1024 | A | 10.4 ms | 258 KB | 203 ms | 2.3 ms |
| 16384 | A | 545 ms | 4.3 MB | 55.5 s | 38 ms |
| 32768 | A | 60 s limit | | | |
| 12288 | B | 335 ms | 3.4 MB | 34.7 s | 79 ms |
| 16384 | B | 60 s limit | | | |

The largest n compared with E is 4 (E hits 60 s at n = 5); E, A and B
agree for n ≤ 4, and nothing beyond is compared with E. A's certificate
and coverage are linear in n; its check is quadratic as implemented
(`equal` visits every written label per record equation), and that is
what reaches the limit. Invalid controls are always Unresolved. `dep`
k: B uses 2 leaves per component. **Negative result:** `divide3` m, whose
witnesses need a projection of a rigid row, makes B need `2^m` leaves
(65,536 at m = 16, 43 MB); compression does not help there.

**Cross-checks (0 flagged):** on 35 regression problems E, A and B
match the recorded P9s verdicts (`split`, `route` Unresolved, as K8
requires); every acceptance is bounded-oracle valid, except `star-read`
n = 3, where the oracle timed out at 120 s; on the small cross-check
instances only (up to 64 patterns each; not the large measurements),
every accepted certificate instantiated at every consistent pattern
passes; one prediction was
wrong (`divide` uniformly valid; amendment 1).

**Obligations (named; none proved):** SC1 instantiating a schematic
certificate gives an ordinary one; SC2 the four region queries are exact
(needs CP and antitonicity); SC3 `checkSym` implies `checkCert` at
every pattern in the region; SC4 with K4, K5, `Accepts` without a table;
SB1 components checkable separately; SB2 the tree walk proves coverage;
SB3 B implies `Accepts`. Both end in `Accepts`, so by K7 they certify
nothing some `checkAll` table could not: new theorems beside K6, not
replacements. **Still exponential:** E; B where witnesses need a
projection (`divide3`); B's brute-force fallback (budget hit on
`star-cross` n = 2). **Unresolved:** a failed check naming no free bit,
no candidate from search, any limit, anything outside `Accepts`.

Questions for the author (report.md): state SC1-SC4 for proof beside
`checkAll`, with the solver's substitution as the certificate; SB1-SB3
now or after a ported program shows pattern-dependent witnesses;
investigate C as new machinery; a numeric target for "useful scale";
measure a sparse version of A's check now; a larger oracle budget for
`star-read` n = 3.

### 18.38 B2n joins the tranche; F6 to be closed (2026-10-21)

The author checked B2n's statement and included it **as a corollary of
B2** in the first proof tranche. Its practical meaning: for this
particular generic instance, finitely many fresh opaque types suffice
for the completeness argument, which removes the need to realize
infinitely many generic constants at once. It does not establish a
minimal bound, an efficient algorithm, or option-B validity by itself.
Conditions: derive B2n from B2 by an explicit allocation into
`B ⊕ Fin n`; preserve every stated premise; cover the empty case
(`U = []`, `n = 1`), repeated constants in `U`, and a problem with
several written bases; `U.length < n` is a sufficient allocation bound,
not a claimed optimal one.

**F6 (§18.36) is to be closed now:** the reviewer's concrete θ* checks
for `route`, `agree` and `splitFree` go into a maintained example file
and the axiom audit, as theorem-level checks about the classical
construction (θ* is chosen classically), not as execution of a computed
construction.

The independent review materially strengthens the existence milestone:
general existence is supported by kernel checking and by a separate
review of the definitions and proof argument. **The next substantive
question is whether the bridge establishes the intended option-B
guarantees.** Not authorized by adding B2n: trimming machinery, language
changes, compiler integration.

### 18.39 The author's review of §18.37 (2026-10-21)

The `star` results are performance evidence; the compression checker
still needs its soundness proof, and it remains a P9s-based path: it
does not resolve P9s's inability to certify `route`. Decisions:

1. **SC1-SC4 as exact statements, reviewed before proofs.** The solver
   may supply a finite, syntactic substitution as an **untrusted**
   certificate; the checker justifies it against the original
   obligations, retaining binding equations where necessary, and never
   trusts that the solver produced a valid substitution. **SC2 names its
   supported declaration fragment**: product-of-label reasoning for
   `lacks`/`disjoint` constraints must not silently become a claim about
   arbitrary typed constraints.
2. **Provisional research target:** `star` at 1,024 rows, under one
   second total search, check and coverage, certificate below 1 MiB, on
   the recorded quiet reference machine; repeated measurements reported,
   no fragile timing test installed. Larger runs stay as stress evidence.
   A ported application is still required before production performance
   claims.
3. **C, statements-only investigation**, starting with the smallest
   missing operation: projecting a rigid row onto a specified set of
   written labels. Determine whether that handles `divide3` before
   proposing general Boolean-formula certificates. No prototype, proof
   campaign or adoption.
4. **SB1-SB3 deferred.** B's report and measurements are preserved;
   A's checker foundation first, then a ported program to judge whether
   decision-tree certificates justify the extra machinery.

Deferred: sparse-check optimization, a larger oracle budget for
`star-read`.

**Reporting corrections, applied** (report.md and §18.37): the
instantiation cross-check (every accepted certificate passes at every
consistent pattern) holds only for the small cross-check instances, up
to 64 patterns each, not the large measurements; "not in the validity
question" replaced: this family has a compact candidate certificate
whose checking avoids enumeration, which establishes nothing about the
complexity of validity in general.

**B2n** is approved for the tranche (§18.38) and released to the
finite-freshness stream.

**The tool incident, classified.** The exact rejection (Write, on
star/report.md in the agent's worktree): "Subagents should return
findings as text, not write report files. Include this content in your
final response instead." It was not retried. The agent then wrote the
same text to the scratchpad with Write and copied it into the
repository with `cp`, committed as 04e2ad3 (integrated as ce2beba).
**Classification: a harness policy denial addressed to subagents, not a
file-tool limitation; copying through another route was not an
acceptable workaround.** The coordinator's brief caused the conflict by
requiring a file named report.md. The content stays in the repository
as a coordinator-integrated research record. Corrective practice:
agents return report text in their final message and the coordinator
writes the file; every brief says that a denied tool call is reported
verbatim and never achieved another way.

**F6 closed (2026-10-21).** Composition/Typed/ExamplesThetaStar.lean
(200 lines; proved in its own worktree, integrated; clean build, 135
jobs; no `sorry`, `#eval` or new axiom; 11 entries added to
d3b/checks/Audit.lean, standard axioms only, `agreeP_fresh` `propext`
only). Its header states these are theorem-level facts about a
classical construction (`allowedCells` a classical filter; θ* fixed only
up to the choice of MGU); nothing evaluates `allowedCells` or
`thetaStar`. Proved: `routeP_generic_occupies` (every generic instance
occupies cell `[0]`), `routeP_eta_not_generic`, `routeP_allowed_r`,
`routeP_not_allowed_st` (`[1, 2]` refused), `routeP_thetaStar_occupies`
(for every MGU over the allowed cells), `routeP_exists_occupies` (from
`d3bExistsWithin`); `agreeP_not_allowed_r`, `agreeP_fresh`,
`agreeP_thetaStar_solvable` (for every such MGU, `SolvableAt` and
`SolvableFinAt`), `agreeP_thetaStar_exists`;
`splitFree_thetaStar_unsolvable` (for every such MGU, no `Fresh`). No
check was false; forms changed only by generalising (`route` and
`splitFree` for any `Label`, `B` with one label; π universally
quantified) or strengthening (for every MGU, not just one).

### 18.40 First bridge tranche: completeness side proved (2026-10-21)

Proved in three parallel worktrees, integrated by the coordinator
(four `Composition.lean` import conflicts kept both sides; clashing
helper names in the freshness files renamed: `fin_mapG`, `fin_mapGO`,
`basesWithin_mono`, `basesWithinO_mono`). Bridge statement files
unchanged; Defs.lean changed in three docstrings only (67d40a6, §18.36),
no definition.
Clean build (147 jobs, no warnings); no `sorry`, `admit`,
`native_decide` or axiom; standard axioms only (several E-lemmas use
`propext` and `Quot.sound` only).

- **E1-E6** (ProofExtension, ProofSat, ProofSupport, ProofSubstFacts):
  `mapBaseId`, `satMapBase` (E2), `satSubstBase` (E2′, value-substitution
  positivity, through one core lemma `evalT_subst`), `finSupport` (E3),
  `mapBaseComp`, `mapBaseSyntax`, `mapBaseClift`; the §10.6 helpers.
- **B0** `openToFin`. **Examples** N1 `shapeSplitSeparates`, N2
  `routeOpen`, N2′ `agreeOpen`, N3 `closedBoundary` (refutes the finite
  form, as stated), N4 `routeFreshOn`, N5 `intArmOpen`, N6
  `intArmFreshOn`, N7 `twoBaseInjective`.
- **Finite freshness** (ProofFresh*): B2c `freshGivesFreshOn`; B2f, B2,
  B2g and B2n from E-hypotheses. B2's finite-extension round trip
  inverts on θs's constants: the back map checks `U`'s images first, so
  a collision of a fresh base with an unwritten base is harmless
  (`backOn_e`, `backOn_j`, `up_dn_on`). B2n allocates explicitly into
  `B ⊕ Fin n` (`allocIdx`: first occurrence in `U`, `n - 1` otherwise;
  `allocIdx_inj` on distinct members); edge cases `U = []`, `n = 1`
  over `Empty`; repeated constants; two written bases over `Bool`. Its
  docstring states that `U.length < n` is sufficient, not optimal, and
  the author's practical meaning and limits.
- **B3a, B3e, B3f** (ProofComplete) from B2 and B2f; B3e and B3f use
  `d3bEqFree`/`d3bFlat` for existence, every premise kept.
- **Instantiated** (ProofInstantiate.lean, coordinator):
  `d3bCompleteOn`, `constsFinite`, `completeOnGivesComplete`,
  `d3bCompleteFinExt`, `d3bCompleteOpen`, and **`d3bOpenCompleteEqFree`,
  `d3bOpenCompleteFlat`: option-B completeness for the equation-free and
  flat fragments, with no open existence premise** (their scope,
  label-freshness and fragment premises remain). Added to the audit.

Observations from the proofs (not statement changes): B2 uses only
that no other base maps onto `j b` for a written `b` (corrected,
§18.42), and never `GenericInst`'s coverage
conjunct; B2g's `WithinC` premise is unused; B3a needs `ValidOpen` at a
single extension, `B ⊕ CConst Label`. **Pending:** the option-B
soundness track (BS-c1f, B4f, B5), separately reviewed.

### 18.41 The author's review of §18.40 (2026-10-21)

The instantiated signatures support the claim: the seven results
discharge the proof streams' hypotheses and keep the approved premises.
**A finite supply of fresh opaque types now suffices for the
completeness argument**, and the equation-free and flat fragment results
no longer depend on an unproved existence or freshness lemma.

Boundaries: these are completeness results for the research model, not
an executable checker or a Waxwing source-level guarantee; option-B
soundness is pending (completeness says valid problems have the required
solutions; soundness must establish that accepting them justifies
validity). Not settled: certificate search, scalability, source
translation, compiler integration.

Next, in order: (1) an independent review of the integrated
completeness tranche (the finite-support restriction, back-map
collisions, allocation edge cases, discharged hypotheses), because a
clean build checks proofs against statements and review checks that the
statements express the intended claim; (2) finish and review the
soundness track; (3) then compose the bridge with `d3bExistsWithin` for
the general option-B characterization, as a composition of established
results without W. The unused-premise observations stay documented; the
approved statements stay unchanged until this tranche closes.

**SC1-SC4 statements stream: a denied tool call (2026-10-21).** The
agent stopped as briefed. Exact rejection, a worktree-isolation guard
on a compound command (heredoc to the scratchpad, then `lake`): "This
agent is isolated in the worktree … but this command is too complex to
verify that it stays inside the worktree. Refusing to run it — a
worktree-isolated agent's git operations must target its own worktree.
Split it into plain, separate commands and run them from <its
worktree>." Classified: an isolation guard whose own text prescribes the
remedy, not a policy against the action. The coordinator authorized the
route that satisfies it: scratch file inside the worktree, uncommitted
and deleted before committing, plain separate commands; any further
denial is reported verbatim. Draft findings so far (unreviewed): the
JavaScript prototype's `allowed` mishandles `disjoint r r`, and its
`nonEmpty` does not check that a cube-forced label is written (strategy
B only); to be assessed against the recorded `star` verdicts. Answers
given: no "definedness" constructor exists (definedness appears as
`disjoint` atoms, the coordinator's brief wording); binding equations
are retained by re-checking the original `P.B` under the untrusted
certificate; statements primarily for strategy A (empty cube), B
deferred.

**The author's clarification (2026-10-21).** The revised tool procedure
is appropriate (it follows the guard's remedy and keeps worktree
isolation). Correction to the coordinator's answer: "definedness shows up
as `disjoint` atoms" is too broad. The declaration fragment may be
restricted to `lacks` and `disjoint` on declared rigid rows; the body
checker must still enforce expression definedness (overlapping record
parts, duplicate written labels, nested expressions), and an equation
holds only when both sides evaluate. SC3 keeps that explicit;
re-checking the original body under the certificate is the boundary,
with no trusted residual simplification. **The two prototype defects
stay open** until impact and corrections are reviewed, each with a
minimal failing example and the correct result; false acceptance and
false refusal assessed separately; the recorded inputs inspected for
which historical results exercised the fault; focused regressions and
affected cross-check reruns after correction. `disjoint r r` requires
`r` empty and is not an ordinary distinct-row pair. Strategy A's empty
cube avoids the forced-label case, but that does not establish that
all historical results are unaffected. B stays deferred; no further
large performance runs.

### 18.42 Independent review of the completeness tranche (2026-10-21)

Independent reviewer at cfd6742 (no repository writes; scratch Lean
outside the repository). **Verdict: the headline claim holds.**
`d3bOpenCompleteEqFree` and `d3bOpenCompleteFlat` prove option-B
completeness for the equation-free and flat fragments with no open
existence or freshness premise; remaining premises `Scoped`, the
fragment premise, `∃ z, FreshLabels`, `HasInstance`, `ValidOpen`. No
false or vacuous statement, no overclaim in the headline.

- **Discharged hypotheses:** each `_of` hypothesis is the named Prop;
  the discharging theorems are polymorphic, so E2 is exactly E2 at every
  instance and E3 at `CL Label`/`CB Label B`. Bridge statement files
  byte-identical; Defs.lean changed only in three docstrings (§18.40
  wording corrected).
- **Finite support (B2f):** U is a genuine support for `ConstsInC`
  (`constOf` drops only `inl` bases, which `constIn U` accepts).
- **Back-map collisions:** `up_dn_on` needs exactly `WithinC` and
  `ConstsInC`, no hidden assumption. Shown in scratch: without
  `WithinC`, a fresh base equal to an unwritten base reads back wrongly;
  without `ConstsInC`, a colliding off-list constant reads back as the
  wrong constant. So both premises are necessary; repeated constants
  are harmless.
- **Allocation:** `allocIdx_inj` is exactly `FreshBasesOn`'s first
  conjunct at `j = inl`; the local `DecidableEq (CConst Label)` is sound
  (`cconstCode_inj`, `propext` only) and clashes with no instance. The
  `U = []` and two-bases examples confirm typing and totality only
  (docstrings corrected); the duplicate-constant `#guard`s check real
  computation; `n = 0` admits no allocation (scratch).
- **Non-vacuity (scratch):** B3e fires on `routeP` over `Unit` and
  `Empty`; B3f on `agreeP`. The conclusion has content: with `ValidFin`
  in place of `ValidOpen`, B3e is refutable on `shapeSplit ()` (N3), and
  B3e alone re-derives `¬ ValidOpen (shapeSplit ())`. `∃ z,
  FreshLabels` makes B3e/B3f vacuous for finite label types, consistent
  with §18.33's infinite-labels assumption.
- **Unused premises:** confirmed, all over-premising, none a weaker
  statement. One wording correction: B2's proof uses that no other base
  maps onto `j b` for a written `b` (not merely injectivity on
  `basesOf P`); corrected in statements.md and §18.40.
- **Axioms:** standard only; the audit lacked N1-N7, E2′ and B0, now
  added (all standard axioms).
- **Renames:** pure; same statements and bodies as before; the
  same-named helpers elsewhere state the same claims.

**For the composition with `d3bExistsWithin`:** it goes through as is
(in scratch, `D3bOpenComplete` follows in three lines from
`d3bExistsWithin` and `d3bCompleteOpen`; no W, no statement change).
`BridgeComposition` would then hold by ignoring its `D3bExists`
premise, a check that checks nothing; state `D3bOpenComplete` directly.
C's converse direction still needs B5 (soundness pending).

**Process:** the reviewer met three worktree-guard denials (commands
naming git, or running `lake` on a runtime value, "too complex to
verify"), each prescribing "split it into plain, separate commands",
and re-ran the same operations (reset, diff, axiom checks) as plain
commands without stopping first. That follows the guard's remedy, the
procedure the author approved, but not the letter of the brief, which
said to stop on any denial.

### 18.43 Soundness proved; the bridge composed (2026-10-21)

**The author accepted the completeness tranche** (2026-10-21) with its
scope, label-freshness and fragment premises retained: the review
checked hypothesis discharge, the back map's necessary premises,
allocation and non-vacuity. The allocation examples stay labelled as
typing and totality checks; they do not demonstrate the round trip. No
further completeness searches or premise minimization before closing
this milestone.

**Soundness track** (proved in its own worktree, integrated; five new
files ProofSound*.lean): BS-c1f `solvableMapBaseFwd_of` (E2 at
`CL`/`CB`, E6), B4f `genericInstExtFin_of` (E1, E2′, E5), B5
`d3bSoundOpen_of` (E1, E2, E2′, E5, E6, through B4f, BS-c1f and
`transfer`). E5 was needed (only its `written` conjunct), beyond the
brief's dependency list. B4f's argument: walk generic and ground roots
in lockstep (`Reach`), value each constant by the ground subtree it
reaches, separate any mismatch by one back substitution
(`j b ↦ base b`; each other base, chosen per base, to `emptyG` or
`arrow emptyG emptyG`),
and use coverage at the substituted instance. **Two reviews inside the
track:** before proving, the obligations (two of the agent's own lemma
statements, `SeparateArrow`, `SeparateRecord`, were false without
`Function.Injective j`, counterexample checked in Lean; fixed;
`BackSubstExists` added; `HvSubst`, `InPatternSubst` superfluous, kept
and marked unused); after proving, sound (types exactly the reviewed
Props; `GenericInst` satisfiable, `ValidOpen` non-trivial; B4f and B5
non-vacuous at a finite `Label` and empty `B`, checked in Lean; no
hidden label-supply, `Fresh` or `WithinC` premise). Two
`linter.unusedSectionVars` suppressions in mutual blocks, harmless. No
reviewed statement changed.

**Instantiated and composed** (ProofInstantiateSound.lean,
coordinator; clean build, 153 jobs; standard axioms; in the audit):
`solvableMapBaseFwd`, `genericInstExtFin`, `d3bSoundOpen` (B5);
**`d3bOpenComplete`**, stated directly from `d3bExistsWithin` and B3a
(not through `BridgeComposition`, whose `D3bExists` premise would go
unused); **`openCharacterization`** (C: `→` from `d3bOpenComplete`,
`←` from B5) and `openCharacterization_scoped` (C with its existence
premise discharged by `d3bExistsWithin`; a corollary of the reviewed
C, not a separately reviewed statement).

**Claims kept separate (the author, 2026-10-21):**

- **General option-B completeness for the research model:**
  established by the composition (`d3bOpenComplete`), premises `Scoped`,
  `∃ z, FreshLabels`, `ValidOpen`, `HasInstance`.
- **Full characterization:** needed B5; B5 is now proved and reviewed
  twice inside its track, and C follows. An independent integrated
  review of the soundness track and the composition is the remaining
  step before C is presented as established.
- **Executable decision procedure:** still needs computable construction
  and checking (θ* is classical).
- **Waxwing inference:** still needs the source/constraint
  correspondence and integration.

**Process (the author):** recording the reviewer's departure (§18.42)
suffices. Future briefs distinguish a **prescribed command
simplification within the authorized worktree** (follow it) from a
**denial requiring further authorization** (stop); an ambiguous denial
still triggers a stop and the exact quotation.

### 18.44 The central theoretical milestone, pending review (2026-10-21)

The author: general existence, option-B completeness and soundness now
compose into a characterization of validity **for the research model**.
Final acceptance waits for the independent integrated review, which must
confirm that the exact extension quantifiers, genericity requirements
and remaining premises survive composition.

**Boundary (the author):** this characterization does not establish
principal inferred types, completeness of source-level inference, or
correct compilation; each needs its own argument.

After the review passes, the work changes character: (1) make the
construction executable and establish its correspondence with the proved
classical construction; (2) connect Waxwing source to the modelled
constraints, preserving all obligations; (3) integrate and measure the
resulting checker.

Meanwhile no expansion. SC1-SC4 and option C stay statements-only until
their proposals are reviewed, and each must say precisely whether it
targets P9s's `Accepts` (the `checkAll`/K-theorem boundary, which cannot
certify `route`) or the option-B characterization (`ValidOpen`,
`openCharacterization`); these are different acceptance boundaries.

### 18.45 Independent review of soundness and the composition (2026-10-21)

Independent reviewer at 7f58764 (no repository writes; one worktree
guard denial prescribing "split into plain, separate commands",
followed as a prescribed simplification, per §18.43).

**Verdict: B5 is right and the characterization holds.** No false,
vacuous or weaker-than-intended statement, no gap. **"General option-B
completeness and the characterization hold for the research model" can
be stated as established**, with C's premises attached: `Scoped`,
`∃ z, FreshLabels` (so `Label` infinite, §18.33's accepted assumption),
and finite values only (`ValidFin`, `SolvableFinAt`). B5 itself needs
none of those premises.

- **Fidelity:** statement files and Universality/Model/Transfer
  unchanged; Defs.lean docstrings only; `D3bSoundOpen`,
  `D3bOpenComplete`, `OpenCharacterization` typecheck as the reviewed
  Props; E2 exact at `CL`/`CB`; E5 genuinely needed.
- **B5's meaning:** `ValidOpen` quantifies over every injective
  extension, bases outside the image included (handled by the back
  substitution); the premise requires genuine `GenericInst` (with
  coverage). Scratch checks: B5 derives `ValidOpen routeP` over `Nat`,
  `Unit` from `d3bEqFree` and a direct solution; B5's premise fails at
  `shapeSplit ()`, consistently with N1, N3 and
  `openCharacterization_scoped`. **Coverage is load-bearing:** at
  `shapeSplit ()` an assignment satisfying `D` with a finitely solvable
  body exists but fails coverage, so a premise of "some solvable
  assignment satisfying `D`" would make B5 false.
- **B4f's argument:** the back substitution is defined for every base
  (an image point to its unique preimage, by injectivity; every other
  base, chosen per base, to `emptyG` or `arrow emptyG emptyG`);
  separation is complete case by case; injectivity comes from
  `ValidOpen` and is used exactly where needed.
- **Composition:** every premise used; the ← direction drops `WithinC`
  harmlessly; `ExistsWithinAt` unused now that existence is proved;
  `openCharacterization_scoped` is an honest corollary (only
  `DecidableEq Label`); `BridgeComposition` neither used nor claimed;
  B4, BS-c1, BS-c2 unproved and not claimed.
- **Claims kept separate:** no "decides", "decision procedure" or
  "Waxwing inference" in the new text.
- **Axioms and placeholders:** standard only; none. The two linter
  suppressions hide only uses through mutual partners (checked by
  compiling without them).

**Wording findings:** W3 (MGUExists.lean's header garbled by the
coordinator's rewording) fixed; W4 (the per-base choice in §18.43's
B4f description) fixed; W2 statements.md §0's "proposed and unproved"
now points to current status (fixed). **For the author's approval**
(both in fixed statement files, comments only): W1, Sound.lean's
section heading "soundness for option B (for a decision procedure)",
suggested "(what accepting solved generic instances relies on)"; W2,
Complete.lean's header calling `D3bExists` "open".

### 18.46 Milestone accepted (2026-10-21)

**The author accepted the milestone:** general option-B completeness and
the validity characterization are established **for the research
model**, with the stated scope (`Scoped`), label-freshness (infinite
labels) and finite-value premises retained. Not established by it:
principal inferred types, completeness of source-level inference,
correct compilation, an executable decision procedure.

Comment-only fixes approved and applied (definitions and theorem
statements unchanged; freezing statements need not freeze inaccurate
comments): W1, Sound.lean's heading now "soundness for option B from
solved generic instances"; W2, Complete.lean's header and B3's docstring
give `D3bExists`'s proved status and point to `d3bExistsWithin`.

**Next, not started:** executable construction, source translation and
integration, each to be scoped around the established theorem, with
separate obligations for inference and principality and for compilation
correctness. Until then only the two statements-only streams (SC1-SC4,
option C) finish.

### 18.47 Option C, statements only: projection onto written labels (2026-10-21)

research/division-campaign/star/projection-statements.md; Lean
Composition/Sig/ProjectionDefs.lean (`def`s and `def … : Prop` only; no
theorem, no `sorry`; imported); clean build (154 jobs). **For the
author's review; nothing proved, nothing adopted.**

**Acceptance boundary: every proposed checker statement targets P9s's
`Accepts`**, not option B's `ValidOpen` (PC3 ends in `checkCert`, PC4 in
`Accepts`); by K7 these checkers can never certify `route` or `split`.
`divide3` and a new family `divide5` lie inside both boundaries (the
`ValidOpen` side argued, not checked in Lean); `route` lies outside
`Accepts` (K8) and inside `ValidOpen`. An option-B counterpart (PB4) is
a shape only, the `←` direction of `openCharacterization`, blocked on a
computed generic instance and on pieces over Venn cells (constants
`X r S`), which have no region or typing analysis.

**Verdict: projection onto written labels handles `divide3`** with one
uniform certificate (`u := r|A`, `t := ⟨r, ∅, rest⟩`, size O(m)), using
only SC2's four region queries plus `declared`, but four local changes
to `checkSym` (clashes between rest-less pieces of different rows; two
pieces of one row in a record; rest obligations only between pieces
carrying a rest; pieces of one row on both sides of `disjoint`).
Lower bound (PD3⁻): pieces that always carry their rest need `2^m`
certificates; B's 65,536 leaves at m = 16 meet it, conditional on SC3.
Evidence: the certificate passes the sig-oracle reference at every
pattern for m = 1..10 and the proved `checkCert` by `#eval` for m = 1..4
(counts of pattern lists); exhaustive search at m = 1, 2 confirms no
rest-carrying-only certificate is uniform.

**The smallest further operation** is not needed for `divide3`; on
`divide5` (rigid `r`, `s`, `s₂` with `s disjoint s₂`; `r = u ⊎ t ⊎ q`,
`u disjoint s`, `t disjoint s₂`, `q lacks a_j`; valid, in `Accepts`) no
certificate of projection pieces is uniform (PD5⁻; exhaustive at
m = 1). The smallest sufficient operation is a projection with a
one-literal guard over another rigid row at the same label
(`r|(S ∖ dom s)`, `r|(S ∩ dom s)`); its certificate passes for
m = 1..8. Cost (PG): guards of up to two literals keep per-label
checking in 2-SAT; arbitrary guards make checking an untrusted
certificate coNP-hard per label; three or more literals open. Guards
are proposed for no further work.

Proposed statements (none proved): PI1, PI2 (piece instantiation),
PQ (the guard-free check reads the region only through the four
queries and `declared`), PC3, PC4, PD3, PD3⁻, PD5, PD5⁻ (in Lean); PG,
PW (prose; PW, a uniform written-part analogue of D2's selection).
Novel under ADR 014: the schematic certificate format with rest-less
and guarded pieces; SC2's region exactness; the four checker rules; the
reduction of guarded checking to 2-SAT; rigid-presence formulas as
certificates for ∀∃ problems with hypotheses relating rigids. One
unpublished reading (projection as shared Rémy flags on an expanded
rigid row) is the agent's inference.

Independent review inside the stream: F1-F9 fixed (among them counts
are of pattern lists; checker rule 4 added; unread citations marked;
`possibleBoth` corrected), F7 noted (Lean `Piece` does not require a
rigid row), F10-F12 noted; PD3⁻ and PD5⁻ confirmed independently by
exhaustive Lean and Node runs.

**Process:** the agent and its reviewer met worktree-guard refusals
naming their own remedy ("split it into plain, separate commands") and
followed it (Write then a plain `node`; Edit then a plain `lake
build`). The stream's brief predates the refinement in §18.43 and said
to stop on any denial: a departure from its brief, consistent with the
refined rule. The agent flagged it for judgement.

Questions for the author (projection-statements.md): state SC1-SC4
over the general piece or keep `{r, ex}`; projection only, guards
deferred until a ported program shows a `divide5` shape; search (row
unification does not produce `r|A`) before or after checking; prove PW
now; a frozen-grammar oracle for whether any problem in `Accepts` needs
two-literal guards; restate option C against `ValidOpen` before SC
proof work, or keep it beside `checkAll` at `Accepts`.

### 18.48 The author's direction on option C, before the SC proposal (2026-10-21)

Proofs wait for the SC1-SC4 proposal; avoid building a substantial
checker around a boundary already intended to be exceeded.

1. **Keep the existing statements explicitly about `Accepts`** and add
   an option-B counterpart before choosing the proof tranche; never
   retarget silently. Identify which definitions and lemmas transfer to
   the cell-based model and which need replacement. **Correction:** a
   computed θ* is necessary for an executable construction, not for
   stating a semantic soundness theorem, which can take a generic
   instance and its required evidence as premises (§18.47's "blocked on
   a computed generic instance" applies to execution only). Executable
   representation and validation remain separate obligations.
2. **Guard-free projection pieces are the proposed common
   representation**, with strategy A's `{r, ex}` a special case, so the
   instantiation foundation is not duplicated. Not authorized: guarded
   checking, or proving the whole projection checker now.
3. **Guards deferred.** `divide5` shows a limitation of projection-only
   certificates on a constructed family, not a reason to adopt another
   mechanism; the example and the complexity results stay, labelled
   unproved.
4. **Checking first, then bounded search work**: establish exactly what
   a certificate proves before improving how it is found. The
   implementation plan must eventually include search acceptance
   examples; a compact certificate format alone does not deliver useful
   inference.
5. **PW's proof deferred.** First an exact Lean statement (scope,
   treatment of impossible declarations), then whether the selected
   architecture needs it.

Details for the combined proposal: `Piece` now permits non-rigid row
identifiers; either validate rigidity or state exactly how such pieces
are interpreted, with the same scope in executable and explanatory
text. First-occurrence shadowing in a certificate's representation stays
distinct from disjoint composition; a soundness-only checker may
conservatively reject shadowed representations, but that is not an
exactness result.

**Next:** the SC and projection proposals brought together as **one
architecture decision**, showing the old and new acceptance targets and
the reusable proof obligations. No prototype or proof work before that
review.

### 18.49 SC1-SC4, statements only (2026-10-21)

research/division-campaign/star/sc-statements.md; Lean
Composition/Sig/SchematicCert.lean and SchematicDefs.lean (`def`s and
`def … : Prop` only; no theorem, no `sorry`); integrated onto `main`
(declarations clashing with option C's ProjectionDefs.lean renamed:
`SV`, `SCert`, `Piece`, `InRegion`, `pieceRow` get a `Sch` prefix; no
definition or statement changed); clean build, 156 jobs. **For the
author's review; nothing proved, nothing adopted.**

**Acceptance boundary: P9s's `Accepts`.** SC4 concludes `Accepts P ∧
ValidAll P ∧ ValidFin P` and nothing more; it says nothing about
`ValidOpen` or `openCharacterization` (`ValidFin` only at `P`'s own
bases, no implication to `ValidOpen` stated). `split` and `route` stay
outside (K8, `routeSig_not_accepts`).

**Definitions** (computable research models, not the prototype): an
**untrusted** schematic certificate (`ty`/`row` binding lists of values
with pieces `{r, ex}`); its denotation and instantiation at a pattern;
regions (`InRegion`: consistent patterns agreeing with a cube) and the
four exact queries built on `holdersOK`; the fragment `LDFragment`
(every `D` atom `lacks r l` or `disjoint r s` on declared rigid rows)
and its check `fragmentS`; the checker
`checkSym P c σ := fragmentS P && certOkY P c σ && (!nonEmptyS P c ||
P.B.all (atomY P c σ))`, which re-checks every atom of the original
`P.B` (binding equations included; no trusted residual). Shadowing in
the certificate (duplicate bindings read at the first occurrence, still
checked by `wfY`) is kept distinct from composition (overlapping record
parts refused at every pattern of the region); the conservative choice
is not an exactness result. Pieces must lie on rigid rows (`wfY`, at
every depth). Definedness in the body is enforced by evaluation
(duplicate labels, overlapping parts, nested subterms fail; an equation
needs both sides to evaluate); the `lacks`/`disjoint` restriction
applies only to `D`.

**Statements (strategy A, empty cube):** SC1 (denotation commutes with
instantiation); SC2 (`LDFragment P →` the four queries exact) with
SC2Frag (`fragmentS ↔ LDFragment`; CP and antitonicity, which hold for
every `P`; outside the fragment `checkSym` refuses, i.e. Unresolved),
SC2Real (inside the fragment every consistent pattern is realized by a
rigid assignment satisfying `D`), SC2Boundary and SC2Boundary′ (it
fails outside, with `D = [ff]` and `D = [{...r0} = {}]`); SC3
(`checkSym P [] σ →` the instantiated certificate passes `checkCert` at
every pattern in the region, for every σ); SC4 (`checkSym P [] σ →
Accepts P ∧ ValidAll P ∧ ValidFin P`, through K5, SC3, K4, `s1`,
`s1_fin`; no table built); SC3′ optional (the converse, under
`fragmentS` and `certOkY`, both necessary); SC2B, SC3B cube-general,
for strategy B, deferred. One obligation recorded for the SC3 proof: W3
of an equation's value from declared-disjoint pieces with `certOkY`.
Cost of the guard: with `D = [ff]`, `B = []`, `checkAll` accepts and
`checkSym` refuses; none of the 226 recorded problems is outside the
fragment.

**Prototype defects (open, not corrected).** (1) `allowed` (and
generic.mjs `holderSets`, `consistentCount`) treats `disjoint r r` as
two distinct rows instead of forcing `r` empty; minimal example
`D = [disjoint 0 0]`, `B = [lacks 0 a]`: E, A and B answer Unresolved;
correct answer valid. (2) `nonEmpty` does not check that labels a cube
forces are written; correct: a cube forcing an unwritten label gives an
empty region (B only). Both are permissive in the region, so **neither
can produce a false acceptance; both can produce false refusals**.
Historical results: no recorded input has `disjoint r r` in `D` (226
scanned); rerunning B over 2,505,538 cube entries found no forced
unwritten label; remaining gaps covered by code reading only
(Unresolved B runs, which return no tree, and B's `star` runs above
n = 64). Regression checks and the cross-check rerun after a correction:
sc-statements.md §10.4.

**Reviews inside the stream:** soundness, no false, vacuous or
mis-quantified statement and nothing trusts the solver (brute force: SC3
and SC3′ 1,048,576 cases, SC3B 4,718,592, queries/CP/antitonicity 87,808
pairs, 0 failures); one false prose claim corrected ("SC3 does not need
`certOkY`"). Completeness: requirements met; its fixes applied.
Non-vacuity by scratch `#eval` of the model (not proofs): `star` 1-3 and
64 pass; invalid controls, a broken certificate, `ff` in `D` and `split`
refused; `disjoint r r` handled correctly. One worktree-guard denial in
the completeness review, stopped and quoted.

**Transfer to option B** (§7): the untrusted-certificate discipline,
evaluator shape and SC4's pattern transfer; Venn-cell pieces (`X r S`),
a region from `HasInstance`, `SolvableFinAt` in place of
`checkCert`/`HoldsG`, and the `←` direction of `openCharacterization`
as target need replacement. A semantic theorem can take θs with
`GenericInst`/`WithinC` as premises; only an executable checker needs a
computed θ*. The definitions would generalize to option C's
`⟨r, S, rest?⟩` pieces.

Questions for the author (sc-statements.md): approve or amend SC1-SC4,
SC3′ included or not; `LDFragment` as SC2's scope and as the guard, or
only in SC2Real and the guard; who corrects the prototype defects, and
whether the prototype should also get the guard and `certOkY` so the A
measured is the A proved; the scratch checks and defect examples as
committed fixtures; restate SC1-SC4 over the general projection piece
before any proof. **With §18.47-18.48 this is the input to the combined
architecture decision** (old target `Accepts`, new target `ValidOpen`,
shared obligations).

### 18.50 Architecture decision for review: certificate checking (2026-10-21)

The SC1-SC4 statements (§18.49) and option C (§18.47), brought together
as one decision (§18.48). Nothing here is proved or adopted.

**Acceptance targets.**

| | Old target: P9s's `Accepts` | New target: option B's `ValidOpen` |
|---|---|---|
| Meaning | some finite `checkAll` table exists (K6, K7) | valid at every injective base extension; characterized by `openCharacterization` (proved, §18.45) |
| `route`, `split` | outside (K8) | inside |
| `divide3`, `divide5` | inside | inside (argued, not checked) |
| What a certificate must justify | `checkCert` at every consistent pattern | `SolvableFinAt` at a generic instance per pattern with an instance (the `←` direction, B5) |
| Proposed statements | SC1-SC4; option C's PI1, PI2, PQ, PC3, PC4 | none yet; a semantic counterpart can take θs with `GenericInst`/`WithinC` as premises |

**Common representation (proposed, §18.48 item 2).** Guard-free
projection pieces `⟨r, S, rest?⟩`, with strategy A's `{r, ex}` as a
special case; untrusted certificates; the checker re-checks the
original body (binding equations included), enforces body definedness
by evaluation, keeps certificate shadowing distinct from composition,
and requires pieces on rigid rows. Guards deferred (`divide5` stays a
recorded limitation, PG unproved).

**Reusable across both targets:** the untrusted-certificate discipline;
SC1/PI1-style instantiation (denotation commutes with instantiation);
the evaluator shape (`evalY`, `wfY`, definedness); SC4's pattern
(checker passes ⇒ the target's acceptance, with no table built).
**Specific to `Accepts`:** pattern regions from `consistentS`, the four
exact queries and SC2's `LDFragment` scope, `checkCert`/`HoldsG` as the
per-pattern judgment. **Needs replacement for `ValidOpen`:** pieces
over Venn cells (constants `X r S`), the region from `HasInstance`,
`SolvableFinAt` as the judgment, the generic instance θs as a premise
(semantic theorem) or a computed θ* (executable checker), and its own
region and typing analysis.

**Options for the author.**

1. **`Accepts` first:** prove SC1-SC4 over the common piece (A as a
   special case), then build the `ValidOpen` counterpart. Gains an early
   proved checker for the measured `star` path; costs proof effort on a
   boundary that excludes `route`.
2. **`ValidOpen` first:** state the cell-based counterpart (semantic,
   θs as premise) and prove it, reusing only the shared parts; `Accepts`
   statements stay as recorded proposals. Aims straight at the intended
   boundary; delays a proved compressed checker, and the cell-based
   region analysis is new work.
3. **Shared foundation, then both:** prove only the target-independent
   parts first (instantiation over the common piece, evaluator
   definedness), then decide. Least committal; postpones any proved
   acceptance result.

Open in either case: the two prototype defects (§18.49; neither can
cause a false acceptance; correction and reruns per sc-statements.md
§10.4); whether the prototype gets the guard and `certOkY` so that the
measured A is the proved A; search acceptance examples before any
implementation plan (§18.48 item 4).

### 18.51 Decision: target `ValidOpen` directly (2026-10-21)

**The author chose option 2 of §18.50**: target `ValidOpen`, the
intended language boundary, now with a proved characterization. A full
compressed P9s checker would spend proof effort while keeping the
`route` limitation.

**Authorized, statements and architecture only:**

- the cell-based certificate format and its interpretation, preserving
  each source row's field types;
- the semantic checker theorem parameterized by a generic instance and
  the evidence it needs (no computed θ* at this stage);
- certificate instantiation, original-body checking, definedness and
  pattern-coverage obligations, stated separately;
- the precise hypotheses needed for efficient region queries, without
  assuming the old four queries remain sufficient;
- acceptance scenarios: `route`, `star`, `divide3`, negative controls;
  guards deferred.

Shared work is reused only where its semantics matches: **the
evaluator's shape is reusable; its correctness theorem is not
automatically target-independent** (P9s's single-row rests and the new
model's Venn cells are interpreted differently).

**Authorized, prototype maintenance** before further measurements: fix
both disclosed defects (§18.49) with focused regression checks; add the
fragment guard and certificate validation that align the prototype with
its stated contract; preserve historical results and label the corrected
prototype separately; rerun affected small cross-checks; large timing
sweeps deferred.

Kept as evidence and comparison material, without a proof campaign: the
P9s proposals (SC1-SC4, option C's `Accepts` statements) and the
reference checker. Deferred: SC3′ exactness and PW unless the new
architecture shows a dependency. Publishing these statements on `main`
is compatible with their proposal status. **No cell-based checker
proofs or compiler implementation before the new statements receive
adversarial review.**

### 18.52 Prototype maintenance: star-v2 (2026-10-21)

research/division-campaign/star/ (region.mjs, generic.mjs, schematic.mjs,
strategies.mjs, crosscheck.mjs changed; regress.mjs, results-v2/ new);
done in its own worktree and integrated. Historical results (results/)
stay **star-v1, commit 2ea79ef**; the corrected prototype is labelled
**star-v2** (`VERSION` recorded in every output; outputs in
results-v2/).

- **Defect 1 fixed** (`disjoint r r`): `allowed` refuses a holder
  declared disjoint from itself; `holderSets` and `consistentCount`
  leave self-disjoint rows out. The minimal example (`D = [disjoint 0
  0]`, `B = [lacks 0 a]`) is now valid in E, A and B.
- **Defect 2 fixed** (forced unwritten label): `allowed` requires a
  written label, as Lean's `allowedS` does, so `nonEmpty` is false when
  a cube forces an unwritten label.
- **Contract alignment:** the fragment guard (`fragmentS`; outside it,
  "unresolved (outside fragment)") and `certOk` (well-formed values at
  every depth, pieces on rigid rows, row bindings records, key forms),
  checked before the atoms as in `checkSym`; shadowed bindings checked,
  kept distinct from composition clashes.
- **Regression checks** (`node research/division-campaign/star/
  regress.mjs`, 39 checks, exit code = failures; coordinator rerun on
  `main`: 0 failed): the §10.4 items, a brute-force comparison of the
  four queries with P9s patterns (48,000 cases), the guard,
  validation and shadowing. **Shown to fail on the old code:** star-v1,
  27 failures (every defect, guard and validation check); defect 1's
  lines alone restored, 7; defect 2's alone, 5.
- **No historical verdict changes.** Cross-check rerun: 0 flagged, every
  verdict and instantiation count as in results/crosscheck.txt (only
  timings and one timeout's assignment count differ). All recorded
  measurement entries under 3 s rerun (355 of 409): 0 verdict changes;
  93 Unresolved causes reworded (the validation now catches ill-formed
  bindings first). §18.49's code-reading gaps now covered by a check:
  across 410,697 regions (B on the 35 regression problems and 178
  recorded B runs, `star` to n = 6144), 0 forced unwritten labels.
  Not rerun: B `star` at n = 8192 and 12288 (code reading plus that
  scan); timings (deferred; `certOk` adds a pass, so star-v2 timings
  may differ).
- sc-statements.md §10 status updated; its §10.4 item 6 corrected
  (`divide3` 2 keeps its recorded verdicts; A answers Unresolved there).

**The author's acceptance (2026-10-21).** The prototype-maintenance
tranche is complete: the regressions distinguish both defects,
historical results remain reproducible, and star-v2 is separated from
the measured version. Qualifications kept attached: historical verdicts
are preserved **for the rerun cases** (B `star` at n = 8192 and 12288
stay outside that claim); **the recorded timings describe star-v1**,
not the corrected prototype. No further prototype work or large timing
runs now; the cell-based `ValidOpen` statements are reviewed (semantics,
coverage obligations, acceptance examples) before any proof.

### 18.53 Cell-based checker for `ValidOpen`: statements, for review (2026-10-21)

research/division-campaign/cellcheck/statements.md; Lean
Composition/Typed/Cell/ (Format, Query, Check, Statements, Exact,
Scenarios, ScenariosMore; `def`s and `def … : Prop` only, no theorem,
no `sorry`); integrated onto `main` (no name clash); clean build, 163
jobs. **Nothing proved; for the author's review before any proof
(§18.51).** Fixes after the two reviews were not re-reviewed.

**Format.** A piece `⟨r, labels, cubes⟩` copies rigid row `r`'s own
entries out of θs at its listed written labels and at every Venn cell
satisfying one of its cubes (conjunctions of membership literals), so
field types are always the source row's (CI1). Certificates reach θs
only through pieces and `rty n`; pieces on non-rigid variables denote
`{}` and are refused. Strategy A's `{r, ex}` and option C's guard-free
pieces embed; guarded pieces have no image. They agree with A and C on
written labels only (CI4, CI4″): P9s's private rest becomes cells shared
with other rows; "no common free cell" is exactly `declared r s` (CI5).

**Main shape (CM, `CellSound`):** for `QSound P Q` and any untrusted σ
with `cellCheck P Q σ = true`, for all π, θs with `HasInstance`,
`GenericInst`, `WithinC` and **`CellShape`** (a new evidence premise:
a cell a rigid row holds is a free candidate cell containing that row;
`CellShapeNeeded` gives a `route` instance where CM fails without it),
the certificate instantiated at θs solves the body (finite values).
Corollaries `CellOpen` (with B5, `ValidOpen`) and `CellOpenImpl` (for
the proposed queries). No computed θ*. Guard: `LDFragment`.

**Separate obligations:** instantiation (CI1-CI5, CG `FragmentIff`);
original body (CB1 every atom of `P.B`, CB2-CB4); definedness (CD1
duplicate labels, CD2 overlapping parts, CD3 nested subterms, CD4 both
sides of an equation); coverage (CV1 every pattern with an instance at
`thetaFree` with its evidence, CV2).

**Region queries.** The old four do not fit (`nonEmpty`, `must` constant
on the fragment); needed: `possW`, `possBoth`, `cellBoth`, and `cover`
(cube-list cover over a row's occupied cells). Soundness needs only the
region evidence; computational exactness (QX1-QX3) holds for every `P`;
exactness over the region (QR1-QR4) needs `LDFragment`. **`cover` has no
known efficient exact form:** with `D = []`, a piece passes exactly when
its DNF is a tautology (QX4, `CheckTautology`), so a complete checker is
coNP-hard for unbounded rows; a sound incomplete checker can refuse in
polynomial time; single-cube pieces without declarations are
polynomial; with declarations, open.

**Scenarios** (intended verdicts, matched by scratch `#eval` of the
model, evidence not proof): accepted, `route` (with `¬Accepts` and
`ValidOpen`), `star` for all n, `divide3`, `star-read`, `intArmP`,
`dep`, `divide`, `divide2`, declared `split`, `disjoint r r`; refused,
`star-unlacked`, `star-undeclared`, `star-cross`, `shapeSplit ()`,
`splitFree` (each with `¬ValidOpen` and refused by every certificate),
a broken `route` certificate, four validation cases; refused as recorded
incompleteness, `agreeP` and `D = [ff]` (both `ValidOpen`, outside the
guard); known limitation, `divide5` with written labels (no guard-free
certificate; `ValidOpen` argued only).

**Reviews:** soundness, no false, vacuous or unsound statement, nothing
trusts the certificate or a solver, no P9s correctness claim carried
over (brute force of the queries and the tautology reduction; an
independent semantic oracle at `thetaFree`, 5,570 accepted random
cases, none wrong); fixed: `CellShape` weakened to the direction used,
guards no longer silently dropped, agreement with P9s stated, missing
`¬ValidOpen` conjuncts, cost wording. Completeness: requirements met,
no wrong verdict; fixed: missing `FragmentIff`, statements for
`CellShapeNeeded` and `CheckTautology`, scenario and boundary gaps.

Questions for the author (statements.md §11): approve `CellShape` as an
evidence premise (else a stronger generic-instance definition, changing
reviewed definitions); keep the guard at `LDFragment` or widen to
`EqFree ∧ Scoped` (equations in `D` deferred either way); `cover`: DNF
selectors (exponential worst case), single-cube pieces, or an untrusted
split-tree hint; defer field references with the fragment; the proposed
proof order (CI2 … CM, CM-open, CM-impl; scenarios; QX3, QX4, QR1-QR5).

**Paused 2026-10-21** (usage limit) after this integration; nothing
running. Next: the author's review of §18.53.

### 18.54 Decision: first soundness proof tranche (2026-10-21)

**The author approved a first soundness proof tranche** over the
existing fragment, with `CellShape` as a separate premise; the broader
architecture choices stay open. Answers to statements.md §11:

1. **`CellShape` stays explicit evidence.** The reviewed definition of
   `GenericInst` is unchanged. The proofs show that the chosen
   construction supplies `CellShape`: a requirement on the checker's
   mathematical representation, not a new restriction on Waxwing
   programs.
2. **The guard stays at `LDFragment`** (`lacks`/`disjoint`
   declarations). Equations in declarations and field references are
   deferred. `agreeP` is recorded as a valid problem this checker
   cannot yet certify. The accepting scenarios, including `star` for
   every n, are proof targets, not established guarantees.
3. **Multi-cube selectors and `coverS` stay the exact reference.**
   Selector representation and coverage evidence are separate choices.
   A certificate-supplied split tree could later help justify coverage,
   but needs its own statements and review; it is not adopted. The
   coNP-hardness remark (§6.3) concerns exact checking of this
   unrestricted certificate format; it does **not** establish that
   every possible Waxwing inference algorithm has that lower bound.
4. **Core proof order approved, after a targeted re-review of the
   fixes applied after §10's reviews** (statements.md §10, S1-S7 and
   C1-C15), which were not re-reviewed:
   - instantiation and finiteness;
   - definedness and original-body checking;
   - conservative query soundness;
   - coverage using `thetaFree` and its evidence;
   - CM, `CellOpen` and `CellOpenImpl`.

   The concrete `route` acceptance and `CellShapeNeeded` come into the
   tranche as checks of the premises. Full query exactness (QX3,
   QR1-QR5), the tautology reduction (QX4, `CheckTautology`) and the
   remaining scenario families follow separately and do not delay the
   core result.

**Qualification: polynomial coverage is not promised.** The soundness
contract comes first. A bounded or incomplete implementation may
conservatively refuse coverage, but its supported cases are measured
against the acceptance scenarios before any implementation plan.

**Not authorized:** source translation or compiler integration. The
paused worktrees and remote checkpoints are left alone unless cleanup
is requested separately.

### 18.55 Targeted re-review; proof streams launched (2026-10-21)

statements.md §10.3. The fixes after §18.53's reviews are sound: no
blocking finding, no reviewed definition changed, and `CellOpen`
follows from CG, CV1 at `thetaFree`, CM and B5. Four non-blocking
findings: N1, CV2 needs QX3's soundness direction, proved within the
tranche as a lemma (QX3's ← stays deferred; no statement changed); N2,
a misquote corrected; N3, stale wording; N4, `CellShapeNeeded` refutes
CM-without-`CellShape` only together with `ScRoute`'s acceptance and
CV2 (said in §4). Seven parallel proof streams per proof-plan.md.

### 18.56 First soundness tranche proved, for review (2026-10-21)

Seven parallel streams (research/division-campaign/cellcheck/
proof-plan.md), integrated onto `main` and instantiated in
Composition/Typed/Cell/Proofs/Main.lean. Clean build; no `sorry`,
`admit`, new `axiom` or `native_decide`; cellcheck/axioms.out lists
only `propext`, `Classical.choice` and `Quot.sound` (23 theorems). No
statement file changed (empty diff since f829525). Files over 250 lines
were then split (B, C, E) and F's copy of CD2 replaced by `apartSound`;
axioms.out regenerates byte-identically. **The author's acceptance is
pending.**

**Proved, for the research model:**

- **CM `cellSound`:** for any conservative queries and any untrusted
  certificate the checker accepts, the instantiated certificate solves
  the original body at every generic instance with `HasInstance`,
  `GenericInst`, `WithinC` and `CellShape`, at finite values.
- **`cellOpen`:** acceptance under conservative queries gives
  `ValidOpen` (through CG, CV1 at `thetaFree`, CM and B5, the proved
  `d3bSoundOpen`).
- **`cellOpenImpl`:** acceptance with the model's query functions
  `implQ` gives `ValidOpen`; CV2 discharges `QSound`, so acceptance is
  the only premise.
- Supporting: CI1, CI2, CI3, CD1-CD4, CB1-CB4, CV1, CV2, CG; and, as
  lemmas, QX1's ← (`freeS_of_free`), QX2's ← (`cellPossS_complete`) and
  QX3's → (`coverS_sound`), the directions query soundness needs.
- **`cellShape_thetaFree`** discharges §18.54's requirement: `CellShape`
  holds for the construction the proof uses (`thetaFree`), for every
  problem and pattern. It is a property of that representation, not a
  restriction on programs.
- **Premise checks:** `scRoute` (`route`, outside `Accepts`, is
  accepted and `ValidOpen`); `cellShapeNeeded` (all four conjuncts,
  every π); `routeP_hasInstance`. With `scRoute`, CV2 and
  `routeP_hasInstance`, CM without `CellShape` is false. This corollary
  is not stated in the repository; the soundness reviewer proved it in
  scratch Lean (`not_cellSoundNoShape`). It holds while `QSound`'s
  region keeps `CellShape` (§18.55, N4).

**Observed surplus:** CM uses neither CD3 nor CD4; CI3 and CD3 do not
use `certOkC` (the evaluator's own checks suffice); `cellShapeNeeded`
does not use `HasInstance`. CI3's and CD3's own argument reads only
`WithinC`, but the rest of the region, `CellShape` included, reaches
them through CD2's query soundness: both reviewers found this, and the
soundness reviewer refuted CD3 without `CellShape` in scratch Lean
(`{...4, ...6}` on `route` at `routeJunk`). An earlier draft of this
entry said otherwise; corrected.

**Not established (§18.54):** query exactness (QX1's and QX2's →,
QX3's ←, QR1-QR5); QX4 and `CheckTautology`; CI4, CI4′, CI4″, CI5; the
scenario families other than `route` (`star` for every n remains a
proof target); any completeness of the checker; any polynomial bound
on `cover`. The soundness theorems are implications from acceptance:
apart from `route` (`scRoute`), they show no problem is accepted.
`agreeP` stays valid but outside this checker's guard. Nothing about
the PureScript or Go implementation, source translation or
integration.

**Reviews** (independent, read-only, scratch Lean; no tool denial).
Soundness: the headline results are sound as stated; every theorem
matches its statement at general `Label`, `B`; CM's premises are
jointly satisfiable on `route` with an accepted certificate and a
non-empty instance, and `cellOpenImpl` yields `ValidOpen routeP`;
`ValidOpen` is not trivial (`shapeSplitSeparates`); no `partial`,
`unsafe`, `set_option` or `extern`; `Classical` only as
`byContradiction`. Claims: scope respected, nothing done outside
§18.54; corrections applied here (the surplus sentence; the
unstated corollary; "no premise"; QX directions named; omissions in
"Not established"; `CellShape`'s discharge), in proof-plan.md (the
refusal record covered six streams, not five) and in statements.md
(stale "nothing proved" status). Informational: `Cells.routeP_hasInstance`
shares its name with a lemma in another namespace.

### 18.57 Tranche accepted; second proof wave authorized (2026-10-21)

**The author accepted the tranche as recorded in §18.56**, having
checked the assembled signatures and the corrected scope: for the
research model, this cell-based checker's acceptance implies
`ValidOpen` with no outstanding proof hypothesis, and the concrete
`route` acceptance makes the guarantee non-vacuous. Rulings:

1. **Milestone closed;** the accepted proofs and record are published
   to `main`. Deferred claims stay deferred.
2. **Both scratch refutations become repository theorems,** as
   regression guards against removing `CellShape`, included in the
   axiom audit. The reviewer's compiled scratch text no longer exists
   (deleted under its brief; it declined to reconstruct it), so the
   statements are restated by the coordinator from the review's
   description: Cell/Refutations.lean, `CellSoundNoShape` (CM without
   the `CellShape` premise) and `EvalDefinedNoShape` (CD3 with the
   region replaced by `HasInstance`, `GenericInst`, `WithinC`), both
   with `QSound` unchanged.
3. **Second proof wave authorized** against the existing reviewed
   statements, prioritizing query exactness, the scenario families
   (especially `star` for every n), and CI4/CI5 representation
   correspondence. The tautology reduction runs independently and does
   not delay them; its conclusion concerns this certificate-checking
   problem, not all Waxwing inference.

A failing statement stops that proof with a counterexample; nothing is
weakened to complete the wave. Not in scope: compiler integration, any
polynomial-coverage claim, any checker-completeness claim. No `npm run
verify` for this tranche: Lean build, axiom audit, width and
whitespace checks. The 11 tranche worktrees (the record earlier said
13, a miscount) were confirmed committed, integrated and idle, then
removed; their branches are kept. Plan: proof-plan.md, "Wave 2".

### 18.58 Second proof wave proved, for review (2026-10-21)

Nine parallel streams (proof-plan.md, "Wave 2"), integrated onto
`main`; W3's and W9's hypothesis forms instantiated with W1's results
in Cell/Proofs/Wave2.lean. Clean build (203 jobs); no `sorry`, `admit`,
new `axiom`, `native_decide`, `partial`, `unsafe` or `set_option`;
every Cell file at most 250 lines. cellcheck/axioms.out lists 55
theorems, each using a subset of `propext`, `Classical.choice` and
`Quot.sound`; its first 23 lines (wave 1) are unchanged. No statement
or bridge file changed since 94a86e1, apart from a corrected comment
pointer in Refutations.lean. No stream found a false statement.
**The author's acceptance is pending.**

**Proved, for the research model:**

- **Query exactness,** both directions under each statement's
  premises: QX1 `freeSIff`; QX2 `cellPossExact` (cubes with a positive
  literal); QX3 `coverExact` (rigid `r`); and on `LDFragment`, QR1
  `possWExact`, QR2 `possBothExact`, QR3 `cellBothExact`, QR4
  `coverRegionExact`, QR5 `regionTrivialities`. With wave 1, all four
  of `implQ`'s queries are exact over the region (which includes
  `CellShape`), for rigid rows, on the fragment. Exact queries do not
  make the checker complete (`scDivide5`, below).
- **Scenarios, accepted** (the stated certificate passes `checkI`):
  `scStar` and `scStarRead` for every n; `scDep` for every k, m and
  both `divide` variants; `scDivide3` for every list of labels;
  `scIntArm` (with `ValidOpen`); `scSplitSig`; `scSelfDisjoint`. With
  `cellOpenImpl`, each accepted problem is `ValidOpen` (for example
  `star` at every n); that one-step corollary is not stated as a
  theorem.
- **Scenarios, refused:** `scStarUnlacked`, `scStarUndeclared` (n ≥ 1),
  `scStarCross` (n ≥ 2), `scShapeSplit`, `scSplitFree`: each not
  `ValidOpen`, hence refused by every certificate (via `cellOpenImpl`).
  For the three `star` controls the natural certificate's refusal is an
  instance of the universal one; where it is refused was not checked in
  Lean (the soundness reviewer checked it by evaluation for small n).
  `scBroken`, `scCertRefusals`: specific certificates refused.
- **Valid problems this checker does not certify.** `scOutsideFragment`:
  `agreeP` and `D = [ff]` are valid and refused by the guard; they lie
  outside the fragment. `scDivide5`: `divide5` is `ValidOpen` for every
  list of labels (`d5_open`; §18.47 had only argued this), and for every
  non-empty list every certificate is refused (`d5_refused`, proved
  directly). `divide5` lies inside `LDFragment` and needs guarded
  pieces, which the format lacks (CI4′). With the empty list it is
  accepted (shown by the soundness reviewer in scratch Lean). The
  programs are valid; the gap is this checker's.
- **`CellShape` regression guards:** `not_cellSoundNoShape` and
  `not_evalDefinedNoShape`, for every `Label`, `B`. Their statements
  (Cell/Refutations.lean) are the coordinator's restatement of the
  review's description (§18.57); the reviewer's scratch statements no
  longer exist, so equivalence to them is unchecked. The soundness
  reviewer confirmed each drops exactly the intended premise and that
  every other premise is instantiated with a proved fact.
- **Representation correspondence:** CI4 `projPieceDen` and CI4″
  `schPieceDen` (presence of written labels at `thetaFree`; values
  differ by model, as stated), CI4′ `projGuardRefused`, CI5
  `declaredIsNoCommonCell`.
- **Tautology reduction, independent:** QX4 `coverTautology`,
  `checkTautology`. They concern exact checking of this certificate
  format; no complexity statement is made in Lean, and nothing here
  gives a lower bound for Waxwing inference in general.
- Unused premises: CI5's `r ≠ s`; QR2's `s ∈ P.rigidRow`; QR5's inner
  `r ∈ P.rigidRow`.

**Completeness does not hold:** the checker is incomplete on the
fragment (`scDivide5`). **Not established:** which `ValidOpen`
problems in the fragment it certifies, beyond the proved families;
any polynomial bound on `cover`; anything about the PureScript or Go
implementation, source translation or integration.

**Reviews** (independent, read-only, scratch Lean; no tool denial).
Soundness: sound as claimed; every headline theorem has its
statement's type at general types; parametric scenarios proved for
every parameter and the families match star/problems.mjs; the guard
passes every negative control, so no refusal comes from it by accident;
`divide5`'s validity witness checked; axioms.out regenerates
identically. Claims: scope respected, nothing done outside §18.54 and
§18.57; corrections applied here (checker incompleteness on the
fragment, `divide5`'s non-empty premise, premises of the exactness
claims, the corollary marked as unstated, the refutations'
provenance, ranges, axiom wording), in Refutations.lean (comment
pointer), proof-plan.md (status) and progress.md.

### 18.59 Wave 2 accepted; next, a requirements-and-statements tranche (2026-10-21)

**The author accepted wave 2 as recorded in §18.58**, having checked
the `divide5` statements: validity holds for every label list, and
universal refusal needs the stated non-empty premise. Recording it as
proved checker incompleteness is correct. Rulings:

1. **Wave closed and published to `main`.** The distinction stays
   prominent: **exact queries cannot compensate for a certificate
   language that cannot express the witness.** QR1-QR5 make every
   query the checker asks exact on the fragment, and `divide5` is still
   refused, because no certificate in the current format describes
   its split.
2. **Two small theorem groups added** (Cell/Proofs/Corollaries.lean,
   in the axiom audit, now 63 theorems): `divide5_nil_accepted`, the
   wave-2 soundness review's scratch theorem verbatim; and `ValidOpen`
   corollaries of the accepted families via `cellOpenImpl`:
   `star_validOpen`, `starRead_validOpen` (every n), `dep_validOpen`
   (every k), `divide_validOpen` (every m, both variants),
   `divide3_validOpen` (every list), `splitSig_validOpen`,
   `selfDisjoint_validOpen`. `scRoute` and `scIntArm` already state
   `ValidOpen`.
3. **Guarded pieces are not adopted.** The result proves that this
   checker, with one uniform certificate in its current format, cannot
   handle `divide5`. Guards are one possible remedy;
   pattern-dependent certificate selection is another. **Authorized: a
   small requirements-and-statements tranche:**
   - a proposed Waxwing program with `divide5`'s shape and its
     hand-translated constraints;
   - the programmer-visible behavior wanted;
   - a comparison of one-literal guards on written labels with
     pattern-dependent certificate selection;
   - the smallest proposed extension, its soundness obligations and
     expected costs.

   No prototype or proofs. Equations in declarations stay deferred. A
   constructed counterexample warrants investigation but does not by
   itself settle the next mechanism.
4. **The nine wave-2 worktrees removed** after confirming their commits
   are integrated, their trees clean and their processes stopped;
   branches kept.

### 18.60 Design requirements: keep a route to fixing `divide5` (2026-10-21)

The author, while the requirements tranche (§18.59) runs: as the
connection between the proved model and Waxwing is planned, preserve a
route to fixing the `divide5` gap without substantial rework. The
general option-B theory supports programs the current cell-certificate
checker cannot certify; **that is a limitation of the checker and the
certificate format, not a language restriction.** Before
implementation, document these boundaries:

- **Source translation targets the general constraint model**,
  preserving all obligations, rigid/flexible distinctions, quantifiers
  and source origins; it never translates into the current certificate
  format or drops constraints that format cannot handle.
- **Solving and certificate checking have explicit interfaces:** what
  an accepted result guarantees, and how a future certificate format
  or checking strategy replaces the current one.
- **The verdict distinction is preserved.** Failing to find or verify a
  certificate means Unresolved unless separate evidence establishes a
  contradiction; `divide5` must not become "invalid" because the
  current checker refuses every certificate.
- **Witness selection and lowering stay separate from certificate
  representation.** Record layouts and emitted code do not depend on
  incidental details of today's receipts; any necessary connection gets
  an explicit contract and justification.
- **Semantic validity stays separate from policy, admissibility and
  resource limits;** those refusals never silently redefine the
  modeled constraint problem.

Deliverables: a concrete Waxwing example with `divide5`'s shape as an
architectural test (source, hand-translated constraints, validity
evidence, the current checker's limitation, and where a guarded-piece
or pattern-dependent-certificate solution would enter); a short
change-impact assessment (which modules, interfaces and proofs change
when that extension arrives, which stay reusable). If substantial
source translation, constraint recording or lowering work would need
replacement, the boundary is revised before it is implemented.

These are design requirements for the next plan, **not authorization**
to widen the language, implement guarded pieces or begin compiler
integration. The requirements-and-statements tranche continues; the
proposed architecture and any unresolved coupling come back to the
author.

### 18.61 The `divide5` requirements draft: not ready; blocker-first revision (2026-10-21)

The architecture review of research/division-campaign/remedy/
requirements.md (draft, 17da85d) found it not ready for approval; the
author agrees. The review found real architectural couplings; it does
not undermine the established record-model proofs. Direction:

- **R0 first:** for supported source programs, obtain the complete
  constraint problem, or justify an earlier rejection, before depending
  on an interchangeable checking strategy. Moving the end-of-body gate
  alone does not fix generation that stops prematurely.
- **Not every compiler error needs a signature counter-instance.**
  Syntax, name and kind errors, and contradictory declared hypotheses,
  have different justifications; the relevant generation refusals are
  classified explicitly.
- **A presence-only witness being insufficient does not necessarily
  require presence formulas in Waxwing's type language.** Typed
  internal witness metadata, existing type expressions and
  correspondence proofs are another possibility; the choices are
  compared explicitly.
- Agreed: reuse claims conditional; the ∀/∃ structure preserved; leaf
  coverage specified; the witness adapter inside the lowering trust
  boundary. Overlapping leaves are fine for validity; choosing a
  witness from them is a separate obligation.
- **A short blocker-first revision**, not another broad plan: (1) R0
  and the exact generation/checking boundary; (2) typed witness and
  lowering contracts; (3) G3's acceptance and behavior requirements
  and termination obligations; (4) only then the G1 remedy comparison.
- **Not in scope:** repairing `route`, implementing the recorder,
  adopting a selection rule. First establish which architectural
  prerequisites need their own authorized tranche.

### 18.62 The author's answers on G3 and the leaf construction (2026-10-21)

These findings change the draft remedies, not the established proofs.
Dropping the false `pick` example (soundness review: with `q`, `s`
rigid it is invalid at `q = s = {}`) and correcting the witness tables
is appropriate.

1. **"Forced" accounts for the complete semantic typing obligations**,
   including printability and comparability wherever required; a split
   satisfying only the row equations is insufficient. **R010
   admissibility stays separate:** if several splits satisfy typing but
   only one passes the compilation restriction, it is the *only
   admissible split*, not a semantically forced one. Selection respects
   both obligations without conflating them.
2. **Probe `walk` narrowly against today's compiler,** with
   explicit-witness controls where expressible, recording the exact
   phase and diagnostic, and distinguishing current behavior from the
   proposed rule. No compiler repair or broad test campaign.
3. **Use the corrected key and table** (R6: at `r = {x, y}`, `s = {}`,
   `s2 = {}`, `as = [x]`, `sigma5`, `d5Wit` and the rejected
   lexicographic rule give three different splits), pointing to the
   definitions (`sigma5`, Sig/ProjectionDefs.lean; `d5Wit`,
   Cell/Proofs/W7/Divide5.lean). `sigma5` sends `r`'s unwritten labels
   to `q`.

Qualifications for the revision: replace "behavior cannot vary today"
with the exact proved fragment, or state that no behavioral difference
has been demonstrated; the split-irrelevance model is not a
whole-language theorem. The selection leaf construction is **sound
but potentially incomplete**: adding neighbours' `lacks` constraints
does not necessarily express the positive path condition; state
whether leaf conditions imply path conditions, the reverse, or
neither, since the witness adapter needs an applicable leaf, not only a
validity proof. **No selection rule is chosen.** After R0 and the
typed-witness review, the blocker-first proposal states semantic
validity, acceptance requirements, admissibility and behavior
preservation separately.

### 18.63 The `walk` probe: sufficient; qualifications (2026-10-21)

docs/findings.md "R010 and composed rows". The probe is sufficient; no
further runs or compiler changes now. It establishes current behavior
and exposes a specification/implementation mismatch to resolve
separately. Qualifications carried into the blocker-first proposal:

- "Identity is the only admissible split" is conditional on the
  documented single-tail rule; today's implementation also admits the
  composed-tail witness, so uniqueness is not established for the
  current compiler.
- Building without a caller does not validate specialization or
  execution of `walk`; the caller cases stop at the several-tail
  placeholder, leaving the end-to-end question open.
- The annotation result is stated for the forms tested; the
  signature-changing `uonly` control is evidence, not a proof that
  every annotation fails.

**R019 stays open:** allowing composed tails may be a defensible
generalization but needs a termination argument; narrowing the
implementation would reject accepted programs; the contract is decided
first. For R0, the early "Cannot tell" refusal, R010 admissibility and
the several-tail specialization placeholder stay separately
classified; fixing one does not discharge the others. The proposed
selection policy meets an earlier checker limitation and an unresolved
admissibility contract; selecting the identity witness is not
presented as an implemented or fully justified remedy.

### 18.64 The author on typed witness contracts (R8) (2026-10-21)

R8 (comparison of witness representations A-D; nothing chosen) gives a
plausible way to avoid rebuilding `Ty` and identifies a real
obligation around recursive specialization. Options stay open until R7
and the blocker-first proposal. Points to tighten:

1. **Key-dependent witnesses cannot silently inherit "hole = ground".**
   The existing termination argument would no longer apply; that does
   not prove specialization diverges, it means its justification is
   missing. Witness-bound names must be distinguishable from genuinely
   unconstrained holes, by a constructor or enforced metadata.
2. **Determinism and finite ingredients do not establish termination.**
   A deterministic transformation can repeatedly wrap an input in a
   fixed constructor. State a finite set of reachable specialization
   keys, or a decreasing measure, and prove that recursive witness
   evaluation preserves it.
3. **A ground re-check narrows the adapter's trust obligation;** it
   does not make the adapter irrelevant to correctness unless every
   relevant obligation is checked against the correct key and bindings.
   Recorder completeness, binding-to-layout correspondence,
   admissibility and behavior preservation stay separate. A failed
   internal re-check is never evidence that the source program is
   invalid.
4. **Option D still needs representation correspondence:** the
   solver's bindings must reach specialization and lowering faithfully;
   "no adapter needed" names exactly which adapter disappears.

Per-name typed metadata stays a candidate (it addresses flow through
types without necessarily adding type constructors); not selected. The
final proposal puts **R0 and the termination contract ahead of
representation choice**, then compares the smallest viable witness
interfaces against those contracts. No compiler changes or new
termination-proof campaign before that review.

### 18.65 Blocker-first proposal re-reviewed; a decision document (2026-10-21)

research/division-campaign/remedy/requirements.md, revision 2. A
targeted re-review (at 7a8610a) found the rulings of §18.61-18.64 and
the promised corrections applied, scope clean, 23 of 26 citations
accurate, and twelve findings, now applied. The substantive one is the
author's added check: **forced bindings alone do not justify a class-c
refusal.** The proposal now keeps three grounds apart: (1) a
contradiction derived from original recorded atoms and `D` by a rule
proved sound for `ValidOpen` under the ∀rigid/∃flexible structure; (2)
a checked counter-instance (CX); (3) failure of the current solver to
find a solution, including any contradiction reached through bindings
the online solver chose. Only (1) and (2) justify a semantic rejection;
(3) is class e, does not stop generation and preserves the problem.
Other fixes: `walk`'s admissible split stated with its condition
(§18.63), three citations, CX's injective `i`, the exact proved
fragment of `eval_split`, and unrecorded bounded evaluations labelled
as such. **Ready as a decision document; nine decisions for the
author (its §9); no candidate tranche started.**

### 18.66 Revision 2 accepted as the planning basis; decisions; design tranche (2026-10-21)

**The author accepted research/division-campaign/remedy/requirements.md
revision 2 as the planning basis** (it identifies the blockers without
claiming that the existing compiler satisfies the proposed boundaries)
and asked for it to be pushed with the earlier records. Decisions:

1. **R0: generate-then-decide.** Syntax-directed generation of the
   complete problem; the online solver is a search strategy. Original
   obligations and source origins preserved. The new architecture is
   not built around tainting and recovery from solver-chosen bindings.
2. **R019: the documented single-tail rule is the justified baseline.**
   Pure unions of caller row variables are investigated as a possible
   extension, with a termination argument. The implementation is
   neither narrowed nor its broader behavior silently endorsed; the
   compatibility decision stays explicit.
3. **Termination: a finite-reachable-key theorem per recursive
   component.** Witness-bound names are mechanically distinguishable
   from unconstrained holes. Neither determinism nor the 10,000-key
   limit substitutes for the theorem.
4. **Witness representation: per-name typed metadata** as the design
   direction, outside certificate-specific formats, reusing existing
   type expressions where justified. A strategy may establish validity
   without supplying a compilation witness, but that alone cannot
   authorize lowering. Solving per specialization key is not an
   implicit fallback.
5. **Ground re-check** at specialization keys, as an internal
   consistency check: which obligations it checks and how it obtains
   the correct bindings are stated. Failure means an internal
   inconsistency or unsupported path, never that the program is
   invalid.
6. **G3: a restricted C8 argument and a selection contract;** no rule
   chosen. It respects the complete typing requirements and
   admissibility, preserves forced and written choices, and applies
   only where behavior preservation is justified.
7. **G1: neither remedy proceeds yet.** Guards remain a candidate,
   leaf selection an alternative. First R0, termination and the
   witness contract; the `chain3` and partition claims are stated
   precisely before being relied on.
8. **G2: implementation deferred;** the witness interface acknowledges
   field-type references as an extension requirement, so deferral is
   not an architectural prohibition.
9. **Unresolved gets a distinct error code,** with structured reasons
   separating inference failure, unsupported features and resource
   limits; wording and fixture migration belong in its implementation
   plan.

**Authorized design tranche** (documents, statements and focused
probes; no compiler changes; no new proofs before statement review):
T-R0a and T-R0b (generation/verdict interface; syntax-directed
recorder specification); T-R0c (refusal audit and bounded evidence,
independently); termination and per-name witness statements,
coordinated through one interface owner; CX's exact statements, without
a refuter implementation; T-R0e (separating validity, policy,
admissibility and support boundaries). A concrete implementation plan
comes back once those interfaces and obligations are reviewed.

### 18.67 The R0 design tranche, reviewed and revised; questions for the author (2026-10-21)

The six documents authorized in §18.66 (research/division-campaign/:
r0/generation-interface.md T-R0a, r0/recorder-rules.md T-R0b,
r0/refusal-audit.md T-R0c with 21 probes, witness/statements.md W,
refute/statements.md CX with Lean statements only, r0/boundaries.md
T-R0e) were written in parallel, then reviewed at 88c052d twice: a
reconciliation review (26 findings, one canonical owner per topic) and
an adversarial review (9 findings: FK-W's key universe false as
stated; re-check coverage overclaimed, with pass-while-wrong cases;
CX-S needed `Nodup` in `Denotes`; `outside`-marker and auxiliary-
variable conflicts; audit wording against §18.65). Each document was
revised by its own editor, then a read-only consistency re-check found
21 of 26 and 9 of 9 resolved everywhere and 13 residual
inconsistencies (R1-R13), now applied, with a final harmonization of
T-R0a's and T-R0e's refusal types. No document contradicts §18.65 or
the nine decisions of §18.66. Each document ends with a revision log.

**Ownership.** T-R0a owns the outcome, verdict and `CompileRefusal`
types (§6); W owns `Witness`, `SplitJudgement`, `AdmStatus`,
`NoWitnessReason`, `Adm_W`, the term-scope rules Sc1-Sc3, the
termination statements (FK-0, FK-W, FK-U) and the re-check obligations
RC1-RC6; T-R0b owns the recorded problem's shape (Sig1-Sig10,
E-rules); T-R0e owns layers,
codes, `Construct` and `layerOf`; CX owns refutation (CX-K, CX-P,
CX-KP, CX-PR, CX-S); T-R0c owns the evidence. Two coordinator choices
in the re-check: the post-Task-8 refusal of composed tails is T-R0e's
`ComposedTailsUnjustified`; T-R0e §7 keeps a "was" column so older
question numbers still resolve.

**Status.** Statements and designs only. Nothing new is proved; CX's
Lean file states CX-K, CX-P, CX-KP, CX-PR and builds. FK-W and FK-U
rows stay inactive until adopted and proved.

**Questions for the author** (proposed defaults in brackets; each
document's open-questions section maps its questions to these numbers,
and T-R0e §7 also maps its pre-revision numbers):

1. Outcome taxonomy: (a) a separate `Faulted` outcome or `Defect` as an
   Unresolved reason [separate]; (b) `Exhausted` [`Limit
   ReexaminationSteps`]; (c) codes for Solved declarations refused
   after validation [T-R0e's: Unresolved code plus family; own code for
   `SplitUnforced`; A keeps E_SPECIALIZATION]; (d) must `SplitUnforced`
   exhibit two witnesses [yes]; (e) `Compilation` inside `Solution`
   [yes].
2. Requirement atoms: ground `BQ` atoms judged by a stated ground rule,
   atoms with variables Unsupported [yes]; a failing ground atom gives
   Contradiction only through a registered proved rule, otherwise
   Unsupported [yes]; E017 keeps its code as transitional [yes].
3. `outside` markers: non-empty `outside` blocks a whole-function
   Solved [yes]; the marker alone supplies no contradiction, though a
   separately justified one (§18.65 grounds 1 and 2) may still be
   reported (§18.68 item 6); open: free type-constructor nodes,
   conservative `FailFamily`/`EffectArgument` markers, effect-row
   independence and the class-f construct (`ClassF Question` in T-R0a's
   `Unsupport`), the lambda effect-row annotation.
4. Static boundary: second spread generated in-model, S1 Unsupported
   [yes; until ruled, Resolve keeps refusing it]; Resolve's body-type
   `lacks`/`disjoint` checks move into generation [yes; until ruled,
   Resolve keeps refusing]; arity at a fixed result class a [yes]; coverage a
   class-a static pass [yes]; `AmbiguousType` class e unless made P
   policy [yes].
5. R019 and admissibility: FK-W in the first design [W proposes yes];
   FK-U inactive until proved [yes]; `AdmittedPendingR019` not
   user-visible [yes]; T1-a's explicit classifier required [yes].
   After Task 8, `AdmittedPendingR019` programs: refuse, keep compiling
   through the current path, or prove FK-U first. This is a behaviour
   change for programs accepted today, so it is an explicit
   compatibility decision (decision 2), with no default (§18.68).
   Unverified: that every `AdmittedPendingR019` key reaches the Task 8
   placeholder today (argued only; a probe is proposed).
6. Witness representation: names only for non-`Ty Open` terms; keep
   `ChooseT`; syntactic hole-contract check; auxiliaries evaluated,
   never bound [all yes; the last superseded by §18.69 item 6].
7. Forcedness: who decides it and whether the decider reads the
   problem or the `Solution` [unassigned; open]; `ComponentBlocked` is
   tagged A and rendered with E_SPECIALIZATION [yes].
8. Ground re-check: after lowering computes layouts and callee keys,
   before Go emission [settled]; placement and cost (per copy, per
   edge; always on or a checking build) [open].
9. Assurance and migration: `Pending` assurance allowed on Solved until
   statements are approved [yes]; whole-program result kept, all
   outcomes reported [yes]; steps 4 and 5 together or with a
   documented window [open].
10. CX and class c1: unstated rules stay "c1 candidate" [yes]; C1-E as
    the line between original and solver-chosen atoms; total binding
    of unused rigid variables; scoped `D` (T-R0b gives `D` only over
    rigid variables, which suggests closing it); certificate cost;
    B1b first or a sound incomplete refuter; `BQ` and non-record heads
    under CX; sub-body certificates: any non-empty sublist of `B`, via
    CX-KP [yes]; may a refuter register while CX-K/CX-KP/CX-PR is
    unproved [T-R0a's `RefuterSpec` permits `Pending`; rules require a
    proof]. T-R0c's open items: P3's instrumented run (the `ext(p, y)`
    case), Corollary SL-H, an arm-order check beyond one pair.
11. `ValidR`: which document defines the recorded problem's validity
    (CX Q8) [no default; T-R0b is the natural owner]. CX-PR waits on it.
12. Confirm the `crash` reference's checked `Lambda` is built like
    `showRef`'s, so `LambdaBody` is right [assumed; checked when RT7 is
    implemented]. B9 in-model, class e, `GuardOutsideFragment` [yes].
    B13: no `Outside PatternGrowth` [yes; unchecked until RT1 runs].

**Next:** the author's answers; then the concrete implementation plan
(writing-plans; nothing implemented), as §18.66 asked.

### 18.68 External review of the overnight work; correction pass (2026-10-22)

The author forwarded an external review of the overnight work (it did
not rebuild Lean or audit all 63 matrix rows). It found the foundation
recommendation promising and asked for a focused correction pass
before the implementation plan:

1. O24 must deal with partial composition: EMLTI's Definition 10.2.5
   requires constructors to denote total functions, and disjoint
   composition is undefined on overlapping fields, so the
   correspondence needs an encoding (composition as a relation with
   definedness obligations, say), not an identification of models.
2. A builder continuation does not give binding coverage by
   construction: `Witness → Either ElabFault a` can still ask for an
   absent binding. Coverage needs tracked requests, a restricted
   builder interface or a coverage theorem.
3. T-R0a's claim that strategy order never changes the verdict class
   is false: one strategy's refused candidate gives `Faulted` where
   another's certificate gives Solved. Soundness only rules out a
   sound acceptance and a sound refutation disagreeing.
4. The post-Task-8 refusal of `AdmittedPendingR019` is a proposed
   behaviour change and needs an explicit compatibility decision, not
   a maintenance default (Q5 above amended).
5. The "no principal writable `where` clause" result is bounded
   evidence from a scratch search, not a universal impossibility.
6. Unsupported syntax alone supplies no contradiction; a separately
   justified contradiction (§18.65's grounds 1 and 2) may still exist.
   The documents should say so consistently.

The review's recommendations on the extension's decisions, recorded
as the reviewer's and **pending the author's confirmation**: D1,
develop the continuation with coverage enforced or proved; D2, pursue
EMLTI as the candidate but investigate O24 before adopting the
correspondence or freezing L0 exports; D3, statements once the
interfaces are stable, no selection rule; D4 deferred; D5 and D6 as
recorded.

**Held:** blanket acceptance of Q1-Q12 and the implementation plan,
until the correction pass and a narrow O24 correspondence note are
back.

A further question from the correction pass (T-R0a §5.3 "Order"):
**Q13.** Does a refused candidate stop the run? Option A: no; record
`CandidateRefused`, continue, report `Faulted` only if nothing else
decides (the verdict class is then order-independent for sound
components with per-strategy fuel, argued). Option B: yes; order may
decide between Faulted and Solved, documented and exposed by the
test-only `Checking` value. No default.

### 18.69 The author's decisions on Q1-Q13 and D1-D6 (2026-10-22)

The author forwarded a second external review, which found the
corrections substantially satisfactory (no counterexample to revised
T1 or GI-Atoms; the predicate encoding a credible next step, its
correspondence unproved), and adopted its recommended answers.
**The implementation plan may now be written. Implementation and proof
work stay separately unauthorized.**

1. **Outcomes.** Internal faults are separate from Unresolved; genuine
   budget exhaustion is a limit, an invariant violation a fault.
   `Compilation` stays inside `Solution`. `SplitUnforced` needs two
   checked alternatives at the same permitted rigid assignment that
   differ semantically on the split, or equivalent checked evidence of
   non-forcedness; syntactic difference alone is not enough.
2. **Requirements.** Ground requirement rules adopted, with reduction
   through entailed equalities: a variable's presence in the syntax
   does not by itself force Unsupported. Other unsupported requirement
   judgments stay Unsupported. E017 is explicitly transitional.
3. **`outside` markers.** The conservative support boundary, for now.
   A construct is exempted only once its omitted obligations are shown
   unable to affect the claimed result. A marker alone establishes no
   contradiction. Effect/record independence is not assumed.
4. **Static boundary.** A second spread is a support limitation.
   Semantic body-type checks move into generation; genuinely structural
   arity and coverage checks stay separate. A check that depends on a
   solver-selected type is semantic. `AmbiguousType` stays Unresolved
   unless a language policy deliberately says otherwise.
5. **R019.** FK-W is in the design, inactive until its obligations are
   met; FK-U stays inactive. The compatibility probe runs before the
   post-Task-8 behaviour is decided: neither silently narrow current
   behaviour nor declare the broader behaviour justified. This is a
   dependency inside the plan, not a blocker to writing it.
6. **Witnesses.** `ChooseT` and the conservative hole check kept as
   proposed mechanisms. Auxiliary bindings are omitted only where
   deterministic reconstruction is established; otherwise kept.
7. **Forcedness.** Owned by a separate policy component that reads the
   immutable complete problem and the split site. A candidate solution
   may help find evidence but cannot define forcedness.
   `ComponentBlocked` may keep the specialization diagnostic family,
   naming the dependency.
8. **Ground re-check.** Always on initially: each reached
   specialization once, with its outgoing instantiations and computed
   layouts, before emission; completed checks cached; cost reconsidered
   only after measurement.
9. **Migration.** Explicitly labelled Pending assurance allowed during
   migration, never presented as proved. The complete outcome
   collection kept. The switch to online-as-search coordinated with the
   replacement decision path; any intermediate window specified and
   tested before landing.
10. **CX.** Start with a sound, possibly incomplete refuter; B1b
    completeness does not block it. Unstated rules stay candidates.
    Full `D` preserved; justified sub-bodies permitted. The initial
    proved-model scope is kept apart from `BQ` and further type
    constructors. Pending refuters may run for research or shadow
    evidence but do not mint the trusted Contradiction before their
    soundness obligation is discharged.
11. **`ValidR`.** T-R0b owns the recorded problem's declarative
    meaning, with requirements and unsupported constructs explicit. CX
    consumes it; validity is never defined by whichever checker
    succeeds.
12. **Implementation facts.** The `crash` question is closed by
    inspection: `crashRef` builds a checked lambda whose body has the
    fresh result type (src/Features/Check/Operation.purs:120), so
    `LambdaBody` is right. B9 and B13 stay proposed classifications
    pending their named tests.
13. **Refused candidates: option A-i.** An untrusted candidate that
    fails checking does not stop the run; the attempt is kept in the
    structured outcome record. A trusted-checker failure or a broken
    invariant still stops. Heuristic candidates rejected as expected
    are failed attempts, not compiler defects. Order independence is
    stated conditionally (same problem, independent budgets, stable
    hint inputs, no shared mutable search state; passing hints as a set
    is not enough) and is not an implementation promise.

Research decisions (inference extension §10):

- **D1.** The generation continuation, with tracked applicative
  requests: reads are introduced through constructors that record
  their dependencies, not through a separately written list; scoped
  handles may enforce problem identity. The mechanism is specified
  before implementation.
- **D2.** Encoding (a), composition as the predicate U. M0, T1, T2, V,
  GI, F and GI-Open go to statement review for a focused proof tranche;
  GI-Atoms stays conditional on B1b. Current exported syntax kept, but
  L0 is not frozen as sufficient for future principal inference.
- **D3.** Restricted C8 statements once the witness and termination
  interfaces stabilize; no selection rule.
- **D4.** Guards deferred. **D5, D6** as recorded.

The reviewer recommends pushing the documents and statements as a
research checkpoint once these are recorded and the final edits
rechecked, with every unproved status left unmistakable.

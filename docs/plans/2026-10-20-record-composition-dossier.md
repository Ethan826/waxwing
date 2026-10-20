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

### 10.3 The finite reduction, stated (Lean: Reduction.lean, `Prop`
definitions only; nothing proved or assumed)

- **R1, existential reduction** (`R1`). A call-site problem `C` has a
  solution iff it has one in which every row, at every depth (inside
  type variables' values and inside field types), has its labels among
  those written in `C` (`labelsOf C`: record fields and `lacks` atoms).
  Such a witness is finite.
- **R2, presence patterns** (`R2`). Let `L` be `labelsOf C` without
  repeats, and `fresh r l` a type variable for each row variable `r`
  and label `l`, distinct from each other and from `C`'s. For a
  presence pattern `π` (which labels of `L` each row variable has), let
  `σπ` bind each row variable `r` of `C` to the closed record `{ l:
  fresh r l | l ∈ L, π r l }`. Then `C` has a solution iff some `Cσπ`
  has one.
- **R2′, closedness** (`R2Closed`). Every `Cσπ` has no row variables.
  Only `π`'s values on `C`'s row variables and `L` matter, so finitely
  many patterns (at most `2^(rows × labels)`) need trying.
- **R3, closed problems** (`R3Spec f`). A function `f` answers `true`
  exactly for the satisfiable closed problems. As a `Prop`, R3Spec is
  met by a classical choice of `f`, so it means decidability only for
  `f` written as a computable definition: Robinson's unification with
  occurs check (published, Robinson 1965) over base types, functions and
  closed records (equal label sets, fields unified pointwise), plus the
  static checks that `ff` fails and no record repeats a label.
- **Call-site decidability** follows from R1-R3: try each pattern, run
  `f` on `Cσπ`. Not stated separately yet; its statement needs the
  enumeration of patterns as a computable definition.

**What represents unnamed labels.** Nothing, at a call site. R1 says
the labels written in `C` suffice: restricting every row (at every
depth) to them preserves every atom, because restriction is a function
applied to both sides of an equation and commutes with evaluation
(written fields keep their labels; unions and disjointness survive
removal of labels), and it only removes fields, so `lacks` and
`disjoint` stay true. This is an argument for R1, to be proved, not a
proof. It holds only because every variable is existential: a rigid
row ranges over all rows, including labels nobody wrote, so a
signature's reduction (C9) needs a stand-in for "the rest" of each
rigid row, and R1 does not transfer to it.

**Why field types stay independent.** In R2 each row variable gets its
own type variable at each label (`fresh r l`), and each record
expression written in `C` is a separate expression with its own field
types. Nothing relates two of them unless an equation in `C` does.
Program 11: `q`'s pattern has `a` absent (its `lacks`), and `{ ...q, a:
1 }` and `{ ...q, a: true }` are two expressions whose `a` fields are
unrelated. Simon's translation, by contrast, gives a field one type
term across joined rows (assessment §4.3).

**Proof plan, for approval, not started.** R1 by defining restriction
on ground types and proving that it commutes with evaluation;
R2 forward from R1 (read `π` and the fresh variables' values off the
restricted solution; then `binding_correspondence`), backward by
building each row from its pattern's fields and using
`binding_correspondence` again, since `Cσπ` mentions no row variable;
R2′ by computation on the syntax; R3 by writing and verifying the
unification algorithm, the largest part. Known obstacles: restriction
is recursion through rows that are functions (the nested `Option`
inside `G`), which Lean's structural recursion may not accept, and may
need a well-founded measure or a finite representation of ground rows;
R3 needs a termination argument for unification (a standard measure on
variables and term size).

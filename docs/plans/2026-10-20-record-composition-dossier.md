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
part, against different other arguments. The only change P9s certifies
is a narrower signature, `where r disjoint s`, which callers passing a
`x` that overlaps `y` would then fail to satisfy.

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
family the oracle and this section have found that P9s cannot certify.
The choice is yours: research a procedure that divides rigid rests
(Q1-Q3 of §13.9 become its questions), or accept the narrower-signature
workaround for now, recorded as a known limitation, not as final
policy.

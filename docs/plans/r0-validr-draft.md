# `ValidR`'s open points: a draft for G-ValidR

Task 0.4 of the R0 implementation plan
(docs/plans/2026-10-22-r0-implementation-plan.md), gate **G-ValidR**
(policy points in the plan's §3.A, checks in §3.B). Date 2026-10-22,
base d861957. A draft for T-R0b's owner and the author: nothing here
edits research/division-campaign/r0/recorder-rules.md ("T-R0b"), whose
§5.4 changes only after the gate is ruled. No compiler behaviour
changed.

Labels, as in the R0 documents: **cited** (file:line or section),
**checked** (a test in this commit backs it), **argued** (reasoning,
unchecked), **proposed** (a design choice). The policy points (§3)
are offered as options with consequences and a recommended default;
they are the author's to decide. Nothing is proved.

Sources read: T-R0b §2.1-§2.2, §3.2 (E10 and its notes), §3.5 (E17-E23,
markers), §5.1-§5.4, §11 items 9, 11 and 16; research/division-campaign/
refute/statements.md ("CX") §1-§3 and §4.1; research/composition-proofs/
Composition/Typed/Bridge/Valid.lean (`ValidOpen`) and Sig/Finite.lean
(`ValidFin`); research/division-campaign/witness/statements.md RC3;
dossier §18.69 items 2, 4, 10 and 11; the plan's §1 item 1 and item 4,
§3.2(a)-(b), G-A-i(f), Tasks 4.2 and 6.4; src/Features/Check.purs,
Check/Functional.purs, Check/Printable.purs, Check/Comparable.purs,
Specialize/Printable.purs; docs/language.md (FN001 "Comparability and
patterns"; "Printability at the ground type"; I001 note).

## 1. What this settles

| Open point (T-R0b §11 item 16; plan §3.A, §3.B) | Kind | Where |
|---|---|---|
| `ReqG` at declared types whose constructors hold functions | policy | §3.1 |
| `ReqG` at fresh base atoms | policy | §3.2 |
| Printability at a rigid variable (found here, §2.3) | policy | §3.3 |
| The meaning of a non-empty `Q` | policy | §3.4 |
| Where `ReqG`'s holder set comes from (found here, VR-independent) | policy | §3.5 |
| `ReqG` and `ValidR` under the recommended defaults | draft | §4 |
| How VR-sub, VR-agree and VR-CX are checked | technical | §5 |
| What Task 4.2 and Task 6.4's RC3 cite | consequence | §6 |

Not settled: a Lean rendering of `GA` (kept apart from the initial
proved-model scope, dossier §18.69 item 10), any proof, a written
syntax for `Q`, and what replaces E017 (§18.69 item 2 calls it
transitional).

## 2. Today's judgement (the probe)

test/r0-requirements-probe.test.mjs pins, per case (one test each),
the stage that stops the program, its code and its exact text
(`phaseOf`, test/r0-probe-support.mjs); it does not pin spans. Every
stage, code and text below is **checked** by it. Shared declarations:
`type Box(a) = Box(a -> a)`, `type F = F(Int -> Int)`, `type Outer =
Outer(Box(Int))`, `type Wrap(a) = Wrap(a)`, `type Tag(a) = Tag(Int)`
(a phantom parameter), `type L(a) = N | C(a, L(a))`, `effect Log` and
`fn inc(x: Int): Int`; the generic `fn p(item: a): Text = show(item)`
is added only to the cases that call it, so a changed rule fails only
the cases it touches.

The tests fall into eight groups, numbered below by test title:
(1) the three holder cases (`Box(Int)`, `F`, `Outer`); (2) `Wrap` and
`Tag`; (3) heads outside the declared types; (4) `main` returning
each; (5) the five rigid-variable cases (print at a rigid variable,
uncalled caller, lambda or reference, declared type over a rigid
variable, compare at a rigid variable); (6) the two open-record
cases; (7) the unconstrained hole; (8) a print builtin passed as a
value.

### 2.1 The rule today

One predicate serves all three judgements (cited):
`containsFunction holders ty` (Check/Functional.purs:45-52) is true at
an arrow, at a handler type, at a record with such a field, and at
`TData t args` when `t ∈ holders` **or** some argument contains one.
`holders = functional ctors` (Functional.purs:36) is the least fixed
point of "some constructor field mentions an arrow, or a holder"
(test/functional.test.mjs pins it). It is read by:

- Check/Printable.purs:21-23, 54-58: `show`, `Console.print`, `crash`
  at the settled argument type; a variable counts as printable.
- Check/Comparable.purs:76-80: a rigid variable is NotComparable, a
  hole AmbiguousType, then `containsFunction` is NotComparable.
- Check.purs:56-67, `printableEntry`: `main`'s ground result
  (E_ENTRY).
- Specialize/Printable.purs:55-63, `checkSites`: every print site
  again at its ground type after specialization (E017).

### 2.2 Results

| Case (test) | Today |
|---|---|
| `Box(Int)`, `F`, `Outer` printed, shown, crashed, compared (1) | refused at check: `Expected a printable value, found Box(Int)`; `Type Box(Int) is not comparable` |
| `Wrap(Int)`, `Tag(Int)` printed or compared (2) | compiled |
| `Wrap(Int -> Int)`, `Wrap(Box(Int))` (2) | refused at check |
| `Tag(Int -> Int)`, `Tag(Box(Int))`, phantom argument, printed or compared (2) | refused at check |
| `Int -> Int`, `Handler(Log)`, `{ f: Int -> Int }` (3) | refused at check |
| `()`, Text, a closed record compared (3) | compiled |
| `main` returning each type above (4) | E_ENTRY `Expected fn main() with a printable result type` exactly where `show` is refused at check |
| `p` uncalled; `p(1)` (5) | compiled |
| `p(inc)`, `p(Box(inc))`, through a generic `r` (5) | refused at **specialize** (E017; its span, at the print site in `p`, is cited from Specialize/Printable.purs:50-51 and not pinned) |
| non-generic `q` calls `p(inc)`, `q` never called (5) | refused at specialize |
| generic `q(x: b)` calls `p(inc)`, never called (5) | compiled |
| print through a `let` lambda or `ap(show, x)` at a rigid (5) | compiled |
| `show` of a `Box(a)` parameter (5) | refused at check: `found Box(a)` |
| `show` of a `Wrap(a)` parameter (5) | compiled; at `Wrap(inc)` refused at specialize |
| compare at `a`, `Wrap(a)`, `Tag(a)` (5) | refused at check: `Type a is not comparable` |
| `show` of `{ a: Int, ...r }` (6) | compiled; at a function field refused at specialize |
| compare at `{ a: Int, ...r }` (6) | refused at check |
| `show(N)`, an unconstrained hole (7) | compiled |
| `N == N` (7) | refused: `Ambiguous type L(_) in comparison` |
| `ap(show, inc)` (8) | refused at check |

Foreign base types cannot be written: there is no foreign declaration
syntax, and foreign values are "Proposed, with I001"
(docs/language.md:182, cited; BACKLOG I001 Planned). So no recorded
atom can name a base outside Waxwing's; such a base reaches a
judgement only as a rigid variable's instance, which group 5 stands
in for.

Two scratch mutants of a copy of output/, removed afterwards, show the
probe separates the readings of §3. Each run is recorded, with its
patch, command and failing tests, in docs/findings.md "`ValidR` sketch
and today's printability" (checked):

- `containsFunction` ignoring `holders` (the literal "through record
  fields and `app` arguments" of T-R0b §5.4): 8 of 16 tests fail, in
  groups 1, 2, 4 and 5; `show(Box(inc))` compiles.
- `containsFunction` true at a rigid variable or a rigid record tail
  (a function could be substituted there): 5 of 16 fail, exactly the
  groups 5 and 6 cases that print at a rigid type, starting with the
  uncalled `p` itself (`Expected a printable value, found a`).

### 2.3 Finding: the sketch as written contradicts VR-sub

T-R0b §5.4 quantifies over every finite `θR` over `GA(B₁)` and
requires `ReqG` of every `BQ` atom. For `p`, `BQ ∋ pr (tvar a)` with
`a` rigid (E19), and `θR(a) = arrow Int Int` satisfies the empty `D`
while no `θF` makes `pr` true. So `¬ ValidR (generate p)`, yet `p`
compiles (group 5, first row) and is refused per instance only after
specialization. VR-sub ("a declaration valid under the language's full
rules has `ValidR`") is therefore false under the literal sketch;
`¬ ValidR` would be evidence against a declaration the language
accepts (argued from the definition; the second mutant shows the
corresponding check-time rule refusing `p`; that refusal is
checked, the `¬ ValidR` claim is argued).

The plan already keeps such atoms Unsupported, never Contradiction
(plan §1 item 1; AT19's third case), so no verdict is wrong today. The
defect is in the meaning, which CX-PR and any future refuter consume.
Today's language treats printability at a rigid variable as an
assumption discharged per instance, which is a policy point of the
`Q` kind; the plan's §3 says such a point moves to §3.A. It is §3.3
below.

## 3. Policy points

### 3.1 Declared types whose constructors hold functions

Let `H` be the program's holder set (`functional ctors`, §2.1).

| Option | `pr`, `cmp` at `app t v̄` (and `base t`, a declared type of no parameters) | Agrees with today | Consequences |
|---|---|---|---|
| **H-a (recommended)** | false when `t ∈ H`, whatever `v̄`; otherwise every argument must pass, a phantom one included | every row of groups 1, 2, 4 | `ReqG` depends on `H`, a program table (§3.5); recursive types need no fixed point at judgement time, since `H` is settled once |
| H-b | by the constructor fields instantiated at `v̄`, ignoring unused parameters | differs on `Tag(Int -> Int)` and `Tag(Box(Int))`, which it accepts | a language widening (phantom arguments stop counting); needs the field types in the problem and a greatest fixed point for recursive types (`List(Int)`) |
| H-c | through arguments only (the sketch's literal wording) | differs on `Box(Int)`, `F`, `Outer` (first mutant) | accepts values that hold functions; `main` could return one; not recommended |

### 3.2 Fresh base atoms

A recorded atom never names a fresh base: atoms are built from
Waxwing's bases (T-R0b §2.2's translation) and the problem's
variables. A
fresh base arises only as a value of `θR` (the injective extension
`B₁` of `ValidOpen` and `ValidR`) and in the encodings of §5. So this
point decides only atoms that mention a rigid variable, and only
together with §3.3. Write `κ(b) ⊆ {pr, cmp}` for the requirements a
base meets; Waxwing's bases are fixed: `Int`, `Bool`, `Text`, `Unit`
meet both, a declared type `t` of no parameters both iff `t ∉ H`.

| Option | Fresh base `b` | Consequences (with §3.3's Pr-1) |
|---|---|---|
| **F-a (recommended)** | `ValidR` quantifies over every `κ` on `B₁ ∖ bases` | generic code may assume nothing of an unknown base beyond the hypotheses; reproduces groups 5 and 6 (compare at `a` fails where `κ(β) = {pr}`); VR-CX may pick `κ = {pr, cmp}` (§5.3) |
| F-b | fixed `κ(b) = {pr}` | same verdicts on every probe row; but a written `cmp a` in `Q` (§3.4) is then unsatisfiable at a fresh base, and VR-CX's argument (§5.3) no longer goes through |
| F-c | fixed `κ(b) = {pr, cmp}` | under Pr-1, `x == x` at a rigid `a` becomes valid (no function instance is admitted), so today's refusal (group 5) would be stricter than `ValidR`: a completeness gap, contradicting T-R0b §3.2's note that C6 "reappears as a semantic consequence" |
| F-d | fixed `κ(b) = ∅` | with Pr-1, as F-c: the hypothesis excludes every fresh base, and every admitted value is then comparable; with Pr-2, every generic print fails |

### 3.3 Printability at a rigid variable

| Option | Meaning | Agrees with today | Consequences |
|---|---|---|---|
| **Pr-1 (recommended)** | every rigid variable carries an implicit hypothesis "printable" (`Q_imp`, §4.2): `ValidR` ranges over the rigid assignments that meet it; each instance is judged after specialization, outside `ValidR` (E017, RC3) | every check-time row of groups 5-8; the specialize-time rows are per key, outside a declaration's meaning | VR-sub holds on the probe (§5.1); a whole-function Solved certifies printability only modulo instances, so RC3 meets the per-instance part (§6); a future rule could discharge `pr` atoms at rigid types under the hypothesis, which needs its own `Sound_F` (§18.69 item 2 keeps them Unsupported) |
| Pr-2 | the sketch's literal reading: no hypothesis | refuses `p` and every generic print (§2.3, second mutant) | VR-sub false; a language change that would need written `Q` (`a printable`) to restore generic printing |
| Pr-3 | an inferred `Q_f`: the `pr` atoms that depend on rigid variables become a contract, and callers record `θ(Q_g)` (E3) | moves the refusal from `p`'s print site to the call site; refuses the uncalled generic `q(x: b)` calling `p(inc)`, which compiles today (group 5) | a language change in blame and in dead code; contradicts Sig9 ("no syntax or inference exists") |

Under Pr-1, `cmp` at a rigid variable fails only at a fresh base that
is printable and not comparable: off the fresh bases `pr` and `cmp`
coincide (§4.1). So today's refusal of `x == x` at a rigid `a`
follows from `ValidR` exactly when §3.2 admits such a base (F-a, F-b).

The difference between Pr-1 and Pr-2 is exactly today's asymmetry:
printability is assumed at a rigid variable and checked per instance,
comparability is not assumed and is refused at check (group 5).

### 3.4 A non-empty `Q`

`Q` is empty today (Sig9) and nothing produces it.

| Option | Meaning | Consequences |
|---|---|---|
| **Q-a (recommended)** | `Q` is a set of requirement atoms over the declaration's rigid variables, a hypothesis beside `D` (§4.2); a caller records `θ(Q_g)` in its `BQ` (E3, already in T-R0b); well formed only if every atom holds when each rigid variable is a fresh base meeting both requirements (§5.3) | `cmp a` in `Q` makes `x == x` valid; an unsatisfiable `Q` (for example `pr Box(a)`) is rejected as ill formed rather than making `ValidR` vacuously true, which CX-PR needs (§5.3); still Unsupported for every strategy until one's `Sound_F` covers hypotheses (plan §1 item 1) |
| Q-b | as Q-a, without the well-formedness condition | `ValidR` vacuous under an unsatisfiable `Q`; CX-PR then fails for such problems (§5.3) |
| Q-c | leave the meaning unstated | the status quo: a non-empty `Q` is Unsupported (T-R0b §7, A6/A7); harmless while Sig9 holds |

### 3.5 Where the holder set comes from

`ReqG` reads `H` (§3.1, H-a or H-b), a function of the whole
program's constructor table, not of the declaration. VR-independent
(T-R0b §5.4) says `ValidR` reads only the `RecordedProblem`, which
today carries no constructor table.

| Option | Meaning | Consequences |
|---|---|---|
| **K-a (recommended)** | the recorded problem gains a field `holders`: the members of `H` among the type heads its atoms mention, computed at generation from the tables generation already reads (G-local) | VR-independent stands as written; T-R0a's `RecordedProblem` shape (T-R0b §10) gains a field, which Task 3.1 builds and RT1's comparison covers; under H-b the field would have to carry the constructor field types instead |
| K-b | `ValidR` is relative to the program's tables (`ValidR_Σ p`) | no interface change; VR-independent weakens to "the problem and the tables", so a refuter or re-check must be given the same tables, and RT3's strategy-independence argument must say so |

## 4. Draft `ReqG` and `ValidR` (recommended defaults)

### 4.1 The ground rule

Over `GA(B₁)` (T-R0b §5.4's values), for `k ∈ {pr, cmp}`, a holder set
`H` and a base valuation `κ` (§3.2):

```text
ReqG_{H,κ} k (base b)           = k ∈ κ(b)
ReqG_{H,κ} k (arrow _ _)        = false
ReqG_{H,κ} k (record fs)        = ∀ (l, v) ∈ fs, ReqG_{H,κ} k v
ReqG_{H,κ} k (app (Handler e) _) = false
ReqG_{H,κ} k (app t v̄)          = t ∉ H ∧ ∀ v ∈ v̄, ReqG_{H,κ} k v
κ(Int) = κ(Bool) = κ(Text) = κ(Unit) = {pr, cmp}
κ(t) = {pr, cmp} if t ∉ H, else ∅      -- t declared, no parameters
```

`pr` and `cmp` agree on every ground value of Waxwing's bases; they
differ only at fresh bases, through `κ`. This is `containsFunction`
read on ground values (argued, line by line against
Functional.purs:45-52: `TFun` and `THandler` true, records by field,
`TData` by membership or argument).

### 4.2 The meaning

```text
Q_imp p = { pr (tvar a)  | a ∈ p's rigid type variables }
        ∪ { pr { ...r }  | r ∈ p's rigid row variables }

ValidR p :=
  ∀ B₁ (injective extension of the bases),
  ∀ κ extending the fixed valuation of §4.1,
  ∀ θR finite over GA(B₁),
    Sat θR p.d ∧ (∀ q ∈ p.q ∪ Q_imp p, ReqG θR q) →
    ∃ θF finite over GA(B₁),
        Sat (θR ∪ θF) p.b
      ∧ ∀ a ∈ p.bq, ReqG (θR ∪ θF) a
```

(`ReqG` here is `ReqG_{H,κ}` with `H` the problem's, §4.3.) The rest of
T-R0b §5.4 stands: `outside` markers and erased rows are unsupported
constructs, a requirement atom that is not made ground is meaningful
but Unsupported for judgment (§18.69 item 2), and VR-solved's
conditions are unchanged.

| Probe row | `ValidR` under the defaults | Today at check |
|---|---|---|
| `pr` at `Box(Int)`, `F`, `Outer`, `Wrap(Int -> Int)`, `Tag(Int -> Int)` | false: the atom is ground and fails | refused |
| `pr`, `cmp` at `Wrap(Int)`, `Tag(Int)`, `()`, Text, closed record | true | compiled |
| `main`'s Sig10 atom at each type of group 4 | as `pr` above | E_ENTRY where false |
| `pr a`, `pr Wrap(a)`, `pr { a: Int, ...r }`, `pr` through `let` or `ap(show, x)` | true: implied by `Q_imp` | compiled |
| `pr Box(a)` | false at `θR(a) = Int` | refused |
| `cmp a`, `cmp Wrap(a)`, `cmp Tag(a)`, `cmp { a: Int, ...r }` | false at a fresh base with `κ = {pr}` | refused |
| `pr`, `cmp` at a hole | true: `θF` picks `Int` | `pr` compiled; `cmp` AmbiguousType, not validity (T-R0b §11 item 9) |
| `pr π` of `ap(show, inc)`, `π` entailed equal to `Int -> Int` | false: no `θF` choice avoids the arrow | refused |
| `pr`, `cmp` at `Tag(Box(Int))`, `Wrap(Box(Int))` | false: `Box ∈ H` through an argument | refused |
| `p(inc)` and the other specialize-time rows | outside `ValidR` (per key: §6) | refused at specialize |

Each "true" and "false" is argued from §4.1-§4.2; the "today" column
is checked. They agree on every validity verdict; AmbiguousType is not
one (T-R0b §11 item 9).

### 4.3 `H` and VR-independent

Under K-a (§3.5) `H` is the problem's `holders` field, and the
definition above reads only the `RecordedProblem`.

## 5. The obligations and their checks

### 5.1 VR-sub

**Statement (revised).** A declaration that today's checker accepts,
setting aside E017's per-instance check, has `ValidR (generate f)`.

**Argument (argued).** Today's settled body gives a candidate in
terms of the rigid variables (read back as in T-R0b §5.3). Taking each
rigid variable to a fresh base, the candidate satisfies `B`; since no
atom mentions a fresh base, replacing those bases by any `θR`'s values
is a homomorphism that keeps every `eq` and, labels being unchanged,
every `lacks` and `disjoint` (with `D` holding at `θR`). For `BQ`: an
accepted `pr` site has no arrow, handler or holder outside its
variables, and `Q_imp` makes the variables' values printable; an
accepted `cmp` site is ground and function-free (Comparable.purs:
76-80), so it holds at every `θR`.

**Checks.**

1. This task: the probe rows of §4.2, check-time verdict against the
   draft's (checked for "today", argued for the draft column).
2. With Task 4.2 (proposed name test/r0-validr-sub.serial.test.mjs,
   corpus-wide): for every declaration of the pinned R0 corpus that
   today's checker accepts, evaluate each `BQ` atom of `generate f` at
   the read-back candidate with every rigid variable a distinct fresh
   base and `κ = {pr}`; every atom must hold. A failure is a VR-sub
   counterexample (a recorder rule or this definition). The `B` part
   is G0's `checkSubstitution` at the same instance (Task 4.2).
3. The homomorphism step (fresh bases to any values) as a Lean
   statement once a rendering of `GA` is authorized (§18.69 item 10).

### 5.2 VR-agree

**Statement.** On problems with no `app` node and empty `q` and `bq`,
`ValidR p ↔ ValidOpen (toSig p)`. Under §4.2 this is not "by
construction": `ValidR`'s values include `app` nodes, and `Q_imp`
restricts `θR` even when `bq` is empty.

**Argument (argued).** (→) Given any `θR` over `G(B₁)`, replace each
rigid type variable's value, and each field value of each rigid row's
value, by a distinct fresh base `β` of `B₂ ⊇ B₁` with `pr ∈ κ(β)`.
The new `θR′` meets `Q_imp` and `D` (labels unchanged), so `ValidR`
gives `θF′`. Substituting the fresh bases back is a homomorphism
fixing the problem's bases, so it carries `θF′` to a solution at
`θR`; then collapse every `app` node (map it to `base Int`; any fixed
value of `G(B₁)` works) to land in `G(B₁)`. (←) A `θR` over `GA(B₁)`
meeting `Q_imp`: encode each `app` value in it injectively as a fresh
base of `B₂`, apply `ValidOpen` at `B₂`, decode. Both maps preserve
satisfaction of `eq`, `lacks` and `disjoint` because they commute with
evaluation and keep every record's labels.

**Checks.** A Lean statement of the two homomorphism lemmas (label-
preserving homomorphisms of ground values preserve `Sat`), under the
proof-dossier policy once `GA` is in scope. Until then, a bounded
executable check (proposed; its problem grammar is fixed and recorded
before running): rigid assignments drawn from {`Int`, an arrow, a
fresh base, an `app` value}, deciding the substituted body over `G`
and over `GA` (syntactic unification with a free constructor) and
comparing.

### 5.3 VR-CX

**Statement.** CX §4.1's conditions 4 and 5 hold, so CX-PR:
`¬ ValidOpen (toSig p) → ¬ ValidR p`.

**Correction to T-R0b's argument (argued).** T-R0b encodes each `app`
value injectively as a fresh base atom. That lands in `G(B₂)` for some
`B₂ ⊋ B₁`, but `ValidOpen (toSig p)` at `B₁` needs a solution over
`G(B₁)`. Injectivity is not needed in this direction: condition 4
makes every `app` occurrence its own unshared variable, so the
collapse of §5.2 (every `app` node to one fixed value of `G(B₁)`,
identity elsewhere) carries a recorded solution to a projected one. It
keeps labels and finiteness and is applied after `θR` is fixed. CX
§4.1 condition 4 (refute/statements.md) states the same injective
requirement ("values of `G` over an injective extension of the
bases") and needs the same edit after the gate, or the two documents
diverge.

**The hypotheses.** `ValidR` assumes `Q ∪ Q_imp`; `ValidOpen` assumes
only `D`. The (→) step of §5.2 handles `Q_imp`. A written `Q` must be
satisfiable the same way: with every rigid variable a fresh base and
`κ = {pr, cmp}`, every `Q` atom must hold. That is Q-a's
well-formedness condition; without it (Q-b), `pr Box(a) ∈ Q` makes
`ValidR p` vacuously true while `ValidOpen (toSig p)` can be false, and
CX-PR fails.

**Checks.** The collapse lemma and the fresh-base lemma of §5.2 cover
it (Lean statements, same scope); `Q`'s well-formedness is decidable
syntactically (no arrow, handler or holder head in a `Q` atom) and is
checked where `Q` is recorded, which nothing does yet.

## 6. What the ruling feeds

- **Task 4.2, `openRequirements`.** After the ruling, its "fresh base"
  part is empty for every recorded problem (§3.2: atoms never name a
  fresh base), and atoms at holder heads have a fixed meaning (§3.1),
  so §3.2(a)'s pre-G-ValidR block lapses for them; `g0Guard`'s
  rigid-variable class (§3.2(b)) is unchanged. Under H-b instead,
  `openRequirements` would need the field types.
- **Task 6.4, RC3 (conditional, forward-looking).** RC3 evaluates
  only the `BQ` atoms the producing strategy validated (witness/
  statements.md RC3), and in this plan `pr` at a rigid variable stays
  Unsupported for every strategy (plan §1 item 1). So nothing changes
  now. The point arises only once some strategy discharges `pr` under
  `Q_imp` (Pr-1): a `pr` atom that held under `Q_imp` and fails at a
  key is then today's E017 user error (group 5), not a `ReCheckFailed`
  fault, and Task 6.4 must either separate the two or exclude atoms
  validated only under `Q_imp`. Under Pr-2 or Pr-3 the per-key `pr`
  failure cannot follow a Solved.
- **T-R0b §5.4** is edited after the gate: the definition of §4.2, the
  ground rule of §4.1, the revised VR-sub, VR-agree's argument and the
  VR-CX correction (with CX §4.1 condition 4); §11 item 16 closed or
  narrowed to the Lean rendering.

## 7. Provenance (ADR 014)

The parts are published: free constructor nodes are a term algebra
(the Herbrand universe); homomorphisms preserve satisfied equations
(Birkhoff 1935); rigid variables as skolem constants with given
constraints follow HM(X) (Odersky, Sulzmann and Wehr 1999) and
OutsideIn(X) (Vytiniotis et al. 2011), where a skolem meets exactly
the givens. Flagged for the author as composition specific to this
design: the universally quantified base valuation `κ` (F-a), and
`Q_imp`, an implicit printable given at every rigid variable whose
per-instance discharge happens after specialization rather than at the
call site.

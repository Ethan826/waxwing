# D1's mechanism: the generation continuation with tracked requests

Task 0.3 of the R0 implementation plan
(docs/plans/2026-10-22-r0-implementation-plan.md), gate **G-D1**
(technical). Date 2026-10-22, base 0a35bc8. A specification only: no
compiler change. Task 7.1, a later shadow tranche, implements it after
G-D1 closes and before Task 4.6.

Labels, as in the R0 documents: **cited** (file:line or section),
**argued** (reasoning, unchecked), **proposed** (a design choice).
Every type and invariant below is proposed; nothing here is proved or
run. A **check** names the Task 7.1 test that will back the claim
(§10).

Sources read: dossier §18.69 D1; inference extension
(docs/plans/2026-10-22-inference-foundations-extension.md) §2 (O27-O33)
and §10 D1; research/division-campaign/witness/statements.md ("W")
§0, §1.1-§1.6, §4 (Cov, Adapt-N), §5.1-§5.2;
research/division-campaign/r0/generation-interface.md ("T-R0a") §2,
§3.2-§3.3, §4.1-§4.2, §9; research/division-campaign/r0/
recorder-rules.md ("T-R0b") §2.2-§2.4, §3 (E25-E28, P4-P7), §4, §5.2,
§5.3, §6, §11 item 17; the plan's Task 3.2, 4.3, 4.4, 7.1 and 7.2
entries and rulings R2, R4, R10, R11; src/Domain/Checked/Internal.purs,
src/Domain/Type/Core.purs, src/Features/Check/Function.purs,
Scheme.purs, Lambda.purs, Call.purs, Failure.purs; scripts/
structure.mjs.

## 1. What this settles

| Item (brief; T-R0b §11 item 17; T-R0a §4.2 "Open") | Where |
|---|---|
| The request constructors (`readVar` and friends) | §3.2, §3.3 |
| Rejecting a read outside the tracked set before any witness exists | §5 |
| Scoped handles and problem identity | §6 |
| The new `generate` type and `Elaborating` | §3.4, §3.5 |
| Cov's domain: `requests` plus flexible variables outside `Recon` | §7 |
| `build` failing after a Cov-passing witness | §8 |
| How a `Free` binding elaborates | §9 |
| Acceptance tests for Task 7.1 | §10 |
| Published sources and new machinery | §2 |
| Restrictions, soundness and completeness passes | §11 |
| Points the gate must route (effect rows, T-R0b amendments) | §12 |

## 2. Sources, and what is new

The design is Pottier's applicative elaboration, split in two at the
point where Waxwing's witness is external to generation.

| Component here | Published source | Correspondence |
|---|---|---|
| `Elab s a`: static `uses` beside `Bindings → Either ElabFault a` | Pottier, Hindley-Milner Elaboration in Applicative Style (ICFP 2014) §4.3: `'a co` is a raw constraint paired with a function from the solved environment to `'a` | the static part is the set of reads instead of the raw constraint (the constraint is `Gen`'s output, §3.3) |
| `Elab`'s `Functor`/`Apply`/`Applicative`, no `Bind` | McBride and Paterson, Applicative Programming with Effects (JFP 2008): an applicative computation's effects are fixed before any value is seen; products of applicatives are applicative | `Elab s` is the product of `Const (Set Use)` and the reader `Bindings → Either ElabFault _` |
| Static analysis read off an applicative value | Swierstra and Duponcheel, Deterministic, Error-Correcting Combinator Parsers (AFP 1996): a static summary built beside the dynamic parser | `uses` is the summary; `seal` reads it without running `build` |
| `fresh` mints a handle only together with its `vars` entry | Pottier 2014 §4.3, `exist`: a variable is introduced only by the combinator that also declares it | `Gen`'s `fresh` (§3.3) |
| Rank-2 problem scope on handles | Launchbury and Peyton Jones, Lazy Functional State Threads (PLDI 1994): `runST ∷ (∀ s. ST s a) → a` keeps `s`-tagged references inside one run; PureScript's `Control.Monad.ST` uses the same type | `seal ∷ (∀ s. Gen s (Elab s a)) → Elaborating a` |
| Type elaboration by substitution | today's `substitute` and `spliceRecord` (src/Domain/Type/Core.purs:152-196), cited | `elabTy` substitutes read images into a generator type |
| Hidden constructors behind an import rule | AGENTS.md's Internal boundary; scripts/structure.mjs:27-31 | `Generate.Elab.Internal`, `Domain.Elaborating.Internal` |
| Free bindings as holes | today's `holes` (src/Features/Check/Scheme.purs:187-198) and W §1.5 | §9 |

**New, local machinery (flagged under ADR 014 clause 4).** None is a
new algorithm; each is a small local rule that needs the gate's
approval:

- N1. `seal`'s value-level check (§5, layer 2): uses against the
  problem's `vars`, with sorts.
- N2. `ElabFault`'s three constructors and their mapping to
  `BrokenInvariant` (§8).
- N3. The `elaborate` entry point's problem-equality check and its
  pre-`T1` refusal of `Named` bindings (§6.2, §8.3).
- N4. The derived position view `positionsOf` (§3.5) replacing the
  stored `position` field's role as a second source.
- N5. The split of Pottier's single `co` value into `Gen` (monadic,
  never sees a witness) and `Elab` (applicative, sees only bindings);
  argued harmless in §11.1 row R1.

Pottier's own correctness statements are unproved ("with a grain of
salt", extension §2, cited); citing §4.3 cites a design, not a theorem.

## 3. Types (PureScript, proposed)

### 3.1 Modules

| Module | Holds | Importers |
|---|---|---|
| `Domain.Elaborating` | `Elaborating`'s type and read-only accessors, `ElabFault`, `SealFault`, `Use` | anyone |
| `Domain.Elaborating.Internal` | `Elaborating`'s constructor | `Features.Check.Generate*` only (new structure rule) |
| `Features.Check.Generate.Elab` | `Elab`, its instances, `readType`, `readRow`, `elabTy`, `seal` | Generate* |
| `Features.Check.Generate.Elab.Internal` | `Elab`'s and `Handle`'s constructors | `Features.Check.Generate.Elab` and `Features.Check.Generate.Gen` only (new structure rule) |
| `Features.Check.Generate.Gen` | `Gen`, `fresh` | Generate* |
| `Features.Check.Elaborate` | `elaborate`, `covDomain` | the driver; tests |

`Elaborating` lives in Domain because `DeclReport` (Domain.Verdict,
ruling R2) will carry it from Task 4.6; it has no Features type in it.
The structure rules go into scripts/structure.mjs, docs/engineering.md
and AGENTS.md's Internal-boundary bullet in Task 7.1's commit.

### 3.2 Handles and `Elab`

```purescript
-- Features.Check.Generate.Elab.Internal
newtype Handle s = Handle Var      -- Var = ⟨p, role⟩ (T-R0b §2.3)

newtype Elab s a = Elab
  { uses ∷ Set Use                 -- static: what `run` may read
  , run  ∷ Bindings → Either ElabFault a
  }

-- Domain.Elaborating
type Use = { var ∷ Var, sort ∷ VarSort, site ∷ CheckedName }
type Bindings = Map Var Binding    -- W §1.6's Witness.bindings
```

`s` is phantom. `Handle`'s constructor is hidden, so a handle exists
only where `fresh` (§3.3) made one. `Elab`'s instances (in its own
module; PureScript forbids orphan instances, so no other module can
add one):

```purescript
instance Functor (Elab s)      -- uses unchanged; run mapped
instance Apply (Elab s)        -- uses: union; run: Either's apply
instance Applicative (Elab s)  -- pure: no uses; run: Right
-- no Bind, no Monad, no Alt: nothing can choose a read from a value
```

The request constructors, the only primitives that read the witness:

```purescript
readType ∷ ∀ s. CheckedName → Handle s → Elab s (Ty Open)
readRow  ∷ ∀ s. CheckedName → Handle s → Elab s (Ty Open)
```

`readType site (Handle v)` records `{ var: v, sort: TypeSort, site }`
and, when run, returns the binding's image: `Inline τ` gives `τ`, `Free i` gives
`TVar (Hole i)` (§9). `readRow` records `RecordSort` and returns a
record image: `Inline (TRecord r)` gives it, `Free i` gives
`TRecord { fields: [], tails: [Hole i] }`, `Inline` of anything else is
`Left (SortMismatch v)`. A missing binding is `Left (Unbound v)`.
`Named` bindings never reach them (§8.3).

One more primitive reads nothing: it lets a pure check on values
already read fail the run, and leaves `uses` unchanged.

```purescript
orFault ∷ ∀ s a b. (a → Either ElabFault b) → Elab s a → Elab s b
```

The friends are built from those three with `pure`, `map`, `apply` and
`traverse` only:

```purescript
-- A generator type: signature variables rigid, fresh ones handles.
data Ref s = RigidRef VarId | FlexRef (Handle s)
type GenTy s = Ty (Ref s)

-- Reads every handle in the type (TVar positions with readType,
-- record tails with readRow), then substitutes the images
-- (Domain.Type.Core.substitute). Which handles are read is a
-- function of the GenTy alone.
elabTy ∷ ∀ s. CheckedName → GenTy s → Elab s (Ty Open)

-- The checked instantiation, in the callee's variable order.
elabSlots ∷ ∀ s. Path → Array (GenTy s) → Elab s Instantiation
```

`elabTy` returns `Left (DuplicateLabel v l)`, through `orFault`, when
a spliced row image repeats a label already present (§8). `GenTy` also
yields the recorded `RTExpr` (T-R0b §2.2's `⟦·⟧`, with handles
forgotten to their `Var`), so a node's recorded type and its checked
type come from one value.

### 3.3 `Gen`: generation, which never sees a witness

```purescript
-- Writer over the problem's parts (vars, types, B, BQ, markers,
-- sites); hand-written, since pure layers import no Control.Monad.*
-- except Rec.Class (scripts/structure.mjs:19-22).
newtype Gen s a = Gen { value ∷ a, parts ∷ Parts }
instance Monad (Gen s)

-- The only way to obtain a handle: it writes the VarInfo of
-- ⟨path, role⟩ (sort, quant Exists, origin) into `parts.vars`.
fresh ∷ ∀ s. Path → Role → RuleId → Span → Gen s (Handle s)
```

`Gen` may be monadic: what it sequences are generation-time values
(handles, tables, children's results), never a solution. T-R0b §4's
applicative invariant ("no rule branches on a solved shape, a solver's
state or a witness") holds because `Gen` has no access to any of them.
The applicative restriction binds `Elab`, where the witness is.

### 3.4 `seal` and `Elaborating`

```purescript
-- Domain.Elaborating.Internal
newtype Elaborating a = Elaborating
  { problem ∷ RecordedProblem
  , uses    ∷ Set Use
  , build   ∷ Witness → Either ElabFault a
  }

-- Domain.Elaborating: read-only accessors (as ruling R4)
problem  ∷ ∀ a. Elaborating a → RecordedProblem
requests ∷ ∀ a. Elaborating a → Set Var     -- map _.var uses
build    ∷ ∀ a. Elaborating a → Witness → Either ElabFault a
untracked ∷ ∀ a. Elaborating a → Array SealFault   -- §5

data SealFault = UntrackedRead Var | SortClash Var

-- Features.Check.Generate.Elab
seal ∷ ∀ a. (∀ s. Gen s (Elab s a)) → Elaborating a
```

This keeps the brief's fields `problem`, `requests` and `build`, as
accessors of a newtype. **Deviation from the brief, with reason:** the
brief writes `Elaborating` as a record alias. A record alias can be
built anywhere with any `build`, which is a read that escapes tracking
(§11.2 S2), so the constructor is hidden. `uses` refines `requests`
with each read's sort and site; `requests` is derived from it.

`seal` runs the generator once, assembles the `RecordedProblem` from
`parts` (Domain.Recorded's constructor is Generate*-only, ruling R4),
copies the `Elab`'s `uses`, and wraps its `run` as `build w = run
w.bindings`. Because the argument is `∀ s.`, a handle cannot leave the
generation that minted it: `a` is bound outside `s`'s scope, so
`a = Handle s` is a skolem escape and does not typecheck.

### 3.5 `generate`, `positionsOf`, `elaborate`

```purescript
generate
  ∷ Tables → Signatures → Resolved.FunctionDecl
  → Elaborating Checked.FunctionDecl
generate tables signatures declaration =
  seal (generateIn tables signatures declaration)

generateIn
  ∷ ∀ s. Tables → Signatures → Resolved.FunctionDecl
  → Gen s (Elab s Checked.FunctionDecl)

-- Derived view (N4): where the checked IR reads each variable.
positionsOf ∷ ∀ a. Elaborating a → Map Var (Set CheckedName)

-- Features.Check.Elaborate
covDomain ∷ ∀ a. Set Var → Elaborating a → Set Var  -- Recon first

data Elaboration a
  = Elaborated a
  | NotCompiled NoWitnessReason   -- Cov refused, or a Named binding
  | Broken InternalFault          -- BrokenInvariant; stops the run

elaborate
  ∷ ∀ a. Set Var                  -- Recon (empty until G-Recon)
  → Elaborating a
  → RecordedProblem               -- the problem `decide` judged
  → Solution
  → Elaboration a
```

`generate` stays total (G-total): it always returns a value.
`Tables = { types, ctors, effects }` and `Signatures` are Task 3.2's.
Task 3.2's `generate ∷ … → RecordedProblem` becomes `problem <<<
generate` and keeps its tests.

`elaborate` is the only production caller of `build`, in this order:
the problem-equality check (§6.2); `NoWitness r` gives `NotCompiled r`;
a `Named` binding gives `NotCompiled (AdapterUnsupported …)` (§8.3);
Task 4.4's `coverage`, revised to take `covDomain` (§7), refusing with
`NotCompiled`; then `build`, whose `Left` is `Broken (BrokenInvariant
…)` (§8). The driver maps `NotCompiled r` to T-R0a's `AtS
(NoCompilation r)` and `Broken f` to `Faulted problem f`.

## 4. Invariants

Each is stated so a test can falsify it; §10 names the test.

- **St (static requests).** `requests e` is computed from `e` alone;
  its type takes no `Witness`. (By type.)
- **Tr (tracking).** For every `e ∷ Elab s a` built with the public
  API and all `w₁`, `w₂` whose bindings agree on `vars(uses e)`:
  `run e w₁ = run e w₂`. Equivalently, `run` reads no binding outside
  `uses`. Argued by induction on construction: `readType`/`readRow`
  read exactly the variable they record; `pure` reads none; `map` and
  `orFault` keep uses and reads; `apply` unions both. (Check: T4.)
- **Def (definedness).** If every `v ∈ requests e` has a binding of
  its recorded sort (a record image for `RecordSort`), then `run e w`
  is never `Left (Unbound _)` or `Left (SortMismatch _)`. (Check: T4.)
- **Mint (declared handles).** Every handle in scope `s` came from
  `fresh` in the same `Gen s`, which wrote its `VarInfo` with `quant =
  Exists`. Hence `requests (seal g) ⊆ flex(problem (seal g))` for code
  that does not import an Internal module. (By hidden constructors and
  `seal`'s rank-2 type; checks T3b, T3c.)
- **Sc (seal check).** `untracked (seal g) = []` iff every use `u`
  has `u.var ∈ flex(problem)` and `u.sort = sort(vars u.var)`.
  (Check: T3a.)
- **Id (problem identity).** A handle minted by one `seal` is not
  usable in another (rank-2, check T3c); `elaborate` refuses a
  `RecordedProblem` other than its own (§6.2, check T11).
- **Dom (Cov's domain).** `covDomain recon e = requests e ∪ (flex(P)
  ∖ recon)`. With `recon = ∅` it is `flex(P)`. (Check: T6.)
- **EL1.** For every `Witness w` with `Cov(w)` over `covDomain`,
  Adapt-N's conclusion (W §4) and R1 (W §4), `build e w = Right d`,
  and `d` is the checked declaration whose every type position is
  `elabTy` of its generator type under `w` (§9 for holes). (Check:
  T1, T2.)
- **Pos (derived positions).** `positionsOf e ! v` is the set of sites
  at which `build` reads `v`; `v` is auxiliary iff `v ∉ requests e`.
  T-R0b's stored `position` is a second source until Task 4.6 and must
  agree (§10 T5; known disagreements §12.2).
- **AI-IR (structure is static).** The checked IR's node structure
  (constructors, arities, spans, ids) is a function of the resolved
  declaration and the tables; only its `Ty Open` positions come from
  reads. Argued for over-application: `named` splits a call by the
  callee's *declared* arity (src/Features/Check/Call.purs:107-127), not
  a solved type. (Check: T2, which compares whole declarations.)
- **Hole.** `build` maps `Free i` to `Hole i` and renumbers the body's
  holes with today's `holes`; two bindings that share a hole number
  share a hole. (Check: T8.)

## 5. Rejecting a read outside the tracked set

"Outside the tracked set" can mean three things; each is rejected
before any witness exists, by a different layer.

1. **A read that `uses` does not record.** Not representable without
   an Internal module: the witness reaches only `Elab`'s `run`, and
   `run` is built only by the combinators of §3.2, each of which
   records what it reads (Tr). No `Bind` means no read can be chosen
   from a value read earlier. Enforcement: hidden constructors of
   `Elab`, `Handle` and `Elaborating`; the two new structure rules.
   scripts/structure.mjs already rejects `unsafe*` and `Partial`
   (:23, :85) and FFI outside Runtime (:103-105). This layer cannot be
   checked by running `seal` (an under-declared `run` looks the same
   from outside); it is checked by the Tr property over the public
   API (T4) and by the import rules (T3b).
2. **A read of a variable that is not a flexible variable of this
   problem, or at the wrong sort.** `untracked` compares `uses` with
   `problem.vars` (Sc). Mint makes `UntrackedRead` unreachable from
   public code; `SortClash` is reachable (a handle minted as a
   `TypeSort` variable placed in a record tail, where `elabTy` reads
   it with `readRow`). **Placement:** the driver (and Task 7.1's shadow
   harness) runs `untracked` immediately after `generate` and before
   `decide`. A non-empty result is `Faulted problem (BrokenInvariant
   …)` and stops the run (§18.69 Q13: generation is trusted code, R1's
   owner), so neither `decide` nor `build` runs. Why not inside
   `generate`: its type has no `Either`, and G-total keeps it total;
   the fault needs the problem, which the `Elaborating` carries.
3. **A read of another problem's variable.** `Var = ⟨p, role⟩` is
   path-relative (T-R0b §6: paths start at `f.body`), so `f` and `g`
   can have equal `Var`s and layer 2 cannot tell them apart. The rank-2
   scope rejects it at compile time (§6.1).

## 6. Problem identity

### 6.1 Handles: adopted, rank-2

D1 left scoped handles optional. **Adopted**, because of layer 3
above: without a scope, a handle from `g`'s generation used in `f`'s
`Elab` passes Sc whenever `f` has a variable at the same path and role,
and `build` would silently read `f`'s binding for it. A value tag (the
`FunctionId` in each handle, checked by `seal`) would also work; rank-2
is chosen because it costs nothing at run time, needs no new check,
and is the pattern PureScript's `ST` already uses. Its cost: a handle
cannot be cached across declarations, which nothing needs (generation
is per declaration, T-R0a §2 property 3).

### 6.2 Witnesses: an equality check in `elaborate`

Handles guard the `build` side only. A `Witness` is keyed by the same
path-relative `Var`s, so a witness for `g` handed to `f`'s `build`
could pass Cov when the two variable sets coincide. `elaborate` takes
the `RecordedProblem` that `decide` judged and requires it to equal
`problem e` (structural equality; atoms carry `AtomId.decl`, T-R0b §6,
so problems of different declarations differ). Inequality is `Broken
(BrokenInvariant "elaboration: problem mismatch")`. W's `Witness` is
unchanged. The check relies on a problem identifying its declaration;
if Task 3.1's `RecordedProblem` can have no atom, it should carry its
`FunctionId` as a field.

## 7. Cov's domain

W §4 states Cov's domain as `Req` plus every other flexible variable
not in `Recon`. Under this mechanism `Req = requests e`, so:

```text
covDomain recon e = requests e ∪ (flex(P) ∖ recon)
```

- By Mint, `requests e ⊆ flex(P)`. With `Recon = ∅` (§18.69 Q6; Task
  4.4) the domain is `flex(P)`: every flexible variable, requested or
  not, has a binding. This is Task 4.4's domain, so Task 7.1 changes
  no Cov outcome while `Recon` is empty.
- The union, rather than `flex(P) ∖ recon` alone, keeps a requested
  variable in the domain even if a later `Recon` contains it. W §1.6
  defines `Recon` outside `Req`; the union makes that a property of
  the formula, not a promise of `Recon`'s author. The case is real:
  E28's `⟨p, rest⟩` is listed by T-R0b §5.3 as reconstructable, yet
  the removal node's checked type is `{ ...⟨p, rest⟩ }` (E28's result,
  T-R0b §3.3), so `build` requests it (§12.2).
- Task 4.4's `coverage ∷ RecordedProblem → Witness → Either
  NoWitnessReason Unit` takes the domain as an argument from Task 7.1:
  `coverage ∷ Set Var → RecordedProblem → Witness → Either
  NoWitnessReason Unit`.

## 8. `build` failing after a Cov-passing witness

### 8.1 The constructors and why each is impossible

```purescript
data ElabFault
  = Unbound Var              -- a requested variable has no binding
  | SortMismatch Var         -- a RecordSort variable bound Inline
                             -- to a non-record type
  | DuplicateLabel Var String  -- a spliced row image repeats a label
```

| Constructor | Excluded by | Whose premise |
|---|---|---|
| `Unbound v` | Cov over `covDomain` ⊇ `requests` (§7) | Cov's validator (Task 4.4) |
| `SortMismatch v` | Cov-S: a binding's sort agrees with `vars` (W §5.2 "sorts are preserved"; proposed as an explicit Cov clause, §12.3) | Cov's validator |
| `DuplicateLabel v l` | Adapt-N's conclusion: every recorded atom is defined at every key, and R1: the recorder emits the definedness of every record type it builds | the adapter's owner; the recorder's |

With `Recon` empty, Cov's domain is every flexible variable, so
`Unbound` is impossible outright; the other two rest on trusted
premises. None rests on an untrusted search.

### 8.2 Classification: a broken invariant that stops the run

`elaborate` maps every `ElabFault` to `Broken (BrokenInvariant
(render fault))`, one named arm per constructor (no catch-all; each
arm tested by injecting the constructor, T7). `BrokenInvariant String`
is the `InternalFault` constructor Task 1.1 adds (plan, Task 1.1
interfaces). Under §18.69 Q13 and the G-Q13 reading confirmed in
§18.71 (ruling R10), a broken invariant in trusted code stops the run;
`build` and the adapter are inside the lowering trust boundary (T-R0a
§4.1), not an untrusted search, so `SearchBroke` does not apply. The
declaration becomes `Faulted problem fault`; its verdict is not
changed, and nothing is lowered.

### 8.3 What is not an `ElabFault`

- `NoWitness r`: no `build` is attempted; `NotCompiled r` (T-R0a §6).
- A `Named n` binding: until W §1.1's `Open` constructor `Named` and
  T1-a land, `elaborate` refuses before `build` with `NotCompiled
  (AdapterUnsupported NameMarker)`. `NameMarker` is a new `Feature`
  constructor (N3; W owns `Feature`). No strategy produces names in
  the shadow tranches (Task 4.4 gives `names: empty`).
- Cov refusing (`HoleContract v`, a missing auxiliary): `NotCompiled`,
  as Task 4.4 decides; `build` never runs on such a witness.

## 9. `Free` bindings: today's hole

Today `checkFunction` turns every meta still unsolved at the end into a
hole: `body: holes settled` (src/Features/Check/Function.purs:68-71
comment, :107), where `holes` renumbers the body's metas 0, 1, … in the
order `foldTypes` first meets them (src/Features/Check/Scheme.purs:
187-198). The online adapter (Task 4.4) binds a variable whose
read-back value is a bare meta `Hole m` to `Free m`, and keeps metas
inside `Inline` types as they are.

`build` therefore:

1. elaborates `Free i` as `TVar (Hole i)` in a type position and as
   the tail `Hole i` in a record row (§3.2);
2. leaves holes inside `Inline` types unchanged;
3. applies `holes` to the finished body, exactly as `checkFunction`
   does.

Renumbering depends only on the body's structure and on which hole
numbers are equal, not on the numbers themselves, so a `build` whose
body equals today's up to a renaming of metas yields today's body
exactly (argued). Hole identity across bindings is kept: two variables
bound `Free 7` become one hole. Lowering's defaults for holes (the
representative, or `{}` for a row, src/Features/Specialize/Lower.purs:
52, :62) are unchanged, and W §1.5's hole contract, checked by Cov,
decides whether `Free` is allowed at all.

`holes` lives in Features.Check.Scheme beside the checker's `State`.
Task 7.1 moves `holes` and `foldHoles` to their own module (a
behaviour-preserving refactor) so that the generator imports no
checker state (the plan's Task 7.1 import test).

## 10. Acceptance tests for Task 7.1

Fixtures follow docs/engineering.md. Property tests use a seeded
generator whose grammar is fixed in the test file before it is run.
Corpus-wide tests are `*.serial.test.mjs` (ruling R11).

| Id | Statement | Backs | Oracle and fixtures |
|---|---|---|---|
| T1 | EL1: for every corpus declaration the online strategy accepts with a `Witnessed w` that passes Cov, `elaborate` gives `Elaborated` | EL1 | the R0 corpus (test/r0-corpus.mjs); Task 4.3's online certificate |
| T2 | Same checked IR as read-back: `build w` equals the certificate's `checked` (canonical serialization, test/r0-canonical.mjs). Exact for declarations with no variable in `Amb`; otherwise at every site whose type and slots mention no `Amb` variable, up to one hole bijection per declaration. `Amb` is the set of flexible variables occurring in a record of some `types(p)` with two or more flexible tails (T-R0b §5.3's ambiguity criterion). The test prints the excluded-site count | EL1, AI-IR, Hole | corpus; effect rows per §12.1 |
| T3a | `untracked` rejects, before any witness: an `Elab` forged through the Internal module that reads a `Var` absent from `vars`, and a generator that places a `TypeSort` handle in a record tail (`SortClash`). The shadow harness then gives `Faulted … BrokenInvariant`, and an injected stub strategy records that `decide` was never called | Sc, §5 layer 2 | two injected generators |
| T3b | Import rules: only the listed modules import the two new Internal modules; generator modules import neither `Features.Check.Scheme`'s `State` nor any checker module | Mint, §5 layer 1 | test/structure.test.mjs |
| T3c | Compile-time rejection: fixture modules that (i) return a handle out of `seal`, (ii) use a handle from one `seal` inside another, (iii) use `bind` on `Elab`, each fail to compile with the expected error class (escaped skolem; no `Bind` instance). The compile reuses existing output as externs and cleans its copy up; the fixtures obey the style rules, which scripts/structure.mjs applies to every .purs under test/ | Id, Tr | `test/fixtures/r0/elab-scope/*.purs`; real `purs` |
| T4 | Tr and Def as properties: random `Elab` terms over the public API (`readType`, `readRow`, `orFault`, `elabTy`, `pure`, `map`, `apply`, `traverse`) inside one `seal`; (a) bindings changed outside `requests` never change the result; (b) witnesses binding exactly `requests` at their sorts never give `Unbound` or `SortMismatch` | Tr, Def | seeded generator |
| T5 | Positions derived: for every corpus declaration, `v ∉ requests` iff T-R0b's stored `position v = Auxiliary`, and a stored non-auxiliary position lies in `positionsOf e ! v`; disagreements fail except the rows §12.2 lists, each asserted by name | Pos | corpus; Task 3.2's `vars` |
| T6 | Cov's domain: `covDomain ∅ e = flex(P)`; with an injected `recon` containing a requested variable, that variable stays in the domain | Dom | unit |
| T7 | Each `ElabFault` constructor injected into `elaborate` gives `Broken (BrokenInvariant …)` and the driver stops; `NoWitness` and a `Named` binding give `NotCompiled` and `build` is not run | §8 | injected `Elaborating` values |
| T8 | `Free`: a witness binding two variables `Free 5` and one `Free 2` yields two holes numbered as `holes` numbers them, and equals today's IR on hole-bearing corpus declarations | Hole | unit; corpus subset of T2 |
| T9 | Applicative laws for `Elab` (identity, composition, homomorphism, interchange) on both `uses` and `run` | §3.2 | seeded generator |
| T10 | T-R0b §4's invariant: `Features.Check.Generate*` imports no checker state and no `Witness` accessor outside `Generate.Elab` | AI-IR | import graph |
| T11 | `elaborate` with a `RecordedProblem` of another declaration gives `Broken (BrokenInvariant "elaboration: problem mismatch")` | Id | two declarations with equal `Var` sets |

**Regression rows** (scripts/regression-r0.mjs, probes in
test/regression-r0.mjs; each shown failing with its defect restored):

- `r0-elab-untracked-read`: `readRow` stops recording its use; T4(a)'s
  probe must fail.
- `r0-elab-free-not-hole`: `Free i` elaborated as the representative
  type instead of `Hole i`; T8's probe must fail.
- `r0-elab-fault-continues`: `ElabFault` mapped to a non-stopping
  record; T7's probe must fail.
- `r0-elab-wrong-problem`: the problem-equality check removed; T11's
  probe must fail.

## 11. Adversarial review (procedure: docs/engineering.md)

This section is the author-side half of the review: the restrictions
table and the two passes. The independent reviewer, told to find a
read that escapes tracking, is dispatched separately and is not part
of this document.

### 11.1 Restrictions table

| Row | Restriction beyond the semantics | Why believed harmless | Challenge |
|---|---|---|---|
| R1 | `Gen` is monadic, `Elab` applicative (Pottier keeps one applicative value) | `Gen` never receives a solution, so its sequencing cannot depend on one; T-R0b §4's invariant is about solved shapes, not about sequencing handles | a rule that wants the solved type of a child to choose its node: impossible in `Gen` (no witness in scope) and in `Elab` (no `Bind`); such a rule is a design change (extension §2 "Challenges" 2) |
| R2 | No `Bind` on `Elab`: no read chosen from a value | no R0 rule branches on a solved shape (T-R0b §4); the checked IR's structure is static (AI-IR) | over-application: `Call` plus `Apply` is chosen by declared arity (Call.purs:107-127); T2 compares whole declarations, so a hidden dependence fails it |
| R3 | `requests` over-approximates reads | `run` reads at most `requests` (Tr); a larger domain only binds more, which Cov already does with `Recon = ∅` | a `pure`-only `Elab` (a literal): no requests, no reads |
| R4 | Handles cannot leave one `seal` | generation is per declaration (T-R0a §2 property 3) | caching a callee's instantiated signature with handles across declarations: not done; signatures are instantiated per occurrence (G-fresh) |
| R5 | `build` reads `bindings` only, never `names` or terms | `Named n` is copied into the IR as a marker; lowering evaluates terms per key (W §1.3) | a `Named` binding before `Open.Named` exists: refused with `NotCompiled` (§8.3) |
| R6 | Each use carries a sort fixed by its position (`TVar` vs tail) | `Ty` gives each variable one sort by construction (src/Domain/Type/Core.purs:54-55) | a generator bug placing a type handle as a tail: `SortClash` (T3a) |
| R7 | `Elaborating`'s constructor is hidden | the brief's fields stay readable through accessors | a record literal with an arbitrary `build`: does not compile outside Generate* |
| R8 | Effect rows are not problem variables, so `build` cannot read them | none yet: this is open | §12.1 |

### 11.2 Soundness pass: making `build` read outside tracking, or
succeed wrongly

- S1. A handle from `g`'s generation inside `f`'s `Elab`: rejected by
  rank-2 (§6.1; T3c (ii)). Without it Sc would pass (§5 layer 3).
- S2. An `Elaborating` whose `build` reads freely: requires the hidden
  constructor (R7); the brief's record alias would have allowed it.
- S3. An `Elab` forged through Internal with a `run` reading more than
  `uses`: not detectable by `seal` (§5 layer 1). Confined by the
  import rule to two modules (T3b) and by Tr over the public API
  (T4). This is the residual trust: the two Internal-importing modules
  must be correct, and they are small.
- S4. A witness for another declaration: `elaborate`'s problem check
  (§6.2; T11). Without it, path-relative `Var`s could make Cov pass.
- S5. A requested variable later placed in `Recon` and left unbound:
  kept in the domain by the union (§7; T6).
- S6. A witness with extra bindings outside the domain: ignored by
  `build` (Tr); harmless.
- S7. A `RecordSort` variable bound `Inline Int`: `SortMismatch`, a
  broken invariant (Cov-S should have refused it, §12.3).
- S8. A read whose value is not in the witness: effect rows (§12.1),
  the one case found. Its candidate escape route, reading today's
  checker state for them in `build`, is excluded by T10's import test,
  so until §12.1 is decided `build` cannot produce them at all.
- S9. Two strategies' different witnesses for one problem: `build`
  elaborates whichever witness was accepted; choosing between them is
  G3's and forcedness's (W §1.7), not this mechanism's.

### 11.3 Completeness pass: making a valid construction fail

- C1. A declaration the online strategy accepts with a covered
  witness, and `build` returns `Left`: by §8.1 only if Cov-S, Adapt-N
  or R1 fails, each a broken invariant. T1 runs the corpus.
- C2. A valid read rejected by `untracked`: only if a variable is used
  at two sorts, which `Ty` forbids (R6), or a handle's `VarInfo` is
  missing, which `fresh` forbids (Mint).
- C3. Valid witnesses with `Named` bindings: refused until T1 lands
  (§8.3). A stated limitation, not a verdict change.
- C4. An ambiguous site (several flexible tails): `build` gives the
  witness's choice, which may differ from today's solver; T2 excludes
  such sites and reports their count rather than failing.
- C5. Effect-bearing declarations: `build` cannot fill their effect
  positions (§12.1).
- C6. Hole numbering: equal up to renaming suffices (§9); T8 and T2
  check it.

## 12. Points for the gate

### 12.1 Effect rows are outside the witness (open; blocks Task 4.6)

The checked IR carries effect rows: every `TFun a row b`, a
declaration's `row ∷ TyRow Open`, the rows of `TData` and `THandler`,
and a `fail` payload, which is a `FailEffect` label's argument
(src/Domain/Checked/Internal.purs:45-54;
src/Features/Check/Failure.purs:43-47). Today they are inferred: a
lambda's row starts as a fresh meta (src/Features/Check/Lambda.purs:
37). The recorder erases effect rows (T-R0b §2.2, `TFun` row and
`RowSort` variables), so no problem variable stands for them, no
witness binds them, and no `Elab` read can produce them. A `build`
that took them from the online solver would read solver state outside
tracking, the escape D1 exists to prevent.

Options, for the author with T-R0b's owner:

- E-a (recommended): effect-row metas become flexible problem
  variables of a third sort with canonical names (for example
  `⟨p, effect⟩` for a lambda, `⟨p, inst i⟩` for a callee's `RowSort`
  variable), with **no atoms**: their obligations stay erased, and
  G-erased is unchanged. The witness binds them; the online adapter
  reads them back like any slot; `elabTy` reads them through a third
  primitive. Cost: T-R0b's `vars` and §2.2 change, Cov's domain grows,
  and a strategy that does not model effects cannot elaborate an
  effectful declaration (`NotCompiled`).
- E-b: `build` takes a second, injected effect elaboration beside the
  witness. Changes the brief's `build` type and leaves that input
  untracked.
- E-c: lowering stops reading effect rows from the checked IR. Needs
  an audit of specialization keys, which carry an effect component.

Until this is decided, Task 7.1 may land the type-sorted and
record-sorted parts: its `build` fills effect positions with the
closed empty row, T2 compares the effect-erased projection of both
sides, and Task 4.6 stays blocked. The scope of T2 is then narrower
than the brief's "same checked IR", and says so in its name.

### 12.2 T-R0b amendments the derived positions predict

Under D1 a variable's position follows from what `build` reads (Pos),
so T-R0b §5.2's table becomes a check. Two disagreements are
predicted from T-R0b's own rules (argued, not run):

- E28's `⟨p, rest⟩` is assigned `Auxiliary`, but E28's result type is
  `{ ...⟨p, rest⟩ }`, which is the `RecordRemoval` node's checked
  type, so `build` reads it. Proposed amendment: `NodeType p` (one
  flexible tail, so read-back there is unique).
- P4's `⟨p, inst i⟩` is assigned `Slot p i`, but a checked `Ctor`
  pattern has no instantiation (`Shape`'s `Ctor CtorId (Array
  Pattern)`, src/Domain/Checked/Internal.purs:125-130); the variable is
  read only inside the pattern's type. Proposed: its position is the
  set `positionsOf` reports (`PatternType p`), and `Slot` is reserved
  for nodes that carry an `Instantiation`.

T5 asserts both by name; any other disagreement fails it.

### 12.3 Changes this implies for the owning documents

Listed for their owners; this task edits none of them.

- T-R0a §4.2 "Read-back and D1": `generate`'s type (§3.5),
  `Elaborating` (§3.4), `elaborate` and its outcomes (§3.5, §8).
- T-R0b §5.3 and §11 item 17: the mechanism is §3-§6; `position`
  becomes a check against `positionsOf` (§12.2).
- W §1.6 and §4 Cov: `Req = requests e`; the domain formula (§7);
  Cov-S, binding sorts agree with `vars`, as an explicit clause;
  `NameMarker` as a `Feature` (§8.3).
- The plan's Task 4.4: `coverage` takes the domain (§7). Task 7.1:
  the tests of §10 replace its acceptance list.

### 12.4 What the gate is asked to accept

1. Rank-2 handles plus the `elaborate` problem check as the identity
   mechanism (§6).
2. The placement of `untracked` after `generate`, keeping `generate`
   total (§5 layer 2).
3. The newtype for `Elaborating` instead of a record alias (§3.4).
4. N1-N5 as local machinery (§2).
5. §12.1's routing: E-a recommended; Task 7.1 may land the rest first,
   with T2 effect-erased and Task 4.6 blocked until decided.

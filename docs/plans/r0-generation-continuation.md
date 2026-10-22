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

Terminology. `TypeSort` and `RecordSort` here are T-R0b's `VarInfo.sort`
values `Type` and `Row` (record rows; effect rows are erased, T-R0b
§2.2); `EffectRowSort` is new (§3.2, N7). `CheckedName` is T-R0b
§5.2's. Revised in fix round 1 after the task review and the G-D1
adversarial review (findings 1-19, §11).

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
| Nominal roles on scope-tagged types | PureScript's `Control.Monad.ST.Internal`: `type role ST nominal representational`, `type role STRef nominal representational` (.spago/p/st-6.2.0/src/Control/Monad/ST/Internal.purs:36, :114), cited | `type role Handle nominal`, `type role Elab nominal representational`, `type role Gen nominal representational` (§3.2, §3.3); part of the `ST` source, not new |

**New, local machinery (flagged under ADR 014 clause 4).** None is a
new algorithm; each is a small local rule that needs the gate's
approval:

- N1. `untracked`, the value-level seal check (§5, layer 2): uses
  against the problem's `vars`, with sorts, auxiliary sites,
  duplicate `fresh` calls, duplicate sites and handles at rigid
  sites, counted from append-only logs.
- N2. `ElabFault`'s four constructors and their mapping to
  `BrokenInvariant` (§8).
- N3. `elaborate`'s pre-`build` checks: `untracked`, the `Judged`
  pairing of problem and solution (§6.2), and the refusal of `Named`
  bindings before W's T1 (§8.3).
- N4. The derived position view `positionsOf` (§3.5) replacing the
  stored `position` field's role as a second source.
- N5. The split of Pottier's single `co` value into `Gen` (monadic,
  never sees a witness) and `Elab` (applicative, sees only bindings);
  argued harmless in §11.1 row R1.
- N6. `orFault`, a fault-raising combinator that reads nothing. It is
  Internal: the public API raises a fault only through `elabTy`'s
  label check (§3.2).
- N7. Sort fixed by position: `elabTy` reads a handle in a `TVar`
  position as `TypeSort`, in a record tail as `RecordSort`, and in an
  effect-row tail as `EffectRowSort`, which no variable has until
  §12.1 is settled, so Sc rejects it (§3.2, §5).
- N8. If E-a is adopted (§12.1): effect-row metas as atom-free
  flexible variables of a third sort.

Not new, but stated for completeness: the role annotations (from the
`ST` source above) and the import rules (AGENTS.md's Internal
boundary pattern).

Pottier's own correctness statements are unproved ("with a grain of
salt", extension §2, cited); citing §4.3 cites a design, not a theorem.

## 3. Types (PureScript, proposed)

### 3.1 Modules and import rules

**Placement.** In PureScript a newtype's type and its constructor
are declared in one module, and a module can export an imported type
only by re-exporting a module. So each hidden-constructor type is
declared in an `.Internal` module, and its public module re-exports
the type by name in **the allowed form**, the only re-export this
design permits:

```purescript
module Domain.Elaborating (module Exports, problem, requests, …) where
import Domain.Elaborating.Internal (Elaborating) as Exports
-- the import list names the type without (..): no constructor
```

Every module below has an explicit export list. **Rule E6**
(re-exports): an export list may contain `module X` only in the
allowed form, and the check resolves `X` to every import bound to it.
`X` must be an alias; every import bound to `X` must be `import
<paired>.Internal (T₁, …, Tₙ) as X`, listing bare type names (no
`(..)`, no values, no `hiding`, not an open import), from the
`.Internal` module the table below pairs with the exporting module
(for `Generate.Gen`, `Generate.Elab.Internal`); and no other import
may use the alias `X`. Two stated exceptions:

- `Generate.Elab` re-exports `Ref(..)` and the synonym `GenTy` from
  `Generate.Elab.Internal`. Chosen over making `elabTy` parametric in
  how it unwraps a ref, because it keeps one `Ref` type and one
  `elabTy`, and it is safe: `FlexRef` only wraps a handle `fresh`
  minted, rank-2 gives no foreign handle, and `Ref s` inherits
  `Handle`'s nominal role (the reviewer checked that `coerce ∷ Array
  (Ref s) → Array (Ref t)` fails to compile).
- `Features.Check.Generate` re-exports the synonyms `Tables` and
  `Signatures` from `Features.Check.Generate.Tables` (below).

E6 applies to every restricted module: those of rules E1-E5 and
`Domain.Recorded.Internal` (ruling R4), on which `seal` and `Judged`'s
equality rely. `purs graph` cannot see re-exports (the reviewer showed
a module importing only `Gen` calling a function `Gen` re-exported,
and a user of an `as Exports` alias with `(..)` building `T 3`), so
E6 is checked from the source's export lists and import lists, in
T3b.

| Module | Declares or holds | Importers |
|---|---|---|
| `Domain.Elaborating.Types` | `Use`, `UseSort`, `ElabFault`, `SealFault` (plain data, no hidden constructor) | anyone |
| `Domain.Elaborating.Internal` | `Elaborating` (type and constructor) | `Domain.Elaborating`, `Domain.Elaborating.Build`, `Features.Check.Generate.Elab` only (rule E2) |
| `Domain.Elaborating` | re-exports the type `Elaborating`; the accessors `problem`, `requests`, `untracked`, `positionsOf` | anyone |
| `Domain.Elaborating.Build` | the accessor `build` | `Features.Check.Elaborate` only (rule E1) |
| `Domain.Verdict.Judged.Internal` | `Judged` (type and constructor, §6.2) | `Domain.Verdict.Judged`, `Features.Check.Decide` only (rule E5) |
| `Domain.Verdict.Judged` | re-exports the type `Judged`; `judgedProblem`, `judgedSolution` | anyone |
| `Features.Check.Generate.Elab.Internal` | `Handle`, `Elab`, `Gen`, `Ref` (types, constructors, and all their instances, so none is an orphan), `GenTy`; `orFault`, `elabTy`, `elabSlots` | `Features.Check.Generate.Elab`, `Features.Check.Generate.Gen` only (rule E4) |
| `Features.Check.Generate.Elab` | re-exports the types `Handle` and `Elab`, and `Ref(..)`, `GenTy` (E6 exception); `readType`, `readRow`, `seal` | Generate* (rule E3) |
| `Features.Check.Generate.Gen` | re-exports the type `Gen`; declares `GenEntry(..)` (§3.3); `fresh`, `positioned`, `slots`, `emit` | Generate* (rule E3) |
| `Features.Check.Generate.Tables` | the synonyms `Tables`, `Signatures` | Generate* (rule E3) |
| `Features.Check.Generate.Static` | `staticRules` (plan Task 3.2) | Generate* (rule E3) |
| `Features.Check.Generate.Body` and every other `Features.Check.Generate.*` module (rule modules) | `generateIn` and the rules | Generate* (rule E3) |
| `Features.Check.Generate` | the enumerated allowlist below | anyone in Features or later |
| `Features.Check.Elaborate` | `elaborate`, `covDomain` | the driver; tests |

`Domain.Verdict.Internal` is plan Task 1.1's module (`Valid`,
`Refuted`, `NonForced`, `ForcednessEvidence`; importers
`Strategy.Substitution`, `Refute.Rules`, `Admit.Forcedness.Check`, and
`Domain.Verdict` for its re-export). This design leaves it untouched:
`Judged` has its own Internal module, so `Decide` gains no way to mint
`Valid` or `Refuted`, and the trusted checkers keep theirs.

Rule E3 covers **every** module matching `^Features\.Check\.Generate\.`:
each is importable only by modules matching
`^Features\.Check\.Generate(\.|$)`. The only public generator module
is `Features.Check.Generate`. Its export list is the enumerated
allowlist `(generate, staticRules, module Exports)`, where `Exports`
binds only `import Features.Check.Generate.Tables (Tables,
Signatures) as Exports`, and `staticRules` is a value defined in
`Features.Check.Generate` that delegates to `Generate.Static` (a
definition, not a re-export, so E6 is not involved). No
`emptyProblem`: ruling R2 forbids a production one (the plan's draft
placed it here). No listed signature mentions `Gen`, `Elab`, `Handle`
or `Elaborating`'s constructor; T3b asserts the list exactly. Static
stays inside E3: the driver reaches it only through this wrapper.
Every regex is anchored as written, so that, for example,
`Features.Check.GenerateX` matches neither.

Why (adversarial finding 1, and N1 of its re-review): without these
rules any module, including today's checker, which holds `State`,
could write `seal (map (map (const solved)) (generateIn t s d))`. That
value has the real problem and the real `uses`, so `untracked`, Cov
and the problem check all pass, while `build` returns IR read outside
tracking. E3 keeps `seal`, `Gen`, `Elab` and `generateIn` inside
Generate*; E6 stops `Features.Check.Generate` (or any module) from
laundering them by re-export; T10 checks that Generate* modules reach
no checker state, transitively. `Elaborating` itself has no `Functor`
instance and no `map`-like function, for the same reason (§3.4).

**Pinned export lists** (re-review NB9). A module that may import an
Internal module could otherwise export a wrapper, such as a
`mkElaborating`, which E6 does not see. T3b therefore pins the exact
export lists of `Domain.Elaborating`, `Domain.Elaborating.Build`,
`Domain.Verdict.Judged`, `Features.Check.Elaborate`,
`Features.Check.Decide`, `Features.Check.Generate`, and the two
Generate* modules that may import `Generate.Elab.Internal` (rule E4):
`Generate.Elab`, exactly `(module Exports, readType, readRow, seal)`
with `Exports` = `Handle`, `Elab`, `Ref(..)`, `GenTy`, and
`Generate.Gen`, exactly `(module Exports, GenEntry(..), fresh,
positioned, slots, emit)` with `Exports` = `Gen`. An added export
fails the test until it is reviewed and the pinned list updated; in
the last two, an export such as `mkGen ∷ a → Parts → Gen s a` would
reopen S14 and Mint for every other Generate* module.

`Elaborating` lives in Domain because `DeclReport` (Domain.Verdict,
ruling R2) will carry it from Task 4.6; it has no Features type in it.
No module cycle: `Domain.Elaborating.Types` imports neither Internal
module, and both `Domain.Elaborating.Internal` and `Domain.Elaborating`
import it; `Ref`, `GenTy` and `elabTy` are all in
`Generate.Elab.Internal`, which imports neither public module.
Rules E1-E6 go into scripts/structure.mjs (E6 as a source check of
export and import lists), docs/engineering.md and AGENTS.md's
Internal-boundary bullet in Task 7.1's commit.

### 3.2 Handles and `Elab`

```purescript
-- Features.Check.Generate.Elab.Internal
newtype Handle s = Handle Var      -- Var = ⟨p, role⟩ (T-R0b §2.3)
type role Handle nominal

newtype Elab s a = Elab
  { uses ∷ Set Use                 -- static: what `run` may read
  , run  ∷ Bindings → Either ElabFault a
  }
type role Elab nominal representational

-- Domain.Elaborating.Types (unrestricted; no cycle, §3.1)
type Use = { var ∷ Var, sort ∷ UseSort, site ∷ CheckedName }
data UseSort = TypeSort | RecordSort | EffectRowSort
type Bindings = Map Var Binding    -- W §1.6's Witness.bindings
```

`s` is phantom. Without the role annotations, `coerce ∷ Handle s →
Handle t` and `coerce ∷ Elab s a → Elab t a` compile in a module that
cannot see the constructors (checked by the reviewer with purs
0.15.16; adversarial finding 3), which would defeat the rank-2 scope.
`Safe.Coerce` is already outside the pure layers' library allowlist
(scripts/structure.mjs:19-22), but Runtime, Program and tests may
import it, so the roles are needed.

`Handle`'s constructor is hidden, so a handle exists only where
`fresh` (§3.3) made one. `Elab`'s instances live in
`Generate.Elab.Internal`, where the type is declared (an instance
anywhere else is an orphan, which purs rejects):

```purescript
instance Functor (Elab s)      -- uses unchanged; run mapped
instance Apply (Elab s)        -- uses: union; run: Either's apply
instance Applicative (Elab s)  -- pure: no uses; run: Right
-- no Bind, no Monad, no Alt: nothing can choose a read from a value
```

PureScript forbids orphan instances, so `Bind (Elab s)` can be
declared only in `Generate.Elab.Internal` or in the module of a class
`Bind`;
neither will hold one. A module that defines its own class may give
`Elab` an instance, which is harmless: it cannot be implemented
without the hidden constructor.

The request constructors, the only public primitives that read the
witness:

```purescript
readType ∷ ∀ s. CheckedName → Handle s → Elab s (Ty Open)
readRow  ∷ ∀ s. CheckedName → Handle s → Elab s (Ty Open)
```

Both return the binding's image as it stands in a type position, the
form today's checked IR stores in an instantiation slot (a RecordSort
slot is `TVar (Hole n)` until solved, src/Features/Check/Scheme.purs:
120 `instantiate`; src/Features/Specialize/Values.purs:96-99 `slotType`
normalises it later):

| Binding | `readType` | `readRow` |
|---|---|---|
| `Inline τ` | `τ` | `τ`, if `τ` is a `TRecord` or a `TVar`; otherwise `Left (SortMismatch v)` |
| `Free i` | `TVar (Hole i)` (§9) | `TVar (Hole i)` |
| `Named n` | `Left (NamedUnread v)` | `Left (NamedUnread v)` |
| absent | `Left (Unbound v)` | `Left (Unbound v)` |

`readType site (Handle v)` records `{ var: v, sort: TypeSort, site }`;
`readRow` records `RecordSort`. A `TVar` image of a record tail is a
renaming, exactly as Core's `imageOf` treats it (`TVar variable →
Renamed variable`, src/Domain/Type/Core.purs:198-202), so `elabTy`
splices a `TRecord` image and renames a `TVar` one. `NamedUnread`
never occurs through `elaborate`, which refuses `Named` bindings first
(§8.3); it exists so that `build` is total.

Generator types, declared in `Generate.Elab.Internal` (beside
`elabTy`, which needs them, so there is no cycle) and re-exported by
`Generate.Elab` with **public** constructors (`Ref(..)`, E6's stated
exception), so rule modules can build them. This is safe: `FlexRef`
only wraps a handle that `fresh` already minted, and `Ref s` inherits
`Handle`'s nominal role.

```purescript
-- Features.Check.Generate.Elab.Internal
-- A generator type: signature variables rigid, fresh ones handles.
data Ref s = RigidRef VarId | FlexRef (Handle s)
type GenTy s = Ty (Ref s)
```

Internal helpers (in `Generate.Elab.Internal`, used only by `Gen`'s
primitives of §3.3):

```purescript
-- Lets a pure check on values already read fail the run; reads
-- nothing; uses unchanged.
orFault ∷ ∀ s a b. (a → Either ElabFault b) → Elab s a → Elab s b

-- Reads every handle in the type, the sort fixed by its position:
-- TVar positions with readType, record tails with readRow, effect-row
-- tails with an EffectRowSort use (N7); then substitutes the images
-- (Domain.Type.Core.substitute) and checks labels with orFault.
elabTy ∷ ∀ s. CheckedName → GenTy s → Elab s (Ty Open)

-- The checked instantiation, in the callee's variable order; each
-- slot read by its declared sort (RecordSort slots with readRow).
elabSlots
  ∷ ∀ s. Path → Array (Tuple UseSort (GenTy s)) → Elab s Instantiation
```

`elabTy` returns `Left (DuplicateLabel v l)` when a spliced row image
repeats a label already present (§8). An effect-row tail handle is
recorded, never dropped: its `EffectRowSort` use fails Sc while no
variable has that sort (§5, §12.1).

With `orFault`, `elabTy` and `elabSlots` Internal, the public API that
can build an `Elab` is `readType`, `readRow`, `pure`, `map`, `apply`,
`traverse`, and `Gen`'s `positioned` and `slots` (§3.3), whose only
fault beyond the read faults is `elabTy`'s `DuplicateLabel`.
(`emit`, §3.3, builds no `Elab`.)

### 3.3 `Gen`: generation, which never sees a witness

```purescript
-- Features.Check.Generate.Elab.Internal (constructor hidden, rule
-- E4; re-exported as a type by Generate.Gen). A writer over Parts;
-- hand-written, since pure layers import no Control.Monad.* except
-- Rec.Class (scripts/structure.mjs:19-22).
newtype Gen s a = Gen { value ∷ a, parts ∷ Parts }

-- Every part is an append-only log; `seal` builds the maps from
-- them, so a second write is visible, never collapsed by a union.
type Parts =
  { vars    ∷ Array (Tuple Var VarInfo)  -- written only by `fresh`
  , sites   ∷ Array (Tuple CheckedName RTExpr)
                                         -- only by `positioned`,
                                         -- `slots`; NodeType and
                                         -- PatternType become `types`
  , d       ∷ Array Atom                 -- the rest only by `emit`
  , b       ∷ Array Entry
  , bq      ∷ Array Entry
  , outside ∷ Array Entry                -- the `outside` markers
  , adm     ∷ Array Entry
  , split   ∷ Array Entry
  }
type role Gen nominal representational
instance Monad (Gen s)          -- in the same module: not an orphan

-- The only way to obtain a handle: it writes the VarInfo of
-- ⟨path, role⟩ (sort, quant Exists, origin) into `parts.vars` and
-- counts the call, so a second `fresh` of the same Var is detected
-- (§5, `DuplicateFresh`).
fresh ∷ ∀ s. Path → Role → RuleId → Span → Gen s (Handle s)

-- The only way to elaborate a generator type: records it under its
-- site (table below; T-R0b §2.2's ⟦·⟧, handles forgotten to their
-- Var) and returns the read.
positioned ∷ ∀ s. CheckedName → GenTy s → Gen s (Elab s (Ty Open))
-- The same for an instantiation, recorded under Slot p i.
slots
  ∷ ∀ s. Path → Array (Tuple UseSort (GenTy s))
  → Gen s (Elab s Instantiation)

-- Features.Check.Generate.Gen (emit and GenEntry; GenEntry has
-- public constructors and is declared here, not in the Internal
-- module, so rule modules can build entries; Generate.Gen imports
-- Generate.Elab.Internal and not the reverse, so no cycle).
-- Records one entry of T-R0b §2.4's C: a D, B or BQ atom, an
-- `outside` marker, or an `adm` or `split` site record, with its
-- origin. Entries are written over Ref s, so every variable an atom
-- mentions is a minted handle (forgotten to its Var). It writes only
-- d, b, bq, outside, adm and split: never vars, sites or types.
emit ∷ ∀ s. GenEntry s → Gen s Unit
data GenEntry s
  = EmitD (Atom (Ref s)) | EmitB (Atom (Ref s))
  | EmitBQ (ReqAtom (Ref s)) | EmitOutside Marker Origin
  | EmitAdm Site | EmitSplit Site
```

`emit` maps each `GenEntry` to its `Parts` log, forgetting every `Ref
s` (a `FlexRef` to its handle's `Var`, a `RigidRef` to its rigid
variable): `EmitD` to `d`, `EmitB` to `b`, `EmitBQ` to `bq`,
`EmitOutside` to `outside`, `EmitAdm` to `adm`, `EmitSplit` to
`split`. The field types in `Parts` are a sketch of those forgotten
forms.

Gen's constructor is hidden (rule E4), so no Generate* module can
rebuild a `Gen` with edited `parts`, for example with a `vars` entry
dropped, which would defeat `DuplicateFresh` and Mint. The four
primitives partition the parts: only `fresh` writes `vars`, only
`positioned` and `slots` write `sites` (and so `types`), and only
`emit` writes the entries. A rule module therefore produces its
whole `RecordedProblem` through them, and each rule's definedness
atoms (T-R0b §3) go through `emit`.

**How recording is keyed, per `CheckedName` site** (T-R0b §5.2's
constructors, plus the proposed `ClauseParamType`, §12.2). T-R0b's
`types` is a `Map Path RTExpr` holding the type of every expression
and pattern node; the other sites share a path with a node, so they
go to a separate site table that is part of `Elaborating`, not of the
`RecordedProblem` (Task 3.2's problem is unchanged).

| Site | Where `positioned` records it | Definedness R1 needs |
|---|---|---|
| `NodeType p` | `types(p)`; a second write at `p` is `DuplicateSite` | the node's rule emits it (T-R0b §3); unchanged |
| `PatternType p` (`p` a pattern path) | `types(p)`; same uniqueness | the pattern rule's equation (P1-P7) |
| `Slot p i` (through `slots`) | site table, under `Slot p i` | `θ(D_g)` of the reference's rule (E3-E6, E17, E20) |
| `ParamType p k` | site table | the type is a handle, or a written annotation whose definedness is T-R0b's annotation rule; nothing new |
| `LambdaBody p` | site table | the type is a handle (E18's `res`); nothing new |
| `RestType p` | site table | `{ ...⟨p, rest⟩ }`, one tail, always defined |
| `ClauseParamType p c k` (proposed) | site table | the clause parameter's declared type at `θ` (E20); written, so T-R0b's rule |
| `RigidName i` | site log only (so a duplicate is seen); the type must be `TVar (RigidRef i)`, and a handle anywhere in it is `RigidSiteRead v`; the read is `pure (TVar (Rigid i))` | none |
| `Auxiliary` | site log only; `untracked` reports `AuxiliarySite`, whether or not the type holds a handle | — |

A direct `readType` or `readRow` (§3.2) at an `Auxiliary` or
`RigidName` site writes no site log but records a use at that site;
`untracked` reports it from `uses` (`AuxiliarySite`, `RigidSiteRead`;
Sc), so these two sites are rejected however they are reached.

Every site is written at most once (`DuplicateSite`, §3.4, counted
from the site log). So a
type's recorded form and its checked form come from one call, a
`GenTy` cannot be elaborated without being recorded, and every record
type `build` splices is either a node or pattern type, whose
definedness the recorder emits (R1), or one of the site-table types
above, each a handle, a written annotation or a one-tail record
(§8.1, `DuplicateLabel`). That last claim is about the rules T-R0b
lists, not enforced by `positioned`, which accepts any `GenTy`; T12
checks it on the corpus. If it failed, the direction is safe (a
`DuplicateLabel` is `Broken`), so it bears only on completeness (C1).

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
  , fresh   ∷ Map Var Int          -- `fresh` calls per Var
  , sites   ∷ Map CheckedName RTExpr -- the site table (§3.3)
  , siteCounts ∷ Map CheckedName Int -- writes per site, from the log
  , build   ∷ Witness → Either ElabFault a
  }
-- no Functor instance, no map-like function (§3.1)

-- Domain.Elaborating: read-only accessors (as ruling R4)
problem   ∷ ∀ a. Elaborating a → RecordedProblem
requests  ∷ ∀ a. Elaborating a → Set Var    -- map _.var uses
untracked ∷ ∀ a. Elaborating a → Array SealFault   -- §5
-- Domain.Elaborating.Build (rule E1)
build     ∷ ∀ a. Elaborating a → Witness → Either ElabFault a

-- Domain.Elaborating.Types
data SealFault
  = UntrackedRead Var       -- not a flexible variable of the problem
  | SortClash Var           -- use sort ≠ the variable's sort
  | AuxiliarySite           -- `Auxiliary` in the site log or as a
                            -- use's site
  | RigidSiteRead Var       -- a handle at a `RigidName` site, logged
                            -- or as a use's site
  | DuplicateFresh Var      -- `fresh` called twice for one Var
  | DuplicateSite CheckedName -- a site recorded twice (§3.3)

-- Features.Check.Generate.Elab
seal ∷ ∀ a. (∀ s. Gen s (Elab s a)) → Elaborating a
```

This keeps the brief's fields `problem`, `requests` and `build`, as
accessors of a newtype. **Deviation from the brief, with reason:** the
brief writes `Elaborating` as a record alias. A record alias can be
built anywhere with any `build`, which is a read that escapes tracking
(§11.2 S2), so the constructor is hidden, and `build` is reachable
only from `Features.Check.Elaborate` (rule E1), so no caller can skip
`elaborate`'s checks. `uses` refines `requests` with each read's sort
and site; `requests` is derived from it.

`seal` runs the generator once, assembles the `RecordedProblem` from
`parts` (Domain.Recorded's constructor is Generate*-only, ruling R4),
copies the `Elab`'s `uses`, counts the `vars` and site logs into
`fresh` and `siteCounts`, keeps the site table (last write, which
matters only when `untracked` already reports the duplicate), and
wraps its `run` as `build w = run w.bindings`. Because the argument is `∀ s.`, a
handle cannot leave the generation that minted it: `a` is bound
outside `s`'s scope, so `a = Handle s` is a skolem escape and does not
typecheck. The nominal roles stop `coerce` from changing `s`.

### 3.5 `generate`, `positionsOf`, `elaborate`

```purescript
generate
  ∷ Tables → Signatures → Resolved.FunctionDecl
  → Elaborating Checked.FunctionDecl
generate tables signatures declaration =
  seal (generateIn tables signatures declaration)

generateIn                        -- Generate.Body (rule E3)
  ∷ ∀ s. Tables → Signatures → Resolved.FunctionDecl
  → Gen s (Elab s Checked.FunctionDecl)

-- Derived view (N4): where the checked IR reads each variable.
positionsOf ∷ ∀ a. Elaborating a → Map Var (Set CheckedName)

-- Features.Check.Elaborate
covDomain
  ∷ ∀ a. Set Var → Elaborating a → Either InternalFault (Set Var)

data Elaboration a
  = Elaborated a
  | NotCompiled NoWitnessReason   -- Cov refused, or a Named binding
  | Broken InternalFault          -- BrokenInvariant; stops the run

elaborate
  ∷ ∀ a. Set Var                  -- Recon (empty until G-Recon)
  → Elaborating a
  → Judged                        -- from `decide` (§6.2)
  → Elaboration a
```

`generate` stays total (G-total): it always returns a value.
`Tables = { types, ctors, effects }` and `Signatures` are Task 3.2's.
Task 3.2's `generate ∷ … → RecordedProblem` becomes `problem <<<
generate` and keeps its tests.

`elaborate` is the only caller of `build` (rule E1). Its steps, in
order, each a named arm:

1. `untracked e` non-empty: `Broken (BrokenInvariant …)` (§5);
2. `judged.problem ≠ problem e`: `Broken (BrokenInvariant
   "elaboration: problem mismatch")` (§6.2);
3. `covDomain` failing (`recon ∩ requests ≠ ∅`): `Broken` (§7); it
   needs no witness, so it runs before the witness steps and a broken
   `Recon` premise is reported even for a declaration with none;
4. `NoWitness r`: `NotCompiled r`;
5. a `Named` binding: `NotCompiled (AdapterUnsupported NameMarker)`
   (§8.3);
6. Task 4.4's `coverage` over that domain refusing: `NotCompiled`;
7. `build`: `Right d` is `Elaborated d`; `Left f` is `Broken
   (BrokenInvariant (render f))` (§8).

The driver maps `NotCompiled r` to T-R0a's `AtS (NoCompilation r)` and
`Broken f` to `Faulted problem f`. The driver also runs step 1 right
after `generate`, before `decide` (§5); step 1 inside `elaborate` makes
that a property of `elaborate`, not a convention of its callers.

## 4. Invariants

Each is stated so a test can falsify it; §10 names the test.

- **St (static requests).** `requests e` is computed from `e` alone;
  its type takes no `Witness`. (By type.)
- **Tr (tracking).** For every `e ∷ Elab s a` built with the public
  API (§3.2's last paragraph) and all `w₁`, `w₂` whose bindings agree
  on `vars(uses e)`: `run e w₁ = run e w₂`. Equivalently, `run` reads
  no binding outside `uses`. Argued by induction on construction:
  `readType`/`readRow` read exactly the variable they record; `pure`
  reads none; `map` and `orFault` keep uses and reads; `apply` unions
  both; `positioned` and `slots` are built from these. (Check: T4a.)
- **Def (definedness of reads).** If every `v ∈ requests e` has a
  binding that is `Inline` or `Free`, with a `RecordSort` use bound to
  `Free`, a `TRecord` or a `TVar`, then `readType` and `readRow` never
  produce `Unbound`, `SortMismatch` or `NamedUnread`. (Check: T4b,
  which counts the faults by origin; `DuplicateLabel` is excluded from
  Def and covered by §8.1.)
- **Mint (declared handles).** Every handle in scope `s` came from
  `fresh` in the same `Gen s`, which wrote its `VarInfo` with `quant =
  Exists`. Hence `requests (seal g) ⊆ flex(problem (seal g))` for code
  that obeys rules E1-E6 and does not use Runtime FFI on these values
  (§11.2 S10). (By hidden constructors, nominal roles and `seal`'s
  rank-2 type; checks T3b, T3c.)
- **Sc (seal check).** `untracked (seal g) = []` iff every use `u`
  has `u.var ∈ flex(problem)`, `u.sort` equal to the variable's sort
  (`TypeSort` for T-R0b's `Type`, `RecordSort` for `Row`; no variable
  has `EffectRowSort` before §12.1 is settled), and `u.site ∉
  {Auxiliary, RigidName _}` (a direct `readType` or `readRow` there,
  reported as `AuxiliarySite` or `RigidSiteRead u.var`); the site log
  holds no `Auxiliary` and no handle at a `RigidName` site; `fresh` was
  called at most once per `Var`; and every site was recorded at most
  once (both counted from the logs, §3.3).
  (Check: T3a.)
- **Id (problem identity).** A handle minted by one `seal` is not
  usable in another (rank-2 and roles, check T3c); `elaborate` builds
  only from a solution `decide` paired with this problem (§6.2,
  checks T11, T11b).
- **Dom (Cov's domain).** `covDomain recon e = Right (flex(P) ∖
  recon)` when `recon ∩ requests e = ∅`, and `Left (BrokenInvariant
  …)` otherwise. With `recon = ∅` it is `flex(P)`. (Check: T6.)
- **EL1.** For every `Judged` whose solution is `Witnessed w`, with
  `untracked e = []`, no `Named` binding in `w`, `Cov(w)` over
  `covDomain` (including Cov-S, §8.1), Adapt-N's conclusion (W §4) and
  R1 (W §4): `elaborate` gives `Elaborated d`, and `d` is the checked
  declaration whose every type position is `elabTy` of its generator
  type under `w` (§9 for holes). (Check: T1, T2.)
- **Pos (derived positions).** `positionsOf e ! v` is the set of sites
  at which `build` reads `v`, and those sites are where `v`'s value
  actually lands in `build`'s IR; `v` is auxiliary iff `v ∉ requests
  e`. T-R0b's stored `position` is a second source until Task 4.6 and
  must agree (§10 T5, T5b; known disagreements §12.2).
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
before any witness is read, by a different layer.

1. **A read that `uses` does not record.** Not representable without
   an Internal module: the witness reaches only `Elab`'s `run`, and
   `run` is built only by the combinators of §3.2-§3.3, each of which
   records what it reads (Tr). No `Bind` means no read can be chosen
   from a value read earlier. Enforcement: hidden constructors of
   `Elab`, `Handle`, `Gen` and `Elaborating`; nominal roles; explicit
   export lists re-exporting only named types in the allowed form;
   rules E1-E6 (§3.1), which also stop a non-Generate module from
   mapping solver state into an `Elab`, directly or through a
   re-export (adversarial finding 1; re-review N1).
   scripts/structure.mjs already rejects `unsafe*` and `Partial` (:23,
   :85) and FFI outside Runtime (:103-105). This layer cannot be
   checked by running `seal` (an under-declared `run` looks the same
   from outside); it is checked by the Tr property over the public API
   (T4a), the import rules (T3b, T10) and the compile fixtures (T3c).
2. **A read of a variable that is not a flexible variable of this
   problem, at the wrong sort, at an `Auxiliary` or `RigidName` site,
   of a `Var` minted twice, or at a site recorded twice.** `untracked`
   checks `uses` (each use's variable and sort against `problem.vars`,
   and its site), the `fresh` counts, the site log and `siteCounts`
   (Sc). Mint makes `UntrackedRead` unreachable
   from code obeying the rules. The others are reachable from a
   faulty generator: `SortClash` (a handle minted for a `Type`
   variable placed in a record tail, or any handle in an effect-row
   tail), `AuxiliarySite` (a caller passing `Auxiliary` as the site
   of `positioned`, or of a direct `readType` or `readRow`),
   `RigidSiteRead` (a handle in a `positioned` type at a `RigidName`
   site, or a direct `readType` or `readRow` at one),
   `DuplicateFresh` (two rules minting one ⟨p, role⟩, which would
   merge two intended variables), `DuplicateSite` (two rules
   recording one site). **Placement:** `untracked` is
   `elaborate`'s first step (§3.5), and the driver (and Task 7.1's
   shadow harness) also runs it immediately after `generate`, before
   `decide`. A non-empty result is `Faulted problem (BrokenInvariant
   …)` and stops the run (§18.69 Q13: generation is trusted code, R1's
   owner), so neither `decide` nor `build` runs. Why not inside
   `generate`: its type has no `Either`, and G-total keeps it total;
   the fault needs the problem, which the `Elaborating` carries.
3. **A read of another problem's variable.** `Var = ⟨p, role⟩` is
   path-relative (T-R0b §6: paths start at `f.body`), so `f` and `g`
   can have equal `Var`s and layer 2 cannot tell them apart. The rank-2
   scope with nominal roles rejects it at compile time (§6.1). Within
   one `seal`, a generator that generated two declarations would mint
   colliding `Var`s, which `DuplicateFresh` reports.

## 6. Problem identity

### 6.1 Handles: adopted, rank-2 with nominal roles

D1 left scoped handles optional. **Adopted**, because of layer 3
above: without a scope, a handle from `g`'s generation used in `f`'s
`Elab` passes Sc whenever `f` has a variable at the same path and role,
and `build` would silently read `f`'s binding for it. A value tag (the
`FunctionId` in each handle, checked by `seal`) would also work; rank-2
is chosen because it costs nothing at run time, needs no new check,
and is the pattern PureScript's `ST` uses, including its nominal role
annotations (§2). Its cost: a handle cannot be cached across
declarations, which nothing needs (generation is per declaration,
T-R0a §2 property 3).

### 6.2 Solutions: `Judged`, minted by `decide`

Handles guard the `build` side only. A `Witness` is keyed by the same
path-relative `Var`s, and T-R0a §3.3's `Solution` carries no problem
(its `Valid` is a bare token). Comparing a separately passed
`RecordedProblem` with `problem e` would not tie the solution to it:
`elaborate ∅ e_f P_f sol_g` would pass (adversarial finding 2).

**Chosen:** `decide`, which alone has both, returns with each Solved
verdict a hidden-constructor pair

```purescript
-- Domain.Verdict.Judged.Internal (rule E5); Domain.Verdict.Judged
-- re-exports the type in the allowed form (§3.1) with the two
-- accessors. Plan Task 1.1's Domain.Verdict.Internal is untouched.
newtype Judged = Judged { problem ∷ RecordedProblem
                        , solution ∷ Solution }
judgedProblem  ∷ Judged → RecordedProblem
judgedSolution ∷ Judged → Solution
```

and `elaborate` takes the `Judged` and requires `judgedProblem j ==
problem e` (structural equality). Why this option rather than a
`FunctionId` or digest inside `Witness` or `Valid`: it ties the pair at
the one place both exist, follows the hidden-token pattern T-R0a
already uses for `Valid`, and changes neither W's `Witness` nor the
meaning of `Valid`. The cost is one more hidden constructor and a
`decide` output (T-R0a §3.2, listed in §12.3).

Equality must distinguish declarations even when their variable sets
coincide, so `RecordedProblem` carries its declaration's `FunctionId`
as a field, unconditionally (a request to Task 3.1's shape, §12.3).
Atoms also carry `AtomId.decl` (T-R0b §6), but a problem's equality
should not depend on it having an atom.

## 7. Cov's domain

W §4 states Cov's domain as `Req` plus every other flexible variable
not in `Recon`, and that members of `Recon` have no binding. Under this
mechanism `Req = requests e`. Requiring both "every requested variable
is bound" and "no `Recon` member is bound" is consistent only when
`Recon ∩ requests = ∅`, which W §1.6's definition of `Recon` (outside
`Req`) promises. **Chosen** (adversarial finding 13): `covDomain`
checks the promise and does not repair it.

```text
covDomain recon e
  | recon ∩ requests e ≠ ∅ = Left (BrokenInvariant "recon read")
  | otherwise             = Right (flex(P) ∖ recon)
```

On the right branch this equals `requests e ∪ (flex(P) ∖ recon)`,
since `requests e ⊆ flex(P)` (Mint) and is disjoint from `recon`. Why
a fault rather than redefining the effective `Recon` as `recon ∖
requests`: W §4's clause stays as written, and a `Recon` author who
includes a variable `build` reads has broken a premise the gate
should see, not one this mechanism should absorb silently.

- With `Recon = ∅` (§18.69 Q6; Task 4.4) the domain is `flex(P)`:
  every flexible variable, requested or not, has a binding. This is
  Task 4.4's domain, so Task 7.1 changes no Cov outcome while `Recon`
  is empty.
- The case is real: E28's `⟨p, rest⟩` is listed by T-R0b §5.3 as
  reconstructable, yet the removal node's checked type is `{ ...⟨p,
  rest⟩ }` (E28's result, T-R0b §3.3), so `build` requests it
  (§12.2). A `Recon` containing it gives the fault.
- Task 4.4's `coverage ∷ RecordedProblem → Witness → Either
  NoWitnessReason Unit` takes the domain as an argument from Task 7.1:
  `coverage ∷ Set Var → RecordedProblem → Witness → Either
  NoWitnessReason Unit`.

## 8. `build` failing after a Cov-passing witness

### 8.1 The constructors and why each is impossible

```purescript
data ElabFault
  = Unbound Var              -- a requested variable has no binding
  | SortMismatch Var         -- a RecordSort use bound Inline to a
                             -- type that is neither TRecord nor TVar
  | NamedUnread Var          -- a read of a Named binding
  | DuplicateLabel Var String  -- a spliced row image repeats a label
```

| Constructor | Excluded by | Whose premise |
|---|---|---|
| `Unbound v` | Cov over `covDomain` ⊇ `requests` (§7) | Cov's validator (Task 4.4) |
| `SortMismatch v` | Sc (each use's sort is the variable's, `untracked`, step 1) together with Cov-S: a `Row` variable's binding is `Free`, `Inline (TRecord _)` or `Inline (TVar _)` of a record-sorted variable (W §5.2 "sorts are preserved"; proposed as an explicit Cov clause, §12.3). Cov-S compares against `vars`, Sc ties `vars` to the use, so neither alone suffices | `seal`'s check; Cov's validator |
| `NamedUnread v` | `elaborate`'s step 5 (§3.5) | `elaborate` itself |
| `DuplicateLabel v l` | Adapt-N's conclusion: every recorded atom is defined at every key; and R1: the recorder emits the definedness of every record type it builds, which covers every type `build` splices because `positioned` records each elaborated type under its site, and the site-table types are handles, written annotations or one-tail records (§3.3) | the adapter's owner; the recorder's |

With `Recon` empty, Cov's domain is every flexible variable, so
`Unbound` is impossible outright; the others rest on trusted premises
or on `elaborate`'s own steps. None rests on an untrusted search. No
public combinator raises an `ElabFault` other than these, in these
circumstances (`orFault` is Internal, N6).

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
- A `SealFault` or a problem mismatch: `Broken`, before `build`
  (§3.5 steps 1-2).

## 9. `Free` bindings: today's hole

Today `checkFunction` turns every meta still unsolved at the end into a
hole: `body: holes settled` (src/Features/Check/Function.purs:68-71
comment, :107), where `holes` renumbers the body's metas 0, 1, … in the
order `foldTypes` first meets them (src/Features/Check/Scheme.purs:
187-198). The online adapter (Task 4.4) binds a variable whose
read-back value is a bare meta `Hole m` to `Free m`, and keeps metas
inside `Inline` types as they are.

`build` therefore:

1. elaborates `Free i` as `TVar (Hole i)`, in a type position, in an
   instantiation slot, and (renamed by `imageOf`) as the tail
   `Hole i` in a record row (§3.2);
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

One numbering covers type, record and effect-row metas ("Type, record
and row metas share one numbering", Scheme.purs `foldHoles`), and an
unsolved lambda effect row is a hole today. So while effect positions
are outside the witness (§12.1), `build`'s numbering of type holes can
differ from today's wherever an effect hole comes first. T8 and T2
therefore compare effect-erased projections, renumbered by `holes`
after erasure on both sides.

`holes` lives in Features.Check.Scheme beside the checker's `State`.
Task 7.1 moves `holes` and `foldHoles` to their own module (a
behaviour-preserving refactor) so that the generator reaches no
checker state (T10).

## 10. Acceptance tests for Task 7.1

Fixtures follow docs/engineering.md. Property tests use a seeded
generator whose grammar is fixed in the test file before it is run.
Corpus-wide tests are `*.serial.test.mjs` (ruling R11). The canonical
serialization is test/r0-canonical.mjs, which Task 3.3 step 1 creates
(ruling R9); it does not exist yet.

| Id | Statement | Backs | Oracle and fixtures |
|---|---|---|---|
| T1 | EL1: for every corpus declaration the online strategy accepts with a `Witnessed w` that passes Cov, `elaborate` gives `Elaborated` | EL1 | the R0 corpus (test/r0-corpus.mjs); Task 4.3's online certificate |
| T2 | Same checked IR as read-back: `build w` equals the certificate's `checked` (canonical serialization), both sides effect-erased and renumbered by `holes` after erasure until §12.1 is settled (the test's name says so). Instantiation slots compared as stored, with no `slotType` normalisation (§3.2). Exact for declarations with no variable in `Amb`; otherwise at every site whose type and slots mention no `Amb` variable, up to one hole bijection per declaration. `Amb` is the set of flexible variables occurring in a record of some `types(p)` with two or more flexible tails (T-R0b §5.3's ambiguity criterion). The test prints the excluded-site count | EL1, AI-IR, Hole | corpus; effect rows per §12.1 |
| T3a | `untracked` rejects, before any witness, one case per `SealFault`: an `Elab` forged through the Internal module that reads a `Var` absent from `vars` (`UntrackedRead`); a `Type` handle in a record tail, and any handle in an effect-row tail (`SortClash`); a `positioned` call with site `Auxiliary`, with and without a handle in its type, and a direct `readType Auxiliary h` and `readRow Auxiliary h` with no `positioned` call (`AuxiliarySite`); a handle in a `positioned` type at a `RigidName` site, and a direct `readType (RigidName i) h` and `readRow (RigidName i) h` (`RigidSiteRead`); two `fresh` calls for one ⟨p, role⟩ (`DuplicateFresh`); two `positioned` calls for one site, including two `NodeType p` writes that a map union would collapse (`DuplicateSite`). The shadow harness then gives `Faulted … BrokenInvariant`, an injected stub strategy records that `decide` was never called, and `elaborate` given the same value returns `Broken` without calling `build` | Sc, §5 layer 2 | injected generators |
| T3b | Import and export rules E1-E6, one case per rule, each a finding. Imports: a module outside the importer regex importing a restricted module (for example `Features.Check.Function` importing `Features.Check.Generate.Elab`, `Features.Check.GenerateX` importing it, a non-Generate module importing any `Features.Check.Generate.*` helper, `Features.Check.Decide` importing plan Task 1.1's `Domain.Verdict.Internal`, `Domain.Recorded` importing `Domain.Verdict.Judged.Internal`). Re-exports (E6, read from the source because `purs graph` does not show re-exports): `module Features.Check.Generate (generate, module Features.Check.Generate.Elab)`; an allowed-form alias whose import is `(T(..))`; an alias bound to an open import; an alias also bound to a value import (`import Domain.Elaborating.Build (build) as Exports` beside the type import); a re-export of `Domain.Recorded.Internal`. Pinned export lists: `Features.Check.Generate` exactly `(generate, staticRules, module Exports)` with `Exports` = `Tables`, `Signatures`, and no `emptyProblem`; `Features.Check.Generate.Elab` exactly `(module Exports, readType, readRow, seal)` with `Exports` = `Handle`, `Elab`, `Ref(..)`, `GenTy`; `Features.Check.Generate.Gen` exactly `(module Exports, GenEntry(..), fresh, positioned, slots, emit)` with `Exports` = `Gen` (an added export such as `mkGen` fails); `Domain.Elaborating`, `Domain.Elaborating.Build`, `Domain.Verdict.Judged`, `Features.Check.Elaborate` and `Features.Check.Decide` each equal to the list written in the test (an added export, such as a `mkElaborating`, fails). Runtime: a Runtime module importing `Domain.Elaborating*` or `Features.Check.Generate*` | Mint, §5 layer 1 | test/structure.test.mjs |
| T3c | Compile-time rejection: fixture modules that (i) return a handle out of `seal`, (ii) use a handle from one `seal` inside another, (iii) use `bind` on `Elab`, (iv) `coerce` a `Handle s` to `Handle t` or an `Elab s a` to `Elab t a`, (v) import only `Generate.Elab` and pattern-match `Elab { … }` or `Handle _`, (vi) import only `Features.Check.Generate` and call `seal` or `generateIn` (the finding-1 cheat from outside Generate*), each fail to compile with the expected error class (escaped skolem; no `Bind` instance; type mismatch from the nominal role; unknown constructor; unknown value). The compile reuses existing output as externs and cleans its copy up; the fixtures obey the style rules, which scripts/structure.mjs applies to every .purs under test/ | Id, Tr, Mint | `test/fixtures/r0/elab-scope/*.purs`; real `purs` |
| T4 | Tr and Def as properties: random `Elab` terms over the public API (`readType`, `readRow`, `pure`, `map`, `apply`, `traverse`, `positioned`, `slots`) inside one `seal`; (a) bindings changed outside `requests` never change the result; (b) witnesses binding exactly `requests` with `Inline`/`Free` values of the right sort never give `Unbound`, `SortMismatch` or `NamedUnread` | Tr, Def | seeded generator |
| T5 | Positions against T-R0b: for every corpus declaration, `v ∉ requests` iff T-R0b's stored `position v = Auxiliary`, and a stored non-auxiliary position lies in `positionsOf e ! v`; disagreements fail except the rows §12.2 lists, each asserted by name | Pos | corpus; Task 3.2's `vars` |
| T5b | Positions against the IR: bind each requested variable to a distinct marker type (a fresh rigid `Rigid (VarId k)` outside the signature, or a distinct `TData`), run `build`, walk the IR, and check that the set of sites where each marker occurs equals `positionsOf e ! v` | Pos | corpus |
| T6 | Cov's domain: `covDomain ∅ e = Right flex(P)`; with an injected `recon` disjoint from `requests`, `Right (flex(P) ∖ recon)`; with one containing a requested variable, `Left (BrokenInvariant …)` and `elaborate` returns `Broken`, also when the `Judged` solution is `NoWitness` (step 3 precedes the witness steps) | Dom | unit |
| T7 | Each `ElabFault` constructor injected into `elaborate` gives `Broken (BrokenInvariant …)` and the driver stops; a non-empty `untracked` gives `Broken` before `build`; `NoWitness` and a `Named` binding give `NotCompiled` and `build` is not run; `recon ∩ requests ≠ ∅` with `NoWitness` gives `Broken`, not `NotCompiled` | §3.5, §8 | injected `Elaborating` values |
| T8 | `Free`: a witness binding two variables `Free 5` and one `Free 2` yields two holes numbered as `holes` numbers them; on hole-bearing corpus declarations the effect-erased projection, renumbered after erasure, equals today's | Hole | unit; corpus subset of T2 |
| T9 | Applicative laws for `Elab` (identity, composition, homomorphism, interchange) on both `uses` and `run` | §3.2 | seeded generator |
| T10 | T-R0b §4's invariant, transitively: the import closure of every `Features.Check.Generate*` module reaches no `Features.Check.*` module outside an explicit allowlist. The allowlist is `^Features\.Check\.Generate(\.|$)` (the generator's own modules), the moved `holes` module and named pure helpers, all listed in the test; hence no checker `State` and no `Witness` accessor outside `Generate.Elab` | AI-IR, Mint | import graph (`purs graph`) |
| T11 | `elaborate` with a `Judged` for another declaration's problem gives `Broken (BrokenInvariant "elaboration: problem mismatch")` | Id | two declarations with equal `Var` sets |
| T11b | No public way to pair a problem with another declaration's solution: `Judged`'s constructor is reachable only from `Features.Check.Decide` (rule E5, T3b), and a test-built `Judged` (through the Internal module, in JS) holding `f`'s problem and `g`'s solution, given to `g`'s `Elaborating`, gives `Broken` | Id | two declarations with equal `Var` sets |
| T12 | Site-table shapes (§3.3): on every corpus declaration, each `ParamType`, `LambdaBody`, `RestType` and `ClauseParamType` entry is a single handle, the translation of a written annotation, or `{ ...h }` with one handle tail; a `RigidName` entry is `TVar (RigidRef i)` | §3.3, C1 | corpus |

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
- `r0-elab-phantom-role`: the `type role` annotations removed; T3c
  (iv)'s probe must fail.

## 11. Adversarial review (procedure: docs/engineering.md)

This section is the author-side half of the review: the restrictions
table and the two passes. The independent reviewer, told to find a
read that escapes tracking, reported findings 1-19
(.superpowers/sdd/2026-10-22-r0-implementation-plan/
gate-D1-adversarial.md); fix round 1 applied all of them, and the rows
below cite them where they changed. A scoped re-review of that round
(task-0.3-rereview1.md, same directory) found N1-N6; fix round 2
applied them (§3.1 rules E3 and E6 and the allowed re-export form,
§3.3 site keying and `Gen`'s hidden constructor, §3.5 step order,
T3b, T3c (vi), T10). A second re-review (task-0.3-rereview2.md) found
NB1-NB9; fix round 3 applied them (§3.1 module table, E6 alias
resolution and exceptions, pinned export lists, `Judged`'s own
Internal module, the `Features.Check.Generate` allowlist; §3.3
`Parts` as logs and `emit`; §3.4 `siteCounts`, `AuxiliarySite`,
`RigidSiteRead`; T3a, T3b, T6, T7, T12). A third re-review
(task-0.3-rereview3.md) found NB10, direct `readType`/`readRow` at an
`Auxiliary` or `RigidName` site going unreported; fix round 4 restored
the use-level site clause in Sc (§3.3, §3.4, §5 layer 2, T3a) and
applied its minors (`GenEntry` placement, E6 pairing note, pinned
`Generate.Elab` and `Generate.Gen` export lists in §3.1 and T3b).

### 11.1 Restrictions table

| Row | Restriction beyond the semantics | Why believed harmless | Challenge |
|---|---|---|---|
| R1 | `Gen` is monadic, `Elab` applicative (Pottier keeps one applicative value) | `Gen` never receives a solution, so its sequencing cannot depend on one; T-R0b §4's invariant is about solved shapes, not about sequencing handles | a rule that wants the solved type of a child to choose its node: impossible in `Gen` (no witness in scope) and in `Elab` (no `Bind`); such a rule is a design change (extension §2 "Challenges" 2) |
| R2 | No `Bind` on `Elab`: no read chosen from a value | no R0 rule branches on a solved shape (T-R0b §4); the checked IR's structure is static (AI-IR) | over-application: `Call` plus `Apply` is chosen by declared arity (Call.purs:107-127); T2 compares whole declarations, so a hidden dependence fails it |
| R3 | `requests` over-approximates reads | `run` reads at most `requests` (Tr); a larger domain only binds more, which Cov already does with `Recon = ∅` | a `pure`-only `Elab` (a literal): no requests, no reads |
| R4 | Handles cannot leave one `seal` | generation is per declaration (T-R0a §2 property 3) | caching a callee's instantiated signature with handles across declarations: not done; signatures are instantiated per occurrence (G-fresh) |
| R5 | `build` reads `bindings` only, never `names` or terms | `Named n` is copied into the IR as a marker; lowering evaluates terms per key (W §1.3) | a `Named` binding before `Open.Named` exists: refused with `NotCompiled` (§8.3) |
| R6 | Each use carries a sort fixed by its position (`TVar`, record tail, effect-row tail; slots by declared sort) | `Ty` itself does not separate them: a record tail is a type-sorted `v` (`substituteRecord` uses `substitution.types`, Core.purs:186-191), and Core.purs:54-55's "one sort, type or row" means type versus effect row. The position rule (N7) and Sc supply the separation | a generator bug placing a `Type` handle as a tail, or any handle in an effect-row tail: `SortClash` (T3a) |
| R7 | `Elaborating`'s constructor is hidden; `build` is reachable only from `Elaborate` | the brief's fields stay readable through accessors; production elaboration goes through `elaborate` | a record literal with an arbitrary `build`, or a direct `build` call skipping Cov: does not compile outside the allowed modules (rules E1-E2) |
| R8 | Effect rows are not problem variables, so `build` cannot read them | none yet: this is open | §12.1 |
| R9 | Every `Features.Check.Generate.*` module is importable only by Generate* modules; `Features.Check.Generate` exports only its enumerated allowlist (`generate`, `staticRules`, `Tables`, `Signatures`), none mentioning `Gen`, `Elab`, `Handle` or `Elaborating`'s constructor; no restricted module is re-exported | the driver needs only these and `elaborate` | a checker module mapping its own IR into `generateIn`'s `Elab`, directly or through a module that re-exports `Generate.Elab`: rules E3 and E6 (finding 1, re-review N1; T3b, T3c (vi)) |
| R10 | A solution reaches `elaborate` only inside `Judged` | `decide` is where problem and solution meet | an `elaborate` call with `f`'s problem and `g`'s solution: unrepresentable outside `Decide` (finding 2; T11b) |

### 11.2 Soundness pass: making `build` read outside tracking, or
succeed wrongly

- S1. A handle from `g`'s generation inside `f`'s `Elab`: rejected by
  rank-2 (§6.1; T3c (ii)). Without it Sc would pass (§5 layer 3).
- S2. An `Elaborating` whose `build` reads freely: requires the hidden
  constructor (R7); the brief's record alias would have allowed it.
- S3. An `Elab` forged through Internal with a `run` reading more than
  `uses`: not detectable by `seal` (§5 layer 1). Confined by rule E4
  to two modules (T3b) and by Tr over the public API (T4a). This is
  the residual trust: the two Internal-importing modules must be
  correct, and they are small.
- S4. A solution for another declaration: `Judged` (§6.2; T11, T11b).
  The first version compared a separately passed problem, which did
  not tie the solution to it (finding 2).
- S5. A requested variable placed in `Recon`: `covDomain` faults
  (§7; T6).
- S6. A witness with extra bindings outside the domain: ignored by
  `build` (Tr); harmless.
- S7. A `RecordSort` variable bound `Inline Int`: `SortMismatch`, a
  broken invariant (Sc plus Cov-S should have refused it, §8.1).
- S8. A read whose value is not in the witness: effect rows (§12.1),
  the one case found (the reviewer confirmed it and found no other:
  marks are stripped after Check, instantiations exclude `RowSort`
  slots, `fail` clause payloads and declared rows are static). Its
  candidate escape route, reading today's checker state in `build`, is
  excluded by rule E3 and T10, so until §12.1 is decided `build`
  cannot produce them at all.
- S9. Two strategies' different witnesses for one problem: `build`
  elaborates whichever witness was accepted; choosing between them is
  G3's and forcedness's (W §1.7), not this mechanism's.
- S10. Runtime FFI: allowed in Runtime (scripts/structure.mjs:
  103-105), and foreign code can break any hidden constructor.
  Trusted premise, stated: no Runtime FFI touches `Generate*` or
  `Elaborating` values. Today no Runtime module imports them; Task 7.1
  adds a structure rule that Runtime modules import neither
  `Domain.Elaborating*` nor `Features.Check.Generate*` (T3b).
- S11. `coerce` changing a phantom scope (finding 3): nominal roles
  (§3.2; T3c (iv); row `r0-elab-phantom-role`).
- S12. Constructors leaked by a re-export (finding 16): explicit
  export lists, no Internal re-export, T3c (v).
- S13. Solver state mapped into a real generator's `Elab` by a
  non-Generate module (finding 1): rule E3, T3b, T10. Through a
  re-export by a public module, or through an unrestricted
  `Generate.*` helper (re-review N1): rule E3 now covers every
  `Generate.*` module, `Features.Check.Generate` exports only its
  enumerated allowlist, and rule E6 forbids re-exporting restricted
  modules, resolving aliases and checking import lists (T3b, T3c
  (vi)).
- S14. A Generate* module rebuilding a `Gen` with edited `parts`
  (re-review N4): `Gen`'s constructor is in `Generate.Elab.Internal`,
  under rule E4.

### 11.3 Completeness pass: making a valid construction fail

- C1. A declaration the online strategy accepts with a covered
  witness, and `build` returns `Left`: by §8.1 only if Sc, Cov-S,
  Adapt-N or R1 fails, each a broken invariant. T1 runs the corpus.
- C2. A valid read rejected by `untracked`: only if the position rule
  (N7) and the variable's recorded sort disagree, which on a correct
  generator they do not (the rule fixes the sort from where the
  generator placed the handle, and `fresh` records the sort of the
  role that minted it), or if a handle's `VarInfo` is missing, which
  `fresh` forbids (Mint). (Corrected after finding 10: `Ty` does not
  forbid two sorts for one variable.)
- C3. Valid witnesses with `Named` bindings: refused until T1 lands
  (§8.3). A stated limitation, not a verdict change.
- C4. An ambiguous site (several flexible tails): `build` gives the
  witness's choice, which may differ from today's solver; T2 excludes
  such sites and reports their count rather than failing.
- C5. Effect-bearing declarations: `build` cannot fill their inferred
  effect positions (§12.1).
- C6. Hole numbering: equal up to renaming suffices (§9); T8 and T2
  check it on effect-erased projections.
- C7. An adapter emitting `Inline (TVar x)` for a record variable:
  accepted by `readRow` and renamed as Core does (§3.2; finding 8).
  The first version faulted on it.

## 12. Points for the gate

### 12.1 Effect rows are outside the witness (routed to Task 0.7)

**Routing (controller's ruling, fix round 1):** this gap is routed to
Task 0.7 (erased effect rows, gate G-erased). G-D1 cannot close until
it is settled there. The options below are this document's input to
that task.

The checked IR carries effect rows: every `TFun a row b`, the rows of
`TData` and `THandler`, and a `fail` payload, which is a `FailEffect`
label's argument (src/Domain/Checked/Internal.purs:45-54;
src/Features/Check/Failure.purs:43-47). Inferred ones are the issue:
a lambda's row starts as a fresh meta (src/Features/Check/Lambda.purs:
37). A declaration's own `row` is declared, rigid and static, and
needs no read. The recorder erases effect rows (T-R0b §2.2, `TFun` row
and `RowSort` variables), so no problem variable stands for an
inferred one, no witness binds it, and no `Elab` read can produce it.
A `build` that took them from the online solver would read solver
state outside tracking, the escape D1 exists to prevent.

Options, for the author with T-R0b's owner:

- E-a (recommended): effect-row metas become flexible problem
  variables of a third sort (`EffectRowSort`, N8) with canonical names
  (for example `⟨p, effect⟩` for a lambda, `⟨p, inst i⟩` for a
  callee's `RowSort` variable), with **no atoms**: their obligations
  stay erased, and G-erased is unchanged. The witness binds them; the
  online adapter reads them back like any slot; `elabTy` already
  records effect-row tails with that sort (N7), so Sc starts accepting
  them. Cost: T-R0b's `vars` and §2.2 change, Cov's domain grows, and
  a strategy that does not model effects cannot elaborate an effectful
  declaration (`NotCompiled`).
- E-b: `build` takes a second, injected effect elaboration beside the
  witness. Changes the brief's `build` type and leaves that input
  untracked.
- E-c: lowering stops reading effect rows from the checked IR. Needs
  an audit of specialization keys, which carry an effect component.

Until this is decided, Task 7.1 may land the type-sorted and
record-sorted parts: its `build` fills **inferred** effect positions
(those that are metas today) with the closed empty row and keeps
declared ones, T2 and T8 compare effect-erased projections renumbered
after erasure (§9), and Task 4.6 stays blocked. The scope of T2 is
then narrower than the brief's "same checked IR", and says so in its
name.

Task 0.7 (docs/plans/r0-erased-rows.md §6) adds two points to E-a:
rows inside `Inline` images are witness content no atom checks, and,
since §9 keeps image metas in the online numbering, E-a suffices only
with that note's (b-joint) restriction, or with effect-row metas in
images named; under E-a, T2 and T8's effect-erased scope is revisited.

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

One labelling gap: `CheckedName` (T-R0b §5.2) has no constructor for
a handler clause's parameter types (E20: "clause bodies generated with
parameters at θ"; the checked `HandlerClause` has `parameters ∷ Array
Param`). Proposed: `ClauseParamType Path Int Int` (handler path,
clause index, parameter index), so those reads get an exact site.

T5 asserts the two disagreements by name; any other disagreement
fails it. T5b checks `positionsOf` against the IR itself, so the
derived view does not rest on generator-written claims alone.

### 12.3 Changes this implies for the owning documents

Listed for their owners; this task edits none of them.

- T-R0a §3.2-§3.3 and §4.2 "Read-back and D1": `generate`'s type
  (§3.5), `Elaborating` (§3.4), `elaborate` and its outcomes (§3.5,
  §8), and `decide` returning `Judged` with each Solved verdict
  (§6.2).
- T-R0b §5.2, §5.3 and §11 item 17: the mechanism is §3-§6; `position`
  becomes a check against `positionsOf` (§12.2); `ClauseParamType`;
  the two amendments of §12.2.
- Task 3.1's `RecordedProblem`: a `FunctionId` field, unconditionally
  (§6.2).
- Plan Task 1.1 (observations from re-review 2, outside this spec):
  its own Internal rules have the placement defect fixed here in
  §3.1. `Domain.Recorded` and `Domain.Verdict` must import their
  `.Internal` modules to re-export the opaque types, so each
  importer list needs the public module added, with E6's allowed
  form. Its glob "Features.Check.Generate*" needs the anchoring
  `^Features\.Check\.Generate(\.|$)`. Plan Task 1.2's `emptyProblem`
  is not exported from `Features.Check.Generate` (§3.1; ruling R2).
- W §1.6 and §4 Cov: `Req = requests e`; the domain and its fault
  (§7); Cov-S, a `Row` variable's binding is `Free`, `Inline
  (TRecord _)` or `Inline (TVar _)` of a record-sorted variable, as an
  explicit clause; `NameMarker` as a `Feature` (§8.3).
- The plan's Task 4.4: `coverage` takes the domain (§7). Task 7.1:
  the tests of §10 replace its acceptance list.

### 12.4 What the gate is asked to accept

1. Rank-2 handles with nominal roles, and `Judged`, as the identity
   mechanism (§6).
2. `untracked` as `elaborate`'s first step, also run by the driver
   after `generate`, keeping `generate` total (§3.5, §5 layer 2).
3. The newtype for `Elaborating` instead of a record alias, with
   `build` reachable only from `Elaborate` (§3.4).
4. Import rules E1-E6 and the allowed re-export form (§3.1).
5. `covDomain` faulting on `Recon ∩ requests` (§7).
6. N1-N8 as local machinery (§2).
7. §12.1's routing to Task 0.7: E-a recommended; Task 7.1 may land the
   rest first, with T2 and T8 effect-erased and Task 4.6 blocked; G-D1
   does not close before Task 0.7 settles it.

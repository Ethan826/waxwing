# What does a generic type variable range over? A decision memo

2026-10-21. For the author. Written at d7113d7 on a worktree branch. This
memo informs a decision; it makes none. Nothing here changes the
compiler, the dossier, the Lean library or any approved statement. The
recommendation in §7 is mine, and it is marked as such.

Status labels used throughout:

- **proved**: a Lean theorem in research/composition-proofs, named;
- **derived**: argued here from proved results or definitions, with no
  Lean proof;
- **conjectured**: believed, with no argument good enough to call derived;
- **checked**: bounded executable evidence;
- **cited**: prior art. I cite these from memory and did not recheck
  section or page numbers for this memo. Where a sentence is my reading of
  a source rather than the source's claim, it says "my inference".

## 0. Summary

Dossier §18.27 and §18.28 ask whether Waxwing's generic type universe is
"closed per program or extensible with fresh opaque nominal types". The
author asked first whether that framing is right. §1 argues that it is
only partly right. D3b's completeness premise (`Fresh`) needs one thing:
an unbounded supply of **opaque atoms**, values that a rigid type
variable can take and that no constraint of the problem can name or
take apart. Three sources of "freshness" are easily confused:

1. skolem constants the checker invents (D3b's `CConst`) supply none of
   this by themselves. They are a proof device, and they are complete
   only if the semantics already contains atoms;
2. nominal types added by later modules supply atoms only if acceptance
   is *defined* to quantify over such additions, and even then only
   finitely many at a time;
3. infinitely many constructed types (arrows, records, `List(List(…))`)
   supply none, because every one of them can be taken apart. The
   finite-base family proves this for arrows and records.

So the real question is about the **range of a rigid type variable in the
definition of validity**, and separately about **when checking happens**.
Extensibility is one argument for atoms. It is not the only one, and it
is not sufficient by itself. §2 restates the options on those two axes.
§3 gives the consequences for the campaign's results. §4 covers the
consequences for the language, §5 prior art and §6 the procedure. §7
gives my recommendation, and §8 the questions only the author can
answer.

## 1. Is "closed versus extensible" the right distinction?

### 1.1 What `d3bComplete` actually assumes

`d3bComplete` (Composition/Typed/Complete.lean; proved) has the premise
`Fresh P z e` (Typed/Model.lean):

```lean
def Fresh (P : SigProblem Label B) (z : Cell → Label)
    (e : CConst Label → B) : Prop :=
  (∀ S S', z S = z S' → S = S') ∧ (∀ S, z S ∉ written P) ∧
    (∀ c c', e c = e c' → c = c') ∧ ∀ c, e c ∉ basesOf P
```

`e` must inject **every** generic constant, `T n` for every natural `n`
included, into the problem's own base type `B`, outside the bases that
`P` writes. So `B` must be infinite (derived: `CConst Label` is infinite
and `e` is injective). The proof realizes each generic constant as a
real base (`dn`), solves there, and reads the solution back (`up`).
What the realization needs from a base is that `P` cannot match it.
`P` matches a base only by writing it, and `e c ∉ basesOf P` rules that
out. Arrows and records don't qualify: `P` can match any arrow with
`β1 → β2` and any record with `{ ...w }`. d3b/construction.md §7 and
§14 item 2 record that realizing constants as records fails on
`∀ α. ∃ u. α = { ...u }`.

Labels are a separate matter. `z` injects cells into labels outside
`written P`. Waxwing's labels are identifiers, so that half of `Fresh`
always holds (dossier §13.1). Only the base half is in question.

### 1.2 The three kinds of freshness

**(1) Skolems introduced during checking.** The generic instance
θ*_π uses constants `T n`, `A r l` and `X r S` over the base type
`CB = B ⊕ CConst` (Typed/Model.lean). The checker can always introduce
them. Soundness does not care whether the language's universe contains
anything like them: `transfer`, `d3bSound` and `d3bValidAll` hold for
every `B` (proved; Typed/Transfer.lean, generic in `B`). Completeness
does care. Solving at θ*_π is complete only if every valid problem is
solvable at the skolems. `shape-split` is valid over a one-base universe
(`shapeSplit_validFin`, proved), and at θ*, where α is an opaque
constant, it is unsolvable: no branch matches an opaque constant
(derived from `no_solution_at`, whose argument applies to any base that
`P` does not write). Skolems are a device for *deciding*. They supply
atoms to the semantics only if the semantics already has them.

**(2) Fresh nominal types from modules or later code.** A nullary
nominal type that `P` does not write (`type Box = Box;`, an abstract
type exported by a module, a host type from FFI) behaves like an opaque
base towards `P`. `P` cannot name it and cannot take it apart. So
(2) can supply atoms, under two conditions:

- acceptance must be *defined* to quantify over such additions. The bare
  fact that a later module could add a type changes nothing if validity
  is still evaluated against one program's finite set of types;
- any one extension adds finitely many types, while `Fresh` asks for an
  injection of infinitely many constants at once. For finite values
  (`ValidFin`, Waxwing's semantics) the two should agree. A finite rigid
  assignment uses finitely many bases, and θ*_π is finite (`RigidFinC`
  in `GenericInst`). No theorem says so: d3b/construction.md §7 states
  that "no theorem replaces it by an injection of only used constants"
  (conjectured provable; see §6.3).

A nominal type with parameters, `T(a)`, that `P` does not write is also
opaque to `P` at its head. I conjecture it adds no validity distinctions
beyond those that nullary atoms already make, since `P` can neither
match `T` nor reach inside it. The Lean model has no parameterized
heads (`G` has `base`, `arrow` and `record` only; Syntax.lean), so this
is not formalized.

**(3) More inhabitants by construction.** The model already has
infinitely many ground types: arrows and records nest without bound.
The finite-base family is valid anyway for any complete finite base
list (`general_family_valid`, proved), and no witness fixes a base
arm's presence (`general_family_no_uniform`, proved). Infinitely many
constructed types therefore do **not** supply what D3b needs (proved at
the model level; §18.27 says the same). For Waxwing's other constructed
forms (`TData` applications, effect-bearing `TFun`, `THandler`;
src/Domain/Type/Core.purs) the same holds, because each head can be
matched with fresh arguments, so one branch per head covers it. That
is conjectured: the family has not been extended to n-ary heads
(finite-base-followup/README.md, action 3).

### 1.3 Verdict on the framing

"Closed versus extensible" mixes two different questions:

- **(X) the semantic range.** In the definition of validity, does a
  rigid type variable range over types built only from a fixed, finite
  set of heads, or over a domain that also has opaque atoms? D3b's
  premise is about X only.
- **(Y) the checking regime.** Is a generic function accepted once, per
  signature and body, or rechecked against each program, or against
  each instantiation that monomorphization reaches?

Extensibility, kind (2), is one *justification* for atoms in X. It is
not necessary. A closed whole-program language can still give generic
variables a parametric meaning, as System F does (§5). Nor is it
sufficient without a definition that quantifies over extensions. Kinds
(1) and (3) answer neither question. The options in §2 are restated on
the two axes.

Where the proof and the language may disagree: `Fresh` asks for an
infinite simultaneous supply of atoms inside one base type. The most
natural language semantics in which atoms come from modules gives
"arbitrarily many, finitely many at a time". Closing that gap is work
on the proof (§6.3), not a reason to change the language.

## 2. The options, stated for the Lean statements

Write `P : SigProblem Label B` (Sig/Validity.lean) and `ValidFin`
(Sig/Finite.lean). Below, `SigProblem.mapBase i` renames bases along
`i : B → B'`. **It does not exist in Lean.** `cliftP` (Typed/Model.lean)
is the special case `i = Sum.inl`, which also lifts labels. Each
definition below is a proposed statement, not a theorem.

**(A) Closed heads, per whole program.** `B` is the program's finite set
of nullary heads, the builtins plus every declared and host type,
across all modules. `Complete bs` lists it, as in
FiniteShapes.lean:

```lean
def ValidClosed (P : SigProblem Label B) : Prop := ValidFin P
-- used with [Fintype B], or a list bs with Complete bs and bs.Nodup
```

Validity is relative to the whole program's type set. Parameterized
heads are outside the current model.

**(A-unit) Closed per compilation unit.** As (A), but `B` is the set of
types visible where the function is declared. This is not sound for
later clients on its own. A client that adds `Box` can instantiate the
function at `Box`, where it may be invalid (`shapeSplit_not_valid`
shows such a function in the model). So (A-unit) needs a recheck at
the client, which turns it into (A) or (I) (derived).

**(I) Per instantiation (post-monomorphization).** A generic function
is accepted if every instantiation the program actually reaches is
solvable. This is not a property of the signature: for each reached
ground `θR`, `∃ θF, Sat (combine P θR θF) P.B`. An unused function has
no obligation. C++ templates work this way (§5).

**(B) Atom-rich, per signature.** Validity holds over every extension
by fresh opaque bases:

```lean
def ValidOpen (P : SigProblem Label B) : Prop :=
  ∀ (B' : Type) (i : B → B'), Function.Injective i →
    ValidFin (P.mapBase i)

-- one fixed atom supply, conjectured equivalent (§3.1, C3)
def ValidAtoms (P : SigProblem Label B) : Prop :=
  ValidFin (P.mapBase (Sum.inl : B → B ⊕ Nat))
```

`ValidOpen` can be justified by extension (kind 2), by abstraction
(abstract and host types), or by a parametric meaning of variables
given outright. The formula is the same in each case; §4 shows that
the justifications differ in what they commit the language to.

**(C) Atom-rich by default, closed only by explicit evidence.** As (B),
except that a signature may carry a constraint which supplies the case
split, such as a C001 class dictionary with one instance per head
(`where Shape(a)`). The split is then data the caller passes, not
something the checker infers from the absence of other types. In the
model, this is (B) for a problem whose `B` receives the evidence's
results as extra rigid inputs (derived; not formalized).

The two axes give this grid:

| | per signature (Y1) | per instantiation (Y2) |
|---|---|---|
| closed heads (X1) | (A), rechecked when the type set changes | (I) |
| atoms (X2) | (B); (C) with evidence | not useful: Y2 already sees ground types |

## 3. What each option implies for the campaign's results

### 3.1 Relations between the options

- **C1. (B) implies (A).** Take `i = id` in `ValidOpen` (derived; one
  line, once `mapBase` exists and `mapBase id = id`).
- **C2. (A) does not imply (B).** `validity_not_extension_stable`
  (ShapeSplit.lean; proved): `shapeSplit ()` is `ValidFin` over `Unit`,
  and `shapeSplit false` is not `ValidFin` over `Bool`. That
  `shapeSplit false` is `mapBase (fun _ => false) (shapeSplit ())`
  follows from the definition of `shapeSplit b` (ShapeSplitCore.lean),
  derived. So (A) accepts strictly more problems than (B).
- **C3. `ValidAtoms ↔ ValidOpen`** for nonempty `B`, finite values
  (conjectured, with an argument). Left to right: a finite rigid
  assignment over `B'` uses finitely many bases outside `i(B)`. Rename
  them injectively into `Nat`. An injective renaming preserves and
  reflects every atom, so `D` still holds. Solve there, then map back by
  a function that fixes `B` and is the inverse on the used bases. Every
  atom is positive (equations, `lacks`, `disjoint`; `ff` is never
  satisfied), so any function preserves satisfaction (derived; the same
  pattern as `transfer`). Right to left: instantiate. Not formalized.
- **C4. (I) is not comparable with either.** It accepts any function
  whose reached instantiations happen to be solvable, including ones
  invalid under (A), and accepts every unused function (derived from
  the definition).

### 3.2 Result by result

| Result | Under (A) | Under (B)/(C) | Basis |
|---|---|---|---|
| Presence: O1-O3, D2, `valid_iff_validCheck` | unaffected | unaffected | the presence fragment has no base types (§18.6); derived |
| P9s soundness `s1`, `s1_fin`; checker; K7 | holds | holds | stated for every `B` (Sig/Soundness.lean); derived instantiation |
| `decideCall_correct` (call sites) | holds | holds | any `B` with `DecidableEq`; proved |
| `transfer`, `d3bSound`, `d3bValidAll` | holds: sound | holds: sound | generic in `B`; proved |
| `d3bEqFree`, `d3bFlat`, `instanceIffUnifiable` | holds | holds | existence and vacuity, no `Fresh`; proved |
| `d3bComplete` | vacuous: `Fresh` unsatisfiable at finite `B` | applicable at `mapBase inl P` over `B ⊕ CConst Label` (§6.3) | proved; applicability derived |
| D3b completeness (valid ⇒ solvable at θ*) | **false** (`shape-split`) | open: needs `D3bExists` and the C3 bridge | derived; `Universality` open |
| D3a (uniform templates) | **false** | open: D3a-∞ conjectured; G-A depth gaps remain | `no_uniform_presence`, proved; d3a/attack.md (d) |
| finite-base family | a true obstruction | about a universe (B) excludes; kept as a boundary control | `general_family_*`, proved at the semantic level |
| `shape-split` | valid | invalid | `shapeSplit_validFin`, `shapeSplit_not_valid`, proved |
| §13.1 S2 assumption "base types may be finite" | stands, but completeness fails | must be amended for completeness claims | derived |

Notes on the table:

- **D3a under (A)** is refuted for the singleton `SigProblem`
  (`no_uniform_presence`, proved) and at the semantic-equation level
  for every complete finite base list (`general_family_no_uniform`,
  proved). The Nat-indexed `SigProblem` encoding and the source bridge
  are missing (finite-base-followup/README.md). Extending it to
  Waxwing's n-ary heads is conjectured.
- **D3a under (B)** is D3a-∞ in d3a/attack.md (d): conjectured, with
  argued steps P0-P4. The R2 gaps (`depth-ty`, `depth-row`,
  `tail-written`) do not depend on the universe. G-A needs a depth that
  depends on the problem either way (checked: hand witnesses and
  searches).
- **The `Fresh` premise.** Under (A) the premise cannot hold, because
  `CConst` is infinite and an injection needs an infinite `B` (derived).
  Under (B) it holds for the lifted problem. Take `B₁ = B ⊕ CConst
  Label` and `e = Sum.inr`, which is injective, and `basesOf (mapBase
  inl P)` contains only `inl` values (derived). Connecting this to
  `ValidOpen` needs C3.
- **The finite-base family stays useful under (B).** It shows exactly
  what (B) rejects and why. `general_family_missing_base` (proved) is
  the control: one unlisted base, which is one atom, makes the family
  invalid.
- **Bounded oracle evidence.** The oracle's universe is `Int` and `Bool`
  (d3a/attack.md, R1). That is (A) with two bases. Under (B) the oracle
  needs at least one base its problems never write. §18.27 already asks
  for a base-per-arm control (not done).

## 4. What each option implies for the language

### 4.1 Signature stability

*Can adding a type anywhere change whether an existing generic function
is accepted?*

- (A): yes. In the model, adding one base makes a valid problem invalid
  (`validity_not_extension_stable`, proved). In source,
  finite-base-followup has the shapes `generic.wxw` and `nominal.wxw`.
  `nominal.wxw` differs only in declaring `type Box = Box;` and using it
  at the call. All three probes are refused today with an unresolved
  split (probe-results.json; checked on existing output modules). The
  four-base `gate` is **not** established valid for Waxwing, which also
  has `TData`, effect arrows and `THandler`. So no source program has
  yet been shown to flip. That a suitably extended `gate` would flip is
  derived from the model.
- (A-unit): yes, and at a distance. A client module's new type breaks a
  library function whose text did not change.
- (I): yes, in a different way. A new *call* at a new type can make a
  function fail at that instantiation.
- (B)/(C): no. `ValidOpen` already quantifies over every extension, so
  adding a declaration cannot change it (derived). Removing a type the
  function does not write cannot change it either (derived, by C1-C3).

### 4.2 Modules and separate compilation

M001's direction (BACKLOG M001; the modules direction note at HEAD)
asks for explicit interfaces, abstract types and type identity. It
defers stable binary separate compilation and treats interface checking
as a distinct concern. ADR 002 says that "modules expose checked
interfaces".

- (B)/(C): a module's generic functions are checked once. The verdict is
  part of the interface, and every client can rely on it (derived from
  4.1).
- (A): the verdict is not a property of a module. It has to be
  recomputed from the whole program's type set, so an interface cannot
  record "accepted" (derived). Whole-program linking (M001) makes this
  possible, but every generic function in every library is rechecked
  whenever any type is added anywhere.
- **Abstract types.** Under (A), the closed check has to know whether an
  exported abstract type is a fresh head or a record or arrow. A record
  falls in the record branch; a fresh head needs its own branch. Client
  validity would then depend on the hidden representation, which
  breaks the abstraction the direction note asks for (derived). Under
  (B) an abstract type is an atom, consistent with Mitchell and
  Plotkin's reading (§5).

### 4.3 Libraries checked once, used later with new types

This is the main case for libraries (PKG001, STD001). Under (B)/(C) a
library's accepted generic function works at every type a later client
declares, with no recheck (derived). Under (A) or (A-unit) it does not
(4.1). Under (I) the library is never "accepted" as such, only its
instantiations are.

### 4.4 FFI and opaque host types

I001 plans typed Go FFI, and PKG001 plans host bindings. Every imported
host type is a new head.

- (A): adding a binding can change the validity of unrelated generic
  code (derived, as in 4.1).
- (B): host types are atoms, which is how a generic body sees them
  anyway (derived).

### 4.5 Monomorphization versus checking per signature

The compiler does see every instantiation (ADR 002, ADR 007), and that
makes (I) implementable. But the language already decided several
things per signature:

- "Every function is checked, including unused ones" (docs/language.md,
  Semantics). (I) would accept unused functions vacuously.
- Coverage runs "once per source match, so … source correctness does not
  depend on which specializations are reachable". It treats "rigid
  variables and holes [as] abstract types: no complete head set (like
  Int)" (polymorphism design §5 at HEAD; docs/language.md,
  "Patterns and coverage"). That is X2 for coverage. Whether it extends
  to record composition is the author's call. That it is the precedent
  is my inference.
- Type variables are opaque, and holes take the representative `Int`.
  This is valid partly because "no operation depends on a type argument"
  (ADR 007, condition 4; design §6). Under (A), a hole that reaches a
  position whose row placement depends on the head (as in `shape-split`)
  would let the representative's head pick the branch. Condition 4 would
  fail, and the hole would have to be reported as ambiguous, as C001
  already requires for constrained holes (derived).

### 4.6 Inference (INF001)

INF001 plans to infer requirements and error channels. Under (B), a
function's inferred requirements depend on its body and signature alone
(derived from 4.1). Under (A), the "requirement" that makes
`shape-split` valid is that no head exists beyond the listed ones. No
`where` clause can express that. Inferred requirements would depend on
the rest of the program, and a library could not publish them (derived;
my inference that this conflicts with INF001's aims).

### 4.7 Diagnostics

A refusal of a signature carries a counter-instance θR (§2.2,
Contradiction).

- (B): the counter-instance can be an atom. The message must then name a
  hypothetical type ("for a type declared elsewhere, `a` has none of the
  shapes this call distinguishes"). That is new wording, and it needs
  approval. The evidence is exact: `no_solution_at` is that argument
  in the model.
- (A): the counter-instance is a real type, but the error appears at a
  function the user did not change, caused by a declaration elsewhere.
  The user's rule that blame needs evidence would require the message
  to name that declaration as the cause (derived). Under (A-unit) the
  library author never sees the error.
- Either way, today's checker gives "Cannot tell which of gate's ui, …
  has field f" (probe-results.json), which is an Unresolved report.
  That is allowed by §2.4 if the required programs never reach it.

### 4.8 Type classes and instance selection (C001)

C001's direction is explicit dictionaries with several instances per
type and optional implicit selection (modules direction note; polymorphism
design §11).

- Under (C), a type-dependent split is a class, `Shape(a)` with one
  instance per head, and the dictionary supplies the case. A new type
  needs a new instance, written where the type is. A missing instance is
  an error at the call that needs it. This follows the open-world
  discipline of Haskell and Rust coherence (§5).
- Under (A), the checker builds that case split itself from the absence
  of other types. That is a closed world over types, global, and
  implicit. It is roughly an implicit closed instance chain over all
  heads (my inference, by analogy with instance chains and closed type
  families).

### 4.9 Programs the options treat differently

These are sketches. None was compiled for this memo.

1. **`route` through the six-armed `gate`**
   (finite-base-followup/generic.wxw). In the model with complete arms,
   it is valid under (A) and invalid under (B) (derived from
   `general_family_valid` and `general_family_missing_base`). For actual
   Waxwing, the arms must also cover `TData`, `THandler` and effect
   arrows. Not established.
2. **The same program plus `type Box = Box;`** (nominal.wxw, where the
   call uses `Box`). Invalid under every option: (A) now has an
   unmatched head, (I) reaches `Box`, and (B) was invalid already.
3. **The same program, `Box` declared but never used.** (A): invalid,
   since `Box` is in the type set. (I): valid if no reached instantiation
   uses `Box`. (B): invalid regardless. This is the clearest separation
   between (A) and (I) (derived).
4. **Ordinary record code** (`route` of §17, `split` with
   `where s disjoint t`, programs 4, 5, 11, the services scenario). No
   head case split is involved. All options agree (derived:
   `d3bEqFree` gives a generic instance without `Fresh`, and soundness
   holds everywhere). No desired-feature failure is demonstrated under
   any option (§18.28).
5. **Under (C)**, example 1 written with an explicit `where Shape(a)`
   whose dictionary carries the arm choice. Accepted once, and usable at
   `Box` after a `Shape(Box)` instance is added (conjectured; C001 has
   no design yet).

## 5. Prior art

**System F and parametricity.** In Girard's System F (1972) and
Reynolds's polymorphic lambda calculus (Reynolds, "Towards a theory of
type structure", 1974), `∀α. τ` quantifies over all types. Reynolds,
"Types, abstraction and parametric polymorphism" (IFIP 1983),
interprets type variables by arbitrary relations, and Wadler,
"Theorems for free!" (FPCA 1989), derives laws from that reading.
Reynolds, "Polymorphism is not set-theoretic" (1984), shows the
quantification cannot be read naively over sets. My inference: these
semantics give X2 outright. A variable's meaning is fixed with no
reference to which types a program declares, and a body that branches
on α's head is not parametric. `shape-split`'s witness branches on the
head of α at the type level, so it is not parametric in this sense.

**Abstract types.** Mitchell and Plotkin, "Abstract types have
existential type" (TOPLAS 1988): a client must work for every
representation of an abstract type. My inference: under (A) the
representation leaks into validity (§4.2), and under (B) it does not.

**ML.** *The Definition of Standard ML (Revised)* (Milner, Tofte, Harper
and MacQueen, 1997) gives each datatype declaration a fresh type name
(generativity). A type scheme's instances range over all types,
including names generated later. Damas and Milner (POPL 1982) give
principal type schemes that do not depend on the rest of the program.
My inference: ML is per signature over a domain that later declarations
extend. That is (B) justified by extension, kind (2).

**Skolems in checking.** GHC checks a signature by replacing its
variables with skolem constants (Peyton Jones, Vytiniotis, Weirich and
Shields, "Practical type inference for arbitrary-rank types", JFP 2007).
My inference: these are kind (1). They are complete for Haskell
because Haskell's semantics is parametric. They do not create the
parametricity.

**Haskell and PureScript.** Neither allows a case on a type variable's
head without a class constraint (`Typeable`, or a user class). Type
class resolution follows an open-world assumption: GHC does not commit
to an instance on the grounds that no other instance exists, because
another module may add one (GHC User's Guide on overlapping instances;
cited from memory). Closed reasoning needs an explicit, local
declaration: closed type families (Eisenberg, Vytiniotis, Peyton Jones
and Weirich, POPL 2014) or instance chains (Morris and Jones, ICFP
2010). PureScript has instance chains. Its row constraints `Union`,
`Nub` and `Lacks` (module `Prim.Row`) appear in a function's signature
and are solved where the rows are known. My inference: this is the
nearest published analogue to (C). A generic row operation states its
requirement in the interface rather than having it established over a
closed universe.

**Rust.** Generic bodies are checked against their trait bounds once,
before monomorphization, and errors after monomorphization are treated
as exceptions (my summary). Coherence (RFC 1023, "Rebalancing
coherence"; RFC 2451; the Rust Reference, "Trait implementation
coherence") reasons explicitly about what downstream crates may add,
and it limits negative reasoning to types and traits a crate owns. My
inference: Rust is per signature with an open world, and it pays for
any closed reasoning with ownership rules.

**C++.** Templates are checked when instantiated (two-phase lookup), and
C++20 concepts constrain uses without checking template bodies against
the concept. This is (I). The usual cost is errors reported inside
library code at the user's instantiation (common knowledge, not a
specific citation).

**Go.** A type parameter's constraint can name a finite type set
(`~int | ~string`; the Go specification, "General interfaces", since
1.18), and the generic body is checked once against that set. My
inference: closed reasoning is allowed only when the signature writes
the closed set. That is (C) with a syntactic type set instead of a
dictionary.

**Intensional type analysis.** Harper and Morrisett, "Compiling
polymorphism using intensional type analysis" (POPL 1995), and Crary,
Weirich and Morrisett (ICFP 1998) let code branch on types over a fixed
set of constructors. My inference: the type-dependent witnesses that
(A) needs are a compile-time form of this, and these papers are the
published primitive to compose if (A) is chosen (ADR 014).

## 6. Consequences for the procedure

### 6.1 What a checker must do

- **(B)/(C).** For each written-label pattern π, build θ*_π (D3b §4)
  and decide whether `B` is solvable there. That is one call-site
  problem per pattern, which `decideCall` decides (proved,
  `decideCall_correct`), once θ*_π is encoded as a finite call-site
  problem. That encoding is not done (d3b §7). Soundness: proved
  (`d3bSound`). Completeness: needs `D3bExists` (open; `Universality`,
  `CellIndependence` and `MGUExists` unproved), `d3bComplete` (proved)
  and the bridge to `ValidOpen` (C3, conjectured). So yes: under (B),
  D3b's generic instance with fresh constants is the natural decision
  procedure. Each skolem is exactly an atom the semantics contains.
  I conjecture that the procedure is complete once those obligations are
  discharged. The cost is still up to `2^|pairs|` patterns (§12).
- **(A).** A complete checker must also split on the head of every rigid
  type variable, and on heads inside rigid fields, down to the depth
  the problem can inspect, and then solve per case. The witnesses are
  type-dependent (proved necessary: `no_uniform_presence` and
  `general_family_no_uniform`). The dossier calls such witnesses "a
  proposal, not an adopted feature" (§18.27). Whether (A)-validity is
  decidable, and at what depth, is open (conjectured decidable, with
  depth bounded by the problem's size; not argued). Compilation would
  have to carry the head-dependent choice into each specialization.
  Monomorphization makes that possible, but it changes ADR 007's
  representative argument (§4.5).
- **(I).** No signature check. Run `decideCall` for each reached
  instantiation after specialization: errors after monomorphization.
- **Every option.** A checker that answers Unresolved where it cannot
  decide is acceptable by §2.4. Today's compiler already answers
  Unresolved on the probes, under every option.

### 6.2 Does (A) need type-dependent witnesses?

For completeness, yes (proved for the model, as above). For soundness,
no: a (B)-style checker is sound under (A) and just rejects more,
answering Unresolved on `shape-split` (derived: C1 plus `d3bSound`).
So one option is to adopt (A) semantically and never decide its extra
cases. The checker is then sound and incomplete *by design*, and every
Unresolved message would have to say so.

### 6.3 Changing the proof instead of the language

The author asked that this be presented as an option. It is.

- **P-1 (under (B)).** Replace `Fresh` with an injection of only the
  constants θ*_π uses, or prove C3 and apply `d3bComplete` at
  `B ⊕ CConst Label` (§3.2). Either removes the gap between "infinitely
  many atoms at once" and "finitely many per extension". Conjectured
  routine. The realization `dn` touches only constants that occur in
  `WithinG` values, but that has to be checked against `up (dn g) = g`.
- **P-2 (under (A)).** State and prove a new completeness theorem for a
  procedure with head case splits, and restate D3a with type-dependent
  templates. This is new mathematics, and it would need its own
  statements first (proof dossier policy).
- **P-3 (either).** Keep the proofs. State D3b completeness relative to
  `ValidOpen` only, and record incompleteness relative to `ValidClosed`
  as a known, documented boundary. That boundary is exactly the
  finite-base family.

None of these needs the language to change to suit the current premise.
Under (B), P-1 or P-3 suffices. Under (A), P-2 or P-3.

## 7. Recommendation (mine, not the author's decision)

**I recommend (B): validity per signature over an atom-rich range, with
(C), explicit evidence through C001, as the route to any type-dependent
behaviour that is wanted later.** On the proof side, P-1 to close the
`Fresh` gap, and P-3's documentation of the finite-base family as the
boundary.

Each reason below is a language goal; none is the proof's premise:

1. **Signature stability.** Under (B), adding a type, module or host
   binding never changes whether existing generic code is accepted
   (§4.1). (A) and (A-unit) lose this, as proved in the model.
2. **Separate checking and libraries.** M001 wants checked interfaces
   and abstract types, and PKG001 and STD001 want libraries checked
   once. Only per-signature X2 gives a verdict an interface can carry
   (§4.2, §4.3).
3. **Consistency with decisions already made.** Opaque type variables,
   coverage with "no complete head set", the representative argument,
   and checking unused functions (§4.5) all treat rigid variables as
   abstract. (A) would make record composition the one feature that
   reasons over a closed world. Reading these as precedent is my
   inference.
4. **Inference and diagnostics.** Requirements and counter-instances
   depend on the function alone (§4.6, §4.7).
5. **Prior art.** ML, Haskell, PureScript, Rust and Go check generic
   bodies once over an open or parametric range, and they confine
   closed reasoning to explicit local declarations (§5).

That (B) also makes `d3bComplete` applicable is a consequence of this
choice, not a reason for it. If the author's goals pointed to (A), the
proof should change (P-2 or P-3), not the language.

**Risks.**

- (B) rejects programs that (A) accepts, such as `shape-split`. If an
  idiom the author wants needs head-dependent row placement, (B)
  pushes it to explicit evidence, which C001 has not yet designed.
- (B)'s diagnostics name a hypothetical type, which users may find
  abstract. The wording needs design and approval.
- (B)'s completeness is still conditional on open obligations
  (`D3bExists`, C3 or P-1, and the call-site encoding of θ*). Choosing
  (B) does not finish the mathematics.
- The model lacks n-ary heads, effect arrows and handlers. The claim
  that they add no distinctions beyond atoms is conjectured.

**Evidence that would change the recommendation.**

- A required program (acceptance programs 4, 5 and 11, the services
  scenario, or an application example the author names) whose natural
  signature is valid only under (A). §18.28 reports none so far.
- A decision that M001 will not have separately checked interfaces or
  abstract types, and that libraries are always source-recompiled with
  rechecking. That weakens reasons 1 and 2.
- A C001 design that rules out explicit evidence for this purpose.
- A published, composable decision procedure for (A)-validity with
  usable diagnostics. That would lower (A)'s cost, though not its loss
  of stability.
- An existing test-corpus program that the current compiler accepts and
  that (B) would reject. I expect none, since today's checker never
  splits on heads (conjectured; not run).

## 8. Questions for the author

1. In the definition of a generic function's validity, does a type
   variable range over types built from the program's finite heads
   (X1), or over a range with opaque atoms (X2)?
2. Must acceptance of a generic function be a property of its signature
   and body alone, so that adding a type elsewhere can never change it
   (signature stability)?
3. Does "every function is checked, including unused ones" stand? If
   so, (I) is ruled out.
4. Will M001's abstract types and I001's host types be opaque to generic
   code? Under (A), must a client's validity depend on whether an
   abstract type is a record?
5. If head-dependent row placement is ever wanted, should it come
   through explicit C001 evidence (C) or through implicit case analysis
   by the checker (A)?
6. Which proof route: P-1 (weaken `Fresh` to the used constants, or
   prove C3), P-2 (new completeness for closed heads), or P-3 (state
   completeness for one semantics and document the other as a
   boundary)?
7. Must n-ary nominal heads, effect-bearing arrows and handlers enter
   the formal model before any typed completeness claim is reported?
8. Under (B), may a diagnostic's counter-instance name a hypothetical
   type, and with what wording?
9. Should the oracle gain an atom base, one its problems never write,
   before any further D3a/D3b run (as §18.27 asks)?

## 9. Sources read

At d7113d7: docs/next-session.md (top two entries); dossier §1-§2,
§12, §13.1-§13.2, §14.1-§14.3, §18.6, §18.10, §18.27 and §18.28;
research/division-campaign/finite-base-followup/ (README, the three
`.wxw` probes, probe-results.json); d3b/construction.md; d3a/attack.md;
Lean: Sig/Validity.lean, Sig/Finite.lean, Typed/Model.lean,
Typed/Defs.lean, Typed/Complete.lean, TypedAttack/ShapeSplit.lean,
ShapeSplitCore.lean, FiniteShapes.lean, FiniteObstruction.lean;
docs/language.md (Types, Semantics, Polymorphism); ADR 002, 003, 007,
013; BACKLOG rows C001, M001, I001, PKG001, STD001; src/Domain/Type/
Core.purs (type constructors).

Direction documents. Read at HEAD with `git show`, and compared with the
main checkout's uncommitted copies. The modules and instance-selection
direction has an uncommitted "Assurance gate (2026-10-21)" section. The
polymorphism design has an uncommitted "Assurance follow-up" paragraph
at the start of §8 that points to the type-system assurance register. Neither
addition changes anything this memo relies on. The memo cites only
HEAD text.

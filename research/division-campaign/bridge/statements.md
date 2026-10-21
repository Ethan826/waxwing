# The P-1 bridge: statements first

Date: 2026-10-21. Base: c341109 (dossier §18.31). Scope: definitions,
exact statements, the completeness boundary (P-3), intended instances,
a restrictions table and an independent adversarial review. **Nothing
here is proved.** Dossier §18.33 approved `ValidOpen` and authorized a
first proof tranche, to start after the second review (§10).

Lean: research/composition-proofs/Composition/Typed/Bridge/, six files
split from the former BridgeDefs.lean (§18.33; the split changed no
statement, §10):

| File | Contents |
|---|---|
| Extension.lean | `mapBase` and relatives, `BasesWithin`, `substBase`, E1-E6 |
| Valid.lean | `ValidOpen`, `ValidAtoms`, B0, B1, BS |
| Fresh.lean | `constIn`, `ConstsInC`, `FreshLabels`, `FreshBasesOn`, B2f, B2c, B2, B2g, B2n |
| Complete.lean | `D3bExistsWithin`, B3a, W, B3, B3e, B3f, C |
| Sound.lean | B4f, B4, B5, BS-c1, BS-c1f, BS-c2 |
| Examples.lean | `intArmP`, `twoBaseP`, N1-N7 |

Every claim is a `def … : Prop`; the files have no theorem, `sorry` or
axiom, and build in the default target. No existing statement or
definition was changed. The D3b stream's files (other `Typed/*.lean`,
d3b/) were read, not edited.

Status labels: **proved** (a Lean theorem, named); **derived** (argued
here, not mechanized); **conjectured** (believed, argument incomplete);
**checked** (executable evidence); **proposed** (a statement awaiting
approval). Every statement in §3 is *proposed and unproved*. The
"sketch strength" column grades the argument offered, not a proof.

History: a first draft was reviewed by two independent agents, one
pass for soundness and one for completeness (§9). Neither found a
statement false as written. The changes they prompted are listed in §9
and are already applied to this text and to the Lean file.

## 0. Summary

Option B (dossier §18.31): a generic function may rely on its written
constraints; it may not assume that the types now declared exhaust
what callers can supply. In the model, that is `ValidOpen`: `ValidFin`
at every injective extension of the bases.

`d3bComplete` (proved) asks, through `Fresh`, for an injection of
*every* generic constant into the problem's own base type. That is
impossible for finite `B`. The bridge replaces it with an injection of
only the constants a generic instance uses, into an *extension* of
`B` (B2). Option-B validity supplies validity at that extension (B3a).

Existence is kept apart throughout:

- B3a is completeness at any given generic instance, with no existence
  premise;
- `D3bExists` does not carry the `WithinC` premise `d3bComplete`
  needs. W (trimming) would bridge that, but §18.33 deprioritized it in
  favour of existence theorems that already return `WithinC`:
  `d3bEqFree`, `d3bFlat`, and the D3b stream's `universality` and
  `d3bExistsWithin` (§10.4);
- B3 composes these with existence, per problem or globally;
- B3e and B3f would give option-B completeness on the equation-free
  and flat fragments with **no open existence premise**, because
  existence there is already proved (`d3bEqFree`, `d3bFlat`); their
  scope, label-freshness and fragment premises remain.

The memo's `ValidAtoms ↔ ValidOpen` (B1) is **not** on the critical
path for completeness: B3a uses `ValidOpen` directly at `B ⊕ CConst`.
B1 matters for the oracle (one fixed atom supply to test).

Soundness for option B (every pattern solvable ⇒ `ValidOpen`) is not
given by the existing `d3bValidAll`, whose conclusion is closed
validity at `B`. It needs B4f (generic instances cover finite
instances over extensions) and B5. With B3 they give the
characterization C, which is the exact P-3 statement: relative to
option B, D3b would be complete and sound; its rejections among
closed-valid problems would be exactly `ValidFin P ∧ ¬ ValidOpen P`.

## 1. What an extension is

An extension is an injective function `j : B → B₁` between base types.
It acts by renaming bases and nothing else (`mapBase`, Bridge/Extension.lean):

| Thing | Action of `j` |
|---|---|
| written base `.base b` in a `TExpr` | `.base (j b)` |
| arrows, records, `Fields`, row tails | structure unchanged; recurse |
| type variables, row variables | unchanged (`.tvar n` stays) |
| labels (written fields, `lacks r l`) | unchanged |
| `disjoint`, `ff` | unchanged |
| `rigidTy`, `rigidRow` | unchanged |
| ground values `G` | `mapG`: bases renamed at every depth |
| assignments | `mapAssign`: each value by `mapG` |
| generic assignments (`CAssign`) | `mapC j = mapAssign (Sum.map j id)`: problem bases renamed, constants `CConst` and cell labels kept |

What is preserved: the label type, every variable, every atom's shape,
and the *identity and distinctness* of the written bases (injectivity).
What is added: the bases of `B₁` outside `j(B)`. To the problem they
are atoms: it does not write them, so it can neither name them nor
take them apart.

**Written base constants.** A base the problem writes (`Int` in
`{ ...u1, ...m1 } = { f: Int }`) is a name the function relies on:
`j` keeps it and keeps it distinct from every other base. Validity is
never allowed to assume that the written bases, together with arrows
and records, exhaust the values of a rigid variable. Unwritten bases of
`B` are already atoms to the problem, before any extension. Why
injective: a non-injective `j` could identify two written bases, which
can make an unsatisfiable `D` satisfiable or the reverse. That is a
change of interface, not an unrelated addition.

Labels are not extended. `ValidFin` already quantifies over every
label of `Label`, and Waxwing's labels are identifiers, so the label
supply is infinite. The completeness statements assume it, through
`FreshLabels` (the label half of `Fresh`, unchanged), which needs an
injection of `Cell = List Nat` into the unwritten labels. So the
"finite freshness" here is for bases only; labels still get an
infinite injection. That is harmless for Waxwing and is asymmetric on
purpose (§11, question 2; answered in §18.33).

**Checks** (scratch file, not committed; `lake env lean`, exit 0):
by `rfl`, `(shapeSplit ()).mapBase (fun _ => false) = shapeSplit
false` (memo C2's renaming), `routeP.mapBase inl = routeP`,
`agreeP.mapBase inl = agreeP`, `(thetaFree (shapeSplit ()) π).ty 0 =
.base (.inr (.T 0))` and `basesOf (intArmP ()) = [()]`. Both reviewers
repeated the first three independently.

## 2. Definitions (Typed/Bridge/)

- `mapBaseT`, `mapBaseF`, `mapBaseAtom`, `SigProblem.mapBase`: rename
  written bases along any `f : B → B'`.
- `mapG`, `mapGO`, `mapAssign`, `mapC`: the same on values.
- `substBase`, `substAssign`: replace each base by a *value* (used
  where a base map is unavailable, e.g. an empty base type).
- `ValidOpen P := ∀ (B₁ : Type) (i : B → B₁), Function.Injective i →
  ValidFin (P.mapBase i)`. Option B's validity.
- `ValidAtoms P := ValidFin (P.mapBase (Sum.inl : B → B ⊕ Nat))`. One
  fixed, countably infinite atom supply.
- `BasesWithin s g`: every base in `g`, at every depth, satisfies `s`.
- `constIn U`, `ConstsInC P U θs`: the rigid values of `θs` use only
  the constants listed in `U` (problem bases unrestricted; `WithinC`
  restricts those).
- `FreshLabels P z`: `z` injective, avoiding `written P`. Verbatim the
  first two conjuncts of `Fresh`.
- `FreshBasesOn P j U e`: `e : CConst → B₁` is injective on `U`, and
  for `c ∈ U` and every written base `b`, `e c ≠ j b`. Nothing is
  required of `e` off `U`. At `j = id` and with `U` everything, this
  is `Fresh`'s base half restricted to a list.
- `D3bExistsWithin`: `D3bExists` with `WithinC` added to the witness.
  `ExistsWithinAt P`: the same for one problem.
- `intArmP b`: a test problem with a written base and a rigid type
  variable (§4). `twoBaseP b₁ b₂`: two written bases required of one
  rigid α (N7).

## 3. Statements (all proposed, all unproved)

Universal quantification over `P`, `π`, `θs` and so on is in the Lean
text. `Label` has decidable equality throughout, as in Typed/.

### Building blocks

| Name | Statement | Sketch strength |
|---|---|---|
| E1 `MapBaseId` | `P.mapBase id = P` | derived (structural) |
| E2 `SatMapBase` | `Sat θ C → Sat (mapAssign f θ) (C.map (mapBaseAtom f))`, any `f` | derived: positivity |
| E2′ `SatSubstBase` | for atoms of `P` renamed along `g`, a value substitution `s` with `s (g b) = .base (h b)` on written bases maps satisfaction to the atoms renamed along `h` | derived: positivity |
| E3 `FinSupport` | `FinG g → ∃ bs : List B, BasesWithin (· ∈ bs) g` | derived |
| E4 `MapBaseComp` | `(P.mapBase f).mapBase g = P.mapBase (g ∘ f)` | derived (structural) |
| E5 `MapBaseSyntax` | `written` unchanged, `basesOf` mapped, `Scoped` unchanged | derived (structural) |
| E6 `MapBaseClift` | `cliftP (P.mapBase f) = (cliftP P).mapBase (Sum.map f id)` | derived (structural) |

E2 is the positivity argument the memo names. Every atom is positive:
equations need both sides defined and equal; `lacks` and `disjoint`
are per label; `ff` never holds. Renaming bases by any function
commutes with `evalT` (compositions depend only on label sets, which a
base renaming does not touch) and preserves equality, absence and
disjointness. No injectivity is needed for *preservation*. It is the
same pattern as `transfer` and `holds_up` (proved), for a different
map. E2′ extends it to substitutions of values for unwritten bases;
B1b at an empty base type, B4f and B5 need it.

### B0, B1, BS: the definitions of option B

| Name | Statement | Sketch strength |
|---|---|---|
| B0 `OpenToFin` | `ValidOpen P → ValidFin P` (memo C1) | derived from E1, `i = id` |
| B1a `OpenToAtoms` | `ValidOpen P → ValidAtoms P` | derived: `i = inl` |
| B1b `AtomsToOpen` | `ValidAtoms P → ValidOpen P` | conjectured with argument |
| B1 `AtomsIffOpen` | `ValidAtoms P ↔ ValidOpen P` (memo C3) | B1a ∧ B1b |
| BS `OpenExtensionStable` | `Injective j → (ValidOpen P ↔ ValidOpen (P.mapBase j))` | conjectured with argument |

**Expected direction.** B1a is immediate. B1b is the content. Its
argument: given injective `i : B → B₁` and a finite rigid `θR` over
`B₁` satisfying `D` renamed, E3 gives the finitely many bases `θR`
uses. Choose `ρ : B₁ → B ⊕ Nat` sending `i b ↦ inl b` and the used
bases outside `i(B)` injectively into `inr`. By E2, `mapAssign ρ θR`
satisfies `D` renamed by `ρ ∘ i = inl` (E4). `ValidAtoms` gives a
finite `θF'`. Map the solution back by `σ`, which sends `inl b ↦ i b`
and each used `inr n` to the base it came from. By E2 it still solves
`B`, and the rigid part returns to `θR` because `σ ∘ ρ` fixes every
base `θR` uses. Unused `inr n` in `θF'` need some image; when `B₁` is
empty there is none, and E2′ (atom ↦ empty record) replaces the base
map.

**B1 is stated more strongly than memo C3**, which says "for nonempty
B". B1 is unrestricted; the soundness reviewer independently judged
the empty case true by E2′. If the author prefers the memo's form, add
`[Nonempty B]` and record the empty case separately.

One fresh atom is **not** enough, which is why `ValidAtoms` uses
`Nat`. With rigid α, β and seven arms on `{ f: α → β }` (`γ → γ`,
α an arrow, α a record, α = `Int`, the same three for β), the
signature is valid over `{Int, a}` (both atoms ⇒ α = β = `a`) and
invalid with two atoms (α = `a`, β = `a'`). Derived; not in Lean.

BS is the author's "checking is stable under unrelated additions"
(§18.31), stated for validity: adding types (`j`) neither gains nor
loses acceptance. Forward: compose injections (E4). Backward: from
`ValidOpen (P.mapBase j)` take the extension `inl : B₁ → B₁ ⊕ Nat`
for a fresh atom supply (with `j` bijective, `B₁` itself has no spare
atom), then the B1b argument. For the *checker's* stability see BS-c
below.

### B2: `d3bComplete` with finitely many fresh bases

| Name | Statement | Sketch strength |
|---|---|---|
| B2f `ConstsFinite` | `RigidFinC P θs → ∃ U, ConstsInC P U θs` | derived |
| B2c `FreshGivesFreshOn` | `Fresh P z e → FreshLabels P z ∧ ∀ U, FreshBasesOn P id U e` | derived (unfold) |
| B2 `D3bCompleteOn` | see below | conjectured with argument |
| B2g `CompleteOnGivesComplete` | `Fresh P z e → WithinC P θs → GenericInst P π θs → ∃ U, FreshLabels P z ∧ FreshBasesOn P id U e ∧ ConstsInC P U θs ∧ P.mapBase id = P` | derived from B2c, B2f, E1 |
| B2n `D3bCompleteFinExt` | `U.length < n →` B2's premises `→ ValidFinIn (P.mapBase inl) π` over `B ⊕ Fin n` `→ SolvableFinAt P θs` | derived from B2 |

```lean
def D3bCompleteOn : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (B₁ : Type) (j : B → B₁) (z : Cell → Label) (e : CConst Label → B₁)
    (U : List (CConst Label)),
    Function.Injective j → FreshLabels P z → FreshBasesOn P j U e →
    ConstsInC P U θs → WithinC P θs → GenericInst P π θs →
      (ValidIn (P.mapBase j) π → SolvableAt P θs) ∧
      (ValidFinIn (P.mapBase j) π → SolvableFinAt P θs)
```

**The premise that replaces `Fresh`'s base half** is `FreshBasesOn P j
U e` together with `ConstsInC P U θs`: inject only the constants in a
list `U` that covers θs's rigid values, into `B₁`, away from the images
of the written bases. By B2f such a finite `U` exists for every
generic instance (`GenericInst` includes `RigidFinC`). So, if B2 holds,
an extension by finitely many new atoms suffices: `B₁ = B ⊕ Fin (|U| +
1)`, or any larger one. (The `+ 1` keeps `B₁` nonempty, so that a
total `e` exists when `B` is empty and `U = []`; found in review.)
Validity is read at the extension, `ValidFinIn (P.mapBase j) π`. At
`j = id` and `B₁ = B`, B2 with B2c, B2f and E1 gives back *both*
halves of `d3bComplete` (B2g).

Every other premise is `d3bComplete`'s, unchanged: `FreshLabels`
(its label half, verbatim), `WithinC`, `GenericInst`. `Injective j` is
more than the argument uses (injective on `basesOf P` would do).

Argument (route only). Realize `θs` over `B₁`: problem base `inl b ↦
j b`, constant `inr c ↦ e c`, cell label `inr S ↦ z S`, as `dn` does.
It satisfies the renamed `D` and has pattern π (E2, E6 and
`dn_holds`'s argument). Validity at `B₁` gives `θF`. Read `θF` back
into `CB = B ⊕ CConst`: `e c ↦ inr c` for `c ∈ U`, `j b ↦ inl b`, any
other base to any value, e.g. `inr (T 0)` (positivity, as in
`holds_up`). The round trip `up (dn g) = g` on θs's rigid values needs
only: `e` injective on `U`, `e(U)` disjoint from `j(basesOf P)`, `j`
injective, and θs's bases within `U` and the written bases
(`ConstsInC`, `WithinC`). A collision of `e c` with `j b` for an
*unwritten* `b` is harmless, since `WithinC` keeps unwritten bases out
of θs. **The existing `eBack` cannot be reused**: it picks a preimage
by `Classical.choose` over all constants, and with `e` injective only
on `U`, `e c'` for `c' ∉ U` may collide with `e c`. The proof needs a
`U`-relative back map; the existing `up_dn` assumes full `Fresh`. The
soundness reviewer checked this route and found no gap.

Observation (read from Complete.lean): `d3bComplete`'s proof discards
the coverage conjunct of `GenericInst` (`obtain ⟨hfin, hD, hpat, _⟩`).
B2 keeps the full `GenericInst` premise anyway, to mirror
`D3bComplete` exactly; weakening it is a question for the author (§11).

### B3: completeness under option B, existence kept separate

| Name | Statement | Sketch strength |
|---|---|---|
| B3a `D3bCompleteOpen` | `FreshLabels P z → WithinC P θs → GenericInst P π θs → ValidOpen P → SolvableFinAt P θs` | derived from B2, B2f |
| W `WithinTrim` | `GenericInst P π θs → ∃ θs', GenericInst P π θs' ∧ WithinC P θs'` | conjectured with argument |
| W (global) `ExistsToWithin` | `D3bExists → D3bExistsWithin` | from `WithinTrim` |
| B3 per problem `D3bOpenCompleteAt` | `(∃ z, FreshLabels P z) → ExistsWithinAt P → ValidOpen P → ∀ π, HasInstance P π → ∃ θs, GenericInst ∧ WithinC ∧ SolvableFinAt` | derived from B3a |
| B3e `D3bOpenCompleteEqFree` | `Scoped P → EqFree P → (∃ z, FreshLabels P z) → ValidOpen P → ∀ π, HasInstance P π → SolvableFinAt P (thetaFree P π)` | derived from B3a and `d3bEqFree` (proved) |
| B3f `D3bOpenCompleteFlat` | the same with `FlatD` and `thetaFlat` | derived from B3a and `d3bFlat` (proved) |
| B3 `BridgeComposition` | `D3bExists → D3bOpenComplete` | derived from B3a, W |

```lean
def D3bOpenComplete : Prop :=
  ∀ P : SigProblem Label B, Scoped P → (∃ z, FreshLabels P z) →
    ValidOpen P → ∀ π, HasInstance P π →
      ∃ θs, GenericInst P π θs ∧ WithinC P θs ∧ SolvableFinAt P θs
```

B3a from B2: by B2f pick `U`; take `B₁ = B ⊕ CConst Label`, `j = inl`,
`e = inr`. `FreshBasesOn` holds (`inr c ≠ inl b`; `inr` injective).
`ValidOpen P` at `inl` gives `ValidFin`, hence `ValidFinIn` at π.
Then B2's finite half. B1 is not used.

**Existence and completeness are separate.** B3a is the completeness
half: it holds for *every* generic instance within the problem's
symbols and says nothing about whether one exists. Existence is
`D3bExists` (open: `Universality`, `CellIndependence`, `MGUExists`; the
D3b stream owns it). `BridgeComposition` is an implication from
`D3bExists` exactly as stated in Typed/Defs.lean; no premise of it is
altered. The per-problem form lets proved fragments compose: B3e and
B3f need no open premise, so they are the strongest P-1 results
available once B2 is proved.

**Why W is needed.** `D3bExists` gives `GenericInst` but not `WithinC`,
and `d3bComplete` (and B2) need `WithinC`. `Universality` does carry
`WithinC`; `D3bExists` as stated does not (both reviewers confirmed).
W is stated per instance, so it applies whatever the source of θs.
Argument: `hv` never reads an unwritten `inl` label of a generic
record, so a map `CG → CG` that deletes those labels everywhere and
keeps every cell label `inr S` preserves coverage; positivity
preserves `D`. (An earlier draft said this is the
`InstanceIffUnifiable` drop map; it is not: that map is an `up` from
ground values and drops all cells. The deletion map is new.) An
unwritten problem base `inl b` in θs's rigid values is replaced by a
constant `c_b` unused in θs's *rigid values*, valued `base b` at every
context by `ν`; coverage holds because every instance has `b` there,
and E2 applied to the whole assignment preserves `D`. Collisions with
constants in non-rigid values do not affect coverage.

### B4, B5, C: soundness for option B and the characterization

| Name | Statement | Sketch strength |
|---|---|---|
| B4f `GenericInstExtFin` | `Injective j → GenericInst P π θs → ∀ θR` over `B₁`, `RigidFin`, satisfying `D` renamed, in π `→ Covers (P.mapBase j) (mapC j θs) θR` | conjectured with argument |
| B4 `GenericInstExt` | `Injective j → GenericInst P π θs → GenericInst (P.mapBase j) π (mapC j θs)` | conjectured; stronger than needed |
| B5 `D3bSoundOpen` | `(∀ π, HasInstance P π → ∃ θs, GenericInst P π θs ∧ SolvableFinAt P θs) → ValidOpen P` | derived from B4f |
| C `OpenCharacterization` | `Scoped P → (∃ z, FreshLabels P z) → ExistsWithinAt P → (ValidOpen P ↔ ∀ π, HasInstance P π → ∃ θs, GenericInst ∧ WithinC ∧ SolvableFinAt)` | `←` B5, `→` B3 per problem |

`d3bValidAll` (proved) concludes `ValidFin P` at `B`: closed validity.
Under option B the checker must also be sound for `ValidOpen`, which
needs the generic instance to cover instances over every extension.

B4f's argument (the soundness reviewer's, replacing a draft argument
with markers that failed for infinite instances and could not undo
markers that occur genuinely): let `ν′ (c, κ)` be θR's subtree at a
chosen occurrence of `(c, κ)` in the `hv`-unfolding of `mapC j θs`.
Coverage can fail only by a single disagreement: two occurrences of
`(c, κ)` with different subtrees; θs having `inl b`, an arrow or a
record where θR has an atom or something else; or record domains that
differ. Each is separated by one value substitution `s` (`j b ↦ b`,
atoms ↦ `emptyG` or `arrow emptyG emptyG`, chosen at the first point
of difference). `s θR` is an instance over `B` (E2′; same top-level
domains, `cellOf` and pattern). θs covers it, which contradicts the
disagreement. This needs no label supply and no `WithinC`, so B4f, B4
and B5 carry neither premise; with them they would be vacuous at a
finite `Label`. B4 (all instances) is kept as the stronger form; B5
uses only B4f, through `transfer` (proved), which works per instance.

B5 from B4f: for `B₁` and a finite instance θR over `B₁` of pattern
π′, `HasInstance P π′` holds over `B` (substitute back by E2′), so a
solved θs exists; B4f covers θR by `mapC j θs`; `SolvableFinAt`
transports along `j` (BS-c1f, the forward half, needing no
injectivity); `transfer` gives a finite solution at θR.

### BS-c: two renaming properties (not whole-checker stability)

The author's sentence is about *checking*, not only validity. A
checker that answers Unresolved is stable only if its inputs commute
with extension. BS-c1 and BS-c2 are particular renaming properties
(§18.33); they do not establish the stability of the whole checker.
Instance construction, search and diagnostics need their own
connection (§5, item 12).

| Name | Statement | Sketch strength |
|---|---|---|
| BS-c1 `SolvableMapBase` | `Injective j → (SolvableFinAt P θs ↔ SolvableFinAt (P.mapBase j) (mapC j θs))` | derived: E2 forward; backward by a back map as in B2 |
| BS-c1f `SolvableMapBaseFwd` | `SolvableFinAt P θs → SolvableFinAt (P.mapBase j) (mapC j θs)`, any `j` | derived: E2, E6; what B5 uses |
| BS-c2 `ThetaFreeMapBase` | `thetaFree (P.mapBase j) π = mapC j (thetaFree P π)` | derived: `freeCells` reads only `disjoint` atoms; constants are kept |

`thetaFlat` is semantic over instances at `B`, so its equivariance
depends on B4-style reasoning; `thetaStar` depends on the chosen MGU.
Neither is stated.

## 4. Non-vacuity: intended instances

| Statement | Inhabiting instance | Status of the instance |
|---|---|---|
| `ValidOpen` true, no bases | `route` (`routeP`), `agree` (`agreeP`): `mapBase` is the identity (checked, `rfl`) and `routeP_valid`, `agreeP_valid` hold at every `B₁` | N2 `RouteOpen`, N2′ `AgreeOpen`: derived in two lines |
| `ValidOpen` true, written base and rigid α | `intArmP b`: `∀ α. ∃ …. { ...u1, ...u2 } = { f: α }, { ...u1, ...m1 } = { f: b }, { ...u2, ...m2 } = { f: β }`; put `f` in `u2`, `β = α`, at every α, atoms included | N5 `IntArmOpen`, derived |
| `ValidOpen` false | `splitFree` (`split` without its hypothesis) | derived: `splitFree_not_valid` concludes `¬ ValidAll`; its witness (one label `z`) is finite, so `¬ ValidFin` needs that proof replayed, not cited; then B0 |
| N1 separation | `shape-split` | N1 `ShapeSplitSeparates`: derived, below |
| B0, B1, BS | `route`, `intArmP` (both sides true); `shape-split` (both sides of B1 false; BS both false) | derived |
| B2 premises, jointly | `route` and `intArmP`, `Label = Nat`, `B₁ = B ⊕ CConst Nat`, `j = inl`, `e = inr`, `U` the constants of `thetaFree` | N4 `RouteFreshOn`, N6 `IntArmFreshOn` (the latter exercises `FreshBasesOn`'s disjointness: `basesOf = [b]`, checked); `GenericInst`, `WithinC` from `d3bEqFree` |
| B2, B3a conclusion | `routeP_solvable` (proved) | proved instance of the conclusion |
| B3a contrapositive | `shape-split`: ¬solvable at `thetaFree` ⇒ ¬`ValidOpen` | consistent with N1 |
| W, B3, B3e, B3f | `route`, `agree`, `intArmP`: `d3bEqFree`, `d3bFlat` give generic instances *with* `WithinC` (proved) | B3's conclusion inhabited without `D3bExists` |
| B4f, B4, B5, BS-c | `route`, `intArmP` over `Unit` carried to `Unit ⊕ Nat` | derived |
| N3 boundary | `shape-split` over `Unit` | N3 `ClosedBoundary`: two conjuncts by `d3bEqFree`, one by `shapeSplit_validFin`; the fourth derived (α = `inr (T 0)` matches no arm) |

N7 `TwoBaseInjective` (`twoBaseP b₁ b₂`: `α = b₁`, `α = b₂`, body
`ff`) backs §1's reason for injectivity: option-B valid for distinct
bases (`D` unsatisfiable under every injective extension), not
closed-valid once both bases are identified in `Unit`. Caveat on N5:
`intArmP` has `D = []` and its witness ignores `b` and α, so N5 does
not test that a written base stays distinct from an atom; N6 exercises
the written base only through `FreshBasesOn`'s disjointness, and N7
through `D`.

Not added: a negative instance with two or more *written* bases that
is closed-valid and not option-B valid (e.g. `shape-split` with arms
for both `Bool` bases). N1 already separates the notions; such an
instance would test `FreshBasesOn` against several written bases.

**Why `shape-split` is invalid under `ValidOpen`, consistently with
`validity_not_extension_stable`.** Take `i : Unit → Bool`, `i () =
false`; any function from `Unit` is injective. `(shapeSplit
()).mapBase i = shapeSplit false` (checked, `rfl`).
`validity_not_extension_stable.2` (proved) says `¬ ValidFin (shapeSplit
false)` over `Bool`: at α = `true`, a base the problem does not write,
no arm matches (`no_solution_at`). So `¬ ValidOpen (shapeSplit ())`,
while `ValidFin (shapeSplit ())` over `Unit` holds
(`shapeSplit_validFin`). That is N1. The same atom is what B3a's
generic instance sees: `thetaFree` gives α the opaque constant `T 0`
(checked, `rfl`), where the body is unsolvable for the same reason.
The separating problems are exactly the ones that need the closed
universe.

**B3's antecedent.** `D3bExists` is open. If it turned out false,
`BridgeComposition` would be vacuous. That is why B3a (no existence
premise), the per-problem B3 and the fragment forms B3e and B3f are
stated on their own.

## 5. The exact completeness boundary (P-3)

Statement C is the exact boundary: *if* B2, B3a, B4f and B5 are
proved (W is not used: C takes existence within symbols as a
premise), then for every Scoped problem with existence within symbols,
D3b's check (a solvable generic instance per pattern) holds exactly
when the problem is option-B valid. Its rejections among closed-valid
problems are then exactly `ValidFin P ∧ ¬ ValidOpen P`. None of this
is proved; no typed completeness is claimed. Outside C:

1. **Closed validity.** D3b is not complete for `ValidFin` at a fixed
   finite `B`: N3 `ClosedBoundary` (shape-split, one pattern, generic
   instance within symbols, closed-valid, body unsolvable). The
   finite-base family (`general_family_valid`,
   `general_family_no_uniform`, `general_family_missing_base`) is the
   general form, at the semantic row-equation level only: it has no
   Nat-indexed `SigProblem` generator or correspondence proof, so it is
   not an instance of any statement here.
2. **Types not in the model.** `G` has bases, arrows and records only.
   Waxwing's data types (n-ary nominal heads `TData`), effect-bearing
   arrows and `THandler` are absent. That an unwritten n-ary head adds
   no distinction beyond a nullary atom is conjectured (memo §1.2).
   Data types whose constructors a generic function may inspect are
   not covered at all.
3. **Dependency interfaces.** §18.31 lets a generic function rely on
   "dependency interfaces", and changing one may legitimately change
   acceptance. The model has no operations on bases, so this is
   outside it, as is (C)-style evidence.
4. **Template depth gaps and D3a.** D3a's grammar gaps (`depth-ty`,
   `depth-row`, `tail-written`; d3a/attack.md) do not depend on the
   universe and are untouched. Solvability at θ* says nothing about
   uniform templates; D3a under option B (D3a-∞) is conjectured, and it
   matters for compilation (memo §3.2).
5. **Written base constants.** The model's written bases are nullary
   names the problem may match exactly. Waxwing's written types can be
   applied (`List(Int)`), abstract (M001) or host (I001) types. §18.31
   answers "opaque" for abstract types; the model has no
   representation to hide, so this is not checked.
6. **Infinite values.** All option-B statements use `ValidFin`.
   There is no open variant of `ValidAll`; an infinite rigid value can
   use infinitely many atoms, and B1's countable supply may not
   suffice there.
7. **Labels.** Assumed infinite in B2-B3 (`FreshLabels`). A finite
   `Label` makes those statements vacuous, and can make a problem
   closed-valid by running out of labels. Infinitely many labels are
   an accepted semantic assumption (§18.33).
8. **Scope.** `Scoped P` is a premise of B3, B3e, B3f and C. Problems
   whose `D` mentions flexible variables are outside.
9. **Existence.** `D3bExists` and its parts are open and owned by the
   D3b stream. Nothing here assumes them except as an explicit
   antecedent (`BridgeComposition`, `ExistsWithinAt` in C).
10. **Computability, encoding and cost.** `allowedCells`,
    `occupiedCells` and `thetaFlat` are classical. A decision procedure
    needs them decided, the MGU computed, and θ*_π encoded as a finite
    call-site problem for `decideCall` (d3b §7; memo §6.1). Not done
    and not stated. Up to `2^|pairs|` patterns.
11. **Source correspondence.** Nothing links Waxwing signatures to
    `SigProblem` beyond the existing source-boundary work. Unused
    functions remain checked: `ValidOpen` is a property of the
    signature problem alone, consistent with §18.31.
12. **Whole-checker stability.** BS-c1/c2 are renaming properties
    only; instance construction, search and diagnostics are not shown
    stable under extension (§18.33).
13. **Deferred** (§18.33): B1, general trimming (W), infinite-value B4,
    executable checker integration. General B3 therefore rests on
    existence within symbols (`ExistsWithinAt`, or the D3b stream's
    `d3bExistsWithin`, §10.4), not on W.

## 6. Existing definitions that do not fit option B (reported, not edited)

1. **`Fresh`** (Typed/Model.lean). Its base half injects *every*
   `CConst Label` into the problem's own `B`, outside `basesOf P`. It
   is satisfiable only for infinite `B` and is stated at the wrong
   type for option B: atoms come from an extension of `B`, finitely
   many at a time. It is not false, only stronger than needed and
   placed at `B`. `FreshBasesOn` with an extension `j` is the proposed
   replacement; `d3bComplete` is left as it is.
2. **`D3bExists`** (Typed/Defs.lean) omits `WithinC`, so it does not
   compose with `d3bComplete` directly. W bridges it. `Universality`
   already includes `WithinC`.
3. **`d3bValidAll`'s `ValidFin` conclusion** is closed validity at `B`.
   Under option B it does not give acceptance; B4f and B5 are needed.
4. **`GenericInst`** quantifies coverage over instances at `B` only.
   Whether it survives extension is B4f/B4.
5. **Dossier §13.1's S2 assumption** ("base types may be finite") and
   the oracle's two-base universe (`Int`, `Bool`) are closed. The memo
   already notes both; the oracle needs an atom base (memo Q9).

## 7. Restrictions table

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| Extensions rename bases only; labels fixed | Waxwing labels are identifiers; `ValidFin` already ranges over every label | problem valid only because `Label` is finite | `FreshLabels` premise in B2-B3; boundary item 7 |
| Extensions are injective | non-injective maps identify written types and can change `D`'s satisfiability: an interface change, not an addition | `D` with `α = Int` and `α = Bool` made satisfiable | by definition |
| Extensions live in `Type` (universe 0) | the model's base types do | none known | definition; completeness reviewer agreed |
| `ValidFin` only, no open `ValidAll` | Waxwing's semantics is finite (§14.8) | infinite rigid values using uncountably many atoms | boundary item 6 |
| Atoms are nullary bases | the problem cannot match or decompose an unwritten base | unwritten `T(a)` with inspectable arguments | conjectured; boundary item 2 |
| Written bases kept and distinct, never quantified | option B allows reliance on written constraints | written abstract type with a record representation | boundary item 5 |
| `ValidAtoms` uses `Nat`, not one atom | finitely many atoms per instance, unboundedly many across instances | the seven-arm α, β example (§3) | derived example, not in Lean |
| `e` constrained only on `U` | the realization reads only θs's constants | `eBack`'s `Classical.choose` collides off `U` | proof must use a `U`-relative back map; route checked by the soundness reviewer |
| finite extension `B ⊕ Fin (|U|+1)` | `+1` keeps `B₁` nonempty for a total `e` | `B = Empty`, `U = []` | corrected after review (was `Fin |U|`) |
| B2 keeps full `GenericInst` | mirrors `D3bComplete`; coverage unused in its proof | none: a weaker premise would be a stronger statement | question for the author |
| B3 routed through W | `hv` ignores unwritten `inl` labels; constants can stand for unwritten bases | θs with junk at unwritten labels or bases | W conjectured; deletion map is new (draft's reuse claim withdrawn) |
| B4f, B4, B5 carry no label or `WithinC` premise | the substitution argument needs neither | empty or fully written `B` | argument covers both; corrected after review |
| B1b at empty `B₁` | E2′ (atom ↦ empty record) replaces the base map | `B = Empty` | flagged; B1 strengthens memo C3 |
| Only `SigProblem`s | the finite-base family is semantic only | the family itself | boundary item 1 |
| Equivariance only for `thetaFree` | `thetaFlat` is semantic, `thetaStar` depends on the MGU | flat or general `D` | BS-c2 limited; noted |

## 8. Proof order, if authorized

Authorized by §18.33, after the second review (§10). Completeness
track: E1-E6; B0 and the examples (N1-N7); B2f, B2c; B2 (needs the
`U`-relative round trip); B2g, B2n; B3a; B3e, B3f. Soundness track,
reviewed separately: E2′ (back to `B`), BS-c1f, B4f, B5. Deferred: B1,
W, infinite-value B4. Not in the tranche: BS, BS-c1/c2, B3 and C (B3
and C become derivable from B3a, B5 and `d3bExistsWithin`, §10.4).

## 9. Independent adversarial review

Two independent agents reviewed the first draft (Lean and this file),
read-only, with scratch Lean checks (`lake env lean`, exit 0 in both).
One ran a soundness pass (is any statement false, vacuous or
mis-quantified?), the other a completeness pass (do the statements
express option B and P-1/P-3; what is missing?).

**Soundness pass.** No statement false as written. Checked as
believed true, with reasons: E1-E3, B0, B1a, B1b and BS (for every
`B`, including empty), B2 (the `U`-relative route), B3a, B3, N1-N4.
Findings and fixes:

| # | Finding | Severity | Fix |
|---|---|---|---|
| S1 | B4's marker argument fails: infinite θR may use every label; markers can occur genuinely inside `ν`'s values. Premises `FreshLabels`, `WithinC` make B4/B5 vacuous at finite `Label` | gap in sketch | argument replaced (§3); premises dropped from B4, B5; B4f added |
| S2 | missing building blocks: value-substitution positivity, label deletion, `mapBase` composition, `written`/`cliftP` commuting | gap | E2′, E4-E6 added; deletion map named as new in W |
| S3 | W sketch: the `InstanceIffUnifiable` map is an `up` that drops all cells, not the needed `CG → CG` map; "unused in θs" should be "unused in θs's rigid values" | gap in sketch | corrected (§3) |
| S4 | `B ⊕ Fin |U|` is empty when `B = Empty`, `U = []`; no total `e` | false prose at an edge | `Fin (|U| + 1)` |
| S5 | BS backward: "B₁ in place of B ⊕ Nat" fails when `j` is bijective | cosmetic | uses `B₁ ⊕ Nat` |
| S6 | positive instances have no written base or rigid α | weak | `intArmP`, N5, N6 added |
| S7 | `splitFree_not_valid` concludes `¬ ValidAll`, not `¬ ValidFin` | cosmetic | §4 says the proof must be replayed |
| S8 | `FreshLabels` vacuous at finite `Label` | known | boundary item 7; removed from B4/B5 |

**Completeness pass.** Core fits option B and P-1; nothing changed or
added class machinery; W is genuinely needed. Findings and fixes:

| # | Finding | Severity | Fix |
|---|---|---|---|
| F1 | W stated only globally: vacuous if `D3bExists` is false; unusable on proved fragments | mis-specified | `WithinTrim` per instance; global form kept |
| F2 | no unconditional option-B completeness on the proved fragments | missing (important) | B3e, B3f; B3 per problem |
| F3 | P-3 "exact boundary" was a list, not a characterization | missing | C `OpenCharacterization`; §5 restated around it |
| F4 | B4 over-strong (coverage of infinite instances) | mis-specified | B4f (finite) added; B5 depends only on B4f |
| F5 | `ValidOpen`-true instances degenerate (no bases, no rigid α) | missing | `intArmP`, N5, N6; two-written-base negative noted as not added |
| F6 | stability of *checking* only stated for validity | missing | BS-c1, BS-c2 |
| F7 | B1 silently stronger than memo C3 ("nonempty B") | unclear | stated in §3; question 6 |
| F8 | "B2 generalizes `D3bComplete`" unchecked; both halves recovered, not only the finite one | missing (minor) | B2g; prose corrected |
| F9 | building blocks missing | missing (minor) | E4-E6 |
| F10 | N4 omitted `GenericInst`, `WithinC` | unclear | conjoined in N4, N6 |
| F11 | boundary gaps: dependency interfaces, computability and cost, option-B soundness unproved, `Scoped`, D3a, source correspondence, finite labels, unused functions | missing | §5 items 3, 4, 7, 8, 10, 11; §1 on labels |
| F12 | wording overclaimed ("claimed only relative to", "suffices") | cosmetic | §5 and §3 now conditional |

Not adopted: none. F5's two-written-base negative instance is noted in
§4 as not added. The revised file builds (`lake build`, 105 jobs).
The revision itself was not re-reviewed.

## 10. Second review (§18.33)

### 10.1 The split

`BridgeDefs.lean` (413 lines) was split into the six files of
Typed/Bridge/ listed at the top, by dependency: Extension imports
Typed/Model; Valid imports Extension; Fresh imports Extension and
Typed/Defs; Complete imports Valid and Fresh; Sound imports Valid and
Typed/Defs; Examples imports Valid, Fresh, Typed/Examples,
Typed/ExamplesFlat and TypedAttack/ShapeSplitCore. Only section
headings and file headers were written; every declaration was copied
by line range. `lake build`: 110 jobs, no warnings.

How "no statement changed" was checked (scratch scripts, not
committed):

1. Elaborated terms. A Lean file runs `set_option pp.all true` and,
   for each of the 59 definitions, `#print` and `#check @`, once
   importing the old `BridgeDefs` (at fd1d22b) and once importing the
   six new files. The two outputs (45,034 bytes) are byte-identical
   (`diff`; SHA-1 2e3bc9c2…).
2. Source text. Every declaration block (doc comment and `def` or
   `mutual`, up to a blank line) was whitespace-normalized; the old
   file and the six new files give the same multiset of 59 blocks.

### 10.2 Reviewers and method

Two fresh agents, neither shown §9, reviewed the split files and this
file (§0-§8) read-only, with scratch Lean checks (`lake env lean`):
one for soundness (false, vacuous, mis-quantified?), one for
completeness (does anything miss §18.33 or fail to express option B
for the current model?). Changed and new statements were sent back to
the reviewer concerned (§10.5).

### 10.3 Findings and fixes, by area

**(a) B4f, B4, B5 (soundness track).** Soundness: B4f, B4 and B5 true
for every `P`, including non-Scoped `P`, finite `Label` and empty
`B`; the single-substitution argument works, and dropping
`FreshLabels` and `WithinC` is right. Completeness: B4f is the shape B5
needs.

| # | Finding | Severity | Fix |
|---|---|---|---|
| R1 | E2′ took a total `f : B → B₁`; B4f and B5 map back from an extension to `B`, and B1b into `B₁`. When the target is `Empty` and the source is not, no such map exists, so E2′ could not be used in the cases it was added for (both reviewers; scratch check: `(Unit → Empty) → False`) | statement unusable as intended | E2′ restated with two forward maps `g`, `h` from `P`'s bases and `s : B₁ → G Label B₂`; the old form is `g = id` |
| R2 | B5's argument uses BS-c1, outside the tranche; only the forward half is needed, without injectivity | missing | BS-c1f `SolvableMapBaseFwd` added (Sound.lean) |
| R3 | the `hv`-after-substitution step of B4f (and `cellOf` under substitution, for every base, since B4f has no `WithinC`) is unstated | missing (proof-internal) | not stated; listed as a proof obligation (§10.6) |

**(b) Finite freshness.** Soundness: B2f, B2c, B2 true (B2 checked
against `d3bComplete`'s proof: the back map `e c ↦ inr c` on `U`,
`j b ↦ inl b`, anything else ↦ `inr (T 0)`, is well defined from
`FreshBasesOn` and `Injective j`); `B ⊕ Fin (|U|+1)` suffices, with
`e c = inr (idxOf c U)`.

| # | Finding | Severity | Fix |
|---|---|---|---|
| R4 | B2g `D3bCompleteOn → D3bComplete` was provable as `fun _ => d3bComplete` (soundness): it checked nothing | vacuous as a check | B2g restated as the premise translation: `Fresh`, `WithinC`, `GenericInst` give `∃ U`, B2's premises at `j = id`, and `P.mapBase id = P` |
| R5 | "`B ⊕ Fin (|U|+1)` suffices" was prose only; B3a uses the infinite `B ⊕ CConst` (completeness) | missing | B2n `D3bCompleteFinExt` added (Fresh.lean) |
| R6 | the `U`-relative back map is named only in prose | unclear | listed as a proof obligation (§10.6) |

**(c) B3e, B3f.** Both reviewers: true, derivable from B3a and
`d3bEqFree` / `d3bFlat`, at the right instances; every scope,
label-freshness and fragment premise is present (Scoped and the
fragment premise for `d3bEqFree`/`d3bFlat`, `∃ z, FreshLabels P z`
for B3a, `HasInstance`, `ValidOpen`) and none is extraneous.

| # | Finding | Severity | Fix |
|---|---|---|---|
| R7 | docstrings said "Unconditional" without §18.33's qualification | overclaim | docstrings and §0 reworded: no open existence premise; scope, label-freshness and fragment premises remain |
| R8 | conclusions give only `SolvableFinAt`, not `GenericInst ∧ WithinC` | unclear | not adopted: not wrong; `d3bEqFree`/`d3bFlat` give the rest |
| R9 | a fragment characterization (B3e with B5) has no open premise and is stronger than C | proposal | not adopted; recorded for the author (§11) |

**(d) E1-E6.** Soundness: all true; E2′ true for every atom shape
(definedness depends only on row domains, which substitution keeps);
E5 true exactly as lists; E6 type-correct (instances checked by
`rfl`). The issue was usability (R1). Completeness: the helper lemmas
in §10.6 are unstated (R3, R6); accepted as proof-internal provided
they are listed.

**(e) B0 and N1-N6.** Soundness: all true; N4 and N6 hold for every
π (`routeP_hasInstance`; `HasInstance (intArmP ()) π` checked in Lean
for all π). `written (intArmP ())` is `[0,0,0]` (duplicates kept;
harmless).

| # | Finding | Severity | Fix |
|---|---|---|---|
| R10 | N5 is weak: `intArmP` has `D = []`, and the witness ignores `b` and α | degenerate | caveat in §4; not changed |
| R11 | §1's reason for injectivity had no Lean instance | missing check | N7 `TwoBaseInjective`, `twoBaseP` added (Examples.lean) |
| R12 | no Lean instance for "ValidOpen false and closed-false" (`splitFree`) | minor | noted, not added |

**Prose (completeness).** §5 said C needs W (it takes existence as a
premise): fixed. Header, §0 and §8 were stale against §18.33: fixed.
"BS-c: the checker is stable" contradicted §18.33: retitled in §3 and
Sound.lean. Boundary §5: item 7 updated, items 12 and 13 added.

### 10.4 Existence that returns `WithinC` (W)

§18.33: "prefer an existence theorem that already returns `WithinC`".

- **B3e, B3f: yes, without W.** `D3bEqFree` and `D3bFlat`
  (Typed/Defs.lean) conclude `GenericInst ∧ WithinC` for
  `thetaFree`/`thetaFlat`. The proofs construct `WithinC` directly:
  `d3bEqFree` (EqFree.lean) by `eta_within`, `d3bFlat` (FlatMain.lean)
  by `flatRow_within`.
- **General B3 and C: yes, via the D3b stream** (upstream of this
  branch; proved, not yet independently reviewed). `universality`
  (Typed/Universality.lean) concludes `GenericInst ∧ WithinC` for
  `thetaStar` under `Scoped`, `HasInstance`, `IsMGU`, with no freshness
  premise. `d3bExists` keeps only the first conjunct, so `D3bExists`
  as defined (Defs.lean, unchanged) still lacks `WithinC`. The
  corollary `d3bExistsWithin` (d41eea7) is this file's
  `D3bExistsWithin` per problem, so `ExistsWithinAt P` holds for every
  Scoped `P`. B3's conclusion `D3bOpenComplete` then follows from B3a
  and `d3bExistsWithin`; `BridgeComposition` and `ExistsToWithin` hold
  because their conclusions do; C's existence premise is discharged.
  W is on no path. No statement was changed to use this.
- `WithinC` admits the problem's written labels and bases **plus**
  cell labels and generic constants (`WithinG`: `.base (.inr _)` is
  unrestricted; only `.inl` record keys must be written). Nothing here
  relies on a stronger reading.

### 10.5 Recheck

Changed or new: E2′, B2g, B2n, BS-c1f, N7, `twoBaseP`; docstrings of
B3e, B3f; Sound.lean's headings. The completeness reviewer confirmed
that each adopted fix addresses its finding and that no decline
blocks the tranche. The soundness reviewer rechecked each changed or
new statement and found all true, none vacuous or mis-quantified:
E2′ now serves B4f/B5 (`g = j`, `h = id`; `s (j b) = base b`, other
bases to `emptyG` or `arrow emptyG emptyG`) and B1b (`g = inl`,
`h = i`), empty base types included; the proof needs `mapBaseAtom id
a = a` (from E1 or by induction). B2g is true and follows from no
proved theorem (its `WithinC` premise is unused); B2n is true given B2
(`e c = inr ⟨idxOf c U, _⟩` on `U`, `inr ⟨n-1, _⟩` off it) and not
vacuous (`n = |U| + 1`); BS-c1f is true without injectivity (E2 at
`Sum.map j id`, E6); N7 is true (collapsed half checked in Lean for
`twoBaseP true false` over `Bool`). The `d3bExistsWithin` route
(§10.4) was not reviewed by either reviewer: proved upstream,
unreviewed.

### 10.6 Proof obligations not stated as statements

Proof-internal lemmas, to be stated by the proof owner; the B4f/B5
reviewer checks `HvSubst` as written before the proof starts, since
an over-strong lemma could slip in there:

- `HvSubst`, `CellOfSubst`: `hv` and `cellOf` commute with a value
  substitution that sends `j b` to `base b`, for **every** `b` (B4f
  has no `WithinC`);
- the `U`-relative back map `eBackOn U` and its round trip `up_dn_on`
  under `ConstsInC ∧ WithinC` (B2; `eBack`, `up_dn` and `freshOk`
  cannot be reused);
- a `holds_up` variant from `P.mapBase j`'s atoms to `cliftP P`'s (B2);
- `FinMapG`, `FinSubstBase` (finiteness under renaming and
  substitution), `MapAssignComp`, `CombineMap` (`combine` commutes
  with `mapAssign`), `InPatternSubst` (B5's `HasInstance P π′`).

## 11. Questions for the author (answered in dossier §18.33)

1. Approve `ValidOpen` (injective base extensions, labels fixed,
   written bases kept distinct) as the formal reading of option B?
2. Should labels also be made finite-fresh (inject only the cells θs
   uses), or is an infinite label supply (`FreshLabels`) an accepted
   assumption, as Waxwing's identifiers give it?
3. B2: keep the full `GenericInst` premise to mirror `D3bComplete`, or
   weaken it to the conjuncts the proof uses (finite, satisfies `D`,
   pattern)? The weaker premise gives a stronger statement.
4. B3: condition on `D3bExists` through W (as now), or on
   `Universality ∧ CellIndependence ∧ MGUExists`, which carries
   `WithinC` and avoids W?
5. Is soundness for option B (B4f, B5, C, BS-c) in P-1's scope, or
   only completeness (B2, B3a, W, B3, B3e, B3f)?
6. B1: keep it unrestricted (stronger than memo C3), or add
   `[Nonempty B]` as the memo states?
7. Which statements to authorize for proof first? Suggested: E1-E6,
   B2f, B2c, B2, B2g, B3a, B3e, B3f, in that order (§8).
8. (Second review, R9; open.) Add the fragment characterizations
   `Scoped P → EqFree P → (∃ z, FreshLabels P z) → (ValidOpen P ↔ ∀ π,
   HasInstance P π → SolvableFinAt P (thetaFree P π))` and the flat
   analogue? They follow from B3e and B5 with no open premise.

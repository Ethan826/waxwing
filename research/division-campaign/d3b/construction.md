# D3b: a generic instance per written-label pattern

D3b stream of the campaign (dossier §18.13), reviewed 2026-10-21.
Transfer, soundness, two restricted constructions, general existence
of a generic instance (`d3bExists`) and its parts (`mguExists`,
`cellIndependence`, `universality`) are proved. Completeness is proved
only under `Fresh` (§7); existence does not settle completeness.

Lean definitions: `Composition/Typed/Model.lean` and `Typed/Defs.lean`.
Proofs: the other `Composition/Typed/` modules. Oracle checks: `run.mjs`
and `checks/` in this directory. These results concern the research
model; they do not adopt a language design or integrate a solver.

## 1. The question

D3b (dossier §18.6): for each written-label pattern π, a specified
generic rigid assignment θ*_π such that solvability of the body B at
θ*_π implies validity in π. The construction must respect hypotheses
that force field types to agree (`r = s`, `r = s ⊎ t`) and hypotheses
that tie rigid type variables to rows (`α = { ...r }`,
`{ f: { ...r } } = { f: α }`, §18.10).

D3a (uniform typed templates) is a separate conjecture. Nothing below
assumes it, and the transfer theorem does not need it (§9).

## 2. Setting

The Sig model of §13.1, unchanged: `SigProblem` (rigid type variables,
rigid rows, `D`, `B`), `Assign`, `Sat`, `combine`, `ValidAll`,
`ValidFin`, `written P` (the labels written in `D` and `B`). Ground
types are bases, arrows and records over rows that are arbitrary partial
maps; `ValidFin` restricts rigid values and witnesses to finite ones.
Rigid type variables already range over every ground type, records
included, so no extension of the Sig model was needed.

A pattern π fixes, for each rigid row `r` and written label `l`, whether
`r` holds `l` (`InPattern`). `ValidIn P π` is validity restricted to the
rigid assignments of pattern π that satisfy `D`; `ValidAll P` holds iff
`ValidIn P π` holds for every π (every assignment has a pattern).

## 3. The generic model

The generic model is the ordinary semantics of the Sig model at other
label and base types. There is no special satisfaction relation (P9s
needed D1/D2 obligations; this model does not).

- **Labels** `CL = Label ⊕ Cell`. A *cell* is a nonempty set of rigid
  rows, written as a sublist of `P.rigidRow` (Lean `Cell := List Nat`).
  The cell label `inr S` stands for "a label held by exactly the rigid
  rows in `S`".
- **Bases** `CB = B ⊕ CConst`: the problem's bases, or a constant:
  `T n` (rigid type variable `n`), `A r l` (rigid row `r`'s field at
  written label `l`), `X r S` (rigid row `r`'s field in cell `S`).
  Constants are opaque: no equation can look inside them.

The problem is read in the generic model by `cliftP` (labels and bases
by `inl`); `SolvableAt P θs` says that `B` has a flexible solution when
the rigid variables take their values from `θs`.

## 4. The construction of θ*_π

1. **The pre-instance** `eta P π C` over a list of cells `C`: rigid row
   `r` holds each written label `l` with `π r l` at constant `A r l`,
   and each cell `S ∈ C` with `r ∈ S` at constant `X r S`; rigid type
   variable `n` is constant `T n`. Every unknown is a constant.
2. **D as a unification problem.** A substitution `τ` maps constants to
   generic values; `thetaOf P π C τ` applies it at every depth.
   `UnifiesD P π C τ` says `thetaOf P π C τ` satisfies `D`. On the
   pre-instance, `D`'s `lacks` and `disjoint` atoms and the definedness
   of its compositions depend only on presence, which `τ` cannot change;
   `D`'s equations become first-order equations between finite terms
   (records are constructors with a fixed label set). This is ordinary
   syntactic unification in the sense of Robinson 1965. §6.1 sets out
   where this model departs from Robinson's term language; the theorem
   used here is proved directly for this model (`robinson`).
3. **Allowed cells.** Cell `S` is allowed when `D` is unifiable with `S`
   as the only cell (`Allowed`, `allowedCells`). A cell is refused when
   `D` declares two of its rows disjoint, when a composition in `D`
   would hold the cell twice, or when an equation would hold it on one
   side only (for example `r = s` refuses `{r}` and `{s}`).
4. **θ*_π** `= thetaOf P π (allowedCells P π) τ*` with `τ*` a most
   general unifier (`IsMGU`, `thetaStar`). Unbound constants stay
   opaque.

The construction handles these obligations:

- **Declared equations** (requirement 1). `r = s` identifies `X r S` with `X s
S` in every cell holding
  both (one shared fresh type per cell) and refuses the cells holding
  one of them. `r = s ⊎ t` leaves the cells `{r, s}` and `{r, t}` and
  identifies `X r {r,s} = X s {r,s}` and `X r {r,t} = X t {r,t}`.
  `α = { ...r }` binds `T α` to the record of `r`'s generic row, so the
  generic α is built from the generic r, cell by cell.
  `{ f: { ...r } } = { f: α }` does the same through a field. A
  hypothesis that writes a structure (`α = β -> β`) binds `T α` to it.
- **Nested structure and shared field types** (requirement 2). A
  rigid row's field in a cell is one constant per (row, cell), shared
  between rows exactly where unification identifies them. Nested
  records arise only from `D`'s own structure (`{ f: { ...s, ...t } }`)
  or from the solver; under a cell label they are expanded label by
  label (§5). Fields of rigid rows are never given structure the
  hypotheses do not force.
- **θ*_π satisfies D** (requirement 3): it is a unifier by construction
  (`IsMGU` includes `UnifiesD`). Existence over all allowed cells is
  `cellIndependence`, the MGU is `mguExists`, and coverage is
  `universality` (§6).
- **Transfer** (requirement 4): §5 and §6.

When no instance exists (`D` impossible in π: a cycle such as
`r = { f: { ...r } }`, a clash, a declared `lacks` the pattern breaks,
`ff`), there is no θ*_π, `ValidIn P π` holds vacuously, and D3b says
nothing more. Refusing such declarations is the separate §2.3 policy.

## 5. The interpretation `hv` and the transfer theorem

Given a rigid assignment θR and a valuation `ν` of the constants, `hv`
maps generic values to ground values (Lean `hv`, `hvRow`, `hvAssign`):

- bases `inl b ↦ b`; arrows component-wise;
- a constant `c` under context `κ` maps to `ν c κ`;
- a record maps label by label: a written label `l` takes the generic
  field at `inl l` (same context); an unwritten label `k` takes the
  generic field at `inr (cellOf θR k)`, where `cellOf θR k` is the list
  of rigid rows holding `k`, under context `k`; a label no rigid row
  holds is absent. Generic labels `inl k` with `k` unwritten, and cells
  θR leaves empty, are dropped.

The context makes a cell constant label-dependent: `X r S` under the
cell label expanded at `k` means "r's field at k". The canonical
valuation: `ν (T n) _ = θR.ty n`, `ν (A r l) _ = θR.row r l`,
`ν (X r S) (some k) = θR.row r k`.

`Covers P θs θR`: some `ν` (finite-valued when θR's rigid values are
finite) maps every rigid value of `θs` to θR's.

**Transfer** (`Transfer`): if `θs` covers `θR` and `σ` solves `B` at
`θs` in the generic model, then `hvAssign σ` solves `B` at `θR`, and is
finite when `σ` and θR's rigid values are. The homomorphism that
carries the generic solution is `hv`; it preserves `B` because

1. it commutes with evaluation of every expression of `P` (whose labels
   are written): written labels map to themselves; disjoint generic rows
   map to disjoint rows, since different cells are disjoint label sets
   and written labels are not cell labels, so a composition defined
   generically stays defined and `hv` of a union is the union of the
   images;
2. equations are preserved because `hv` is a function;
3. `lacks r l` (`l` written) and `disjoint` are preserved label by
   label;
4. the rigid variables of `combine` map to θR's by `Covers`.

The transfer theorem assumes `Covers` and satisfaction of the body.
The construction's proposed coverage is a separate obligation (§6).

**D3bSound**: if `θs` is a generic instance for π (`GenericInst`:
finite, satisfies `D`, pattern π, covers every instance of π satisfying
`D`) and `B` is solvable at `θs`, then `ValidIn P π`, and with finite
witnesses `ValidFinIn P π`. Immediate from Transfer.

**D3bValidAll**: solved generic instances for every pattern with an
instance give `ValidAll P` (and `ValidFin P` with finite ones).

## 6. Why θ*_π covers every instance (Universality, proved)

`universality` proves `Universality`: for Scoped `P`, a pattern with an
instance and any `IsMGU` `τ` over the allowed cells, `thetaStar P π τ`
is a `GenericInst` and satisfies `WithinC`. `cellIndependence` and
`mguExists` supply such a `τ`, so `d3bExists` proves `D3bExists`. None
of these uses `Fresh`; each holds for every label type with decidable
equality and every base type `B`. The reviewed five-step route was
followed:

1. **Occupied cells are allowed** (`occupied_allowed`, UnivOcc.lean).
   Collapse an instance onto its written labels and one unwritten label
   `k`, read as `k`'s cell `S`, at every depth (`up` with `srcK`). The
   image is the singleton-cell pre-instance under a substitution and
   satisfies `D`. Uses `Scoped`.
2. **Cell locality** (`CS`, UnifCS.lean). A value is cell-shaped when
   its `inl` labels are written, its bases are in `basesOf P`, every
   `X r S` sits directly under `inr S` with `r ∈ S` and `S ∈ C`, and no
   cell constant occurs elsewhere. The values of `D`'s sides at the
   pre-instance are cell-shaped (`eval_cs`), and substitutions sending
   non-cell constants to cell-shaped values and each `X r S` to some
   `X r' S` keep the shape (`cs_subst`). The invariant is carried through
   every elimination step, including occurrences inside bindings of `T`
   and `A`, by the `Compat` part of `MguSpec`.
3. **Cell independence and the MGU.** The disagreement step (`dis`)
   finds, for two different cell-shaped values, a clash in the written
   projection or in one single-cell projection (`pr`), a binding of a
   non-cell constant, or a binding `X r S := X r' S` between constants
   of one cell. `ci_core` runs Robinson's induction on projections:
   a non-cell binding holds in every projection, a cell binding holds in
   the projection onto its cell and leaves the others unchanged. With
   presence handled label by label (`defOk_cells`), this gives
   `cellIndependence`. `robinson` runs the same induction on the full
   pairs and gives `mguExists` (§6.1).
4. **Factoring the canonical valuation.** `robinson` returns a unifier
   `μ` with `MguSpec`: besides `τ = τ ∘ μ` for every unifier `τ`, every
   `hv` reading that satisfies `D`'s equations is a fixed point of `μ`
   at the positions `hv` reads (`Agree`: non-cell constants at the top
   context, `X r S` at unwritten labels of cell `S`). Unoccupied cells
   are never read, so their bindings need nothing. For the statement's
   arbitrary `IsMGU` `τ`, the MGU property gives `μ = τ'' ∘ τ`; `τ''`
   is replaced by a finite substitution on the constants that matter,
   and `hv ν0 ∘ τ''` is the covering valuation. No claim is made that
   every MGU has `μ`'s syntactic form.
5. **Conclusion components.** Finite rigid values (`RigidFinC`),
   satisfaction of `D`, pattern agreement, finite-valued coverage and
   `WithinC` (the problem's labels and bases pass back through
   substitution, `within_of_subst`) are all proved in Universality.lean.

`instanceIffUnifiable` (vacuity) remains as before. `HasInstance` is a
premise of `Universality` but the proof does not use it: without an
instance, coverage is vacuous.

### 6.1 Correspondence with Robinson's unification theorem

**Source.** J. A. Robinson, "A Machine-Oriented Logic Based on the
Resolution Principle", J. ACM 12(1):23-41, 1965: the Unification
Theorem, that the unification algorithm applied to a finite nonempty
unifiable set of expressions terminates with a most general unifier.
The section number was not checked against the paper.

**Status of the correspondence (2026-10-21, dossier §18.35).**
Bibliographic details checked (J. ACM 12(1), January 1965, pp. 23-41);
the theorem's statement and location are not yet checked against the
paper's text, so the correspondence is not fully source-checked.
Attribution and scope: the published theorem is the source of the
method; `robinson` reproves an adaptation for this representation,
which justifies the departures listed below. The D3b result is
therefore not an unchanged application of Robinson's theorem.

**What it applies to.** First-order terms built from variables and
function symbols of fixed finite arity, as finite trees; equality is
syntactic identity; a substitution replaces finitely many variables
simultaneously by terms; the occurs check refuses to bind a variable to
a term properly containing it.

**Our representation.**

| Robinson | Here | Holds as is? |
|---|---|---|
| variable | constant `cv c`, `c : CConst Label` (`T`, `A`, `X`) | yes |
| constant symbol | base `inl b` | yes |
| binary symbol | `arrow` | yes |
| symbol with argument list | `record f`, one symbol per finite domain, arguments indexed by label | yes for finite records; see 1, 3 |
| term | `CG Label B` value | no: see 1 |
| substitution | `CSubst`, total, applied at every depth (`substG`) | see 4 |
| unifier, MGU | `UnifiesD`, `IsMGU` | see 2 |
| occurs check | `occurs_no_unifier` | proved directly, see 1 |
| fresh variables | none introduced by either | yes |

Departures and how they are handled:

1. **Infinite values.** `CG` records are functions from labels, so a
   value may branch infinitely; `IsMGU` quantifies over substitutions
   with such values. Robinson's terms are finite. The proof uses only
   constructor injectivity and disjointness and well-foundedness of
   proper parts (`psub_acc`), all proved for `CG`, so infinite unifiers
   are covered; the MGU itself has finite values (`FinG`).
2. **Rows.** Rigid rows are not unification variables: the pre-instance
   fixes each row's presence (written labels by π, cells by `C`). Row
   composition is evaluated before unification; definedness, `lacks` and
   `disjoint` are presence conditions no substitution changes
   (`DefOk`, `unifiesD_iff`). What remains is a finite list of equations
   between values (`eqPairs`). Flexible rows of the body do not occur.
3. **Records modulo order.** A record is a function, so there is no
   field order and no equality modulo permutation to handle. A record
   symbol is identified by its label set, compared extensionally.
4. **Substitutions.** `CSubst` is total; `robinson`'s result leaves
   every constant outside the equations fixed. `IsMGU` asks for finite
   values, not finite support.
5. **Cells.** Cell labels are ordinary labels `inr S`; cell constants
   are ordinary variables. No cell map enters unification. Cell locality
   (`CS`) is an extra invariant needed for `cellIndependence` and
   `universality`, not for `mguExists`.

Because of 1, the published theorem is not applied as a black box.
`robinson` (UnifMain.lean) reproves it for this model by induction on
the number of constants, with the disagreement step `dis`. Its
conclusion is stronger than most generality: every unifier `τ`
satisfies `τ = τ ∘ μ` on every constant.

## 7. The converse (completeness of the reduction)

`d3bComplete` proves `D3bComplete` with explicit premises:

- `z : Cell → Label` injects every cell into labels outside `written P`;
- `e : CConst Label → B` injects every constant into bases outside
  `basesOf P`; together these conditions are `Fresh P z e`;
- `WithinC P θs` and `GenericInst P π θs` hold.

It concludes both `ValidIn P π → SolvableAt P θs` and
`ValidFinIn P π → SolvableFinAt P θs`. It has no `Scoped` premise;
the review suggestion to add one was withdrawn.

The realization `dn` reads each ground label `k` from generic label
`rinv z k`: `inr S` if `k = z S`, otherwise `inl k`. It replaces a
constant by base `e c`. This label-reading map preserves satisfaction
and finiteness, giving an instance of `D` with pattern π. The lift `up`
reads back the fresh labels and bases. The proof needs the round trip
`up (dn g) = g` for `WithinG` values; it does not assert that every
label map is globally injective. A solution at the realized assignment
then lifts to a solution at θs.

`Fresh` quantifies over ALL `CConst Label`, including `T n` for every
natural `n`. The current theorem therefore requires an infinite supply
of fresh bases; finiteness of the values of a particular instance does
not weaken its premise. No theorem replaces it by an injection of only
used constants, and it cannot be instantiated for finite `B`. Sound
transfer needs neither fresh injection.

The finite-base follow-up proves `general_family_valid` and
`general_family_no_uniform` for a semantic row-equation family with one
arm per base and arrow/record arms. Thus the finite-base issue has an
obstruction, not merely a missing proof of freshness. Its general family
is not yet encoded as a Nat-indexed `SigProblem`; no theorem bridges
those equations to actual Waxwing semantics. The singleton
`ShapeSplit` is an actual `SigProblem` and is now in the default build.
See [the exact boundary](../finite-base-followup/README.md).

`thetaStar_valid_iff_fresh` (Conditional.lean) combines the two halves
with every premise shown: Scoped `P`, `HasInstance P π`, an `IsMGU` over
the allowed cells, and `Fresh P z e`; it concludes `ValidIn P π ↔
SolvableAt P (thetaStar P π τ)` and the finite version. Existence needs
no `Fresh`; this equivalence does. Whether Waxwing's type universe
supplies `Fresh` is not settled by any theorem here (dossier §18.27;
the bridge statements are a separate stream). A full validity reduction
would still need that and a justified finite call-site encoding for the
chosen instance. There is no completed general decision procedure here.
Realizing opaque constants as records changes what equations can inspect:
`∀ α. ∃ u. α = { ...u }` holds at a record and fails at a base. That
replacement cannot supply the missing completeness proof.

## 8. Equation-free hypotheses (Waxwing's `where` clauses)

When `D` has only `lacks`, `disjoint` and `ff` atoms (`EqFree`), no
unification is needed. `thetaFree P π = eta P π (freeCells P)`, where
`freeCells` are the cells with no two rows declared disjoint (a row
declared disjoint from itself excludes its cells). `D3bEqFree`: for
Scoped, equation-free `P` and π with an instance, `thetaFree P π` is a
generic instance within the problem's symbols. The proof is
`d3bEqFree`; it covers the model's `route` and declared `split` cases.
It establishes existence and sound transfer; its converse still requires
`Fresh` (§7).

`d3bFlat` proves the same conclusion for `FlatD`: equations between
records with no written fields and lists of row tails, plus `lacks`,
`disjoint` and `ff`. It assumes Scoped `P` and `HasInstance P π`.
`thetaFlat` chooses one representative per semantic equality class of
fields at each written label and each occupied cell. Occupancy and
agreement quantify over all instances, so this is a classical semantic
construction, not an executable unifier. Equality with `thetaStar` up to
renaming remains unproved. `agreeP_valid` checks a flat-equation example;
`routeP_valid` and `splitFree_not_valid` check the declared and undeclared
split distinction.

## 9. Relation to D3a

D3b is not derived from D3a and does not establish D3a's grammar. A
generic solution σ at θ*_π, mapped by `hv`, is one witness per pattern
that works for every instance (uniform); but its values are arbitrary
generic values (a cell's field may be, say, `X r S -> Int`), wider than
D3a's templates (absent or one source row's field per cell). D3b plus
transfer gives uniform witnesses in that wider sense only.

## 10. Lean statements and status

Every theorem is for all `Label` with decidable equality and all `B`.
"No freshness" means the premises shown are the only ones.

| Lean | Premises (all of them) | Conclusion | Status |
|---|---|---|---|
| `Transfer` | `Covers P θs θR`; `σ` solves `(cliftP P).B` at `θs` | some `θF` solves `P.B` at `θR`; finite if `σ` and θR's rigid values are | proved: `transfer` |
| `D3bSound` | `GenericInst P π θs` | `SolvableAt P θs → ValidIn P π`; `SolvableFinAt → ValidFinIn` | proved: `d3bSound` |
| `D3bValidAll` | solved generic instances for every π with an instance | `ValidAll P`; finite version `ValidFin P` | proved: `d3bValidAll` |
| `D3bEqFree` | Scoped `P`; `EqFree P`; `HasInstance P π` | `GenericInst P π (thetaFree P π)` ∧ `WithinC` | proved: `d3bEqFree` |
| `D3bFlat` | Scoped `P`; `FlatD P`; `HasInstance P π` | `GenericInst P π (thetaFlat P π)` ∧ `WithinC` | proved: `d3bFlat` |
| `InstanceIffUnifiable` | Scoped `P` | `HasInstance P π ↔ ∃ τ, UnifiesD P π [] τ` | proved: `instanceIffUnifiable` |
| `MGUExists` | `∃ τ, UnifiesD P π C τ` (any `C`; no Scoped) | `∃ τ, IsMGU P π C τ` | proved: `mguExists` |
| `CellIndependence` | Scoped `P`; `HasInstance P π` | `∃ τ, UnifiesD P π (allowedCells P π) τ` | proved: `cellIndependence` |
| `Universality` | Scoped `P`; `HasInstance P π`; `IsMGU P π (allowedCells P π) τ` | `GenericInst P π (thetaStar P π τ)` ∧ `WithinC` | proved: `universality` |
| `D3bExists` | Scoped `P`; `HasInstance P π` | `∃ θs, GenericInst P π θs` | proved: `d3bExists` |
| `D3bComplete` | `Fresh P z e`; `WithinC P θs`; `GenericInst P π θs` | `ValidIn P π → SolvableAt P θs`; finite version | proved: `d3bComplete` |
| (corollary) | Scoped `P`; `HasInstance P π`; `IsMGU` over allowed cells; `Fresh P z e` | `ValidIn P π ↔ SolvableAt P (thetaStar P π τ)`; finite version | proved: `thetaStar_valid_iff_fresh` |

Supporting results: `robinson` (Robinson's theorem for finite
cell-shaped pairs, with `MguSpec`), `ci_core` (unifiable projections
give a unifier), `occupied_allowed`, `occurs_no_unifier`.

`Fresh P z e` asks for an injection of every cell into labels outside
`written P` and of every constant of `CConst Label`, infinitely many,
into bases outside `basesOf P`. It is unavailable for finite `B`.
The existence results above do not depend on it, so they hold whether
the generic universe is closed per program or extensible; only the
completeness rows depend on that choice, through `Fresh`.

## 11. Worked examples

Rigid rows `r, s, t` (0, 1, 2); flexible rows `u, v, w, x`. Cell labels
are written `@rs` for `inr [r, s]`.

**`route`** (§17): `D = { s disjoint t }`; `B`: `r = u ⊎ v`, `s = w`,
`t = x`, `u disjoint w`, `v disjoint x`, `u disjoint v`. No written
label, one pattern. Allowed cells: `{r} {s} {t} {r,s} {r,t}` (`{s,t}`
and `{r,s,t}` hold two declared-disjoint rows). θ*: `r = { @r: X r{r},
@rs: X r{rs}, @rt: X r{rt} }`, `s = { @s, @rs }`, `t = { @t, @rt }`
(each at its own constant). At θ*: `u = { @r, @rt }`, `v = { @rs }`
(at r's constants), `w = s`, `x = t`. `hv` sends `u` to `r` restricted
to labels outside `s`, `v` to `r ∩ s`: the division the dossier asks for
(§18.1), found by one call-site solve.

**`split`**: `D = { s disjoint t }`; `B`: `r = u ⊎ v`, `u disjoint s`,
`v disjoint t`. Same cells; `u = { @r, @rt }`, `v = { @rs }`.
`split-undeclared` (no `D`) has cell `{r, s, t}`: its label must go to
`u` or `v`, and either breaks a `disjoint`. θ* is the counter-instance.

**`agreement-hypothesis`**: `D = { r = s ⊎ t }`; `B`: `r = u ⊎ v`,
`u = s`. Allowed cells `{r,s}`, `{r,t}`; the mgu identifies `X r{rs} =
X s{rs} = a`, `X r{rt} = X t{rt} = b`. θ*: `r = { @rs: a, @rt: b }`,
`s = { @rs: a }`, `t = { @rt: b }`; `u = s`, `v = t`. With independent
constants (the `noUnify` mutant) θ* is `r = { @rs: a, @rt: b }`,
`s = { @rs: a' }`: θ* violates `D`, as §18.6 warned.

**A record-valued α tied to r** (`alpha-field-tied`, new):
`D = { s disjoint t, { f: { ...r } } = { f: α } }`; `B`: `α = u ⊎ v`,
`u disjoint s`, `v disjoint t`. Written label `f`; for each pattern the
mgu binds `T α` to the record of θ*'s `r`, so `α` divides as `split`
does. Control `alpha-field-untied` (no tie): `T α` stays opaque, `α =
{ ...u, ...v }` is a clash at θ*, and θ* (α a fresh base) is a
counter-instance; bounded: α = Int. Also `division-record-rigid-var`
(§18.8, `α = { ...r }`) and `alpha-equal-rows` (`α = { ...r } =
{ ...s }`, forcing `r = s` through α).

**Nested `{ f: { ...r } }`**: `nested-agreement` (§18.8):
`D = { { f: { ...r } } = { f: { ...s } } }`. Unifying the nested records
gives `r = s`: cells `{r}` and `{s}` refused, `X r{rs} = X s{rs}`, and
`u = r` solves `r = u ⊎ v`, `s = u ⊎ w`, `v disjoint w`.
`nested-field-row` (new): `D = { s disjoint t, r = { f: { ...s, ...t } }
}` makes `r` hold only `f` (cells of `r` refused) and binds `A r f` to
the record of `s ⊎ t`; `B`: `{ f: { ...u, ...v } } = r`, `u = s`.

## 12. Restrictions table

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| one label per cell in θ* | atoms are positive and per label: they cannot count a cell's labels; `hv` expands one cell label into all of θR's labels there | `route`, `split` with two unwritten labels in one cell at different types | proved: `transfer`; bounded evidence below |
| one constant per (row, cell), valued per label | `hv` values `X r S` at each label of the cell separately (context) | `contextFree` mutant (one value per constant) | targeted power check detects it (§15) |
| cells allowed one at a time, then taken together | `D`'s constraints are per label; a cell's admissibility depends only on `D`'s skeleton (§6 step 2) | `CellIndependence` failures sought in every run | proved: `cellIndependence`; bounded: never failed |
| hypotheses by unification (shared constants) | hypotheses identify fields; independent constants violate `D` | `noUnify` mutant on `agreement-hypothesis`, `shared-part-equal-rows`, `nested-agreement` | bounded: mutant puts θ* outside `D` (§13) |
| constants are opaque bases, cells are labels outside `Label` | needed for completeness (no structure a solver could exploit); soundness does not care | realizing constants as records: `∀ α. ∃ u. α = { ...u }` | soundness proved; converse assumes `Fresh` (§7) |
| `hv` drops unwritten `inl` labels and empty cells | dropping a label everywhere preserves positive atoms and definedness | solutions using spare labels | proved in transfer |
| patterns fix only top-level written labels of rigid rows | everything deeper is inside an opaque constant or built from rows by `D` | written labels inside rigid values (`nested-same`, `tyvar-nested-rest`) | bounded: checked |
| `D` Scoped | non-rigid variables in `D` would be read from θ* arbitrarily | — | assumed in Universality, CellIndependence, D3bExists, D3bEqFree, D3bFlat, InstanceIffUnifiable; not in MGUExists |
| fresh bases for the converse | constants must not be realizable by values the problem can decompose | finite bases (`Int`, `Bool` only) | `Fresh` unavailable for finite B; equation obstruction (§7) |

## 13. Oracle checks (bounded evidence, not proof)

`run.mjs` builds θ*_π for every written-label pattern (generic.mjs: the
pre-instance, Robinson unification with occurs check, allowed cells)
and checks, against every bounded rigid assignment satisfying `D`
(written labels plus `z1`, `z2`; rigid fields `Int`, `Bool`,
`{q:Int}`; rigid type variables over the bounded values and the
values `D`'s row expressions build):

- **instance**: a pattern with a bounded instance has a unifier with no
  cell;
- **allowed**: every cell a bounded instance occupies is allowed;
- **independent**: all allowed cells unify together;
- **inD**: θ*_π satisfies `D` (oracle semantics) and has pattern π;
- **covers**: `hv` with the canonical valuation maps θ*_π onto the
  instance (interp.mjs);
- **verdict**: `B` at θ*_π (solve.mjs: exact for flat problems after
  normalize.mjs's rewriting, and exact refusal when an equation's sides
  clash at fields both are forced to have, clash.mjs; bounded
  otherwise) against bounded validity. D3b valid with bounded invalid
  would be a failure.

Report mode (the default) prints and exits 0. `--assert` exits 1 on a
named verdict that differs from its expectation or on any invariant
failure; only an assert-mode exit status may be cited as a pass.

Historical and new runs are distinguished in §15.

## 14. Candidate counterexamples tried

1. **Context-free cell constants.** A cell with two labels at different
   types (`r = { z1: Int, z2: Bool }`, `s` holding both): a valuation
   giving `X r S` one value cannot cover it. Hence the context in `hv`.
   The targeted `contextFree` power check sees this (§15).
2. **Fresh types as records over fresh labels** (S2's first plan,
   §13.5). `∀ r. ∃ u v. { f: { ...u }, ...v } = { ...r }` with π: `r`
   holds `f`: if `A r f` were `{ q: Int }`, `u = { q: Int }` would solve
   it, yet `r.f = Int` refutes the signature. Constants must be opaque;
   in the generic model they are bases.
3. **Independent fresh types under an agreement hypothesis**
   (`agreement-hypothesis`): θ* falls outside `D` (§18.6's warning);
   reproduced by the `noUnify` mutant.
4. **All cells regardless of `D`** (`allCells` mutant): θ* violates the
   declared `disjoint`.
5. **Cells an instance leaves empty**: θ* occupies every allowed cell,
   an instance may occupy few; `hv` drops the rest. Every bounded
   instance with empty cells exercises this.
6. **A hypothesis forcing emptiness through equations only**
   (`alpha-empties-row`: `α = { ...r } = { ...r, ...s }`): no cell may
   hold `s`, though no `disjoint` or `lacks` says so.
7. **Impossible `D`** (`impossible-cycle`: `r = { f: { ...r } }`): no
   unifier, no θ*, vacuous validity.
8. **A rigid type variable equated to an arrow by `D`**
   (`arrow-hypothesis`): `T α := T β -> T β`; the control without the
   hypothesis is a clash at θ*.

These probes found no refutation of the stated transfer results.
Items 1-4 expose variants of the construction or interpretation; the
finite-base obstruction and completeness boundary are recorded in §7.

## 15. Results

**Claude stream, 2026-10-21 (this checkpoint).** Same 2048 MiB heap
cap and unchanged label/type/field bounds. The machine was shared with
another agent's run, so wall times are upper bounds, not benchmarks.

- Full named suite, assert mode, 3600-second limit:
  `node --max-old-space-size=2048 run.mjs --assert 0 3` completed all
  59 cases in 425.4 seconds: 36 valid/valid, 23 invalid/invalid, no
  verdict mismatches, no invariant failures, exit 0
  (`checks/named-full.log`). This supersedes the 180-second partial
  prefixes below as the full named result. The full `contextFree`
  mutant was not rerun.
- `join3`, the case after `forwarded`, alone: 32.3 seconds
  (`checks/profile-join3.log`).
- `record-constant` is now `d3b invalid` by exact refusal (clash.mjs).
  With the d7113d7 solve.mjs restored the same assert command exits 1
  with `d3b unknown` (`checks/clash-old.log`, `checks/clash-new.log`).
- Assert mode: a planted expectation mismatch exits 1, report mode 0;
  the `contextFree` mutant on four targeted cases exits 1 with three
  `covers` failures (`checks/assert-*.log`, `checks/report-planted.log`).
- Generated problems, assert mode, 120 each: seed 3 in 292.3 seconds
  (70 valid/valid, 50 invalid/invalid), seed 11 in 111.1 seconds
  (84 valid/valid, 36 invalid/invalid); no invariant failures, exit 0.
  Generated problems carry no expectation, so assert mode checks only
  invariants and soundness against bounded validity there
  (`checks/generated-3.log`, `checks/generated-11.log`).
- Lean: `lake build` passed with 127 jobs and no warnings
  (`checks/lake-build.log`, an incremental build). `checks/Audit.lean`
  now lists 23 results, including `mguExists`, `cellIndependence`,
  `universality`, `d3bExists`, `robinson`, `ci_core` and
  `thetaStar_valid_iff_fresh`; every one depends only on `propext`,
  `Classical.choice` and `Quot.sound` (`checks/axioms.log`). No
  `sorry`, `admit`, declared axiom or `native_decide` in the new files.

Earlier evidence follows.


Historical checkpoint evidence (RESUME.md; not rerun in full here):
58 named problems, 36 valid and 22 invalid, no failures; 120 generated
problems each at seeds 3 and 11, no failures. `noUnify` produced 16
`inD` failures; `allCells` produced 9 independence failures. The paused
named rerun adding `record-constant` and the full `contextFree` run were
killed, so neither was completed historical evidence.

Current runs used Node's 2048 MiB heap cap and preserved the original
label/type/field bounds. `checks/run-bounded.py` enforces a wall limit.
The full commands each timed out at 180.01 seconds:

```sh
node --max-old-space-size=2048 run.mjs 0 3
node --max-old-space-size=2048 run.mjs 0 3 contextFree
```

Both completed 42 named cases through `forwarded` before timing out:
25 valid and 17 invalid, all matching their expectations. The normal
prefix printed no invariant failures. The mutant prefix printed 48
coverage-failure examples; the runner prints at most three per case,
so this is not a total failure count. Neither run reached a final
statistics line; neither establishes a full-suite pass.
`checks/named.log` and `checks/contextFree.log` preserve these prefixes.

A targeted named check completed at the same semantic bounds (60-second
wall cap) for `agreement-hypothesis`, `arrow-hypothesis`,
`arrow-hypothesis-missing` and `record-constant`. The first three matched
their expected verdicts. `record-constant` returned `unknown`, with
bounded validity `invalid`, while its expected verdict is `invalid`.
There were no invariant failures. The solver's nested field equation
falls outside its exact flat fragment; unsuccessful bounded search does
not justify `invalid`. This unresolved precision issue is recorded in
[the local backlog](BACKLOG.md); the expectation and bounds are unchanged.
The identical four-case mutant check completed with three `covers`
failures. Logs: `checks/named-targeted.log` and
`checks/contextFree-targeted.log`. Reproduce with the exact-name selector:

```sh
node --max-old-space-size=2048 run.mjs 0 3 '' \
  record-constant,arrow-hypothesis,arrow-hypothesis-missing,agreement-hypothesis
node --max-old-space-size=2048 run.mjs 0 3 contextFree \
  record-constant,arrow-hypothesis,arrow-hypothesis-missing,agreement-hypothesis
```

`checks/context-power.mjs` separately checks one rigid row, no written
labels, and two unwritten labels in the same cell at `Int` and `Bool`.
Normal coverage succeeds. The mutant reads both as `Int`; the assertion
requires that exact discrepancy. This completed under a 30-second wall
cap; `checks/context-power.log` records the result. It is a targeted power
check, not the full bounded suite or a replacement with smaller bounds.

The pinned Lean 4.35.0 `lake build` passed (99 jobs) with the singleton
proof imported by default. `checks/Audit.lean` reports dependencies for
16 important results; every result uses only `propext`,
`Classical.choice` and `Quot.sound`. Reproduce from
`research/composition-proofs`:

```sh
lake build
lake env lean ../division-campaign/d3b/checks/Audit.lean
```

Logs: `checks/lake-build.log` and `checks/axioms.log`. The owned proof
files contain no `sorry`, `admit`, declared axioms or `native_decide`.
No compiler verification was run: this checkpoint changes research and
documentation only, as authorized.

## 16. Review scope and remaining work

The proofs of `mguExists`, `cellIndependence`, `universality` and
`d3bExists` in this checkpoint have not yet had an independent review;
the statements were reviewed before the attempt and are unchanged.
The two previous adversarial passes and the separate flat-fragment pass
reported no false or vacuous theorem. Their proof-route requests are in
§6; the label-reading correction and exact freshness premises are in §7.
The flat constructor's comment already avoids claiming agreement with
MGU classes. The documentation review found stale proof status and an
unsupported weakening of `Fresh` to the used constants; those claims are
corrected here.

Suggested next statements remain unproved: P9s no-loss,
`Accepts P → HasInstance P π → SolvableFinAt P (thetaStar P π τ)`
(with the necessary MGU and scope premises still to be specified), and
`thetaFlat = thetaStar` up to renaming under suitable premises. These are
research tasks, not assumptions silently added to the proved results.

The singleton `ShapeSplit` was split at the `Facts`/witness boundary into
`ShapeSplitCore.lean` and `ShapeSplit.lean`, preserving public theorem
names and statements. Its validity, finite validity, second-base
invalidity and absence of uniform presence are default-build results.
`validity_not_extension_stable` combines singleton finite validity with
failure at a second opaque base (`Unit` versus `Bool` model bases).
It records loss of validity under that extension, without choosing
Waxwing's type universe.
The general finite-base family retains the separate semantic boundary
in the follow-up README. No D4 policy or compiler changes follow from
this checkpoint.

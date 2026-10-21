# D3b: a generic instance per written-label pattern

Stream 1 of the parallel campaign (dossier §18.13). Owner of the D3b
statements. Status labels as at the head of the dossier. Nothing here
changes the dossier; the coordinator integrates.

Lean: research/composition-proofs/Composition/Typed/Model.lean (the
generic model and the interpretation `hv`, definitions only) and
Typed/Defs.lean (the construction and every claim, as `Prop`
definitions). Oracle checks: this directory (`run.mjs`, below).

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
   syntactic unification, Robinson 1965 (published; the term algebra
   here has infinitely many record constructors, one per label set, which
   the algorithm does not care about).
3. **Allowed cells.** Cell `S` is allowed when `D` is unifiable with `S`
   as the only cell (`Allowed`, `allowedCells`). A cell is refused when
   `D` declares two of its rows disjoint, when a composition in `D`
   would hold the cell twice, or when an equation would hold it on one
   side only (for example `r = s` refuses `{r}` and `{s}`).
4. **θ*_π** `= thetaOf P π (allowedCells P π) τ*` with `τ*` a most
   general unifier (`IsMGU`, `thetaStar`). Unbound constants stay
   opaque.

How each requirement of the task is met:

- **Declared equations** (requirement 1). They are unified, not
  ignored. `r = s` identifies `X r S` with `X s S` in every cell holding
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
  (`IsMGU` includes `UnifiesD`). It exists iff π has an instance
  satisfying `D` (`InstanceIffUnifiable`), and needs all allowed cells
  to be unifiable together (`CellIndependence`).
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

No obligation like P9s's D1/D2 is needed: two rigid rows share a cell
label generically exactly when they may overlap, and the cell labels
make that overlap explicit.

**D3bSound**: if `θs` is a generic instance for π (`GenericInst`:
finite, satisfies `D`, pattern π, covers every instance of π satisfying
`D`) and `B` is solvable at `θs`, then `ValidIn P π`, and with finite
witnesses `ValidFinIn P π`. Immediate from Transfer.

**D3bValidAll**: solved generic instances for every pattern with an
instance give `ValidAll P` (and `ValidFin P` with finite ones).

## 6. Why θ*_π covers every instance (Universality, open)

`Universality`: for Scoped `P`, if π has an instance and `τ*` is an mgu
over the allowed cells, then `thetaStar P π τ*` is a generic instance
(and uses only the problem's labels, cells, bases and constants,
`WithinC`). The argument, not yet formalized:

1. **Cells occupied by θR are allowed.** If θR occupies cell `S` at
   label `k`, collapse θR: keep written labels, rename `k` to `inr S`,
   drop every other unwritten label, at every depth. That map is a
   homomorphism (injective on the labels it keeps), so the collapse
   satisfies `D`, and it is `thetaOf P π [S] τ'` for the `τ'` reading
   θR's values. So `S` is allowed.
2. **Positions of constants.** In `D`'s terms over the pre-instance, a
   cell constant `X r S` occurs only directly under a cell label `inr S`,
   and nothing else occurs there; `T` and `A` constants never occur
   directly under a cell label. Unification therefore only identifies
   cell constants of the same cell with each other (no structure is
   ever bound to `X`), and the rest of the mgu does not depend on which
   allowed cells are present (cell locality).
3. **Factoring θR through τ*.** The canonical valuation reads θR. For a
   label `k` in an occupied cell, θR satisfies the equations the mgu
   derives at the positions under `k`; at written labels and arrows `hv`
   is injective on constructors; cells θR leaves empty impose nothing.
   So every identification and binding of τ* holds of θR's values, and
   `hv (τ* c)` equals the canonical value of `c` for every bound `c`.
4. Hence `hvRow (θ*.row r) = θR.row r` and `hv (θ*.ty n) = θR.ty n`.

Supporting statements, each a separate `Prop` in Typed/Defs.lean:
`MGUExists` (Robinson's theorem for the pre-instance, with finite
values), `CellIndependence` (step 2's consequence: all allowed cells are
unifiable at once), `InstanceIffUnifiable` (vacuity). With them,
`D3bExists` follows from `Universality`.

## 7. The converse (completeness of the reduction)

`D3bComplete`: if labels outside the written ones can name the cells
(`z : Cell → Label`, injective, avoiding written labels) and bases
outside the problem's can name the constants (`e`, injective, avoiding
`basesOf P`), then a generic instance within the problem's symbols
(`WithinC`) is realized as a rigid assignment θR = θs read through `z`
and `e`. The renaming back, label `z S ↦ inr S`, base `e c ↦ inr c`,
everything else by `inl`, is injective and commutes with evaluation,
so θR satisfies `D` and has pattern π, and any solution at θR maps back
to a solution at θs. So `ValidIn P π → SolvableAt P θs`.

**Assumption, reported.** `e` needs infinitely many base types outside
the problem (`CConst` is infinite in Lean; only finitely many constants
occur in θs, so finitely many fresh bases are what the argument uses).
Waxwing's semantics with finitely many bases (`Int`, `Bool`, ...) is not
covered: whether validity there still implies solvability at θ*_π is
open. Realizing constants as records over fresh labels does not work:
`∀ α. ∃ u. α = { ...u }` is solvable when α is `{ q: Int }` and invalid
(α = Int). Soundness (§5) needs no fresh bases or labels at all.

Together, D3bExists, D3bSound and D3bComplete reduce validity per
pattern to one call-site problem: `B` at θ*_π, decidable by R3
(`decideCall`) once θ*_π is substituted.

## 8. Equation-free hypotheses (Waxwing's `where` clauses)

When `D` has only `lacks`, `disjoint` and `ff` atoms (`EqFree`), no
unification is needed. `thetaFree P π = eta P π (freeCells P)`, where
`freeCells` are the cells with no two rows declared disjoint (a row
declared disjoint from itself excludes its cells). `D3bEqFree`: for
Scoped, equation-free `P` and π with an instance, `thetaFree P π` is a
generic instance within the problem's symbols. This is the fragment of
Waxwing's current declarations, and it covers `route` and `split`.

## 9. Relation to D3a

D3b is not derived from D3a and does not establish D3a's grammar. A
generic solution σ at θ*_π, mapped by `hv`, is one witness per pattern
that works for every instance (uniform); but its values are arbitrary
generic values (a cell's field may be, say, `X r S -> Int`), wider than
D3a's templates (absent or one source row's field per cell). D3b plus
transfer gives uniform witnesses in that wider sense only.

## 10. Lean statements and status

| Lean | Meaning | Status |
|---|---|---|
| `Transfer` | a generic solution at θs maps by `hv` to a solution at every θR θs covers; finite if both are | to prove (Phase C) |
| `D3bSound` | generic instance + solvable at it ⇒ `ValidIn`; finite version | to prove |
| `D3bValidAll` | solved generic instances for all patterns ⇒ `ValidAll`, `ValidFin` | to prove |
| `D3bEqFree` | `thetaFree` is a generic instance for equation-free `D` | to prove |
| `InstanceIffUnifiable` | π has an instance ⇔ `D` unifiable with no cell | to prove |
| `D3bComplete` | with fresh labels and bases: `ValidIn` ⇒ solvable at θs | to prove |
| `Universality` | an mgu over the allowed cells gives a generic instance | open (§6 argument) |
| `CellIndependence` | the allowed cells are unifiable together | open (§6 step 2) |
| `MGUExists` | unifiable ⇒ a finite mgu exists | published (Robinson); not formalized here |
| `D3bExists` | every pattern with an instance has a generic instance | follows from the three above |

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
| one label per cell in θ* | atoms are positive and per label: they cannot count a cell's labels; `hv` expands one cell label into all of θR's labels there | `route`, `split` with two unwritten labels in one cell at different types | transfer: to prove for all values; bounded: checked |
| one constant per (row, cell), valued per label | `hv` values `X r S` at each label of the cell separately (context) | `contextFree` mutant (one value per constant) | bounded: mutant fails as expected (§13) |
| cells allowed one at a time, then taken together | `D`'s constraints are per label; a cell's admissibility depends only on `D`'s skeleton (§6 step 2) | `CellIndependence` failures sought in every run | open; bounded: never failed |
| hypotheses by unification (shared constants) | hypotheses identify fields; independent constants violate `D` | `noUnify` mutant on `agreement-hypothesis`, `shared-part-equal-rows`, `nested-agreement` | bounded: mutant puts θ* outside `D` (§13) |
| constants are opaque bases, cells are labels outside `Label` | needed for completeness (no structure a solver could exploit); soundness does not care | realizing constants as records: `∀ α. ∃ u. α = { ...u }` | soundness: none needed; completeness: needs fresh bases (§7) |
| `hv` drops unwritten `inl` labels and empty cells | dropping a label everywhere preserves positive atoms and definedness | solutions using spare labels | part of transfer (to prove) |
| patterns fix only top-level written labels of rigid rows | everything deeper is inside an opaque constant or built from rows by `D` | written labels inside rigid values (`nested-same`, `tyvar-nested-rest`) | bounded: checked |
| `D` Scoped | non-rigid variables in `D` would be read from θ* arbitrarily | — | assumed in Universality, D3bEqFree, InstanceIffUnifiable |
| fresh bases for the converse | constants must not be realizable by values the problem can decompose | finite bases (`Int`, `Bool` only) | completeness open there (§7) |

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
  normalize.mjs's rewriting, bounded otherwise) against bounded
  validity. D3b valid with bounded invalid would be a failure.

Results: see §15 (filled after the runs).

## 14. Candidate counterexamples tried

1. **Context-free cell constants.** A cell with two labels at different
   types (`r = { z1: Int, z2: Bool }`, `s` holding both): a valuation
   giving `X r S` one value cannot cover it. Hence the context in `hv`.
   The `contextFree` mutant shows the check sees this.
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

None refuted a D3b statement; 1-4 refute the variants noted.

## 15. Results

(To be filled after the runs.)

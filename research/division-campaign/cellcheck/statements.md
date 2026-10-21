# A cell-based certificate checker for option B: statements only

Dossier §18.51 (the author's decision to target `ValidOpen` directly).
**Nothing here is proved.** Per the author, no cell-based checker
proof starts until these statements have been reviewed adversarially.
The Lean files hold `def`s and `def … : Prop` only, with no `theorem`,
no `sorry` and no axiom. They are imported from Composition.lean, and
`lake build` passes.

Status (2026-10-21): the first soundness tranche is proved in
Cell/Proofs/ (dossier §18.56), pending the author's acceptance; the
statements here are unchanged.

Files, all under research/composition-proofs/Composition/Typed/Cell/:

- Format.lean: the certificate format, its denotation at a generic
  instance, and the images of strategy A's and option C's pieces.
- Query.lean: the region, the injected queries (`CellQ`), their
  soundness contract (`QSound`), and the proposed implementation
  (`implQ`).
- Check.lean: the checker `cellCheck` (evaluator, apartness, equality,
  atoms).
- Statements.lean: the main statement CM, its corollaries, and the
  separate obligations CI, CB, CD, CV.
- Exact.lean: exactness of the region queries and the reduction behind
  the complexity remark (QX, QR).
- Scenarios.lean, ScenariosMore.lean: acceptance scenarios with intended
  verdicts (Sc), and the checks behind two claims of this note
  (`CellShapeNeeded`, `CheckTautology`). ScenariosMore.lean was added
  after the completeness review (§10.2).

## 1. Target and boundary

The target is option B's `ValidOpen` (Typed/Bridge/Valid.lean), through
the `←` direction of `openCharacterization`, which is B5
(`d3bSoundOpen`): if every pattern with an instance has a generic
instance at which the body is finitely solvable, then `ValidOpen P`.
B5 needs no `Scoped` premise, no fresh labels and no existence premise.

Nothing here targets P9s's `Accepts`. `route` is outside `Accepts`
(`routeSig_not_accepts`) and inside `ValidOpen` (`routeOpen`), and it
is the first acceptance scenario (§8). SC1-SC4 and option C's PC3/PC4
stay proposals about `Accepts`. None of their correctness claims is
used here (§7).

**No computed θ\*.** The main statement CM quantifies over every
generic instance `θs` that carries the stated evidence. The corollary
CM-open gets one such `θs` per pattern from `thetaFree`, which is a
classical definition. It is used in a proof, never computed by the
checker. The checker itself never sees a generic instance. It reads
`P`'s syntax, the certificate, and the answers of the injected queries.

## 2. The certificate format and its interpretation

### 2.1 Pieces over Venn cells

Option B's generic model (Typed/Model.lean) has labels `Label ⊕ Cell`.
A written label `inl l` is fixed per pattern. A cell label `inr S`
stands for the unwritten labels that exactly the rigid rows in `S`
hold. Rigid row `r` holds, at cell `S`, a value that is `X r S` in the
pre-instance and possibly a term after an mgu.

A **cell piece** `⟨r, labels, cubes⟩` (`CellPiece`):

- `r`: the source row. It must be rigid (§2.3).
- `labels`: written labels whose entries the piece copies from `r`.
- `cubes`: a list of cubes. A cube (`CellCube`) is a conjunction of
  membership literals `(x, b)`, read as "row `x` is (`b = true`) or is
  not (`b = false`) in the cell". The piece copies `r`'s entry at every
  cell that satisfies some cube (`cubeSat`, `CellPiece.selects`).
  `[]` selects no cell. `[[]]` selects every cell, which is the whole
  unwritten part of `r`.

**Denotation at a generic instance `θs`** (`cpieceRow`):

```
⟦⟨r, L, Ks⟩⟧θs (inl l) = θs.row r (inl l)   if r rigid and l ∈ L
⟦⟨r, L, Ks⟩⟧θs (inr S) = θs.row r (inr S)   if r rigid and S ⊨ some K ∈ Ks
                       = none                otherwise
```

**Field types are the source row's.** A piece never chooses a type. At
every label it holds, it holds exactly `θs.row r`'s entry there: a
constant `A r l` or `X r S`, or whatever term an mgu put in that
position. CI1 (`PieceIsSubRow`) states that the whole piece
`wholePiece P r = ⟨r, written P, [[]]⟩` is `θs.row r` itself, given
`WithinC`, and that every piece is a sub-row of its source.

**Schematic values** (`CellV`): `base b` with `b : B`, `rty n` (rigid
type variable `n`, denoting `θs.ty n`), `arrow`, and `record fields
pieces`. **No generic constant and no single-field reference can be
written.** One certificate is read at every generic instance of every
pattern, and a constant names a position in one particular instance.
The only ways into `θs` are pieces and rigid type variables, and their
meaning is the same at every `θs`.

**Certificate** (`CellCert`): binding lists `ty` and `row`. A variable
bound twice is read at its first occurrence. An unbound flexible
variable is `{}`. Bindings of rigid variables are ignored, because
`combine` takes rigid values from `θs`.

**Instantiation at `θs`** (`cinst`): each flexible type variable gets
`cvDen` of its binding, and each flexible row gets the union of its
binding's fields and pieces. A record denotes the union of its fields'
row and its pieces' rows, fields first. Where the checker accepts, the
parts are disjoint, so the union is the composition.

### 2.2 Relation to strategy A's `{r, ex}` and option C's `⟨r, S, rest?⟩`

| representation | image here | semantics matches? |
|---|---|---|
| A's `{r, ex}` (`SchPiece`) | `ofSchPiece P (r, ex) = ⟨r, written P ∖ ex, [[]]⟩` | on written labels, the same labels are held at the same pattern (presence at `thetaFree`, CI4″); values are each model's own constant; on the rest **no**, see below |
| C's `⟨r, S, [], rest⟩` (`Piece`, no guard) | `ofProjPiece q = some ⟨r, S, rest ? [[]] : []⟩` | on written labels, presence as for A (CI4); on the rest the same caveat |
| C's guarded pieces | `ofProjPiece q = none` (CI4′) | guards are deferred (§18.48) |
| C's certificate `sigma3` | `ofProjCert` (no type bindings, no written fields, no guards) | used for `divide3` (`ScDivide3`) |
| the whole row `r` | `wholePiece P r` | yes (CI1) |

The caveat is this. P9s's rest of `r` is one label, `inr r`, private
to `r`, valued by the constant `R r`. Two rests never share a label in
the representation, and P9s's D1/D2 obligation (`declared r s`) is a
separate condition. In the cell model, "the rest of `r`" is every cell
containing `r`, and cells are shared: `r`'s rest and `s`'s rest
overlap at every cell holding both. Overlap is now a fact about the
cells, not an extra obligation. CI5 (`DeclaredIsNoCommonCell`) states
the point of contact. For distinct rigid rows, "no free cell holds
both" is exactly `declared r s`, or `disjoint r r`, or `disjoint s s`.
So the old rule "two rests need `declared`" comes back as a special
case of `cellBoth` at the cube `[]`. Every other cube is new. `route`'s
`u = r|(dom r ∖ dom s)` is `⟨r, [], [[(s, false)]]⟩`, which has no
image in A or C.

**Only the syntactic embedding is reused.** No denotation, instantiation
or checking statement of SC1-SC4 or PI1/PI2 is claimed for the images.
CI4 and CI4″ are new statements about the new denotation; they compare
only which written labels are held, which is all the two models share.

### 2.3 Rigidity, shadowing and the untrusted certificate

- **Rigidity** (§18.48 asked that it be validated or its meaning
  stated; both are done). A piece whose row is not in `P.rigidRow`
  denotes `{}`, and `rty n` with `n` not rigid denotes `emptyG`. The
  checker also refuses both, through `wfC` at every depth for every
  binding. No verdict depends on the fallback reading. The fallback
  makes CI2 (finiteness of `cinst`) hold for every certificate.
- **Shadowing** belongs to the representation, as in SC (first
  occurrence wins). `certOkC` also checks the shadowed bindings, which
  is conservative and not an exactness result. Composition is a
  different matter: parts that may share a label are refused
  (`composeC`/`apartC`) and are never read at a first occurrence.
- **Untrusted.** CM quantifies over every `σ`. The checker re-evaluates
  every atom of the original `P.B`, binding equations included (CB1).
  No atom is dropped as solved, and no residual is trusted.

## 3. The checker

```
cellCheck P Q σ := fragmentS P && certOkC P Q σ && P.B.all (atomC P Q σ)
```

`Q : CellQ` is injected. The checker reads the region only through
`Q`, because no other region information is available to it. The rest
of its input is `P`'s syntax (`written P`, `P.rigidRow`, `P.rigidTy`,
`P.D` for the guard) and the certificate. Its parts, each with its
strategy A counterpart (SchematicDefs.lean):

| cell checker | does | counterpart, and what changed |
|---|---|---|
| `lackC` | no piece holds `l` in the region | `lackY`: `l ∈ labels` replaces `l ∉ ex` |
| `piecesApart` | two pieces share no written label (`possBoth`) and no cell (`cellBoth` on each pair of cubes) | new; A required `declared` between any two pieces instead (rests always carried) |
| `apartC` | two parts share no label | `apartY` with `piecesApart` in place of "distinct rows and `declaredS`"; two pieces of the same row are allowed when apart |
| `composeC` | fold of `apartC` | `composeY`, unchanged shape |
| `wfC`, `certOkC` | well-formed at every depth; rigid rows and type variables only; row bindings records | `wfY`, `certOkY`; adds the rigid type variable check |
| `tyC`, `rowC` | rigid → `rty n` / whole piece; flexible → binding | `tyY`, `rowY`; a rigid row is `wholePiece` (written labels and every cell) instead of `(r, [])` |
| `evalC`, `evalFC` | symbolic evaluation; `none` if a composition may be undefined or a label repeats | `evalY`, `evalFY`, same shape |
| `sameW` | per written label, the same source rows on both sides | `sameY`, over `labels` |
| `sameCells` | per source row, both sides select the same occupied cells (`cover` both ways) | new: replaces `sameRests` (A compared rest sets) |
| `eqC`, `eqFC` | equality at every generic instance of the region | `eqY`, `eqFY`; **no `againstY`**: a written field never equals a piece's entry, since there is no field reference and `must` is constant false on the fragment (QR5) |
| `atomC` | one atom of `P.B`; equations need both sides evaluated | `atomY`, same shape |
| `cellCheck` | guard, certificate, every atom | `checkSym` without the `nonEmptyS` short cut: on the fragment the region is never empty (QR5) |

**Equality compares sources, not values.** `eqC` treats two entries as
equal only when they come from the same source: the same row at the
same written label or cell, the same rigid type variable, or the same
base. That is sound at every `θs`, whatever the values are. It is
complete only where distinct sources are distinct values, which holds
at `thetaFree` (distinct constants, argued, not stated). Outside the
fragment, an equation in `D` could identify two rows. That is one
reason for the guard (§9).

## 4. The main statement and its corollaries

**The region** (`InCellRegion P θs`): `θs` is a generic instance of
some pattern `π` with an instance (`HasInstance`, `GenericInst`),
within the problem's symbols (`WithinC`), and has the **cell shape**
(`CellShape`): for each rigid row `r` and each cell `S`, if `θs.row r
(inr S)` is present then `S` is a candidate cell (`cellCands`) with no
declared disjoint pair inside (`FreeCell`) and `r ∈ S`. (The first
draft stated an iff; only this direction is used, and the converse
excluded generic instances for no reason: review S1.)

**CM** (`CellSound`). For every `P`, every injected `Q`, and every
(untrusted) `σ`:

```
QSound P Q → cellCheck P Q σ = true →
  ∀ π θs, HasInstance P π → GenericInst P π θs → WithinC P θs →
    CellShape P θs →
      FinAssign (cinst P θs σ) ∧
        Sat (combine (cliftP P) θs (cinst P θs σ)) (cliftP P).B
```

The conclusion `CellSolves` names its witness, the certificate
instantiated at `θs`, so it is stronger than `SolvableFinAt P θs`. The
evidence premises are exactly what the checker's reasoning reads.
`GenericInst` supplies `D` at `θs` and the written-label pattern.
`WithinC` says no row holds an unwritten `inl k`. `CellShape` fixes
which cells are occupied. `HasInstance` is the region's own condition.
`QSound` is a contract on the injected queries; it does not trust a
solver. CV2 discharges it for `implQ`.

**Why `CellShape` is a premise.** `GenericInst ∧ WithinC` leaves a
generic instance free at cells that no instance occupies, because
coverage never reads them. `CellShapeNeeded` (ScenariosMore.lean)
states the example; the soundness reviewer reproduced it in a scratch
semantic oracle (§10.1). Take `route` (`D = [disjoint 1 2]`,
no written labels) and `thetaFree` with two extra entries. Row 0 gets a
value at cell `[1, 2]`, and row 2 gets one there too, while row 1
stays empty at `[1, 2]`. `D` still holds. Coverage holds because no
instance has a label in cell `[1, 2]`. `WithinC` holds. But `route`'s
certificate puts row 0's cell `[1, 2]` into `v` (cube `[(1, true)]`),
and `v disjoint x` then fails at that cell. So CM without `CellShape`
is false for this certificate. `CellShapeNeeded` alone does not refute
it: the refutation also needs the certificate's acceptance
(`checkI routeP routeCert = true`, in `ScRoute`) and CV2 for `implQ`
(re-review N4). `thetaFree` has the shape (CV1), so
nothing is lost for CM-open.

**CM-open** (`CellOpen`): `QSound P Q → cellCheck P Q σ = true →
ValidOpen P`. The route of a later proof: the guard gives `LDFragment
P` (CG, `FragmentIff`, restated here because SC2Frag is an unproved
`Accepts`-side proposal); CV1 gives `thetaFree P π` with the evidence
for every `π` with an instance; CM gives `SolvableFinAt`; B5 gives
`ValidOpen`. It has no `Scoped` or fresh-label premise. `LDFragment`
implies `Scoped` and `EqFree`, which `d3bEqFree` needs, and B5 needs neither.

**CM-impl** (`CellOpenImpl`): the same with `implQ P` and no premise
at all (CV2 discharges `QSound`).

## 5. Separate obligations

Each is its own `Prop` in Statements.lean.

**Certificate instantiation (CI).**

- CI1 `PieceIsSubRow`: the whole piece is the row; every piece is a
  sub-row of its source. (§2.1)
- CI2 `CInstFin`: `RigidFinC P θs → FinAssign (cinst P θs σ)` for every
  `σ`.
- CI3 `EvalCommutes`: **denotation commutes with instantiation at
  `θs`**. If `QSound P Q`, `certOkC P Q σ`, `θs` is in the region and
  `evalC P Q σ t = some v`, then the ordinary evaluator under the
  instantiated certificate gives `evalT (combine (cliftP P) θs (cinst P
  θs σ)) (cliftT t) = some (cvDen P θs v)`. Evaluating symbolically and
  then denoting at `θs` agrees with instantiating at `θs` and then
  evaluating.
- CI4 `ProjPieceDen`, CI4′ `ProjGuardRefused`, CI4″ `SchPieceDen`,
  CI5 `DeclaredIsNoCommonCell`: the relation to option C, strategy A
  and P9s's `declared`. (§2.2)
- CG `FragmentIff`: the guard computes `LDFragment`.

**Original-body checking (CB).**

- CB1 `BodyAll`: acceptance means every atom of the original `P.B`
  passed `atomC`. This holds by construction, and it is stated so that
  "no trusted residual" is a checked claim.
- CB2 `AtomSound`: an accepted atom holds at every `θs` of the region
  under `cinst P θs σ`, in the generic model (`cliftAtom`).
- CB3 `EqSound`: `eqC` is sound for well-formed values.
- CB4 `EvalWf`: the evaluator returns well-formed values from a
  well-formed certificate. This is the invariant CB3 needs; without it
  `eqC` is unsound, as in SC §2.

**Definedness (CD).** The declaration side is restricted by the guard.
The body is not restricted, and the checker enforces expression
definedness itself:

- CD1 `DupRefused`: duplicate written labels in a record expression are
  refused (`evalFC`).
- CD2 `ApartSound`: apart parts denote disjoint rows at every `θs` of
  the region, so overlapping record parts are refused.
- CD3 `EvalDefined`: an evaluated expression, nested subterms
  included, is defined at every `θs` of the region. This is the
  definedness half of CI3, stated on its own.
- CD4 `EqBothSides`: an accepted equation had both sides evaluated.
  With CD3, both sides are defined in the generic model, as `Holds`
  requires.

Certificate values are checked by `wfC`/`certOkC` at every depth.

**Pattern coverage (CV).**

- CV1 `CoverFree`: on `LDFragment`, every pattern with an instance has
  `thetaFree P π` with `GenericInst`, `WithinC` (both from `d3bEqFree`,
  proved) and `CellShape` (new). That covers every pattern, not only
  the `consistentS` patterns of a finite enumeration.
- CV2 `ImplSound`: `QSound P (implQ P)` for every `P`, with no fragment
  premise. The queries are conservative at every generic instance of
  every pattern with an instance.

Proof dependencies, for planning only: CM uses CI2, CI3 (with CD2,
CD3), CB1-CB4 and CD4. CM-open uses CM, CG, CV1 and B5. CM-impl uses
CM-open and CV2.

## 6. Region queries

### 6.1 What the cell model needs

The old four queries were `nonEmpty`, `possible`, `must` and
`possibleBoth` (SchematicCert.lean, over `consistentS` patterns). They
are **not** what the cell checker needs. It needs these four, read over
the region of §4 (generic instances, not finite patterns):

| query | meaning when `false` / `true` | used by | implementation (`implQ`) | cost |
|---|---|---|---|---|
| `possW r l` | false: no `θs` gives `r` the written label `l` | `lackC`, `sameW` | `l ∈ written P && holdersOK P l [r]` | O(\|D\| + \|written P\|) with `written P` precomputed (the model recomputes it per call) |
| `possBoth r s l` | false: no `θs` gives both | `piecesApart` | `l ∈ written P && holdersOK P l [r, s]` | the same |
| `cellBoth r s K` | false: no `θs` has a cell satisfying `K` where both `r` and `s` are present | `piecesApart` | `cellPossS P ((r,true) :: (s,true) :: K)`: the least candidate cell, then `freeS` | O(\|rigidRow\|·\|K\| + \|cell\|²·\|D\|) |
| `cover r L R` | true: every occupied cell of `r` that `L` selects, `R` selects too | `sameCells` | `coverS`: subsumption, else split on a row `R` mentions (Shannon expansion) | exponential in the number of splits, worst case |

`nonEmpty` and `must` are not asked. QR5 states that on the fragment
the region is never empty, and that no written label is ever forced
present (`must` is constantly false). `must` would come back only with
field references or `has`-like declarations, and both are excluded
(§9).

### 6.2 Hypotheses

- **Soundness (CV2): none beyond the region.** `holdersOK` reads only
  `D`'s `lacks` and `disjoint` atoms, which hold at `θs` through
  `GenericInst`'s `Sat θs (cliftP P).D`, for any `D`. Unwritten labels
  are absent by `WithinC`. The cell queries are sound because of
  `CellShape`. The soundness proof also uses `CellPossExact`'s `←`
  direction: a free candidate cell satisfying the cube makes
  `cellPossS` true.
- **Exactness, computational (QX1-QX3), for every `P`:** `freeS`
  computes `FreeCell`. `cellPossS` is exact when the cube has a
  positive literal, which every query `implQ` asks does (the piece's
  own row). `coverS` is exact over the free candidate cells of a rigid
  `r`: its fuel, the number of literals in `R` plus one, is enough to
  fix every row `R` mentions, and at that depth subsumption is exact.
- **Exactness over the region (QR1-QR4): `LDFragment P`.** The written
  queries are exact because the fragment's region is a product over
  written labels: each pattern with an instance is a choice, per
  label, of a `holdersOK` holder set, and every allowed set occurs. The
  cell queries are exact because every free cell is occupied at
  `thetaFree` for every pattern. Outside the fragment they stay sound
  and may be incomplete. `D = [ff]` empties the region. An equation in
  `D` can force rows empty or equal (SC2Boundary, SC2Boundary′).
- **`r`, `s` rigid** in every query. Pieces on other rows are refused,
  so the checker never asks about them.

### 6.3 A query with no efficient exact form

**`cover` has no efficient exact form for this format** unless P = NP.
QX4 (`CoverTautology`) states the reduction. Take `D = []` and rigid
rows `r :: xs`. Then "`R` covers all of `r`" (`coverS P r [[]] R`) is
the tautology problem for the DNF `R` over the rows `xs`. A certificate
realizes the reduction directly: the body `{ ...r } = { ...u }`, with
`u` bound to one piece of `r` whose cubes are `R`; `CheckTautology`
(ScenariosMore.lean) states that `checkI` passes exactly when `R` is a
tautology. Within one piece, cubes may overlap, so `R` is an arbitrary
DNF. So any checker that is sound **and complete** for this format
(its `cover` exact, as QR4) decides DNF tautology, which is coNP-hard
when the number of rigid rows is unbounded (standard coNP-completeness
of DNF tautology). A sound but incomplete checker may refuse in
polynomial time; the hardness is about the exact query. It concerns
exact checking of this unrestricted certificate format and does not
establish a lower bound for every possible Waxwing inference algorithm
(the author, §18.54). Argued, not checked; QX4 and `CheckTautology`
are the precise statements it rests on, and a scratch run accepts the
five-cube "pinwheel" through `checkI`.

What is known and what is not:

- `coverS` is exact always (QX3). Its cost is O(2^d · (literals of
  R) · cellPoss), where d is the number of splits it makes. The scenarios
  need d = 0 (`star`, `divide3`) or d = 1 (`route`, splitting on `s`).
  A scratch evaluation (not a proof) shows the splitting also handles a
  partition that pairwise merging cannot reduce (the five-cube
  "pinwheel" over three rows). With one cube removed, the answer is
  false, as expected.
- **Single-cube pieces.** If each piece carried one cube, the cover
  inputs would be pairwise disjoint over free cells, because the
  pieces of one row on one side must be apart. With no declarations,
  disjoint-DNF cover is polynomial by counting inclusion as
  \|L ∧ R\| = Σ \|K ∧ K′\| (the pairwise intersections are disjoint);
  disjointness of the inputs needs an exact `cellBoth` (`implQ`'s is),
  not only a sound one. With declarations,
  counting becomes counting independent sets, which is #P-hard, so
  counting gives no efficient form. Whether another method does is
  **open**.
- A certificate could carry the split tree as an untrusted hint, so
  that checking it is linear in its size. That is a proposal only
  (question 3).

## 7. Reuse

The author's rule governs this section: "the evaluator's shape is
reusable; its correctness theorem is not automatically
target-independent" (§18.51). Each reused definition, and what changes:

| reused | from | what changes |
|---|---|---|
| `GenericInst`, `WithinC`, `HasInstance`, `cliftP`, `cliftT`, `cliftAtom`, `SolvableFinAt`, `ValidOpen`, `d3bSoundOpen` (B5) | Typed/ | nothing; used as defined and proved |
| `cellCands`, `FreeCell`, `freeCells`, `thetaFree`, `d3bEqFree` | Typed/Defs.lean, EqFree.lean | nothing; `CellShape` restates `thetaFree`'s cell occupancy as a premise |
| `LDFragment`, `fragmentS` | Sig/SchematicDefs.lean | none in definition (a predicate on `D`). Role changed: in SC the guard gave the region SC2Real's meaning; here it makes pattern coverage (CV1) and query exactness (QR) hold. SC2Frag's first conjunct (`fragmentS ↔ LDFragment`) is needed and restated as CG |
| `holdersOK` | Sig/SlicePatterns.lean | none in definition; its exactness is restated against `HasInstance` at generic instances (QR1, QR2), not against `consistentS` |
| `declaredS` | Sig/WellFormed.lean | only in CI5, as the comparison point |
| `Piece`, `SchPiece`, `SCert`, `sigma3`, `divide3Sig`, `divide5Sig` | Sig/ProjectionDefs.lean, SchematicCert.lean | syntax only; `ofProjPiece`/`ofSchPiece`/`ofProjCert` give new denotations (§2.2); a guarded `Piece` has no image |
| `pieceRow`, `SchpieceRow` | ProjectionDefs.lean, SchematicCert.lean | only as comparison points in CI4, CI4″ |
| `splitSig`, `agreeP`, `intArmP` | Sig/Adversarial.lean, Typed/ExamplesFlat.lean, Typed/Bridge/Examples.lean | nothing |
| `written`, `subsets`, `Sat`, `Holds`, `evalT`, `combine`, `FinAssign`, `RigidFinC`, `union`, `emptyG`, `Composition.Disjoint` | the base model | nothing |
| `routeP`, `splitFree`, `shapeSplit` | Typed/Examples, ExamplesValid, TypedAttack | nothing |
| evaluator shape (`evalY`, `composeY`, `wfY`, `eqY`, `atomY`, `checkSym`) | Sig/SchematicDefs.lean | re-implemented for cells (§3 table); **no correctness statement carried over**: SC3's soundness is about `checkCert` at P9s patterns, CB2-CB4 are about `Sat` at generic instances |
| the four queries and `QueriesExact` | SchematicCert.lean, SchematicDefs.lean | not reused (§6.1) |

Re-encoded, not reused: `cStar`, `cStarR`, `depFam` and `divideSig`
translate star/problems.mjs's `star`, `star-read`/`star-cross`, `dep`
and `divide`/`divide2` with `Nat` labels (`f_i = i`; `a = 0`, `b = 1`;
`c = 0`, `a_j = j`); the translation is by hand and unchecked against
the JavaScript.

Not reused, deliberately: SC1 and PI1/PI2 (instantiation into a P9s
`Cert`), `checkCert`/`HoldsG` (D1/D2 have no counterpart), `Accepts`,
K4-K7, `againstY`, `sameRests`, cube regions (`Cube`, strategy B).

## 8. Acceptance scenarios

Statements in Scenarios.lean; `checkI P σ := cellCheck P (implQ P) σ`.
The "scratch" column is a single `#eval` run of the model outside the
repository. It is evidence for the intended verdict, not a proof.

| scenario | statement | intended verdict | scratch |
|---|---|---|---|
| `route` | `ScRoute`: `routeP = routeSig`, `¬ Accepts routeSig`, `ValidOpen routeP`, and `routeCert` (`u` = cells of `r` without `s`, `v` = with `s`, `w := s`, `x := t`) accepted | accepted; outside `Accepts`, inside `ValidOpen` | accepted (Nat labels and bases) |
| `star` n | `ScStar b`: `cStarCert` (`a_i := {f_i: Int, ...r_i}`, `b_i := {...h}`, `v_i := a_i ⊎ b_i`), every n | accepted at every n, including n = 1, 2, 3 | accepted, n = 0..5 and 64 |
| `divide3` | `ScDivide3`: option C's `sigma3` through `ofProjCert` | accepted, every label list | accepted, m = 0..5 |
| `star-read` n | `ScStarRead b`: plus `w_i := Int`, `c_i := {...r_i, ...h}` | accepted | accepted, n = 0..4 |
| `star-cross` n | `ScStarCross b`: natural certificate refused; `¬ ValidOpen`; every certificate refused | refused | refused, n = 2..5 |
| `intArmP` (rigid type variable) | `ScIntArm`: `β := α` (`rty 0`); `ValidOpen` (N5) | accepted | accepted |
| `dep` k, `divide` m, `divide2` m | `ScDep`: pattern-dependent written witnesses as projections | accepted | accepted, k, m = 0..3 |
| declared split | `ScSplitSig`: `route`'s division | accepted | accepted |
| `disjoint r r` | `ScSelfDisjoint`: `D = [disjoint 0 0]`, `B = [lacks 0 a, {...0} = {}]` | accepted (row 0 is empty) | accepted |
| outside the fragment | `ScOutsideFragment`: `agreeP` and `D = [ff]`, both `ValidOpen` | refused by every certificate: recorded incompleteness | `agreeP` refused |
| certificate validation | `ScCertRefusals`: flexible-row piece, flexible `rty`, ill-formed shadowed binding, unused non-record row binding | each refused | each refused |
| `star-unlacked` n | `ScStarUnlacked`: the star certificate refused; `¬ ValidOpen`; every certificate refused | refused | refused, n = 1..5 |
| `star-undeclared` n | `ScStarUndeclared`: the same (`h`, `r_n` may share a cell) | refused | refused, n = 1..5 |
| `shapeSplit ()` | `ScShapeSplit`: `¬ ValidOpen` (N1) and every certificate refused | refused | not run (universal) |
| undeclared split | `ScSplitFree`: `route`'s division refused (`v disjoint t` meets free cell `[0,1,2]`); `¬ ValidOpen`; every certificate refused | refused | the division refused |
| broken certificate | `ScBroken`: `route` with `u := r` overlapping `v` | refused (the problem is valid) | refused |
| `divide5` (limitation) | `ScDivide5`: for `as ≠ []`, `ValidOpen` (argued in §18.47, unchecked) and every certificate refused | refused: a known limitation, guards deferred | one projection attempt refused; with `as = []` accepted (completeness reviewer), so the premise is needed |

**Why `divide5` cannot pass** (the argument `ScDivide5` states). For a
label `a`, `possW 0 a` holds, so `sameW` requires that some row-0 piece
on the right of `{...r} = {...u, ...t, ...q}` lists `a`. That piece
cannot sit in `u`: `u disjoint s` with `possBoth 0 1 a`. It cannot sit
in `t`: `t disjoint s₂` with `possBoth 0 2 a`. It cannot sit in `q`:
`q lacks a`. Fields cannot stand in for it, because `eqC` never
matches a field against a piece. The choice that would work depends on
which of `s` and `s₂` holds `a` in the pattern. That is a guard on a
written label, which is deferred. Cells do not help, because `a` is
written.

## 9. Restrictions

| restriction | believed harmless because | challenge | status |
|---|---|---|---|
| `D` in `LDFragment`; `cellCheck` false outside | `route`, `star`, `divide3`, `divide5` and all 226 recorded star problems (SC §10.3) are inside; coverage (CV1) and exactness (QR) are established only there; the guard's meaning is CG | `agreeP` (flat equation in `D`) and `D = [ff]` (empty region, vacuously valid): both `ValidOpen`, both refused (`ScOutsideFragment`) | proposed; question 2 |
| `CellShape` as evidence (one direction: occupied cells are free) | `thetaFree` has it (CV1); CM is false without it (`CellShapeNeeded`) | a generic instance from the mgu construction outside the fragment | proposed; question 1 |
| no generic constants, no single-field references in certificates | a certificate is read at every `θs`; on the fragment no written label is ever forced present (QR5), so a field reference could never be defined everywhere | a body reading `r.a` where `D` forces `a`: outside the fragment anyway | by construction; question 4 |
| written labels selected without guards | guards deferred (§18.48) | `divide5`: refused by every certificate | recorded limitation |
| cell selection by lists of cubes; cubes inside one piece may overlap and are never refused | the scenarios need at most one cube per piece | overlapping cubes make `cover` an arbitrary DNF, hence coNP-hard for an exact checker (§6.3) | proposed; question 3 |
| cube literals on non-rigid rows allowed | `(x, false)` always holds and `(x, true)` never does on candidate cells | a solver writing them: harmless (completeness reviewer, scratch) | by construction |
| piece labels and certificate fields at unwritten labels allowed | pieces hold nothing there (`WithinC`); fields there cannot clash with pieces | `{ z: Int }` with `z` unwritten | by construction, as SC |
| `P.rigidRow` not assumed duplicate-free | `cellCands` then holds duplicate sublists, harmlessly (soundness reviewer, brute force); only QX4 and `CheckTautology` assume `Nodup` | duplicates in `rigidRow` | no premise needed |
| pieces and `rty` on rigid variables only; others denote `{}` and are refused | §18.48 asked for validation or a stated meaning; both are given | a solver emitting a piece of a flexible row: Unresolved | by construction |
| equality by source identity | sound at every `θs`; complete where distinct sources are distinct constants (`thetaFree`, argued) | two rows that `D` equates: outside the fragment | proposed |
| a written field never equals a piece's entry | `must` is constant false on the fragment, so the piece is absent in some instance (QR5's second conjunct states it) | none inside the fragment | exact on the fragment, by QR5 |
| shadowed bindings checked too (`certOkC`) | refusal only | an ill-formed unused binding | proposed, as SC |
| row bindings must be records | a non-record row binding denotes `{}`, almost surely a solver error | a row bound to `Int` | proposed, as SC |
| finite values only | `ValidOpen` is defined through `ValidFin` | infinite values | inherited (§18.45) |
| no label-supply premise | B5 needs none; `thetaFree`'s generic instance needs none | a finite `Label` with every label written: still sound | none needed |
| fixed split order in `coverS` | exactness does not depend on it | the cost does | proposed |
| queries injected with `QSound` as premise | CV2 discharges it for `implQ` | a faster implementation must prove its own `QSound` | proposed |

**Novel machinery (ADR 014), flagged for the author's approval:**

- the cube selectors on pieces;
- `CellShape` as an evidence premise;
- the `QSound` contract for injected queries;
- the cell apartness and equality rules (`piecesApart`, `sameCells`).

Composed from published primitives:

- `coverS` is cube subsumption plus Shannon expansion (Boole's
  expansion theorem; Shannon 1949), the textbook tautology check for
  DNF;
- `cellPossS` uses downward closure of independent sets in the
  declared-disjointness graph;
- the hardness remark uses coNP-completeness of DNF tautology (Cook
  1971, via the complement of SAT).

Everything else reuses this repository's model.

## 10. Independent review

Two independent reviewers read the draft (commit 38fc009): one for
soundness, one for completeness. Both worked read-only, with scratch
Lean outside the repository. Neither met a tool denial. Their findings
and the fixes follow. The fixes were re-reviewed (§10.3).

### 10.1 Soundness reviewer

**Verdict: no false, vacuous or unsound statement.** CM and its
corollaries survived every counterexample tried. The reviewer checked
every statement in Statements.lean and Exact.lean, every scenario, and
these odd inputs: shadowed bindings, duplicate fields, overlapping
cubes, same-row pieces on both sides, non-record bindings,
`disjoint r r`, unwritten labels in pieces, duplicates in `rigidRow`,
non-rigid literals, and an asymmetric `Q`. `piecesApart` asks one
orientation, and EvalWf still holds. Nothing trusts the certificate or
a solver. `QSound` is a stated premise, discharged by CV2. No SC or
PI/PC correctness claim is used.

Scratch evidence (not proofs):

- 6,000 random cases of CellPossExact and CoverExact, plus 3,000 of
  CoverTautology, all against enumerated free cells: no mismatch.
- An independent finite semantic oracle at `thetaFree`, over 160,000
  random fragment problems and certificates. 5,570 were accepted, with
  `implQ` or with an asymmetric over-conservative `Q`, and none violated
  the body. The oracle discriminates: 18,385 of 20,000 random
  certificates fail it. It tests `thetaFree` only.
- The §4 `route` example reproduced: `v disjoint x` fails.

| # | finding | fix |
|---|---|---|
| S1 | `CellShape` as an iff is stronger than needed. Only "occupied ⇒ free candidate containing `r`" is used, and the converse excludes valid generic instances | weakened to that direction (Query.lean); §4 updated |
| S2 | CI4 quantified over guarded pieces while `ofProjPiece` dropped the guard | `ofProjPiece` now returns `none` on a guard (CI4′); CI4 requires `guard = []` |
| S3 | §2.2 claimed semantic agreement on written labels with no statement behind it; `ofSchPiece` had none | CI4 and CI4″ now compare written-label presence with `pieceRow` and `SchpieceRow` at `thetaFree`; the table says exactly that |
| S4 | `ScShapeSplit`, `ScSplitFree` lacked their `¬ ValidOpen` conjuncts | added |
| S5 | cost wording: `written P` is recomputed per call; `cellBoth`'s \|K\|² term; `coverS` per node counts literals | §6.1, §6.3 corrected |
| S6 | hardness binds a complete checker only, for unbounded rows; counting needs an exact `cellBoth` | §6.3 qualified |
| S7 | cosmetic: ApartSound's rigidity premise is unnecessary | premise dropped. Not changed: PieceIsSubRow keeps its `WithinC` premise, which its first conjunct needs |

### 10.2 Completeness reviewer

**Verdict:** requirements 2 and 3 fully met. Requirements 1, 4 and 5
are met except as listed below. The reviewer found no wrong verdict;
every stated verdict matched its scratch evaluation. The region queries
are sufficient for the checker as defined: it reads the region only
through `Q`, and every `Q` call is on a row known to be rigid.

| # | finding | fix |
|---|---|---|
| C1 | CM-open's route needs `fragmentS ↔ LDFragment`, stated only in SC2Frag, an unproved `Accepts`-side proposal | CG `FragmentIff` added; listed in CM-open's dependencies and §7 |
| C2 | no statement for `ofSchPiece` | CI4″ `SchPieceDen` |
| C3 | `ofProjPiece` drops guards; CI4 only unfolded `cpieceRow` | as S2, S3 |
| C4 | the necessity of `CellShape` was prose only | `CellShapeNeeded` (ScenariosMore.lean) |
| C5 | hardness claimed for checking, but QX4 is about `coverS`; the soundness-and-exactness qualifier was missing | `CheckTautology` added; §6.3 qualified |
| C6 | no accepting scenario with a rigid type variable | `ScIntArm` |
| C7 | `star-read`, `star-cross` missing | `ScStarRead`, `ScStarCross` |
| C8 | `dep`, `divide`, `divide2` missing | `ScDep` |
| C9 | no positive twin of `ScSplitFree` | `ScSplitSig` |
| C10 | `disjoint r r` (prototype defect 1) untested | `ScSelfDisjoint` |
| C11 | `agreeP`, `D = [ff]` without statements; `ff` row missing in §9 | `ScOutsideFragment`; §9 row extended |
| C12 | rigidity validation and certificate refusals prose only | `ScCertRefusals` |
| C13 | `ScRoute` lacked the boundary facts; `divide3Cert` was a hand copy of `sigma3` | `ScRoute` conjoins `routeP = routeSig`, `¬ Accepts`, `ValidOpen`; `ScDivide3` goes through `ofProjCert (sigma3 as)` |
| C14 | restrictions rows missing: `ff`, CG, unwritten labels, non-rigid literals, overlapping cubes, `rigidRow` duplicates, QR5 citation | §9 rows added or extended |
| C15 | reuse rows missing; the author's sentence not quoted | §7 extended; sentence quoted; re-encodings named |

After the fixes, scratch `#eval` of the new scenarios gives the
intended verdicts. Accepted: divide3 through `ofProjCert`, m = 0..3;
`ScIntArm`; star-read, n = 0..4; dep, divide and divide2 at 0..3; the
declared split; `disjoint r r`; the pinwheel through `checkI`.
Refused: star-cross, n = 2..5; `agreeP`; the four certificate-validation
cases.

### 10.3 Targeted re-review of the fixes (2026-10-21)

Asked for by the author before the first proof tranche (§18.54). One
reviewer, read-only, scratch Lean outside the repository; no tool
denial. **Verdict: the fixes are sound, no blocking finding.** All of
S1-S7 and C1-C14 resolved; C15 partly (a misquote, N2). No reviewed
definition changed (the diff since 0af660e touches only the Cell files
and the import list). `CellOpen` follows from what the tranche proves:
CG, CV1 at `thetaFree`, CM, then B5, whose premise is available there.

Scratch evidence (not repository proofs): `CellShape P (thetaFree P
π)` for every `P` with no fragment premise; `FragmentIff`; CI1's first
conjunct (using `WithinC`); `CellShapeNeeded`'s third and fourth
conjuncts (failing at `disjoint 4 6`, cell `[1, 2]`); `ScRoute` in
full at arbitrary `Label`, `B`; every scenario verdict as intended;
`CheckTautology` on 969 cube lists; a presence oracle over every subset
of free slots (a superset of the region), about 6,150 accepted
certificates, 0 violations, discriminating (1,767 of 1,817 refused
certificates fail somewhere).

| # | finding | resolution |
|---|---|---|
| N1 | CV2 needs the soundness half of QX3 (`CoverExact`'s →), which §18.54 deferred with QX3 | that direction is proved inside the tranche (stream C, proof-plan.md) as a lemma; only QX3's ← stays deferred; no statement changed |
| N2 | §7 misquoted the author | quote corrected |
| N3 | "not re-reviewed" stale | this section |
| N4 | `CellShapeNeeded` alone does not refute CM without `CellShape` | §4 says what else the refutation needs; statement unchanged |

## 11. Questions for the author

1. Approve `CellShape` (occupied cells are free cells containing the
   row) as an evidence premise of CM? It is necessary
   (`CellShapeNeeded`). The alternative is a stronger generic-instance
   notion forbidding entries at unoccupied cells, which would change
   reviewed definitions.
2. Keep the guard at `LDFragment` (as SC), or widen it to `EqFree ∧
   Scoped`, which admits `ff`? Problems with equations in `D` (such as
   `agreeP`) would need a different region analysis. Defer them?
3. For `cover`, which do you prefer: (a) DNF selectors with an
   exponential worst case, as stated; (b) single-cube pieces, where the
   complexity under declarations is open; or (c) a certificate-supplied
   split tree as an untrusted hint?
4. Field references (`r.a` as a value) need `must` and declarations
   that force presence. Defer them with the fragment?
5. Proposed proof order, once approved: CI2, CD1, CD4, CB1, CG, QX1,
   QX2, CV2, CV1, CD2, CB4, CI3 with CD3, CB3, CB2, CM, CM-open, CM-impl;
   then the scenarios and `CellShapeNeeded`, then QX3, QX4,
   `CheckTautology` and QR1-QR5.

**Answered 2026-10-21 (dossier §18.54):** 1, `CellShape` stays an
evidence premise; 2 and 4, guard kept at `LDFragment`, equations in
`D` and field references deferred, `agreeP` recorded as uncertified;
3, multi-cube selectors and `coverS` stay the exact reference, no
split-tree hint adopted, no polynomial coverage promised; 5, the core
soundness order approved after a targeted re-review of §10's fixes,
with `route` and `CellShapeNeeded` in the tranche; QX3, QX4,
`CheckTautology`, QR1-QR5 and other scenarios later.

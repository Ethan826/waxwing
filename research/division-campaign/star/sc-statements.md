# Strategy A's schematic-certificate checker: SC1-SC4, statements first

**Lean names at integration (2026-10-21).** Option C's
ProjectionDefs.lean already declared some of the same names in the same
namespace, so this stream's declarations were renamed when integrated:
`SV` → `SchV`, `SCert` → `SchCert`, `Piece` → `SchPiece`, `InRegion` →
`SchInRegion`, `pieceRow` → `SchpieceRow`. The text below keeps the
original names; no definition or statement changed.

These are statements for the author's review (dossier §18.39, decision
1). **Nothing here is proved.** The Lean files hold definitions and
`def … : Prop` statements only, with no `theorem`, no `sorry` and no
axiom. Strategy B and its statements SB1-SB3 are deferred. Anything
stated over a non-empty cube is marked "for B, deferred".

Files:

- research/composition-proofs/Composition/Sig/SchematicCert.lean holds
  the certificate format, its meaning, instantiation, SC1, and regions
  with the four region queries.
- research/composition-proofs/Composition/Sig/SchematicDefs.lean holds
  SC2's declaration fragment, the checker `checkSym`, and SC2-SC4 with
  optional SC3′.

Both files are computable Lean **research models**. They are not the
prototype's JavaScript, and no correspondence between the two is
claimed. Every measurement and cross-check in report.md concerns the
prototype. The model differs from the prototype in these ways:

- it has a fragment guard (§5);
- `certOkY` checks every binding, including unused ones;
- pieces must lie on rigid rows;
- row bindings must be records;
- `disjoint r r` and unwritten forced labels are handled correctly
  (§10).

## 1. Which acceptance boundary

SC1-SC4 target **P9s's `Accepts`**, the boundary of `checkAll` and the
K theorems (§15, §16). SC4 concludes `Accepts P`, and through the
proved `s1` and `s1_fin` it gets `ValidAll P` and `ValidFin P`. That is
everything SC4 concludes.

SC1-SC4 establish nothing about option B's validity `ValidOpen`
(Typed/Bridge/Valid.lean), or about its characterization
`openCharacterization` (Typed/Bridge/ProofInstantiateSound.lean, at
7f58764). In particular:

- `Accepts` excludes `split` (K8, `splitSig_not_accepts`) and `route`
  (`routeSig_not_accepts`, Sig/SourceBoundary.lean). So no statement
  here can certify either. Dossier §18.47 (at 2cb7c71) places `route` in
  `ValidOpen` (`routeOpen`, ProofExamples.lean at 7f58764), which makes
  it a problem these checkers cannot reach.
- SC4 gives `ValidFin P` at `P`'s own bases. `ValidOpen P` asks for
  `ValidFin` at every injective extension of the bases. Nothing here
  states an implication from `checkSym` or `Accepts` to `ValidOpen`.
  Such an implication would need its own statement and review.
- Like `checkAll`, this is a P9s-based path. It shrinks certificates
  for P9s's rule and does not enlarge the rule (§6). §7 lists what
  would carry over to an option-B counterpart.

## 2. The certificate is untrusted

**What the certificate contains.** An `SCert` holds two finite binding
lists, `ty : List (Nat × SV)` and `row : List (Nat × SV)`. They are the
solver's substitution, written down as data. A schematic value `SV` is
one of these:

- `base b`, where `b : GB` is a base of `B` or a generic constant
  `A r l`, `R r` or `T n`;
- `arrow a c`;
- `record fields pieces`, where `fields : List (Label × SV)` carries
  written labels only, and `pieces : List (Nat × List Label)`. A piece
  `(r, ex)` is the prototype's `{r, ex}`: rigid row `r`'s generic
  contents without the written labels `ex`, rest included.

Rests enter a value only through pieces.

**Nothing assumes the solver is right.** SC3 and SC4 quantify over
every `σ : SCert`. `checkSym` evaluates every atom of the **original
body `P.B`** under `σ`. That includes the binding equations from which
the solver read its bindings, such as `{ f_i: Int, ...r_i } =
{ ...a_i }`. No atom is dropped as solved, and no substituted or
simplified residual is trusted. A binding that does not satisfy its
equation fails that equation.

**Representation shadowing and disjoint composition are separate
notions.**

- *Shadowing* belongs to the representation only. In `ty` and `row`, a
  variable bound twice is read at its first occurrence (`List.lookup`),
  as in `checkAll` (§15.7). `checkSym` **does not reject** duplicate
  bindings. It reads the first one, as `instCert` and `checkCert` do,
  and it also runs `wfY` on the shadowed ones (`certOkY`). That second
  check is conservative. It can refuse a certificate `checkCert` would
  pass. It is a soundness-side choice and not an exactness result: SC3′
  carries `certOkY` as a premise for exactly this reason.
- *Disjoint composition* is a semantic condition on values. Inside any
  record value or record expression, two parts sharing a label make the
  composition undefined. `checkSym` enforces this at every pattern of
  the region (`composeY`/`apartY`, §4.1). Duplicate field labels inside
  a certificate value are refused by `wfY`, because a record value's
  own fields are composed as separate parts. This is not shadowing. A
  record whose parts may clash is refused, never read at a first
  occurrence.

**Rigidity of pieces.** The executable model enforces it:

- `wfY` requires `q.1 ∈ P.rigidRow` for every piece, at every depth, in
  every certificate value. `certOkY` applies `wfY` to every binding.
- Pieces created during evaluation come only from `rowY` on a rigid
  row.

So every piece that `checkSym` reads is on a rigid row. The
denotational side (SC1) is total. It interprets a piece `(r, ex)` on
any identifier as `genRow P π r` minus `ex`. For a non-rigid `r` at a
pattern of `patterns P`, that is just `{ inr r : R r }`, because no
pair in `pairs P` names `r`. SC3 and SC4 never depend on that
interpretation, since `checkSym` refuses such pieces. The prose and
the model agree: pieces on non-rigid rows are refused, which gives an
Unresolved answer.

**Which well-formedness SC3 needs.** SC3 does depend on `certOkY`.
`eqY` is sound only for well-formed values, meaning rigid pieces on
distinct rows that are pairwise declared, at every depth. The soundness
reviewer showed two cases where dropping `certOkY` lets `checkSym`
accept while `checkCert` fails:

- a type variable bound to `{...r0, ...r1}` with no declared pair
  (W3);
- two such values that list their pieces in different orders, which
  `den` reads at different first holders.

Only the part of `certOkY` that covers *unused or shadowed* bindings is
beyond what SC3 needs. That part is there for SC3′.

## 3. Definitions

**Meaning at a pattern π** (SchematicCert.lean):

- `pieceRow P π (r, ex)` is `genRow P π r` without the labels in `ex`;
- `sden` and `sdenRow` give a record's row: its fields' row, then the
  union of its pieces' rows, fields first;
- `sdenRowOf` gives a row binding's row; a non-record binding is `{}`;
- `sdenCert P π σ` is the whole certificate's assignment.

**Instantiation at a finite pattern `p`:**

- `pieceS` lists `(inl l, A r l)` for each written `l` with `(r, l) ∈ p`
  and `l ∉ ex`, then `(inr r, R r)`;
- `inst`, `instFields` and `instRowOf` instantiate values, with fields
  before pieces;
- `instCert P p σ : Cert` instantiates the whole certificate.

**Regions and queries.**

- A cube (`Cube = List (Nat × Label × Bool)`) fixes some bits.
  Strategy A uses `[]`; other cubes are for B, deferred.
- `InRegion P c p := p ∈ patterns P ∧ consistentS P p ∧ agreesS c p`,
  so the region contains the same finite patterns `checkAll` ranges
  over.
- `allowedS P c l hs` holds when `l` is written, every row in `hs` is
  rigid and not forced absent at `l`, and `holdersOK P l hs` holds.
  `holdersOK` (SlicePatterns.lean) reads `disjoint r r` as forbidding
  `r` from holding anything.
- `nonEmptyS` holds when every forced label has an allowed forced set.
- `possibleS r l := nonEmptyS && allowedS l (r :: forced l)`.
- `mustS r l := !nonEmptyS || r ∈ forced l`.
- `possibleBothS r s l := nonEmptyS && allowedS l (r :: s :: forced l)`.

With `c = []`, `nonEmptyS` is true, `mustS` is false, and
`possibleS`/`possibleBothS` only test the singleton and pair holder
sets. The empty pattern is consistent, and so are `[(r, l)]` and
`[(r, l), (s, l)]` whenever they are allowed.

**Fragment** (SchematicDefs.lean). `LDFragment P` holds when every atom
of `D` is either `lacks r l` with `r` rigid, or `disjoint r s` with `r`
and `s` rigid. `fragmentS` is its Boolean form.

**Checker.**

```
checkSym P c σ :=
  fragmentS P && certOkY P c σ &&
    (!nonEmptyS P c || P.B.all (atomY P c σ))
```

Its parts:

- `lackY`: no piece holds `l` anywhere in the region.
- `apartY`: two parts never share a label at any pattern. Field against
  field is compared syntactically, and field against piece through
  `lackY`. Pieces must be on distinct rows that are declared disjoint.
- `composeY`: folds `apartY` over the parts.
- `wfY` and `certOkY`: check certificate values at every depth.
- `tyY` and `rowY`: rigid variables come from the pattern, and any
  binding for them is ignored.
- `evalY` and `evalFY`: evaluate; the result is `none` when some
  composition may be undefined.
- `eqY` and `eqFY`: check equality across the region. Common fields
  are compared recursively. A field written on one side only must meet
  a piece that holds it at every pattern, with exactly that piece's
  constant (`againstY`). The sets of rests must be equal
  (`sameRests`). An unwritten label must be held by the same rows on
  both sides wherever it can be held (`sameY`).
- `atomY`: an equation needs both sides evaluated and `eqY`-equal;
  `lacks` uses `lackY`, `disjoint` uses `apartY`, and `ff` is false.

`checkSym` never calls `possibleBothS`, and neither does the
prototype's `checkAtoms`. The declared `disjoint` that W3 requires for
two rests already rules out a shared label.

## 4. Statements (none proved)

Unless marked otherwise, statements are for strategy A, with the empty
cube.

**SC1, instantiation** (`SC1`). For every `P`, finite `p` and `σ`:

- `den (inst P p s) = sden P (patternOf p) s` for every schematic value
  `s`;
- `denCert (instCert P p σ) = sdenCert P (patternOf p) σ`.

The instantiated ordinary certificate denotes the schematic meaning at
`patternOf p`. That meaning depends on `p` only through `patternOf p`.
K1 gives finiteness. SC3 and SC4 do not use SC1: SC1 explains what the
instantiated certificate means.

**SC2, exact region queries** (`SC2`). For every `P` with
`LDFragment P`, `QueriesExact P []` holds:

- `nonEmptyS P [] = true ↔ ∃ p, InRegion P [] p`;
- `possibleS P [] r l = true ↔ ∃ p, InRegion P [] p ∧ (r, l) ∈ p`;
- `mustS P [] r l = true ↔ ∀ p, InRegion P [] p → (r, l) ∈ p`;
- `possibleBothS P [] r s l = true ↔ ∃ p, InRegion P [] p ∧ (r, l) ∈ p
  ∧ (s, l) ∈ p`.

For A, this claims little. It rests on downward closure to the empty,
singleton and pair patterns. The product property (CP) matters only
for cubes, that is, for B.

**SC2Frag** (`SC2Frag`). For every `P`:

- `fragmentS P = true ↔ LDFragment P`.
- **CP**: for `p ∈ patterns P`, `consistentS P p ↔ ∀ l ∈ written P,
  holdersOK P l (holders of l in p)`.
- **Antitone**: consistency is closed under taking a subset of the
  pairs, that is, under removing a holder.
- **Outside the fragment**: `fragmentS P = false → checkSym P c σ =
  false` for every `c` and `σ`. The answer is Unresolved, never an
  acceptance.

CP and antitonicity are stated for every `P`. In this model they do not
need the fragment, because `consistentS` and `holdersOK` ignore `eq`
and `ff`, and the soundness reviewer's runs confirmed this (§11).

**SC2Real, what the region means** (`SC2Real`). Inside the fragment,
every consistent `p ∈ patterns P` is the presence pattern, on rigid
rows and written labels, of some rigid assignment satisfying `D`. The
converse already holds for every `P`: `consistent_presenceOf`
(Soundness.lean) says a satisfying assignment's presence is consistent.
Together, inside the fragment, the consistent patterns are exactly the
presence patterns of assignments satisfying `D`. **SC2Boundary** and
**SC2Boundary′** show that SC2Real can fail outside the fragment:

- `D = [ff]`: consistent patterns exist, but nothing satisfies `D`;
- `D = [{...r0} = {}]`: the pattern `[(0, 0)]` is consistent, but every
  satisfying assignment leaves row 0 empty.

**SC3, the symbolic check is sound** (`SC3`). For every `P` and every
`σ`, `checkSym P [] σ = true → ∀ p, InRegion P [] p → checkCert P p
(instCert P p σ) = true`.

The proof will need an invariant: under `certOkY`, every value `evalY`
returns has rigid pieces on distinct, pairwise declared rows, at every
depth. `eqY`'s soundness must be stated under that invariant, because
it is false for arbitrary `SV` (§2).

**SC4, acceptance without a table** (`SC4`). For every `P` and `σ`,
`checkSym P [] σ = true → Accepts P ∧ ValidAll P ∧ ValidFin P`. The
argument to formalize, as in `checkAll_accepts`:

1. Take π with `Consistent P π`.
2. K5 (`pattern_cover`) gives `p ∈ patterns P` with `Consistent P
   (patternOf p)` and the same generic assignment.
3. `consistentS_iff` (K2) gives `consistentS P p`, and `agreesS [] p`
   is trivially true, so `InRegion P [] p`.
4. SC3 gives `checkCert P p (instCert P p σ)`.
5. K4 gives `Certifies`.
6. `s1` and `s1_fin` give `ValidAll` and `ValidFin`.

No table is built.

**SC3′, exactness (optional)** (`SC3'`). If `fragmentS P` and
`certOkY P [] σ` hold, and every instantiation in the region passes
`checkCert`, then `checkSym P [] σ`. Both premises are needed:

- without `certOkY`, an ill-formed binding that nothing uses is a
  counterexample;
- without `fragmentS`, `D = [ff]` is one.

**For B, deferred:** `SC2B` (`QueriesExact P c` for every cube) and
`SC3B`. These are written only because the cube-general definitions
cost nothing. They are not proposed now.

### 4.1 Definedness: the fragment against the body checker

The author's split:

- **The declaration fragment** is SC2's scope: `D` holds only `lacks`
  and `disjoint` atoms on declared rigid rows. `Atom` has no separate
  definedness atom. In `D`, the definedness of a declared type appears
  as `disjoint` atoms: two tails in one declared record imply that the
  two rows are disjoint.
- **The body checker still enforces expression definedness** at every
  pattern of the region, and SC3's hypothesis carries it:
  - duplicate written labels: `evalFY` returns `none`;
  - overlapping record parts: `composeY`/`apartY`;
  - nested expressions: `none` propagates through every `bind`;
  - certificate values: `wfY` at every depth;
  - an equation: `atomY` requires both `evalY t` and `evalY u` to be
    `some`. This mirrors `HoldsG`'s two `evalT … = some g` conjuncts.
  - **W3 of the equation's value** (`HoldsG`'s `WFG P g` conjunct, and
    `checkCert`'s `wfS`). `checkSym` makes no separate check for it.
    It must follow from `composeY` requiring declared pieces together
    with `certOkY`. This is part of what SC3's proof has to show
    (the invariant in §4).
- **SC3's conclusion checks definedness per pattern too.** `checkAtom`
  fails an equation whenever `evalS` is `none` at `p`. So SC3 says the
  symbolic definedness checks imply definedness at every pattern of the
  region. No residual simplification is trusted.

The soundness reviewer read the same functions, tested them on
1,048,576 enumerated cases (§11), and found no definedness gap.

## 5. SC2's fragment and the boundary

**The supported declaration fragment is `LDFragment`: every atom of `D`
is `lacks r l` or `disjoint r s` on rigid rows of `P.rigidRow`.**
Outside it, meaning when `D` contains `eq` or `ff` or names a row that
is not rigid, `checkSym` answers false (Unresolved) whatever the
certificate is.

What the guard is for, stated precisely:

- In this model, SC2, CP and antitonicity hold for every `P`, because
  `consistentS` ignores `eq` and `ff`.
- **SC3's and SC4's soundness do not need the guard either.**
  `Accepts`/`Consistent` ignore `eq` and `ff` in the same way. Extra
  patterns only add obligations, and `Accepts → ValidAll` holds
  regardless.
- The guard exists so that the region means what SC2Real says it means,
  and so that product-of-label reasoning about `lacks`/`disjoint` is
  never presented as a claim about arbitrary typed constraints in `D`.
  The author required this. Outside the fragment, an equation in `D`
  can force a row empty without any `lacks` atom (SC2Boundary′), and
  `ff` makes `D` unsatisfiable (SC2Boundary).

The body is not restricted. It may contain any atom, and SC3 covers
all of them.

**Cost of the guard.** The guard is strictly narrower than `checkAll`.
With `D = [ff]` and `B = []`, `checkAll` accepts and `checkSym` refuses.
No recorded input is affected: all 226 problems scanned (§10.3) lie
inside the fragment.

## 6. Relation to K6 and K7

- SC3 and SC4 are **new theorems beside K6**, not replacements.
  `checkAll` stays the reference.
- By K7 (`accepts_iff_checkAll`), whatever `checkSym` accepts, some
  `checkAll` table also accepts. The schematic checker certifies
  nothing a table could not. What it gains is size: one certificate
  against `2^(n(n-1))` entries for `star`.
- By K8 and `routeSig_not_accepts`, it can certify neither `split` nor
  `route`.

## 7. Toward an option-B counterpart, and toward projection pieces

SC1-SC4 stay about `Accepts`. This section only sorts what would carry
over.

**Would transfer to an option-B (Venn-cell) counterpart:**

- the untrusted-certificate discipline: quantify over every
  certificate, re-check the original `P.B`, trust no residual;
- the certificate's shape: bindings of schematic values with pieces,
  read at first occurrence;
- the evaluator's structure (`evalY`, `composeY`, `wfY`), and keeping
  definedness inside the body checker;
- the pattern of SC4: a symbolic check discharges a per-pattern
  obligation without a table;
- the scoping discipline: name the fragment, refuse outside it.

**Would need replacement:**

- The constants and pieces. Option B's generic model (Typed/Model.lean)
  uses labels `Label ⊕ Cell` and constants `X r S` per Venn cell.
  Pieces would range over a rigid row's cells, not its written labels.
- The region. It would be the patterns with `HasInstance P π`. These
  depend on all of `D` and are not given by `consistentS`. Neither
  SC2's exactness nor the fragment's per-label product carries over
  as it stands.
- The per-pattern obligation. `checkCert`/K4 (`HoldsG`, with D1 and D2)
  would be replaced by `SolvableFinAt P θs`: ordinary `Sat` in the
  generic model, with no D1 or D2.
- The target. It would be the `←` direction of `openCharacterization`,
  not `Accepts`.

**θ\*.** Here I follow the author's correction. A computed generic
instance θ\* is needed for an *executable* construction, not for a
*semantic* soundness theorem. An option-B analogue of SC3/SC4 could
take, for each pattern with an instance, a generic instance `θs` and
its evidence (`GenericInst P π θs`, `WithinC P θs`) as premises, and
conclude `SolvableFinAt P θs` from a symbolic check. Then
`openCharacterization`'s `←` direction gives `ValidOpen`. That is a
shape only. It is not stated here.

**Projection pieces (option C, §18.47).** C proposes guard-free pieces
`⟨r, S, rest?⟩`, with `{r, ex}` as a special case. As I read §18.47, my
`(r, ex)` corresponds to keeping `written P ∖ ex` with the rest
included. These definitions would generalise as follows:

- `pieceRow`, `pieceS`, `sden` and `inst` change only in the piece
  case: filter by `S` instead of by "not in `ex`", and make the rest
  optional.
- `lackY`, `sameY` and `againstY` keep reading the region only through
  the four queries.
- `apartY`, `sameRests` and `wfY` change where rests are optional or a
  row appears twice. These are §18.47's four local checker changes. I
  have not redone that work.

## 8. Restrictions table

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| D restricted to `LDFragment`; `checkSym` false outside | every recorded problem lies inside (§10.3); outside, the region loses SC2Real's meaning | `D = [ff]`, `B = []`: `checkAll` accepts, `checkSym` refuses; SC2Boundary, SC2Boundary′ | proposed |
| fields carry written labels only; rests only through pieces | prototype values have this shape; W3 then concerns pieces only | a field `inr r`: not expressible in `SV` | by construction |
| pieces only on rigid rows (`wfY`) | a piece on a flexible row has no generic meaning in A | a solver emitting `{u, ex}`: refused (Unresolved) | proposed |
| row bindings must be records | a non-record row binding means `{}` and is almost certainly a solver error | a row bound to `Int`: refused | proposed |
| bindings of rigid variables ignored | rigid values come from the pattern, as in `rowS`/`tyS` | a binding for `r0`: no effect | by construction, as in `checkCert` |
| shadowed bindings read at first occurrence and also checked (`certOkY`) | refusal only; matches `checkAll`'s reading | an ill-formed shadowed binding: refused while `checkCert` passes | proposed; SC3′'s premise |
| certificate fields at unwritten labels allowed | pieces never hold unwritten labels, so such fields cannot clash | `{ z: Int }` with `z` unwritten | challenge run (reviewer 1) |
| two pieces in one value need a declared `disjoint` | W3 needs it for every value an equation produces | undeclared rows that never share a label: refused; `wfS` refuses them too wherever an equation produces them | proposed |
| a field written on one side against a piece | **exact in A**: the empty pattern is in A's region, and there no piece holds any label, so `checkCert` fails too | `{ a: A r a } = { ...r }` | exact in A (witness `[]`); in B, cubes make `mustS` non-trivial (deferred) |
| `possibleBoth` defined but unused | rests already need `declared` | none | SC2 only |
| empty region passes vacuously | no pattern to certify | A's region is never empty | by construction |

## 9. Non-vacuity

These checks are scratch `#eval` runs of the research model, not proofs.
They ran in an uncommitted file inside the worktree with
`lake -d research/composition-proofs env lean <file>`, and the file was
deleted before commit, as the coordinator directed. `instAll` runs
`checkCert` on the instantiation at every pattern of
`consistentPatterns P`.

| Instance | `checkSym P [] σ` | every instantiation passes |
|---|---|---|
| `star` 1, 2, 3 (1, 4, 64 consistent patterns), the unifier's certificate | true | true |
| `star` 64 | true | not run |
| `star-undeclared` 2 | false | false |
| `star-unlacked` 2 | false | false |
| `star` 2 without `b_1`'s binding (a broken certificate) | false | false |
| `star` 2 with `ff` added to `D` (outside the fragment) | false | n/a |
| `split` with the candidate `u := {r0}` | false | n/a |
| `D = [r1 disjoint r1]`, body `r1 lacks 7` and a closed equation | true | true |

The `star` instances inhabit SC3's and SC4's hypotheses. The invalid
controls and the broken certificate are consistent with SC3: each is
refused, and some instantiation of each fails. `split` is excluded by
K8 together with SC4, not by the single candidate shown. The soundness
reviewer's enumerations (§11) add tens of thousands of cases where
`checkSym` is true.

## 10. Prototype defects (open until impact and corrections are reviewed)

Nothing is corrected here, and the prototype is not edited. The Lean
model avoids both defects.

### 10.1 Defect 1: `disjoint r r` handled as a pair of distinct rows

`disjoint r r ∈ D` means `r` is disjoint from itself, so `r` is empty.
`Consistent`/`consistentS` and P9s's `consistent` (sig-oracle/p9s.mjs)
read it that way. The star prototype does not, in three places:

- region.mjs `allowed` skips pairs with equal holders, and never
  compares a single holder with itself;
- generic.mjs `holderSets`, which is E's enumerator and the
  cross-check's instantiation enumerator, never consults the self pair;
- generic.mjs `consistentCount` explicitly filters `a[1] === a[2]`.

**Minimal failing example.** `rigidRows [0]`, `D = [disjoint 0 0]`,
`B = [lacks 0 a]`, run against the unmodified prototype:

| query | prototype | correct |
|---|---|---|
| `possible(0, a)`, `possibleBoth(0, 0, a)` | true | false |
| `holderSets(P, a)` | `[[], [0]]` | `[[]]` |
| `consistentCount` (log2) | 1 | 0 |
| `nonEmpty` with a cube forcing `(0, a)` | true | false |
| E | Unresolved ("no certificate") | valid |
| A | Unresolved ("row 0 may hold a") | valid |
| B | Unresolved ("no certificate: row 0 may hold a") | valid |

"Valid" means in `Accepts`: the only consistent pattern is empty.

**False acceptance: none possible.** The defect only makes the
prototype more permissive:

- `allowed` errs toward true, so `possible`, `possibleBoth` and
  `nonEmpty` can be wrongly true but never wrongly false;
- schematic.mjs uses `possible` only to fail;
- a wrong `nonEmpty` only removes a vacuous pass;
- E's enumerator adds inconsistent patterns, which are extra
  obligations;
- the overcount only feeds E's budget cut-off (`log2 > patternsLog2`
  gives Unresolved) and crosscheck's "> 2^16" skip.

**False refusal: yes.** All three strategies refuse the example above.
B may also split more than it needs to.

### 10.2 Defect 2: `nonEmpty` does not check that forced labels are written

region.mjs `nonEmpty` calls `allowed` on the forced holders, and
`allowed` does not check `index.labels.has(l)`. `possible` and
`possibleBoth` check it; `nonEmpty` does not. Patterns hold written
labels only, so a cube that forces `(r, z)` with `z` unwritten has an
empty region.

**Minimal failing example.** `rigidRows [0]`, `D = []`, labels `[a]`,
cube `{(0, z): true}`. The prototype gives `nonEmpty = true` (and
`must(0, z) = true`). The correct answer is false. The region is empty,
so every answer is vacuously sound.

**False acceptance: none possible.** As in §10.1, the defect only turns
an empty region into a non-empty one. B's `certAt` never takes a
branch that forces `z`.

**False refusal: in B only.** A leaf over an empty region could fail
and split, or give Unresolved.

- A's empty cube forces nothing.
- E builds full cubes in `searchAt` but never passes them to `nonEmpty`
  or `checkAtoms`.

That scope does not by itself show the historical runs were unaffected,
so they were checked (§10.3).

### 10.3 Which historical results used the faulty behaviour

These checks used a scratch script, run against the unmodified
prototype and deleted before commit. The completeness reviewer
reproduced the first scan independently.

- **Defect 1.** I scanned the `D` of every recorded input:
  - the 23 sig-oracle challenges;
  - the 12 source-boundary problems;
  - every family at every size measure.mjs lists (`star` families to
    32768, `dep` to 128, `divide*` to 16), plus `route`.

  That is 226 problems. **None has `disjoint r r` in `D`**, and all lie
  inside `LDFragment`. The challenge `self-disjoint` has `D = []`; its
  `disjoint 3 0` is in the body. **No recorded measurement,
  cross-check verdict or pattern count went through defect 1.** Had any
  input contained such an atom, crosscheck's "P9s pattern count against
  E" section would have flagged it, but it compares only the `star`
  families.
- **Defect 2.** I reran B on:
  - every regression problem;
  - every family at the cross-check sizes;
  - every measured size up to 64 for the `star` families;
  - every measured size for `dep`, `divide`, `divide2` and `divide3`
    (65,536 leaves at `divide3` 16).

  I then walked every tree that was returned: 2,505,538 cube entries,
  **none forcing an unwritten label**.

  Two gaps remain:
  - B runs that end Unresolved return no tree, so their cubes were not
    walked;
  - B's `star` measurements above 64 were not rerun, because no large
    runs were allowed.

  Both gaps rest on a reading of the code. B's split bits come from
  failure reports, and each report except `writtenAgainst` passes
  through `possible`, which checks `labels.has(l)`. `writtenAgainst`
  reports a field label of a value. Field labels come from the body,
  where they are written, or from certificate values. As I read
  unify.mjs, its values take their field labels from fields matched in
  the body; I did not verify this exhaustively. An Unresolved B run is
  not an acceptance in any case. **No recorded acceptance can come
  from defect 2.**

### 10.4 After a correction: regression checks and reruns

**Focused checks** (new and small):

1. `possible(region([]), r, l)` and `possibleBoth` are false when
   `D ∋ disjoint r r`. `holderSets` excludes `r`.
2. `nonEmpty` is false when a cube forces `(r, l)` and
   `disjoint r r ∈ D`, and also when it forces an unwritten label. In
   both cases `checkAtoms` returns `vacuous: true`.
3. `consistentCount` equals the length of `consistentPatterns` and
   P9s's `patterns` count on §10.1's example, and on a two-row case
   that takes the `free` path.
4. E, A and B answer valid on §10.1's example.
5. A property test of the four queries against brute-force enumeration
   with P9s's `patterns`, over random small `D` and random cubes. `D`
   should include self-disjoint atoms and flexible rows, and cubes
   should include unwritten labels and contradictory bits.
6. Controls: `star` 2 and `divide3` 2 stay valid in E, A and B.

**Reruns** (small; no performance runs):

- `node research/division-campaign/star/crosscheck.mjs`. Compare the
  output line by line with results/crosscheck.txt: it should show 0
  flagged and the same verdicts. It includes the oracle's 120 s
  timeout on `star-read` 3, so it takes a few minutes.
- measure.mjs needs no rerun for these defects. No measured input
  triggers defect 1, and defect 2 cannot affect A. If a correction
  changes `allowed`'s cost, any measurement rerun would be a separate,
  approved step.

## 11. Independent review

Two reviewers worked independently and edited nothing. Their findings
and my changes are below.

### 11.1 Soundness reviewer

The reviewer argued each statement by hand and ran brute-force `#eval`
checks in scratch, within a stated grammar:

- **SC3 and SC3′.** Problems with rigid rows 0 and 1, rigid type
  variable 6, flexible row 2 and flexible type variable 5. `D` was
  every subset of {lacks 0 0, disjoint 0 1, disjoint 1 1}, with one
  body equation from 16×16 expressions and 16 values per variable.
  1,048,576 cases, 34,624 with `checkSym` true, and 0 failures.
- **SC3B and SC3′ over cubes** (for B, deferred). 4,718,592 cases, 0
  failures.
- **QueriesExact, CP and antitone, every cube.** `D` over subsets of
  {lacks 0 0, lacks 1 1, disjoint 0 1, disjoint 1 1, disjoint 0 0,
  lacks 2 0, ff}, rigid rows [0,1] and [0,1,0], and 343 cubes,
  including contradictory cubes, unwritten labels and flexible rows.
  87,808 (P, c) pairs, 0 failures.

There was no false, vacuous or mis-quantified Lean statement, and
nothing trusts the solver. Findings and fixes:

1. **False prose claim:** "SC3 does not need `certOkY`". Without
   `certOkY`, a W3 case and an `eqY` case are accepted while
   `checkCert` fails (§2). **Fixed:** §2 and §8 now say SC3 needs `wfY`
   on every binding `evalY` reaches, and §4 records the invariant that
   SC3's proof needs.
2. **Minor:** CP and antitone do not need `LDFragment`. **Fixed:** the
   premise is dropped from those clauses of SC2Frag, with a note.
3. **Minor:** SC2Real is one direction, while the prose said "exactly".
   **Fixed:** the proved converse `consistent_presenceOf` is cited.
4. **Minor:** the boundary had no witness for an equation in `D`.
   **Fixed:** `SC2Boundary′` added.

Confirmed: SC1; SC2 for A (the witnesses `[]`, `[(r,l)]` and
`[(r,l),(s,l)]`); SC2B; SC2Frag; SC2Real; both boundaries; SC3's layout
argument (key disjointness makes the two list orders denote the same
value); SC4's route through K5, K2, SC3 and K4; SC3′ with both premises
necessary; no trust in the solver.

### 11.2 Completeness reviewer

The reviewer met a worktree-guard denial on one compound command,
stopped, and quoted it:

> "This agent is isolated in the worktree
> /Users/ethan/Desktop/waxwing/.claude/worktrees/agent-a1f1a0dee0f0f4595,
> but this command uses a subshell in a command inside a construct too
> complex to verify, so it is too complex to verify that it stays
> inside the worktree. Refusing to run it — a worktree-isolated agent's
> git operations must target its own worktree. Split it into plain,
> separate commands and run them from
> /Users/ethan/Desktop/waxwing/.claude/worktrees/agent-a1f1a0dee0f0f4595."

The reviewer reproduced the 226-problem scan and both minimal defect
examples. It did not rerun the B cube walk. All requirements were met
or largely met. Findings and fixes:

- §5's guard rationale: **fixed**. SC3 and SC4 soundness do not need
  the guard; it serves SC2Real and the author's scoping.
- "Exactly": **fixed** with the converse citation.
- SC2 claims little for A, and CP matters only for B: **added** to §4.
- `WFG` conjunct missing from §4.1: **added** as an SC3 proof
  obligation.
- SC4 sketch should name `consistentS_iff`: **added**.
- `route` should cite the proved `routeSig_not_accepts`, not the
  measurements: **fixed**. The hedge on `routeOpen` is replaced by
  §18.47's statement.
- Restrictions table: **revised**. Field against piece is reclassified
  as exact in A, rows for non-record row bindings, rigid-variable
  bindings, unwritten field labels and the guard are added, and the
  Status column now gives a status.
- The scratch files existed when the reviewer looked. **Resolved**:
  they are deleted before commit, as the coordinator directed. Whether
  to commit them as fixtures is now question 4.
- "Inhabit the contrapositive": **reworded** to "consistent with SC3".
- Defect corrections: **applied**. E's cause, `consistentCount`, the
  budget and skip paths, the crosscheck count section, E's unused
  cubes, the unify.mjs dependence, and the extra regression checks.
- "Reviewer 1 checked" before the review was recorded: **replaced**.
- Model against prototype differences: **listed** at the top.
- "Fails" changed to "can fail".

## 12. Questions for the author

1. Approve or amend SC1, SC2 (with SC2Frag, SC2Real, SC2Boundary and
   SC2Boundary′), SC3 and SC4. Should optional SC3′ join the tranche?
2. SC2's queries are exact for every `P`, and soundness does not need
   the guard. Keep `LDFragment` as SC2's named scope and as the guard,
   as now? Or keep the fragment only in SC2Real and the guard?
3. Defects 1 and 2: who corrects the prototype, and is §10.4's list
   sufficient? Should the prototype also gain the guard and `certOkY`,
   so that the A being measured is the A being proved?
4. Should the scratch `#eval` checks (the `star` instances, the
   controls, `disjoint r r`) and the defect examples become committed
   fixtures? An example Lean file and star/defects.mjs, with run
   commands, would back §9 and §10 with checks.
5. Projection pieces (§18.47): should SC1-SC4 be restated over the
   general piece `⟨r, S, rest?⟩` before proof, so that only one set is
   proved?

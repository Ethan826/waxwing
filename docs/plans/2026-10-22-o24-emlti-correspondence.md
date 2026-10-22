# O24: Waxwing's row model against EMLTI's model conditions

Written 2026-10-22 at the author's request, after the forwarded external
review (issue 1: "O24 must address partial record composition"). It
covers one matrix row, O24, of
docs/plans/2026-10-22-inference-foundations-assessment.md §11, with the
companion docs/plans/2026-10-22-inference-foundations-extension.md §1.2
and §1.4. It changes no compiler code, adds no Lean proof and runs no
prototype. Every lemma statement below is proposed. §3 was revised
after one statement review (§8), which found the first GI-Open false
as stated. The author answered the revision's questions (§3.4; dossier
§18.70; recorded in §9), and §3 now proposes a refined model X_W(B, i)
for statement review. The revised statements are unproved. The
model-condition checks in §1 and §2 are argued.

The question: can Waxwing's row model be presented as a model X of
Pottier and Rémy's *The Essence of ML Type Inference* (EMLTI, ATTAPL
ch. 10), so that EMLTI's HM(X) results apply? And does EMLTI's
ground-instance inclusion coincide with `ValidOpen`?

**Statuses** are the matrix's: proved (a Lean-checked Waxwing theorem,
under its premises), argued, experimentally checked, proposed,
unresolved. A published result is cited and never makes a Waxwing claim
proved. Page numbers are EMLTI's printed pages (PDF page + 388). Lean
paths are under research/composition-proofs/Composition/.

## 1. What EMLTI requires of a model, and what Waxwing's model meets

**Definition 10.2.5 (printed p. 411), transcribed.** "For every kind κ,
let 𝓜κ be a nonempty set, whose elements are called the *ground types*
of kind κ. [...] For every type constructor F of signature K ⇒ κ, let F
denote a total function from 𝓜K into 𝓜κ [...]. For every predicate
symbol P of signature κ1 ⊗ ... ⊗ κn ⇒ ·, let P denote a predicate on
𝓜κ1 × ... × 𝓜κn. For every kind κ, we require the predicate =κ to be
equality on 𝓜κ and the predicate ≤κ to be a partial order on 𝓜κ."

Other conditions the chapter places on X:

- *Constructors have finite arity* in the type syntax (p. 401, after
  Definition 10.1.14 on p. 400); only §10.8's model signature has denumerable
  arity.
- *Ground assignments are total and homomorphic* (Definition 10.2.10,
  p. 413): φ(F T1 ... Tn) = F(φ(T1), ..., φ(Tn)). This is where
  totality is used, because every type term must denote.
- *Schemes denote upward-closed sets of ground types* (Fig. 10-5,
  p. 414): (φ, ψ)(∀X̄[C].T) = ↑{φ[X̄ ↦ t̄](T) ; φ[X̄ ↦ t̄], ψ ⊨ C}.
  Predicates are read through CM-Predicate.
- *Entailment is over one fixed model* (Definition 10.2.11, p. 415):
  C1 ⊩ C2 when every φ, ψ satisfying C1 satisfies C2. The parameter X is
  "arbitrary, but fixed" (p. 413).
- *C-Arrow* (p. 416): T1 → T2 ≤ T1′ → T2′ ≡ T1′ ≤ T1 ∧ T2 ≤ T2′, "up to
  the designer of the model". → must be *isolated* (p. 416), that is,
  incompatible with every other isolated constructor.
- *Determinacy* (Definition 10.2.14, p. 417) is a semantic property of
  a constraint and a model, used by C-LetAll (Fig. 10-6, p. 418).
- *Open world.* Odersky et al.'s axiomatic approach "allows dealing
  with other logical interpretations, such as 'open-world'
  interpretations, where constraints are interpreted not within a fixed
  model, but within a family of extensions of a 'current' model". EMLTI
  avoids this; the changes "would not be extensive" (p. 423).
- *Theorems 10.4.4 (soundness) and 10.4.8 (completeness)* of
  constraint generation (p. 433-434) are stated for any X. 10.4.8
  assumes C ⊩ ∃Γ and fpi(C, Γ) = ∅.

**The row section's own answer to duplicate labels.** In Rémy's
approach "every row denotes an infinite (in fact, cofinite) mapping
from labels to types"; `abs` and `pre` encode domains in field types,
and a duplicate label "is ruled out by the kind system" (p. 487). Row
kinds Row(L) record the labels a row does not define, and row extension
ℓ^{κ,L} needs ℓ ∉ L (Definition 10.8.3, p. 467). Each row constructor
then denotes a total function (Definition 10.8.10, p. 472). EMLTI's
rows have no concatenation. For predicate-based alternatives it cites
Berthomieu's =L (row equality outside L), Gaster and Jones's `lacks`,
Ohori's `has`, Sulzmann's "new, ad hoc constraint forms" for extension
and concatenation (p. 488-489), and Pottier (2003), whose rows exist
only in constraints, as ≤L (p. 489). Of these, only EMLTI's descriptions
were read.

**Waxwing's model (Syntax.lean, Rows.lean, Compose.lean,
Sig/Finite.lean, Typed/Bridge/Valid.lean).** Ground types `G` are
bases, arrows and records over rows `Label → Option G`. `compose r s`
is `some (union r s)` only when `Disjoint r s`. A record type `{ l: t,
...r, ...s }` denotes `composeAll` of its fields and tails. An `eq`
atom needs both sides defined (`Holds`); `lacks` and `disjoint` read
the row directly. `ValidFin` quantifies over finite rigid values and
finite flexible witnesses. `ValidOpen` is `ValidFin` at every injective
base extension `i : B → B₁`; labels are a fixed type, never extended.

| Requirement | Waxwing model, identified directly | Status |
|---|---|---|
| Nonempty carriers per kind (★, row) | `emptyG`, `Row.empty` | argued |
| Constructors denote total functions | base, arrow and record over a row are total; `compose`, and `evalF` on written fields with a repeated label, are partial. ⊎ cannot be a type constructor | fails (argued) |
| Finite arity in type syntax | `TExpr.record` has finitely many fields and tails | argued |
| `=` is equality, `≤` a partial order | no subtyping: an equality model (Example 10.2.8, p. 412) | argued |
| C-Arrow, → isolated | `G.arrow` is an injective constructor distinct from `base` and `record` | argued |
| One fixed model | `ValidOpen` ranges over all injective base extensions | needs encoding (§3) |
| Infinite labels | rows over a fixed `Label`; `ValidFin` uses finite rows only, unlike Rémy's cofinite rows | needs a carrier choice |
| Field types | any `G`; no `pre`/`abs` | argued (none ↔ `abs`, §2c) |
| Rigid vs flexible | no such distinction in EMLTI: rigid = free on the left of ⊩, flexible = ∃ on the right | argued (§3, V) |
| `lacks`, `disjoint` | predicates of arity 1 and 2; Definition 10.2.5 allows any relation | argued |

## 2. Three candidate encodings

### (a) Composition as a predicate; constructors stay total

The model X_W(B) has the following components.

- *Kinds:* ★ and row.
- *Carriers:* 𝓜★ = { g : G Label B | FinG g } and 𝓜row = { f | FinG
  (.record f) }.
- *Constructors, all total on these carriers:* `base b` (each b ∈ B),
  `→`, Π : row ⇒ ★ (`G.record`), `∅` : row, and `single_ℓ` : ★ ⇒ row
  for each ℓ.
- *Predicates:* =★, =row, ≤ := =, and one ternary predicate U(t, r, s)
  :⟺ Disjoint r s ∧ t = union r s.

`disjoint r s` becomes ∃t. U(t, r, s), and `r lacks {ℓ}` becomes ∃X t.
U(t, r, single_ℓ X); the second uses 𝓜★ ≠ ∅. A record type
`{ ℓ1: t1, ..., ...r1, ... }` is flattened to Π ρ under ∃ρ̄ and a chain
of U atoms over the singles and tails. ⊎ never appears in a type term.

- *EMLTI results that apply:* Theorems 10.4.4 and 10.4.8 at X_W(B),
  for each B. Record operations enter as constants of Γ0 with
  U-constrained schemes, for example ∀r s t[U(t, r, s)]. Π r → Π s →
  Π t. Definition 10.2.14 and C-LetAll apply, since both are semantic.
  U(t, r, s) determines t from r, s, and s from t, r: cancellation,
  which is case B of companion §1.3 (argued).
- *To prove (statements M0, T1, T2, V in §3).* X_W(B) satisfies
  Definition 10.2.5 and C-Arrow, and the translation preserves `Holds`
  and `ValidFin`.
- *What breaks.* Schemes are no longer type-shaped: σ_inf of companion
  §1.2 becomes ∀u t q s s2 ρ[U3(ρ; u, t, q) ∧ D].(Π ρ, Π s, Π s2) →
  Unit, so a flattening lemma (F) is needed before exported L0 schemes
  can be read as EMLTI schemes. EMLTI's solver (§10.6) and its row laws
  do not cover U. The remark on p. 422 that every satisfiable
  constraint has a most general unifier belongs to that section's
  solved forms. It does not transfer: case B already has two
  incomparable unifiers (O4), and U(ρ, a, b) ∧ U(ρ, w1, w2) leaves w1
  and w2 undetermined (O17). Principal *types* in L0 (O4, O11) are
  untouched.
- *Separating example (identification vs (a)).* Read as a constructor,
  r ⊎ s has no value at r = s = single_ℓ Int, so the type Π(r ⊎ s) →
  Unit has no denotation there and Definition 10.2.10 fails. Under (a),
  ∃ρ. U(ρ, r, s) ∧ X = Π ρ → Unit is false at that assignment.
  That is Waxwing's own `Holds (.eq ...)` reading.

### (b) Totalize with an error element and a definedness predicate

Add junk to the carriers and make ⊎ a total constructor. The two
variants fail in different ways.

- *(b1) Strict ⊥.* 𝓜κ ∪ {⊥κ}, with every constructor strict. C-Arrow
  fails: ⊥ → Int = ⊥ = ⊥ → Bool while Int ≠ Bool. EMLTI requires
  C-Arrow (p. 416), so (b1) is not an EMLTI model; that failure alone
  settles (b1). Isolation fails too, but only if Π is declared
  isolated: then → and Π are no longer incompatible (⊥ → X = ⊥ = Π ⊥).
  EMLTI requires only isolated constructors to be pairwise
  incompatible, and → stays incompatible with the nullary `base b`.
- *(b2) Inert junk.* ⊥row is an ordinary row element, or Rémy-style
  per-label flags `abs | pre g | clash` with ⊎ total label by label.
  C-Arrow survives. Every Waxwing `eq` must then become T = T′ ∧ Def(T),
  with Def meaning no junk at any depth, and every scheme needs Def
  guards. Without them, ground instances contain junk: ∀r s.Π(r ⊎ s) →
  Unit has the instance Π ⊥ → Unit, which no Waxwing value inhabits.
  So ground inclusion at the totalized model differs from Waxwing's.
  Cancellation also fails at junk: r ⊎ s = ⊥ determines neither r nor
  s. Determinacy (Definition 10.2.14) therefore holds only under Def.
- *What it would buy:* type-shaped schemes, with no flattening lemma.
- *Must prove:* (J) every ground instance of a Def-guarded scheme is
  junk-free, and every Waxwing problem's translation carries enough
  guards. Def is an invented predicate with no published source read
  here.

### (c) Rémy's rows (EMLTI §10.8) as the carrier presentation

Present a Waxwing row as a complete Rémy row over field types {abs, pre
T}, with `none` ↔ abs. On finitely supported rows this is a bijection
(argued). `r lacks {ℓ}` becomes the ordinary row equation ∃R. r = (ℓ :
abs ; R), so no new predicate is needed, and EMLTI's row laws
(Lemmas 10.8.16 and 10.8.18, with C-Row-LL and C-Row-DL; read in a
text extraction only) become citable for the composition-free fragment.

- *What breaks.* Composition stays partial (pre/pre), so (c) does not
  stand alone: it needs (a)'s U, or (b)'s guards, for ⊎. EMLTI's model
  is a regular tree model, and ∂(pre Int) denotes an infinite row.
  Waxwing's `ValidFin` uses finite rows; `ValidAll` (all partial maps)
  is the other semantics, and neither is derived from the other
  (Sig/Finite.lean). Restricting the carrier to cofinitely-abs rows
  makes ∂ partial except at abs, so ∂ (except ∂abs) and the lifted
  G^{Row(L)} must be dropped. Row kinds Row(L) are static label sets.
  They cannot express r # s between two row variables whose domains are
  both unknown.
- *Separating example.* Over Rémy's carrier the constraint X = ∂(pre
  Int) is satisfiable. Over Waxwing's finite carrier no finite row
  equals it, so carrier choice changes satisfiability.

## 3. Ground inclusion against `ValidOpen`

All statements here are **proposed**: statements only, none proved,
none in Lean. They were revised on 2026-10-22 after a statement review
(§8). §3.1 records why the first GI-Open and GI-Atoms were false as
stated; §3.2 gives the revised statements; §3.3 proposes a proof
tranche, which is not authorized; §3.4 lists the questions the
revision left for the author, with the author's answers (§18.70).
Fix X_W(B) from (a); §3.2 refines it to X_W(B, i). ⟦·⟧ translates
`TExpr`, atoms and problems, with fresh ∃-bound auxiliary variables
for intermediate rows.

### 3.1 Counterexamples to the first statements

**Verdict: the first GI-Open and the first GI-Atoms biconditional are
false as stated**, the latter whether or not B1b holds. In both, the
direction "inclusion → `ValidOpen` P(σ2 ≤ σ1)" fails, where
P(σ2 ≤ σ1) had rigid = X̄2, D = C2 and body C1 ∧ eq(T1, T2).
Counterexamples 1 and 2 refute it; neither refutes the other
direction. Counterexample 3 refutes M0 as stated for uncountable B or
`Label`. Each was checked by hand here against the Lean definitions
(`evalT`, `evalF`, `Holds`, `Sat` in Syntax.lean; `SigProblem`,
`combine`, `Scoped` in Sig/Validity.lean; `FinG`, `FinAssign`,
`ValidFin` in Sig/Finite.lean; `ValidOpen` in Typed/Bridge/Valid.lean)
and, for 3, against the rendered p. 400. None is in Lean. Variable
indices are `Nat`s.

1. **Shared variable names.** σ1 = ∀[ty 0].tvar 0 and σ2 =
   ∀[ty 0].Int, with Int some b ∈ B. P(σ2 ≤ σ1) = ⟨[0], [], [], [eq
   (tvar 0) Int]⟩ is `Scoped`, since D is empty. Take θR.ty 0 =
   `emptyG`, which is finite. `combine` reads type variable 0 from θR,
   so the `eq` atom needs `emptyG` = Int and fails for every θF.
   `ValidFin` fails at i = id, so `ValidOpen` fails. Ground inclusion
   holds at every X_W(B₁): σ2's only instance is Int, and σ1's
   instances are all of 𝓜★. Cause: GI needs X̄1 # X̄2, but neither
   P(·) nor GI-Open renamed the schemes apart.
2. **σ2's type undefined; definedness in the body.** σ2 = ∀ rows 0, 1.
   {...0, ...1} (`TExpr.record .nil [0, 1]`, no constraint), and σ1
   the same over rows 2, 3. P = ⟨[], [0, 1], [], [eq {...2, ...3}
   {...0, ...1}]⟩ is `Scoped`. Take θR.row 0 = θR.row 1 = `single` ℓ
   `emptyG` for some label ℓ: both finite. `composeAll` meets
   overlapping rows, so the right side's `evalT` is `none` whatever
   θF is, and `Holds eq` fails. `ValidFin` and `ValidOpen` fail, even
   though σ1 is σ2 renamed. Read through F, both schemes have the
   instances {Π(r ∪ s) | r # s, both finite}, so inclusion holds.
   Cause: P put T2's definedness in the body, inside eq(T1, T2),
   while F's instance set takes it from the scheme's own constraint.
   - Waxwing can write this σ2's type: a parameter or result type
     that writes two tails into one record joins them, with no
     `disjoint` clause (language.md, the Tranche B paragraph after
     the empty record). W3 (`WFRow`, Sig/Generic.lean:59: two rigid
     rows' rests in one row are declared disjoint in D) does not hold
     for the raw scheme, so results assuming W3 do not cover it.
   - *Qualification (author, §18.70).* The raw scheme is a valid
     model-level counterexample: `Scheme` admits it, and `ind` must
     handle it. Source Waxwing, though, does not produce it. Sig7
     (research/division-campaign/r0/recorder-rules.md §3.1, stream
     T-R0b; recorder-spec row A4) puts `disjoint r s` (origin types)
     into D for each pair in `f.joined`. `f.joined` (`joinedPairs`,
     Features/Resolve/Apart.purs:176) lists every pair of the
     declaration's own record row variables that its parameter,
     result or effect-row types write as tails of one record, at any
     depth, including pairs that a named type's record arguments
     write into one record; a tail written twice is refused earlier
     (`RepeatedTail`). So a signature `{ ...r, ...s }` with no `where`
     clause still has `disjoint r s` in its recorded D. Omitting the
     clause does not omit the generated assumption, and the recorded
     problem meets W3 (argued from the rules table and the code
     cited; not checked against a recorded problem).
   - σ2 = ∀[].{a: Int, a: Int} fails the same way. `evalF` is
     undefined on the repeated label, so σ2 has no instances and
     inclusion holds vacuously, yet the body's `eq` never holds.
     `TExpr` admits this type; the surface rejects it.
   - Case A is unaffected: each of σ_w's records has one tail and no
     fields, so its type is always defined.
3. **Countability.** Definition 10.1.14 (p. 400, rendered page read):
   "Let F range over a finite or denumerable set of type
   constructors". X_W(B) has one `base b` per b ∈ B and one `single_ℓ`
   per ℓ ∈ `Label`, so it is an EMLTI model only when B and `Label`
   are countable. `ValidOpen` ranges over every `B₁ : Type`,
   uncountable ones included, so the first GI-Open's "X_W(B₁) is an
   ordinary fixed model" fails for those B₁. §3.2's X_W(B, i) is the
   proposed repair: its constructors are indexed by B, not B₁.

The reviewer also searched for counterexamples to T1, T2, V and GI and
found none: duplicate labels and tails, empty rows, `disjoint r r`,
`lacks` (which needs 𝓜★ ≠ ∅), empty B, finite and infinite `Label`,
rigid variables absent from D or B, record-valued fields and nested
spreads. That search was not repeated here.

### 3.2 Revised statements

**Shared definitions.**

- **Variables.** Waxwing numbers type variables and row variables in
  two separate `Nat` namespaces (`Assign.ty` and `Assign.row`,
  Syntax.lean:42-44). ⟦·⟧ maps type variable n to X_n of kind ★
  (`tvar n`) and row variable n to ρ_n of kind row (record tails,
  `lacks`, `disjoint`). Auxiliary variables are tagged with their
  position in the term (kinded variables `Nat ⊕ AuxTag`, tags kept
  disjoint by kind), so they are apart from *every* original
  variable, not only from those of the term at hand. An `Assign` is
  total. A θ with `FinAssign θ` (Sig/Finite.lean:38) is read as φ_θ
  with φ_θ(X_n) = θ.ty n ∈ 𝓜★ and φ_θ(ρ_n) = θ.row n ∈ 𝓜row; φ_θ ⊕ ȳ
  also sets the auxiliary variables to ȳ.
- **Schemes.** `Scheme := ⟨ty row : List Nat, C : Problem, T :
  TExpr⟩`, its bound variables, constraint and type.
- `Closed σ := tyVarsOf (σ.C ++ [eq σ.T σ.T]) ⊆ σ.ty ∧ rowVarsOf (σ.C
  ++ [eq σ.T σ.T]) ⊆ σ.row`.
- `Apart σ1 σ2`: their `ty` lists are disjoint, and their `row` lists
  are disjoint.
- `GW σ := {g | ∃ θ, FinAssign θ ∧ Sat θ σ.C ∧ evalT θ σ.T = some g}`,
  the scheme's instances read through `evalT`.
- `flatten σ := ∀(σ's variables ∪ aux(σ.T))[⟦σ.C⟧ ∧ C_T].T_T`, an
  EMLTI scheme.
- `ind σ2 σ1 := ⟨σ2.ty, σ2.row, σ2.C ++ [eq σ2.T σ2.T], σ1.C ++ [eq
  σ1.T σ2.T]⟩` replaces P(σ2 ≤ σ1). Every variable outside σ2's lists
  is flexible. The added `eq σ2.T σ2.T` holds exactly when σ2's type
  is defined (option A of §3.4 Q1, adopted). `Scoped (ind σ2 σ1)`
  follows from `Closed σ2`.
- **Vacuous inclusion and the separate checks.** If σ2 has no finite
  instance (C2 unsatisfiable, or σ2's type undefined wherever C2
  holds), `ind σ2 σ1`'s D holds at no finite rigid θ, so `ValidOpen
  (ind σ2 σ1)` holds for every σ1. That is correct ground inclusion
  (∅ ⊆ anything), and it must not make an invalid declaration
  acceptable. So declaration well-formedness and satisfiability are
  checked separately, never inferred from inclusion (§18.70 Q1).
  Where each lives:
  - *Satisfiability of D.* Sig4-Sig8 (recorder-rules.md §3.1) put
    only `lacks` and `disjoint` atoms into D, so a source D is
    `ClauseOnly` (argued from the rules table), and
    `clauseOnly_satisfiable` (Sig/SourceCampaign.lean:82, proved)
    gives a finite θ satisfying it.
  - *Definedness of the signature type under D* (**WF-Sig**,
    proposed): for every recorded declaration f with problem P_f
    and signature type T_f, ∀ θ, `FinAssign θ` → `Sat θ P_f.D` → ∃
    g, `evalT θ T_f = some g`. It is an obligation on R0 and the
    recorder: the surface rejects repeated labels, Resolve refuses
    a tail written twice (`RepeatedTail`), and Sig6-Sig8 add the implied
    `lacks` and `disjoint` clauses. It is neither stated in R0's
    documents nor checked. With satisfiability it gives a finite
    instance of σ2, so `ind`'s D is satisfiable for source σ2.
  - A scheme that does not come from a source signature (one built
    by a client of GI-Open) carries the same obligation, stated by
    that client.
- σ^i is σ with its bases renamed by i.
- **`rename`** (new, §18.70 Q4; proposed). For ρ = (ρ_ty, ρ_row),
  two injective maps `Nat → Nat`, `rename ρ σ` applies ρ_ty to every
  type variable and ρ_row to every row variable of σ: its bound
  lists, C and T. On a `Closed` σ every variable is bound, so an
  injective renaming is capture-avoiding. `shift k` is (n ↦ n + k,
  n ↦ n + k); `apartK σ2` is one more than the largest variable
  index in σ2's lists. Clients use `rename (shift (apartK σ2)) σ1`
  to meet `Apart`.
- **X_W(B, i)** (new, §18.70 Q2; proposed). For B, B₁ and an
  injective `i : B → B₁`:
  - *vocabulary* (EMLTI's signature S, Definition 10.1.14): X_W(B)'s,
    indexed by the original B: `base b` for each b ∈ B, →, Π, ∅ and
    `single_ℓ` for each ℓ ∈ `Label`; predicates =★, =row and U;
  - *carriers*: 𝓜★ = { g : G Label B₁ | FinG g } and 𝓜row = { f |
    FinG (.record f) }, the finite ground values over B₁, so they
    contain atoms of B₁ outside i(B), which no closed type names;
  - *interpretation*: `base b` denotes the atom `G.base (i b)`; →,
    Π, ∅, `single_ℓ`, = and U are read as in X_W(B₁).

  The signature depends on B alone, so every model in the family
  has the same types, constraints and Γ0; only the carriers and the
  reading of `base` vary with i. X_W(B, id) is X_W(B).
- (φ)σ is Fig. 10-5's (φ, ψ)σ; ψ plays no part, since these
  constraints have no `def` or x ⪯ T forms. In an equality model ↑ is
  the identity.

**Statements.**

- **M0 (model).** `[Countable Label] [Countable B]`. X_W(B) satisfies
  Definition 10.1.14 (directions, kinds and each kind's variables are
  countable by construction), Definition 10.2.5 and C-Arrow as
  equality (T1 → T2 = T1′ → T2′ ≡ T1 = T1′ ∧ T2 = T2′). Isolation in
  EMLTI's terms (p. 416): → is declared isolated and is the only
  isolated constructor, so the requirement that isolated pairs be
  incompatible is vacuous. M0 also states the stronger facts: for all
  T̄ and T̄′, each of `arrow T1 T2 = Π R`, `arrow T1 T2 = base b`, `Π
  R = base b` and `base b = base b′` (b ≠ b′) is unsatisfiable. In a
  typed Lean encoding the totality and homomorphism clauses of
  Definitions 10.2.5 and 10.2.10 hold by construction; the trust point
  is whether the encoding transcribes EMLTI faithfully, which stage 0
  of §3.3 reviews.
- **M0-i (model, refined; new).** `[Countable Label] [Countable B]`,
  any `B₁ : Type` and injective `i : B → B₁`. X_W(B, i) satisfies
  Definition 10.1.14: the constructors (`base b` for b ∈ B, →, Π, ∅,
  `single_ℓ`) form a denumerable set because B and `Label` are
  countable, the directions and kinds are finite, and each
  constructor has finite arity. It satisfies Definition 10.2.5: each
  carrier is nonempty (`emptyG`, `Row.empty`), `base b` denotes the
  constant i(b) ∈ 𝓜★, the other constructors denote total functions
  as in X_W(B₁), = is equality and U is a ternary relation. The
  carriers are unrestricted: B₁, and so 𝓜★, may be uncountable,
  since Definition 10.2.5 asks only for a nonempty set per kind.
  C-Arrow as equality and isolation hold as in M0. Of M0's stronger
  facts, `base b = base b′` (b ≠ b′) is unsatisfiable because i is
  injective; the other three hold for any i.
  *Checked against the rendered pages* (PDF 12-13 and 23, printed
  400-401 and 411): Definition 10.1.14 bounds the set of type
  constructors ("finite or denumerable"), Definition 10.1.15 bounds
  each kind's variables (denumerable), and Definition 10.2.5 bounds
  neither the carriers nor their relation to the constructors; it
  requires each F to denote a total function into 𝓜κ, which a
  constant does. The fit is argued, not proved.
- **T1 (expressions).** ∀ θ, `FinAssign θ` → ∀ t g, `evalT θ t = some
  g` ↔ ∃ ȳ, (φ_θ ⊕ ȳ) ⊨ C_t ∧ ↑((φ_θ ⊕ ȳ)(T_t)) = g, where ↑ takes a
  carrier element to its underlying value. Hence also `FinAssign θ →
  evalT θ t = some g → FinG g`. Likewise for `evalF`, with a row term
  and a row in place of T_t and g.
- **T2 (atoms).** For θ with `FinAssign θ`, `Holds θ a` ↔ φ_θ ⊨ ⟦a⟧,
  with ⟦eq t u⟧ = ∃Ȳ.(C_t ∧ C_u ∧ T_t = T_u), ⟦disjoint r s⟧ =
  ∃ρ. U(ρ, r, s), ⟦lacks r ℓ⟧ = ∃X ρ. U(ρ, r, single_ℓ X), and ⟦ff⟧ =
  false. In ⟦eq t u⟧ the auxiliary variables of t and u are apart
  (tagged 0:: and 1::). With it, a free-variable lemma: the free
  variables of ⟦a⟧ are exactly the translations of a's original
  variables.
- **V (closed validity is entailment).** For every P with `Scoped P`:
  `ValidFin P` ↔ ⟦P.D⟧ ⊩ ∃F̄. ⟦P.B⟧ in X_W(B), with F̄ per kind: {X_n
  | n ∈ tyVarsOf P.B, n ∉ P.rigidTy} ∪ {ρ_r | r ∈ rowVarsOf P.B, r ∉
  P.rigidRow}. Without `Scoped`, `ValidFin` ranges over infinite
  values of D's non-rigid variables, which entailment does not see.
  The quantifier structure is ∀ finite rigid θR ⊨ D, ∃ finite
  flexible θF, combined ⊨ B: EMLTI's ∀φ (Definition 10.2.11) with the
  ∃ of CM-Exists. Status unchanged (proposed). V is no longer on
  GI-Open's critical path; it links `ValidFin` to EMLTI's ⊩ as a
  later side result, outside the first proof tranche (§18.70 Q5).
- **GI (ground inclusion is entailment).** For σ1 = ∀X̄1[C1].T1 and
  σ2 = ∀X̄2[C2].T2, each closed (ftv(Ci) ∪ ftv(Ti) ⊆ X̄i), with
  X̄1 # X̄2: for every φ, (φ)σ2 ⊆ (φ)σ1 ↔ C2 ⊩ ∃X̄1.(C1 ∧ T1 = T2),
  read with X̄2 free. Stating it for every φ also shows that the
  inclusion does not depend on φ. Argued from Fig. 10-5, Definition
  10.2.3 and Definition 10.2.11, using a free-variable agreement lemma
  and X̄1 ∉ ftv(T2). The version for any equality model stays argued.
  *Formal target (adopted, §18.70 Q3):* the concrete constraint
  fragment of X_W(B). No generic many-sorted framework is built only
  to generalize this lemma; it would need direction-indexed arities
  (about 200 more lines) and adds no Waxwing claim.
- **F (flattening).** `Closed σ → ∀ φ, ↑ '' (φ)(flatten σ) = GW σ`.
  It holds for every scheme, including those whose C contains `eq`,
  so the old "with spreads" restriction is dropped. It is essentially
  a corollary of T1 and T2.
- **T1-i, T2-i, F-i (refined; new).** T1, T2 and F restated at
  X_W(B, i): θ ranges over finite assignments over B₁, and the
  Waxwing side reads the term, atom or scheme with its bases mapped
  by i. F-i: `Closed σ → ∀ φ, ↑ '' (φ)(flatten σ) = GW (σ^i)`, with
  (φ) computed in X_W(B, i) and GW over B₁. At i = id they are T1, T2
  and F. They follow from T1, T2 and F stated for the B₁-structure
  X_W(B₁) (a structure even when B₁ is uncountable) and a reindexing
  fact: for every φ and every term T over B, φ(T) in X_W(B, i) equals
  φ(T^i) in X_W(B₁), and the same for constraints, by induction on T,
  since only `base` is read differently (argued).
- **GI-Fin-Iff (new; pure Waxwing, no translation).** `Closed σ1 →
  Closed σ2 → Apart σ1 σ2 → (GW σ2 ⊆ GW σ1 ↔ ValidFin (ind σ2 σ1))`.
  It holds for any B and uses no injectivity. The reviewer reports it
  proved on paper in both directions with `sat_congr` and
  `evalT_congr` (Closed.lean). That is the reviewer's claim; its
  sketch was read here and is argued, not checked.
- **GI-Open (refined, §18.70 Q2).** `[Countable Label] [Countable
  B]`. Under `Closed σ1`, `Closed σ2` and `Apart σ1 σ2`: (∀ (B₁ :
  Type) (i : B → B₁), `Injective i` → ∀ φ, (φ)(flatten σ2) ⊆
  (φ)(flatten σ1) in X_W(B, i)) ↔ `ValidOpen (ind σ2 σ1)`.
  `ValidOpen` is unchanged: it still ranges over every injective
  `i : B → B₁` with `B₁ : Type`, uncountable B₁ included, and each
  extension it ranges over is an EMLTI model X_W(B, i) by M0-i. The
  schemes are not mapped by i: they stay over B, in the fixed
  signature, and i enters only through the interpretation of `base`.
  Proof route (argued): F-i at each i, then GI-Fin-Iff over B₁ on
  σ1^i and σ2^i (it holds for any base set), then `ind σ2^i σ1^i =
  (ind σ2 σ1).mapBase i` (from `List.map_append`), with closedness
  preserved by `tyVarsOf_map` and `rowVarsOf_map`
  (Typed/Bridge/ProofExtension.lean:139, 146), and `Apart` preserved
  because i touches no variable. This replaces the first route: GI,
  V and "`mapBase` commutes with ⟦·⟧" are not needed. No open-world
  variant of EMLTI is needed, because `ValidOpen` is a conjunction
  over the models X_W(B, i). Reading EMLTI's order as this ∀ over a
  family of models is Waxwing's choice (§4, ADR 014 item 5); the
  refinement does not remove that combination.
  - *Downward-countability lemma.* No longer needed: the alternative
    of §3.4 Q2 restricted GI-Open to countable B₁ and needed a lemma
    moving a counterexample at an uncountable B₁ to a countable
    sub-extension. Under X_W(B, i) no B₁ is excluded, so nothing has
    to be moved.
  - *Counterexample search (this pass, by hand; none found).* The
    worry was that closed types now denote only i-images while
    instances range over the whole carrier through φ. Both sides
    see the same carrier. Inclusion in X_W(B, i) quantifies φ over
    all finite values over B₁, and `ValidFin ((ind σ2 σ1).mapBase
    i)` quantifies θ over the same values; the only place B enters
    either side is a written base, read as i(b) on both. Cases
    tried: σ2 = ∀[].Int, σ1 = ∀[ty 0].tvar 0 (inclusion and
    validity both hold at every i); statements.md's example (valid
    over {Int, a}, invalid once a second fresh atom exists), whose
    failure appears at X_W(B, i) for any B₁ with two atoms outside
    i(B), as it does for `ValidOpen`; B empty (the vocabulary has no
    `base`, the carrier over a nonempty B₁ still has atoms, and
    𝓜★ ∋ `emptyG` in any case); i not surjective onto a B₁ of larger
    cardinality than B (allowed, by M0-i). Two doubts remain, both
    unchecked. (1) Whether an EMLTI result used downstream assumes
    every ground type is the denotation of a closed type, as in
    syntactic models (Example 10.2.6); the pages read state
    Theorems 10.4.4 and 10.4.8 for any X, and X_W^atoms(B) already
    relied on the same point. (2) Whether "X is arbitrary, but
    fixed" (p. 413) is met when each i is its own X; the signature
    is fixed across the family, so it is met per model, and the
    family reading stays ADR 014 item 5.
- **GI-Atoms (one model).** Let X_W^atoms(B) have X_W(B ⊕ ℕ)'s
  carriers (finite ground types over the bases B ⊕ ℕ) and predicates,
  but the constructors `base (inl b)` for b ∈ B only, with →, Π, ∅ and
  `single_ℓ`. Under GI-Open's premises and `[Countable B]` (so that B
  ⊕ ℕ is countable): (∀ φ, (φ)(flatten σ2^inl) ⊆ (φ)(flatten σ1^inl)
  in X_W^atoms(B)) ↔ `ValidOpen (ind σ2 σ1)`. The ← direction follows
  from B1a (`OpenToAtoms`), GI-Fin-Iff, F, and the fact that
  X_W^atoms(B) and X_W(B ⊕ ℕ) have the same carriers and predicates.
  B1a is a one-line instantiation at i := inl, which is injective, so
  it can be proved now rather than left argued. The → direction needs
  B1b (`AtomsToOpen`), which is *conjectured with argument*
  (research/division-campaign/bridge/statements.md, B0-B1 table), not
  proved. The `inr n` atoms are carrier elements that no constructor
  produces, so no closed type names them; Definition 10.2.5 permits
  such elements, since it asks only that each constructor denote a
  total function into the carrier (argued).
  - *Relation to X_W(B, i).* X_W^atoms(B) is X_W(B, inl) with B₁ = B
    ⊕ ℕ: the same split between a vocabulary indexed by B and a
    carrier over a larger base set. GI-Atoms ← is then refined
    GI-Open's left side at the single extension inl, and "same
    carriers and predicates as X_W(B ⊕ ℕ)" holds by definition.
    `[Countable B]` is needed for the vocabulary, not the carrier.
    GI-Atoms → still needs B1b, which is about whether the one
    extension inl suffices for every i; the refinement does not
    touch that question.
- **GI-Fin (no extension).** `ValidOpen (ind σ2 σ1)` → inclusion in
  X_W(B), from `openToFin` (B0, proved, Typed/Bridge/
  ProofValid.lean:15), GI-Fin-Iff and F. The converse fails in
  general: statements.md records a derived example, not in Lean,
  valid over the base set {Int, a} and invalid once a second fresh
  atom exists. (GI-Fin-Iff makes inclusion in X_W(B) coincide with
  `ValidFin`, not `ValidOpen`.)
- **Rename (renaming invariance; new, §18.70 Q4).** `Apart` stays a
  premise of GI-Fin-Iff, GI-Open and GI-Atoms; `ind` does not rename.
  For injective ρ and ρ′ and closed σ, σ1, σ2:
  (i) `Closed (rename ρ σ)`;
  (ii) `GW (rename ρ σ) = GW σ`, over any base set;
  (iii) `(rename ρ σ)^i = rename ρ (σ^i)`;
  (iv) `Apart σ2 (rename (shift (apartK σ2)) σ1)`;
  (v) `ValidOpen (ind (rename ρ σ2) (rename ρ σ1)) ↔ ValidOpen (ind
  σ2 σ1)` when `Apart σ1 σ2`; and if `Apart σ2 (rename ρ σ1)` and
  `Apart σ2 (rename ρ′ σ1)`, then `ValidOpen (ind σ2 (rename ρ σ1))
  ↔ ValidOpen (ind σ2 (rename ρ′ σ1))`.
  So `ValidOpen` of the induced problem does not depend on which
  apart renaming a client picks. Proof route (argued): (ii) by
  moving θ along ρ (θ′ reads θ at ρ⁻¹ on ρ's image and `emptyG` or
  the empty row elsewhere, so `FinAssign` is kept) with `sat_congr`
  and `evalT_congr`; (v) from (ii), (iii) and GI-Fin-Iff at each B₁.
  Status: proposed.
- **Labels.** No quantifier ranges over label extensions; `Label` is
  fixed in X_W. Fresh labels enter only as the hypothesis ∃z.
  `FreshLabels P z` (injective `z : Cell → Label` avoiding written
  labels) of `openCharacterization_scoped` (Typed/Bridge/
  ProofInstantiateSound.lean:60, proved). That theorem connects
  `ValidOpen` to generic instances; GI-Open does not use it.
- **Case A corollary.** Take σ_w and σ_inf of companion §1.2 as
  schemes, with σ_inf's variables renamed apart from σ_w's (both name
  `s` and `s2`) by `rename`, so `Apart σ_inf σ_w` holds; both are
  `Closed`. Their "tuple" parameter is the parameter list of a
  curried arrow (language.md:76: `(A, B) -> C` is exactly `A -> B ->
  C`), which `TExpr.arrow` expresses (§3.4 Q6, adopted). σ_w's type
  is always defined, so the added D atom `eq T_w T_w` of `ind σ_w
  σ_inf` holds at every finite instance. Given `ValidOpen (ind σ_w
  σ_inf)` (argued in companion §1.2 for the variables read apart,
  with a labels-only scratch check that ignores field types; not
  checked), σ_w is below σ_inf in EMLTI's order at every X_W(B, i),
  an EMLTI model for countable `Label` and B (M0-i, GI-Open), and in
  X_W^atoms(B) = X_W(B, inl) for countable B (GI-Atoms, ←
  direction).

**Under (b)** GI must read (φ)σ2 ∩ Def ⊆ (φ)σ1, and GI-Open also needs
J. Without guards, inclusion fails on junk instances, as in §2(b2).
**Under (c)** the statements are (a)'s, transported along the abs/none
bijection. They hold only on the finite carrier, where ∂ is restricted.

### 3.3 Proposed proof tranche (not authorized)

This is the reviewer's plan, recorded as a proposal and revised for
the author's answers (§18.70). D2 (§18.69) sent the statements to
review for a focused tranche; the tranche itself is not authorized,
and nothing here starts it. §18.70 scopes proof work separately from
the first execution tranche, which does not authorize it. One owner
holds the statements; workers prove in parallel worktrees, and the
results are integrated, then reviewed.

- **Stage 0 (owner only).** One interface file pair of about 250
  lines: `EK`; kinded variables VarStar and VarRow, each `Nat ⊕
  AuxTag`; mutual `ETy`/`ERow` with base (over B), arrow, pi, empty
  and single_ℓ; `ECon` with true, false, ∧, ∃ per kind, =★, =row and
  U; the model X_W(B, i), parameterized by `i : B → B₁`, with the
  carriers `{g : G Label B₁ // FinG g}` and `{f // FinG (.record
  f)}`; assignments, models, entailment and scheme instances; ⟦·⟧,
  mutual over `TExpr` and `Fields`; `Scheme`, `Closed`, `Apart`,
  `rename`, `shift`, `apartK`, `GW`, `flatten`, `ind`; WF-Sig as a
  stated obligation; every statement as a `def … : Prop`, as in
  Bridge/Valid.lean. GI is stated for the concrete fragment only
  (Q3), with no generic many-sorted framework. Before any proof
  starts, the interface is reviewed for fidelity to Definitions
  10.1.14-10.1.16, 10.2.5, 10.2.10 and 10.2.11 and Fig. 10-5, and
  X_W(B, i) gets its own statement review (Q2).
- **Stage 1 (parallel worktrees).** (a) M0-i, with M0 as its i = id
  case; (b) GI, on the concrete fragment; (c) T1 then T2, one
  worker, for the B₁-structure; (d) GI-Fin-Iff, the
  `ind`/`mapBase` commutation, Rename and B1a, pure Waxwing with no
  translation.
- **Stage 2.** (e) the reindexing fact, then T1-i, T2-i and F-i,
  after T1 and T2.
- **Stage 3.** GI-Open, from F-i, GI-Fin-Iff and the commutation;
  then GI-Atoms ←, GI-Open's left side at i = inl, with B1a.
  GI-Atoms → stays conditional on B1b.
- **Last.** Integrate, then review. GI is a side result linking the
  instance sets to EMLTI's ⊩, not a prerequisite for GI-Open.
- **Later, outside this tranche.** V, a side result (Q5).

The answers drop the downward-countability lemma (Q2) and a generic
GI (Q3). Rough sizes (reviewer's estimates, made before the
refinement): M0 about 80 lines, T1 and T2 250-300, GI about 100,
GI-Fin-Iff about 120, F about 100, V about 150, GI-Open about 60;
roughly 1,100-1,200 lines with the interface. The tranche now
excludes V and adds M0-i, the reindexing fact and Rename, which are
not estimated.
Reused: `evalT_congr`, `fieldRows_congr`, `holds_congr` and
`sat_congr` (Closed.lean); `compose_eq_some`, `composeAll_append` and
`composeAll_perm` (Compose.lean); `finG_emptyG` and `FinRow`
(Sig/Finite.lean); `tyVarsOf_map`, `rowVarsOf_map`, `mapBaseSyntax`
and `mapBaseId` (ProofExtension.lean); `openToFin`. New small lemmas:
`finRow_union`; a general `finG_single` (the one in
TypedAttack/ShapeSplit.lean is for `Label = Nat` only); `evalT_fin`.

### 3.4 Questions for the author, with the author's answers

The questions and proposed defaults are kept as asked; each answer is
the author's (dossier §18.70).

1. **How does the definedness of σ2's type enter?** (A) `eq T2 T2` in
   D, as in `ind`; or (B) D = C2 with a premise that σ2's type is
   defined whenever C2 holds on finite values. *Default: (A).* Open
   with it: which option matches how R0 and the recorder build
   signature problems when a parameter type joins two tails without a
   `disjoint` clause (counterexample 2). That was not checked here.
   *Answer: (A).* Declaration well-formedness and satisfiability are
   checked separately, so vacuous inclusion cannot make an invalid
   declaration acceptable (§3.2, "Vacuous inclusion": WF-Sig is an
   obligation on R0 and the recorder). Sig7 settles the open point
   (§3.1, counterexample 2's qualification).
2. **Countability.** *Default:* M0 assumes `[Countable Label]
   [Countable B]`; GI-Open quantifies over every `B₁ : Type`, and
   "X_W(B₁) is an EMLTI model" is claimed only for countable B₁. The
   alternative restricts GI-Open to countable B₁ and adds a downward
   lemma (a counterexample at B₁ gives one at a countable
   sub-extension, via E2 and E3; unproved). *Answer:* `ValidOpen`
   unchanged; first investigate a model refinement with constructor
   names indexed by B and carriers over B₁. §3.2 states it as X_W(B,
   i) (M0-i, T1-i, T2-i, F-i and the refined GI-Open), for statement
   review, proposed and not proved. Under it the downward lemma is
   not needed.
3. **GI's formal target.** *Default: yes,* weaken GI from "any
   equality model" to the concrete fragment of X_W(B) for
   formalization; the generic version stays argued. *Answer:* the
   concrete fragment, with no generic many-sorted framework built
   only to generalize this lemma.
4. **Apart.** *Default: a premise* of GI-Fin-Iff, GI-Open and
   GI-Atoms. The alternative has `ind` rename σ1's variables apart
   itself. *Answer:* a premise. Clients get a capture-avoiding
   `rename`, with invariance under renaming checked (§3.2, Rename,
   proposed).
5. **V.** *Default: keep it* in the tranche as a side result, in a
   later stage (stage 2), since GI-Open no longer depends on it.
   *Answer:* a later side result, off GI-Open's critical path; §3.3
   moves it out of the tranche.
6. **Case A's tuple types**, which `TExpr` lacks. *Default: curried
   arrows.* Waxwing has no tuple type in this position: `(A, B) -> C`
   is exactly `A -> B -> C` (language.md:76), so σ_w and σ_inf lower
   to curried arrows, which `TExpr.arrow` already expresses.
   *Answer:* curried arrows, Waxwing's existing meaning.

## 4. Recommendation

**Decided (D2, dossier §18.69, 2026-10-22).** The author adopted
encoding (a). M0, T1, T2, V, GI, F and GI-Open go to statement review
for a focused proof tranche; the tranche itself is not yet authorized.
GI-Atoms stays conditional on B1b. GI-Fin is not named in the decision
and stays proposed. Current exported syntax is kept for now, but L0
is not frozen as sufficient for future principal inference. Every
statement below is still proposed and unproved; the decision chooses
the encoding and adds no evidence. The recommendation that follows is
kept as written. The statement review (§8) then revised §3: GI-Open
now takes `Closed`, `Apart` and the induced problem `ind`, M0 assumes
countable `Label` and B, and GI-Fin-Iff is new. The author's answers
(§18.70, §9) then added the refined model X_W(B, i), `rename` and
WF-Sig, all proposed.

**State (a) next: M0, T1, T2, V, GI and GI-Open, with F.** It is the
smallest encoding. It adds one predicate and no junk, and its ground
types are exactly Waxwing's finite values. Waxwing's `Holds` already
reads `eq` strictly (both sides defined), which is what (a) encodes.
Keep GI-Atoms as a corollary conditional on B1b. Keep (c) only as a
presentation for the composition-free fragment. Do not pursue (b):
(b1) breaks C-Arrow, and (b2) needs an invented predicate and guards
on every scheme.

Once these statements are proved, the assessment could claim the
following.

- X_W(B) is an EMLTI model for countable `Label` and B (M0), so
  Theorems 10.4.4 and 10.4.8 apply at each such base set. This
  covers EMLTI's expression language with record operations as Γ0
  constants, not Waxwing's full surface. With the refinement, so is
  X_W(B, i) for every injective `i : B → B₁`, B₁ of any size (M0-i).
- EMLTI's order, in this family reading (EMLTI's per-model order
  quantified over every injective base extension; ADR 014 item 5),
  *is* `ValidOpen` on the induced problem `ind σ2 σ1`, for closed
  schemes whose variables are apart (GI-Open, §3.2). With B1b it is
  also the order at the one model X_W^atoms(B) (countable B).
- Case A's σ_w is an instance of σ_inf in that order, given
  `ValidOpen (ind σ_w σ_inf)`, which is argued, not checked.

The assessment could not claim:

- principal types in L0 (O4, O11);
- a solver, since EMLTI's is proved for the free tree model only;
- type soundness for record primitives (§10.5's Γ0 conditions, Def.
  10.5.2 and the δ-rules, were not checked);
- elaboration;
- any result for `ValidAll`'s infinite rows;
- coincidence with ground inclusion at the unextended X_W(B).

**O24 matrix status.** Move it from unresolved to **proposed**, and
restate its interpretation: "Waxwing's row model, *with composition
encoded as the predicate U* (this note §2a), is an EMLTI model; ground
inclusion at every injective base extension coincides with `ValidOpen`
(GI-Open); in X_W^atoms(B) it does so given B1b." The model-condition
check is argued here, and the correspondence lemmas are stated but
unreviewed and unproved. Direct identification **fails (argued)**
by the partiality of ⊎ against Definition 10.2.5's totality, as the
external review said. Row O20 (concatenation) gains a candidate
account but stays unresolved.

**ADR 014 new combinations (flagged for the author).**

1. EMLTI's HM(X) with a disjoint-composition model (already flagged in
   companion §1.4).
2. A ternary disjoint-union predicate U as the only row primitive. The
   precedents cited by EMLTI (Berthomieu's =L, `lacks`, Sulzmann's
   forms, Pottier's ≤L) are predicate-based, but none is this predicate,
   and none was read.
3. A fixed model with anonymous atoms (X_W^atoms(B)) standing in for
   the open-world family of models of Odersky et al. GI-Atoms uses it.
   The refined X_W(B, i) of §3.2 uses the same vocabulary/carrier
   split for every extension, and X_W^atoms(B) is X_W(B, inl).
4. (b)'s Def guard, which is invented and not recommended.
5. EMLTI's per-model order quantified over Waxwing's family of
   injective base extensions (GI-Open). That reading is not EMLTI's
   order, which is over one fixed model; the closest precedent, Odersky
   et al. 1999's open world, was not read.

## 5. Reading status

EMLTI rendered pages read: printed 407-419 (§10.2 syntax, Definition
10.2.5, model examples, Definition 10.2.10, Fig. 10-5, Definition
10.2.11, C-Arrow, isolation, Definition 10.2.14, Fig. 10-6, Example
10.2.16), 422-424 (Fig. 10-7 and the open-world remark), 433-434
(Theorems 10.4.4 and 10.4.8), 472-473 and 488; in the statement
review pass, 400-401 (Definitions 10.1.14-10.1.16), 414 and 416; in
the answers pass (§9), 400-401 and 411-413 again. Read
from a text extraction only: 465-468 (row
kinds, Definition 10.8.3), 471, 487 and 489. Not read: 420-421 (solved
forms), Lemma 10.3.1, §10.5 beyond p. 434, §10.6, Example 10.8.8 itself,
and the papers EMLTI cites (Odersky et al. 1999, Sulzmann 2000,
Berthomieu, Gaster and Jones, Pottier 2003). Waxwing sources read:
Syntax.lean, Compose.lean, Rows.lean (definitions), Sig/Validity.lean,
Sig/Finite.lean, Typed/Bridge/{Valid, Extension, Fresh,
ProofInstantiateSound}.lean, Typed/Refute/Statements.lean (`Denotes`),
statements.md (B0-B1, BS), ADR 013 (2026-10-16 merge decision: "overlap
is an error everywhere"), ADR 014, and language.md (the `disjoint`
clause); in the answers pass, recorder-rules.md §3.1 (Sig4-Sig10),
recorder-spec row A4, Features/Resolve/Apart.purs (`heldTails`,
`joinedPairs`), Features/Resolve/ArgumentPairs.purs (`pairsOf`) and
Sig/SourceCampaign.lean (`ClauseOnly`, `clauseOnly_satisfiable`).

## 6. Review of the correction pass, 2026-10-22

A read-only review (model output, kept outside the repository) checked
this note against the rendered EMLTI pages and the Lean sources and
found nothing blocking. Its findings 4-10 bear on this note; all were
applied.

- **T1 (finding 4).** The old statement quantified over "ftv(C_t) ∖
  dom θ", but `Assign` is total, so that set is empty, and g was
  unbound. T1 now quantifies over every θ with `FinAssign θ`, every t
  and every g, and asks for values of the fresh variables Ȳ_t. A new
  **Variables** item says how Waxwing's two `Nat` namespaces
  (`Assign.ty`, `Assign.row`) become kinded EMLTI variables X_n : ★ and
  ρ_n : row, and defines φ_θ. T2 reads θ through φ_θ.
- **GI-Atoms (finding 5).** X_W(B ⊕ ℕ) has a constructor `base (inr
  n)` for each n, so "no closed type names the `inr n` atoms" was
  false there. GI-Atoms now uses X_W^atoms(B): the same carriers, with
  constructors `base (inl b)` only. §4 and ADR 014 item 3 use the new
  name.
- **GI-Open (finding 6).** GI is stated for EMLTI schemes, and an L0
  scheme with spreads becomes one only through F. The proof route now
  reads: F, T1/T2 and V, then GI at each B₁, plus `mapBase` commuting
  with ⟦·⟧ and preserving `Scoped`.
- **Case A corollary (finding 7).** It now states its premise,
  `ValidOpen` P(σ_w ≤ σ_inf), which companion §1.2 argues with a
  labels-only scratch check and which is not checked. §4's claim list
  says the same.
- **ADR 014 (finding 8).** Item 3 no longer says GI-Open avoids a
  combination: GI-Open adds its own, now item 5 (EMLTI's per-model
  order quantified over the injective-base-extension family; Odersky
  et al. 1999 not read). §4's "*is* `ValidOpen`" is qualified as this
  family reading.
- **(b1) isolation (finding 9).** The C-Arrow failure alone settles
  (b1). Isolation fails only if Π is declared isolated; → stays
  incompatible with `base b`.
- **B1a (finding 10).** "derived" is not one of this note's statuses.
  B1a is now "argued, derived with i = inl, not in Lean".

No status changes. The assessment's O24 row and IF4 are updated to the
X_W^atoms(B) name and the family reading.

## 7. Author's decisions (§18.69), 2026-10-22

The author decided D2 (dossier §18.69): encoding (a); M0, T1, T2, V,
GI, F and GI-Open to statement review for a focused proof tranche;
GI-Atoms conditional on B1b; current exported syntax kept, with L0 not
frozen as sufficient for future principal inference. §4 records the
decision. No status changes: the model-condition checks stay argued
and every lemma statement stays proposed.

## 8. Statement review, 2026-10-22

A read-only statement review of §3 (model output, kept outside the
repository) for the D2 proof tranche (dossier §18.69) found the first
GI-Open false as stated. Its counterexamples were checked here against
the Lean definitions and the rendered p. 400 before use (§3.1); none
is in Lean. Changes:

- **§3.1 (new).** Three counterexamples: shared variable names (1),
  σ2's type undefined with its definedness in the body (2), and
  countability (3). Verdict: the first GI-Open and the first GI-Atoms
  biconditional are false as stated, GI-Atoms whether or not B1b
  holds; M0 as stated fails for uncountable B or `Label`.
- **§3.2.** M0 takes `[Countable Label] [Countable B]`, states
  isolation in EMLTI's terms and adds the stronger incompatibility
  facts. T1 has its exact form, with auxiliary variables tagged and
  apart from every original variable. T2 keeps each side's auxiliary
  variables apart and adds a free-variable lemma. V states F̄ per kind
  and is off GI-Open's critical path. GI uses (φ, ψ)σ and closedness,
  with the concrete X_W(B) fragment as its proposed formal target. F
  is restated with `Scheme`, `GW`, `flatten` and `Closed`. GI-Fin-Iff
  is new. GI-Open takes `Closed`, `Apart` and `ind` (with `eq T2 T2`
  in D, option A) and has a new proof route. GI-Atoms takes GI-Open's
  premises and `Countable B`, and notes that B1a is provable now. The
  case A corollary is restated for the new premises.
- **§3.3 (new).** The reviewer's tranche plan, as a proposal; not
  authorized.
- **§3.4 (new).** Six questions for the author, with proposed
  defaults.
- **§1, §4, §5.** The opening paragraph, §4's decision note and claim
  list, and the reading status follow the revision.

No status changes: every statement stays proposed and unproved,
GI-Fin-Iff's "proved on paper" is the reviewer's claim (argued), and
the model-condition checks stay argued. The assessment's O24 row and
IF4 and the companion's D2 now name GI-Fin-Iff and the revision.

## 9. Author's answers (§18.70), 2026-10-22

The author answered §3.4's six questions (dossier §18.70) and
qualified counterexample 2. Applied:

- **Q1.** Option A adopted. §3.2 adds "Vacuous inclusion and the
  separate checks": satisfiability of a source D from
  `clauseOnly_satisfiable` (proved), and WF-Sig, the definedness of
  a signature's type under its D, stated as an obligation on R0 and
  the recorder (proposed; not stated in R0's documents, not checked).
- **Q2.** `ValidOpen` unchanged. §3.2 states the refined model
  X_W(B, i) (vocabulary indexed by B, `base b` read as i(b), carriers
  the finite values over B₁) with M0-i, T1-i, T2-i, F-i and a refined
  GI-Open in which every extension is an EMLTI model of this form.
  M0-i was checked against Definitions 10.1.14, 10.1.15 and 10.2.5
  on the rendered pages (argued fit). A hand search for a
  counterexample (§3.2, GI-Open) found none and leaves two doubts.
  The downward-countability lemma is dropped. GI-Atoms' X_W^atoms(B)
  is X_W(B, inl).
- **Q3.** GI's formal target is the concrete fragment; no generic
  framework.
- **Q4.** `Apart` stays a premise; §3.2 adds `rename`, `shift`,
  `apartK` and the Rename lemma (renaming invariance of `Closed`, GW
  and `ValidOpen` of `ind`), proposed.
- **Q5.** V is a later side result, outside the tranche (§3.3).
- **Q6.** Curried arrows.
- **Counterexample 2.** The raw scheme stays a valid model-level
  counterexample; §3.1 adds that Sig7 puts the implied `disjoint`
  clauses into a source signature's D, so omitting a `where` clause
  does not omit them.
- **§3.3.** The tranche plan follows: X_W(B, i), `rename` and WF-Sig
  in stage 0; M0-i and Rename in stage 1; the reindexing fact and
  T1-i, T2-i, F-i in stage 2; V out. It stays unauthorized: §18.70
  scopes proof work separately from the first execution tranche.

No status changes: every statement, X_W(B, i) and Rename included,
stays proposed and unproved, and the model-condition checks stay
argued.

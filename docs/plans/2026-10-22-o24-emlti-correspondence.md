# O24: Waxwing's row model against EMLTI's model conditions

Written 2026-10-22 at the author's request, after the forwarded external
review (issue 1: "O24 must address partial record composition"). It
covers one matrix row, O24, of
docs/plans/2026-10-22-inference-foundations-assessment.md §11, with the
companion docs/plans/2026-10-22-inference-foundations-extension.md §1.2
and §1.4. It changes no compiler code, adds no Lean proof and runs no
prototype. Every lemma statement below is proposed and awaits statement
review; the model-condition checks in §1 and §2 are argued.

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
  fails: ⊥ → Int = ⊥ = ⊥ → Bool while Int ≠ Bool, and → is no longer
  isolated, since ⊥ → X = ⊥ = Π ⊥. EMLTI requires C-Arrow (p. 416), so
  (b1) is not an EMLTI model.
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

All statements here are **proposed** (statements only, not proved).
Fix X_W(B) from (a). ⟦·⟧ translates `TExpr`, atoms and problems, with
fresh ∃-bound variables for intermediate rows.

- **M0 (model).** X_W(B) satisfies Definition 10.2.5, C-Arrow (as
  equality: T1 → T2 = T1′ → T2′ ≡ T1 = T1′ ∧ T2 = T2′), and → is isolated
  against Π and every `base b`.
- **T1 (expressions).** For every finite θ and every t, `evalT θ t =
  some g` ↔ ∃φ ⊇ θ on ftv(C_t) ∖ dom θ, with φ ⊨ C_t and φ(T_t) = g,
  where ⟦t⟧ = (T_t, C_t). Likewise for `evalF`.
- **T2 (atoms).** For finite θ, `Holds θ a` ↔ θ ⊨ ⟦a⟧, with ⟦eq t u⟧ =
  ∃Ȳ.(C_t ∧ C_u ∧ T_t = T_u), ⟦disjoint r s⟧ = ∃ρ. U(ρ, r, s),
  ⟦lacks r ℓ⟧ = ∃X ρ. U(ρ, r, single_ℓ X), and ⟦ff⟧ = false.
- **V (closed validity is entailment).** For every P with `Scoped P`:
  `ValidFin P` ↔ ⟦P.D⟧ ⊩ ∃F̄. ⟦P.B⟧ in X_W(B), where F̄ is the set of
  variables of P.B outside P's rigid lists. The quantifier structure is
  ∀ finite rigid θR ⊨ D, ∃ finite flexible θF, combined ⊨ B; that is
  EMLTI's ∀φ (Definition 10.2.11) with the ∃ of CM-Exists.
- **GI (ground inclusion is entailment; any equality model).** For
  closed σ1 = ∀X̄1[C1].T1 and σ2 = ∀X̄2[C2].T2 with X̄1 # X̄2: (∅)σ2 ⊆
  (∅)σ1 ↔ C2 ⊩ ∃X̄1.(C1 ∧ T1 = T2), read with X̄2 free. This follows
  from Fig. 10-5, Definition 10.2.3 and Definition 10.2.11 (argued; it
  is nearly definitional).
- **P(σ2 ≤ σ1).** For σ1, σ2 written in L0, the induced problem has
  rigid = X̄2, D = C2, and body C1 ∧ eq(T1, T2); flexible = X̄1.
- **GI-Open.** For σ1, σ2 in L0 with P(σ2 ≤ σ1) Scoped: (∀B₁, ∀i : B →
  B₁ injective, (∅)σ2^i ⊆ (∅)σ1^i in X_W(B₁)) ↔ `ValidOpen` P(σ2 ≤ σ1),
  where σ^i renames σ's bases by i. The quantifiers run ∀ injective
  extension, ∀ finite rigid instance satisfying C2, ∃ finite flexible
  witness. The proof route (argued): V and GI at each B₁, plus `mapBase`
  commuting with ⟦·⟧. No open-world variant of EMLTI is needed, because
  each X_W(B₁) is an ordinary fixed model and `ValidOpen` is a
  conjunction over them.
- **GI-Atoms (one model).** (∅)σ2 ⊆ (∅)σ1 in X_W(B ⊕ ℕ) ↔ `ValidOpen`
  P(σ2 ≤ σ1). The ← direction follows from B1a (`OpenToAtoms`,
  derived). The → direction needs B1b (`AtomsToOpen`), which is
  *conjectured with argument* (research/division-campaign/bridge/
  statements.md, B0-B1 table), not proved. The `inr n` atoms are ground
  types that no closed type names; Definition 10.2.5 does not forbid
  them (argued).
- **GI-Fin (no extension).** `ValidOpen` P → inclusion in X_W(B)
  follows from V and `openToFin` (B0, proved, Typed/Bridge/
  ProofValid.lean:15). The converse fails in general: statements.md
  records a derived example, not in Lean, valid over the base set
  {Int, a} and invalid once a second fresh atom exists.
- **Labels.** No quantifier ranges over label extensions; `Label` is
  fixed in X_W. Fresh labels enter only as the hypothesis ∃z.
  `FreshLabels P z` (injective `z : Cell → Label` avoiding written
  labels) of `openCharacterization_scoped` (Typed/Bridge/
  ProofInstantiateSound.lean:60, proved). That theorem connects
  `ValidOpen` to generic instances; GI-Open does not use it.
- **F (flattening).** For L0 schemes with spreads in types, the
  flattened scheme (U-chains, Π ρ) has the same ground instances as the
  scheme read through `evalT`.
- **Case A corollary.** With σ_w and σ_inf of companion §1.2, σ_w is
  below σ_inf in EMLTI's order at every X_W(B₁) (GI-Open), and hence
  at X_W(B ⊕ ℕ).

**Under (b)** GI must read (∅)σ2 ∩ Def ⊆ (∅)σ1, and GI-Open also needs
J. Without guards, inclusion fails on junk instances, as in §2(b2).
**Under (c)** the statements are (a)'s, transported along the abs/none
bijection. They hold only on the finite carrier, where ∂ is restricted.

## 4. Recommendation

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

- X_W(B) is an EMLTI model, so Theorems 10.4.4 and 10.4.8 apply at each
  base set. This covers EMLTI's expression language with record
  operations as Γ0 constants, not Waxwing's full surface.
- EMLTI's order, read at every injective extension, *is* `ValidOpen`
  on the induced problem. With B1b it is also the order at the one
  model X_W(B ⊕ ℕ).
- Case A's σ_w is an instance of σ_inf in that order.

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
(GI-Open); at X_W(B ⊕ ℕ) it does so given B1b." The model-condition
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
3. A fixed model with anonymous atoms (X_W(B ⊕ ℕ)) standing in for the
   open-world family of models of Odersky et al. GI-Open avoids this
   combination; GI-Atoms uses it.
4. (b)'s Def guard, which is invented and not recommended.

## 5. Reading status

EMLTI rendered pages read: printed 407-419 (§10.2 syntax, Definition
10.2.5, model examples, Definition 10.2.10, Fig. 10-5, Definition
10.2.11, C-Arrow, isolation, Definition 10.2.14, Fig. 10-6, Example
10.2.16), 422-424 (Fig. 10-7 and the open-world remark), 433-434
(Theorems 10.4.4 and 10.4.8), 472-473 and 488. Read from a text
extraction only: 400-401 (Definitions 10.1.14 and 10.1.15), 465-468 (row
kinds, Definition 10.8.3), 471, 487 and 489. Not read: 420-421 (solved
forms), Lemma 10.3.1, §10.5 beyond p. 434, §10.6, Example 10.8.8 itself,
and the papers EMLTI cites (Odersky et al. 1999, Sulzmann 2000,
Berthomieu, Gaster and Jones, Pottier 2003). Waxwing sources read:
Syntax.lean, Compose.lean, Rows.lean (definitions), Sig/Validity.lean,
Sig/Finite.lean, Typed/Bridge/{Valid, Extension, Fresh,
ProofInstantiateSound}.lean, Typed/Refute/Statements.lean (`Denotes`),
statements.md (B0-B1, BS), ADR 013 (2026-10-16 merge decision: "overlap
is an error everywhere"), ADR 014, and language.md (the `disjoint`
clause).

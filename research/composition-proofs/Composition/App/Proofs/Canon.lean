/-
Scope A Stage 0c (dossier §18.196; design §17.2): S9 and S5′c proved.

S9: evaluating a record's written fields depends only on the list of
(label, type) pairs up to permutation (`evalFA_ofList_perm`, from
`compose_swap`), and composing the tails only on their multiset
(`composeAll_perm`), so reordering at every depth (`canonA`) changes
neither definedness nor value.

S5′c follows the proof of S5′ (`s5'_of_s3`): the check's `defined` on
the erased canonical form gives, through `PG0Clauses` and
`evalT_eraseT`, that the canonical form evaluates; S9 moves this to the
substituted form, and S3 to the original. Equal canonical forms make
the two sides' values equal. D6.5's hypothesis is unused, as in S5′.
-/
import Composition.App.CanonStatements
import Composition.App.Proofs.Check
import Composition.App.Proofs.Subst

namespace Composition.App

open Classical Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ### Field lists -/

omit [DecidableEq Label] in
theorem FieldsA.ofList_toList :
    ∀ fs : FieldsA Label B, FieldsA.ofList fs.toList = fs
  | .nil => rfl
  | .cons l t rest => by
    simp only [FieldsA.toList, FieldsA.ofList, FieldsA.ofList_toList rest]

/-- Evaluating written fields depends on their list only up to
permutation: a repeated label is refused in every order, and disjoint
composition commutes and associates. -/
theorem evalFA_ofList_perm (θ : AssignA Label B)
    {xs ys : List (Label × TExprA Label B)} (h : xs.Perm ys) :
    evalFA θ (FieldsA.ofList xs) = evalFA θ (FieldsA.ofList ys) := by
  induction h with
  | nil => rfl
  | cons x _ ih =>
    obtain ⟨l, t⟩ := x
    simp only [FieldsA.ofList, evalFA, ih]
  | swap x y zs =>
    obtain ⟨lx, tx⟩ := x
    obtain ⟨ly, ty⟩ := y
    simp only [FieldsA.ofList, evalFA]
    cases evalA θ tx with
    | none => cases evalA θ ty <;> rfl
    | some gx =>
      cases evalA θ ty with
      | none => rfl
      | some gy =>
        simp only [Option.bind_some]
        cases evalFA θ (FieldsA.ofList zs) with
        | none => rfl
        | some c =>
          simp only [Option.bind_some]
          exact compose_swap (singleA ly gy) (singleA lx gx) c
  | trans _ _ ih1 ih2 => rw [ih1, ih2]

/-! ### S9 -/

mutual
  theorem evalA_canonA (o : Orders Label B) (θ : AssignA Label B) :
      ∀ t : TExprA Label B, evalA θ (canonA o t) = evalA θ t
    | .base b => by simp [canonA]
    | .arrow t u => by
      simp only [canonA, evalA, evalA_canonA o θ t, evalA_canonA o θ u]
    | .tvar n => by simp [canonA]
    | .record fs tails => by
      simp only [canonA, evalA]
      rw [evalFA_ofList_perm θ (o.fields_perm _), FieldsA.ofList_toList,
        evalFA_canonFA o θ fs]
      congr 1
      funext fr
      rw [composeAll_perm (List.Perm.cons fr ((o.tails_perm tails).map _))]
    | .app t as => by
      simp only [canonA, evalA, evalArgsA_canonArgsA o θ as]

  theorem evalFA_canonFA (o : Orders Label B) (θ : AssignA Label B) :
      ∀ fs : FieldsA Label B, evalFA θ (canonFA o fs) = evalFA θ fs
    | .nil => by simp [canonFA]
    | .cons l t rest => by
      simp only [canonFA, evalFA, evalA_canonA o θ t, evalFA_canonFA o θ rest]

  theorem evalArgsA_canonArgsA (o : Orders Label B) (θ : AssignA Label B) :
      ∀ as : ArgsA Label B, evalArgsA θ (canonArgsA o as) = evalArgsA θ as
    | .nil => by simp [canonArgsA]
    | .cons t rest => by
      simp only [canonArgsA, evalArgsA, evalA_canonA o θ t,
        evalArgsA_canonArgsA o θ rest]
end

theorem s9 : S9 (Label := Label) (B := B) :=
  fun o θ t => evalA_canonA o θ t

/-! ### S5′c -/

theorem s5'c_of_s3_s9 (h3 : S3 (Label := Label) (B := B))
    (h9 : S9 (Label := Label) (B := B)) :
    S5'c (Label := Label) (B := B) := by
  intro M hM o P σ _hD hC θ hθD hθσ a ha
  have hD0 : Sat (eraseAssign θ) (eraseP P).D := sat_erase θ P.D hθD
  have hσ0 : Sat (eraseAssign θ) (eqs (eraseS σ)) := by
    rw [eqs_eraseS]; exact sat_erase θ _ hθσ
  obtain ⟨hdef, hrow⟩ := hM (eraseP P) (eraseS σ) (eraseAssign θ) hD0 hσ0
  have hca := hC a ha
  cases a with
  | eq t u =>
    obtain ⟨hsyn, hok⟩ := hca
    have hs := hdef _ hok
    rw [evalT_eraseT, Option.isSome_map] at hs
    obtain ⟨g, hg⟩ := Option.isSome_iff_exists.mp hs
    refine ⟨g, ?_, ?_⟩
    · rw [← h3 θ σ hθσ t, ← h9 o θ]; exact hg
    · rw [← h3 θ σ hθσ u, ← h9 o θ, ← hsyn]; exact hg
  | lacks r l =>
    have h := hrow (.lacks r l) (.inl ⟨r, l, rfl⟩) hca
    simp only [Holds, eraseAssign, ermap, Option.map_eq_none_iff] at h
    exact h
  | disjoint r s =>
    have h := hrow (.disjoint r s) (.inr ⟨r, s, rfl⟩) hca
    exact (disjoint_ermap eraseG _ _).mp h
  | ff => exact hca.elim

theorem s5'c : S5'c (Label := Label) (B := B) :=
  s5'c_of_s3_s9 s3 s9

/-! ### Examples (design §17.2)

(a) A `lacks` atom in `D` makes a record with a tail defined: for every
order, `CheckAc semCheck` accepts `{x: b, ...r0} = {x: b, ...r0}` under
`D = [lacks r0 x]`, and S5′c carries it to the equation holding. -/

namespace CanonExample

/-- `{x: b, ...r0}`. -/
def exT (x : Label) (b : B) : TExprA Label B :=
  .record (.cons x (.base b) .nil) [0]

/-- `D = [lacks r0 x]`, `B = [{x: b, ...r0} = {x: b, ...r0}]`. -/
def exP (x : Label) (b : B) : SigProblemA Label B :=
  ⟨[], [0], [.lacks 0 x], [.eq (exT x b) (exT x b)]⟩

omit [DecidableEq Label] in
/-- Every order fixes `{x: b, ...r0}`: a permutation of a one-element
list is that list. -/
theorem canon_exT (o : Orders Label B) (x : Label) (b : B) :
    canonA o (substTA ⟨[], []⟩ (exT x b)) = exT x b := by
  have h1 : o.fields [(x, .base b)] = [(x, .base b)] :=
    List.perm_singleton.mp (o.fields_perm _)
  have h2 : o.tails [0] = [0] := List.perm_singleton.mp (o.tails_perm _)
  simp [exT, substTA, substFA, expandTailsA, rowOfA, FieldsA.append, canonA,
    canonFA, FieldsA.toList, FieldsA.ofList, h1, h2]

theorem checkAc_exP (o : Orders Label B) (x : Label) (b : B) :
    CheckAc (semCheck (Label := Label) (B := B)) o (exP x b) ⟨[], []⟩ := by
  intro a ha
  simp only [exP, List.mem_singleton] at ha
  subst ha
  refine ⟨rfl, ?_⟩
  rw [canon_exT]
  intro σ θ hD _
  have hx : θ.row 0 x = none := hD (.lacks 0 x) (by simp [exP, eraseP, eraseAtom])
  have hdis : Composition.Disjoint (single x (.base b)) (θ.row 0) := by
    intro l
    by_cases hl : l = x
    · subst hl; exact Or.inr hx
    · exact Or.inl (by simp [single, hl])
  have hc : compose (single x (.base b)) (θ.row 0) =
      some (union (single x (.base b)) (θ.row 0)) := compose_eq_some.mpr ⟨hdis, rfl⟩
  simp [exT, eraseT, eraseF, evalT, evalF, compose_empty, composeAll, hc]

/-- S5′c on example (a): under every assignment whose `r0` lacks `x`,
the equation holds (both sides defined). -/
theorem holds_exP (o : Orders Label B) (x : Label) (b : B)
    (θ : AssignA Label B) (hx : θ.row 0 x = none) :
    HoldsA θ (.eq (exT x b) (exT x b)) :=
  s5'c semCheck pg0Clauses_semCheck o (exP x b) ⟨[], []⟩
    (by simp [exP, AppFreeAtom]) (checkAc_exP o x b) θ
    (by intro a ha; simp [exP] at ha; subst ha; exact hx)
    (by simp [SatA, eqsA]) _ (by simp [exP])

/-! (b) Labels `a = 0`, `x = 1`. `{x: i, ...r} = {a: c, x: i}` under
`σ(r) = {a: c}`: the substituted left side lists `x` before `a`, so
`CheckA` refuses; `CheckAc` with fields sorted by label (core
`List.mergeSort`, a permutation by `List.mergeSort_perm`; tails left
as written) accepts. -/

/-- Fields sorted by label with core `List.mergeSort`; tails unchanged. -/
def byLabel (B : Type) : Orders Nat B where
  fields l := l.mergeSort (fun p q => decide (p.1 ≤ q.1))
  tails l := l
  fields_perm l := List.mergeSort_perm l _
  tails_perm l := List.Perm.refl l

/-- `{x: i, ...r}`, `{a: c, x: i}`, and `σ(r) = {a: c}`. -/
def exP2 (i c : B) : SigProblemA Nat B :=
  ⟨[], [], [], [.eq (.record (.cons 1 (.base i) .nil) [0])
                    (.record (.cons 0 (.base c) (.cons 1 (.base i) .nil)) [])]⟩

def exσ2 (c : B) : SubstA Nat B := ⟨[], [(0, (.cons 0 (.base c) .nil, []))]⟩

theorem not_checkA_exP2 (M : Check0 Nat B) (i c : B) :
    ¬ CheckA M (exP2 i c) (exσ2 c) := by
  intro h
  have := (h _ (List.mem_singleton_self _)).1
  simp [exσ2, substTA, substFA, expandTailsA, rowOfA,
    FieldsA.append] at this

theorem checkAc_exP2 (i c : B) :
    CheckAc (semCheck (Label := Nat) (B := B)) (byLabel B) (exP2 i c)
      (exσ2 c) := by
  intro a ha
  simp only [exP2, List.mem_singleton] at ha
  subst ha
  have hl : canonA (byLabel B) (substTA (exσ2 c)
      (.record (.cons 1 (.base i) .nil) [0])) =
      .record (.cons 0 (.base c) (.cons 1 (.base i) .nil)) [] := by
    simp [exσ2, byLabel, substTA, substFA, expandTailsA, rowOfA,
      FieldsA.append, canonA, canonFA, FieldsA.toList, FieldsA.ofList]
  have hr : canonA (byLabel B) (substTA (exσ2 c)
      (.record (.cons 0 (.base c) (.cons 1 (.base i) .nil)) [])) =
      .record (.cons 0 (.base c) (.cons 1 (.base i) .nil)) [] := by
    simp [byLabel, substTA, substFA, expandTailsA,
      FieldsA.append, canonA, canonFA, FieldsA.toList, FieldsA.ofList]
  refine ⟨hl.trans hr.symm, ?_⟩
  rw [hl]
  intro σ θ _ _
  have hdis : Composition.Disjoint (single (0 : Nat) (.base c))
      (single 1 (.base i)) := by
    intro l
    by_cases hl : l = 0
    · subst hl; exact Or.inr (by simp [single])
    · exact Or.inl (by simp [single, hl])
  have hc : compose (single (0 : Nat) (.base c)) (single 1 (.base i)) =
      some (union (single 0 (.base c)) (single 1 (.base i))) :=
    compose_eq_some.mpr ⟨hdis, rfl⟩
  simp [eraseT, eraseF, evalT, evalF, compose_empty, composeAll, hc]

/-! (c) A refusal control: for every check and order, `L(i) = L(c)`
with `i ≠ c` is refused. -/

omit [DecidableEq Label] in
theorem not_checkAc_app (M : Check0 Label B) (o : Orders Label B)
    (σ : SubstA Label B) (L : Nat) (i c : B) (hic : i ≠ c) :
    ¬ CheckAc M o ⟨[], [], [], [.eq (.app L (.cons (.base i) .nil))
                                    (.app L (.cons (.base c) .nil))]⟩ σ := by
  intro h
  have := (h _ (List.mem_singleton_self _)).1
  simp [substTA, substArgsA, canonA, canonArgsA] at this
  exact hic this

end CanonExample

end Composition.App

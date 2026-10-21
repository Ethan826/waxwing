/-
Singleton-base shape split: witnesses and validity, using the semantic
facts in ShapeSplitCore. The public statements retain their assumptions.
-/
import Composition.TypedAttack.ShapeSplitCore

namespace Composition.TypedAttack

open Composition Composition.Syntax

variable {B : Type}

/-- The witness for shape `i`: `uᵢ` holds `f` at `a`, every other `mⱼ`
holds its default, `β1 β2` and `w` as given. -/
def wit (i : Nat) (a β1 β2 : G Nat Unit) (w : Row Nat (G Nat Unit)) :
    Assign Nat Unit :=
  ⟨fun n => if n = 1 then β1 else β2,
   fun r => if r = i then single 0 a
     else if r = 4 ∧ i ≠ 1 then single 0 (.base ())
     else if r = 5 ∧ i ≠ 2 then single 0 (.arrow β1 β2)
     else if r = 6 ∧ i ≠ 3 then single 0 (.record w)
     else if r = 7 then w else Row.empty⟩

section Witness

variable {θR : Assign Nat Unit}

private theorem sat_wit {i : Nat} {a β1 β2 : G Nat Unit}
    {w : Row Nat (G Nat Unit)} (hα : θR.ty 0 = a)
    (h : (i = 1 ∧ a = .base ()) ∨ (i = 2 ∧ a = .arrow β1 β2) ∨
      (i = 3 ∧ a = .record w ∧ β1 = .base () ∧ β2 = .base ())) :
    Sat (combine (shapeSplit ()) θR
      (wit i a β1 β2 (if i = 3 then w else Row.empty))) (shapeSplit ()).B := by
  intro x hx
  simp only [shapeSplit, List.mem_cons, List.not_mem_nil, or_false] at hx
  rcases h with ⟨rfl, rfl⟩ | ⟨rfl, rfl⟩ | ⟨rfl, rfl, rfl, rfl⟩ <;>
    rcases hx with rfl | rfl | rfl | rfl <;>
    simp [Holds, tl, evalT_tails, evalT_fOf, combine, wit, hα, composeAll,
      compose_empty, empty_compose, shapeSplit, evalT, evalF]

/-- Every rigid value has one of the three shapes, each with its
witness. -/
private theorem shapes (a : G Nat Unit) :
    ∃ i β1 β2 w, ((i = 1 ∧ a = .base ()) ∨ (i = 2 ∧ a = .arrow β1 β2) ∨
      (i = 3 ∧ a = .record w ∧ β1 = .base () ∧ β2 = .base ())) ∧
      (FinG a → FinG β1 ∧ FinG β2 ∧ FinG (G.record (Label := Nat)
        (if i = 3 then w else Row.empty))) := by
  cases a with
  | base b => exact ⟨1, .base (), .base (), Row.empty, Or.inl ⟨rfl, rfl⟩,
      fun _ => ⟨trivial, trivial, finG_emptyG⟩⟩
  | arrow x y => exact ⟨2, x, y, Row.empty, Or.inr (Or.inl ⟨rfl, rfl⟩),
      fun h => ⟨h.1, h.2, finG_emptyG⟩⟩
  | record ρ => exact ⟨3, .base (), .base (), ρ,
      Or.inr (Or.inr ⟨rfl, rfl, rfl, rfl⟩), fun h => ⟨trivial, trivial, h⟩⟩

end Witness

theorem finG_single {g : G Nat B} (h : FinG g) :
    FinG (.record (single 0 g)) := by
  refine (finG_record _).mpr ⟨⟨[0], fun k hk => ?_⟩, fun k => ?_⟩
  · by_cases hk0 : k = 0
    · simp [hk0]
    · simp [single, hk0] at hk
  · unfold single
    split
    · exact h
    · trivial

theorem wit_fin {i : Nat} {a β1 β2 : G Nat Unit} {w : Row Nat (G Nat Unit)}
    (ha : FinG a) (h1 : FinG β1) (h2 : FinG β2) (hw : FinG (.record w)) :
    FinAssign (wit i a β1 β2 w) := by
  refine ⟨fun n => ?_, fun r => ?_⟩
  · simp only [wit]
    split
    · exact h1
    · exact h2
  · simp only [wit]
    split
    · exact finG_single ha
    split
    · exact finG_single trivial
    split
    · exact finG_single ⟨h1, h2⟩
    split
    · exact finG_single hw
    split
    · exact hw
    · exact finG_emptyG

/-- With one base type, the signature is valid: the witness depends on
`α`'s shape. -/
theorem shapeSplit_valid : ValidAll (shapeSplit () : SigProblem Nat Unit) := by
  intro θR _
  obtain ⟨i, β1, β2, w, h, -⟩ := shapes (θR.ty 0)
  exact ⟨_, sat_wit rfl h⟩

/-- The same over finite values (dossier §14.8, `ValidFin`), with finite
witnesses. -/
theorem shapeSplit_validFin :
    ValidFin (shapeSplit () : SigProblem Nat Unit) := by
  intro θR hty _ _
  have ha : FinG (θR.ty 0) := hty 0 (by simp [shapeSplit])
  obtain ⟨i, β1, β2, w, h, hf⟩ := shapes (θR.ty 0)
  obtain ⟨h1, h2, hw⟩ := hf ha
  exact ⟨_, wit_fin ha h1 h2 hw, sat_wit rfl h⟩

/-- With a second base type `b'`, no flexible assignment solves the body
at `α = b'`: it has none of the three shapes. -/
theorem no_solution_at {b b' : B} (hb : b ≠ b') {θR θF : Assign Nat B}
    (hα : θR.ty 0 = .base b')
    (h : Sat (combine (shapeSplit b) θR θF) (shapeSplit b).B) : False := by
  obtain ⟨⟨i, hi, hne⟩, hat⟩ := holder h
  obtain ⟨g, hg⟩ := Option.ne_none_iff_exists'.mp hne
  have hgα := hat i hi g hg
  rw [hα] at hgα
  simp only [List.mem_cons, List.not_mem_nil, or_false] at hi
  rcases hi with rfl | rfl | rfl
  · rw [u1_base h hg] at hgα
    cases hgα
    exact hb rfl
  · obtain ⟨x, y, rfl⟩ := u2_arrow h hg
    cases hgα
  · obtain ⟨ρ, rfl⟩ := u3_record h hg
    cases hgα

/-- So with a second base type the signature is not valid, over all
values or over finite ones. -/
theorem shapeSplit_not_valid {b b' : B} (hb : b ≠ b') :
    ¬ ValidAll (shapeSplit b) ∧ ¬ ValidFin (shapeSplit b) := by
  let θR : Assign Nat B := ⟨fun _ => .base b', fun _ => Row.empty⟩
  have hD : Sat θR (shapeSplit b).D := by simp [Sat, shapeSplit]
  refine ⟨fun hv => ?_, fun hv => ?_⟩
  · obtain ⟨θF, h⟩ := hv θR hD
    exact no_solution_at hb rfl h
  · obtain ⟨θF, -, h⟩ := hv θR (fun _ _ => trivial)
      (fun _ h => by simp [shapeSplit] at h) hD
    exact no_solution_at hb rfl h

/-- No witness family fixes whether `u1` holds `f`: it must hold it when
`α` is the base type and must not when `α` is an arrow. -/
theorem no_uniform_presence :
    ¬ ∃ p : Bool, ∀ θR : Assign Nat Unit, Sat θR (shapeSplit ()).D →
      ∃ θF, Sat (combine (shapeSplit ()) θR θF) (shapeSplit ()).B ∧
        (θF.row 1 0).isSome = p := by
  rintro ⟨p, hp⟩
  have hD : ∀ θR : Assign Nat Unit, Sat θR (shapeSplit ()).D := by
    intro θR a ha
    simp [shapeSplit] at ha
  obtain ⟨θ1, h1, e1⟩ := hp ⟨fun _ => .base (), fun _ => Row.empty⟩ (hD _)
  obtain ⟨θ2, h2, e2⟩ :=
    hp ⟨fun _ => .arrow (.base ()) (.base ()), fun _ => Row.empty⟩ (hD _)
  have t1 := (u1_holds_iff h1).mpr rfl
  have t2 : ¬ θ2.row 1 0 ≠ none := fun hn => by
    have := (u1_holds_iff h2).mp hn
    cases this
  rw [← e2, Option.isSome_iff_ne_none.mpr t1] at e1
  exact t2 (Option.isSome_iff_ne_none.mp e1.symm)

/-- The closed singleton-base example loses finite validity when another
opaque base is admitted. This chooses no source-language type universe. -/
theorem validity_not_extension_stable :
    ValidFin (shapeSplit () : SigProblem Nat Unit) ∧
      ¬ ValidFin (shapeSplit false : SigProblem Nat Bool) :=
  ⟨shapeSplit_validFin,
    (shapeSplit_not_valid (b := false) (b' := true) (by decide)).2⟩

end Composition.TypedAttack

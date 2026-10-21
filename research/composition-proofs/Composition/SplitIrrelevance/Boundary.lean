/-
The boundary examples (statements.md §1.3, §4): E2c, the `show` site in
the caller, typed through the split (review finding S1); and E3, a
row-variable projection, which makes the two splits of E2 run
differently. Both use E2's witnesses (Examples.lean), which meet
`divide`'s clauses and give its parameter the same image
(`sat_divide₁`, `sat_divide₂`, `param_image`).
-/
import Composition.SplitIrrelevance.Examples

namespace Composition.SplitIrrelevance.Examples

open Composition Composition.Syntax Composition.SplitIrrelevance

/-! ### E2c: the `show` site in the caller, typed through the split -/

/-- `main` passes `fn(p) => show(p)` for `k: ({ ...u }) -> Text`; `p`'s
type is `main`'s flexible row 4, which the split solves to `u`'s image.
`divide` has no site. -/
def e2c (w : Assign Nat Unit) : Prog Nat Unit where
  body f := if f = 0 then .call 1 0 (.lam (.site 0 (.var 0))) else .num 0
  ty _ := .record .nil [4]
  ok _ := Printable
  wit _ _ := w
  loc f θ := if f = 0 then key Row.empty Row.empty Row.empty Row.empty
    (w.row 0) else θ
  D f := if f = 1 then divideD else []
  Req f θ := f ≠ 1 ∨ Sat θ divideD

theorem e2c_variant : SplitVariant (e2c wit₁) (e2c wit₂) :=
  ⟨rfl, rfl, rfl, rfl, rfl⟩

theorem e2c_refused (θ : Assign Nat Unit) :
    ¬ Accepted (e2c wit₁) ((e2c wit₁).loc 0 θ) ((e2c wit₁).body 0) := by
  intro h
  have := h 0 _ (.here (by
    simp only [e2c]; exact .sub (.call _ _ _) (.sub (.lam _) (.site 0 _))))
  obtain ⟨g, hg, hp⟩ := this
  simp only [e2c, evalT_one] at hg
  injection hg with hg; subst hg
  exact not_printable_rowF hp

theorem e2c_covers₂ : Covers (e2c wit₂) := by
  intro f θ hr
  by_cases h0 : f = 0
  · subst h0
    refine ⟨fun k hk => ?_, fun g k hk => ?_⟩
    · refine ⟨_, by simp only [e2c]; exact evalT_one _ 4, ?_⟩
      simpa [e2c, key, wit₂] using printable_empty
    · have := callIn_mem hk
      simp [e2c, calls] at this
      obtain ⟨rfl, rfl⟩ := this
      exact Or.inr sat_divide₂
  · refine ⟨fun k hk => ?_, fun g k hk => ?_⟩
    · have := localSite_mem hk; simp [e2c, sites, h0] at this
    · have := callIn_mem hk; simp [e2c, calls, h0] at this

/-- The caller's own site makes split 1 invalid in the model. -/
theorem e2c_not_covers₁ : ¬ Covers (e2c wit₁) := by
  intro hc
  obtain ⟨g, hg, hp⟩ := (hc 0 wit₁ (Or.inl (by simp))).1 0 (by
    simp only [e2c]; exact .sub (.call _ _ _) (.sub (.lam _) (.site 0 _)))
  simp only [e2c, evalT_one] at hg
  injection hg with hg; subst hg
  exact not_printable_rowF hp

/-- C at work on the caller-side site. -/
theorem e2c_accepted₂ (θ : Assign Nat Unit) :
    Accepted (e2c wit₂) ((e2c wit₂).loc 0 θ) ((e2c wit₂).body 0) :=
  accepted_of_covers (f := 0) e2c_covers₂ (Or.inl (by simp))

/-! ### E3: a row-variable projection observes the split -/

/-- `divide`'s body is `project({ ...u }, whole)`. -/
def e3 (w : Assign Nat Unit) : Prog Nat Unit :=
  { e2 w with
    body := fun f => if f = 0 then .call 1 0 arg
      else .project 0 (.var 0) }

theorem e3_variant : SplitVariant (e3 wit₁) (e3 wit₂) :=
  ⟨rfl, rfl, rfl, rfl, rfl⟩

theorem e3_differs (θ : Assign Nat Unit) :
    eval (e3 wit₁) θ 4 [] ((e3 wit₁).body 0) =
        some (.record [(1, .clo [] (.var 0))]) ∧
      eval (e3 wit₂) θ 4 [] ((e3 wit₂).body 0) = some (.record []) := by
  constructor <;>
    simp [e3, e2, eval, arg, keysOf, evalT_one, uTy, wit₁, wit₂, key,
      rowF, Row.empty]

end Composition.SplitIrrelevance.Examples

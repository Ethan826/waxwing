/-
Non-vacuity of the presence results (dossier §18.12), first written by
the adversarial reviewer of the integrated proofs. Infinitely many
labels exist (`Nat`), so O1 and D2 apply; with finitely many labels
O1's equivalence fails (`tiny`), so its hypothesis does work. The
presence form of `split` is valid, through O3 and O1, and D2 gives its
uniform terms; a problem asking a rigid set to be empty is not valid.
-/
import Composition.Presence.Main

namespace Composition.Presence.Examples

open Composition.Presence

theorem foldr_add_ge : ∀ (l : List Nat), ∀ x ∈ l, x ≤ l.foldr (· + ·) 0
  | [], _, h => by simp at h
  | y :: ys, x, h => by
    simp only [List.mem_cons] at h
    rcases h with rfl | h
    · simp
    · have := foldr_add_ge ys x h
      simp only [List.foldr_cons]
      omega

theorem infNat : InfiniteLabels Nat := fun ls =>
  ⟨ls.foldr (· + ·) 0 + 1, fun h => by
    have := foldr_add_ge ls _ h
    omega⟩

theorem not_infBool : ¬ InfiniteLabels Bool := by
  intro h
  obtain ⟨k, hk⟩ := h [true, false]
  cases k <;> simp at hk

/-- `∀ r₀ r₁ r₂. r₁ ∩ r₂ = ∅ ⇒ ∃ u v. r₀ = u ∪ v, u ∩ v = ∅, u ∩ r₁ = ∅,
v ∩ r₂ = ∅`: the presence form of `split`. -/
def split : PProblem Nat :=
  { D := [.disj (.rigid 1) (.rigid 2)],
    B := [.eq (.rigid 0) (.union (.flex 0) (.flex 1)),
      .disj (.flex 0) (.flex 1), .disj (.flex 0) (.rigid 1),
      .disj (.flex 1) (.rigid 2)] }

theorem split_scoped : Scoped split := by
  intro a ha
  simp [split] at ha
  subst ha
  simp [PAtom.flexFree, SExpr.flexFree]

/-- Per region: `u = r₀ ∖ r₁`, `v = r₀ ∩ r₁`. -/
theorem split_bit : BitValid split := by
  intro b hD
  have h12 : ¬ (b 1 = true ∧ b 2 = true) := by
    simpa [HoldsB, evalB] using hD (.disj (.rigid 1) (.rigid 2))
      (by simp [split])
  refine ⟨fun j => if j = 0 then (b 0 && !b 1)
    else if j = 1 then (b 0 && b 1) else false, ?_⟩
  intro a ha
  simp [split] at ha
  rcases ha with rfl | rfl | rfl | rfl <;>
    cases h0 : b 0 <;> cases h1 : b 1 <;> cases h2 : b 2 <;>
    simp_all [HoldsB, evalB]

theorem split_written : written split = [] := by
  simp [written, split, PAtom.labels, SExpr.labels]

theorem split_valid : Valid split := by
  refine (o3 split split_scoped).mpr
    (Or.inr ⟨?_, (o1 infNat split split_scoped).mpr split_bit⟩)
  intro π _ _
  refine ⟨fun _ _ => False, fun _ _ h => h.elim, ?_⟩
  intro a _
  cases a <;> simp [HoldsOn, split_written]

-- D2 applies to `split`: uniform terms exist.
example := d2 infNat split split_scoped split_valid

/-- `r₀ ∩ r₀ = ∅`, with no clause: not valid. -/
def bad : PProblem Nat := { D := [], B := [.disj (.rigid 0) (.rigid 0)] }

theorem bad_not_valid : ¬ Valid bad := by
  intro h
  obtain ⟨σ, -, hB⟩ := h (fun i k => i = 0 ∧ k = 0)
    (fun _ => ⟨[0], by intro l hl; simp [hl.2]⟩)
    (by intro a ha; simp [bad] at ha)
  have := hB (.disj (.rigid 0) (.rigid 0)) (by simp [bad]) 0 trivial
  simp [eval] at this

theorem bad_not_bit : ¬ BitValid bad := by
  intro h
  obtain ⟨s, hs⟩ := h (fun _ => true) (by intro a ha; simp [bad] at ha)
  have := hs (.disj (.rigid 0) (.rigid 0)) (by simp [bad])
  simp [HoldsB, evalB] at this

/-- With one label, written: `RestValid` holds (there is no rest) but
`BitValid` fails, so O1 needs infinitely many labels. -/
def tiny : PProblem Unit :=
  { D := [], B := [.disj (.rigid 0) (.rigid 0), .lacks () (.rigid 0)] }

theorem tiny_rest : RestValid tiny := by
  intro R _ _ _
  refine ⟨fun _ _ => False, fun _ => ⟨[], by simp⟩, by simp, ?_⟩
  have hw : ∀ k : Unit, k ∈ written tiny := by
    intro k
    simp [written, tiny, PAtom.labels, SExpr.labels]
  intro a _
  cases a <;> simp [HoldsOn, hw]

theorem tiny_not_bit : ¬ BitValid tiny := by
  intro h
  obtain ⟨s, hs⟩ := h (fun _ => true) (by intro a ha; simp [tiny] at ha)
  have := hs (.disj (.rigid 0) (.rigid 0)) (by simp [tiny])
  simp [HoldsB, evalB] at this

end Composition.Presence.Examples

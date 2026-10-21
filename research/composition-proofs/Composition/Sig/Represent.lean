/-
K7b (dossier §16): every finite generic value, and every row whose
record is finite, is the denotation of some syntactic value. This is an
existence result, a `Prop` about semantic values (whose records are
functions): it is not, and is not offered as, an executable conversion
from semantic values to syntax. The proof eliminates existentials
inside `Prop` and happens not to need `Classical.choice`
(axioms.out); the theorems that use it (Complete.lean) do, through the
classical semantics.
-/
import Composition.Sig.Congr

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- A list `ls` of labels and a representative for each present value
give a list denoting `f` on `ls` and nothing elsewhere. -/
theorem represent_on (f : Row (GL Label) (GG Label B))
    (hv : ∀ k v, f k = some v → ∃ s, den s = v) :
    ∀ ls : List (GL Label), ∃ fs : List (GL Label × SG Label B),
      ∀ k, (k ∈ ls → denRow fs k = f k) ∧ (k ∉ ls → denRow fs k = none)
  | [] => ⟨[], fun _ => ⟨fun h => by simp at h, fun _ => rfl⟩⟩
  | k₀ :: rest => by
    obtain ⟨fs, hfs⟩ := represent_on f hv rest
    cases hk : f k₀ with
    | none =>
      refine ⟨fs, fun k => ⟨fun hm => ?_, fun hm => ?_⟩⟩
      · rcases List.mem_cons.mp hm with rfl | hm
        · by_cases hr : k ∈ rest
          · exact (hfs k).1 hr
          · rw [(hfs k).2 hr, hk]
        · exact (hfs k).1 hm
      · simp only [List.mem_cons, not_or] at hm
        exact (hfs k).2 hm.2
    | some v =>
      obtain ⟨s, hs⟩ := hv k₀ v hk
      refine ⟨(k₀, s) :: fs, fun k => ⟨fun hm => ?_, fun hm => ?_⟩⟩
      · by_cases h : k = k₀
        · subst h
          simp [denRow, hs, hk]
        · simp only [denRow, h, ↓reduceIte]
          rcases List.mem_cons.mp hm with h' | hm
          · exact absurd h' h
          · exact (hfs k).1 hm
      · simp only [List.mem_cons, not_or] at hm
        simp only [denRow, hm.1, ↓reduceIte]
        exact (hfs k).2 hm.2

/-- A finite row with represented values is a list's denotation. -/
theorem represent_row (f : Row (GL Label) (GG Label B)) (hf : FinRow f)
    (hv : ∀ k v, f k = some v → ∃ s, den s = v) :
    ∃ fs : List (GL Label × SG Label B), denRow fs = f := by
  obtain ⟨ls, hls⟩ := hf
  obtain ⟨fs, hfs⟩ := represent_on f hv ls
  refine ⟨fs, funext fun k => ?_⟩
  by_cases hk : k ∈ ls
  · exact (hfs k).1 hk
  · rw [(hfs k).2 hk]
    by_cases h : f k = none
    · exact h.symm
    · exact absurd (hls k h) hk

mutual
  /-- K7b. -/
  theorem represent : ∀ g : GG Label B, FinG g → ∃ s : SG Label B, den s = g
    | .base b, _ => ⟨.base b, rfl⟩
    | .arrow a c, h => by
      simp only [FinG] at h
      obtain ⟨sa, ha⟩ := represent a h.1
      obtain ⟨sc, hc⟩ := represent c h.2
      exact ⟨.arrow sa sc, by simp [den, ha, hc]⟩
    | .record f, h => by
      rw [finG_record] at h
      obtain ⟨fs, hfs⟩ := represent_row f h.1
        fun k v hk => representO (f k) (h.2 k) v hk
      exact ⟨.record fs, by simp [den, hfs]⟩

  theorem representO : ∀ (o : Option (GG Label B)), FinO o →
      ∀ v, o = some v → ∃ s : SG Label B, den s = v
    | none, _, _, h => by cases h
    | some g, h, v, hv => by
      simp only [Option.some.injEq] at hv
      subst hv
      exact represent g h
end

/-- K7b for rows. -/
theorem represent_record (f : Row (GL Label) (GG Label B))
    (h : FinG (.record f)) : ∃ fs : List (GL Label × SG Label B),
      denRow fs = f := by
  rw [finG_record] at h
  exact represent_row f h.1 fun k v hk => representO (f k) (h.2 k) v hk

end Composition.Syntax

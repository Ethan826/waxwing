/-
O1 (dossier §18.6, §18.11): with infinitely many labels, the rest part
over finite sets is valid iff the per-region check `BitValid` holds.

(⇒) Given bits `b` that `D` allows, take a label `k` no atom writes and
put `k` in exactly the rigid sets `b` selects. Every other label is in
no set, and every atom holds at the all-false bits, so `D` holds on the
rest; `RestValid` gives `S`, and `k`'s bits in `S` satisfy `B`.

(⇐) Given finite rests `R`, choose a flexible vector per bit vector:
all false when `B` already holds with all flexible bits false, else one
from `BitValid`. `S j k` holds when `k` is unwritten and the vector for
`k`'s bits has bit `j`. If `S j k`, `B` fails at `k`'s bits with all
flexible bits false, so some rigid set that `B` mentions holds `k`.
Finitely many indices are mentioned, so `S j` lies in a finite union of
the finite `R i`. (Choosing all false there is what keeps `S` finite:
the rigid indices are unbounded, but `B` mentions finitely many.)
`Scoped` is not needed.
-/
import Composition.Presence.O1Bits

namespace Composition.Presence

variable {Label : Type}

open Classical

/-- A flexible vector for rigid bits `b`: all false when that satisfies
`B`, otherwise one satisfying `B` if any does. -/
noncomputable def chooseS (B : List (PAtom Label)) (b : Nat → Bool) :
    Nat → Bool :=
  if ∀ a ∈ B, HoldsB b (fun _ => false) a then fun _ => false
  else if h : ∃ s : Nat → Bool, ∀ a ∈ B, HoldsB b s a then
    Classical.choose h
  else fun _ => false

/-- `chooseS` satisfies `B` whenever some vector does. -/
theorem chooseS_spec (B : List (PAtom Label)) (b : Nat → Bool)
    (h : ∃ s : Nat → Bool, ∀ a ∈ B, HoldsB b s a) :
    ∀ a ∈ B, HoldsB b (chooseS B b) a := by
  unfold chooseS
  split
  · assumption
  · exact Classical.choose_spec h

/-- A bit of `chooseS` is set only when `B` fails at all-false flexible
bits, hence only when a rigid set some atom of `B` mentions has bit
set. -/
theorem chooseS_rigid (B : List (PAtom Label)) (b : Nat → Bool) (j : Nat)
    (h : chooseS B b j = true) : ∃ a ∈ B, ∃ i ∈ a.rigids, b i = true := by
  unfold chooseS at h
  split at h
  · cases h
  · rename_i hB
    refine Classical.byContradiction fun hno => hB fun a ha => ?_
    refine holdsB_zero_of_rigids b a fun i hi => ?_
    cases hbi : b i
    · rfl
    · exact absurd ⟨a, ha, i, hi, hbi⟩ hno

/-- (⇒) The per-region check from the rest part. -/
theorem bitValid_of_restValid (hinf : InfiniteLabels Label)
    (P : PProblem Label) (hR : RestValid P) : BitValid P := by
  intro b hb
  obtain ⟨k, hk⟩ := hinf (written P)
  -- `k` is in exactly the rigid sets `b` selects.
  let R : Nat → LSet Label := fun i k' => k' = k ∧ b i = true
  have hRk : bits R k = b := by
    funext i
    cases hbi : b i
    · exact bits_false (by simp [R, hbi])
    · exact bits_true (by simp [R, hbi])
  have hR0 : ∀ k', k' ≠ k → bits R k' = fun _ => false := by
    intro k' hne
    funext i
    exact bits_false (fun h => hne h.1)
  have hfin : ∀ i, FinSet (R i) := fun i =>
    ⟨[k], fun k' h => by simp [h.1]⟩
  have hout : ∀ i k', R i k' → k' ∉ written P := fun i k' h => by
    rw [h.1]; exact hk
  have hD : SatOn (· ∉ written P) R noFlex P.D := by
    intro a ha
    rw [holdsOn_rest_iff (written P) R noFlex a
      (labels_written P a (List.mem_append_left _ ha))]
    intro k' _
    rw [bits_noFlex]
    by_cases e : k' = k
    · rw [e, hRk]; exact hb a ha
    · rw [hR0 k' e]
      exact holdsB_zero_of_rigids _ a fun _ _ => rfl
  obtain ⟨S, _, _, hB⟩ := hR R hfin hout hD
  refine ⟨bits S k, fun a ha => ?_⟩
  have h := (holdsOn_rest_iff (written P) R S a
    (labels_written P a (List.mem_append_right _ ha))).1 (hB a ha) k hk
  rwa [hRk] at h

/-- (⇐) The rest part from the per-region check. -/
theorem restValid_of_bitValid (P : PProblem Label) (hb : BitValid P) :
    RestValid P := by
  intro R hfin hout hD
  let f := chooseS P.B
  let S : Nat → LSet Label := fun j k =>
    k ∉ written P ∧ f (bits R k) j = true
  -- A finite cover of every `S j`: the lists of the rigid sets `B`
  -- mentions.
  let cover : List Label :=
    (P.B.flatMap PAtom.rigids).flatMap fun i => Classical.choose (hfin i)
  have hS : ∀ j, FinSet (S j) := by
    intro j
    refine ⟨cover, fun k hk => ?_⟩
    obtain ⟨a, ha, i, hi, hbi⟩ := chooseS_rigid P.B (bits R k) j hk.2
    have hRi : R i k := of_bits hbi
    simp only [cover, List.mem_flatMap]
    exact ⟨i, ⟨a, ha, hi⟩, Classical.choose_spec (hfin i) k hRi⟩
  have hSk : ∀ k, k ∉ written P → bits S k = f (bits R k) := by
    intro k hk
    funext j
    cases hj : f (bits R k) j
    · exact bits_false (fun h => by
        have h2 : f (bits R k) j = true := h.2
        rw [hj] at h2; cases h2)
    · exact bits_true ⟨hk, hj⟩
  refine ⟨S, hS, fun j k h => h.1, fun a ha => ?_⟩
  rw [holdsOn_rest_iff (written P) R S a
    (labels_written P a (List.mem_append_right _ ha))]
  intro k hk
  rw [hSk k hk]
  -- `D` holds at `k`'s bits, so `BitValid` supplies a vector.
  have hDk : ∀ d ∈ P.D, HoldsB (bits R k) (fun _ => false) d := by
    intro d hd
    have h := (holdsOn_rest_iff (written P) R noFlex d
      (labels_written P d (List.mem_append_left _ hd))).1 (hD d hd) k hk
    rwa [bits_noFlex] at h
  exact chooseS_spec P.B (bits R k) (hb (bits R k) hDk) a ha

/-- O1. With infinitely many labels, the rest part over finite sets is
valid iff the per-region check holds. -/
theorem o1 {Label : Type} : O1 (Label := Label) :=
  fun hinf P _ =>
    ⟨bitValid_of_restValid hinf P, restValid_of_bitValid P⟩

end Composition.Presence

/-
Proof of E3 (Bridge/Extension.lean): a finite value uses finitely many
bases. A finite row holds finitely many labels, and each field uses
finitely many bases by induction; their union bounds the record.
-/
import Composition.Typed.Bridge.Extension

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type}

mutual
  theorem basesWithin_mono {s s' : B → Prop} (hs : ∀ b, s b → s' b) :
      ∀ v : G Label B, BasesWithin s v → BasesWithin s' v
    | .base b, hv => hs b hv
    | .arrow a c, hv =>
      ⟨basesWithin_mono hs a hv.1, basesWithin_mono hs c hv.2⟩
    | .record r, hv => fun k => basesWithinO_mono hs (r k) (hv k)

  theorem basesWithinO_mono {s s' : B → Prop} (hs : ∀ b, s b → s' b) :
      ∀ o : Option (G Label B), BasesWithinO s o → BasesWithinO s' o
    | none, _ => trivial
    | some v, hv => basesWithin_mono hs v hv
end

mutual
  theorem finSupportG : ∀ v : G Label B, FinG v →
      ∃ bs : List B, BasesWithin (· ∈ bs) v
    | .base b, _ => ⟨[b], List.mem_singleton_self b⟩
    | .arrow a c, hv => by
      obtain ⟨xs, hx⟩ := finSupportG a hv.1
      obtain ⟨ys, hy⟩ := finSupportG c hv.2
      exact ⟨xs ++ ys,
        basesWithin_mono (fun _ hb => List.mem_append_left _ hb) a hx,
        basesWithin_mono (fun _ hb => List.mem_append_right _ hb) c hy⟩
    | .record r, hv => by
      obtain ⟨⟨ls, hls⟩, hr⟩ := (finG_record r).mp hv
      have hk : ∀ k, ∃ bs : List B, BasesWithinO (· ∈ bs) (r k) :=
        fun k => finSupportO (r k) (hr k)
      refine ⟨ls.flatMap fun k => Classical.choose (hk k), fun k => ?_⟩
      by_cases hn : r k = none
      · rw [hn]
        trivial
      · exact basesWithinO_mono
          (fun _ hb => List.mem_flatMap.mpr ⟨k, hls k hn, hb⟩) (r k)
          (Classical.choose_spec (hk k))

  theorem finSupportO : ∀ o : Option (G Label B), FinO o →
      ∃ bs : List B, BasesWithinO (· ∈ bs) o
    | none, _ => ⟨[], trivial⟩
    | some v, hv => finSupportG v hv
end

/-- E3. -/
theorem finSupport : FinSupport (Label := Label) (B := B) :=
  finSupportG

end Composition.Typed

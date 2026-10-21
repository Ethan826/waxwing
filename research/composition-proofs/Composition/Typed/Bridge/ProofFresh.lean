/-
B2c, B2f and B2g (Fresh.lean). B2c unfolds `Fresh`. B2f takes E3
(`FinSupport`, another tranche) as a hypothesis, at the generic label
and base types: each finite rigid value of `θs` has a finite list of
bases, and `U` collects the constants among them. B2g puts B2c, B2f
and E1 (also a hypothesis) together.
-/
import Composition.Typed.Bridge.Fresh

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
/-- B2c. -/
theorem freshGivesFreshOn :
    FreshGivesFreshOn (Label := Label) (B := B) :=
  fun _ _ _ hF => ⟨⟨hF.1, hF.2.1⟩, fun _ =>
    ⟨fun c _ c' _ h => hF.2.2.1 c c' h, fun c _ b hb h =>
      hF.2.2.2 c (by simpa [h] using hb)⟩⟩

omit [DecidableEq Label] in
mutual
  theorem bwFresh_mono {B' : Type} {s s' : B' → Prop}
      (h : ∀ b, s b → s' b) :
      ∀ g : G Label B', BasesWithin s g → BasesWithin s' g
    | .base b, hg => h b hg
    | .arrow a c, hg => by
      simp only [BasesWithin] at hg ⊢
      exact ⟨bwFresh_mono h a hg.1, bwFresh_mono h c hg.2⟩
    | .record f, hg => by
      simp only [BasesWithin] at hg ⊢
      exact fun k => basesWithinO_monoFresh h (f k) (hg k)

  theorem basesWithinO_monoFresh {B' : Type} {s s' : B' → Prop}
      (h : ∀ b, s b → s' b) :
      ∀ o : Option (G Label B'), BasesWithinO s o → BasesWithinO s' o
    | none, _ => trivial
    | some g, hg => bwFresh_mono h g hg
end

/-- The constant a generic base names, if any. -/
def constOf : CB Label B → Option (CConst Label)
  | .inl _ => none
  | .inr c => some c

open Classical in
/-- A list of bases a finite value uses (by E3), or `[]`. -/
noncomputable def supp
    (hE3 : FinSupport (Label := CL Label) (B := CB Label B))
    (g : CG Label B) : List (CB Label B) :=
  if h : FinG g then Classical.choose (hE3 g h) else []

omit [DecidableEq Label] in
theorem supp_spec
    (hE3 : FinSupport (Label := CL Label) (B := CB Label B))
    {g : CG Label B} (h : FinG g) :
    BasesWithin (· ∈ supp hE3 g) g := by
  simp only [supp, h, ↓reduceDIte]
  exact Classical.choose_spec (hE3 g h)

omit [DecidableEq Label] in
/-- B2f, from E3 at the generic label and base types. -/
theorem constsFinite_of
    (hE3 : FinSupport (Label := CL Label) (B := CB Label B)) :
    ConstsFinite (Label := Label) (B := B) := by
  intro P θs hfin
  refine ⟨(P.rigidTy.flatMap (fun n => supp hE3 (θs.ty n)) ++
    P.rigidRow.flatMap (fun r => supp hE3 (.record (θs.row r)))).filterMap
      constOf, fun n hn => ?_, fun r hr => ?_⟩
  · refine bwFresh_mono (fun b hb => ?_) _ (supp_spec hE3 (hfin.1 n hn))
    cases b with
    | inl _ => trivial
    | inr c =>
      exact List.mem_filterMap.mpr ⟨.inr c, List.mem_append_left _
        (List.mem_flatMap.mpr ⟨n, hn, hb⟩), rfl⟩
  · refine bwFresh_mono (fun b hb => ?_) _ (supp_spec hE3 (hfin.2 r hr))
    cases b with
    | inl _ => trivial
    | inr c =>
      exact List.mem_filterMap.mpr ⟨.inr c, List.mem_append_right _
        (List.mem_flatMap.mpr ⟨r, hr, hb⟩), rfl⟩

/-- B2g, from E1 and E3 (through B2f) and B2c. Its `WithinC` premise
is unused, as the second review noted. -/
theorem completeOnGivesComplete_of
    (hE1 : MapBaseId (Label := Label) (B := B))
    (hE3 : FinSupport (Label := CL Label) (B := CB Label B)) :
    CompleteOnGivesComplete (Label := Label) (B := B) := by
  intro P π θs z e hF _ hg
  obtain ⟨U, hU⟩ := constsFinite_of hE3 P θs hg.1
  have h := freshGivesFreshOn P z e hF
  exact ⟨U, h.1, h.2 U, hU, hE1 P⟩

end Composition.Typed

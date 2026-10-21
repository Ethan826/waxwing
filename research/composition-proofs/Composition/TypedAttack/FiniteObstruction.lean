/-
The generalized equation family allows arbitrary arrow/record target
choices. Every solution forces type-dependent placement. No generated
Nat-indexed SigProblem or Waxwing source translation is asserted.
-/
import Composition.TypedAttack.FiniteEquations

namespace Composition.TypedAttack.FiniteShapes

open Composition Composition.Syntax

/-- General branch equations, with independently chosen target types
subject only to each branch's required type constructor. -/
def GeneralFamily (bs : List B) (a : G Nat B)
    (t : Branch B → G Nat B)
    (u m : Branch B → Row Nat (G Nat B)) : Prop :=
  (∀ tag ∈ branches bs, Matches tag (t tag)) ∧
  composeAll ((branches bs).map u) = some (single 0 a) ∧
  ∀ tag ∈ branches bs,
    compose (u tag) (m tag) = some (single 0 (t tag))

private theorem value_of_member {V : Type}
    {rs : List (Row Nat V)} {out : Row Nat V}
    (h : composeAll rs = some out) {r : Row Nat V} (hr : r ∈ rs)
    {l : Nat} {g : V} (hg : r l = some g) : out l = some g := by
  induction rs generalizing out with
  | nil => simp at hr
  | cons x xs ih =>
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨y, hy, hc⟩ := h
    obtain ⟨hd, rfl⟩ := compose_eq_some.mp hc
    rcases List.mem_cons.mp hr with rfl | hr
    · simp [union, hg]
    · have hv := ih hy hr
      rcases hd l with hx | hx
      · simp [union, hx, hv]
      · simp [hv] at hx

/-- The forced-presence argument applies to all solutions, not only
to the canonical witnesses used to establish existence. -/
theorem family_compatible {bs : List B} {a : G Nat B}
    {t : Branch B → G Nat B} {u m : Branch B → Row Nat (G Nat B)}
    (hf : GeneralFamily bs a t u m) : Compatible bs a u := by
  obtain ⟨htypes, hwhole, hpairs⟩ := hf
  constructor
  · apply Classical.byContradiction
    intro hn
    have hnone : ∀ tag ∈ branches bs, u tag 0 = none := by
      intro tag htag
      cases he : u tag 0 with
      | none => rfl
      | some g =>
        have hg := value_of_member hwhole
          (List.mem_map_of_mem htag) he
        have hga : g = a := by simpa [single] using hg.symm
        subst g
        exact False.elim (hn ⟨tag, htag, he⟩)
    have h := (composeAll_none_iff hwhole 0).mpr (by
      intro r hr
      obtain ⟨tag, ht, rfl⟩ := List.mem_map.mp hr
      exact hnone tag ht)
    simp [single] at h
  · intro tag htag g hg
    have hg' := value_of_member hwhole
      (List.mem_map_of_mem htag) hg
    have hga : g = a := by simpa [single] using hg'.symm
    obtain ⟨_, hout⟩ := compose_eq_some.mp (hpairs tag htag)
    have hv := congrFun hout 0
    simp only [single, ite_true, union, hg] at hv
    have hgt : g = t tag := Option.some.inj hv.symm
    exact ⟨hgt ▸ htypes tag htag, hga⟩

theorem target_matches (a : G Nat B) (tag : Branch B) :
    Matches tag (target a tag) := by
  cases tag <;> cases a <;> simp [target, Matches, emptyG]

/-- Every finite input has finite targets and finite part/remainder
rows solving the general family when all base constants are listed. -/
theorem general_family_valid [DecidableEq B] (bs : List B)
    (hn : bs.Nodup) (hc : Complete bs) (a : G Nat B) (ha : FinG a) :
    ∃ t u m, GeneralFamily bs a t u m ∧
      (∀ tag, FinG (t tag)) ∧
      (∀ tag, FinG (.record (u tag))) ∧
      (∀ tag, FinG (.record (m tag))) := by
  obtain ⟨u, m, ⟨hw, hm⟩, _, huf, hmf⟩ :=
    equation_family_valid bs hn hc a ha
  exact ⟨target a, u, m,
    ⟨fun tag _ => target_matches a tag, hw, hm⟩,
    target_finite ha, huf, hmf⟩

/-- No family of solutions, even with arbitrary target choices, fixes
the base arm's presence across all finite input types. -/
theorem general_family_no_uniform (bs : List B) (b : B) (hb : b ∈ bs) :
    ¬ ∃ p : Bool, ∀ a : G Nat B, FinG a →
      ∃ t u m, GeneralFamily bs a t u m ∧
        (u (.base b) 0).isSome = p := by
  rintro ⟨p, hp⟩
  apply no_uniform_compatible bs b hb
  refine ⟨p, fun a ha => ?_⟩
  obtain ⟨t, u, m, hf, he⟩ := hp a ha
  exact ⟨u, family_compatible hf, he⟩


/-- An omitted base invalidates the family; adding base types without
adding their arms is not a confirmation of template completeness. -/
theorem general_family_missing_base {bs : List B} {b : B}
    (hb : b ∉ bs) :
    ¬ ∃ t u m, GeneralFamily bs (.base b) t u m := by
  rintro ⟨t, u, m, hf⟩
  have hc := family_compatible hf
  obtain ⟨tag, ht, hg⟩ := hc.1
  have hm := (hc.2 tag ht _ hg).1
  cases tag with
  | base c =>
    simp only [Matches] at hm
    subst c
    simp [branches] at ht
    exact hb ht
  | arrow => exact hm
  | record => exact hm

/-- The two-base instance includes both base arms, not only one. -/
theorem two_base_valid (a : G Nat Bool) (ha : FinG a) :
    ∃ t u m, GeneralFamily [false, true] a t u m ∧
      (∀ tag, FinG (t tag)) ∧
      (∀ tag, FinG (.record (u tag))) ∧
      (∀ tag, FinG (.record (m tag))) :=
  general_family_valid [false, true] (by decide) bool_base_coverage a ha

theorem two_base_not_uniform :
    ¬ ∃ p : Bool, ∀ a : G Nat Bool, FinG a →
      ∃ t u m, GeneralFamily [false, true] a t u m ∧
        (u (.base false) 0).isSome = p :=
  general_family_no_uniform [false, true] false (by simp)

/-- Four bases also instantiate validity. This is not the full
Waxwing type universe, which has further type constructors. -/
theorem four_base_valid (a : G Nat (Fin 4)) (ha : FinG a) :
    ∃ t u m, GeneralFamily (List.finRange 4) a t u m ∧
      (∀ tag, FinG (t tag)) ∧
      (∀ tag, FinG (.record (u tag))) ∧
      (∀ tag, FinG (.record (m tag))) :=
  general_family_valid (List.finRange 4) (by decide)
    four_base_coverage a ha


end Composition.TypedAttack.FiniteShapes

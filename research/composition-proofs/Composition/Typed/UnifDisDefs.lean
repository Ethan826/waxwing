/-
Robinson's disagreement step for cell-shaped values (statements and the
lifting through a position). Two different cell-shaped values either
clash (in some projection: the written skeleton or a single cell), or
disagree at a first position where one side is a non-cell constant
`x` (`Bind1`), or at a cell label where both sides are different cell
constants of that cell (`Bind2`). Each binding comes with what every
unifier, every projected unifier and every `hv` reading of the pair
must satisfy there.
-/
import Composition.Typed.UnifHv

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- The projections checked: the written skeleton, then each cell. -/
def Ls (C : List Cell) : List (List Cell) := [] :: C.map fun S => [S]

theorem nil_mem_Ls (C : List Cell) : [] ∈ Ls C := List.mem_cons_self

theorem single_mem_Ls {C : List Cell} {S : Cell} (h : S ∈ C) :
    [S] ∈ Ls C := List.mem_cons_of_mem _ (List.mem_map_of_mem h)

/-- Some projection of the pair has no unifier. -/
def Clash (C : List Cell) (s t : CG Label B) : Prop :=
  ∃ L ∈ Ls C, ∀ τ : CSubst Label B, substG τ (pr L s) ≠ substG τ (pr L t)

/-- A binding `x := u` of a non-cell constant. -/
def Bind1 (P : SigProblem Label B) (C : List Cell) (s t : CG Label B) :
    Prop :=
  ∃ x u, NonX x ∧ CS P C u ∧ u ≠ cv x ∧ (Occ x s ∨ Occ x t) ∧
    (∀ c, Occ c u → Occ c s ∨ Occ c t) ∧ (FinG s → FinG t → FinG u) ∧
    (∀ τ : CSubst Label B, substG τ s = substG τ t → τ x = substG τ u) ∧
    (∀ L ∈ Ls C, ∀ τ : CSubst Label B,
      substG τ (pr L s) = substG τ (pr L t) → τ x = substG τ (pr L u)) ∧
    ∀ (θ : Assign Label B) (ν : Val Label B),
      hv P θ ν none s = hv P θ ν none t → ν x none = hv P θ ν none u

/-- A binding `X r S := X r' S` of a cell constant. -/
def Bind2 (P : SigProblem Label B) (C : List Cell) (s t : CG Label B) :
    Prop :=
  ∃ r r' S, r ≠ r' ∧ S ∈ C ∧ r' ∈ S ∧
    (Occ (.X r S) s ∨ Occ (.X r S) t) ∧ (Occ (.X r' S) s ∨ Occ (.X r' S) t) ∧
    (∀ τ : CSubst Label B, substG τ s = substG τ t →
      τ (.X r S) = τ (.X r' S)) ∧
    (∀ τ : CSubst Label B, substG τ (pr [S] s) = substG τ (pr [S] t) →
      τ (.X r S) = τ (.X r' S)) ∧
    ∀ (θ : Assign Label B) (ν : Val Label B),
      hv P θ ν none s = hv P θ ν none t → ∀ k, k ∉ written P →
        cellOf P θ k = S → ν (.X r S) (some k) = ν (.X r' S) (some k)

def DisOut (P : SigProblem Label B) (C : List Cell) (s t : CG Label B) :
    Prop :=
  Clash C s t ∨ Bind1 P C s t ∨ Bind2 P C s t

variable {P : SigProblem Label B} {C : List Cell}

/-- `a, a'` sit at the same position of `s, t`. -/
structure SamePos (P : SigProblem Label B) (s t a a' : CG Label B) :
    Prop where
  occ : ∀ c, (Occ c a → Occ c s) ∧ (Occ c a' → Occ c t)
  fin : (FinG s → FinG a) ∧ (FinG t → FinG a')
  unif : ∀ τ : CSubst Label B, substG τ s = substG τ t →
    substG τ a = substG τ a'
  proj : ∀ (L : List Cell) (τ : CSubst Label B),
    substG τ (pr L s) = substG τ (pr L t) →
      substG τ (pr L a) = substG τ (pr L a')
  hv : ∀ (θ : Assign Label B) (ν : Val Label B),
    hv P θ ν none s = hv P θ ν none t → hv P θ ν none a = hv P θ ν none a'

theorem dis_lift {s t a a' : CG Label B} (hp : SamePos P s t a a')
    (h : DisOut P C a a') : DisOut P C s t := by
  rcases h with ⟨L, hL, hc⟩ | ⟨x, u, hx, hu, hne, ho, hv, hf, h1, h2, h3⟩ |
      ⟨r, r', S, hr, hS, hr', ho, ho', h1, h2, h3⟩
  · exact Or.inl ⟨L, hL, fun τ he => hc τ (hp.proj L τ he)⟩
  · refine Or.inr (Or.inl ⟨x, u, hx, hu, hne, ?_, fun c hc => ?_,
      fun hs ht => hf (hp.fin.1 hs) (hp.fin.2 ht),
      fun τ he => h1 τ (hp.unif τ he),
      fun L hL τ he => h2 L hL τ (hp.proj L τ he),
      fun θ ν he => h3 θ ν (hp.hv θ ν he)⟩)
    · rcases ho with h | h
      · exact Or.inl ((hp.occ x).1 h)
      · exact Or.inr ((hp.occ x).2 h)
    · rcases hv c hc with h | h
      · exact Or.inl ((hp.occ c).1 h)
      · exact Or.inr ((hp.occ c).2 h)
  · refine Or.inr (Or.inr ⟨r, r', S, hr, hS, hr', ?_, ?_,
      fun τ he => h1 τ (hp.unif τ he),
      fun τ he => h2 τ (hp.proj [S] τ he),
      fun θ ν he => h3 θ ν (hp.hv θ ν he)⟩)
    · rcases ho with h | h
      · exact Or.inl ((hp.occ _).1 h)
      · exact Or.inr ((hp.occ _).2 h)
    · rcases ho' with h | h
      · exact Or.inl ((hp.occ _).1 h)
      · exact Or.inr ((hp.occ _).2 h)

theorem dis_symm {s t : CG Label B} (h : DisOut P C s t) :
    DisOut P C t s := by
  rcases h with ⟨L, hL, hc⟩ | ⟨x, u, hx, hu, hne, ho, hv, hf, h1, h2, h3⟩ |
      ⟨r, r', S, hr, hS, hr', ho, ho', h1, h2, h3⟩
  · exact Or.inl ⟨L, hL, fun τ he => hc τ he.symm⟩
  · exact Or.inr (Or.inl ⟨x, u, hx, hu, hne, ho.symm,
      fun c hc => (hv c hc).symm, fun ht hs => hf hs ht,
      fun τ he => h1 τ he.symm, fun L hL τ he => h2 L hL τ he.symm,
      fun θ ν he => h3 θ ν he.symm⟩)
  · exact Or.inr (Or.inr ⟨r, r', S, hr, hS, hr', ho.symm, ho'.symm,
      fun τ he => h1 τ he.symm, fun τ he => h2 τ he.symm,
      fun θ ν he => h3 θ ν he.symm⟩)

/-- A non-cell constant against any other cell-shaped value. -/
theorem dis_var {x : CConst Label} {t : CG Label B} (hx : NonX x)
    (ht : CS P C t) (hne : cv x ≠ t) : DisOut P C (cv x) t :=
  Or.inr (Or.inl ⟨x, t, hx, ht, fun h => hne h.symm,
    Or.inl (by simp [Occ]), fun _ h => Or.inr h, fun _ h => h,
    fun _ he => he, fun _ _ _ he => by simpa [pr, substG] using he,
    fun _ _ he => by simpa [hv] using he⟩)

end Composition.Typed

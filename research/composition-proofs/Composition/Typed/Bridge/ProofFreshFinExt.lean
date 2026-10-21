/-
B2n (`D3bCompleteFinExt`), a corollary of B2 by an explicit allocation
of `U`'s constants into `B ⊕ Fin n` (authorized in this tranche).

`allocFin U n` sends a constant `c ∈ U` to the atom `inr (idxOf c U)`,
the position of its first occurrence in `U`, and any other constant to
the spare atom `inr (n - 1)`. Repeated constants in `U` share their
first position, so distinct constants of `U` get distinct atoms. Every
atom is a right injection and every renamed written base a left one,
so the atoms avoid all the written bases, however many.

`U.length < n` is a sufficient allocation bound, not a claimed optimal
one: positions in `U` are below `U.length`, and `n > 0` gives the spare
atom (with `U = []` and `B` empty, `n = 1` is the least that keeps the
allocation total). Meaning: for this particular generic instance,
finitely many fresh opaque types suffice for the completeness argument.
B2n does not establish a minimal bound, an efficient algorithm, or
option-B validity by itself.
-/
import Composition.Typed.Bridge.ProofFreshComplete

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- An injective code for constants, to decide their equality (a local
instance, named apart from any derived one). -/
def cconstCode : CConst Label → Nat ⊕ (Nat × Label) ⊕ (Nat × Cell)
  | .T n => .inl n
  | .A r l => .inr (.inl (r, l))
  | .X r S => .inr (.inr (r, S))

omit [DecidableEq Label] in
theorem cconstCode_inj {c c' : CConst Label}
    (h : cconstCode c = cconstCode c') : c = c' := by
  cases c <;> cases c' <;> simp_all [cconstCode]

@[instance_reducible]
def cconstDecEqFinExt : DecidableEq (CConst Label) := fun c c' =>
  if h : cconstCode c = cconstCode c' then isTrue (cconstCode_inj h)
  else isFalse fun e => h (e ▸ rfl)

attribute [local instance] cconstDecEqFinExt

/-- The explicit allocation of `U`'s constants into `Fin n`. -/
def allocIdx (U : List (CConst Label)) (n : Nat) (hn : U.length < n)
    (c : CConst Label) : Fin n :=
  if hc : c ∈ U then ⟨U.idxOf c, by
    have := List.idxOf_lt_length_of_mem hc; omega⟩
  else ⟨n - 1, by omega⟩

/-- The fresh bases of B2n: allocated atoms on the right of `B`. -/
def allocFin (U : List (CConst Label)) (n : Nat) (hn : U.length < n)
    (c : CConst Label) : B ⊕ Fin n :=
  .inr (allocIdx U n hn c)

/-- The allocation is injective on the distinct constants of `U`, even
when `U` repeats some: both read the first occurrence. -/
theorem allocIdx_inj {U : List (CConst Label)} {n : Nat}
    {hn : U.length < n} {c c' : CConst Label} (hc : c ∈ U) (hc' : c' ∈ U)
    (h : allocIdx U n hn c = allocIdx U n hn c') : c = c' := by
  simp only [allocIdx, hc, hc', ↓reduceDIte, Fin.mk.injEq] at h
  have e1 := List.getElem_idxOf (List.idxOf_lt_length_of_mem hc)
  have e2 := List.getElem_idxOf (List.idxOf_lt_length_of_mem hc')
  simp only [h] at e1
  exact e1.symm.trans e2

/-- The allocation meets B2's base premise at `j = inl`. -/
theorem allocFresh (P : SigProblem Label B) (U : List (CConst Label))
    (n : Nat) (hn : U.length < n) :
    FreshBasesOn P (Sum.inl : B → B ⊕ Fin n) U (allocFin U n hn) :=
  ⟨fun _ hc _ hc' h => allocIdx_inj hc hc' (Sum.inr.inj h),
    fun _ _ _ _ h => Sum.inr_ne_inl h⟩

/-- B2n from B2: B2 at `B₁ = B ⊕ Fin n`, `j = inl`, `e = allocFin`,
finite half. Every premise of B2n is passed on unchanged. -/
theorem d3bCompleteFinExt_of_on
    (hB2 : D3bCompleteOn (Label := Label) (B := B)) :
    D3bCompleteFinExt (Label := Label) (B := B) :=
  fun P π θs z U n hn hL hU hW hg hv =>
    (hB2 P π θs (B ⊕ Fin n) Sum.inl z (allocFin U n hn) U
      (fun _ _ h => Sum.inl.inj h) hL (allocFresh P U n hn) hU hW hg).2 hv

/-- B2n from E2, E5 and E6, through B2. -/
theorem d3bCompleteFinExt_of
    (hE2 : ∀ (L B' : Type) [DecidableEq L], SatMapBase (Label := L) (B := B'))
    (hE5 : MapBaseSyntax (Label := Label) (B := B))
    (hE6 : MapBaseClift (Label := Label) (B := B)) :
    D3bCompleteFinExt (Label := Label) (B := B) :=
  d3bCompleteFinExt_of_on (d3bCompleteOn_of hE2 hE5 hE6)

/-! ### Edge cases -/

/-- The empty case: `U = []`, `n = 1`, over an empty base type. Every
constant goes to the spare atom, and B2's base premise holds. This
confirms typing and totality: `FreshBasesOn P inl [] e` holds for every
`e`, so its only content is that `Fin 1` is inhabited (with `n = 0` no
allocation exists). -/
example (P : SigProblem Label Empty) :
    FreshBasesOn P (Sum.inl : Empty → Empty ⊕ Fin 1) []
      (allocFin [] 1 Nat.one_pos) :=
  allocFresh P [] 1 Nat.one_pos

example : allocIdx ([] : List (CConst Nat)) 1 (by decide) (.T 0) = 0 :=
  rfl

/-- Repeated constants: `U = [T 0, T 0, T 1]`. The duplicate `T 0`
reads its first position, `T 1` the third; a constant off `U` takes
the spare atom `n - 1`. -/
def dupU : List (CConst Nat) := [.T 0, .T 0, .T 1]

#guard (allocIdx dupU 4 (by decide) (.T 0)).val == 0
#guard (allocIdx dupU 4 (by decide) (.T 1)).val == 2
#guard (allocIdx dupU 4 (by decide) (.T 7)).val == 3

example : allocIdx dupU 4 (by decide) (.T 0) ≠
    allocIdx dupU 4 (by decide) (.T 1) := by decide

/-- Multiple written bases: `D` equates the two bases of `Bool`, so
both are written, and the allocated atoms avoid both. The avoidance is
structural (`inr ≠ inl`); this confirms typing and `basesOf`, not a
nontrivial property. -/
def twoBases : SigProblem Nat Bool :=
  ⟨[], [], [.eq (.base true) (.base false)], []⟩

example : basesOf twoBases = [true, false] := by decide

example (U : List (CConst Nat)) (n : Nat) (hn : U.length < n) :
    FreshBasesOn twoBases (Sum.inl : Bool → Bool ⊕ Fin n) U
      (allocFin U n hn) :=
  allocFresh twoBases U n hn

end Composition.Typed

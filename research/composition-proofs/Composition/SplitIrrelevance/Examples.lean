/-
Non-vacuity and E2 (statements.md §1, §4): the `show` site in the
callee. Two splits of `main`'s call of `divide`, both meeting `divide`'s
declared clauses and giving its parameter the same image, with the same
run-time result; under M0 one is refused and one accepted; with
printability in `divide`'s interface (M1) only the accepted one is
valid. E2c and E3 are in Boundary.lean.

Labels are `Nat` (`0` is `a`, `1` is `f`, `2` is `b`); one base type.
-/
import Composition.SplitIrrelevance.Acceptance
import Composition.SplitIrrelevance.Run

namespace Composition.SplitIrrelevance.Examples

open Composition Composition.Syntax Composition.SplitIrrelevance

/-- The calls in a term, not descending into callees. -/
def calls : Tm Nat → List (Nat × Nat)
  | .extend _ e r => calls e ++ calls r
  | .spread a b | .app a b => calls a ++ calls b
  | .field e _ | .without e _ | .lam e | .site _ e | .ann _ e
  | .project _ e => calls e
  | .call f k a => (f, k) :: calls a
  | _ => []

/-- The sites in a term, not descending into callees. -/
def sites : Tm Nat → List Nat
  | .extend _ e r => sites e ++ sites r
  | .spread a b | .app a b => sites a ++ sites b
  | .field e _ | .without e _ | .lam e | .call _ _ e
  | .project _ e => sites e
  | .site k e | .ann k e => k :: sites e
  | _ => []

theorem sub_calls {t' t : Tm Nat} (h : Sub t' t) {p : Nat × Nat}
    (hp : p ∈ calls t') : p ∈ calls t := by
  cases h <;> simp_all [calls]

theorem sub_sites {t' t : Tm Nat} (h : Sub t' t) {k : Nat}
    (hk : k ∈ sites t') : k ∈ sites t := by
  cases h <;> simp_all [sites]

theorem callIn_mem {t : Tm Nat} {f k : Nat} (h : CallIn t f k) :
    (f, k) ∈ calls t := by
  induction h with
  | here => simp [calls]
  | sub hs _ ih => exact sub_calls hs ih

theorem localSite_mem {t : Tm Nat} {k : Nat} (h : LocalSite t k) :
    k ∈ sites t := by
  induction h with
  | site => simp [sites]
  | ann => simp [sites]
  | sub hs _ ih => exact sub_sites hs ih

abbrev Gr := G Nat Unit

def intG : Gr := .base ()
def fnG : Gr := .arrow intG intG

def rowA : Row Nat Gr := fun l => if l = 0 then some intG else none
def rowF : Row Nat Gr := fun l => if l = 1 then some fnG else none
def rowB : Row Nat Gr := fun l => if l = 2 then some intG else none
def rowAF : Row Nat Gr := fun l =>
  if l = 0 then some intG else if l = 1 then some fnG else none

/-- A key: rows 0-3 are `divide`'s `u`, `v`, `s`, `t`; row 4 is `main`'s
flexible row (E2c). -/
def key (u v s t w : Row Nat Gr) : Assign Nat Unit :=
  ⟨fun _ => intG, fun r =>
    if r = 0 then u else if r = 1 then v else if r = 2 then s
    else if r = 3 then t else w⟩

/-- E2's two splits of `divide({ a: 1, f: fn }, { a: 2 }, { b: 3 })`:
`f` in `u`, or in `v`. -/
def wit₁ : Assign Nat Unit := key rowF rowA rowA rowB Row.empty
def wit₂ : Assign Nat Unit := key Row.empty rowAF rowA rowB Row.empty

/-- `divide`'s clauses: `u disjoint s`, `v disjoint t`. -/
def divideD : Problem Nat Unit := [.disjoint 0 2, .disjoint 1 3]

/-- `{ a: 1, f: fn(x) => x }`. -/
def arg : Tm Nat := .extend 0 (.num 1) (.extend 1 (.lam (.var 0)) .empty)

/-- `{ ...u }`, and `{ ...u, ...v }`. -/
def uTy : TExpr Nat Unit := .record .nil [0]
def uvTy : TExpr Nat Unit := .record .nil [0, 1]

theorem evalT_one (θ : Assign Nat Unit) (r : Nat) :
    evalT θ (.record .nil [r]) = some (.record (θ.row r)) := by
  rw [evalT_tails]
  simp [composeAll, compose_empty]

theorem not_printable_fn : ¬ Printable fnG := by
  intro h; cases h

theorem not_printable_rowF : ¬ Printable (.record rowF : Gr) := by
  intro h
  cases h with
  | record _ hr => exact not_printable_fn (hr 1 fnG (by simp [rowF]))

theorem printable_empty : Printable (.record Row.empty : Gr) :=
  .record _ fun _ _ h => by simp [Row.empty] at h

theorem sat_divide₁ : Sat wit₁ divideD := by
  intro a ha
  simp only [divideD, List.mem_cons, List.not_mem_nil, or_false] at ha
  rcases ha with rfl | rfl <;> intro l <;>
    rcases l with _ | _ | _ | l <;> simp [wit₁, key, rowA, rowF, rowB]

theorem sat_divide₂ : Sat wit₂ divideD := by
  intro a ha
  simp only [divideD, List.mem_cons, List.not_mem_nil, or_false] at ha
  rcases ha with rfl | rfl <;> intro l <;>
    rcases l with _ | _ | _ | l <;>
    simp [wit₂, key, rowA, rowAF, rowB, Row.empty]

/-- Both splits give `{ ...u, ...v }` the image `{ a: Int, f: Int -> Int }`,
the argument's type. -/
theorem param_image :
    evalT wit₁ uvTy = some (.record rowAF) ∧
      evalT wit₂ uvTy = some (.record rowAF) := by
  have d₁ : Disjoint rowF rowA := by
    intro l; rcases l with _ | _ | l <;> simp [rowF, rowA]
  have d₂ : Disjoint (Row.empty : Row Nat Gr) rowAF := fun _ => Or.inl rfl
  have u₁ : union rowF rowA = rowAF := by
    funext l; rcases l with _ | _ | l <;> simp [union, rowF, rowA, rowAF]
  have e₁ : evalT wit₁ uvTy = (composeAll [rowF, rowA]).map G.record := by
    rw [uvTy, evalT_tails]; rfl
  have e₂ : evalT wit₂ uvTy =
      (composeAll [Row.empty, rowAF]).map G.record := by
    rw [uvTy, evalT_tails]; rfl
  rw [e₁, e₂, composeAll_pair d₁, composeAll_pair d₂, u₁, empty_union]
  exact ⟨rfl, rfl⟩

/-! ### E2: the `show` site in the callee -/

/-- `divide`'s body: `{ let peek = fn(p: { ...u }) => show(p); 0 }`. -/
def divideBody : Tm Nat := .app (.lam (.num 0)) (.lam (.site 0 (.var 0)))

/-- E2 with split `w`. `divide`'s interface (declared, the same text for
both splits) is its clauses and `u` printable: a hand-written M1
instance, not proved equal to the inferred `Req₁`. -/
def e2 (w : Assign Nat Unit) : Prog Nat Unit where
  body f := if f = 0 then .call 1 0 arg else if f = 1 then divideBody
    else .num 0
  ty _ := uTy
  ok _ := Printable
  wit _ _ := w
  loc _ θ := θ
  D f := if f = 1 then divideD else []
  Req f θ := f ≠ 1 ∨ (Sat θ divideD ∧ Printable (.record (θ.row 0)))

theorem e2_variant : SplitVariant (e2 wit₁) (e2 wit₂) :=
  ⟨rfl, rfl, rfl, rfl, rfl⟩

theorem e2_pf : ProgPF (e2 wit₁) := by
  intro f
  simp only [e2]
  split
  · simp [PF, arg]
  · split <;> simp [PF, divideBody]

/-- Model M0 calls both splits valid: each meets `divide`'s clauses. -/
theorem e2_m0_valid :
    Req₀ (e2 wit₁) 1 wit₁ ∧ Req₀ (e2 wit₂) 1 wit₂ :=
  ⟨sat_divide₁, sat_divide₂⟩

/-- Run time: the two splits agree (R), and the result is `0`. -/
theorem e2_run (n : Nat) (θ₁ θ₂ : Assign Nat Unit) :
    eval (e2 wit₁) θ₁ n [] ((e2 wit₁).body 0) =
      eval (e2 wit₂) θ₂ n [] ((e2 wit₂).body 0) :=
  eval_split e2_variant e2_pf n θ₁ θ₂ [] _ (e2_pf 0) (by simp)

theorem e2_result (θ : Assign Nat Unit) :
    eval (e2 wit₁) θ 4 [] ((e2 wit₁).body 0) = some (.num 0) := by
  simp [e2, eval, arg, divideBody, keysOf]

/-- The site `show(p)` in the never-applied lambda, reached from `main`. -/
theorem e2_reach (w θ : Assign Nat Unit) :
    SiteAt (e2 w) θ ((e2 w).body 0) 0 w := by
  refine .call (f := 1) (k := 0) ?_ (.here ?_)
  · simp only [e2]; exact .here 1 0 arg
  · simp only [e2]
    exact .sub (.app₂ _ _) (.sub (.lam _) (.site 0 _))

/-- Split 1 (`f` in `u`) is refused at specialization. -/
theorem e2_refused (θ : Assign Nat Unit) :
    ¬ Accepted (e2 wit₁) θ ((e2 wit₁).body 0) := by
  intro h
  obtain ⟨g, hg, hp⟩ := h 0 wit₁ (e2_reach wit₁ θ)
  simp only [e2, uTy, evalT_one] at hg
  injection hg with hg; subst hg
  exact not_printable_rowF hp

/-- M1: split 2 is valid (`Covers`), split 1 is not. -/
theorem e2_covers₂ : Covers (e2 wit₂) := by
  intro f θ hr
  by_cases h0 : f = 0
  · subst h0
    refine ⟨fun k hk => ?_, fun g k hk => ?_⟩
    · have := localSite_mem hk; simp [e2, sites, arg] at this
    · have := callIn_mem hk
      simp [e2, calls, arg] at this
      obtain ⟨rfl, rfl⟩ := this
      right
      exact ⟨sat_divide₂, by simpa [e2, wit₂, key] using printable_empty⟩
  · by_cases h1 : f = 1
    · subst h1
      obtain ⟨hs, hp⟩ := hr.resolve_left (by simp)
      refine ⟨fun k hk => ⟨_, evalT_one θ 0, hp⟩, fun g k hk => ?_⟩
      have := callIn_mem hk; simp [e2, calls, divideBody] at this
    · refine ⟨fun k hk => ?_, fun g k hk => ?_⟩
      · have := localSite_mem hk; simp [e2, sites, h0, h1] at this
      · have := callIn_mem hk; simp [e2, calls, h0, h1] at this

theorem e2_not_covers₁ : ¬ Covers (e2 wit₁) := by
  intro hc
  have h := (hc 0 wit₁ (Or.inl (by simp))).2 1 0 (by
    simp only [e2]; exact .here 1 0 arg)
  rcases h with h | ⟨_, hp⟩
  · exact h rfl
  · exact not_printable_rowF (by simpa [e2, wit₁, key] using hp)

/-- C at work: split 2 is accepted, from coverage. -/
theorem e2_accepted₂ (θ : Assign Nat Unit) :
    Accepted (e2 wit₂) θ ((e2 wit₂).body 0) :=
  accepted_of_covers (f := 0) e2_covers₂ (Or.inl (by simp))

end Composition.SplitIrrelevance.Examples

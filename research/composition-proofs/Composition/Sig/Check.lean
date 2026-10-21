/-
The executable evaluator (dossier §15.2) and K3: on a syntactic
certificate it computes what `evalT` computes on the certificate's
denotation, for every list `p` of present pairs. Rows are lists read at
first occurrence; a composition is defined iff the parts' label sets
are disjoint, decided on the lists, so overlapping parts are refused
however the representation allows duplicates.
-/
import Composition.Sig.Syntactic

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- The labels a list holds. -/
def keys (fs : List (GL Label × SG Label B)) : List (GL Label) :=
  fs.map Prod.fst

theorem denRow_eq_lookup :
    ∀ (fs : List (GL Label × SG Label B)) (k : GL Label),
      denRow fs k = (fs.lookup k).map den
  | [], _ => rfl
  | (k, s) :: rest, k' => by
    by_cases h : k' = k
    · subst h
      simp [denRow, List.lookup]
    · have hb : (k' == k) = false := by simp [h]
      simp [denRow, List.lookup, h, hb, denRow_eq_lookup rest k']

theorem denRow_none_iff {fs : List (GL Label × SG Label B)} {k : GL Label} :
    denRow fs k = none ↔ k ∉ keys fs := by
  induction fs with
  | nil => simp [denRow, keys]
  | cons e rest ih =>
    obtain ⟨k₀, s⟩ := e
    by_cases h : k = k₀
    · simp [denRow, keys, h]
    · simp only [keys] at ih
      simp [denRow, keys, h, ih]

theorem denRow_append (xs ys : List (GL Label × SG Label B)) :
    denRow (xs ++ ys) = union (denRow xs) (denRow ys) := by
  induction xs with
  | nil => funext k; simp [denRow, union]
  | cons e rest ih =>
    obtain ⟨k₀, s⟩ := e
    funext k
    by_cases h : k = k₀
    · simp [denRow, union, h]
    · simp only [List.cons_append, denRow, h, ↓reduceIte]
      rw [ih]
      simp [union, h]

/-- The two lists hold no common label. -/
def disjointS (xs ys : List (GL Label × SG Label B)) : Bool :=
  (keys xs).all fun k => !decide (k ∈ keys ys)

theorem disjointS_iff {xs ys : List (GL Label × SG Label B)} :
    disjointS xs ys = true ↔ Composition.Disjoint (denRow xs) (denRow ys) := by
  simp only [disjointS, List.all_eq_true, Bool.not_eq_true',
    decide_eq_false_iff_not, Composition.Disjoint, denRow_none_iff]
  constructor
  · intro h k
    by_cases hk : k ∈ keys xs
    · exact Or.inr (h k hk)
    · exact Or.inl hk
  · intro h k hk
    exact (h k).resolve_left (by simpa using hk)

def composeS (xs ys : List (GL Label × SG Label B)) :
    Option (List (GL Label × SG Label B)) :=
  if disjointS xs ys then some (xs ++ ys) else none

def composeAllS : List (List (GL Label × SG Label B)) →
    Option (List (GL Label × SG Label B))
  | [] => some []
  | x :: xs => (composeAllS xs).bind (composeS x)

theorem compose_den (xs ys : List (GL Label × SG Label B)) :
    compose (denRow xs) (denRow ys) = (composeS xs ys).map denRow := by
  unfold compose composeS
  by_cases h : disjointS xs ys = true
  · simp [h, disjointS_iff.mp h, denRow_append]
  · have : ¬ Composition.Disjoint (denRow xs) (denRow ys) :=
      fun hd => h (disjointS_iff.mpr hd)
    simp [h, this]

theorem composeAll_den :
    ∀ xss : List (List (GL Label × SG Label B)),
      composeAll (xss.map denRow) = (composeAllS xss).map denRow
  | [] => rfl
  | x :: xs => by
    simp only [List.map_cons, composeAll, composeAllS, composeAll_den xs]
    cases composeAllS xs with
    | none => rfl
    | some w => simp [compose_den]

/-- Rigid row `r` of pattern `p`, as a list. -/
def genRowS (P : SigProblem Label B) (p : List (Nat × Label)) (r : Nat) :
    List (GL Label × SG Label B) :=
  ((written P).filter fun l => decide ((r, l) ∈ p)).map
      (fun l => (.inl l, .base (.inr (.A r l)))) ++
    [(.inr r, .base (.inr (.R r)))]

theorem denRow_mapInl (r : Nat) (ys : List (GL Label × SG Label B)) :
    ∀ (ls : List Label) (k : GL Label),
      denRow ((ls.map fun l => ((.inl l : GL Label),
        (SG.base (.inr (.A r l)) : SG Label B))) ++ ys) k =
      match k with
      | .inl l => if l ∈ ls then some (.base (.inr (.A r l))) else denRow ys k
      | .inr _ => denRow ys k
  | [], k => by cases k <;> simp
  | l :: ls, k => by
    cases k with
    | inl l' =>
      by_cases h : l' = l
      · subst h; simp [denRow, den]
      · simp [denRow, h, denRow_mapInl r ys ls (.inl l')]
    | inr s => simp [denRow, denRow_mapInl r ys ls (.inr s)]

theorem denRow_genRowS (P : SigProblem Label B) (p : List (Nat × Label))
    (r : Nat) : denRow (genRowS P p r) = genRow P (patternOf p) r := by
  funext k
  rw [genRowS, denRow_mapInl]
  cases k with
  | inl l =>
    simp only [List.mem_filter, decide_eq_true_eq, genRow, patternOf]
    by_cases h : l ∈ written P ∧ (r, l) ∈ p <;> simp [h, denRow]
  | inr s =>
    by_cases h : s = r <;> simp [denRow, genRow, h, den]

/-- The certificate's type and row variables, rigid ones from `p`. -/
def tyS (P : SigProblem Label B) (C : Cert Label B) (n : Nat) : SG Label B :=
  if n ∈ P.rigidTy then .base (.inr (.T n))
  else (C.ty.lookup n).getD (.record [])

def rowS (P : SigProblem Label B) (p : List (Nat × Label)) (C : Cert Label B)
    (r : Nat) : List (GL Label × SG Label B) :=
  if r ∈ P.rigidRow then genRowS P p r else (C.row.lookup r).getD []

theorem den_tyS (P : SigProblem Label B) (p : List (Nat × Label))
    (C : Cert Label B) (n : Nat) :
    den (tyS P C n) = (genAssign P (patternOf p) (denCert C)).ty n := by
  simp only [tyS, genAssign, denCert]
  by_cases h : n ∈ P.rigidTy
  · simp [h, den]
  · cases C.ty.lookup n <;> simp [h, den, denRow, emptyGG]

theorem denRow_rowS (P : SigProblem Label B) (p : List (Nat × Label))
    (C : Cert Label B) (r : Nat) :
    denRow (rowS P p C r) = (genAssign P (patternOf p) (denCert C)).row r := by
  simp only [rowS, genAssign, denCert]
  by_cases h : r ∈ P.rigidRow
  · simp [h, denRow_genRowS]
  · cases C.row.lookup r with
    | none => simp [h]; rfl
    | some _ => simp [h]

mutual
  /-- The executable evaluator. -/
  def evalS (P : SigProblem Label B) (p : List (Nat × Label))
      (C : Cert Label B) : TExpr (GL Label) (GB Label B) → Option (SG Label B)
    | .base b => some (.base b)
    | .arrow t u => (evalS P p C t).bind fun a => (evalS P p C u).map (.arrow a)
    | .tvar n => some (tyS P C n)
    | .record fs tails => (evalFS P p C fs).bind fun fr =>
      (composeAllS (fr :: tails.map (rowS P p C))).map .record

  def evalFS (P : SigProblem Label B) (p : List (Nat × Label))
      (C : Cert Label B) :
      Fields (GL Label) (GB Label B) → Option (List (GL Label × SG Label B))
    | .nil => some []
    | .cons l t rest => (evalS P p C t).bind fun g =>
      (evalFS P p C rest).bind fun r => composeS [(l, g)] r
end

theorem single_den (l : GL Label) (g : SG Label B) :
    single l (den g) = denRow [(l, g)] := by
  funext k
  by_cases h : k = l <;> simp [single, denRow, h]

mutual
  /-- K3: evaluation agrees, both when defined and when not. -/
  theorem evalT_den (P : SigProblem Label B) (p : List (Nat × Label))
      (C : Cert Label B) : ∀ t : TExpr (GL Label) (GB Label B),
        evalT (genAssign P (patternOf p) (denCert C)) t =
          (evalS P p C t).map den
    | .base b => by simp [evalT, evalS, den]
    | .arrow t u => by
      simp only [evalT, evalS, evalT_den P p C t, evalT_den P p C u]
      cases evalS P p C t <;> cases evalS P p C u <;> simp [den]
    | .tvar n => by simp [evalT, evalS, ← den_tyS P p C n]
    | .record fs tails => by
      simp only [evalT, evalS, evalF_den P p C fs]
      cases evalFS P p C fs with
      | none => rfl
      | some fr =>
        have hmap : (denRow fr :: tails.map
            (genAssign P (patternOf p) (denCert C)).row) =
            (fr :: tails.map (rowS P p C)).map denRow := by
          simp [List.map_map, Function.comp_def, denRow_rowS]
        simp only [Option.map_some, Option.bind_some, hmap, composeAll_den]
        cases composeAllS (fr :: tails.map (rowS P p C)) <;> simp [den]

  theorem evalF_den (P : SigProblem Label B) (p : List (Nat × Label))
      (C : Cert Label B) : ∀ fs : Fields (GL Label) (GB Label B),
        evalF (genAssign P (patternOf p) (denCert C)) fs =
          (evalFS P p C fs).map denRow
    | .nil => rfl
    | .cons l t rest => by
      simp only [evalF, evalFS, evalT_den P p C t, evalF_den P p C rest]
      cases evalS P p C t with
      | none => rfl
      | some g =>
        cases evalFS P p C rest with
        | none => rfl
        | some r => simp [single_den, compose_den]
end

end Composition.Syntax

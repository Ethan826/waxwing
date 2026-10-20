/-
The required programs and their negative controls (dossier §5), over
concrete labels and base types. Each call-site problem is a predicate on
the assignment of the parts `(r, s)`; program 6 is a signature problem.
-/
import Composition.Signatures

namespace Composition.Programs

inductive L where
  | a | admin | x | y | extra | name
  deriving DecidableEq

inductive T where
  | int | bool | text
  deriving DecidableEq

open Composition

/-- The one-field row `{ l: t }`. -/
def single (l : L) (t : T) : Row L T := fun k => if k = l then some t else none

def none' : Row L T := Row.empty

/-- Program 3's overlap control: `{ a: Int }` with itself has no disjoint
composition; biased composition accepts it. -/
theorem p3_overlap :
    (¬ ∃ u, DUnion (single .a .int) (single .a .int) u) ∧
      biased (single .a .int) (single .a .int) = single .a .int := by
  refine ⟨?_, ?_⟩
  · rintro ⟨u, hd, _⟩
    rcases hd .a with h | h <;> simp [single] at h
  · funext k
    cases k <;> simp [biased, single]

/-- Program 4 at its call: `r ⊎ s = { admin: Bool }`, `s lacks admin`. -/
def p4 (θ : Row L T × Row L T) : Prop :=
  DUnion θ.1 θ.2 (single .admin .bool) ∧ Lacks θ.2 .admin

theorem p4_solved : Satisfiable p4 := by
  refine ⟨(single .admin .bool, none'), ⟨fun k => ?_, ?_⟩, rfl⟩
  · cases k <;> simp [single, none', Row.empty]
  · funext k
    cases k <;> simp [union, single, none', Row.empty]

/-- Program 4's placement through C7a then C7b. -/
theorem p4_admin_forced :
    Entails p4 (fun θ => θ.1 .admin = some .bool) := by
  have present : Entails p4 (fun θ => θ.1 .admin ≠ none) := by
    refine (c7a p4 Prod.fst .admin).mpr ?_
    rintro ⟨θ, ⟨⟨_, hu⟩, hs⟩, hr⟩
    have := congrFun hu .admin
    simp [union, single, Lacks] at hs hr this
    simp [hr, hs] at this
  exact c7b p4 Prod.fst Prod.snd (fun _ => single .admin .bool) .admin
    .bool present (fun _ h => h.1) (fun _ _ => by simp [single])

/-- Program 4's whole split is forced: `r = { admin: Bool }`, `s = {}`. -/
theorem p4_split_forced :
    Entails p4 (fun θ => θ.1 = single .admin .bool ∧ θ.2 = none') := by
  intro θ hp
  have ha := p4_admin_forced θ hp
  obtain ⟨⟨hd, hu⟩, hs⟩ := hp
  refine ⟨funext fun k => ?_, funext fun k => ?_⟩ <;>
    have hk := congrFun hu k <;>
    cases k <;> simp_all [union, single, none', Row.empty, Lacks] <;>
    cases h1 : θ.1 _ <;> simp_all

theorem p4_negative : ¬ Satisfiable (fun θ => p4 θ ∧ Lacks θ.1 .admin) := by
  rintro ⟨θ, hp, hr⟩
  have := p4_admin_forced θ hp
  simp [Lacks] at hr
  simp [hr] at this

/-- Program 4 without the `lacks`: two different solutions, and neither
placement is forced (§4: refused as undetermined under the policy). -/
def p4NoLacks (θ : Row L T × Row L T) : Prop :=
  DUnion θ.1 θ.2 (single .admin .bool)

theorem p4_no_lacks_two_solutions :
    p4NoLacks (single .admin .bool, none') ∧
      p4NoLacks (none', single .admin .bool) ∧
      ¬ Entails p4NoLacks (fun θ => θ.1 .admin ≠ none) ∧
      ¬ Entails p4NoLacks (fun θ => θ.2 .admin ≠ none) := by
  have left : p4NoLacks (single .admin .bool, none') := by
    refine ⟨fun k => ?_, funext fun k => ?_⟩ <;>
      cases k <;> simp [union, single, none', Row.empty]
  have right : p4NoLacks (none', single .admin .bool) := by
    refine ⟨fun k => ?_, funext fun k => ?_⟩ <;>
      cases k <;> simp [union, single, none', Row.empty]
  refine ⟨left, right, fun h => ?_, fun h => ?_⟩
  · exact h _ right (by simp [none', Row.empty])
  · exact h _ left (by simp [none', Row.empty])

/-- Program 5 at the call: `u ⊎ v = { x: Int, y: Int }`, `u lacks y`,
`v lacks x`. -/
def xy : Row L T := union (single .x .int) (single .y .int)

def p5 (θ : Row L T × Row L T) : Prop :=
  DUnion θ.1 θ.2 xy ∧ Lacks θ.1 .y ∧ Lacks θ.2 .x

theorem p5_solved : p5 (single .x .int, single .y .int) := by
  refine ⟨⟨fun k => ?_, rfl⟩, ?_, ?_⟩ <;>
    try cases k
  all_goals simp [single, Lacks]

theorem p5_split_forced :
    Entails p5 (fun θ => θ.1 = single .x .int ∧ θ.2 = single .y .int) := by
  rintro θ ⟨⟨hd, hu⟩, hy, hx⟩
  refine ⟨funext fun k => ?_, funext fun k => ?_⟩ <;>
    have hk := congrFun hu k <;>
    cases k <;> simp_all [union, single, xy, Lacks] <;>
    cases h1 : θ.1 _ <;> simp_all

theorem p5_negative :
    ¬ Satisfiable (fun θ : Row L T × Row L T =>
      DUnion θ.1 θ.2 xy ∧ Lacks θ.1 .y ∧ Lacks θ.2 .y) := by
  rintro ⟨θ, ⟨_, hu⟩, h1, h2⟩
  have := congrFun hu .y
  simp [union, single, xy, Lacks] at this h1 h2
  simp [h1, h2] at this

/-- Program 11: for every `q` lacking `a`, both extensions exist, and
their `a` fields have different types. -/
theorem p11 (q : Row L T) (hq : Lacks q .a) :
    DUnion q (single .a .int) (union q (single .a .int)) ∧
      DUnion q (single .a .bool) (union q (single .a .bool)) ∧
      union q (single .a .int) .a ≠ union q (single .a .bool) .a := by
  simp only [Lacks] at hq
  refine ⟨⟨fun k => ?_, rfl⟩, ⟨fun k => ?_, rfl⟩, ?_⟩
  · cases k <;> simp [single, hq]
  · cases k <;> simp [single, hq]
  · simp [union, single, hq]

theorem p11_negative :
    ¬ Lacks (union (single .name .text) (single .a .int)) .a := by
  simp [Lacks, union, single]

/-- Program 6, `forwarded`, as a signature problem. Rigid: the declared
`(r, s)` with `r disjoint s`. Flexible: `join`'s instantiated parts. The
body requires that they equal the parameters (exact records), that
`join`'s own clause holds of them, and that `join`'s result is the
declared result `r ⊎ s`. -/
def p6D (ρ : Row L T × Row L T) : Prop := Disjoint ρ.1 ρ.2

def p6B (ρ φ : Row L T × Row L T) : Prop :=
  φ = ρ ∧ Disjoint φ.1 φ.2 ∧ union φ.1 φ.2 = union ρ.1 ρ.2

/-- Program 6 checks, by C11's inclusion: `join`'s clause is the
declared clause. -/
theorem p6_holds : SigHolds p6D p6B := by
  refine c11 p6D p6D (fun ρ φ => φ = ρ ∧ union φ.1 φ.2 = union ρ.1 ρ.2)
    p6B ?_ (fun _ h => h) (fun ρ => ⟨ρ, rfl, rfl⟩)
  rintro ρ φ
  constructor
  · rintro ⟨rfl, hd, hu⟩
    exact ⟨hd, rfl, hu⟩
  · rintro ⟨hd, rfl, hu⟩
    exact ⟨rfl, hd, hu⟩

/-- Program 6's negative control: the wrapper promises `{ extra: Bool,
...r, ...s }`, with `r` and `s` declared to lack `extra`. -/
def p6NegD (ρ : Row L T × Row L T) : Prop :=
  Disjoint ρ.1 ρ.2 ∧ Lacks ρ.1 .extra ∧ Lacks ρ.2 .extra

def p6NegB (ρ φ : Row L T × Row L T) : Prop :=
  φ = ρ ∧ Disjoint φ.1 φ.2 ∧
    DUnion (single .extra .bool) (union ρ.1 ρ.2) (union φ.1 φ.2)

/-- Every declared instance is refuted: no flexible assignment works
(the evidence C10 asks for, at every instance). -/
theorem p6_negative_refuted (ρ : Row L T × Row L T) (hd : p6NegD ρ) :
    ∀ φ, ¬ p6NegB ρ φ := by
  rintro φ ⟨rfl, _, _, hu⟩
  have := congrFun hu .extra
  obtain ⟨_, h1, h2⟩ := hd
  simp [Lacks] at h1 h2
  simp [union, single, h1, h2] at this

/-- So the signature fails, by C10 at the empty instance. -/
theorem p6_negative_fails : SigFails p6NegD p6NegB :=
  c10 p6NegD p6NegB (none', none')
    ⟨fun _ => Or.inl rfl, rfl, rfl⟩ (p6_negative_refuted _
      ⟨fun _ => Or.inl rfl, rfl, rfl⟩)

end Composition.Programs

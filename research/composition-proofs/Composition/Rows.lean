/-
Rows, disjoint composition and biased composition (dossier D1-D4, D7,
D8) and claims C1 and C2.

Definitional choice, for review: a row is any function from labels to
`Option Ty` (`none` = absent). Finiteness is not assumed, so every
theorem here holds for all partial maps, finite ones included. Exact
record types: two rows are equal iff they agree on every label.
-/
namespace Composition

variable {Label Ty : Type}

/-- D1: a row maps each label to a field type or to absent. -/
abbrev Row (Label Ty : Type) := Label → Option Ty

/-- The empty row. -/
def Row.empty : Row Label Ty := fun _ => none

/-- `r` lacks `l` (D5). -/
def Lacks (r : Row Label Ty) (l : Label) : Prop := r l = none

/-- D3: no label is present in both rows. -/
def Disjoint (r s : Row Label Ty) : Prop :=
  ∀ l, r l = none ∨ s l = none

/-- The union, taking a label's field from `r` where `r` has it. -/
def union (r s : Row Label Ty) : Row Label Ty := fun l =>
  match r l with
  | some t => some t
  | none => s l

/-- D3: `u` is the disjoint composition of `r` and `s`. -/
def DUnion (r s u : Row Label Ty) : Prop :=
  Disjoint r s ∧ u = union r s

/-- D4 (Wand §2): the right operand wins on overlap. -/
def biased (r s : Row Label Ty) : Row Label Ty := fun l =>
  match s l with
  | some t => some t
  | none => r l

theorem union_of_some {r s : Row Label Ty} {l : Label} {t : Ty}
    (h : r l = some t) : union r s l = some t := by
  simp [union, h]

theorem union_of_none {r s : Row Label Ty} {l : Label}
    (h : r l = none) : union r s l = s l := by
  simp [union, h]

/-- C1: where the parts are disjoint, disjoint composition agrees with
biased composition in either order. -/
theorem c1 {r s : Row Label Ty} (h : Disjoint r s) :
    union r s = biased r s ∧ union r s = biased s r := by
  constructor
  · funext l
    cases hr : r l <;> cases hs : s l <;>
      simp_all [union, biased] <;> rcases h l with h' | h' <;> simp_all
  · funext l
    cases hr : r l <;> cases hs : s l <;> simp [union, biased, hr, hs]

/-- D7 (Wand §5), one label: left presence `f`, right `g`, result `h`. -/
def D7 (f g h : Option Ty) : Prop :=
  (g ≠ none ∧ h = g) ∨ (g = none ∧ h = f)

/-- D8: D7 with the first disjunct also requiring `f` absent. -/
def D8 (f g h : Option Ty) : Prop :=
  (g ≠ none ∧ f = none ∧ h = g) ∨ (g = none ∧ h = f)

/-- C2, one label: D8 holds iff the presences are not both present and
the result is the present one, if any. -/
theorem c2_label (f g h : Option Ty) :
    D8 f g h ↔ (f = none ∨ g = none) ∧
      h = (match f with | some t => some t | none => g) := by
  cases f <;> cases g <;> simp [D8]

/-- C2: a row is the disjoint composition of two rows iff D8 holds at
every label. -/
theorem c2 (r s u : Row Label Ty) :
    DUnion r s u ↔ ∀ l, D8 (r l) (s l) (u l) := by
  constructor
  · rintro ⟨hd, rfl⟩ l
    rcases hd l with h | h <;>
      cases hr : r l <;> cases hs : s l <;> simp_all [D8, union]
  · intro h
    refine ⟨fun l => ?_, funext fun l => ?_⟩
    · have := h l
      cases hr : r l <;> cases hs : s l <;> simp_all [D8]
    · have := h l
      cases hr : r l <;> cases hs : s l <;> simp_all [D8, union]

/-- D7 encodes biased composition: the transfer source of C2. -/
theorem d7_biased (r s u : Row Label Ty) :
    (∀ l, D7 (r l) (s l) (u l)) ↔ u = biased r s := by
  constructor
  · intro h
    funext l
    have := h l
    cases hr : r l <;> cases hs : s l <;> simp_all [D7, biased]
  · rintro rfl l
    cases hr : r l <;> cases hs : s l <;> simp [D7, biased, hr, hs]

end Composition

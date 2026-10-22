/-
Design stream CX (dossier §18.66), statements only: class c1 of
requirements.md §2.3, a contradiction derived from the original
recorded atoms and `D` alone by a rule proved sound for `ValidOpen`.
A schema, its prefix form, and two candidate rules. Every claim is a
`Prop` definition; none is proved. Prose:
research/division-campaign/refute/statements.md.
-/
import Composition.Typed.Refute.Statements
import Composition.Sig.SourceCampaign

namespace Composition.Typed.Refute

open Composition Composition.Syntax Composition.Typed
open Composition.Syntax.SourceCampaign (ClauseOnly)

variable {Label B : Type} [DecidableEq Label]

/-! ### The schema -/

/-- A c1 rule: a condition on a signature problem as recorded (rigid
lists, `D`, original body atoms), never on atoms rewritten by a
solver's substitution. -/
abbrev C1Rule (Label B : Type) := SigProblem Label B → Prop

/-- C1. A rule is sound for option-B validity: whenever it fires, the
signature is not `ValidOpen`. -/
def C1Sound (rule : C1Rule Label B) : Prop :=
  ∀ P : SigProblem Label B, rule P → ¬ ValidOpen P

/-- C1-P. Sound on a prefix: a rule firing on any sublist of the
recorded body (a prefix included, as generation stopped early) refutes
the whole signature. The rule reads the whole `D` (`withBody` keeps
it), never a sub-`D`: see `SubDAntitone`. -/
def C1SoundPrefix (rule : C1Rule Label B) : Prop :=
  ∀ (P : SigProblem Label B) (B₀ : Problem Label B),
    (∀ a ∈ B₀, a ∈ P.B) → rule (withBody P B₀) → ¬ ValidOpen P

/-- C1-M. More body atoms, fewer valid signatures. -/
def ValidOpenAntitone : Prop :=
  ∀ (P : SigProblem Label B) (B₀ : Problem Label B),
    (∀ a ∈ B₀, a ∈ P.B) → ValidOpen P → ValidOpen (withBody P B₀)

/-- C1-T. Hence a sound rule is sound on prefixes. -/
def C1SoundToPrefix : Prop :=
  ∀ rule : C1Rule Label B, C1Sound rule → C1SoundPrefix rule

/-- The same signature with declared constraints `D₀`. -/
def withD (P : SigProblem Label B) (D₀ : Problem Label B) :
    SigProblem Label B :=
  ⟨P.rigidTy, P.rigidRow, D₀, P.B⟩

/-- C1-D (expected false, X7). Refuting a sub-`D` would refute the
signature. Dropping `D` atoms admits more rigid assignments, so
`ValidOpen` is not antitone in `D`: a rule must read the whole `D`. -/
def SubDAntitone : Prop :=
  ∀ (P : SigProblem Label B) (D₀ : Problem Label B),
    (∀ a ∈ D₀, a ∈ P.D) → ¬ ValidOpen (withD P D₀) → ¬ ValidOpen P

/-! ### Candidate c1 rules (requirements.md §2.3, row c) -/

/-- Two expressions with different head constructors, or two different
bases. Only the top level; neither side a type variable. -/
def HeadClash : TExpr Label B → TExpr Label B → Prop
  | .base b, .base c => b ≠ c
  | .base _, .arrow _ _ => True
  | .base _, .record _ _ => True
  | .arrow _ _, .base _ => True
  | .arrow _ _, .record _ _ => True
  | .record _ _, .base _ => True
  | .record _ _, .arrow _ _ => True
  | _, _ => False

/-- `a` equates type variable `n` with `t`, either way round. -/
def BindsTo (n : Nat) (t : TExpr Label B) (a : Atom Label B) : Prop :=
  a = .eq (.tvar n) t ∨ a = .eq t (.tvar n)

/-- A ground head clash between original atoms: one body equation
whose sides clash, or two body equations giving one type variable
clashing heads. -/
def ClashIn (C : Problem Label B) : Prop :=
  (∃ t u, Atom.eq t u ∈ C ∧ HeadClash t u) ∨
  (∃ n t u a a', a ∈ C ∧ a' ∈ C ∧ BindsTo n t a ∧ BindsTo n u a' ∧
    HeadClash t u)

/-- An occurs check on an original atom: a type variable equated with
a proper expression mentioning it. -/
def OccursIn (C : Problem Label B) : Prop :=
  ∃ n t a, a ∈ C ∧ BindsTo n t a ∧ t ≠ .tvar n ∧ n ∈ tyVarsT t

/-- The rule fires on a source-shaped `D` (clauses only, so a finite
rigid assignment satisfies it: `clauseOnly_satisfiable`). Without a
condition on `D` no body rule is sound: an unsatisfiable `D` makes
every signature valid. -/
def ClashRule : C1Rule Label B := fun P => ClauseOnly P.D ∧ ClashIn P.B

def OccursRule : C1Rule Label B := fun P => ClauseOnly P.D ∧ OccursIn P.B

/-- C1-H. The head-clash rule is sound. -/
def ClashSound : Prop := C1Sound (ClashRule (Label := Label) (B := B))

/-- C1-O. The occurs-check rule is sound. -/
def OccursSound : Prop := C1Sound (OccursRule (Label := Label) (B := B))

/-- C1-U. The common reason: an unsatisfiable body under a `D` that a
finite rigid assignment satisfies. Both rules factor through it. -/
def UnsatBodySound : Prop :=
  ∀ P : SigProblem Label B,
    (∃ θR, RigidFin P θR ∧ Sat θR P.D) → ¬ Satisfiable P.B →
      ¬ ValidOpen P

/-! ### A rule that is not c1 (contrast) -/

/-- C1-X (expected false). The clash rule read on the body rewritten by
an arbitrary solver substitution `σ`, as today's refusals on
substituted atoms are. The substitution embeds choices, so the rule's
firing is not evidence. -/
def ClashAfterSubstSound : Prop :=
  ∀ (P : SigProblem Label B) (σ : Subst Label B),
    ClauseOnly P.D → ClashIn (substProblem σ P.B) → ¬ ValidOpen P

/-- C1-E (the boundary). The same rule is sound when every solution of
the original body satisfies `σ`'s binding equations, as for a most
general unifier of original equations: then `σ` embeds no choice. -/
def ClashAfterEntailedSound : Prop :=
  ∀ (P : SigProblem Label B) (σ : Subst Label B), ClauseOnly P.D →
    (∀ θ, Sat θ P.B → Sat θ (eqs σ)) →
    ClashIn (substProblem σ P.B) → ¬ ValidOpen P

/-! ### Not stated (statements.md §5, question 4)

Only the top-level clash (C1-H) and the type-variable occurs check
(C1-O) are stated. Unstated, so not yet c1: nested head clashes
(through arrows or record fields), record-field clashes (records are
equal modulo label order and disjoint union, so a free-algebra argument
does not carry over), cancellation, `lacks`/`disjoint` refutations on
original atoms, and the occurs check through row tails. -/

end Composition.Typed.Refute

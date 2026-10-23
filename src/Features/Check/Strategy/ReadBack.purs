-- The online solver's answer read back to problem variables (T-R0b
-- §5.3, "Reading back a candidate"; T-R0a §4.2, As3; Task 4.3). Untrusted
-- plumbing: G0's check judges what it reads.
--
-- 1. Every positioned flexible variable takes the settled type at its
--    checked-IR position (ReadBack.Position), read directly.
-- 2. The auxiliaries have no position (§5.2). They are completed by
--    Robinson unification (Features.Check.Entailed.Mgu) of the problem's
--    equations that still mention one once the positioned values are
--    substituted (the others are the check's to judge), so σ is today's
--    answer where it has one and the most general completion elsewhere.
--    RT7 (test/r0-rt7.test.mjs) checks §5.3's determination against
--    these values: a second algorithm, not this one.
-- 3. The unifier is complete only in the one-tail fragment. Outside it,
--    completion is not unique (§5.3 leaves several tails to "the
--    strategy's adapter (argued)"), so the read keeps the positioned
--    values alone and claims `Heuristic` (G-A-i(g), proposed): its
--    refusal is a failed attempt, not a `SearchFault`. Amendment to
--    §5.3's wording: the ambiguity arises at completion, since
--    positions are read directly, not by matching `types(p)`.
--    Inside the fragment, no unifier means the positioned values
--    contradict the equations; the read still claims `ClaimsComplete`,
--    so the check's refusal is a `SearchFault` RT8 counts as a defect.
-- 4. A hole (a type checking left open) becomes what today's lowering
--    makes of it (Specialize.purs `specialize`: a type hole is `Int`, a
--    row hole closes, Lower.purs), so σ is the instance today compiles:
--    the search binds it, and a requirement atom at an unbound flexible
--    variable never reaches G0's `RequirementUnjudged` backstop (Task 4.2
--    findings item 8). The check, not this choice, decides.
module Features.Check.Strategy.ReadBack
  ( ReadBack
  , readBack
  ) where

import Prelude
import Data.Array (all, concatMap, filter, length, mapMaybe)
import Data.Array as Array
import Data.Either (Either)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), snd)
import Domain.Checked.Internal as Checked
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom
  ( Atom(..)
  , Base(..)
  , CheckedName(..)
  , Quant(..)
  , RTExpr(..)
  , Role(..)
  , Var(..)
  , VarInfo
  )
import Domain.Recorded.Origin (Path)
import Domain.Type (VarId(..))
import Domain.Verdict (Claim(..))
import Features.Check.Entailed (fragment)
import Features.Check.Entailed.Merge (substitute)
import Features.Check.Entailed.Mgu (mgu)
import Features.Check.Mentions (mentions)
import Features.Check.Spine (spine, unspine)
import Features.Check.Strategy.Candidate (Substitution)
import Features.Check.Strategy.ReadBack.Position (Slotted, valueAt)
import Features.Check.Strategy.ReadBack.Type (holesIn, isHole)

-- `holes`: the holes step 4 bound, by index, ascending. The binding is a
-- provisional reading pending the author's ambiguity ruling, so its
-- effect stays visible (RT8 counts a Solved resting on one apart).
type ReadBack =
  { substitution ∷ Substitution, claim ∷ Claim, holes ∷ Array Int }

type Equation = Tuple RTExpr RTExpr

-- `Left` is the read-back's own failure: a position the checked body
-- does not have.
readBack ∷ RecordedProblem → Checked.FunctionDecl → Either String ReadBack
readBack problem checked = completed problem
  <$> traverse (positioned checked.body (slotted problem)) (flexible problem)

completed ∷ RecordedProblem → Array (Tuple Var RTExpr) → ReadBack
completed problem values =
  maybe (read ClaimsComplete values) completing
    (filter auxiliary <$> traverse placed equations)
  where
  view = fields problem
  known = Map.fromFoldable values
  equations = concatMap equation (map _.value view.d <> map _.value view.b)
  placed (Tuple one other) =
    Tuple <$> substitute known one <*> substitute known other
  auxiliary (Tuple one other) = mentions unknown one || mentions unknown other
  unknown variable = not (Map.member variable known)
    && maybe false isFlexible (Map.lookup variable view.vars)
  completing remaining =
    if all inFragment remaining then
      maybe (read ClaimsComplete values) (read ClaimsComplete <<< joined)
        (mgu (void view.vars) remaining)
    else read Heuristic values
  joined theta = map (under theta) values <> solved problem theta
  under theta (Tuple variable value) =
    Tuple variable (fromMaybe value (substitute theta value))
  inFragment (Tuple one other) = fragment one && fragment other

read ∷ Claim → Array (Tuple Var RTExpr) → ReadBack
read claim values =
  { substitution: Map.fromFoldable (map settledBinding values)
  , claim
  , holes: Array.sort (Array.nub (concatMap (holesIn <<< snd) values))
  }
  where
  settledBinding (Tuple variable value) = Tuple variable (settled value)

-- The unifier's bindings of the problem's flexible variables; made rows
-- and holes it bound are not the problem's.
solved ∷ RecordedProblem → Map.Map Var RTExpr → Array (Tuple Var RTExpr)
solved problem theta = filter ours (Map.toUnfoldable theta)
  where
  ours (Tuple variable _) = maybe false isFlexible
    (Map.lookup variable (fields problem).vars)

flexible ∷ RecordedProblem → Array (Tuple Var CheckedName)
flexible problem = mapMaybe placed (Map.toUnfoldable (fields problem).vars)
  where
  placed (Tuple variable info) = case info.position of
    Auxiliary → Nothing
    position
      | isFlexible info → Just (Tuple variable position)
      | otherwise → Nothing

positioned
  ∷ Checked.Expr
  → (Path → Int → Slotted)
  → Tuple Var CheckedName
  → Either String (Tuple Var RTExpr)
positioned body ranked (Tuple variable position) =
  Tuple variable <$> valueAt body ranked position

-- Slot `index` at `path`, ranked among the `inst` variables generation
-- recorded there (ReadBack.Position, P4). Partially applied to a
-- problem, it gathers the slots once.
slotted ∷ RecordedProblem → Path → Int → Slotted
slotted problem = ranked
  where
  slots = Map.fromFoldableWith (<>)
    (mapMaybe instSlot (Array.fromFoldable (Map.keys (fields problem).vars)))
  ranked path index =
    { index
    , rank: maybe 0 (length <<< filter (_ < index))
        (Map.lookup path slots)
    }

instSlot ∷ Var → Maybe (Tuple Path (Array Int))
instSlot = case _ of
  FreshVar path (Inst (VarId index)) → Just (Tuple path [ index ])
  FreshVar _ _ → Nothing
  RigidVar _ → Nothing

isFlexible ∷ VarInfo → Boolean
isFlexible info = case info.quant of
  Exists → true
  Forall _ → false

equation ∷ Atom → Array Equation
equation = case _ of
  Equal one other → [ Tuple one other ]
  Lacks _ _ → []
  Disjoint _ _ → []
  Ff → []

-- Step 4: a type hole is `Int`, a row hole is no tail.
settled ∷ RTExpr → RTExpr
settled ty = case ty of
  Arrow _ _ → unspine
    { parameters: map settled found.parameters, result: settled found.result }
  Base base → Base base
  TVar variable
    | isHole variable → Base IntBase
    | otherwise → ty
  Record entries tails →
    Record (map field entries) (filter (not <<< isHole) tails)
  App head arguments → App head (map settled arguments)
  where
  found = spine ty
  field (Tuple label value) = Tuple label (settled value)

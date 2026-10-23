-- Reduction through entailed equalities (Task 4.2; T-R0a §3.5, §18.69
-- Q2): a `BQ` atom's type under the most general unifier of the
-- problem's original equations (`D`'s and `B`'s `Equal` atoms), never a
-- candidate's binding. The written argument, reviewed before this
-- implementation, is docs/plans/r0-entailed-ground.md (EG, §3). It
-- lives outside Features.Check.Strategy* (controller ruling, Task 4.2
-- Q1): §3.2(a)'s detector reads it and imports no strategy.
--
-- `reduction problem` solves the equations once; partially applied, it
-- serves every atom of the problem.
module Features.Check.Entailed
  ( GroundType
  , Reduction(..)
  , entailedGround
  , groundType
  , reduction
  ) where

import Prelude
import Data.Array (all, concatMap, length, nub, sort, sortWith)
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (Atom(..), RTExpr(..), ReqAtom)
import Domain.Recorded.Origin (Entry)
import Features.Check.Entailed.Merge (substitute)
import Features.Check.Entailed.Mgu (mgu)
import Features.Check.GroundRule (atomType)
import Features.Check.Mentions (isGround)
import Features.Check.Spine (spine, unspine)

-- A type with no variable, no tail and no repeated label, its records
-- in label order (note §2, "Answer").
newtype GroundType = GroundType RTExpr

-- The reduced type; no unifier (a failure: the equations have no
-- solution, a rigid variable would be bound, or the type is undefined
-- under the unifier); or a record with several tails, or a repeated
-- label, among the equations (the whole-problem fragment, note §2).
data Reduction = Reduced RTExpr | NoUnifier | OutsideFragment

reduction ∷ RecordedProblem → RTExpr → Reduction
reduction problem = reduce
  where
  view = fields problem
  equations = concatMap equation (map _.value view.d <> map _.value view.b)
  inFragment = all sides equations
  sides (Tuple one other) = fragment one && fragment other
  solved = if inFragment then mgu (void view.vars) equations else Nothing
  reduce ty
    | not inFragment = OutsideFragment
    | otherwise = maybe NoUnifier Reduced (solved >>= substituted ty)
  substituted ty theta = substitute theta ty

-- `Just` only for a type every solution of the problem fixes (EG). A
-- type already ground is its own answer, with no unifier (note §2).
entailedGround ∷ RecordedProblem → Entry ReqAtom → Maybe GroundType
entailedGround problem = answer
  where
  reduce = reduction problem
  answer entry = reducedGround (atomType entry.value)
  reducedGround recorded = case reduce recorded of
    Reduced ty → ground ty
    NoUnifier → ground recorded
    OutsideFragment → ground recorded

groundType ∷ GroundType → RTExpr
groundType (GroundType ty) = ty

ground ∷ RTExpr → Maybe GroundType
ground ty =
  if isGround ty && fragment ty then Just (GroundType (canonical ty))
  else Nothing

equation ∷ Atom → Array (Tuple RTExpr RTExpr)
equation = case _ of
  Equal one other → [ Tuple one other ]
  Lacks _ _ → []
  Disjoint _ _ → []
  Ff → []

-- At most one tail and no repeated label, at every depth.
fragment ∷ RTExpr → Boolean
fragment ty = case ty of
  Arrow _ _ → all fragment found.parameters && fragment found.result
  Base _ → true
  TVar _ → true
  Record entries tails → length tails <= 1
    && length (nub (map fst entries)) == length entries
    && all (fragment <<< snd) entries
  App _ arguments → all fragment arguments
  where
  found = spine ty

canonical ∷ RTExpr → RTExpr
canonical ty = case ty of
  Arrow _ _ → unspine
    { parameters: map canonical found.parameters
    , result: canonical found.result
    }
  Base base → Base base
  TVar variable → TVar variable
  Record entries tails → Record (sortWith fst (map field entries)) (sort tails)
  App head arguments → App head (map canonical arguments)
  where
  found = spine ty
  field (Tuple label value) = Tuple label (canonical value)

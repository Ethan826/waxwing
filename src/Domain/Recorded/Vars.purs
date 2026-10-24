-- The variables a recorded type mentions, with repeats, left to right
-- (R0 Task 7.1: D1's seal check finds a handle in a `RigidName` site's
-- type). A spine is taken apart by a loop, as Domain.Recorded.Atom's
-- equality walks it; only parameters, fields and arguments recurse,
-- which nesting bounds.
module Domain.Recorded.Vars (variablesIn) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (concatMap, snoc)
import Data.Tuple (snd)
import Domain.Recorded.Atom (RTExpr(..), Var)

variablesIn ∷ RTExpr → Array Var
variablesIn ty = concatMap leaf found.parameters <> leaf found.result
  where
  found = tailRec unspined { parameters: [], result: ty }
  unspined spine = case spine.result of
    Arrow parameter rest → Loop
      { parameters: snoc spine.parameters parameter, result: rest }
    Base _ → Done spine
    TVar _ → Done spine
    Record _ _ → Done spine
    App _ _ → Done spine

leaf ∷ RTExpr → Array Var
leaf ty = case ty of
  Arrow _ _ → variablesIn ty
  Base _ → []
  TVar variable → [ variable ]
  Record entries tails → concatMap (variablesIn <<< snd) entries <> tails
  App _ arguments → concatMap variablesIn arguments

-- trusted surface: every diff needs token review; see docs/engineering.md
-- Which variables a recorded type mentions, as a type variable or a
-- record tail (Task 4.2), and whether it mentions none.
module Features.Check.Mentions
  ( isGround
  , isRigid
  , mentioned
  , mentions
  ) where

import Prelude
import Data.Array (any, concatMap)
import Data.Tuple (snd)
import Domain.Recorded.Atom (RTExpr(..), Var(..))
import Features.Check.Spine (spine)

mentions ∷ (Var → Boolean) → RTExpr → Boolean
mentions wanted ty = case ty of
  Arrow _ _ →
    any (mentions wanted) found.parameters || mentions wanted found.result
  Base _ → false
  TVar variable → wanted variable
  Record fields tails →
    any (mentions wanted <<< snd) fields || any wanted tails
  App _ arguments → any (mentions wanted) arguments
  where
  found = spine ty

-- The variables `mentions` asks about, with repeats, left to right
-- (BACKLOG R021: the triangular unifier follows them).
mentioned ∷ RTExpr → Array Var
mentioned ty = case ty of
  Arrow _ _ → concatMap mentioned found.parameters <> mentioned found.result
  Base _ → []
  TVar variable → [ variable ]
  Record fields tails → concatMap (mentioned <<< snd) fields <> tails
  App _ arguments → concatMap mentioned arguments
  where
  found = spine ty

isGround ∷ RTExpr → Boolean
isGround = not <<< mentions (const true)

isRigid ∷ Var → Boolean
isRigid = case _ of
  RigidVar _ → true
  FreshVar _ _ → false

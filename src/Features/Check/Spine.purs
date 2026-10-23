-- An arrow spine as an array (Task 4.2). A declaration of thousands of
-- parameters has a spine as long (Domain.Recorded.Atom's `Eq RTExpr`),
-- so a walk over a recorded type takes the spine apart by a loop and
-- recurses only into its parts, whose depth nesting bounds.
module Features.Check.Spine
  ( Spine
  , spine
  , unspine
  ) where

import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (foldr, snoc)
import Domain.Recorded.Atom (RTExpr(..))

-- `result` is never an arrow.
type Spine = { parameters ∷ Array RTExpr, result ∷ RTExpr }

spine ∷ RTExpr → Spine
spine ty = tailRec step { parameters: [], result: ty }
  where
  step found = case found.result of
    Arrow parameter rest → Loop
      { parameters: snoc found.parameters parameter, result: rest }
    Base _ → Done found
    TVar _ → Done found
    Record _ _ → Done found
    App _ _ → Done found

unspine ∷ Spine → RTExpr
unspine found = foldr Arrow found.result found.parameters

module Features.Check.RowMerge.End
  ( endOfBody
  , waitingSite
  , stillWaiting
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe)
import Domain.Syntax (Span)
import Features.Check.RowMerge.Predicate (anyWaiting, waiting)
import Features.Check.Subst (Subst)
import Features.Check.UnifyFailure (Failure(..))

-- The end of a body (R005 Tranche B plan §2.5), B3's part: no predicate
-- waits, so the substitution read with every unknown left `{}` is the
-- solution (`Solved`); otherwise placeholder P5, an `Unfinished` stop,
-- until B4 classifies what waits (H, then Unresolved).
endOfBody ∷ Subst → Either Failure Subst
endOfBody subst =
  if anyWaiting subst then Left (Placeholder stillWaiting) else Right subst

-- The earliest made waiting predicate's site: where P5 is reported.
waitingSite ∷ Subst → Maybe Span
waitingSite subst = Array.head (Array.mapMaybe _.site (waiting subst))

stillWaiting ∷ String
stillWaiting =
  "merge predicates still waiting at the end of a body are classified in "
    <> "Task B4"

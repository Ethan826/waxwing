module Features.Check.Refused (Failed, Solving, refusedBy) where

import Data.Either (Either(..))
import Data.Maybe (Maybe, maybe)
import Data.Tuple (Tuple(..))
import Features.Check.RowStore (Because(..), Lack)
import Features.Check.Subst (Flex, Subst)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

-- The caller's mismatch, at the substitution reached: the shape text
-- Tranche A gives a fact no clause explains.
type Failed = Subst → Either Failure Subst

-- What the row rules need from their caller: its mismatch, and the
-- binding of a meta to the empty row (Features.Check.RecordTail), which
-- U4 and a meta apart from itself make.
type Solving =
  { failed ∷ Failed, emptied ∷ Subst → Int → Either Failure Subst }

-- A label a tail may not take, by why it lacks it: D1 for a written
-- `lacks`; for a pair's reason D2 when the label was being bound, D3''
-- when a rigid tail may hold it; for an equation's reason D6 (rendered
-- from Task 6); otherwise the caller's mismatch, the shape text Tranche A
-- gives an implied lack.
refusedBy
  ∷ Failed → Subst → Maybe Flex → Tuple String Lack → Either Failure Subst
refusedBy failed subst rigid (Tuple label lack) = case lack.because of
  Lacks written → Left (Refused (Forbidden label written))
  Disjoint pair → paired pair
  Joined pair → paired pair
  Equated _ → Left (Refused (Derived label lack))
  _ → failed subst
  where
  paired pair = Left (Refused (maybe (Overlap label pair lack.from) held rigid))
  held tail = MayHold tail label lack.because

module Features.Check.Classify (Classified(..), classify) where

import Prelude
import Data.Either (either)
import Data.Maybe (maybe)
import Domain.Verdict (InternalFault(..), LimitReached)
import Features.Check.RowOutcome
  ( Caused
  , Contradiction
  , Stop(..)
  , classified
  )
import Features.Check.UnifyFailure (Failure)

-- A unifier failure's class for R0 (plan Task 2.1; T-R0a §10, AT16).
-- One match over `Failure` by name stays: RowOutcome's `classified`,
-- with no catch-all, so a new constructor forces a decision there. Its
-- stops give the limit, fault and placeholder classes; its
-- contradictions are refined by the fact it keeps, `caused`: a
-- predicate's (`FromMerge`, D6) is a hint, the rest a mismatch.
-- `Exhausted` is a fault (R0 Task 0.2), so is `Unexpected`.
--
-- Today's renderers (EndReport, Require, Record, Reject) still match
-- `Failure` by name, with one arm per constructor and no catch-all:
-- they read payloads no class keeps, and a predicate's failure wrapping
-- a stop goes to the predicate's renderer, where `classify` gives the
-- stop's class. Routing them through this value would change that, so
-- their texts and codes stay as they are (R0 ruling R11).
data Classified
  = AsHint Caused
  | AsLimit LimitReached
  | AsPlaceholder String
  | AsFault InternalFault
  | AsMismatch

classify ∷ Failure → Classified
classify = either stopped contradicted <<< classified

stopped ∷ Stop → Classified
stopped = case _ of
  Limit reached → AsLimit reached
  Internal what → AsFault (BrokenInvariant what)
  Unfinished what → AsPlaceholder what

contradicted ∷ Contradiction → Classified
contradicted found = maybe AsMismatch AsHint found.caused

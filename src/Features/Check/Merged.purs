module Features.Check.Merged (mergedAt, causedByMerge) where

import Prelude
import Data.Either (Either(..))
import Data.Map (Map)
import Data.Maybe (maybe)
import Domain.Syntax (Diagnostic, Span)
import Features.Check.Lacked (refusedAt)
import Features.Check.Placeholder (placeholderAt)
import Features.Check.Subst (Subst)
import Features.Check.UnifyFailure (Cause, Failure(..))

-- A failure a `Merge` predicate caused (R005 Tranche B B3), at the L2
-- location when it was found while re-examining (else where the caller
-- was checking). A broken fact keeps its own approved text (D1, D2, D3,
-- D3', D3'': R10.2's principle, plan §10 decision 5); anything else is
-- placeholder P2 until B5 renders D6.
mergedAt
  ∷ ∀ r a
  . { variables ∷ Array String, introduced ∷ Map String Span | r }
  → Subst
  → Span
  → Cause
  → Failure
  → Either Diagnostic a
mergedAt env subst span cause failure = Left case failure of
  Refused refusal → refusedAt env subst at refusal
  _ → placeholderAt at causedByMerge
  where
  at = maybe span identity cause.at

causedByMerge ∷ String
causedByMerge = "contradictions from merge predicates are reported in Task B5"

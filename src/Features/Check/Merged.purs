module Features.Check.Merged (mergedAt) where

import Prelude
import Data.Either (Either(..))
import Data.Maybe (maybe, maybe')
import Domain.Syntax (Diagnostic, Span)
import Data.Map (Map)
import Domain.Resolved (EffectInfo)
import Features.Check.TypeName (Names)
import Features.Check.Contradicted (contradicted)
import Features.Check.Lacked (refusedAt)
import Features.Check.Subst (Subst)
import Features.Check.UnifyFailure (Cause, Failure(..))

-- A failure a `Merge` predicate caused (R005 Tranche B B3), at the L2
-- location when it was found while re-examining (else where the caller
-- was checking). A broken fact keeps its own approved text (D1, D2, D3,
-- D3', D3'': R10.2's principle, plan §10 decision 5); anything else is
-- D6 (B5, Features.Check.Contradicted), or, when no part explains it,
-- `ordinary`'s text for the failure.
mergedAt
  ∷ ∀ r a
  . Names (effects ∷ Array EffectInfo, introduced ∷ Map String Span | r)
  → Subst
  → Span
  → Cause
  → Failure
  → (Failure → Either Diagnostic a)
  → Either Diagnostic a
mergedAt env subst span cause failure ordinary = case failure of
  Refused refusal → Left (refusedAt env subst at refusal)
  _ → maybe' plain Left (contradicted env subst span cause failure)
  where
  at = maybe span identity cause.at
  plain _ = ordinary failure

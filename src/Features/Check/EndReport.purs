module Features.Check.EndReport (endReport) where

import Prelude
import Data.Either (Either(..), either)
import Data.Maybe (maybe, maybe')
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Span, problemAt)
import Features.Check.Binding (inferredTypeLimit)
import Features.Check.Contradicted (contradicted)
import Features.Check.Placeholder (placeholderAt)
import Features.Check.RowMerge.End (endOfBody, ended, homeless, waitingSite)
import Features.Check.Subst (Subst)
import Features.Check.Unify (unifyPlain)
import Features.Check.TypeName (Names)
import Features.Check.UnifyFailure (Failure(..))
import Features.Check.Unresolved (undetermined)
import Domain.Resolved (EffectInfo)

-- The end of a body reported (R005 Tranche B plan §2.5, B4, B5). H's
-- refusal is its predicate's contradiction, D6 at T4's location
-- (Features.Check.Contradicted); an undecided body is D4
-- (Features.Check.Unresolved). A stop is reported as itself. `fallback`
-- is where to report when no predicate has a site.
endReport
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo, functionName ∷ String | r)
  → Span
  → Subst
  → Either Diagnostic Unit
endReport env fallback subst = either failed (ended accepted undecided)
  (endOfBody unifyPlain homeless subst)
  where
  site = maybe fallback identity (waitingSite subst)
  accepted _ = Right unit
  undecided reached merges = Left (undetermined env fallback reached merges)
  failed = case _ of
    FromMerge cause inner → Left $ maybe' (unexplained cause) identity
      (contradicted env subst site cause inner)
    Placeholder what → Left (placeholderAt site what)
    TooDeep → Left (problemAt (TypeTooDeep inferredTypeLimit) site)
    Unexpected what → Left (problemAt (Internal what) site)
    Exhausted what → Left (problemAt (Internal what) site)
    _ → Left (problemAt (Internal ended') site)
  ended' = "the end of a body failed outside its predicates"
  unexplained cause _ = problemAt (Internal unexplained')
    (maybe site identity cause.at)
  unexplained' = "a predicate's refusal at the end of a body names no part"

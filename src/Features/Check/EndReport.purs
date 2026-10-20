module Features.Check.EndReport (endReport, unresolvedLater) where

import Prelude
import Data.Either (Either(..), either)
import Data.Maybe (maybe)
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Span, problemAt)
import Features.Check.Binding (inferredTypeLimit)
import Features.Check.Merged (causedByMerge)
import Features.Check.Placeholder (placeholderAt)
import Features.Check.RowMerge.End (endOfBody, ended, homeless, waitingSite)
import Features.Check.Subst (Subst)
import Features.Check.Unify (unifyPlain)
import Features.Check.UnifyFailure (Failure(..))

-- The end of a body reported (R005 Tranche B plan §2.5, B4). H's refusal
-- is its predicate's contradiction: placeholder P2 at the predicate's
-- site until B5 renders D6 at the approved location. An undecided body is
-- placeholder P6 at the earliest waiting predicate's site until B5
-- renders D4. A stop is reported as itself. `fallback` is where to report
-- when no predicate has a site.
endReport ∷ Span → Subst → Either Diagnostic Unit
endReport fallback subst = either failed (ended accepted undecided)
  (endOfBody unifyPlain homeless subst)
  where
  site = maybe fallback identity (waitingSite subst)
  accepted _ = Right unit
  undecided _ _ = Left (placeholderAt site unresolvedLater)
  failed = case _ of
    FromMerge cause _ → Left
      (placeholderAt (maybe site identity cause.at) causedByMerge)
    Placeholder what → Left (placeholderAt site what)
    TooDeep → Left (problemAt (TypeTooDeep inferredTypeLimit) site)
    Unexpected what → Left (problemAt (Internal what) site)
    Exhausted what → Left (problemAt (Internal what) site)
    _ → Left (problemAt (Internal ended') site)
  ended' = "the end of a body failed outside its predicates"

unresolvedLater ∷ String
unresolvedLater = "unresolved merge predicates are reported in Task B5"

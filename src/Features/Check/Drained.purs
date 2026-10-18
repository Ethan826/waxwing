module Features.Check.Drained (classifiedAt, stoppedAt, siteOfFailure) where

import Data.Either (either)
import Data.Maybe (Maybe(..))
import Domain.Problem (Problem(TypeTooDeep))
import Domain.Problem as Problem
import Domain.Syntax (Diagnostic, Span, problemAt)
import Features.Check.Because (Equation(..))
import Features.Check.Binding (inferredTypeLimit)
import Features.Check.Placeholder (fromEquations, placeholderAt)
import Features.Check.RowOutcome (Stop(..), refusal)
import Features.Check.UnifyFailure (Failure(..))

-- A failure the drain met re-examining a pending equation (`Drained`),
-- rendered at `span` by what it establishes (Features.Check.RowOutcome
-- `refusal`): a limit as the depth limit, a broken invariant as
-- E_INTERNAL, a placeholder as itself, and a contradiction, which the
-- equation established, as D6 from Task 6 (its placeholder until then).
classifiedAt ∷ Span → Failure → Diagnostic
classifiedAt span failure = either (stoppedAt span) contradicted
  (refusal failure)
  where
  contradicted _ = placeholderAt span fromEquations

-- Why solving stopped, at `span`.
stoppedAt ∷ Span → Stop → Diagnostic
stoppedAt span = case _ of
  Limit → problemAt (TypeTooDeep inferredTypeLimit) span
  Internal what → problemAt (Problem.Internal what) span
  Unfinished what → placeholderAt span what

-- Where the drain's failure was met: its equation's site, if any.
siteOfFailure ∷ Failure → Maybe Span
siteOfFailure = case _ of
  Drained (Equation equation) _ → equation.site
  _ → Nothing

module Features.Check.EndReport (endReport) where

import Prelude
import Data.Array.NonEmpty as NonEmpty
import Data.Either (Either(..), either)
import Data.Maybe (fromMaybe)
import Domain.Checked.Internal as Checked
import Domain.Syntax (Diagnostic, Span)
import Features.Check.Because (Equation(..))
import Features.Check.Drained (classifiedAt, stoppedAt)
import Features.Check.Pending (Pending)
import Features.Check.Placeholder (placeholderAt, unresolvedEquations)
import Features.Check.RowOutcome (RowOutcome(..), endOfBody)
import Features.Check.Subst (Subst)

-- The end of a body (R005 Tranche B design §6, steps 1-2), after the
-- settle rounds and the drain reached their joint fixpoint and before
-- `settleFinal`, so that a Fail payload whose key waits on a record
-- equation reports the equation. Solved: nothing to report. Unresolved:
-- D4 at the earliest site of an equation still waiting with a constant
-- (R7, R11), Task 6's text, its placeholder until then. A stop is
-- reported as itself at the body; no contradiction arises here (the
-- drain reports its own where it meets it).
endReport ∷ Checked.Expr → Subst → Either Diagnostic Unit
endReport body subst = either stopped reported (endOfBody subst)
  where
  span = Checked.spanOf body
  stopped stop = Left (stoppedAt span stop)
  reported = case _ of
    Solved _ → Right unit
    Unresolved _ waiting → Left
      (placeholderAt (siteOf span (NonEmpty.head waiting)) unresolvedEquations)
    Contradiction found → Left (classifiedAt span found.failure)

siteOf ∷ Span → Pending → Span
siteOf body pending = fromMaybe body equation.site
  where
  Equation equation = pending.equation

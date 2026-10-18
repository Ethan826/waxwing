module Features.Check.Placeholder
  ( placeholderAt
  , fromEquations
  , unresolvedEquations
  ) where

import Prelude
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Span, problemAt)

-- R005 Tranche B: work a later task does is reported as an E_INTERNAL
-- that starts `R005B placeholder: `, so that `grep -rn "R005B
-- placeholder" src` lists what is left and no source can mistake the
-- gap for an answer. Each task removes the placeholders it replaces.
placeholderAt ∷ Span → String → Diagnostic
placeholderAt span what =
  problemAt (Internal ("R005B placeholder: " <> what)) span

-- D6, a contradiction an equation established, until Task 6 renders it.
fromEquations ∷ String
fromEquations = "contradictions from equations are reported in Task 6"

-- D4, a body that ends with an equation waiting, until Task 6.
unresolvedEquations ∷ String
unresolvedEquations = "unresolved row equations are reported in Task 6"

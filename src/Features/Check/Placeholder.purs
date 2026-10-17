module Features.Check.Placeholder (placeholderAt) where

import Prelude
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Span, problemAt)

-- R005 Tranche B: work a later task does is reported as an E_INTERNAL
-- that starts `R005B placeholder: `, so that `grep -rn "R005B
-- placeholder" src` lists what is left and no source can mistake the
-- gap for an answer. Each task removes the placeholders it replaces.
placeholderAt ∷ Span → String → Diagnostic
placeholderAt span what = problemAt (Internal ("R005B placeholder: " <> what))
  span

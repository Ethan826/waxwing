module Features.Resolve.RecordPattern (recordPattern) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe, isJust, maybe)
import Data.Traversable (traverse)
import Domain.Resolved (Local, Pattern(..))
import Domain.Syntax as Syntax
import Features.Resolve.Fresh (Fresh, liftEither)
import Features.Resolve.RecordFields (repeatedField, repeatedLabel)

type Resolution = { pattern ∷ Pattern, binders ∷ Array Local }

-- A record pattern's fields (R004 design §1). Repeated labels are refused
-- first, as in record types, so the error is at the second label whatever
-- the fields' patterns hold. Binders follow the fields in written order,
-- as a constructor's follow its sub-patterns.
recordPattern
  ∷ (Syntax.Pattern → Fresh Resolution)
  → Syntax.Span
  → Array Syntax.FieldPattern
  → Maybe Syntax.Span
  → Fresh Resolution
recordPattern walk span fields rest = do
  liftEither (distinct fields)
  resolved ← traverse fieldOf fields
  pure
    { pattern: Record span (map patternOf resolved) (isJust rest)
    , binders: Array.concatMap bindersOf resolved
    }
  where
  fieldOf field = withLabel field <$> walk field.pattern
  withLabel field resolution =
    { field:
        { label: field.label, span: field.span, pattern: resolution.pattern }
    , binders: resolution.binders
    }
  patternOf found = found.field
  bindersOf found = found.binders

distinct ∷ Array Syntax.FieldPattern → Either Syntax.Diagnostic Unit
distinct fields = maybe (pure unit) repeatedField
  (repeatedLabel (map named fields))
  where
  named field = { name: field.label, span: field.span }

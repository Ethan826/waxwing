module Features.Resolve.RecordPattern (recordPattern) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe, maybe)
import Data.Traversable (traverse)
import Domain.Resolved (Local, Pattern(..), Rest(..))
import Domain.Syntax as Syntax
import Features.Resolve.Fresh (Fresh, fresh, liftEither)
import Features.Resolve.RecordFields (repeatedField, repeatedLabel)

type Resolution = { pattern ∷ Pattern, binders ∷ Array Local }

-- A record pattern's fields (R004 design §1). Repeated labels are refused
-- first, as in record types, so the error is at the second label whatever
-- the fields' patterns hold. Binders follow the fields in written order,
-- as a constructor's follow its sub-patterns, then a named rest's (R005
-- design §3): it takes the next LocalId, as any binder does.
recordPattern
  ∷ (Syntax.Pattern → Fresh Resolution)
  → Syntax.Span
  → Array Syntax.FieldPattern
  → Maybe Syntax.Rest
  → Fresh Resolution
recordPattern walk span fields written = do
  liftEither (distinct fields)
  resolved ← traverse fieldOf fields
  ended ← restOf written
  pure
    { pattern: Record span (map patternOf resolved) ended.rest
    , binders: Array.concatMap bindersOf resolved <> ended.binders
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

type Ended = { rest ∷ Rest, binders ∷ Array Local }

-- None, a bare `...`, or `...name`, whose binder is in scope in the arm.
restOf ∷ Maybe Syntax.Rest → Fresh Ended
restOf = maybe (pure none) written
  where
  none = { rest: NoRest, binders: [] }
  ignored = { rest: IgnoredRest, binders: [] }
  written found = maybe (pure ignored) named found.name
  named label = bound label <$> fresh
  bound label id = { rest: NamedRest id, binders: [ { name: label.name, id } ] }

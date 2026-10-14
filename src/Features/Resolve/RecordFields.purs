module Features.Resolve.RecordFields (repeatedField, repeatedLabel) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe)
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Syntax as Syntax
import Features.Resolve.Repeated (laterRepeat)

-- A field of a record type, literal or update (R001).
type Labelled r = { name ∷ String, span ∷ Syntax.Span | r }

-- The first field, in source order, that repeats an earlier one's label,
-- with the earlier field: the error is at the repeat, noted at the first
-- (R001 design §6).
repeatedLabel
  ∷ ∀ r
  . Array (Labelled r)
  → Maybe { first ∷ Labelled r, again ∷ Labelled r }
repeatedLabel fields = do
  index ← laterRepeat (map label fields)
  again ← Array.index fields index
  first ← Array.find (sameLabel again) fields
  pure { first, again }
  where
  label field = field.name
  sameLabel again field = field.name == again.name

repeatedField
  ∷ ∀ a r
  . { first ∷ Labelled r, again ∷ Labelled r }
  → Either Syntax.Diagnostic a
repeatedField found = Left
  { problem: Duplicate DuplicateField found.again.name
  , span: found.again.span
  , related:
      [ { span: found.first.span, reason: Syntax.FirstWrittenHere } ]
  }

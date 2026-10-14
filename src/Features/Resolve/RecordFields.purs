module Features.Resolve.RecordFields (repeatedField, repeatedLabel) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe)
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Syntax as Syntax
import Features.Resolve.Repeated (laterRepeat)

-- The first field, in source order, that repeats an earlier one's label,
-- with the earlier field: the error is at the repeat, noted at the first
-- (R001 design §6).
repeatedLabel
  ∷ Array Syntax.FieldRef
  → Maybe { first ∷ Syntax.FieldRef, again ∷ Syntax.FieldRef }
repeatedLabel fields = do
  index ← laterRepeat (map label fields)
  again ← Array.index fields index
  first ← Array.find (sameLabel again) fields
  pure { first, again }
  where
  label field = field.name
  sameLabel again field = field.name == again.name

repeatedField
  ∷ ∀ a
  . { first ∷ Syntax.FieldRef, again ∷ Syntax.FieldRef }
  → Either Syntax.Diagnostic a
repeatedField found = Left
  { problem: Duplicate DuplicateField found.again.name
  , span: found.again.span
  , related:
      [ { span: found.first.span, reason: Syntax.FirstWrittenHere } ]
  }

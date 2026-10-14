module Features.Resolve.Record (recordLiteral, recordUpdate) where

import Prelude
import Data.Foldable (traverse_)
import Data.Traversable (traverse)
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.Fresh (Fresh, liftEither)
import Features.Resolve.RecordFields (repeatedField, repeatedLabel)

-- R001 design §6: a label written twice in one literal or update is
-- E_DUPLICATE at the second, noted at the first, before its values are
-- resolved. Values are resolved in written order.
recordLiteral
  ∷ (Syntax.Expr → Fresh Resolved.Expr)
  → Syntax.Span
  → Array Syntax.FieldValue
  → Fresh Resolved.Expr
recordLiteral nested span fields =
  Resolved.RecordLiteral span <$> fieldValues nested fields

-- The base is resolved first, as it is evaluated first (design §1).
recordUpdate
  ∷ (Syntax.Expr → Fresh Resolved.Expr)
  → Syntax.Span
  → Syntax.Expr
  → Array Syntax.FieldValue
  → Fresh Resolved.Expr
recordUpdate nested span base fields = Resolved.RecordUpdate span
  <$> nested base
  <*> fieldValues nested fields

fieldValues
  ∷ (Syntax.Expr → Fresh Resolved.Expr)
  → Array Syntax.FieldValue
  → Fresh (Array Resolved.FieldValue)
fieldValues nested fields = do
  liftEither (traverse_ repeatedField (repeatedLabel fields))
  traverse fieldValue fields
  where
  fieldValue found = resolvedOf found <$> nested found.value
  resolvedOf found value = { name: found.name, span: found.span, value }

module Features.Resolve.Record
  ( recordExtension
  , recordLiteral
  , recordRemoval
  , recordUpdate
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Domain.Problem (Problem(..))
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

-- R005 design §1: a literal holding a spread keeps its items in written
-- order. A second spread is refused first (until Tranche B), at the second;
-- then a label written twice, as in any literal; then the items are
-- resolved in written order, which is evaluation order.
recordExtension
  ∷ (Syntax.Expr → Fresh Resolved.Expr)
  → Syntax.Span
  → Array Syntax.LiteralItem
  → Fresh Resolved.Expr
recordExtension nested span items = do
  liftEither (singleSpread items)
  liftEither (traverse_ repeatedField (repeatedLabel (given items)))
  Resolved.RecordExtension span <$> traverse item items
  where
  item = case _ of
    Syntax.Given found → Resolved.Given <$> fieldValue nested found
    Syntax.Spreading at value → Resolved.Spreading at <$> nested value

-- `e without { l, … }` (design §3): the labels are checked for repeats
-- before the receiver is resolved, as a literal's are.
recordRemoval
  ∷ (Syntax.Expr → Fresh Resolved.Expr)
  → Syntax.Span
  → Syntax.Expr
  → Array Syntax.Label
  → Fresh Resolved.Expr
recordRemoval nested span receiver labels = do
  liftEither (traverse_ repeatedField (repeatedLabel labels))
  Resolved.RecordRemoval span <$> nested receiver <*> pure labels

-- The spans of the spreads past the first are errors.
singleSpread ∷ Array Syntax.LiteralItem → Either Syntax.Diagnostic Unit
singleSpread items = maybe (Right unit) tooMany (Array.index spreads 1)
  where
  spreads = Array.mapMaybe spreadAt items
  spreadAt = case _ of
    Syntax.Spreading at _ → Just at
    Syntax.Given _ → Nothing
  tooMany at = Left (Syntax.problemAt SecondSpread at)

given ∷ Array Syntax.LiteralItem → Array Syntax.FieldValue
given = Array.mapMaybe fieldOf
  where
  fieldOf = case _ of
    Syntax.Given found → Just found
    Syntax.Spreading _ _ → Nothing

fieldValues
  ∷ (Syntax.Expr → Fresh Resolved.Expr)
  → Array Syntax.FieldValue
  → Fresh (Array Resolved.FieldValue)
fieldValues nested fields = do
  liftEither (traverse_ repeatedField (repeatedLabel fields))
  traverse (fieldValue nested) fields

fieldValue
  ∷ (Syntax.Expr → Fresh Resolved.Expr)
  → Syntax.FieldValue
  → Fresh Resolved.FieldValue
fieldValue nested found = resolvedOf <$> nested found.value
  where
  resolvedOf value = { name: found.name, span: found.span, value }

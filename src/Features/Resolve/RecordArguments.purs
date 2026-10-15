module Features.Resolve.RecordArguments
  ( RecordArgument
  , asRow
  , hasRecordParameters
  , recordArguments
  , slotOf
  , subtypes
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.Marks (arrowRows)

-- A row written for a declared type's record parameter (R012): a record
-- type, whose fields join the declaration's and whose tail is the rest, or
-- a `...r` alone (no fields). `position` is the parameter's in the
-- declaration's written order.
type RecordArgument =
  { callee ∷ Int
  , position ∷ Int
  , fields ∷ Array Syntax.FieldRef
  , tail ∷ Maybe Syntax.RecordTail
  }

-- `{ ...s }` written for a row parameter is the argument `...s` (R012,
-- user-approved 2026-10-15), at the `...s`.
asRow ∷ Syntax.TypeArgument → Syntax.TypeArgument
asRow = case _ of
  Syntax.TypeArgument (Syntax.RecordRef _ [] (Just tail)) →
    Syntax.RowArgument
      (Syntax.RowRef tail.span [] (Just (Syntax.Spread tail.name)))
  argument → argument

-- Whether any declared type has a record parameter: without one no type
-- can hold a record argument, so programs before records skip the walks.
hasRecordParameters ∷ Array Resolved.TypeInfo → Boolean
hasRecordParameters = Array.any recordSorted
  where
  recordSorted info = Array.elem Syntax.RecordSort info.sourceSorts

-- The parameter's place among the declaration's variables, type and
-- record parameters first (Resolve.Types), which a field's `VarId` names.
slotOf ∷ Resolved.TypeInfo → Int → Int
slotOf info position = Array.length
  (Array.filter (notEq Syntax.RowSort) (Array.take position info.sourceSorts))

-- A type and every type written within it, outermost first. Recursion is
-- over written structure, which the nesting limits bound; an arrow chain
-- is walked by loops (`Syntax.typeRefSpine`).
subtypes ∷ Syntax.TypeRef → Array Syntax.TypeRef
subtypes reference = Array.cons reference
  (Array.concatMap subtypes (inner reference))

-- Every record argument written in a type, in source order.
recordArguments
  ∷ Array Resolved.TypeInfo → Syntax.TypeRef → Array RecordArgument
recordArguments types reference = Array.concatMap applied
  (subtypes reference)
  where
  applied = case _ of
    Syntax.NamedRef _ name arguments → maybe []
      (argumentsOf arguments)
      (Array.findIndex (named name) types)
    _ → []
  named name info = info.name == name
  argumentsOf arguments callee = Array.catMaybes
    (Array.mapWithIndex (argumentAt callee) arguments)
  argumentAt callee position argument =
    if recordAt callee position then rowOf callee position (asRow argument)
    else Nothing
  recordAt callee position = maybe false (sortIs position)
    (Array.index types callee)
  sortIs position info =
    Array.index info.sourceSorts position == Just Syntax.RecordSort
  rowOf callee position = case _ of
    Syntax.TypeArgument (Syntax.RecordRef _ fields tail) → Just
      { callee, position, fields, tail }
    Syntax.RowArgument
      (Syntax.RowRef span [] (Just (Syntax.Spread name))) → Just
      { callee, position, fields: [], tail: Just { name, span } }
    _ → Nothing

-- The types written directly within a type.
inner ∷ Syntax.TypeRef → Array Syntax.TypeRef
inner = case _ of
  Syntax.NamedRef _ _ arguments → Array.concatMap argument arguments
  Syntax.RecordRef _ fields _ → map fieldType fields
  Syntax.THandlerRef _ label row → label.arguments
    <> maybe [] rowTypes row
  arrow@(Syntax.FunRef _ _ _ _) → Array.snoc spine.parameters spine.result
    <> Array.concatMap (maybe [] rowTypes) (arrowRows arrow)
    where
    spine = Syntax.typeRefSpine arrow
  _ → []
  where
  argument = case _ of
    Syntax.TypeArgument found → [ found ]
    Syntax.RowArgument row → rowTypes row
  fieldType field = field.ty

rowTypes ∷ Syntax.RowRef → Array Syntax.TypeRef
rowTypes (Syntax.RowRef _ labels _) = Array.concatMap labelTypes labels
  where
  labelTypes label = label.arguments


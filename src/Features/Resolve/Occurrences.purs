module Features.Resolve.Occurrences
  ( Applied
  , Declared
  , Occurrence
  , resolvedDeclared
  , typeOccurrences
  , rowOccurrences
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Traversable (mapAccumL)
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.RecordArguments (asRow)
import Features.Resolve.TypeIndices (TypeIndices, indexOf)

-- The declared types as an argument's position sees them: each type's
-- index by name, built once per program (TypeIndices), and by index the
-- sort each of its parameters was written or settled with.
type Declared =
  { indices ∷ TypeIndices
  , sorts ∷ Array (Array Syntax.Sort)
  }

-- Where a variable stands as a declared type's argument: the type's index
-- and the parameter's position.
type Applied = { callee ∷ Int, position ∷ Int }

-- A written use of a variable, with the sort its place gives it: a record
-- tail is record sort, a `with` row effect sort, and an argument takes its
-- parameter's sort (R001 design §1).
type Occurrence =
  { name ∷ String
  , sort ∷ Syntax.Sort
  , span ∷ Syntax.Span
  , applied ∷ Maybe Applied
  }

-- The resolved types, with the sorts their parameters settled to.
resolvedDeclared ∷ TypeIndices → Array Resolved.TypeInfo → Declared
resolvedDeclared indices types = { indices, sorts: map sourceSorts types }
  where
  sourceSorts info = info.sourceSorts

typeOccurrences ∷ Declared → Syntax.TypeRef → Array Occurrence
typeOccurrences declared = case _ of
  Syntax.VarRef span name → [ occurrence name span Syntax.TypeSort ]
  -- No arguments, no occurrences: the name need not be looked up.
  Syntax.NamedRef _ _ [] → []
  Syntax.NamedRef _ name arguments → Array.concat
    ( Array.mapWithIndex (argument (declaredIndex name))
        arguments
    )
  Syntax.THandlerRef _ label row → labelOccurrences label
    <> maybe [] (rowOccurrences declared Nothing) row
  Syntax.RecordRef _ fields tail → Array.concatMap field fields
    <> maybe [] recordTail tail
  arrow@(Syntax.FunRef _ _ _ _) → arrowOccurrences arrow
  _ → []
  where
  declaredIndex name = indexOf declared.indices name
  -- `{ ...s }` for a row parameter is `...s` (R012).
  argument callee position found = case rowAt callee position found of
    Syntax.TypeArgument reference → typeOccurrences declared reference
    Syntax.RowArgument row → rowOccurrences declared
      (map (applied position) callee)
      row
  applied position callee = { callee, position }
  rowAt callee position found =
    if rowSlot callee position then asRow found else found
  rowSlot callee position = maybe false (rowParameter position)
    (callee >>= Array.index declared.sorts)
  rowParameter position sorts =
    Array.index sorts position /= Just Syntax.TypeSort
  field entry = typeOccurrences declared entry.ty
  recordTail tail = [ occurrence tail.name tail.span Syntax.RecordSort ]
  labelOccurrences label = Array.concatMap (typeOccurrences declared)
    label.arguments
  -- Each stage's annotation row follows the types, ordered by source
  -- offset when the occurrences are sorted.
  arrowOccurrences reference =
    Array.concatMap (typeOccurrences declared)
      (Array.snoc spine.parameters spine.result)
      <> Array.concatMap (maybe [] (rowOccurrences declared Nothing))
        taken.value
    where
    spine = Syntax.typeRefSpine reference
    taken = mapAccumL next reference
      (Array.replicate (Array.length spine.parameters) unit)
    next (Syntax.FunRef _ _ row result) _ = { accum: result, value: row }
    next result _ = { accum: result, value: Nothing }

-- A row's label arguments, then its tail. A tail written alone as the
-- argument of a declared type's parameter takes that parameter's sort; a
-- row with labels is an effect row.
rowOccurrences
  ∷ Declared → Maybe Applied → Syntax.RowRef → Array Occurrence
rowOccurrences declared place (Syntax.RowRef span labels tail) =
  Array.concatMap labelArguments labels <> maybe [] ending tail
  where
  labelArguments label = Array.concatMap (typeOccurrences declared)
    label.arguments
  ending Syntax.Pure = []
  ending (Syntax.Spread name) =
    [ (occurrence name span soleSort) { applied = sole } ]
  sole = if Array.null labels then place else Nothing
  soleSort =
    if Array.null labels then maybe Syntax.RowSort parameterSort place
    else Syntax.RowSort
  parameterSort found = maybe Syntax.RowSort (sortAt found.position)
    (Array.index declared.sorts found.callee)
  sortAt position sorts = recordOrRow
    (fromMaybe Syntax.RowSort (Array.index sorts position))
  recordOrRow sort =
    if sort == Syntax.RecordSort then sort else Syntax.RowSort

occurrence ∷ String → Syntax.Span → Syntax.Sort → Occurrence
occurrence name span sort = { name, span, sort, applied: Nothing }

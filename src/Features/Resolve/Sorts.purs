module Features.Resolve.Sorts (settleDeclarations) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Map as Map
import Data.Tuple (Tuple(..))
import Data.Maybe (Maybe(..))
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences
  ( Declared
  , Occurrence
  , typeOccurrences
  )
import Features.Resolve.RowSettle (settledPlaces)
import Features.Resolve.SortConflict (conflict, settledOccurrences)

-- Row parameters of the declarations take the sort their uses give them
-- (R001 design §1), in two phases. First, callee to caller: a parameter
-- takes the sort of its first use that has one, a direct use or an
-- argument passed to a parameter already settled, to a fixed point.
-- Second, caller to callee: a parameter still unconstrained takes the sort
-- its callers pass it; callers that disagree are the error at the later
-- argument. What is left is effect sort. Then each declaration's uses of a
-- variable must agree, the first use fixing the sort: a disagreement is
-- the row-sort error at the later use, noted at the first.
settleDeclarations
  ∷ Array Syntax.TypeDecl
  → Either Syntax.Diagnostic (Array Syntax.TypeDecl)
settleDeclarations declarations = do
  known ← settled
  let final = Array.mapWithIndex (record known) declarations
  traverse_ (consistent (declaredTypes final)) final
  pure final
  where
  settled =
    if Array.any hasRow declarations then
      settledPlaces declarations
        (map (ownUses (declaredTypes declarations)) declarations)
    else Right Map.empty
  hasRow declaration = Array.any isRow declaration.parameters
  record known index declaration = declaration
    { parameters = Array.mapWithIndex (sorted known index)
        declaration.parameters
    }

sorted
  ∷ Map.Map (Tuple Int Int) Boolean
  → Int
  → Int
  → Syntax.TypeParameter
  → Syntax.TypeParameter
sorted known index position parameter =
  if parameter.sort == Syntax.RowSort && isRecord then
    parameter { sort = Syntax.RecordSort }
  else parameter
  where
  isRecord = Map.lookup (Tuple index position) known == Just true

isRow ∷ Syntax.TypeParameter → Boolean
isRow parameter = parameter.sort /= Syntax.TypeSort

declaredTypes ∷ Array Syntax.TypeDecl → Declared
declaredTypes = map declared
  where
  declared declaration =
    { name: declaration.name, sorts: map sortOf declaration.parameters }
  sortOf parameter = parameter.sort

-- The uses of a declaration's own parameters in its constructor fields.
ownUses ∷ Declared → Syntax.TypeDecl → Array Occurrence
ownUses declared declaration = Array.filter own
  (Array.concatMap (typeOccurrences declared) fields)
  where
  fields = Array.concatMap ctorFields declaration.ctors
  ctorFields ctor = ctor.fields
  own occurrence = Array.any (called occurrence) declaration.parameters
  called occurrence parameter = parameter.name == occurrence.name

-- A declaration's uses of its row parameters must agree: the first use
-- fixes the sort. A record tail may not name a type parameter.
consistent ∷ Declared → Syntax.TypeDecl → Either Syntax.Diagnostic Unit
consistent declared declaration = traverse_ misused records
  *> void (settledOccurrences rowUses)
  where
  uses = ownUses declared declaration
  records = Array.filter (isSort Syntax.RecordSort) uses
  isSort sort occurrence = occurrence.sort == sort
  rowUses = Array.sortWith offset (Array.filter rowUse uses)
  rowUse occurrence = occurrence.sort /= Syntax.TypeSort
  offset occurrence = occurrence.span.start.offset
  misused occurrence = traverse_ (clash occurrence)
    (Array.find (called occurrence) declaration.parameters)
  called occurrence parameter = parameter.name == occurrence.name
    && parameter.sort == Syntax.TypeSort
  clash occurrence parameter = Left
    ( conflict occurrence
        (occurrence { sort = Syntax.TypeSort, span = parameter.span })
    )

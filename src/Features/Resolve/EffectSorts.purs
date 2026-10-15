module Features.Resolve.EffectSorts (effectSorts) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences
  ( Declared
  , Occurrence
  , rowOccurrences
  , typeOccurrences
  )
import Features.Resolve.SortConflict (settledOccurrences)

-- An effect's parameters are types, so an operation may not use one as a
-- record row, a record's tail or a declared type's record argument: the
-- sort error a declared type's parameter gets (R001 design §1), at the
-- use. Only record uses are judged here; type and effect-row uses keep
-- their existing checks.
-- `declared` is built once per program (Occurrences.resolvedDeclared).
effectSorts
  ∷ Declared → Syntax.EffectDecl → Either Syntax.Diagnostic Unit
effectSorts declared effect = traverse_ judged effect.operations
  where
  judged operation = void
    (settledOccurrences (map parameter effect.parameters <> uses operation))
  parameter entry =
    { name: entry.name, sort: entry.sort, span: entry.span, applied: Nothing }
  uses operation = Array.filter recordUse
    ( Array.concatMap (typeOccurrences declared)
        (Array.snoc (map parameterType operation.parameters) operation.result)
        <> maybe [] (rowOccurrences declared Nothing) operation.row
    )
  parameterType entry = entry.ty

recordUse ∷ Occurrence → Boolean
recordUse occurrence = occurrence.sort == Syntax.RecordSort

module Features.Resolve.SortConflict
  ( settledOccurrences
  , conflict
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Maybe (maybe)
import Domain.Problem (Problem(..))
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences (Occurrence)

-- The variables of a scope with their sorts, in first-occurrence order. A
-- variable has one sort, fixed by its first use; a later use of another
-- sort is diagnosed at that use. Two row sorts name the first use in a
-- note; a type against a row is the plain sort error (R001 design §1).
settledOccurrences
  ∷ Array Occurrence
  → Either Syntax.Diagnostic (Array { name ∷ String, sort ∷ Syntax.Sort })
settledOccurrences occurrences = map (map named) found
  where
  found = foldM insert [] (Array.sortWith offset occurrences)
  offset occurrence = occurrence.span.start.offset
  named occurrence = { name: occurrence.name, sort: occurrence.sort }
  insert before occurrence = maybe (Right (Array.snoc before occurrence))
    (same before occurrence)
    (Array.find (matching occurrence.name) before)
  matching name entry = entry.name == name
  same before occurrence previous
    | occurrence.sort == previous.sort = Right before
    | otherwise = Left (conflict occurrence previous)

conflict ∷ Occurrence → Occurrence → Syntax.Diagnostic
conflict occurrence previous = case occurrence.sort, previous.sort of
  Syntax.RowSort, Syntax.RecordSort → noted (RecordRowAsEffect name)
  Syntax.RecordSort, Syntax.RowSort → noted (EffectRowAsRecord name)
  _, _ → Syntax.problemAt (RowSort (occurrence.sort /= Syntax.TypeSort))
    occurrence.span
  where
  name = occurrence.name
  noted problem =
    { problem
    , span: occurrence.span
    , related: [ { span: previous.span, reason: Syntax.FirstWrittenHere } ]
    }

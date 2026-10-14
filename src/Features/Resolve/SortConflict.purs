module Features.Resolve.SortConflict
  ( settledOccurrences
  , conflict
  , misread
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Maybe (Maybe(..), maybe)
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

-- Two uses of a variable with different sorts: the error is at the later,
-- naming the sort the first gave it.
conflict ∷ Occurrence → Occurrence → Syntax.Diagnostic
conflict occurrence previous = case occurrence.sort, previous.sort of
  Syntax.RowSort, Syntax.RecordSort → misread previous.sort occurrence
    (Just previous)
  Syntax.RecordSort, Syntax.RowSort → misread previous.sort occurrence
    (Just previous)
  _, _ → Syntax.problemAt (RowSort (occurrence.sort /= Syntax.TypeSort))
    occurrence.span

-- A use that reads a variable of the given sort as the other row sort,
-- noted at the use that fixed it when there is one.
misread ∷ Syntax.Sort → Occurrence → Maybe Occurrence → Syntax.Diagnostic
misread sort occurrence first =
  { problem
  , span: occurrence.span
  , related: maybe [] noted first
  }
  where
  problem =
    if sort == Syntax.RecordSort then RecordRowAsEffect occurrence.name
    else EffectRowAsRecord occurrence.name
  noted previous =
    [ { span: previous.span, reason: Syntax.FirstWrittenHere } ]

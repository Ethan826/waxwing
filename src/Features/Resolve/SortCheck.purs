module Features.Resolve.SortCheck
  ( Use
  , declarationUses
  , givenArgument
  , settledUses
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences (Occurrence)
import Features.Resolve.RowSettle (Place)
import Features.Resolve.SortConflict (conflict, misread)

-- A use of a declaration's row parameter: the parameter's place and its
-- settled sort, and the use, whose sort is the one its place shows.
type Use = { place ∷ Place, own ∷ Syntax.Sort, use ∷ Occurrence }

-- The row uses of one declaration's parameters, in source order.
declarationUses ∷ Int → Syntax.TypeDecl → Array Occurrence → Array Use
declarationUses index declaration found = Array.sortWith offset
  (Array.mapMaybe located found)
  where
  located use = map (entry use) (Array.findIndex (called use) parameters)
  parameters = declaration.parameters
  called use parameter = parameter.name == use.name
    && parameter.sort /= Syntax.TypeSort
    && use.sort /= Syntax.TypeSort
  entry use position =
    { place: Tuple index position
    , own: sortAt position
    , use
    }
  sortAt position = maybe Syntax.RowSort sortOf
    (Array.index parameters position)
  sortOf parameter = parameter.sort

-- An argument passed to a parameter whose callers gave it its sort.
givenArgument ∷ Set Place → Occurrence → Boolean
givenArgument given use = maybe false member use.applied
  where
  member found = Set.member (Tuple found.callee found.position) given

-- Every use agrees with its variable's settled sort, once the uses within
-- the declaration agree with each other (Sorts.consistent). An argument to
-- a parameter its callers gave a sort is a clash between callers: the
-- error is at the later argument, naming its variable's own sort, noted at
-- the earlier.
settledUses ∷ Set Place → Array Use → Array Use → Either Syntax.Diagnostic Unit
settledUses given everything = traverse_ check
  where
  check found
    | found.own == found.use.sort = Right unit
    | givenArgument given found.use = Left (callerClash everything found)
    | otherwise = Left (stray everything found)

callerClash ∷ Array Use → Use → Syntax.Diagnostic
callerClash everything found = maybe' alone (later found)
  (Array.find agrees (Array.sortWith offset (Array.filter same everything)))
  where
  same other = other.use.applied == found.use.applied
  alone _ = misread found.own found.use Nothing
  later first other =
    if offset other < offset first then named first other
    else named other first
  named site note = misread site.own site.use (Just note.use)

-- A use that disagrees with its variable's sort though the declaration's
-- uses agree: the variable took its sort from another use, or from its
-- callers.
stray ∷ Array Use → Use → Syntax.Diagnostic
stray everything found = maybe' fromCallers within
  (Array.find agrees (Array.filter same everything))
  where
  same other = other.place == found.place
  within first =
    if offset first < offset found then conflict found.use first.use
    else conflict first.use found.use
  fromCallers _ = misread found.own found.use
    (map giver (Array.find agrees (Array.filter passed sorted)))
  sorted = Array.sortWith offset everything
  passed other = other.use.applied == Just (applied found.place)
  giver other = other.use

applied ∷ Place → { callee ∷ Int, position ∷ Int }
applied (Tuple callee position) = { callee, position }

agrees ∷ Use → Boolean
agrees found = found.own == found.use.sort

offset ∷ Use → Int
offset found = found.use.span.start.offset

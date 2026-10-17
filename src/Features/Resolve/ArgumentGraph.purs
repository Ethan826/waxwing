module Features.Resolve.ArgumentGraph
  ( ArgumentGraph
  , Written
  , argumentGraph
  , firstLabel
  , hasArguments
  , heldTogether
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Resolved (CtorId(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.ArgumentPairs (Key, Pair, ordered, together)
import Features.Resolve.RecordArguments
  ( hasRecordParameters
  , recordArguments
  , slotOf
  , subtypes
  )
import Features.Resolve.TypeIndices (Indexed)

-- A label a declaration writes beside a record parameter, where written.
type Written = { name ∷ String, span ∷ Syntax.Span }

type Candidate = { owner ∷ Key, span ∷ Syntax.Span }

-- What one record parameter writes beside itself and passes on to.
type Entry = { key ∷ Key, labels ∷ Array Written, passes ∷ Array Key }

-- Each record parameter's labels and the parameters it is passed to, built
-- once per program (R013). Looking the labels up per record argument meant
-- following the parameter down every declaration it reaches and walking
-- their fields again each time, so a chain of n declarations cost O(n²)
-- walks of the written types.
newtype ArgumentGraph = ArgumentGraph
  { present ∷ Boolean
  , passes ∷ Map Key (Array Key)
  , labelled ∷ Map String (Array Candidate)
  , together ∷ Set Pair
  }

-- Whether any declared type has a record parameter.
hasArguments ∷ ArgumentGraph → Boolean
hasArguments (ArgumentGraph graph) = graph.present

-- Whether a declaration writes two of its record parameters into one
-- record (Features.Resolve.ArgumentPairs), in either order.
heldTogether ∷ ArgumentGraph → Key → Key → Boolean
heldTogether (ArgumentGraph graph) one other =
  Set.member (ordered one other) graph.together

argumentGraph
  ∷ ∀ r
  . Indexed (ctors ∷ Array Resolved.CtorInfo | r)
  → ArgumentGraph
argumentGraph tables = ArgumentGraph
  { present
  , passes: Map.fromFoldable (map passing entries)
  , labelled: foldl noted Map.empty (Array.concatMap candidates entries)
  , together: if present then together tables else Set.empty
  }
  where
  present = hasRecordParameters tables.types
  entries =
    if present then Array.concat
      (Array.mapWithIndex (entriesOf tables) tables.types)
    else []
  passing entry = Tuple entry.key entry.passes
  candidates entry = map (candidate entry.key) entry.labels
  candidate owner label = Tuple label.name { owner, span: label.span }
  noted found (Tuple name one) = Map.alter (add one) name found
  add one = Just <<< maybe [ one ] (Array.cons one)

-- The first label of this name that the parameter's declarations write,
-- other than the argument's own written at `field.span`, in source order:
-- the one a record argument's label clashes with. The parameter's
-- declarations are the ones it is passed through, followed by a loop over
-- the graph's edges, so recursive declarations end.
firstLabel
  ∷ ArgumentGraph → Key → Written → Maybe Written
firstLabel (ArgumentGraph graph) from field = map toWritten
  (Array.head (Array.sortWith start (among others)))
  where
  others = Array.filter differs
    (maybe [] identity (Map.lookup field.name graph.labelled))
  differs label = label.span /= field.span
  among candidates =
    if Array.null candidates then []
    else Array.filter (reaches (reachable graph.passes from)) candidates
  reaches seen label = Set.member label.owner seen
  start label = label.span.start.offset
  toWritten label = { name: field.name, span: label.span }

entriesOf
  ∷ ∀ r
  . Indexed (ctors ∷ Array Resolved.CtorInfo | r)
  → Int
  → Resolved.TypeInfo
  → Array Entry
entriesOf tables owner info = Array.catMaybes
  (Array.mapWithIndex entry info.sourceSorts)
  where
  fields = Array.concatMap fieldSyntax info.ctors
  fieldSyntax (CtorId index) = maybe [] syntaxOf
    (Array.index tables.ctors index)
  syntaxOf ctor = ctor.fieldSyntax
  -- Shared by the declaration's record parameters.
  inside = Array.concatMap subtypes fields
  arguments = Array.concatMap (recordArguments tables) fields
  entry position sort
    | sort == Syntax.RecordSort = map (entered position)
        (Array.index info.variables (slotOf info position))
    | otherwise = Nothing
  entered position name =
    { key: Tuple owner position
    , labels: Array.concatMap (beside name) inside
    , passes: map place (Array.filter (passes name) arguments)
    }
  beside name = case _ of
    Syntax.RecordRef _ labels tails | Array.any (named name) tails →
      map label labels
    _ → []
  label field = { name: field.name, span: field.span }
  named name tail = tail.name == name
  passes name argument = Array.any (named name) argument.tails
  place argument = Tuple argument.callee argument.position

-- Every parameter a record parameter is passed to, directly or on, itself
-- included. Each wave is the parameters not yet met.
reachable ∷ Map Key (Array Key) → Key → Set Key
reachable passes from = tailRec step
  { wave: [ from ], seen: Set.singleton from }
  where
  step found =
    if Array.null found.wave then Done found.seen
    else Loop
      ( foldl admit { wave: [], seen: found.seen }
          (Array.concatMap onward found.wave)
      )
  onward key = maybe [] identity (Map.lookup key passes)
  admit found key
    | Set.member key found.seen = found
    | otherwise =
        { wave: Array.snoc found.wave key
        , seen: Set.insert key found.seen
        }

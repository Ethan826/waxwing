module Features.Check.FeedOrder (settleOrder) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe, maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Features.Check.Feed
  ( FeedRow
  , Feeds
  , components
  , inSourceOrder
  , positionOf
  , successors
  )
import Features.Check.Search (Stack(..), stackItems)

-- The condensation of the feed graph: each part's rows by position, the
-- parts each part feeds (once per feeding edge), and each part's earliest
-- position.
type Condensed =
  { parts ∷ Array (Array Int)
  , later ∷ Array (Array Int)
  , firsts ∷ Array Int
  }

-- Parts not yet released are counted by their feeders left; `ready` holds
-- those with none, by earliest position.
type Release =
  { ready ∷ Set (Tuple Int Int)
  , degrees ∷ Map Int Int
  , order ∷ Stack Int
  }

-- The order a round consumes the rows in (§3.5 (b)): the components of the
-- feed graph in a topological order, the earliest source position first
-- among those ready, and the rows of a component by position. Kahn's
-- algorithm on the condensation.
settleOrder ∷ Array FeedRow → Feeds → Array Int
settleOrder rows feeds = tailRec (release graph) (start graph)
  where
  graph = condense rows feeds

condense ∷ Array FeedRow → Feeds → Condensed
condense rows feeds =
  { parts, later: Array.mapWithIndex leaving parts, firsts: map earliest parts }
  where
  parts = map (Array.sortWith positionKey)
    (components feeds (inSourceOrder rows))
  positionKey node = Tuple (positionOf rows node) node
  owner = ownerMap parts
  leaving part members = Array.filter (differs part)
    (Array.mapMaybe ownerOf (Array.concatMap (successors feeds) members))
  differs part other = other /= part
  ownerOf node = Map.lookup node owner
  earliest members = fromMaybe 0 (positionOf rows <$> Array.head members)

-- The part each row is in.
ownerMap ∷ Array (Array Int) → Map Int Int
ownerMap parts = foldl placed Map.empty (Array.mapWithIndex Tuple parts)
  where
  placed found (Tuple part members) = foldl (place part) found members
  place part found member = Map.insert member part found

start ∷ Condensed → Release
start graph = { ready: Set.fromFoldable unfed, degrees, order: Bottom }
  where
  degrees = foldl counted Map.empty (Array.concat graph.later)
  counted found part = Map.insertWith (+) part 1 found
  unfed = Array.mapMaybe unfeds (Array.mapWithIndex Tuple graph.firsts)
  unfeds (Tuple part first) =
    if Map.member part degrees then Nothing else Just (Tuple first part)

release ∷ Condensed → Release → Step Release (Array Int)
release graph state = maybe' finished released (Set.findMin state.ready)
  where
  -- Lazy: the order is read once, not at every release.
  finished _ = Done (stackItems state.order)
  released found@(Tuple _ part) = Loop
    (foldl (lower graph) (emitted found part) (partsAfter part))
  partsAfter part = fromMaybe [] (Array.index graph.later part)
  emitted found part = state
    { ready = Set.delete found state.ready
    , order = foldl pushed state.order
        (fromMaybe [] (Array.index graph.parts part))
    }
  pushed order node = Push node order

-- One feeder of `part` is released: it becomes ready when none is left.
lower ∷ Condensed → Release → Int → Release
lower graph state part = maybe state lowered (Map.lookup part state.degrees)
  where
  lowered left =
    if left == 1 then state
      { degrees = Map.delete part state.degrees
      , ready = Set.insert (Tuple (earliestOf graph part) part) state.ready
      }
    else state { degrees = Map.insert part (left - 1) state.degrees }

earliestOf ∷ Condensed → Int → Int
earliestOf graph part = fromMaybe 0 (Array.index graph.firsts part)

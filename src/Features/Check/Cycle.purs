module Features.Check.Cycle (feedOrder, positiveCycle) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl, minimumBy)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Row
  ( EffectRef(..)
  , Label(..)
  , LabelKey
  , Row(..)
  , labelKey
  )
import Domain.Type (Ty)
import Domain.Type.Parts (typeHead)
import Features.Check.Feed
  ( FeedRow
  , Feeds
  , components
  , feedsOf
  , successors
  )
import Features.Check.FeedOrder (settleOrder)
import Features.Check.Subst (Flex)

-- The rows in the order one settling round consumes them (§3.5 (b)).
feedOrder ∷ Array FeedRow → Array Int
feedOrder rows = settleOrder rows (feedsOf rows)

-- What a search reads: the rows, the graph and each row's weight per key.
type Search =
  { rows ∷ Array FeedRow
  , feeds ∷ Feeds
  , weights ∷ Array (Map LabelKey Int)
  }

-- A cycle of the feed graph, reachable from `starts`, whose rows add more
-- labels of some key than their targets hold has no finite solution (§3.5
-- (c); review dup.wxw). The row reported is that cycle's earliest with a
-- positive weight for the key. A strongly connected component with an edge
-- is searched per key by Bellman-Ford: a relaxation in round |S| proves a
-- positive cycle.
positiveCycle ∷ Array FeedRow → Array Int → Maybe Int
positiveCycle rows starts = minimumBy (earlier rows)
  (Array.concatMap searched parts)
  where
  search = { rows, feeds, weights: map rowWeights rows }
  feeds = feedsOf rows
  parts = Array.filter (looping feeds) (components feeds starts)
  searched part = Array.mapMaybe (cycleFor search part)
    (positiveKeys search part)

earlier ∷ Array FeedRow → Int → Int → Ordering
earlier rows left right = compare (Tuple (positionAt rows left) left)
  (Tuple (positionAt rows right) right)

positionAt ∷ Array FeedRow → Int → Int
positionAt rows node = fromMaybe 0 (_.position <$> Array.index rows node)

-- A component can hold a cycle when it has two rows or a self-loop.
looping ∷ Feeds → Array Int → Boolean
looping feeds part = case part of
  [ node ] → Array.elem node (successors feeds node)
  _ → true

rowWeights ∷ FeedRow → Map LabelKey Int
rowWeights row = Map.fromFoldable (map entry keys)
  where
  own = counted row.keepFail row.own
  target = counted row.keepFail row.target
  keys = Array.fromFoldable (Set.union (Map.keys own) (Map.keys target))
  entry key = Tuple key (excess (count own key) (count target key))
  count counts key = fromMaybe 0 (Map.lookup key counts)

-- How many more labels of a key a row has than its target: the weight of
-- the row on a cycle, which no later binding changes (review dup.wxw: a
-- test of presence alone never ends on duplicates).
excess ∷ Int → Int → Int
excess own target = own - target

counted ∷ Boolean → Row (Ty Flex) Flex → Map LabelKey Int
counted keepFail (Row labels _) = foldl add Map.empty
  (Array.mapMaybe keyed labels)
  where
  add found key = Map.insertWith (+) key 1 found
  keyed label =
    if skipped label then Nothing else labelKey typeHead label
  skipped = case _ of
    Label FailEffect _ _ → not keepFail
    _ → false

weightOf ∷ Search → LabelKey → Int → Int
weightOf search key node = fromMaybe 0
  (Map.lookup key =<< Array.index search.weights node)

-- The keys some row of the component has an excess of.
positiveKeys ∷ Search → Array Int → Array LabelKey
positiveKeys search part = Array.fromFoldable (foldl gather Set.empty part)
  where
  gather found node = Set.union found (Set.fromFoldable (heavy node))
  heavy node = Array.mapMaybe positive
    (Map.toUnfoldable (fromMaybe Map.empty (Array.index search.weights node)))
  positive (Tuple key weight) = if weight > 0 then Just key else Nothing

type Edge = { from ∷ Int, to ∷ Int, weight ∷ Int }

-- The longest distance found to each row, the row each was reached from,
-- and the last row a pass moved.
type Pass =
  { distances ∷ Map Int Int
  , before ∷ Map Int Int
  , moved ∷ Maybe Int
  }

type Rounds = { number ∷ Int, pass ∷ Pass }

type Moved = { before ∷ Map Int Int, node ∷ Int }

-- The row of a positive cycle of this key in the component, if any.
cycleFor ∷ Search → Array Int → LabelKey → Maybe Int
cycleFor search part key = onCycle =<< relaxed
  where
  onCycle found = minimumBy (earlier search.rows)
    (Array.filter heavy (cycleOf found.before (landing found)))
  size = Array.length part
  members = Set.fromFoldable part
  edges = Array.concatMap leaving part
  leaving node = map (edge node)
    (Array.filter (inside members) (successors search.feeds node))
  edge node target =
    { from: node, to: target, weight: weightOf search key node }
  heavy node = weightOf search key node > 0
  landing found = stepBack found.before size found.node
  relaxed = tailRec (round size edges) { number: 1, pass: noPass }

inside ∷ Set Int → Int → Boolean
inside members node = Set.member node members

noPass ∷ Pass
noPass = { distances: Map.empty, before: Map.empty, moved: Nothing }

-- Relax every edge once. A relaxation in round |S| means a positive cycle
-- is reachable by the predecessor links.
round ∷ Int → Array Edge → Rounds → Step Rounds (Maybe Moved)
round size edges state = maybe (Done Nothing) moved pass.moved
  where
  moved node =
    if state.number >= size then Done (Just { before: pass.before, node })
    else Loop { number: state.number + 1, pass }
  pass = foldl relax (state.pass { moved = Nothing }) edges

relax ∷ Pass → Edge → Pass
relax pass edge =
  if reached > distance pass edge.to then pass
    { distances = Map.insert edge.to reached pass.distances
    , before = Map.insert edge.to edge.from pass.before
    , moved = Just edge.to
    }
  else pass
  where
  reached = distance pass edge.from + edge.weight

distance ∷ Pass → Int → Int
distance pass node = fromMaybe 0 (Map.lookup node pass.distances)

back ∷ Map Int Int → Int → Int
back before node = fromMaybe node (Map.lookup node before)

-- |S| steps back along the predecessor links land on the cycle.
stepBack ∷ Map Int Int → Int → Int → Int
stepBack before count node = tailRec walk { count, node }
  where
  walk state =
    if state.count <= 0 then Done state.node
    else Loop { count: state.count - 1, node: back before state.node }

-- The rows of the predecessor cycle through `start`.
cycleOf ∷ Map Int Int → Int → Array Int
cycleOf before start = tailRec walk [ start ]
  where
  walk visited = maybe (Done visited) (extend visited) (Array.last visited)
  extend visited node =
    if back before node == start then Done visited
    else Loop (Array.snoc visited (back before node))

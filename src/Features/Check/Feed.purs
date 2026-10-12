module Features.Check.Feed
  ( FeedRow
  , Feeds
  , feedsOf
  , components
  , successors
  , inSourceOrder
  , positionOf
  ) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, fromMaybe, maybe, maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Row (Row(..))
import Domain.Type (TyRow)
import Features.Check.Search (Stack(..), stackItems)
import Features.Check.Subst (Flex, metaOf)

-- A restricted row as the feed graph sees it (design §3.5 (b)): its own
-- row and its target, both resolved, whether `Fail` counts for it, and its
-- source position (the span start, P14).
type FeedRow =
  { own ∷ TyRow Flex
  , target ∷ TyRow Flex
  , keepFail ∷ Boolean
  , position ∷ Int
  }

-- The successors of each row: i feeds j when i's target and j's own row
-- end in the same unbound meta.
type Feeds = Array (Array Int)

feedsOf ∷ Array FeedRow → Feeds
feedsOf rows = map feeding rows
  where
  owners = foldl owned Map.empty (Array.mapWithIndex Tuple rows)
  owned found (Tuple index row) = maybe found (record found index)
    (tailMeta row.own)
  record found index meta = Map.insertWith (flip append) meta [ index ] found
  feeding row = fromMaybe [] (flip Map.lookup owners =<< tailMeta row.target)

tailMeta ∷ TyRow Flex → Maybe Int
tailMeta (Row _ tail) = metaOf =<< tail

-- Row indices by source position, ties by index.
inSourceOrder ∷ Array FeedRow → Array Int
inSourceOrder rows = map rowIndex (Array.sort (Array.mapWithIndex keyed rows))
  where
  keyed index row = Tuple row.position index
  rowIndex (Tuple _ index) = index

positionOf ∷ Array FeedRow → Int → Int
positionOf rows node = fromMaybe 0 (_.position <$> Array.index rows node)

-- Tarjan's walk, by a loop: `calls` are the rows being walked, each with
-- the index of its next successor; `open` the rows not yet in a component.
type Walk =
  { counter ∷ Int
  , numbers ∷ Map Int Int
  , lows ∷ Map Int Int
  , open ∷ Stack Int
  , onStack ∷ Set Int
  , calls ∷ Stack Call
  , roots ∷ Stack Int
  , found ∷ Stack (Array Int)
  }

type Call = { node ∷ Int, next ∷ Int }

-- The strongly connected components reachable from `roots`, in Tarjan's
-- completion order: a component comes before every component that
-- reaches it.
components ∷ Feeds → Array Int → Array (Array Int)
components feeds roots = tailRec (step feeds)
  { counter: 0
  , numbers: Map.empty
  , lows: Map.empty
  , open: Bottom
  , onStack: Set.empty
  , calls: Bottom
  , roots: Array.foldr Push Bottom roots
  , found: Bottom
  }

step ∷ Feeds → Walk → Step Walk (Array (Array Int))
step feeds walk = case walk.calls of
  Bottom → fromRoot walk
  Push call below → maybe' (finished call below)
    (Loop <<< follow walk call below)
    (Array.index (successors feeds call.node) call.next)
  where
  finished call below _ = Loop (finish walk call below)

successors ∷ Feeds → Int → Array Int
successors feeds node = fromMaybe [] (Array.index feeds node)

fromRoot ∷ Walk → Step Walk (Array (Array Int))
fromRoot walk = case walk.roots of
  Bottom → Done (stackItems walk.found)
  Push root rest
    | Map.member root walk.numbers → Loop walk { roots = rest }
    | otherwise → Loop (enter walk { roots = rest } root)

enter ∷ Walk → Int → Walk
enter walk node = walk
  { counter = walk.counter + 1
  , numbers = Map.insert node walk.counter walk.numbers
  , lows = Map.insert node walk.counter walk.lows
  , open = Push node walk.open
  , onStack = Set.insert node walk.onStack
  , calls = Push { node, next: 0 } walk.calls
  }

-- Walk the call's next successor: an unvisited one is entered, an open one
-- lowers the call's low link.
follow ∷ Walk → Call → Stack Call → Int → Walk
follow walk call below target = maybe (enter advanced target) seen
  (Map.lookup target walk.numbers)
  where
  seen number =
    if Set.member target walk.onStack then advanced
      { lows = Map.insertWith min call.node number advanced.lows }
    else advanced
  advanced = walk { calls = Push call { next = call.next + 1 } below }

-- A call with no successor left: its component is complete when its low
-- link is its own number; either way its parent's low link takes its.
finish ∷ Walk → Call → Stack Call → Walk
finish walk call below = lowered (completed walk call.node)
  where
  low = fromMaybe call.node (Map.lookup call.node walk.lows)
  lowered done = case below of
    Push parent _ → done
      { calls = below
      , lows = Map.insertWith min parent.node low done.lows
      }
    Bottom → done { calls = below }

completed ∷ Walk → Int → Walk
completed walk node =
  if Map.lookup node walk.lows == Map.lookup node walk.numbers then
    closed (popUntil node walk.open)
  else walk
  where
  closed popped = walk
    { open = popped.rest
    , onStack = foldl (flip Set.delete) walk.onStack popped.members
    , found = Push popped.members walk.found
    }

type Popped = { members ∷ Array Int, rest ∷ Stack Int }

popUntil ∷ Int → Stack Int → Popped
popUntil node open = tailRec pop { members: [], rest: open }
  where
  pop popped = case popped.rest of
    Bottom → Done popped
    Push top below
      | top == node → Done (taken popped top below)
      | otherwise → Loop (taken popped top below)
  taken popped top below =
    { members: Array.snoc popped.members top, rest: below }

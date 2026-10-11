module Features.Check.SyncCycle (cycleTest) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Set as Set
import Domain.Syntax (Diagnostic)
import Features.Check.Context (CheckEnv)
import Features.Check.Cycle (positiveCycle)
import Features.Check.Walked (End(..), endOf, headedRow)
import Features.Check.Feed (FeedRow, feedsOf)
import Features.Check.Filing (Mode, originOf)
import Features.Check.Reject (rejected)
import Features.Check.Restricted (ClauseEntry)
import Features.Check.Scheme (State)
import Features.Check.Search (Stack(..), stackItems)
import Features.Check.Unify (Failure(..), Subst)

-- F2: a positive cycle through the c to R edges of the rows reached from
-- `ids` is today's side-condition error, reported before any consumption.
-- The graph is the closure of those rows only (T003); `successors` finds
-- the clauses ending where a row's R ends.
cycleTest
  ∷ ∀ r
  . CheckEnv r
  → Mode
  → State
  → Array Int
  → Either Diagnostic Unit
cycleTest env mode state ids = maybe (Right unit) refuse
  (positiveCycle rows (feedsOf rows) (Array.range 0 (Array.length ids - 1)))
  where
  entries = Array.mapMaybe (flip Map.lookup state.restricted.clauses)
    (reachable state ids)
  rows = map (feedRow state.subst) entries
  refuse index = fromMaybe (Right unit)
    (rejectAt <$> Array.index entries index <*> Array.index rows index)
  rejectAt entry row = rejected env state (originOf mode entry)
    (RowSharedTail row.own row.target)

feedRow ∷ Subst → ClauseEntry → FeedRow
feedRow subst entry =
  { own: headedRow subst entry.row
  , target: headedRow subst entry.inference
  , keepFail: true
  , position: entry.handler.start.offset
  }

-- `ids` first, then every clause reached through a row's R tail.
reachable ∷ State → Array Int → Array Int
reachable state ids = ids <> stackItems
  ( tailRec walk
      { seen: Set.fromFoldable ids
      , found: Bottom
      , stack: foldl pushed Bottom ids
      }
  )
  where
  pushed stack id = Push id stack
  walk found = case found.stack of
    Bottom → Done found.found
    Push id rest → Loop (visit found id rest)
  visit found id rest = foldl add found { stack = rest } (successors id)
  add found next
    | Set.member next found.seen = found
    | otherwise = found
        { seen = Set.insert next found.seen
        , found = Push next found.found
        , stack = Push next found.stack
        }
  successors id = maybe [] filedUnder (tailOfInference id)
  filedUnder meta = maybe [] identity (Map.lookup meta state.restricted.byTail)
  tailOfInference id = do
    entry ← Map.lookup id state.restricted.clauses
    case endOf state.subst entry.inference of
      Loose meta → Just meta
      _ → Nothing

module Features.Check.Settle (settleRestricted) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Maybe (maybe)
import Data.Tuple (fst, snd)
import Domain.Checked.Internal as Checked
import Domain.Row (Row(..))
import Domain.Syntax (Diagnostic)
import Features.Check.Consume (consumeBare, consumeIgnoring, consumeLabels)
import Features.Check.Context (CheckEnv, Locals)
import Features.Check.Cycle (feedOrder, positiveCycle)
import Features.Check.Defer (failing, placed)
import Features.Check.Walked (bareLabel, headedRow, walkedRow)
import Features.Check.Failure (settleFinal, settleKeys)
import Features.Check.Feed (FeedRow, Feeds, feedsOf)
import Features.Check.Reject (rejected)
import Features.Check.Scheme (State)
import Features.Check.SettleEntry (Entry, EntryTail(..))
import Features.Check.SettleEntry as Entries
import Features.Check.Sync (syncSettling)
import Features.Check.TailPass (tailPass)
import Features.Check.Unify (Failure(..), Subst(..))

type Env r = CheckEnv (locals ∷ Locals | r)

-- The corrected §3.5 loop over every restricted row (the termination
-- review's "Corrected procedure"). Each round settles keys (a), resolves
-- the rows and builds the feed graph (b), rejects a cycle that has no
-- finite solution (c) and consumes each row in the graph's order (d). It
-- ends after a round in which (a) decided no pair and no row's label count
-- changed, whatever the binding that changed it, and (a) run after (d)
-- still decides nothing. A pair still set aside then is `Fail needs a
-- concrete error family`.
settleRestricted
  ∷ ∀ r. Env r → State → Checked.Expr → Either Diagnostic State
settleRestricted env state body = do
  exited ← tailRecM (round env body) state
  settled ← settleFinal env exited body
  tailPass env (exited { subst = settled })

round
  ∷ ∀ r
  . Env r
  → Checked.Expr
  → State
  → Either Diagnostic (Step State State)
round env body state = do
  subst ← settleKeys env state body
  let settled = state { subst = subst }
  keyed ← syncSettling env settled
  let entries = Entries.entries keyed.restricted keyed.deferrals
  let rows = map (feedRow keyed.subst) entries
  let feeds = feedsOf rows
  rejectCycle env keyed entries rows feeds
  consumed ← foldM (consume env entries) keyed (feedOrder rows feeds)
  retried ← retry env body consumed
  pure (continued (decided settled) (changed entries consumed) retried consumed)
  where
  continued decidedNow changedNow retried consumed =
    if decidedNow || changedNow || retried then Loop consumed
    else Done consumed
  -- (a) decided a pair: fewer are set aside than at the round's start.
  decided keyed = postponedCount keyed.subst < postponedCount state.subst
  changed entries consumed = counts entries consumed.subst
    /= counts entries state.subst
  counts entries subst = map (labelCount subst) entries

-- After (d): could a pair still set aside be decided now? The bindings of
-- (d) may give a deferred `Fail` key its head, which only (a) sees, so the
-- loop does not end until (a), run after (d), decides nothing.
retry ∷ ∀ r. Env r → Checked.Expr → State → Either Diagnostic Boolean
retry env body consumed =
  if postponedCount consumed.subst == 0 then Right false
  else decidable <$> settleKeys env consumed body
  where
  decidable subst = postponedCount subst < postponedCount consumed.subst

postponedCount ∷ Subst → Int
postponedCount (Subst bindings) = Array.length bindings.postponed

-- How many labels a row resolves to now: rows only grow at their tails,
-- so a change in the count is a change in the row.
labelCount ∷ Subst → Entry → Int
labelCount subst entry = Array.length labels
  where
  Row labels _ = walkedRow subst entry.own

feedRow ∷ Subst → Entry → FeedRow
feedRow subst entry =
  { own: headedRow subst entry.own
  , target: headedRow subst entry.target
  , keepFail: entry.keepFail
  , position: entry.position
  }

-- (c): a cycle whose rows add more of some key than their targets hold
-- has no finite solution. It is reported at the cycle's earliest row.
rejectCycle
  ∷ ∀ r
  . Env r
  → State
  → Array Entry
  → Array FeedRow
  → Feeds
  → Either Diagnostic Unit
rejectCycle env state entries rows feeds = maybe (Right unit) reported
  (positiveCycle rows feeds (Array.mapWithIndex indexOnly rows))
  where
  reported index = maybe (Right unit) (rejectAt index)
    (Array.index entries index)
  rejectAt index entry = maybe (Right unit) (refuse entry)
    (Array.index rows index)
  refuse entry row = rejected env state entry.origin
    (RowSharedTail row.own row.target)
  indexOnly index _ = index

-- (d): one entry's resolved labels consumed into its target with a fresh
-- tail (or, for a `Remainder` entry, the remainder's). `Fail` stays out of
-- a deferred row's labels, as it always has.
consume
  ∷ ∀ r. Env r → Array Entry → State → Int → Either Diagnostic State
consume env entries state index = maybe (Right state) consumed
  (Array.index entries index)
  where
  consumed entry = case entry.tail of
    Fresh → fresh entry
    Remainder remainder → remaining entry remainder
  -- A stage ending in the group's remainder (φ) consumes as it stands,
  -- ignoring marks (Task 7 registers the first such entries). It relies
  -- on φ being a bare tail when registered (no labels of its own), so only
  -- its tail is read; `ignoreMarks` and `sites` do not apply here.
  remaining entry (Row _ tail) = consumeIgnoring env state
    { origin: entry.origin
    , stage: Row (map fst (kept entry)) tail
    , target: entry.target
    }
  fresh entry = consumer entry env state
    { origin: entry.origin
    , sources: map snd (kept entry)
    , labels: map (shown entry) (kept entry)
    , target: entry.target
    , sites: entry.sites
    , ignoreMarks: entry.ignoreMarks
    }
  shown entry found
    | entry.bare = bareLabel state.subst (fst found)
    | otherwise = fst found
  consumer entry
    | entry.bare = consumeBare
    | otherwise = consumeLabels
  kept entry = Array.filter (carried entry)
    (placed state (labelsOf entry) entry.own)
  labelsOf entry = case walkedRow state.subst entry.own of
    Row labels _ → labels
  carried entry found = entry.keepFail || not (failing (fst found))

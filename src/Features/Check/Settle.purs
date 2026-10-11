module Features.Check.Settle (Entry, settleRestricted) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Row (Row(..))
import Domain.Syntax (Diagnostic)
import Domain.Type (TyRow)
import Features.Check.Consume (consumeLabels)
import Features.Check.Context (CheckEnv, Locals)
import Features.Check.Cycle (feedOrder, positiveCycle)
import Features.Check.Defer (crossing, failing, placed)
import Features.Check.Entry (resolvedRow)
import Features.Check.Failure (settleFinal, settleKeys)
import Features.Check.Feed (FeedRow, Feeds, feedsOf)
import Features.Check.Provenance (Origin)
import Features.Check.Reject (rejected)
import Features.Check.Scheme (Deferral, Site, State, flexibleRow)
import Features.Check.Unify (Failure(..), Subst(..))

type Env r = CheckEnv (locals ∷ Locals | r)

-- A restricted row (design §3.5): `own` is consumed into `target` every
-- round, whose labels' sites are `sites`; `keepFail` says whether `Fail`
-- labels travel, `ignoreMarks` whether marks are left alone. `origin` is
-- where a failure is reported and `position` the span start rows settle
-- in (P14).
type Entry =
  { own ∷ TyRow Open
  , target ∷ TyRow Open
  , sites ∷ Array Site
  , keepFail ∷ Boolean
  , ignoreMarks ∷ Boolean
  , origin ∷ Origin
  , position ∷ Int
  }

-- Task 5's entries: one per deferral, in source order (ties by the order
-- they were registered in; deferrals are stored post-order).
deferralEntries ∷ Array Deferral → Array Entry
deferralEntries deferrals = map entryOf (Array.sortWith start numbered)
  where
  numbered = Array.mapWithIndex Tuple deferrals
  start (Tuple index found) = Tuple found.span.start.offset index
  entryOf (Tuple _ found) =
    { own: found.row
    , target: found.current
    , sites: found.sites
    , keepFail: false
    , ignoreMarks: false
    , origin: crossing found.span
    , position: found.span.start.offset
    }

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
  exited ← tailRecM (round env entries body) state
  settled ← settleFinal env exited body
  pure exited { subst = settled }
  where
  entries = deferralEntries state.deferrals

round
  ∷ ∀ r
  . Env r
  → Array Entry
  → Checked.Expr
  → State
  → Either Diagnostic (Step State State)
round env entries body state = do
  subst ← settleKeys env state body
  let keyed = state { subst = subst }
  let rows = map (feedRow keyed.subst) entries
  let feeds = feedsOf rows
  rejectCycle env keyed entries rows feeds
  consumed ← foldM (consume env entries) keyed (feedOrder rows feeds)
  retried ← retry env body consumed
  pure (continued keyed consumed retried)
  where
  continued keyed consumed retried =
    if decided keyed || changed consumed || retried then Loop consumed
    else Done consumed
  -- (a) decided a pair: fewer are set aside than at the round's start.
  decided keyed = postponedCount keyed.subst < postponedCount state.subst
  changed consumed = counts consumed.subst /= counts state.subst
  counts subst = map (labelCount subst) entries

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
  Row labels _ = resolvedRow subst entry.own

feedRow ∷ Subst → Entry → FeedRow
feedRow subst entry =
  { own: flexibleRow (resolvedRow subst entry.own)
  , target: flexibleRow (resolvedRow subst entry.target)
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
-- tail. `Fail` stays out of a deferred row's labels, as it always has.
consume
  ∷ ∀ r. Env r → Array Entry → State → Int → Either Diagnostic State
consume env entries state index = maybe (Right state) consumed
  (Array.index entries index)
  where
  consumed entry = consumeLabels env state
    { origin: entry.origin
    , sources: map snd (kept entry)
    , labels: map fst (kept entry)
    , target: entry.target
    , sites: entry.sites
    , ignoreMarks: entry.ignoreMarks
    }
  kept entry = Array.filter (carried entry)
    (placed state (labelsOf entry) entry.own)
  labelsOf entry = case resolvedRow state.subst entry.own of
    Row labels _ → labels
  carried entry found = entry.keepFail || not (failing (fst found))

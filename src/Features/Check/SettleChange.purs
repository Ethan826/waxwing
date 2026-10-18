module Features.Check.SettleChange
  ( Round
  , moved
  , retry
  , postponedCount
  , labelCount
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Domain.Checked.Internal as Checked
import Domain.Row (Row(..))
import Domain.Syntax (Diagnostic)
import Features.Check.Context (CheckEnv)
import Features.Check.Failure (settleKeys)
import Features.Check.Scheme (State)
import Features.Check.SettleEntry (Entry)
import Features.Check.Unify (Subst(..))
import Features.Check.Walked (walkedRow)

-- One settle round's states: as it began, after (a) settled the keys,
-- and after (d) consumed every row; its entries; and whether (a), run
-- again after (d), could decide a pair.
type Round =
  { start ∷ State
  , settled ∷ State
  , consumed ∷ State
  , entries ∷ Array Entry
  , retried ∷ Boolean
  }

-- Whether the round moved: (a) decided a pair (fewer are set aside than
-- at the round's start), some row's label count changed, or (a) could
-- decide one after (d).
moved ∷ Round → Boolean
moved found = decided || changed || found.retried
  where
  decided = postponedCount found.settled.subst
    < postponedCount found.start.subst
  changed = counts found.consumed.subst /= counts found.start.subst
  counts subst = map (labelCount subst) found.entries

-- After (d): could a pair still set aside be decided now? The bindings of
-- (d) may give a deferred `Fail` key its head, which only (a) sees, so the
-- loop does not end until (a), run after (d), decides nothing.
retry ∷ ∀ r. CheckEnv r → Checked.Expr → State → Either Diagnostic Boolean
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

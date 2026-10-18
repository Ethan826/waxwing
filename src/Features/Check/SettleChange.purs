module Features.Check.SettleChange
  ( Round
  , moved
  , retry
  , drainedRound
  , postponedCount
  , labelCount
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Maybe (fromMaybe)
import Domain.Checked.Internal as Checked
import Domain.Row (Row(..))
import Domain.Syntax (Diagnostic)
import Features.Check.Context (CheckEnv)
import Features.Check.Failure (settleKeys)
import Features.Check.Scheme (State)
import Features.Check.SettleEntry (Entry)
import Features.Check.Drained (classifiedAt, siteOfFailure)
import Features.Check.Subst (storeOf)
import Features.Check.Unify (Subst(..), drain)
import Features.Check.Waits (versionOf)
import Features.Check.Walked (walkedRow)

-- One settle round's states: as it began, after (a) settled the keys,
-- after (d) consumed every row, and after its drain; its entries; and
-- whether (a), run again after (d), could decide a pair.
type Round =
  { start ∷ State
  , settled ∷ State
  , consumed ∷ State
  , drained ∷ State
  , entries ∷ Array Entry
  , retried ∷ Boolean
  }

-- Whether the round moved: (a) decided a pair (fewer are set aside than
-- at the round's start), some row's label count changed, (a) could
-- decide one after (d), or the round's drain changed a variable (R005
-- Tranche B design §6: the rounds stop only when neither the effect rows
-- nor the record equations move).
moved ∷ Round → Boolean
moved found = decided || changed || found.retried || drainedSome
  where
  drainedSome = versionOf (storeOf found.drained.subst)
    /= versionOf (storeOf found.consumed.subst)
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

-- The round's drain (design §6, the joint fixpoint): a retry or a
-- consumption binds metas outside a top-level unification, so the record
-- equations they woke are examined here. A failure is the equation's,
-- reported at its site, or at the body.
drainedRound
  ∷ ∀ r. CheckEnv r → Checked.Expr → State → Either Diagnostic State
drainedRound _ body consumed = either failed drained (drain consumed.subst)
  where
  drained subst = Right consumed { subst = subst }
  failed failure = Left (classifiedAt (siteOf failure) failure)
  siteOf failure = fromMaybe (Checked.spanOf body) (siteOfFailure failure)

postponedCount ∷ Subst → Int
postponedCount (Subst bindings) = Array.length bindings.postponed

-- How many labels a row resolves to now: rows only grow at their tails,
-- so a change in the count is a change in the row.
labelCount ∷ Subst → Entry → Int
labelCount subst entry = Array.length labels
  where
  Row labels _ = walkedRow subst entry.own

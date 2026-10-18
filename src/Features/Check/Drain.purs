module Features.Check.Drain
  ( Wake
  , Reexamine
  , drainWith
  , indexed
  , rescan
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Either (Either(..), either)
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Features.Check.Pending (Pending)
import Features.Check.RowStore (RowStore)
import Features.Check.Subst (Subst, onStore, storeOf)
import Features.Check.UnifyFailure (Failure(..))
import Features.Check.Waits
  ( entryOf
  , nested
  , nestingOf
  , pendingIds
  , unwake
  , versionOf
  , waitingOf
  , withdraw
  )

-- One pending equation examined again: the same forced moves, on its
-- residue (Features.Check.UnifyRecord `reexamine`), passed in so that
-- tests can inject a re-examination that stops.
type Reexamine = Subst → Pending → Either Failure Subst

-- Which pending equations a drain re-examines (ledger L32). `ready`: the
-- drain has anything to do; `due`: whether a pass examines this one;
-- `again`: whether another pass follows, from the store before and after
-- the pass. Injected, never chosen by a flag: the checker uses `indexed`,
-- and tests compare it with `rescan`, the reference.
type Wake =
  { ready ∷ RowStore → Boolean
  , due ∷ RowStore → Int → Boolean
  , again ∷ RowStore → RowStore → Boolean
  }

-- The equations a change woke (the index of every variable their rules
-- read, Features.Check.Waits `readsOf`), until none is woken.
indexed ∷ Wake
indexed = { ready: woken, due: wokenAt, again: stillWoken }
  where
  woken store = not (Set.isEmpty (waitingOf store).woken)
  wokenAt store id = Set.member id (waitingOf store).woken
  stillWoken _ after = woken after

-- Every pending equation, pass after pass, until a pass changes no
-- variable: the full rescan the indexed drain must agree with.
rescan ∷ Wake
rescan = { ready: anyWaiting, due: always, again: moved }
  where
  anyWaiting store = not (Map.isEmpty (waitingOf store).entries)
  always _ _ = true
  moved before after = versionOf before /= versionOf after

-- The drain (design §2.6, rules §9): each pass visits the pending
-- equations oldest first and re-examines those `wake` makes due, one at
-- a time, each taken out of the table first so that waiting again
-- replaces it (and one nested in it takes its site); passes repeat while
-- `wake` asks. Each re-examination keeps the solutions, so the drain does.
-- It runs inside unification: a failure stays a `Failure`, marked as the
-- drain's (`Drained`, with the equation re-examined), and is classified
-- only at the boundary (Features.Check.RowOutcome): a limit or a broken
-- invariant is still a stop, never a verdict. Terminates: a pass that
-- changes nothing wakes nothing (rules §13).
drainWith ∷ Wake → Reexamine → Subst → Either Failure Subst
drainWith wake reexamine subst =
  if wake.ready (storeOf subst) then tailRecM pass subst else Right subst
  where
  pass reached = next reached <$> foldM visit reached (pendingIds reached)
  next before after =
    if wake.again (storeOf before) (storeOf after) then Loop after
    else Done after
  visit reached id = maybe (Right reached) (visited reached id)
    (entryOf reached id)
  visited reached id pending =
    if wake.due (storeOf reached) id then examined reached id pending
    else Right (unwake id reached)
  examined reached id pending = either (Left <<< Drained pending.equation)
    (Right <<< onStore (nested (nestingOf (storeOf reached))))
    (reexamine (opened reached id pending) pending)
  opened reached id pending = onStore (nested (Just pending.equation))
    (withdraw id reached)

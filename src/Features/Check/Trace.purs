-- The live-value trace (tranche 2 read-back design §C; dossier §18.155
-- (3), (4)): the values the checker already allocates at a use, an
-- applied argument and a pipe, and (Task 6b) the handler clause entries,
-- deferrals and installations `State` registers, kept under the span
-- where each was made, for the effect read-back to read once checking
-- is done. Untrusted search, not on the trusted surface.
--
-- Collection only appends: no inference module can read a `Trace` (its
-- constructor is not exported, and it has no Eq, Ord, Show or Generic
-- instance), so no unification, refusal or diagnostic depends on it.
-- `finish`, imported by Check/Function.purs alone, reads it after every
-- check has run. Fail-closed: entries under one key are kept in arrival
-- order; nothing overwrites, deduplicates or chooses, so a key met
-- twice surfaces at read-back as a clash, never here.
module Features.Check.Trace
  ( module Features.Check.Trace.Types
  , Trace
  , emptyTrace
  , recordUse
  , recordApplied
  , recordPiped
  , recordClause
  , recordDeferral
  , recordInstallation
  , finish
  ) where

import Prelude
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Syntax (Span)
import Domain.Type (Ty, TyRow, rename)
import Features.Check.Trace.Types
  ( ClauseTrace
  , InstallTrace
  , Slot(..)
  , SpanKey
  , TraceKey(..)
  , Traced
  , UseTrace
  , emptyTraced
  , extended
  , mapTraced
  )

-- Raw values, metas as allocated.
newtype Trace = Trace Traced

emptyTrace ∷ Trace
emptyTrace = Trace emptyTraced

recordUse ∷ Span → UseTrace → Trace → Trace
recordUse span use (Trace raw) = Trace raw
  { uses = appended (spanKey span) use raw.uses }

-- An applied stage, keyed by the Apply's span and its argument's span
-- (design §C.2, review M3: an over-applied call's Apply shares its span
-- with the saturated call).
recordApplied ∷ Span → Span → TyRow Open → Trace → Trace
recordApplied span argument row (Trace raw) = Trace raw
  { applied = appended (Tuple (spanKey span) (spanKey argument)) row
      raw.applied
  }

-- A pipe's stage, keyed by its left operand's span.
recordPiped ∷ Span → TyRow Open → Trace → Trace
recordPiped argument row (Trace raw) = Trace raw
  { piped = appended (spanKey argument) row raw.piped }

-- A handler clause's entry, keyed by the clause's span (each clause of
-- a handler has its own), recorded where Check/Clauses.purs registers it.
recordClause ∷ Span → ClauseTrace → Trace → Trace
recordClause clause entry (Trace raw) = Trace raw
  { clauses = appended (spanKey clause) entry raw.clauses }

-- A `defer`'s row, keyed by the deferred expression's span: the checked
-- body keeps no `defer` item span, so this is the span the read-back
-- can find (Check/Defer.purs).
recordDeferral ∷ Span → TyRow Open → Trace → Trace
recordDeferral value row (Trace raw) = Trace raw
  { deferrals = appended (spanKey value) row raw.deferrals }

-- A `with` installation, keyed by the `with`'s span (Check/Install.purs).
recordInstallation ∷ Span → InstallTrace → Trace → Trace
recordInstallation span entry (Trace raw) = Trace raw
  { installations = appended (spanKey span) entry raw.installations }

-- Every type and row resolved by `resolve` (the final substitution), then
-- each meta in the body's `numbering` takes its number there, and every
-- other meta an extension number from the numbering's size upward, in
-- first-occurrence order over the trace (design §C.3).
finish ∷ (Ty Open → Ty Open) → Map Int Int → Trace → Traced
finish resolve numbering (Trace raw) = mapTraced (rename renumber) resolved
  where
  resolved = mapTraced resolve raw
  numbers = extended numbering resolved
  renumber = case _ of
    Hole meta → Hole (maybe meta identity (Map.lookup meta numbers))
    rigid → rigid

spanKey ∷ Span → SpanKey
spanKey span = Tuple span.start.offset span.end.offset

appended ∷ ∀ k a. Ord k ⇒ k → a → Map k (Array a) → Map k (Array a)
appended key value = Map.alter (Just <<< maybe [ value ] added) key
  where
  added earlier = Array.snoc earlier value

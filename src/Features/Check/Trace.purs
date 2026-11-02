-- The live-value trace (tranche 2 read-back design §C; dossier §18.155
-- (3), (4)): the values the checker already allocates at a use, an
-- applied argument and a pipe, kept under the span where each was made,
-- for the effect read-back to read once checking is done. Untrusted
-- search, not on the trusted surface.
--
-- Collection only appends: no inference module can read a `Trace` (its
-- constructor is not exported, and it has no Eq, Ord, Show or Generic
-- instance), so no unification, refusal or diagnostic depends on it.
-- `finish`, imported by Check/Function.purs alone, reads it after every
-- check has run. Fail-closed: entries under one key are kept in arrival
-- order; nothing overwrites, deduplicates or chooses, so a key met
-- twice surfaces at read-back as a clash, never here.
module Features.Check.Trace
  ( Trace
  , SpanKey
  , TraceKey(..)
  , Slot(..)
  , UseTrace
  , Traced
  , emptyTrace
  , recordUse
  , recordApplied
  , recordPiped
  , finish
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Row (Mark)
import Domain.Syntax (Span)
import Domain.Type (Ty(..), TyRow, rename)
import Features.Check.Holes (foldHoles)

-- A span's start and end offsets.
type SpanKey = Tuple Int Int

-- Where a traced value is kept: a use, an applied argument (the Apply's
-- span and the argument's), or a pipe's left operand. The read-back
-- names a clash by it.
data TraceKey
  = UseKey SpanKey
  | AppliedKey SpanKey SpanKey
  | PipedKey SpanKey

derive instance eqTraceKey ∷ Eq TraceKey
derive instance ordTraceKey ∷ Ord TraceKey

instance showTraceKey ∷ Show TraceKey where
  show = case _ of
    UseKey key → "(UseKey " <> show key <> ")"
    AppliedKey key argument →
      "(AppliedKey " <> show key <> " " <> show argument <> ")"
    PipedKey key → "(PipedKey " <> show key <> ")"

-- A scheme variable's instance at one use (Check/Scheme.purs
-- `instantiate`): a row variable's meta is a row's tail, bound in the
-- substitution's row table, so it is kept as a row and read as one; a
-- type or record variable's is a type.
data Slot = TypeSlot (Ty Open) | RowSlot (TyRow Open)

-- One use's allocated values: `slots` by VarId; `marks`, each mark
-- name's meta (Check/MarkUse.purs `instantiateMarks`), kept raw for the
-- read-back to read through the final mark store (design §C.3); the
-- tail `openedRow` minted, if it did; the stages before the last; the
-- final fields (handlers opened) and result.
type UseTrace =
  { slots ∷ Array Slot
  , marks ∷ Array (Tuple String Mark)
  , opened ∷ Maybe (TyRow Open)
  , stages ∷ Array (TyRow Open)
  , fields ∷ Array (Ty Open)
  , result ∷ Ty Open
  }

type Traced =
  { uses ∷ Map SpanKey (Array UseTrace)
  , applied ∷ Map (Tuple SpanKey SpanKey) (Array (TyRow Open))
  , piped ∷ Map SpanKey (Array (TyRow Open))
  }

-- Raw values, metas as allocated.
newtype Trace = Trace Traced

emptyTrace ∷ Trace
emptyTrace = Trace { uses: Map.empty, applied: Map.empty, piped: Map.empty }

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

-- Every type and row in the trace changed by `change`; marks are kept.
mapTraced ∷ (Ty Open → Ty Open) → Traced → Traced
mapTraced change traced =
  { uses: map (map changedUse) traced.uses
  , applied: map (map (onRow change)) traced.applied
  , piped: map (map (onRow change)) traced.piped
  }
  where
  changedUse use = use
    { slots = map (onSlot change) use.slots
    , opened = map (onRow change) use.opened
    , stages = map (onRow change) use.stages
    , fields = map change use.fields
    , result = change use.result
    }

onSlot ∷ (Ty Open → Ty Open) → Slot → Slot
onSlot change = case _ of
  TypeSlot ty → TypeSlot (change ty)
  RowSlot row → RowSlot (onRow change row)

-- A row changed as the row of a one-arrow type. `resolve` and `rename`
-- keep an arrow an arrow, so the fallback (the row unchanged) is never
-- taken.
onRow ∷ (Ty Open → Ty Open) → TyRow Open → TyRow Open
onRow change row = case change (TFun TUnit row TUnit) of
  TFun _ found _ → found
  _ → row

-- The body's numbering extended over the trace's other metas: uses,
-- then applied, then piped, each in key order and arrival order; within
-- a use, slots, opened tail, stages, fields, result; within a type,
-- `foldHoles` order.
extended ∷ Map Int Int → Traced → Map Int Int
extended numbering traced = (foldl visit start types).seen
  where
  start = { next: Map.size numbering, seen: numbering }
  visit found ty = foldHoles numbered found ty
  types = Array.concatMap useTypes (entries traced.uses)
    <> map arrowOf (entries traced.applied)
    <> map arrowOf (entries traced.piped)

-- A map's entries in key order, each key's in arrival order.
entries ∷ ∀ k a. Map k (Array a) → Array a
entries = Array.concat <<< Array.fromFoldable <<< Map.values

type Numbered = { next ∷ Int, seen ∷ Map Int Int }

numbered ∷ Numbered → Int → Numbered
numbered found meta =
  if Map.member meta found.seen then found
  else { next: found.next + 1, seen: Map.insert meta found.next found.seen }

useTypes ∷ UseTrace → Array (Ty Open)
useTypes use = map slotType use.slots
  <> maybe [] (Array.singleton <<< arrowOf) use.opened
  <> map arrowOf use.stages
  <> use.fields
  <> [ use.result ]

slotType ∷ Slot → Ty Open
slotType = case _ of
  TypeSlot ty → ty
  RowSlot row → arrowOf row

arrowOf ∷ TyRow Open → Ty Open
arrowOf row = TFun TUnit row TUnit

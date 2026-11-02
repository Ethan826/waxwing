-- The trace's finished form and its traversals (tranche 2 read-back
-- design §C.6; Task 6b): the types `Traced` holds, every type and row in
-- it changed at once, and the numbering extended over it. Only
-- Features.Check.Trace imports this module; it re-exports the types.
module Features.Check.Trace.Types
  ( SpanKey
  , TraceKey(..)
  , Slot(..)
  , UseTrace
  , ClauseTrace
  , InstallTrace
  , Traced
  , emptyTraced
  , mapTraced
  , extended
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, maybe)
import Data.Tuple (Tuple)
import Domain.Checked.Internal (Open)
import Domain.Row (Mark)
import Domain.Type (Ty(..), TyRow)
import Features.Check.Holes (foldHoles)

-- A span's start and end offsets.
type SpanKey = Tuple Int Int

-- Where a traced value is kept: a use, an applied argument (the Apply's
-- span and the argument's), a pipe's left operand, a handler clause, a
-- deferred expression, or a `with`. The read-back names a clash by it.
data TraceKey
  = UseKey SpanKey
  | AppliedKey SpanKey SpanKey
  | PipedKey SpanKey
  | ClauseKey SpanKey
  | DeferKey SpanKey
  | InstallKey SpanKey

derive instance eqTraceKey ∷ Eq TraceKey
derive instance ordTraceKey ∷ Ord TraceKey

instance showTraceKey ∷ Show TraceKey where
  show = case _ of
    UseKey key → "(UseKey " <> show key <> ")"
    AppliedKey key argument →
      "(AppliedKey " <> show key <> " " <> show argument <> ")"
    PipedKey key → "(PipedKey " <> show key <> ")"
    ClauseKey key → "(ClauseKey " <> show key <> ")"
    DeferKey key → "(DeferKey " <> show key <> ")"
    InstallKey key → "(InstallKey " <> show key <> ")"

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

-- A handler clause's entry as Check/Clauses.purs registers it
-- (Features.Check.Restricted `ClauseEntry`): its own row, the handler's
-- inference row R and clause row C, and its own mark (raw, as `marks`).
type ClauseTrace =
  { row ∷ TyRow Open
  , own ∷ Mark
  , inference ∷ TyRow Open
  , clauses ∷ TyRow Open
  }

-- A `with` installation as Check/Install.purs registers it: the frame
-- mark of its body's label (raw) and the row it is installed in.
type InstallTrace = { frame ∷ Mark, current ∷ TyRow Open }

type Traced =
  { uses ∷ Map SpanKey (Array UseTrace)
  , applied ∷ Map (Tuple SpanKey SpanKey) (Array (TyRow Open))
  , piped ∷ Map SpanKey (Array (TyRow Open))
  , clauses ∷ Map SpanKey (Array ClauseTrace)
  , deferrals ∷ Map SpanKey (Array (TyRow Open))
  , installations ∷ Map SpanKey (Array InstallTrace)
  }

emptyTraced ∷ Traced
emptyTraced =
  { uses: Map.empty
  , applied: Map.empty
  , piped: Map.empty
  , clauses: Map.empty
  , deferrals: Map.empty
  , installations: Map.empty
  }

-- Every type and row in the trace changed by `change`; marks are kept.
mapTraced ∷ (Ty Open → Ty Open) → Traced → Traced
mapTraced change traced =
  { uses: map (map changedUse) traced.uses
  , applied: map (map (onRow change)) traced.applied
  , piped: map (map (onRow change)) traced.piped
  , clauses: map (map changedClause) traced.clauses
  , deferrals: map (map (onRow change)) traced.deferrals
  , installations: map (map changedInstall) traced.installations
  }
  where
  changedUse use = use
    { slots = map (onSlot change) use.slots
    , opened = map (onRow change) use.opened
    , stages = map (onRow change) use.stages
    , fields = map change use.fields
    , result = change use.result
    }
  changedClause entry = entry
    { row = onRow change entry.row
    , inference = onRow change entry.inference
    , clauses = onRow change entry.clauses
    }
  changedInstall entry = entry { current = onRow change entry.current }

-- The body's numbering extended over the trace's other metas: uses,
-- then applied, then piped, then clause entries, deferrals and
-- installations (Task 6b's kinds, after piped), each in key order and
-- arrival order; within a use, slots, opened tail, stages, fields,
-- result; within a clause entry, its row, R, C; within a type,
-- `foldHoles` order.
extended ∷ Map Int Int → Traced → Map Int Int
extended numbering traced = (foldl visit start types).seen
  where
  start = { next: Map.size numbering, seen: numbering }
  visit found ty = foldHoles numbered found ty
  types = Array.concatMap useTypes (entries traced.uses)
    <> map arrowOf (entries traced.applied)
    <> map arrowOf (entries traced.piped)
    <> Array.concatMap clauseTypes (entries traced.clauses)
    <> map arrowOf (entries traced.deferrals)
    <> map installType (entries traced.installations)

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

clauseTypes ∷ ClauseTrace → Array (Ty Open)
clauseTypes entry = map arrowOf [ entry.row, entry.inference, entry.clauses ]

installType ∷ InstallTrace → Ty Open
installType entry = arrowOf entry.current

slotType ∷ Slot → Ty Open
slotType = case _ of
  TypeSlot ty → ty
  RowSlot row → arrowOf row

arrowOf ∷ TyRow Open → Ty Open
arrowOf row = TFun TUnit row TUnit

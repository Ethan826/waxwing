-- The trace's finished form and its traversals (tranche 2 read-back
-- design §C.6; Task 6b): the types `Traced` holds, every type and row in
-- it traversed at once, the numbering extended over it, and the
-- renumbering, which fails on a meta the numbering lacks (R036 (2)).
-- Only Features.Check.Trace imports this module; it re-exports it.
module Features.Check.Trace.Types
  ( SpanKey
  , TraceKey(..)
  , Slot(..)
  , UseTrace
  , ClauseTrace
  , InstallTrace
  , Traced
  , TraceFault(..)
  , Changes
  , emptyTraced
  , traverseTraced
  , extended
  , renumbered
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple)
import Domain.Checked.Internal (Open(..))
import Domain.Row (Mark, Row(..))
import Domain.Type (Ty(..), TyRow)
import Domain.Type.Traverse (traverseRow, traverseTy)
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
  -- The declaration's own resolved row (the checked row's value, which
  -- `recheck` does not renumber): `main`'s entry tail and the body
  -- root's ambient row are read from it, on the trace's numbering.
  , row ∷ TyRow Open
  }

emptyTraced ∷ Traced
emptyTraced =
  { uses: Map.empty
  , applied: Map.empty
  , piped: Map.empty
  , clauses: Map.empty
  , deferrals: Map.empty
  , installations: Map.empty
  -- A placeholder: `finish` (Features.Check.Trace) alone sets the
  -- declaration's row; no `Traced` is read before it.
  , row: Row [] Nothing
  }

-- What a traversal does to each type and to each row: rows by a row
-- function, never through a wrapped arrow (R036 (2)).
type Changes f =
  { ty ∷ Ty Open → f (Ty Open), row ∷ TyRow Open → f (TyRow Open) }

-- Why a finished trace could not be built: a meta in it that the
-- extended numbering does not number (`extended` and `renumbered` walk
-- by different code, `foldHoles` and `traverseTy`).
data TraceFault = Unnumbered Int

derive instance eqTraceFault ∷ Eq TraceFault

-- Every type and row in the trace traversed by `change`, through Map's
-- and Array's `Traversable` instances; marks are kept.
traverseTraced ∷ ∀ f. Applicative f ⇒ Changes f → Traced → f Traced
traverseTraced change traced = tracedOf
  <$> traverse (traverse (changedUse change)) traced.uses
  <*> traverse (traverse change.row) traced.applied
  <*> traverse (traverse change.row) traced.piped
  <*> traverse (traverse (changedClause change)) traced.clauses
  <*> traverse (traverse change.row) traced.deferrals
  <*> traverse (traverse (changedInstall change)) traced.installations
  <*> change.row traced.row
  where
  tracedOf uses applied piped clauses deferrals installations row =
    { uses, applied, piped, clauses, deferrals, installations, row }

-- Each hole renumbered by `numbers`; a meta `numbers` lacks is
-- `Unnumbered`, never kept raw (a raw meta shares the space of hole
-- numbers). Rigids are kept.
renumbered ∷ Map Int Int → Traced → Either TraceFault Traced
renumbered numbers =
  traverseTraced { ty: traverseTy renumber, row: traverseRow renumber }
  where
  renumber = case _ of
    Hole meta → maybe (unnumbered meta) (Right <<< Hole)
      (Map.lookup meta numbers)
    Rigid variable → Right (Rigid variable)
  unnumbered meta = Left (Unnumbered meta)

-- The body's numbering extended over the trace's other metas: uses,
-- then applied, then piped, then clause entries, deferrals and
-- installations (Task 6b's kinds, after piped), each in key order and
-- arrival order, and last the declaration's row (so adding it moved no
-- other value's number); within a use, slots, opened tail, stages,
-- fields, result; within a clause entry, its row, R, C; within a type,
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
    <> [ arrowOf traced.row ]

changedUse ∷ ∀ f. Applicative f ⇒ Changes f → UseTrace → f UseTrace
changedUse change use = usedWith
  <$> traverse (changedSlot change) use.slots
  <*> traverse change.row use.opened
  <*> traverse change.row use.stages
  <*> traverse change.ty use.fields
  <*> change.ty use.result
  where
  usedWith slots opened stages fields result =
    { slots, marks: use.marks, opened, stages, fields, result }

changedSlot ∷ ∀ f. Applicative f ⇒ Changes f → Slot → f Slot
changedSlot change = case _ of
  TypeSlot ty → TypeSlot <$> change.ty ty
  RowSlot row → RowSlot <$> change.row row

changedClause
  ∷ ∀ f. Applicative f ⇒ Changes f → ClauseTrace → f ClauseTrace
changedClause change entry = enteredWith <$> change.row entry.row
  <*> change.row entry.inference
  <*> change.row entry.clauses
  where
  enteredWith row inference clauses =
    { row, own: entry.own, inference, clauses }

changedInstall
  ∷ ∀ f. Applicative f ⇒ Changes f → InstallTrace → f InstallTrace
changedInstall change entry = { frame: entry.frame, current: _ }
  <$> change.row entry.current

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

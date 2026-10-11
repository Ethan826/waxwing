module Features.Check.Sync (sync) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec, tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM, foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Problem (Problem(..))
import Domain.Row (Row(..))
import Domain.Type (TyRow)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Features.Check.Consume (closeTail, consumeIgnoring)
import Features.Check.Context (CheckEnv)
import Features.Check.Cycle (positiveCycle)
import Features.Check.Entry (resolvedRow)
import Features.Check.Feed (FeedRow, feedsOf)
import Features.Check.Groups
  ( grew
  , groupAt
  , placed
  , remainderOf
  , signatureOf
  , signed
  , started
  , unfiled
  )
import Features.Check.Provenance (Consumed(Application), Origin)
import Features.Check.Reject (rejected)
import Features.Check.Restricted (ClauseEntry, ClauseSignature)
import Features.Check.Scheme (State, flexibleRow)
import Features.Check.Search (Stack(..), stackItems)
import Features.Check.Unify (Failure(..), Subst)
import Features.Check.Watch (takeDirty, watchTail)

-- The one-way hook (design §3.4). Each round drains the watched tails that
-- were bound or extended, then for the clauses they reach (and the pending
-- ones), in source order: F1′ files each under its resolved tail and
-- joins, merges or starts its group (φ); F2 rejects a positive cycle among
-- the rows reachable from them; and T consumes each clause whose signature
-- changed into its inference row R as `labels(c) + φ`. Its own bindings
-- re-dirty tails, so rounds go on until nothing is dirty or pending. The
-- cost is the dirty rows and what they reach, not the registry.
sync ∷ ∀ r. CheckEnv r → State → Span → Either Diagnostic State
sync env state span = tailRecM (round env origin) state
  where
  origin = { span, consumed: Application, via: Nothing }

round
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → State
  → Either Diagnostic (Step State State)
round env origin before = settle (affected before)
  where
  settle (Tuple ids drained)
    | Array.null ids = Right (Done drained)
    | otherwise = do
        refiled ← foldM (filing env origin) drained ids
        cycleTest env origin refiled ids
        pushed ← foldM (push env origin) refiled ids
        pure (Loop pushed)

-- The clauses to look at, by handler position then id (P14), and the state
-- with nothing dirty or pending. A dirty tail's byTail entry is dropped
-- here and re-made by F1′.
affected ∷ State → Tuple (Array Int) State
affected state = Tuple ordered state
  { subst = taken.subst
  , restricted = registry
      { pending = Set.empty
      , byTail = foldl (flip Map.delete) registry.byTail taken.dirty
      }
  }
  where
  taken = takeDirty state.subst
  registry = state.restricted
  reached = Array.concatMap filedUnder taken.dirty
  filedUnder meta = maybe [] identity (Map.lookup meta registry.byTail)
  found = Set.union registry.pending (Set.fromFoldable reached)
  ordered = Array.sortWith position (Array.fromFoldable found)
  position id = Tuple (maybe 0 offset (Map.lookup id registry.clauses)) id
  offset entry = entry.handler.start.offset

-- F1′ for one clause.
filing
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → State
  → Int
  → Either Diagnostic State
filing env origin state id = maybe (Right state) (filed env origin state id)
  (Map.lookup id state.restricted.clauses)

data Choice = New | Join Int | Merge Int | Stay

-- Filed under its resolved tail. An unbound one is a group member: when
-- its labels grew it joins the group already there or starts a new one
-- (rev10 N1; no merge of the old φ); otherwise it merges with a different
-- group found there, or stays. A rigid or closed tail ends φ (N4).
filed
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → State
  → Int
  → ClauseEntry
  → Either Diagnostic State
filed env origin state id entry = case tail of
  Just (Hole meta) → unbound env origin loose id entry meta
  Just rigid → ended (Row [] (Just rigid))
  Nothing → closed
  where
  Row _ tail = resolvedRow state.subst entry.row
  loose = state { restricted = unfiled id entry.tail state.restricted }
  ended stage = do
    phi ← remainder loose entry
    consumeIgnoring env loose { origin, stage, target: phi }
  closed = remainder loose entry >>= closeTail env loose origin

unbound
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → State
  → Int
  → ClauseEntry
  → Int
  → Either Diagnostic State
unbound env origin state id entry meta = case choice of
  New → Right (stay fresh state.next)
  Join group → Right (stay state group)
  Merge group → merged group
  Stay → Right (stay state entry.group)
  where
  found = groupAt state.restricted meta
  now = signatureOf state.subst entry
  choice
    | grownSince now entry = maybe New Join found
    | otherwise = case found of
        Just group | group /= entry.group → Merge group
        _ → Stay
  fresh = state
    { next = state.next + 2
    , restricted = started state.next (state.next + 1) meta state.restricted
    }
  stay from group = from
    { subst = watchTail meta from.subst
    , restricted = placed id group meta from.restricted
    }
  merged group = do
    old ← remainder state entry
    kept ← maybe (missing entry) Right (remainderOf state.restricted group)
    consumed ← consumeIgnoring env state { origin, stage: old, target: kept }
    pure (stay consumed (min entry.group group))

remainder ∷ State → ClauseEntry → Either Diagnostic (TyRow Open)
remainder state entry =
  maybe (missing entry) Right (remainderOf state.restricted entry.group)

missing ∷ ∀ a. ClauseEntry → Either Diagnostic a
missing entry = Left (problemAt (Internal "Clause without a group") entry.handler)

grownSince ∷ ClauseSignature → ClauseEntry → Boolean
grownSince now entry = maybe false (flip grew now) entry.signature

-- F2: a positive cycle through the c to R edges of the rows reached from
-- `ids` is today's side-condition error, reported before any consumption.
-- The graph is the closure of those rows only (T003); `successors` finds
-- the clauses ending where a row's R ends.
cycleTest
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → State
  → Array Int
  → Either Diagnostic Unit
cycleTest env origin state ids = maybe (Right unit) refuse
  (positiveCycle rows (feedsOf rows) (Array.range 0 (Array.length ids - 1)))
  where
  entries = Array.mapMaybe (flip Map.lookup state.restricted.clauses)
    (reachable state ids)
  rows = map (feedRow state.subst) entries
  refuse index = maybe (Right unit) (rejectAt) (Array.index rows index)
  rejectAt row = rejected env state origin (RowSharedTail row.own row.target)

feedRow ∷ Subst → ClauseEntry → FeedRow
feedRow subst entry =
  { own: flexibleRow (resolvedRow subst entry.row)
  , target: flexibleRow (resolvedRow subst entry.inference)
  , keepFail: true
  , position: entry.handler.start.offset
  }

-- `ids` first, then every clause reached through a row's R tail.
reachable ∷ State → Array Int → Array Int
reachable state ids = ids <> stackItems (tailRec walk
  { seen: Set.fromFoldable ids, found: Bottom, stack: foldl pushed Bottom ids })
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
    let Row _ tail = resolvedRow state.subst entry.inference
    case tail of
      Just (Hole meta) → Just meta
      _ → Nothing

-- T: a clause whose signature changed since last pushed is consumed into
-- its handler's R as `labels(c) + φ`, ignoring marks.
push
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → State
  → Int
  → Either Diagnostic State
push env origin state id = maybe (Right state) pushed
  (Map.lookup id state.restricted.clauses)
  where
  pushed entry
    | entry.signature == Just (now entry) = Right state
    | otherwise = do
        Row _ tail ← remainder state entry
        consumed ← consumeIgnoring env state
          { origin, stage: Row (labelsOf entry) tail, target: entry.inference }
        pure consumed
          { restricted = signed id (now entry) consumed.restricted }
  now = signatureOf state.subst
  labelsOf entry = case resolvedRow state.subst entry.row of
    Row labels _ → labels

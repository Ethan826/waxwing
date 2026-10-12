module Features.Check.Sync (sync, syncSettling) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM, foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Row (Row(..))
import Domain.Syntax (Diagnostic, Span)
import Features.Check.Consume (consumeRelayed)
import Features.Check.Context (CheckEnv)
import Features.Check.Walked (walkedRow)
import Features.Check.Filing (Mode(..), filing, originOf, remainder)
import Features.Check.Groups (signatureOf, signed)
import Features.Check.Provenance (occurrencesOf)
import Features.Check.Scheme (State, flexibleRow)
import Features.Check.SyncCycle (cycleTest)
import Features.Check.Watch (takeDirty)

-- The one-way hook (design §3.4). Each round drains the watched tails that
-- were bound or extended, then for the clauses they reach (and the pending
-- ones), in source order: F1′ files each under its resolved tail and
-- joins, merges or starts its group (φ); F2 rejects a positive cycle among
-- the rows reachable from them; and T consumes each clause whose signature
-- changed into its inference row R as `labels(c) + φ`. Its own bindings
-- re-dirty tails, so rounds go on until nothing is dirty or pending. The
-- cost is the dirty rows and what they reach, not the registry.
sync ∷ ∀ r. CheckEnv r → State → Span → Either Diagnostic State
sync env state span = tailRecM (round env (Checking span)) state

-- The same inside the settling loop (design §3.5): class upkeep for the
-- bindings (a) and (d) make, reported at each clause's handler literal,
-- with a rigid tail left to the tail pass.
syncSettling ∷ ∀ r. CheckEnv r → State → Either Diagnostic State
syncSettling env = tailRecM (round env Settling)

round
  ∷ ∀ r
  . CheckEnv r
  → Mode
  → State
  → Either Diagnostic (Step State State)
round env mode before = settle (affected before)
  where
  settle (Tuple ids drained)
    | Array.null ids = Right (Done drained)
    | otherwise = do
        refiled ← foldM (filing env mode) drained ids
        cycleTest env mode refiled ids
        pushed ← foldM (push env mode) refiled ids
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

-- T: a clause whose signature changed since last pushed is consumed into
-- its handler's R as `labels(c) + φ`, ignoring marks.
push
  ∷ ∀ r
  . CheckEnv r
  → Mode
  → State
  → Int
  → Either Diagnostic State
push env mode state id = maybe (Right state) pushed
  (Map.lookup id state.restricted.clauses)
  where
  pushed entry
    | entry.signature == Just (now entry) = Right state
    | otherwise = do
        Row _ tail ← remainder state entry
        consumed ← consumeRelayed env state
          { origin: originOf mode entry
          , stage: Row (labelsOf entry) tail
          , sources: occurrencesOf state.subst (flexibleRow entry.row)
          , target: entry.inference
          }
        pure consumed
          { restricted = signed id (now entry) consumed.restricted }
  now = signatureOf state.subst
  labelsOf entry = case walkedRow state.subst entry.row of
    Row labels _ → labels

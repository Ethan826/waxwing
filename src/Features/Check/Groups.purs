module Features.Check.Groups
  ( signatureOf
  , grew
  , groupAt
  , remainderOf
  , unfiled
  , placed
  , started
  , signed
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Foldable (any)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Row (LabelKey, Row(..))
import Domain.Type (TyRow)
import Features.Check.Cycle (counted)
import Features.Check.Walked (End(..), endOf, headedRow)
import Features.Check.Restricted
  ( ClauseEntry
  , ClauseSignature
  , Restricted
  , TailKind(..)
  )
import Features.Check.Subst (Subst)

-- Group bookkeeping for `sync` (design §3.4, F1′). Group ids are not
-- canonical: after a merge the clauses that did not move still carry the
-- loser's id, and `groupAt` may return it. Identity of the remainder φ
-- comes from unification, so every read of φ goes through a resolved row
-- and ids are never compared for φ identity. A group's `representative`
-- is written, never used for lookup (the loser's is stale).

-- What `sync` pushes for a clause: label counts per key of its resolved
-- row, its group, and how its tail ends. Renaming the tail meta (which
-- every fresh-tail consumption does) changes none of these.
signatureOf ∷ Subst → ClauseEntry → ClauseSignature
signatureOf subst found =
  { counts: counted true (headedRow subst found.row)
  , group: found.group
  , kind: kindOf (endOf subst found.row)
  }
  where
  kindOf = case _ of
    Loose _ → UnboundTail
    Fixed variable → RigidTail variable
    Ended → ClosedTail

-- Some label key has more occurrences now than when last pushed: the tail
-- was extended, which starts a new class (rev10 N1).
grew ∷ ClauseSignature → ClauseSignature → Boolean
grew before now = any larger pairs
  where
  pairs ∷ Array (Tuple LabelKey Int)
  pairs = Map.toUnfoldable now.counts
  larger (Tuple key count) = count > fromMaybe 0 (Map.lookup key before.counts)

-- The group of the first clause filed under the unbound tail `meta`,
-- whatever its signature (review A1).
groupAt ∷ Restricted → Int → Maybe Int
groupAt registry meta = do
  ids ← Map.lookup meta registry.byTail
  first ← Array.head ids
  _.group <$> Map.lookup first registry.clauses

remainderOf ∷ Restricted → Int → Maybe (TyRow Open)
remainderOf registry group = _.remainder <$> Map.lookup group registry.groups

-- Clause `id` is no longer filed under `tail`.
unfiled ∷ Int → Int → Restricted → Restricted
unfiled id tail registry =
  registry { byTail = Map.update without tail registry.byTail }
  where
  without ids = case Array.delete id ids of
    [] → Nothing
    rest → Just rest

-- Clause `id` joins `group` on the unbound tail `meta`, which becomes the
-- group's representative.
placed ∷ Int → Int → Int → Restricted → Restricted
placed id group meta registry = registry
  { clauses = Map.update moved id registry.clauses
  , groups = Map.update represented group registry.groups
  , byTail = Map.alter appended meta registry.byTail
  }
  where
  appended found = Just (fromMaybe [] found <> [ id ])
  moved found = Just found { group = group, tail = meta }
  represented found = Just found { representative = meta }

-- A new group with the fresh remainder tail `phi` and representative `meta`.
started ∷ Int → Int → Int → Restricted → Restricted
started group phi meta registry = registry
  { groups = Map.insert group
      { representative: meta, remainder: Row [] (Just (Hole phi)) }
      registry.groups
  }

signed ∷ Int → ClauseSignature → Restricted → Restricted
signed id signature registry = registry
  { clauses = Map.update stamped id registry.clauses }
  where
  stamped found = Just found { signature = Just signature }

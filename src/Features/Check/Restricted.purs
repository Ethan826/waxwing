module Features.Check.Restricted
  ( ClauseEntry
  , ClauseSignature
  , TailKind(..)
  , Group
  , Installation
  , Restricted
  , emptyRestricted
  , registerClause
  , registerInstallation
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Domain.Checked.Internal (Open)
import Domain.Row (Label, LabelKey, Mark)
import Domain.Syntax (Span)
import Domain.Type (Ty, TyRow, VarId)
import Features.Check.Site (Site)

-- How a clause row ends: an unbound row meta, a signature's own variable,
-- or closed.
data TailKind = UnboundTail | RigidTail VarId | ClosedTail

derive instance eqTailKind ∷ Eq TailKind

-- What `sync` last pushed to a clause's inference row: the label counts of
-- its row, its group, and the kind of its tail.
type ClauseSignature =
  { counts ∷ Map LabelKey Int, group ∷ Int, kind ∷ TailKind }

-- A handler clause's own row `row`, which feeds the handler's inference
-- row `inference` (R) and clause row `clauses` (C) (design §3.7). `tail`
-- is the row meta `row` currently ends in; `group` the clauses whose rows
-- share that tail; `signature`, `Nothing` until `sync` first runs.
type ClauseEntry =
  { row ∷ TyRow Open
  , inference ∷ TyRow Open
  , clauses ∷ TyRow Open
  , own ∷ Mark
  , handler ∷ Span
  , clause ∷ Span
  , operation ∷ String
  , group ∷ Int
  , tail ∷ Int
  , signature ∷ Maybe ClauseSignature
  }

-- A group of clauses sharing a tail (φ): its `representative` meta and the
-- row `remainder` that stands for what they may still add.
type Group = { representative ∷ Int, remainder ∷ TyRow Open }

-- A `with` installation of a handler, for its abort-tracking obligations.
-- `inference` is the handler's R, from which its C takes label arguments;
-- `current` the row it is installed in, `frame` the mark of its body's
-- label.
type Installation =
  { span ∷ Span
  , label ∷ Label (Ty Open)
  , own ∷ Mark
  , frame ∷ Mark
  , inference ∷ TyRow Open
  , clauses ∷ TyRow Open
  , current ∷ TyRow Open
  , sites ∷ Array Site
  }

-- `clauses`, `groups` and `installations` are keyed by ids the registrant
-- chooses; `byTail` maps a tail meta to the clause ids ending in it;
-- `pending` holds clauses `sync` has not yet looked at.
type Restricted =
  { clauses ∷ Map Int ClauseEntry
  , groups ∷ Map Int Group
  , byTail ∷ Map Int (Array Int)
  , pending ∷ Set Int
  , installations ∷ Map Int Installation
  }

emptyRestricted ∷ Restricted
emptyRestricted =
  { clauses: Map.empty
  , groups: Map.empty
  , byTail: Map.empty
  , pending: Set.empty
  , installations: Map.empty
  }

-- A new clause `id` with its group, pending and indexed by its tail. The
-- caller watches the tail (Features.Check.Watch `watchTail`).
registerClause ∷ Int → Group → ClauseEntry → Restricted → Restricted
registerClause id group entry registry = registry
  { clauses = Map.insert id entry registry.clauses
  , groups = Map.insert entry.group group registry.groups
  , byTail = Map.alter (appended id) entry.tail registry.byTail
  , pending = Set.insert id registry.pending
  }

registerInstallation ∷ Int → Installation → Restricted → Restricted
registerInstallation id installation registry = registry
  { installations = Map.insert id installation registry.installations }

appended ∷ Int → Maybe (Array Int) → Maybe (Array Int)
appended id = Just <<< maybe [ id ] (flip Array.snoc id)

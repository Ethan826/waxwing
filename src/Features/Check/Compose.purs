module Features.Check.Compose (compose) where

import Prelude hiding (compose)
import Data.Map as Map
import Features.Check.Aliases (noAliases)
import Features.Check.Subst (Subst(..), substitute, substituteRow)

-- `substitute (compose later earlier)` is `substitute later` after
-- `substitute earlier`; Map.union keeps the earlier side's bindings.
-- Precondition: `later` was made from `earlier` (or neither made fresh row
-- metas), so their fresh metas do not collide; the smaller counter is
-- kept. Postponed pairs are the earlier's, then the later's; of two links
-- from one occurrence the earlier's stays; mark bindings likewise. The
-- edges, the watch, the row store and the parts' origins are the later's
-- alone, which hold
-- the earlier's under the precondition (made from it). The aliases are
-- dropped: an empty table walks hop by hop, so this is always sound.
-- Nothing in src composes, tests only.
compose ∷ Subst → Subst → Subst
compose later@(Subst laterBindings) (Subst earlierBindings) = Subst
  { types: Map.union (map (substitute later) earlierBindings.types)
      laterBindings.types
  , rows: Map.union (map (substituteRow later) earlierBindings.rows)
      laterBindings.rows
  , fresh: min laterBindings.fresh earlierBindings.fresh
  , postponed: earlierBindings.postponed <> laterBindings.postponed
  , links: Map.union earlierBindings.links laterBindings.links
  , relays: Map.union earlierBindings.relays laterBindings.relays
  , marks: laterBindings.marks
      { bindings = Map.union earlierBindings.marks.bindings
          laterBindings.marks.bindings
      , fresh = min laterBindings.marks.fresh earlierBindings.marks.fresh
      }
  , watch: laterBindings.watch
  , aliases: noAliases
  , store: laterBindings.store
  , origins: laterBindings.origins
  }

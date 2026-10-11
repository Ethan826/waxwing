module Features.Check.SettleEntry
  ( Entry
  , EntryTail(..)
  , entries
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Features.Check.Defer (crossing)
import Features.Check.Provenance (Consumed(Application), Origin)
import Features.Check.Restricted (ClauseEntry, Restricted)
import Features.Check.Scheme (Deferral)
import Features.Check.Site (Site)
import Domain.Type (TyRow)

-- A restricted row (design §3.5): `own` is consumed into `target` every
-- round, whose labels' sites are `sites`; `keepFail` says whether `Fail`
-- labels travel, `ignoreMarks` whether marks are left alone. `origin` is
-- where a failure is reported and `position` the span start rows settle
-- in (P14). `tail`: what ends the stage consumed, a fresh meta nobody
-- reads, or the remainder row of a clause group (φ).
type Entry =
  { own ∷ TyRow Open
  , target ∷ TyRow Open
  , sites ∷ Array Site
  , keepFail ∷ Boolean
  , ignoreMarks ∷ Boolean
  , tail ∷ EntryTail
  , origin ∷ Origin
  , position ∷ Int
  }

data EntryTail = Fresh | Remainder (TyRow Open)

-- Every restricted row, by span start (P14): the registry's clause
-- entries, then the deferrals, which are stored post-order. Ties keep
-- this order, so a clause row settles before a deferral at the same place.
entries ∷ Restricted → Array Deferral → Array Entry
entries registry deferrals = Array.sortWith _.position
  (clauseEntries registry <> deferralEntries deferrals)

-- A clause row feeds the handler's inference row R, ignoring marks and
-- ending in its group's remainder, and its clause row C directionally.
clauseEntries ∷ Restricted → Array Entry
clauseEntries registry = Array.concatMap clauseEntry
  (Array.fromFoldable (Map.values registry.clauses))
  where
  clauseEntry found =
    [ toInference found
    , toClauses found
    ]
  toInference found = clauseTo found found.inference true
    (maybe Fresh Remainder (remainderOf found))
  toClauses found = clauseTo found found.clauses false Fresh
  remainderOf found = _.remainder <$> Map.lookup found.group registry.groups

clauseTo
  ∷ ClauseEntry → TyRow Open → Boolean → EntryTail → Entry
clauseTo found target ignoreMarks tail =
  { own: found.row
  , target
  , sites: []
  , keepFail: true
  , ignoreMarks
  , tail
  , origin: { span: found.handler, consumed: Application, via: Nothing }
  , position: found.handler.start.offset
  }

-- One per deferral, in source order (ties by the order they were
-- registered in; deferrals are stored post-order).
deferralEntries ∷ Array Deferral → Array Entry
deferralEntries deferrals = map entryOf (Array.sortWith start numbered)
  where
  numbered = Array.mapWithIndex Tuple deferrals
  start (Tuple index found) = Tuple found.span.start.offset index
  entryOf (Tuple _ found) =
    { own: found.row
    , target: found.current
    , sites: found.sites
    , keepFail: false
    , ignoreMarks: false
    , tail: Fresh
    , origin: crossing found.span
    , position: found.span.start.offset
    }

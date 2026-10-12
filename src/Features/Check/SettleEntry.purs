module Features.Check.SettleEntry
  ( Entry
  , EntryTail(..)
  , Donor
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
import Features.Check.Provenance (Consumed(ClauseRow), Origin)
import Features.Check.Restricted (ClauseEntry, Restricted)
import Features.Check.Scheme (Deferral)
import Features.Check.Site (Site)
import Domain.Type (TyRow)

-- A restricted row (design §3.5): `own` is consumed into `target` every
-- round, whose labels' sites are `sites`; `keepFail` says whether `Fail`
-- labels travel, `ignoreMarks` whether marks are left alone. `origin` is
-- where a failure is reported and `position` the span start rows settle
-- in (P14). `tail`: what ends the stage consumed, a fresh meta nobody
-- reads, or the remainder row of a clause group (φ). `bare`: the target is a
-- clause row C, which keeps no label arguments of its own (Task 7, user
-- ruling 2026-10-11): R holds them. `donor`: an installation's C takes its
-- labels' arguments from the handler's R (`Lend.lend`) before consuming.
type Entry =
  { own ∷ TyRow Open
  , target ∷ TyRow Open
  , sites ∷ Array Site
  , keepFail ∷ Boolean
  , ignoreMarks ∷ Boolean
  , bare ∷ Boolean
  , donor ∷ Maybe Donor
  , tail ∷ EntryTail
  , origin ∷ Origin
  , position ∷ Int
  }

-- An installation's handler: its number, its R, and how many of C's labels
-- were paired with `current`'s the last time.
type Donor = { id ∷ Int, inference ∷ TyRow Open, matched ∷ Int }

data EntryTail = Fresh | Remainder (TyRow Open)

-- Every restricted row, by span start (P14): the registry's clause
-- entries, its installations' C, then the deferrals, which are stored
-- post-order. Ties keep this order, so a clause row settles before a
-- deferral at the same place.
entries ∷ Restricted → Array Deferral → Array Entry
entries registry deferrals = Array.sortWith _.position
  ( clauseEntries registry <> installationEntries registry
      <> deferralEntries deferrals
  )

-- An installation's C is consumed into the row it is installed in,
-- directionally, `Fail` kept, at the `with` (P13, design §3.5).
installationEntries ∷ Restricted → Array Entry
installationEntries registry = map installed
  (Map.toUnfoldable registry.installations)
  where
  installed (Tuple id found) =
    { own: found.clauses
    , target: found.current
    , sites: found.sites
    , keepFail: true
    , ignoreMarks: false
    , bare: true
    , donor: Just { id, inference: found.inference, matched: found.matched }
    , tail: Fresh
    , origin: { span: found.span, consumed: ClauseRow, via: Nothing }
    , position: found.span.start.offset
    }

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
  -- A registered clause always has a group. Falling back to Fresh here
  -- would be the fx008-settle-phi defect (c to R must end in φ).
  toInference found = clauseTo found found.inference true false
    (maybe Fresh Remainder (remainderOf found))
  toClauses found = clauseTo found found.clauses false true Fresh
  remainderOf found = _.remainder <$> Map.lookup found.group registry.groups

clauseTo
  ∷ ClauseEntry → TyRow Open → Boolean → Boolean → EntryTail → Entry
clauseTo found target ignoreMarks bare tail =
  { own: found.row
  , target
  , sites: []
  , keepFail: true
  , ignoreMarks
  , bare
  , donor: Nothing
  , tail
  , origin: { span: found.handler, consumed: ClauseRow, via: Nothing }
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
    , bare: false
    , donor: Nothing
    , tail: Fresh
    , origin: crossing found.span
    , position: found.span.start.offset
    }

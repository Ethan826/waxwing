module Features.Check.RowStore
  ( RowStore(..)
  , module Features.Check.Because
  , module Features.Check.RowBound
  , emptyStore
  , lackTable
  , withLacks
  , partnersOf
  , withApart
  , withoutPairs
  , arrival
  , stamped
  , atSite
  , siteOf
  , boundOf
  , withBound
  , withoutBound
  , emptiedOf
  , withEmptied
  , withBoundBy
  , equationId
  , counted
  , changesOf
  ) where

import Prelude
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax (Span)
import Features.Check.Because
  ( Because(..)
  , Equation(..)
  , Lack
  , Pair
  , WrittenLack
  , plain
  , prefer
  , preferLack
  , rank
  )
import Features.Check.Flex (Flex(..))
import Features.Check.Pending (Waiting, noneWaiting, wake)
import Features.Check.RowBound (Atom(..), Bound, Narrowing, narrowedBy)

-- What the record tails of a substitution are known to satisfy (R005
-- Tranche B design §1.3), kept inside the substitution so that a
-- postponed effect pair that reverts it reverts these too. `lacks`: the
-- labels each record tail may never hold, a meta's or a signature's rigid
-- one's, each with its reason (Features.Check.Lacks). `apart`: pairs of
-- tails, each a rigid or an unbound meta, that hold no label in common,
-- kept both ways with one reason (a rigid pair is a body's hypothesis, a
-- meta's an obligation). `arrivedAt`: where a meta was bound, the span of
-- the requirement being checked (`site`) when it was. Task 4: `upper`,
-- the upper bounds of unbound metas (design §2.5, Features.Check.Narrow);
-- `emptied`, for a meta U4 bound to `{}`, its last bound, which keeps the
-- facts that pruned it (R10.2; the plan's `Map Int Because`, kept per
-- atom so the fact excluding the constant that fails is the one named);
-- `boundBy`, the equation whose commit bound a meta (R10.1, read from
-- Task 6); `equations`, the next equation's identity; `changes`,
-- how many times the solver's state changed (a binding, a new lack, a new
-- pair's meta side, a bound set or narrowed): the termination measure's
-- counter (rules §13, ledger L3). Task 5: `waiting`, the pending
-- equations and their wake-up index (Features.Check.Pending); every change
-- above to a variable (a binding, a new lack or pair, a bound set or
-- narrowed, a pair removed) wakes the equations that read it and moves
-- `version`; `nesting`, the pending equation being re-examined, whose site
-- an equation nested in it takes (design §2.6). Their accessors are in
-- Features.Check.Waits.
newtype RowStore = RowStore
  { lacks ∷ Map Flex (Map String Lack)
  , apart ∷ Map Flex (Map Flex Because)
  , arrivedAt ∷ Map Int Span
  , site ∷ Maybe Span
  , upper ∷ Map Int Bound
  , emptied ∷ Map Int Bound
  , boundBy ∷ Map Int Equation
  , equations ∷ Int
  , changes ∷ Int
  , waiting ∷ Waiting
  , nesting ∷ Maybe Equation
  , version ∷ Int
  }

emptyStore ∷ RowStore
emptyStore = RowStore
  { lacks: Map.empty
  , apart: Map.empty
  , arrivedAt: Map.empty
  , site: Nothing
  , upper: Map.empty
  , emptied: Map.empty
  , boundBy: Map.empty
  , equations: 0
  , changes: 0
  , waiting: noneWaiting
  , nesting: Nothing
  , version: 0
  }

-- The labels a tail lacks, each with its reason.
lackTable ∷ RowStore → Flex → Map String Lack
lackTable (RowStore store) tail = maybe Map.empty identity
  (Map.lookup tail store.lacks)

-- What the tail already lacks is kept; of two reasons for one label the
-- preferred (Features.Check.Because). Each label new to the tail is a
-- change.
withLacks ∷ Flex → Map String Lack → RowStore → RowStore
withLacks tail found (RowStore store)
  | Map.isEmpty found = RowStore store
  | otherwise = woken
      ( RowStore store
          { lacks = Map.insertWith (Map.unionWith preferLack) tail found
              store.lacks
          , changes = store.changes + new
          }
      )
      where
      new = Map.size (Map.difference found (lackTable (RowStore store) tail))
      woken = if new == 0 then identity else touched tail

-- The tails this one is apart from, each with its reason.
partnersOf ∷ RowStore → Flex → Map Flex Because
partnersOf (RowStore store) tail = maybe Map.empty identity
  (Map.lookup tail store.apart)

-- The pair recorded both ways, the preferred reason kept; a new pair is a
-- change on each of its meta sides.
withApart ∷ Flex → Flex → Because → RowStore → RowStore
withApart one other because (RowStore store) = woken
  ( RowStore store
      { apart = added other one (added one other store.apart)
      , changes = store.changes + if known then 0 else metaSides
      }
  )
  where
  woken = if known then identity else touched one <<< touched other
  added from to = Map.insertWith (Map.unionWith prefer) from
    (Map.singleton to because)
  known = Map.member other (partnersOf (RowStore store) one)
  metaSides = sides one + sides other
  sides = case _ of
    Meta _ → 1
    Rigid _ → 0

-- The tail's pairs removed from both sides (it was bound: its pairs are
-- re-required on its image).
withoutPairs ∷ Flex → RowStore → RowStore
withoutPairs tail store@(RowStore found) =
  foldl (flip touched)
    ( RowStore found
        { apart = Map.delete tail (foldl dropped found.apart partners) }
    )
    partners
  where
  partners = Map.keys (partnersOf store tail)
  dropped table partner = Map.update (Just <<< Map.delete tail) partner table

-- Where a meta was bound, if a requirement was being checked.
arrival ∷ RowStore → Int → Maybe Span
arrival (RowStore store) meta = Map.lookup meta store.arrivedAt

-- The meta stamped with the current requirement's span, if any.
stamped ∷ Int → RowStore → RowStore
stamped meta (RowStore store) = maybe (RowStore store) stamp store.site
  where
  stamp span = RowStore store
    { arrivedAt = Map.insert meta span store.arrivedAt }

-- The requirement being checked, or none.
atSite ∷ Maybe Span → RowStore → RowStore
atSite site (RowStore store) = RowStore store { site = site }

siteOf ∷ RowStore → Maybe Span
siteOf (RowStore store) = store.site

-- The upper bound of an unbound meta, if it has one.
boundOf ∷ RowStore → Int → Maybe Bound
boundOf (RowStore store) meta = Map.lookup meta store.upper

-- The meta's bound set or narrowed: a change.
withBound ∷ Int → Bound → RowStore → RowStore
withBound meta bound (RowStore store) = touched (Meta meta)
  ( RowStore store
      { upper = Map.insert meta bound store.upper
      , changes = store.changes + 1
      }
  )

-- The bound of a meta just bound (U3: its image took it over).
withoutBound ∷ Int → RowStore → RowStore
withoutBound meta (RowStore store) = RowStore store
  { upper = Map.delete meta store.upper }

-- The last bound of a meta U4 bound to `{}`: what narrowed it, and what
-- pruned it, by atom.
emptiedOf ∷ RowStore → Int → Maybe Bound
emptiedOf (RowStore store) meta = Map.lookup meta store.emptied

withEmptied ∷ Int → Bound → RowStore → RowStore
withEmptied meta bound (RowStore store) = RowStore store
  { emptied = Map.insert meta bound store.emptied }

-- The meta bound by a commit of this equation.
withBoundBy ∷ Int → Equation → RowStore → RowStore
withBoundBy meta equation (RowStore store) = RowStore store
  { boundBy = Map.insert meta equation store.boundBy }

-- A new equation's identity, taken.
equationId ∷ RowStore → { id ∷ Int, store ∷ RowStore }
equationId (RowStore store) =
  { id: store.equations
  , store: RowStore store { equations = store.equations + 1 }
  }

-- One more change: `meta` bound.
counted ∷ Int → RowStore → RowStore
counted meta (RowStore store) = touched (Meta meta)
  (RowStore store { changes = store.changes + 1 })

changesOf ∷ RowStore → Int
changesOf (RowStore store) = store.changes

-- The variable changed: the equations that read it are woken.
touched ∷ Flex → RowStore → RowStore
touched tail (RowStore store) = RowStore store
  { waiting = wake tail store.waiting, version = store.version + 1 }

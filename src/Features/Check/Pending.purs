module Features.Check.Pending
  ( Side
  , Residue
  , Pending
  , Waiting
  , noneWaiting
  , idOf
  , waitOn
  , withdrawn
  , wake
  , unwoken
  , quietResidue
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple)
import Domain.Type (Ty)
import Features.Check.Because (Equation(..))
import Features.Check.Flex (Flex)

-- One side of an equation once the labels both sides hold have unified
-- and the tails both hold cancelled (R005 Tranche B design §2.1 steps
-- 2-4, rules §2-§4): its labels with their types, its rigid tails, and
-- its unbound meta tails, each sorted, repeats kept.
type Side =
  { fields ∷ Array (Tuple String (Ty Flex))
  , rigids ∷ Array Flex
  , metas ∷ Array Int
  }

type Residue = { mine ∷ Side, theirs ∷ Side }

-- An equation that waits (design §2.6, rules §9): its identity, site and
-- rows as met (`equation`), its residue when it was last examined,
-- whether it is quiet (no constant on either side, so the empty default
-- meets it, design §2.2), and `reads`, every variable whose facts or
-- binding its rules read (its residue's tails and their partners, ledger
-- L32): a change to one of them wakes it.
type Pending =
  { equation ∷ Equation
  , residue ∷ Residue
  , quiet ∷ Boolean
  , reads ∷ Set Flex
  }

-- The pending equations by identity; for each variable, the equations
-- that read it (the wake-up index); and those woken since they were last
-- examined.
type Waiting =
  { entries ∷ Map Int Pending
  , watchers ∷ Map Flex (Set Int)
  , woken ∷ Set Int
  }

noneWaiting ∷ Waiting
noneWaiting = { entries: Map.empty, watchers: Map.empty, woken: Set.empty }

idOf ∷ Pending → Int
idOf pending = identity
  where
  Equation { id: identity } = pending.equation

-- The equation stored under its identity, replacing what it held. One
-- whose normal form (its residue, sides in either order) equals another
-- entry's is the same constraint: the younger of the two is dropped and
-- the older identity and site kept (design §2.6; rules §9, §14).
waitOn ∷ Pending → Waiting → Waiting
waitOn pending waiting = maybe' (const (inserted pending waiting)) kept
  (Array.find same (Array.fromFoldable (Map.values waiting.entries)))
  where
  same other = idOf other /= idOf pending
    && sameResidue other.residue pending.residue
  kept other
    | idOf other < idOf pending = withdrawn (idOf pending) waiting
    | otherwise = inserted pending (withdrawn (idOf other) waiting)

-- The entry removed, with its watches and its wake-up.
withdrawn ∷ Int → Waiting → Waiting
withdrawn id waiting = maybe waiting removed (Map.lookup id waiting.entries)
  where
  removed pending = waiting
    { entries = Map.delete id waiting.entries
    , watchers = foldl unwatched waiting.watchers pending.reads
    , woken = Set.delete id waiting.woken
    }
  unwatched watchers tail = Map.update (nonEmpty <<< Set.delete id) tail
    watchers

-- The equations that read `tail` woken: its facts or binding changed.
wake ∷ Flex → Waiting → Waiting
wake tail waiting = maybe waiting woke (Map.lookup tail waiting.watchers)
  where
  woke ids = waiting { woken = Set.union ids waiting.woken }

unwoken ∷ Int → Waiting → Waiting
unwoken id waiting = waiting { woken = Set.delete id waiting.woken }

-- No constant on either side.
quietResidue ∷ Residue → Boolean
quietResidue found = bare found.mine && bare found.theirs
  where
  bare side = Array.null side.fields && Array.null side.rigids

inserted ∷ Pending → Waiting → Waiting
inserted pending waiting = waiting
  { entries = Map.insert (idOf pending) pending waiting.entries
  , watchers = foldl watched waiting.watchers pending.reads
  }
  where
  watched watchers tail = Map.insertWith Set.union tail
    (Set.singleton (idOf pending))
    watchers

sameResidue ∷ Residue → Residue → Boolean
sameResidue one other =
  sameSide one.mine other.mine && sameSide one.theirs other.theirs
    || sameSide one.mine other.theirs && sameSide one.theirs other.mine

sameSide ∷ Side → Side → Boolean
sameSide one other = one.fields == other.fields && one.rigids == other.rigids
  && one.metas == other.metas

nonEmpty ∷ Set Int → Maybe (Set Int)
nonEmpty ids = if Set.isEmpty ids then Nothing else Just ids

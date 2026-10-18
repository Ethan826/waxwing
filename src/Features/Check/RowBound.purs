module Features.Check.RowBound
  ( Atom(..)
  , Bound
  , Narrowing
  , narrowedBy
  ) where

import Prelude
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, maybe)
import Data.Set (Set)
import Data.Set as Set
import Features.Check.Because (Equation, Lack)
import Features.Check.Flex (Flex)

-- What a row may hold that a meta can be asked to hold: a label, or a
-- signature's rigid tail (an opaque row, which is held whole or not at
-- all). R005 Tranche B design §2.5.
data Atom = LabelAtom String | RigidAtom Flex

derive instance eqAtom ∷ Eq Atom
derive instance ordAtom ∷ Ord Atom

-- One narrowing of an upper bound: the atoms it allowed, and the equation
-- whose residue allowed only those (R10.3 keeps them all and names, at a
-- failure, one that excludes the atom).
type Narrowing = { allowed ∷ Set Atom, why ∷ Equation }

-- An upper bound on an unbound meta (U1): every atom it will ever hold is
-- in `atoms`. `narrowings` is why, and `pruned` holds, for each atom a
-- fact removed (U2: the meta lacks the label, or is apart from the rigid),
-- that fact, so that a meta U4 binds to `{}` reports it (R10.2).
type Bound =
  { atoms ∷ Set Atom, narrowings ∷ Array Narrowing, pruned ∷ Map Atom Lack }

-- The bound narrowed to `allowed` for `why` (the atoms of both, or of
-- `allowed` alone when there was none), before any pruning. A narrowing
-- by an equation already named is kept once.
narrowedBy ∷ Set Atom → Array Narrowing → Maybe Bound → Bound
narrowedBy allowed why = maybe first narrowed
  where
  first = { atoms: allowed, narrowings: why, pruned: Map.empty }
  narrowed old = old
    { atoms = Set.intersection old.atoms allowed
    , narrowings = old.narrowings <> Array.filter (fresh old) why
    }
  fresh old narrowing = not
    (Array.elem narrowing.why (map _.why old.narrowings))

module Features.Check.Narrow (narrow, prune) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Lacks (lacksIn)
import Features.Check.Refused (Solving)
import Features.Check.RowStore
  ( Atom(..)
  , Bound
  , Lack
  , Narrowing
  , narrowedBy
  , partnersOf
  )
import Features.Check.RowStoreBound (boundOf, withBound, withEmptied)
import Features.Check.Subst (Flex(..), Subst, onStore, storeOf)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

-- Upper bounds (R005 Tranche B design §2.5, rules §5): `meta` narrowed to
-- the atoms `allowed`, for the equations `why`. A meta already bound
-- passes the narrowing to its image: each constant of the image must be
-- allowed (else no solution: `Outside`), and each meta of the image is
-- narrowed to `allowed` without them (U3). An unbound meta's bound becomes
-- the atoms both its old bound and `allowed` allow, less every label it
-- lacks and every rigid it is apart from (U2, each such fact kept); a
-- bound no smaller than before is no change; an empty one binds the meta
-- to `{}`, its only value (U4), recording what pruned it (R10.2). Each is
-- a consequence of the facts, so solutions are kept.
narrow
  ∷ Solving → Set Atom → Array Narrowing → Subst → Int → Either Failure Subst
narrow solving allowed why subst meta =
  if Array.null flat.fields && flat.tails == [ Meta meta ] then
    narrowFree solving allowed why subst meta
  else narrowImage solving allowed why subst flat
  where
  flat = flatten subst { fields: [], tails: [ Meta meta ] }

-- U2 for a fact just added to an unbound meta: its bound, if any, without
-- what the meta now lacks or is apart from.
prune ∷ Solving → Subst → Int → Either Failure Subst
prune solving subst meta = maybe (Right subst) again
  (boundOf (storeOf subst) meta)
  where
  again bound = narrowFree solving bound.atoms [] subst meta

narrowImage
  ∷ Solving → Set Atom → Array Narrowing → Subst → Flat → Either Failure Subst
narrowImage solving allowed why subst flat =
  maybe' inside outside (Array.find disallowed constants)
  where
  constants = map (LabelAtom <<< labelOf) flat.fields
    <> map RigidAtom (Array.filter rigid flat.tails)
  disallowed atom = not (Set.member atom allowed)
  outside atom = Left (Refused (Outside atom why))
  rest = Set.difference allowed (Set.fromFoldable constants)
  restWhy = map without why
  without narrowing = narrowing
    { allowed = Set.difference narrowing.allowed (Set.fromFoldable constants) }
  inside _ = foldM (narrow solving rest restWhy) subst
    (Array.mapMaybe metaTail flat.tails)
  labelOf (Tuple label _) = label

narrowFree
  ∷ Solving → Set Atom → Array Narrowing → Subst → Int → Either Failure Subst
narrowFree solving allowed why subst meta =
  if unchanged then Right subst
  else if Set.isEmpty next.atoms then solving.emptied
    (onStore (withEmptied meta next <<< withBound meta next) subst)
    meta
  else Right (onStore (withBound meta next) subst)
  where
  old = boundOf (storeOf subst) meta
  next = pruned subst meta (narrowedBy allowed why old)
  unchanged = maybe false (sameSize next) old
  sameSize found earlier = Set.size found.atoms == Set.size earlier.atoms

-- The bound less the atoms the meta's facts exclude, each fact kept.
pruned ∷ Subst → Int → Bound → Bound
pruned subst meta bound = bound
  { atoms = Set.filter kept bound.atoms
  , pruned = Map.union bound.pruned
      ( Map.fromFoldable
          (Array.mapMaybe excluded (Array.fromFoldable bound.atoms))
      )
  }
  where
  lacking = lacksIn subst (Meta meta)
  partners = partnersOf (storeOf subst) (Meta meta)
  kept atom = maybe true (const false) (excluding atom)
  excluded atom = Tuple atom <$> excluding atom

  excluding ∷ Atom → Maybe Lack
  excluding = case _ of
    LabelAtom label → Map.lookup label lacking
    RigidAtom tail → apartLack <$> Map.lookup tail partners
  apartLack because = { because, from: Nothing }

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

metaTail ∷ Flex → Maybe Int
metaTail = case _ of
  Meta meta → Just meta
  Rigid _ → Nothing

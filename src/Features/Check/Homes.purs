module Features.Check.Homes (admits, homesOf) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Set as Set
import Features.Check.Lacks (lacksIn, lacksOf)
import Features.Check.RowStore (Atom(..), RowStore, partnersOf)
import Features.Check.RowStoreBound (boundOf)
import Features.Check.Subst (Flex(..), Subst, storeOf)

-- Homes (R005 Tranche B design §2.1 step 7, rules §8): whether the
-- unbound meta may hold the atom in some solution. It may not when it
-- lacks the label or is apart from the rigid; when the atom is outside
-- its upper bound; or when holding it breaks a fact at once: a rigid
-- apart from the meta must lack the label (or be apart from the rigid),
-- and a rigid atom must lack every label the meta lacks. Each exclusion
-- is a consequence of a fact, so no meta a solution could use is
-- excluded; meta partners never exclude, which errs on admitting.
admits ∷ Subst → Int → Atom → Boolean
admits subst meta atom = maybe true held (boundOf store meta)
  && fits atom
  where
  store = storeOf subst
  held bound = Set.member atom bound.atoms
  lacking = lacksIn subst (Meta meta)
  partners = partnersOf store (Meta meta)
  rigidPartners = Array.filter rigid (Array.fromFoldable (Map.keys partners))
  fits = case _ of
    LabelAtom label → not (Map.member label lacking)
      && Array.all (lacks subst label) rigidPartners
    RigidAtom tail → not (Map.member tail partners)
      && Array.all (flip (lacks subst) tail)
        (Array.fromFoldable (Map.keys lacking))
      && Array.all (apart store tail) rigidPartners

-- Whether the rigid lacks the label by hypothesis.
lacks ∷ Subst → String → Flex → Boolean
lacks subst label tail = Set.member label (lacksOf subst tail)

-- Whether two rigids are apart by hypothesis.
apart ∷ RowStore → Flex → Flex → Boolean
apart store tail partner = Map.member partner (partnersOf store tail)

-- The metas of the other side that may hold the atom.
homesOf ∷ Subst → Array Int → Atom → Array Int
homesOf subst metas atom = Array.filter admitted metas
  where
  admitted meta = admits subst meta atom

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

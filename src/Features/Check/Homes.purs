module Features.Check.Homes (admits) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Set as Set
import Features.Check.Lacks (lacksIn, lacksOf)
import Features.Check.RowResidue (Atom(..))
import Features.Check.RowStore (RowStore, partnersOf)
import Features.Check.Subst (Flex(..), Subst, storeOf)

-- The exclusion test (R005 Tranche B plan §2.6): whether the unbound
-- meta may hold the atom in some solution. It may not when it lacks the
-- label or is apart from the rigid, or when holding it breaks a fact at
-- once: a rigid apart from the meta must lack the label (or be apart
-- from the rigid), and a rigid atom must lack every label the meta
-- lacks. Each exclusion is a consequence of a fact, so no meta a solution
-- could use is excluded; meta partners never exclude, which errs on
-- admitting. Since B2 (no upper bounds, no commits) it is no solving
-- step: B4's H classifies with its negation, `cannotHold`.
admits ∷ Subst → Int → Atom → Boolean
admits subst meta = fits
  where
  store = storeOf subst
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

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

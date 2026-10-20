module Features.Check.Collision (Naming, naming) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Features.Check.Atom (Atom(..))
import Features.Check.MergeParts (View)
import Features.Check.PartNames (partNames)
import Features.Check.RowName (tailName)
import Features.Check.Subst (Flex(..), Subst)

-- How one D4 or D6 names what it mentions (plan §10 decision 23): when a
-- callee's part and a rigid tail of the enclosing function share a name,
-- the parts take the callee's name (`part`) and the enclosing function's
-- rigid tails, and a row holding them, take its own (`rigid`, `row`).
-- Without a collision every name is as before. The identities come from
-- the record: a part is one of the owner's instantiated metas, a rigid
-- tail one of the enclosing signature's variables.
type Naming =
  { part ∷ String → String
  , rigid ∷ String → String
  , row ∷ Maybe String
  }

naming
  ∷ ∀ r
  . { variables ∷ Array String, functionName ∷ String | r }
  → Subst
  → View
  → Array Atom
  → Array Flex
  → Naming
naming env subst view atoms tails =
  if Array.null (Array.intersect owned enclosing) then
    { part: identity, rigid: identity, row: Nothing }
  else
    { part: maybe identity qualified ownerName
    , rigid: qualified env.functionName
    , row: if Array.any rigid tails then Just env.functionName else Nothing
    }
  where
  owned = partNames subst view view.parts
  enclosing = map (tailName env)
    (Array.filter rigid (tails <> Array.mapMaybe rigidOf atoms))
  ownerName = map nameOf view.owner
  nameOf owner = owner.name
  qualified owner name = owner <> "'s " <> name

rigidOf ∷ Atom → Maybe Flex
rigidOf = case _ of
  RigidAtom tail → Just tail
  LabelAtom _ → Nothing

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

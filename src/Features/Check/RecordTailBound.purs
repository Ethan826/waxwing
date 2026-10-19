module Features.Check.RecordTailBound
  ( Fields
  , narrowedRests
  , within
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty)
import Features.Check.Narrow (narrow)
import Features.Check.Refused (Failed, Solving, refusedBy)
import Features.Check.RowStore (Atom(..), Bound, Lack)
import Features.Check.Subst (Flex(..), Subst)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

type Fields = Array (Tuple String (Ty Flex))

-- U3's check: every constant of the image within the meta's bound. An
-- atom a fact pruned from the bound is reported by that fact, as the
-- bind rule would have without the bound (R10.2): the label's lack, or
-- the rigid in both rows of its pair (D3'); one the bound's equations
-- excluded is `Outside` (D6, Task 6).
within
  ∷ Failed → Subst → Maybe Bound → Fields → Array Flex → Either Failure Subst
within failed subst bound fields rests = maybe (Right subst) checked bound
  where
  constants = imageConstants fields rests
  checked found = maybe (Right subst) (excluded found)
    (Array.find (outside found) constants)
  outside found atom = not (Set.member atom found.atoms)
  excluded found atom = maybe (Left (Refused (Outside atom found.narrowings)))
    (prunedBy failed subst atom)
    (Map.lookup atom found.pruned)

prunedBy ∷ Failed → Subst → Atom → Lack → Either Failure Subst
prunedBy failed subst atom lack = case atom of
  LabelAtom label → refusedBy failed subst Nothing (Tuple label lack)
  RigidAtom tail → Left (Refused (Twice tail lack.because))

-- Step 6: each meta rest narrowed to the bound less the image's
-- constants.
narrowedRests
  ∷ Solving → Maybe Bound → Fields → Array Flex → Subst → Either Failure Subst
narrowedRests solving bound fields rests subst = maybe (Right subst) narrowed
  bound
  where
  constants = Set.fromFoldable (imageConstants fields rests)
  narrowed found = foldM (narrow solving (rest found.atoms) (whys found))
    subst
    (Array.mapMaybe metaOf rests)
  rest atoms = Set.difference atoms constants
  whys found = map without found.narrowings
  without narrowing = narrowing { allowed = rest narrowing.allowed }

-- The image's constants: its labels and its rigid tails.
imageConstants ∷ Fields → Array Flex → Array Atom
imageConstants fields rests = map (LabelAtom <<< fst) fields
  <> map RigidAtom (Array.filter rigid rests)

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

metaOf ∷ Flex → Maybe Int
metaOf = case _ of
  Meta meta → Just meta
  Rigid _ → Nothing

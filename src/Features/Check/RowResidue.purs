module Features.Check.RowResidue
  ( Constant(..)
  , Exam
  , Side
  , Residue
  , residue
  , common
  , constants
  , atomOf
  , sideRow
  , metasOf
  , settledResidue
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Type (Ty)
import Domain.Type.Record (RecordRow, recordRow)
import Features.Check.FlatRecord (Flat)
import Features.Check.RowStore (Atom(..), Equation)
import Features.Check.Subst (Flex(..), Subst)

-- What may go into a meta of the other side: a label with its field
-- type, or a rigid tail.
data Constant = Field String (Ty Flex) | RigidTail Flex

-- One side of an equation once the labels both sides hold have unified
-- and the tails both hold cancelled (R005 Tranche B design §2.1 steps
-- 2-4, rules §2-§4): its labels with their types, its rigid tails, and
-- its unbound meta tails, repeats kept.
type Side =
  { fields ∷ Array (Tuple String (Ty Flex))
  , rigids ∷ Array Flex
  , metas ∷ Array Int
  }

type Residue = { mine ∷ Side, theirs ∷ Side }

-- One equation's examination so far (Features.Check.UnifyRecord): the
-- substitution reached, and the one before the last sum-rule step (where
-- a refusal U4 caused is printed, as it was before U4, R10.2); the labels
-- whose field types have unified (step 2 runs once per label); the
-- equation's identity once it derived a fact; and the metas each side's
-- residues have held.
type Exam =
  { subst ∷ Subst
  , before ∷ Subst
  , done ∷ Set String
  , equation ∷ Maybe Equation
  , seen ∷ { mine ∷ Set Int, theirs ∷ Set Int }
  }

-- The residue of two flattened rows. Tails cancel as multisets: disjoint
-- union cancels, so `A ⊎ X = B ⊎ X` holds exactly when `A = B` (rules
-- §3); a label both hold has already unified its types (step 2).
residue ∷ Flat → Flat → Residue
residue one other =
  { mine: sideOf (only one other) cancelled.mine
  , theirs: sideOf (only other one) cancelled.theirs
  }
  where
  cancelled = foldl cancel { mine: one.tails, theirs: [] } other.tails
  cancel found tail
    | Array.elem tail found.mine = found
        { mine = Array.delete tail found.mine }
    | otherwise = found { theirs = Array.snoc found.theirs tail }

-- The field types of each label both rows hold, mine first, by label.
common ∷ Flat → Flat → Array (Tuple String (Tuple (Ty Flex) (Ty Flex)))
common mine theirs = Array.mapMaybe paired mine.fields
  where
  table = Map.fromFoldable theirs.fields
  paired (Tuple label ty) = Tuple label <<< Tuple ty <$> Map.lookup label table

-- Labels first, in label order, then rigid tails.
constants ∷ Side → Array Constant
constants side = map field side.fields <> map RigidTail side.rigids
  where
  field (Tuple label ty) = Field label ty

atomOf ∷ Constant → Atom
atomOf = case _ of
  Field label _ → LabelAtom label
  RigidTail tail → RigidAtom tail

-- The side as a row: its labels, its rigid tails and its metas.
sideRow ∷ Side → RecordRow (Ty Flex) Flex
sideRow side = recordRow side.fields (side.rigids <> map Meta side.metas)

metasOf ∷ Residue → Set Int
metasOf found = Set.fromFoldable (found.mine.metas <> found.theirs.metas)

-- Nothing left on either side: the equation holds.
settledResidue ∷ Residue → Boolean
settledResidue found = empty found.mine && empty found.theirs
  where
  empty side = Array.null side.fields && Array.null side.rigids
    && Array.null side.metas

-- The fields of `mine` whose labels `theirs` does not hold.
only ∷ Flat → Flat → Array (Tuple String (Ty Flex))
only mine theirs = Array.filter absent mine.fields
  where
  table = Map.fromFoldable theirs.fields
  absent (Tuple label _) = not (Map.member label table)

sideOf ∷ Array (Tuple String (Ty Flex)) → Array Flex → Side
sideOf fields tails =
  { fields, rigids: Array.filter rigid tails, metas: Array.mapMaybe meta tails }
  where
  rigid = case _ of
    Rigid _ → true
    Meta _ → false
  meta = case _ of
    Meta found → Just found
    Rigid _ → Nothing

module Features.Check.PartNames (partNames, partNotes) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Tuple (Tuple(..))
import Domain.Note (NoteReason(..))
import Domain.Syntax (Note)
import Domain.Type (Ty(..))
import Features.Check.FlatRecord (flatten)
import Features.Check.MergeParts (View)
import Features.Check.OriginStore (originsOf)
import Features.Check.PartOrigin (Parameter, parametersOf)
import Features.Check.Subst (Flex(..), Subst, walk)

-- R1-R3 (R005 Tranche B diagnostics): each part as its owner's variable;
-- else, as the unannotated lambda parameter whose whole record row it is
-- (rule 2, Task 7); else numbered `..._n` (`..._` when only one is
-- unnamed). Distinct parts whose names would print alike are numbered
-- instead (R3: never told apart by a name they share), each with an
-- origin note where one is known. Unnamed parts are numbered by where
-- their expressions are written (a literal's items), then in the parts'
-- order, never by when they were made.
partNames ∷ Subst → View → Array Int → Array String
partNames subst view parts = map (nameIn subst view parts) parts

-- R8's second note: `..._n comes from here` at each unnamed part's
-- expression, in number order.
partNotes ∷ Subst → View → Array Int → Array Note
partNotes subst view parts = Array.mapMaybe note (unnamedIn subst view parts)
  where
  note part = Map.lookup part view.items >>= at part
  at part span = Just
    { span, reason: PartComesFromHere (nameIn subst view parts part) }

nameIn ∷ Subst → View → Array Int → Int → String
nameIn subst view parts part = maybe' numbered identity
  (Map.lookup part (keptNames subst view parts))
  where
  unnamed = unnamedIn subst view parts
  numbered _
    | Array.length unnamed == 1 = "..._"
    | otherwise = "..._" <> maybe "" (show <<< add 1)
        (Array.elemIndex part unnamed)

-- The parts that keep a name: those whose name no other part shares.
keptNames ∷ Subst → View → Array Int → Map.Map Int String
keptNames subst view parts = Map.filter alone given
  where
  given = Map.fromFoldable (Array.mapMaybe named parts)
  named part = Tuple part <$> nameOf subst view part
  alone name = Map.size (Map.filter (eq name) given) == 1

unnamedIn ∷ Subst → View → Array Int → Array Int
unnamedIn subst view parts = Array.sortWith writtenAt
  (Array.filter (not <<< flip Map.member kept) parts)
  where
  kept = keptNames subst view parts
  writtenAt part = maybe top startOf (Map.lookup part view.items)
  startOf span = span.start.offset
  -- After every offset a source can have; the sort is stable.
  top = 2147483647

nameOf ∷ Subst → View → Int → Maybe String
nameOf subst view part = maybe' lambdaName Just
  (Map.lookup part =<< map ownerNames view.owner)
  where
  ownerNames owner = owner.names
  lambdaName _ = Array.findMap (wholeOf subst part)
    (parametersOf (originsOf subst))

-- A parameter's name when the part is its whole record row: the two rows
-- are the same under the substitution.
wholeOf ∷ Subst → Int → Parameter → Maybe String
wholeOf subst part parameter = case walk subst (TVar (Meta parameter.meta)) of
  TRecord row
    | flatten subst row == flatten subst { fields: [], tails: [ Meta part ] } →
        parameter.name
  _ → Nothing

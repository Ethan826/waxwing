module Features.Check.SumRule (sumRule) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM, foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Features.Check.Disjoint (requireApart, requireLack)
import Features.Check.Lacks (lacksOf)
import Features.Check.Narrow (narrow)
import Features.Check.Refused (Solving)
import Features.Check.RowResidue (Residue, Side, atomOf, constants)
import Features.Check.RowStore
  ( Atom(..)
  , Because(..)
  , Equation
  , partnersOf
  )
import Features.Check.RowStoreBound (boundOf)
import Features.Check.Subst (Flex(..), Subst(..), storeOf)
import Features.Check.UnifyFailure (Failure)

-- The sum rule (R005 Tranche B design §2.5, rules §5). In a residue `C1 ⊎
-- M1 = C2 ⊎ M2` each meta of one side lies within the other side, so it
-- is narrowed to the other side's constants and bounds when every meta
-- there has a bound (bound); it lacks a label that every meta there
-- lacks, that no constant there is, and that every rigid there lacks
-- (lack); and it is apart from a tail that every meta there is apart
-- from and that is disjoint from every constant there (apart). Each fact
-- is a consequence of the residue and the facts already present, so
-- solutions are kept; each keeps the equation as its reason (`Equated`).
-- Both directions, each in that order, as the prototype does. A meta the
-- rule has bound meanwhile is left alone.
sumRule ∷ Solving → Equation → Residue → Subst → Either Failure Subst
sumRule solving equation found subst =
  direction solving equation found.mine found.theirs subst
    >>= direction solving equation found.theirs found.mine

direction
  ∷ Solving → Equation → Side → Side → Subst → Either Failure Subst
direction solving equation own other subst =
  if Array.null own.metas then Right subst
  else if Array.null other.metas then bounded subst
  else bounded subst >>= lacked >>= aparted
  where
  reason = { because: Equated equation, from: Nothing }
  atoms = map atomOf (constants other)
  bounded reached = maybe (Right reached)
    (narrowAll solving equation own.metas reached)
    (allowedBy reached atoms other.metas)
  lacked reached = foldM lackOne reached
    (pairs own.metas (sharedLacks reached atoms other.metas))
  lackOne reached (Tuple meta label)
    | unbound reached meta = requireLack solving reason reached (Meta meta)
        label
    | otherwise = Right reached
  aparted reached = foldM apartOne reached
    (pairs own.metas (sharedPartners reached atoms other.metas))
  apartOne reached (Tuple meta tail)
    | unbound reached meta && live reached tail = requireApart solving reason
        reached
        (Meta meta)
        tail
    | otherwise = Right reached

-- Bound: each unbound meta narrowed to `allowed`, for this equation.
narrowAll
  ∷ Solving → Equation → Array Int → Subst → Set Atom → Either Failure Subst
narrowAll solving equation metas subst allowed = foldM narrowOne subst metas
  where
  narrowOne reached meta
    | unbound reached meta = narrow solving allowed
        [ { allowed, why: equation } ]
        reached
        meta
    | otherwise = Right reached

-- The other side's constants and every bound of its metas, when each of
-- them has one (vacuously when it has none).
allowedBy ∷ Subst → Array Atom → Array Int → Maybe (Set Atom)
allowedBy subst atoms metas = foldl joined (Just (Set.fromFoldable atoms))
  metas
  where
  joined found meta = Set.union <$> found <*> (_.atoms <$> boundOf store meta)
  store = storeOf subst

-- Labels every meta lacks (read only from unbound ones), that no constant
-- is, and that every rigid constant lacks by hypothesis.
sharedLacks ∷ Subst → Array Atom → Array Int → Array String
sharedLacks subst atoms metas = maybe [] candidates (Array.head metas)
  where
  candidates first = Array.filter allowed
    (Array.fromFoldable (liveLacks subst (Meta first)))
  allowed label = Array.all (lacking label) metas
    && Array.all (excluding label) atoms
  lacking label meta = Set.member label (liveLacks subst (Meta meta))
  excluding label = case _ of
    LabelAtom other → other /= label
    RigidAtom tail → Set.member label (lacksOf subst tail)

-- Tails apart from every meta, and disjoint from every constant.
sharedPartners ∷ Subst → Array Atom → Array Int → Array Flex
sharedPartners subst atoms metas = maybe [] candidates (Array.head metas)
  where
  store = storeOf subst
  candidates first = Array.filter allowed
    (Array.fromFoldable (Map.keys (partnersOf store (Meta first))))
  allowed tail = Array.all (apart tail) metas
    && Array.all (disjointFrom subst tail) atoms
  apart tail meta = Map.member tail (partnersOf store (Meta meta))

-- Whether the tail is known disjoint from the atom: it lacks the label,
-- or it and the rigid are apart (by a pair or, for two rigids, by
-- hypothesis); a rigid is never disjoint from itself.
disjointFrom ∷ Subst → Flex → Atom → Boolean
disjointFrom subst tail = case _ of
  LabelAtom label → Set.member label (liveLacks subst tail)
  RigidAtom rigid → rigid /= tail
    && Map.member rigid (partnersOf (storeOf subst) tail)

-- What an unbound meta or a rigid lacks; a bound meta's lacks moved to
-- its image (the prototype forgets them).
liveLacks ∷ Subst → Flex → Set String
liveLacks subst tail
  | live subst tail = lacksOf subst tail
  | otherwise = Set.empty

pairs ∷ ∀ a. Array Int → Array a → Array (Tuple Int a)
pairs metas found = Array.concatMap byMeta metas
  where
  byMeta meta = map (Tuple meta) found

unbound ∷ Subst → Int → Boolean
unbound (Subst bindings) meta = not (Map.member meta bindings.types)

live ∷ Subst → Flex → Boolean
live subst = case _ of
  Meta meta → unbound subst meta
  Rigid _ → true

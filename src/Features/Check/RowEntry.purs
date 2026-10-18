module Features.Check.RowEntry
  ( row
  , hypotheses
  , equate
  , separate
  , lacking
  , bindings
  , facts
  , exclusions
  , changes
  , solverMetas
  , module Features.Check.RowOutcome
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either)
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty(..))
import Domain.Type.Record (RecordRow, recordRow)
import Features.Check.Disjoint
  ( requireDisjoint
  , requireLack
  , seedApart
  , wellFormed
  )
import Features.Check.FlatRecord (flatten)
import Features.Check.Homes (admits)
import Features.Check.Lacks (addLacks)
import Features.Check.RecordTail (solvingWith)
import Features.Check.Refused (Solving)
import Features.Check.RowOutcome (RowOutcome(..), outcome)
import Features.Check.RowResidue (atomOf, constants, residue)
import Features.Check.RowStore
  ( Atom(..)
  , Because(..)
  , RowStore(..)
  , changesOf
  , plain
  )
import Features.Check.Subst (Flex, Subst(..), empty, storeOf)
import Features.Check.Unify (unify)
import Features.Check.UnifyFailure (Failure)
import Features.Check.UnifyParts (mismatch)

-- The row solver's entry for tests (R005 Tranche B plan, Task 4): labels-
-- only constraint problems, as the prototype and the oracle encode them
-- (research/open-row-merge/README.md), run through the compiler's own
-- unification, decomposition and lacks, and the state read out raw so
-- that a test can interpret it itself. A label's field type is Int.

type Row = RecordRow (Ty Flex) Flex

row ∷ Array String → Array Flex → Row
row labels tails = recordRow (map field labels) tails
  where
  field label = Tuple label TInt

-- The hypotheses on rigid tails: the labels each lacks, the pairs apart.
hypotheses ∷ Array (Tuple Flex (Array String)) → Array (Tuple Flex Flex) → Subst
hypotheses lacks pairs = foldl paired (foldl lacked empty lacks) pairs
  where
  lacked subst (Tuple tail labels) = addLacks tail (Set.fromFoldable labels)
    subst
  paired subst (Tuple one other) = seedApart one other Implied subst

-- `left = right`, after each row's own disjointness is recorded where it
-- is made (the creation-site obligation, design §1.4), as the
-- prototype's driver does.
equate ∷ Subst → Row → Row → Either Failure Subst
equate subst left right = made subst left >>= flip made right
  >>= unifying
  where
  unifying reached = unify reached (TRecord left) (TRecord right)

-- `left # right`, likewise after each row's own disjointness.
separate ∷ Subst → Row → Row → Either Failure Subst
separate subst left right = made subst left >>= flip made right
  >>= disjoined
  where
  disjoined reached = requireDisjoint (solving left right) plain reached left
    right

-- `tail lacks label`.
lacking ∷ Subst → Flex → String → Either Failure Subst
lacking subst tail label = requireLack (solving one one) plain subst tail label
  where
  one = row [] [ tail ]

-- Each binding of a meta, one level: its labels and its tails as written
-- in the binding (not followed), for a test to follow itself.
bindings
  ∷ Subst → Array { meta ∷ Int, labels ∷ Array String, tails ∷ Array Flex }
bindings (Subst found) = Array.mapMaybe bound (Map.toUnfoldable found.types)
  where
  bound (Tuple meta ty) = case ty of
    TRecord image → Just
      { meta, labels: map fst image.fields, tails: image.tails }
    TVar tail → Just { meta, labels: [], tails: [ tail ] }
    _ → Nothing

-- The facts on tails: lacks, pairs (each once), and upper bounds.
facts
  ∷ Subst
  → { lacks ∷ Array { tail ∷ Flex, labels ∷ Array String }
    , apart ∷ Array (Tuple Flex Flex)
    , upper ∷ Array { meta ∷ Int, labels ∷ Array String, rigids ∷ Array Flex }
    }
facts subst =
  { lacks: map lacked (Map.toUnfoldable store.lacks)
  , apart: Array.concatMap paired (Map.toUnfoldable store.apart)
  , upper: map bounded (Map.toUnfoldable store.upper)
  }
  where
  RowStore store = storeOf subst
  lacked (Tuple tail table) =
    { tail, labels: Array.fromFoldable (Map.keys table) }
  paired (Tuple one table) = Array.mapMaybe (ordered one)
    (Array.fromFoldable (Map.keys table))
  ordered one other = if one < other then Just (Tuple one other) else Nothing
  bounded (Tuple meta bound) =
    { meta
    , labels: Array.mapMaybe labelAtom (Array.fromFoldable bound.atoms)
    , rigids: Array.mapMaybe rigidAtom (Array.fromFoldable bound.atoms)
    }

-- For `left = right` under `subst`, each constant of the residue and each
-- meta of the other side that homes excludes (design §2.1 step 7), as
-- `{ meta, label }` or `{ meta, rigid }`: a test checks that no solution
-- puts it there (ledger L31).
exclusions
  ∷ Subst
  → Row
  → Row
  → Array { meta ∷ Int, labels ∷ Array String, rigids ∷ Array Flex }
exclusions subst left right =
  excluded found.mine found.theirs.metas <> excluded found.theirs
    found.mine.metas
  where
  found = residue (flatten subst left) (flatten subst right)
  excluded side metas = Array.concatMap (byMeta side) metas
  byMeta side meta = Array.mapMaybe (refused meta)
    (map atomOf (constants side))
  refused meta atom =
    if admits subst meta atom then Nothing
    else Just
      { meta
      , labels: Array.mapMaybe labelAtom [ atom ]
      , rigids: Array.mapMaybe rigidAtom [ atom ]
      }

-- The termination measure's counter (ledger L3).
changes ∷ Subst → Int
changes subst = changesOf (storeOf subst)

-- How many metas the solver made (commits and remainders; ledger L4).
solverMetas ∷ Subst → Int
solverMetas (Subst found) = -1 - found.fresh

-- Each row's own disjointness, recorded where it is made.
made ∷ Subst → Row → Either Failure Subst
made subst written = wellFormed (solving written written) plain subst written

solving ∷ Row → Row → Solving
solving left right = solvingWith failed
  where
  failed reached = mismatch reached (TRecord left) (TRecord right)

labelAtom ∷ Atom → Maybe String
labelAtom = case _ of
  LabelAtom label → Just label
  RigidAtom _ → Nothing

rigidAtom ∷ Atom → Maybe Flex
rigidAtom = case _ of
  RigidAtom tail → Just tail
  LabelAtom _ → Nothing

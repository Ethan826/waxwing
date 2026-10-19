module Features.Check.RowEntry
  ( row
  , hypotheses
  , equate
  , separate
  , lacking
  , bindings
  , facts
  , changes
  , solverMetas
  , finish
  , merges
  , lineages
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
import Features.Check.Lacks (addLacks)
import Features.Check.RecordTail (solvingWith)
import Features.Check.Refused (Solving)
import Features.Check.RowMerge.Desugar (desugaredRow)
import Features.Check.RowMerge.End (endOfBody)
import Features.Check.RowMerge.Predicate (waiting)
import Features.Check.RowOutcome (RowOutcome(..), Stop, outcome)
import Features.Check.RowStore
  ( Because(..)
  , RowStore(..)
  , changesOf
  , mergesOf
  , plain
  )
import Features.Check.Subst (Flex, Subst(..), empty, storeOf)
import Features.Check.Unify (reexamine, unify)
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

-- `left = right`, as research/row-merge-qt qt-drive.mjs drives it: each
-- row made (desugared, then its own disjointness recorded: the creation-
-- site obligation, design §1.4), the predicates re-examined, then the
-- rows unified (which re-examines again).
equate ∷ Subst → Row → Row → Either Failure Subst
equate subst left right = do
  one ← made subst left
  other ← made one.subst right
  reached ← reexamine other.subst
  unify reached (TRecord one.row) (TRecord other.row)

-- `left # right`, likewise, then re-examined.
separate ∷ Subst → Row → Row → Either Failure Subst
separate subst left right = do
  one ← made subst left
  other ← made one.subst right
  requireDisjoint (solving left right) plain other.subst one.row other.row
    >>= reexamine

-- `tail lacks label`, then re-examined.
lacking ∷ Subst → Flex → String → Either Failure Subst
lacking subst tail label =
  requireLack (solving one one) plain subst tail label >>= reexamine
  where
  one = row [] [ tail ]

-- The end of the body (Features.Check.RowMerge.End), classified.
finish ∷ Subst → Either Stop RowOutcome
finish subst = outcome (endOfBody subst)

-- The waiting predicates, their rows as stored (not followed).
merges
  ∷ Subst → Array { id ∷ Int, left ∷ Entry, right ∷ Entry, result ∷ Entry }
merges subst = map read (waiting subst)
  where
  read merge =
    { id: merge.id
    , left: entry merge.left
    , right: entry merge.right
    , result: entry merge.result
    }
  entry found = { labels: map fst found.fields, tails: found.tails }

-- Each predicate's case-3 moves, in order (rules §5's lineage).
lineages ∷ Subst → Array { id ∷ Int, moves ∷ Array (Array String) }
lineages subst = map read (Map.toUnfoldable (mergesOf (storeOf subst)).moves)
  where
  read (Tuple id moves) = { id, moves }

type Entry = { labels ∷ Array String, tails ∷ Array Flex }

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

-- The facts on tails: lacks, and pairs (each once; a meta apart from
-- itself once, as itself twice).
facts
  ∷ Subst
  → { lacks ∷ Array { tail ∷ Flex, labels ∷ Array String }
    , apart ∷ Array (Tuple Flex Flex)
    }
facts subst =
  { lacks: map lacked (Map.toUnfoldable store.lacks)
  , apart: Array.concatMap paired (Map.toUnfoldable store.apart)
  }
  where
  RowStore store = storeOf subst
  lacked (Tuple tail table) =
    { tail, labels: Array.fromFoldable (Map.keys table) }
  paired (Tuple one table) = Array.mapMaybe (ordered one)
    (Array.fromFoldable (Map.keys table))
  ordered one other =
    if one <= other then Just (Tuple one other) else Nothing

-- The termination measure's counter (ledger L3).
changes ∷ Subst → Int
changes subst = changesOf (storeOf subst)

-- How many metas the solver made (shared remainders; ledger L4).
solverMetas ∷ Subst → Int
solverMetas (Subst found) = -1 - found.fresh

-- A row as made: desugared (plan §2.1), then its own disjointness
-- recorded.
made ∷ Subst → Row → Either Failure { row ∷ Row, subst ∷ Subst }
made subst written =
  desugaredRow (solving written written) Nothing written subst >>= formed
  where
  formed desugared = withRow desugared.row <$> wellFormed
    (solving written written)
    plain
    desugared.subst
    desugared.row
  withRow found reached = { row: found, subst: reached }

solving ∷ Row → Row → Solving
solving left right = solvingWith failed
  where
  failed reached = mismatch reached (TRecord left) (TRecord right)

module Features.Check.RowMerge.Chain
  ( desugaredRow
  , predicateFor
  , pairedWith
  , finished
  , isMeta
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM, foldl)
import Data.Maybe (Maybe, maybe)
import Data.Set as Set
import Data.Tuple (fst)
import Domain.Syntax (Span)
import Domain.Type.Record (recordRow)
import Features.Check.Disjoint (requireApart, seedApart)
import Features.Check.Lacks (addLacks)
import Features.Check.PartOrigin (Step)
import Features.Check.Refused (Solving)
import Features.Check.RowMerge.Merge (Row)
import Features.Check.RowMerge.Occurrence (nextPredicate, recorded)
import Features.Check.RowMerge.Predicate (made)
import Features.Check.RowStore (Because(..), plain)
import Features.Check.Subst (Flex(..), Subst(..))
import Features.Check.UnifyFailure (Failure)

-- The chain of predicates one written row of several unknown tails
-- becomes (R005 Tranche B plan §2.1), shared by the rows made at uses
-- (Features.Check.RowMerge.Desugar) and those whose parts must be
-- required apart as they are made. A module of its own so that Desugar
-- stays under the file budget (Task 7).

-- A row made with k ≥ 2 unknown tails (R005 Tranche B plan §2.1, T1):
-- the unknown tails m1 … mk, in the row's sorted tail order, become one
-- fresh meta t and `Merge m1 m2 t1`, `Merge t1 m3 t2`, …, `Merge t(k-2)
-- mk t`, folded from the left as PureScript writes `Union r s t` and as
-- research/row-merge-qt qt-preds.mjs `desugar` does; fields and rigid
-- tails stay in the row. Counted as written, as the prototype counts
-- them: a tail bound since is still a part. Each predicate's parts are
-- required disjoint when it is made (refused if they are not), and t,
-- fresh, lacks the row's labels and is apart from its rigid tails. One
-- desugaring per occurrence, no memo (§2.1).
desugaredRow
  ∷ Solving
  → Maybe Span
  → Row
  → Subst
  → Either Failure { row ∷ Row, subst ∷ Subst }
desugaredRow solving site written subst =
  if Array.length metas < 2 then Right { row: written, subst }
  else finished site [] (nextPredicate subst) written
    <$> foldM required { tail: first, subst } rest
  where
  metas = Array.filter isMeta written.tails
  first = maybe (Meta 0) identity (Array.head metas)
  rest = Array.drop 1 metas
  required found part = pairedWith (predicateFor site found part)
    <$> requireApart solving plain (predicateFor site found part).subst
      found.tail
      part

-- `Merge acc part t`, t fresh: the predicate made, its parts' pair not
-- yet.
predicateFor
  ∷ Maybe Span
  → { tail ∷ Flex, subst ∷ Subst }
  → Flex
  → { tail ∷ Flex, subst ∷ Subst }
predicateFor site found part =
  { tail: Meta fresh
  , subst: made site (single found.tail) (single part) (single (Meta fresh))
      (Subst bindings { fresh = fresh - 1 })
  }
  where
  Subst bindings = found.subst
  fresh = bindings.fresh
  single tail = { fields: [], tails: [ tail ] }

pairedWith
  ∷ { tail ∷ Flex, subst ∷ Subst } → Subst → { tail ∷ Flex, subst ∷ Subst }
pairedWith made reached = made { subst = reached }

-- The row with its unknown tails replaced by the last result, which
-- lacks the row's labels and is apart from its rigid tails; the
-- occurrence recorded, its predicates those made since `first`.
finished
  ∷ Maybe Span
  → Array Step
  → Int
  → Row
  → { tail ∷ Flex, subst ∷ Subst }
  → { row ∷ Row, subst ∷ Subst }
finished site steps first written found =
  { row: recordRow written.fields (rigids <> [ found.tail ])
  , subst: recorded site steps first written found.tail
      (foldl apart (addLacks found.tail labels found.subst) rigids)
  }
  where
  rigids = Array.filter (not <<< isMeta) written.tails
  labels = Set.fromFoldable (map fst written.fields)
  apart reached rigid = seedApart found.tail rigid Implied reached

isMeta ∷ Flex → Boolean
isMeta = case _ of
  Meta _ → true
  Rigid _ → false

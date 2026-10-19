module Features.Check.UnifyRecord (unifyRecord) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldM)
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty(..))
import Domain.Type.Record (RecordRow)
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Homeless (homeless)
import Features.Check.RowResidue
  ( Residue
  , common
  , residue
  , settledResidue
  )
import Features.Check.RowMerge.Predicate (causeIn)
import Features.Check.RowSettle (settle)
import Features.Check.Subst (Flex(..), Subst, walk)
import Features.Check.UnifyFailure (Failure(..))
import Features.Check.UnifyParts (mismatch)

type Row = RecordRow (Ty Flex) Flex

-- Record rows unify by label (R001 design §2) and, since R005 Tranche B
-- Task 4, with several tails a side (plan §2), one examination at a time:
-- (1) both sides are flattened through their tails' bindings, and a label
-- twice on one side is the records' mismatch; (2) the labels both hold
-- unify field-wise, in label order, each once (`unifyField`, one level
-- deeper), and if that bound a tail of either row both are flattened
-- again; (3-4) common tails cancel and the residue is left, a constant
-- with no meta opposite failing at once (Features.Check.Homeless); then
-- Features.Check.RowSettle: one meta alone, or the shared remainder of
-- one meta a side; a residue with two or more metas on a side reaches
-- placeholder P1 until B3's predicates. Each step keeps the solutions,
-- each refusal has none. With one tail a side these are ADR 013's rules
-- 1-6. (Task 4's sum rule, upper bounds and commits went in B2.)
unifyRecord
  ∷ (Subst → Ty Flex → Ty Flex → Either Failure Subst)
  → Subst
  → Row
  → Row
  → Either Failure Subst
unifyRecord unifyField subst left right = attributed subst left right
  (tailRecM (examine unifyField left right) subst)

examine
  ∷ (Subst → Ty Flex → Ty Flex → Either Failure Subst)
  → Row
  → Row
  → Subst
  → Either Failure (Step Subst Subst)
examine unifyField left right subst =
  if repeated one || repeated other then Done <$> failed subst
  else foldM fieldPair subst (common one other) >>= unified
  where
  one = flatten subst left
  other = flatten subst right
  failed reached = mismatch reached (TRecord left) (TRecord right)
  fieldPair reached (Tuple _ (Tuple mine theirs)) = unifyField reached mine
    theirs
  unified reached
    | rebound reached one || rebound reached other = Right
        (Loop reached)
    | otherwise = Done <$> decide failed reached (residue one other)

-- Steps 3 and 4, then the one-tail rules, on the residue.
decide
  ∷ (Subst → Either Failure Subst) → Subst → Residue → Either Failure Subst
decide failed subst found
  | settledResidue found = Right subst
  | homeless found = failed subst
  | otherwise = settle failed subst found

-- R10.1, extended to case 2 (plan §10 decision 5): a failure whose rows
-- reach a meta a `Merge` case bound is that predicate's; a stop stays a
-- stop, and one already attributed keeps its predicate.
attributed
  ∷ Subst → Row → Row → Either Failure Subst → Either Failure Subst
attributed subst left right = either caused Right
  where
  caused failure
    | open failure = Left
        (maybe failure (byPredicate failure) (causeIn subst tails))
    | otherwise = Left failure
  tails = left.tails <> right.tails
  byPredicate failure predicate = FromMerge { predicate, at: Nothing }
    failure
  open = case _ of
    TooDeep → false
    Unexpected _ → false
    Placeholder _ → false
    Exhausted _ → false
    FromMerge _ _ → false
    _ → true

-- Whether unifying the shared fields bound one of the row's own tail
-- metas, as in `{ a: { ...r }, ...r }`. The rows are then flattened again
-- and unified anew, so that binding is followed rather than overwritten.
-- Each round binds one more of their tails, so the rounds end.
rebound ∷ Subst → Flat → Boolean
rebound subst row = Array.any bound row.tails
  where
  bound tail = case tail of
    Meta _ → walk subst (TVar tail) /= TVar tail
    Rigid _ → false

-- Sorted, so a label held twice is held by neighbours. Lacks sets keep
-- this from arising; were it to, the row is no record.
repeated ∷ Flat → Boolean
repeated row = Array.any same (Array.zip labels (Array.drop 1 labels))
  where
  labels = map fst row.fields
  same (Tuple one other) = one == other

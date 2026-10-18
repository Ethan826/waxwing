module Features.Check.UnifyRecord (unifyRecord, reexamine) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty(..))
import Domain.Type.Record (RecordRow)
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Homeless (homeless, homelessReport)
import Features.Check.RecordTail (solvingWith)
import Features.Check.Pending (Pending)
import Features.Check.RowResidue
  ( Exam
  , Residue
  , common
  , residue
  , settledResidue
  , sideRow
  )
import Features.Check.RowSettle (equationOf, settle)
import Features.Check.RowStore (changesOf)
import Features.Check.Subst (Flex(..), Subst, storeOf, walk)
import Features.Check.SumRule (sumRule)
import Features.Check.UnifyFailure (Failure)
import Features.Check.UnifyParts (mismatch)

type Row = RecordRow (Ty Flex) Flex

-- Record rows unify by label (R001 design §2) and, since R005 Tranche B
-- Task 4, by the forced moves of design §2.1 (rules §1-§8), one
-- examination at a time: (1) both sides are flattened through their
-- tails' bindings, and a label twice on one side is the records'
-- mismatch; (2) the labels both hold unify field-wise, in label order,
-- each once (`unifyField`, one level deeper), and if that bound a tail of
-- either row both are flattened again; (3-4) common tails cancel and the
-- residue is left, a constant with no meta opposite failing at once
-- (Features.Check.Homeless); (5) the sum rule, and if it changed the
-- state, again from (1); then (6-8) Features.Check.RowSettle: one meta
-- alone, the shared remainder, a commit (again from (1)), or the
-- equation waits among the store's pending equations (Task 5), to be
-- examined again by the drain (`reexamine`). Each step keeps the
-- solutions, each refusal has none. With one tail a side these are ADR
-- 013's rules 1-6.
unifyRecord
  ∷ (Subst → Ty Flex → Ty Flex → Either Failure Subst)
  → Subst
  → Row
  → Row
  → Either Failure Subst
unifyRecord unifyField subst left right = tailRecM
  (examine unifyField left right)
  { subst
  , before: subst
  , done: Set.empty
  , equation: Nothing
  , seen: { mine: Set.empty, theirs: Set.empty }
  }

-- A pending equation examined again (design §2.6, the drain): the same
-- steps on its residue, which the substitution may have changed since,
-- under its own identity, so that waiting again replaces its entry.
-- Labels that now cancel unify their field types here, once.
reexamine
  ∷ (Subst → Ty Flex → Ty Flex → Either Failure Subst)
  → Subst
  → Pending
  → Either Failure Subst
reexamine unifyField subst pending = tailRecM
  (examine unifyField left right)
  { subst
  , before: subst
  , done: Set.empty
  , equation: Just pending.equation
  , seen: { mine: Set.empty, theirs: Set.empty }
  }
  where
  left = sideRow pending.residue.mine
  right = sideRow pending.residue.theirs

examine
  ∷ (Subst → Ty Flex → Ty Flex → Either Failure Subst)
  → Row
  → Row
  → Exam
  → Either Failure (Step Exam Subst)
examine unifyField left right exam =
  if repeated one || repeated other then Done <$> failed exam.subst
  else foldM fieldPair exam.subst fresh >>= unified
  where
  one = flatten exam.subst left
  other = flatten exam.subst right
  failed reached = mismatch reached (TRecord left) (TRecord right)
  pairs = common one other
  fresh = Array.filter (not <<< flip Set.member exam.done <<< fst) pairs
  fieldPair reached (Tuple _ (Tuple mine theirs)) = unifyField reached mine
    theirs
  unified reached
    | rebound reached one || rebound reached other = Right
        (Loop exam { subst = reached, done = Set.empty })
    | otherwise = decide failed left right
        exam
          { subst = reached
          , done = Set.union exam.done (Set.fromFoldable (map fst pairs))
          }
        (residue one other)

-- Steps 3-8 on the residue.
decide
  ∷ (Subst → Either Failure Subst)
  → Row
  → Row
  → Exam
  → Residue
  → Either Failure (Step Exam Subst)
decide failed left right exam found =
  if settledResidue found then Right (Done exam.subst)
  else if homeless found then Done <$> homelessReport failed seen found
  else sumRule (solvingWith failed) taken.equation found taken.subst
    >>= summed
  where
  seen = exam
    { seen =
        { mine: Set.union exam.seen.mine (Set.fromFoldable found.mine.metas)
        , theirs: Set.union exam.seen.theirs
            (Set.fromFoldable found.theirs.metas)
        }
    }
  taken = equationOf left right seen
  summed reached
    | changesOf (storeOf reached) /= changesOf (storeOf taken.subst) = Right
        ( Loop seen
            { subst = reached
            , before = exam.subst
            , equation = Just taken.equation
            }
        )
    | otherwise = settle failed left right seen found

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

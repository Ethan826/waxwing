module Features.Check.Homeless (homeless, homelessReport) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set (Set)
import Data.Tuple (Tuple(..))
import Features.Check.Refused (Failed, refusedBy)
import Features.Check.RowResidue
  ( Constant(..)
  , Exam
  , Residue
  , atomOf
  , constants
  )
import Features.Check.RowStore (Bound, Lack)
import Features.Check.RowStoreBound (emptiedOf)
import Features.Check.Subst (Subst, storeOf)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

-- Step 4 (R005 Tranche B design §2.1, rules §4): a constant on one side
-- and no meta on the other. A label is an atom and a rigid denotes
-- itself, so the other side's atoms are fixed and lack it: no solution.
homeless ∷ Residue → Boolean
homeless found = stranded found.mine found.theirs
  || stranded found.theirs found.mine
  where
  stranded own other = not (Array.null (constants own))
    && Array.null other.metas

-- Which refusal it is. If metas of the other side were bound to `{}` by
-- U4 in this examination, the fact that pruned the first constant from
-- one of their bounds, the strongest by the precedence (R10.2: a pruning
-- never turns a written fact's text into a shape text), printed as it was
-- before U4; a constant only their bounds' equations excluded is
-- `Outside` (D6); otherwise the records' mismatch.
homelessReport ∷ Failed → Exam → Residue → Either Failure Subst
homelessReport failed exam found =
  maybe' plainly (explained failed exam bounds) (Array.head stranded)
  where
  mineStranded = Array.null found.theirs.metas
    && not (Array.null (constants found.mine))
  stranded = constants (if mineStranded then found.mine else found.theirs)
  homes = if mineStranded then exam.seen.theirs else exam.seen.mine
  bounds = emptiedBounds exam.subst homes
  plainly _ = failed exam.subst

explained ∷ Failed → Exam → Array Bound → Constant → Either Failure Subst
explained failed exam bounds constant
  | Array.null bounds = failed exam.subst
  | otherwise =
      maybe outside (pruned failed exam.before constant)
        (Array.foldl strongest Nothing (Array.mapMaybe prunedLack bounds))
      where
      atom = atomOf constant
      prunedLack bound = Map.lookup atom bound.pruned
      strongest found next = Just (maybe next (min next) found)
      outside = Left
        (Refused (Outside atom (Array.concatMap _.narrowings bounds)))

pruned ∷ Failed → Subst → Constant → Lack → Either Failure Subst
pruned failed before constant lack = case constant of
  Field label _ → refusedBy failed before Nothing (Tuple label lack)
  RigidTail tail → Left (Refused (Twice tail lack.because))

-- The last bounds of the metas U4 emptied, among these.
emptiedBounds ∷ Subst → Set Int → Array Bound
emptiedBounds subst metas = Array.mapMaybe (emptiedOf (storeOf subst))
  (Array.fromFoldable metas)

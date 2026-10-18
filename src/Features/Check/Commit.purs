module Features.Check.Commit (commit, commitAnyway) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Features.Check.RecordTail (bindTail)
import Features.Check.Refused (Failed)
import Features.Check.RowResidue (Constant(..))
import Features.Check.RowStore (Because, Equation, withBoundBy)
import Features.Check.Subst (Flex(..), Subst(..), onStore)
import Features.Check.RowOutcome (reasonOf)
import Features.Check.UnifyFailure (Failure)

-- A commit (R005 Tranche B design §2.1 step 8, rules §8): a constant
-- with exactly one home `meta` is in it in every solution (homes are
-- complete), so `meta := { c } ⊎ z` with `z` fresh, through the bind
-- rule; given a solution, `z` is the meta's value without `c`, so
-- solutions are kept with the fresh meta accounted for. The binding keeps
-- its equation (`boundBy`, R10.1, read by Task 6's texts).
commit ∷ Failed → Equation → Subst → Int → Constant → Either Failure Subst
commit failed equation subst meta constant =
  onStore (withBoundBy meta equation) <$> placed failed subst meta constant

-- A constant with no home: a meta that might take it would refuse it for
-- a fact, so it is placed in each anyway and the refusal of the fact with
-- the strongest reason is reported (draft 3 step 8; R10.2: never a shape
-- text where a written fact excludes it). Should every placement succeed
-- after all, the records' mismatch stands: homes found none.
commitAnyway
  ∷ Failed → Subst → Array Int → Constant → Either Failure Subst
commitAnyway failed subst metas constant =
  maybe (failed subst) Left
    (Array.foldl strongest Nothing (Array.mapMaybe refusal metas))
  where
  refusal meta = either Just (const Nothing) (placed failed subst meta constant)
  strongest found next = Just (maybe next (preferred next) found)
  preferred next earlier =
    if reasonKey next < reasonKey earlier then next else earlier

placed ∷ Failed → Subst → Int → Constant → Either Failure Subst
placed failed (Subst bindings) meta constant = case constant of
  Field label ty → bindTail failed fresh meta [ Tuple label ty ] remainder
  RigidTail tail → bindTail failed fresh meta [] ([ tail ] <> remainder)
  where
  fresh = Subst bindings { fresh = bindings.fresh - 1 }
  remainder = [ Meta bindings.fresh ]

-- A failure's reason, for choosing between refusals; a refusal without
-- one, or another failure, ranks last.
reasonKey ∷ Failure → Tuple Int (Maybe Because)
reasonKey failure = maybe (Tuple 1 Nothing) (Tuple 0 <<< Just)
  (reasonOf failure)

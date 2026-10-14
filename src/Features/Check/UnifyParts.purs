module Features.Check.UnifyParts
  ( handledMarks
  , unifyClauses
  , sameLength
  , mismatch
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (isNothing, maybe')
import Domain.Row (HandlerRows, Label(..), clauseRow)
import Domain.Type (Ty)
import Features.Check.Binding (exceedsLimit)
import Features.Check.Subst (Flex, Subst, resolve)
import Features.Check.UnifyFailure (Failure(..))
import Features.Check.UnifyMark (equateMarks)
import Features.Check.UnifyRow (ignoringArguments, unifyRows)

-- The handled labels' marks are types' parts and unify by equality; a clash
-- is the handler types differing (P3).
handledMarks
  ∷ Ty Flex
  → Ty Flex
  → Label (Ty Flex)
  → Label (Ty Flex)
  → Subst
  → Either Failure Subst
handledMarks left right (Label _ _ one) (Label _ _ other) subst =
  maybe' refused Right (equateMarks subst one other)
  where
  refused _ = mismatch subst left right

-- C is compared only when a side has one of its own; `Nothing` is R, which
-- was just unified with marks if neither has one (a written type then costs
-- one row, not two).
unifyClauses
  ∷ HandlerRows (Ty Flex) Flex
  → HandlerRows (Ty Flex) Flex
  → Subst
  → Either Failure Subst
unifyClauses left right subst =
  if isNothing left.clauses && isNothing right.clauses then Right subst
  else unifyRows ignoringArguments subst
    (clauseRow left)
    (clauseRow right)

sameLength ∷ ∀ a b. Array a → Array b → Boolean
sameLength one other = Array.length one == Array.length other

-- The differing pair is resolved for the message only when that is safe.
mismatch ∷ Subst → Ty Flex → Ty Flex → Either Failure Subst
mismatch subst left right =
  if exceedsLimit subst left || exceedsLimit subst right then Left TooDeep
  else Left (Mismatch (resolve subst left) (resolve subst right))

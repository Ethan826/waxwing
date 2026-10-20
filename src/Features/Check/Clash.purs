module Features.Check.Clash (clashes) where

import Prelude
import Data.Array as Array
import Data.Tuple (Tuple(..))
import Domain.Type (Ty(..))
import Features.Check.FlatRecord (flatten)
import Features.Check.Subst (Flex(..), Subst, walk)

-- Whether two types established as different under the substitution
-- (D6's field type clash, R005 Tranche B diagnostics R10): two different
-- heads where neither is an unbound meta, or such a pair inside two
-- types of one head. An unbound meta may still become the other type, so
-- it never clashes; nor, conservatively, do handler types or records'
-- labels (only the fields both records hold are compared).
clashes ∷ Subst → Ty Flex → Ty Flex → Boolean
clashes subst one other = case walk subst one, walk subst other of
  TVar (Meta _), _ → false
  _, TVar (Meta _) → false
  TVar left, TVar right → left /= right
  TVar _, _ → true
  _, TVar _ → true
  TInt, TInt → false
  TBool, TBool → false
  TUnit, TUnit → false
  TText, TText → false
  TData left leftArguments _, TData right rightArguments _ → left /= right
    || Array.any pairClashes (Array.zip leftArguments rightArguments)
  TFun leftParameter _ leftResult, TFun rightParameter _ rightResult →
    clashes subst leftParameter rightParameter
      || clashes subst leftResult rightResult
  TRecord left, TRecord right → Array.any (sharedClashes right)
    (flatten subst left).fields
  THandler _ _, THandler _ _ → false
  _, _ → true
  where
  pairClashes (Tuple left right) = clashes subst left right
  sharedClashes right (Tuple label ty) = Array.any (fieldClashes label ty)
    (flatten subst right).fields
  fieldClashes label ty (Tuple name found) = name == label
    && clashes subst ty found

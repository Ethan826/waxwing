module Features.Check.LackOutside (lackedOutside) where

import Data.Either (Either(..))
import Data.Set (Set)
import Features.Check.Lacks (addLacks)
import Features.Check.Narrow (prune)
import Features.Check.RecordTail (solvingWith)
import Features.Check.Subst (Flex(..), Subst)
import Features.Check.UnifyFailure (Failure(..))

-- A lack added outside the row rules (R005 Tranche B Task 5, the user's
-- review of Task 4): Check/Extension makes a spread's unbound tail lack
-- the literal's own labels, as Tranche A did, and since equations wait
-- and bounds persist, that lack must do what the row rules' `requireLack`
-- does on an unbound meta: record the labels (the store wakes the pending
-- equations that read the meta) and prune its upper bound (U2), binding it
-- to `{}` if nothing is left (U4). A rigid has no bound. The tail must be
-- unbound or rigid (the caller walks to it). Binding a meta to `{}`
-- cannot be refused (the empty image has no constant for a lack, a bound
-- or a pair to exclude), so the caller's mismatch is never asked for; if
-- it were, that is a broken invariant, not a program's error.
lackedOutside ∷ Flex → Set String → Subst → Either Failure Subst
lackedOutside tail labels subst = case tail of
  Meta meta → prune solving lacked meta
  Rigid _ → Right lacked
  where
  lacked = addLacks tail labels subst
  solving = solvingWith unrefusable
  unrefusable _ = Left
    (Unexpected "The empty binding of a pruned record tail was refused")

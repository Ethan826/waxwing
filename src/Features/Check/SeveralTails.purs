module Features.Check.SeveralTails (withinOneTail) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Domain.Checked.Internal (Open)
import Domain.Syntax (Diagnostic, Span)
import Domain.Type (Ty(..))
import Features.Check.FlatRecord (flatten)
import Features.Check.Placeholder (placeholderAt)
import Features.Check.Scheme (flexible)
import Features.Check.Subst (Subst)

-- R005 Tranche B Task 2 (user ruling 2026-10-17): a removal or a named
-- rest binder subtracts labels from a row. Over a row of several tails
-- (after their bindings are followed) that subtraction is not yet judged,
-- whether or not anything calls the function, so it is refused at `span`
-- until Task 7. A bare `...` binds nothing and is not asked.
withinOneTail ∷ Span → Subst → Ty Open → Either Diagnostic Unit
withinOneTail span subst ty = case flexible ty of
  TRecord row
    | Array.length (flatten subst row).tails > 1 →
        Left (placeholderAt span wording)
  _ → Right unit

wording ∷ String
wording = "rest binders and removal over several tails are typed in Task 7"

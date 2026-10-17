module Features.Check.Placeholder (placeholderAt, withoutDisjoint) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, Span, problemAt)

-- R005 Tranche B: work a later task does is reported as an E_INTERNAL
-- that starts `R005B placeholder: `, so that `grep -rn "R005B
-- placeholder" src` lists what is left and no source can mistake the
-- gap for an answer. Each task removes the placeholders it replaces.
placeholderAt ∷ Span → String → Diagnostic
placeholderAt span what =
  problemAt (Internal ("R005B placeholder: " <> what)) span

-- A resolved `where r disjoint s` is not seeded until Task 3: seeding it
-- as nothing would accept a call that breaks it (a wrong acceptance).
-- Reported at `span` where a function or a use would seed its clauses.
withoutDisjoint
  ∷ Span → Array Resolved.Requirement → Either Diagnostic Unit
withoutDisjoint span constraints =
  if Array.any isDisjoint constraints then Left
    (placeholderAt span "disjoint constraints are checked in Task 3")
  else Right unit
  where
  isDisjoint = case _ of
    Resolved.Disjoint _ → true
    _ → false

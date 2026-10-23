-- G0, the generic-substitution check (T-R0a §4.2; Task 4.2): trusted,
-- and the only module of Features.Check.Strategy* that mints `Valid`
-- (scripts/structure.mjs). Every diff here needs token review
-- (docs/engineering.md; scripts/trusted-surface.json).
--
-- It checks every `B` atom under the candidate against `D`
-- (Features.Check.Strategy.Atoms), then every `BQ` atom outside
-- §3.2(a)'s open set by the ground rule (Features.Check.Strategy.Asked).
-- The open atoms already block Solved through rule 1, so it neither
-- accepts nor refuses on them. Assurance: `Pending
-- genericSubstitutionSound`, argued as the standard check of a proposed
-- unifier, not proved.
module Features.Check.Strategy.Substitution
  ( checkSubstitution
  , genericSubstitutionSound
  ) where

import Prelude
import Data.Either (Either(..))
import Data.Traversable (traverse_)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Verdict (StatementRef(..))
import Domain.Verdict.Internal (Valid(..))
import Domain.Verdict.Search (CheckRefusal(..))
import Features.Check.Strategy.Asked (requirementUnder)
import Features.Check.Strategy.Atoms (atomUnder, facts)
import Features.Check.Strategy.Candidate (Substitution, generic)

genericSubstitutionSound ∷ StatementRef
genericSubstitutionSound = StatementRef "genericSubstitutionSound"

checkSubstitution
  ∷ RecordedProblem → Substitution → Either CheckRefusal Valid
checkSubstitution problem candidate
  | not (generic problem candidate) = Left NotGeneric
  | otherwise =
      do
        traverse_ (atomUnder (facts problem) candidate) view.b
        traverse_ (requirementUnder problem candidate) view.bq
        Right Valid
      where
      view = fields problem

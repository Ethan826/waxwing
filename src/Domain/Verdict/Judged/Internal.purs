-- trusted surface: every diff needs token review; see docs/engineering.md
-- D1's pairing of a problem with the solution `decide` found for it
-- (docs/plans/r0-generation-continuation.md §6.2; R0 Task 7.1). A
-- `Witness` is keyed by path-relative variables, so a separately passed
-- problem would not tie a solution to it. Only Domain.Verdict.Judged
-- (to re-export the type) and Features.Check.Decide import this module
-- (rule E5); Domain.Verdict.Internal's tokens stay with the trusted
-- checkers, so `decide` gains no way to mint `Valid`.
module Domain.Verdict.Judged.Internal (Judged(..)) where

import Domain.Recorded (RecordedProblem)
import Domain.Verdict (Solution)

newtype Judged = Judged
  { problem ∷ RecordedProblem, solution ∷ Solution }

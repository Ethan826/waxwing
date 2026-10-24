-- trusted surface: every diff needs token review; see docs/engineering.md
-- The type `Judged` without its constructor (§3.1's allowed form) and
-- its two read-only accessors (D1 spec §6.2; R0 Task 7.1).
module Domain.Verdict.Judged
  ( module Exports
  , judgedProblem
  , judgedSolution
  ) where

import Domain.Recorded (RecordedProblem)
import Domain.Verdict (Solution)
import Domain.Verdict.Judged.Internal (Judged) as Exports
import Domain.Verdict.Judged.Internal (Judged(..))

judgedProblem ∷ Judged → RecordedProblem
judgedProblem (Judged judged) = judged.problem

judgedSolution ∷ Judged → Solution
judgedSolution (Judged judged) = judged.solution

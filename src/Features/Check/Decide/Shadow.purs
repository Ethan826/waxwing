-- trusted surface: every diff needs token review; see docs/engineering.md
-- The shadow run's `Checking` (T-R0a §5.3; plan Task 4.5 Step 1; Task
-- 4.3): the one assembly of `decide`'s inputs the shadow harness uses,
-- built once per program. Ruling R6: nothing reachable from compile
-- imports it (test/r0-verdict.test.mjs); Task 4.6 wires it.
--
-- The detector of §3.2(a)'s open atoms is fixed here to
-- Features.Check.Decide.Open's `openRequirements`, not a parameter: G0's
-- check passes over those atoms (Strategy.Substitution), so its `Valid`
-- is sound only where `decide` blocks Solved on them, and no strategy,
-- caller or budget can choose another detector. The strategies are
-- `online` alone, the refuters and shadows none (Task 5.2 adds CX), the
-- rules Task 5.1's registry, and the run ends at its first verdict.
-- `legacyText` renders today's diagnostic for the online search's
-- untrusted hint; the caller injects it (Format renders, Task 4.5).
--
-- `shadowDecisions` runs every declaration: generation, then `decide`.
-- A generation fault is a trusted component's failure (Task 3.2 ruling
-- (2): `TableLookup` or `InputShape`, both stopping under ruling R3), so
-- it is `BrokenInvariant`, never a strategy's failure.
module Features.Check.Decide.Shadow
  ( generationStop
  , shadowChecking
  , shadowDecisions
  ) where

import Prelude
import Data.Either (Either(..), either)
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic)
import Domain.Verdict (Decision, InternalFault(..))
import Domain.Verdict.Search (Budget)
import Features.Check.Decide (Checking, decide, untilVerdict)
import Features.Check.Decide.Open (openRequirements)
import Features.Check.Functional (functional)
import Features.Check.Generate (generate)
import Features.Check.Generate.Fault (GenerationFault, generationProblem)
import Features.Check.Generate.Inputs (generationInputs)
import Features.Check.Refute.Rules (registry)
import Features.Check.Strategy.Online (online)

shadowChecking
  ∷ (Diagnostic → String) → Budget → Resolved.Program → Checking
shadowChecking legacyText budget program =
  { strategies:
      [ online { holders: functional program.ctors, program, legacyText } ]
  , refuters: []
  , shadows: []
  , rules: registry
  , budget
  , openRequirements
  , ends: untilVerdict
  }

shadowDecisions
  ∷ (Diagnostic → String)
  → Budget
  → Resolved.Program
  → Array (Either InternalFault Decision)
shadowDecisions legacyText budget program = map decided program.functions
  where
  checking = shadowChecking legacyText budget program
  inputs = generationInputs program
  decided declaration = either (Left <<< generationStop)
    (decide checking)
    (generate inputs.tables inputs.signatures declaration)

generationStop ∷ GenerationFault → InternalFault
generationStop fault = BrokenInvariant case generationProblem fault of
  Internal _ text → text
  _ → "Generation: a fault with no internal kind"

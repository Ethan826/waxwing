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
-- `online` alone, no trusted refuter, the one shadow refuter CX (Task
-- 5.2: `shadowRefuter cxStatement cxSpec`, whose records never change a
-- verdict, AT17), the rules Task 5.1's registry, and the run ends at its
-- first verdict.
-- `legacyText` renders today's diagnostic for the online search's
-- untrusted hint; the caller injects it (Format renders, Task 4.5).
--
-- `shadowDecisions` runs every declaration: generation, the seal check
-- (Task 7.1b), then `decide`.
-- A generation fault is a trusted component's failure (Task 3.2 ruling
-- (2): `TableLookup` or `InputShape`, both stopping under ruling R3;
-- Task 7.1b's `BinderShape` and `VariableSort` are `InputShape`), so it
-- is `BrokenInvariant`, never a strategy's failure.
module Features.Check.Decide.Shadow
  ( generationStop
  , shadowChecking
  , shadowDecision
  , shadowDecisions
  ) where

import Prelude
import Data.Array (null)
import Data.Either (Either(..), either)
import Domain.Elaborating (Elaborating, problem, untracked)
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic)
import Domain.Verdict (Decision, InternalFault(..))
import Domain.Verdict.Search (Budget)
import Features.Check.Decide (Checking, decide, untilVerdict)
import Features.Check.Decide.Open (openRequirements)
import Features.Check.Decide.Refuters (shadowRefuter)
import Features.Check.Functional (functional)
import Features.Check.Generate
  ( GenerationFault
  , generate
  , generationInputs
  , generationProblem
  )
import Features.Check.Refute.Counter (cxSpec, cxStatement)
import Features.Check.Refute.Rules (registry)
import Features.Check.Strategy.Online (online)

shadowChecking
  ∷ (Diagnostic → String) → Budget → Resolved.Program → Checking
shadowChecking legacyText budget program =
  { strategies:
      [ online { holders: functional program.ctors, program, legacyText } ]
  , refuters: []
  , shadows: [ shadowRefuter cxStatement cxSpec ]
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
shadowDecisions legacyText budget program = map
  (shadowDecision checking (generate inputs.tables inputs.signatures))
  program.functions
  where
  checking = shadowChecking legacyText budget program
  inputs = generationInputs program

-- One declaration: generation, D1's seal check right after it, then
-- `decide` (D1 spec §3.5, §5 layer 2; R0 Task 7.1b). A seal fault is
-- generation's, trusted code's, so it stops the run before `decide`.
-- The generator is injected, so a test can give one that reads outside
-- tracking.
shadowDecision
  ∷ ∀ a
  . Checking
  → (Resolved.FunctionDecl → Either GenerationFault (Elaborating a))
  → Resolved.FunctionDecl
  → Either InternalFault Decision
shadowDecision checking generated declaration =
  either (Left <<< generationStop) sealed (generated declaration)
  where
  sealed elaborating =
    if null (untracked elaborating) then decide checking (problem elaborating)
    else Left (BrokenInvariant "elaboration: the seal check failed")

generationStop ∷ GenerationFault → InternalFault
generationStop fault = BrokenInvariant case generationProblem fault of
  Internal _ text → text
  _ → "Generation: a fault with no internal kind"

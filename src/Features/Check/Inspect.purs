module Features.Check.Inspect (checkedStates, settledAgain) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (maybe')
import Data.Traversable (traverse)
import Domain.Problem (Problem(Internal))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, origin, problemAt)
import Features.Check.Function (environment, recheck)
import Features.Check.Functional (functional)
import Features.Check.Scheme (State)
import Features.Check.Settle (settleRestricted)

-- Test-only, like this module: nothing in the compiler reads either.
--
-- Every function's final checking state, for tests of what checking
-- registered (installations, mark edges).
checkedStates
  ∷ Resolved.Program
  → Either Diagnostic (Array { name ∷ String, state ∷ State })
checkedStates program = traverse stated program.functions
  where
  holders = functional program.ctors
  stated definition = named definition <$> recheck holders program definition
  named definition result = { name: definition.name, state: result.state }

-- The settling loop run once more on a function's final state changed by
-- `change`, to reach the guards a checked program never reaches.
settledAgain
  ∷ Resolved.Program
  → String
  → (State → State)
  → Either Diagnostic State
settledAgain program name change = maybe' missing settled
  (Array.find named program.functions)
  where
  named definition = definition.name == name
  missing _ = Left (problemAt (Internal "No such function") nowhere)
  nowhere = { start: origin, end: origin }
  settled definition = do
    result ← recheck (functional program.ctors) program definition
    settleRestricted (environment program definition) (change result.state)
      result.function.body

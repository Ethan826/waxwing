module Features.Check (check) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), either, hush)
import Data.Maybe (maybe')
import Data.Traversable (traverse)
import Domain.Checked.Internal as Checked
import Domain.Resolved as Resolved
import Domain.Problem (EntryKind(..), Problem(..))
import Domain.Syntax (Diagnostic, origin, problemAt)
import Features.Check.Coverage (coverage)
import Features.Check.Functional (Functional, containsFunction, functional)
import Features.Check.Instantiation (instantiationRule)
import Features.Check.Function (recheck)
import Features.Check.Path (expandPath)
import Features.Check.Strip (stripProgram)

check ∷ Resolved.Program → Either Diagnostic Checked.Program
check program = do
  printableEntry holders program
  functions ← traverse checkDefinition program.functions
  let
    checked = stripProgram
      ( Checked.Program
          { effects: program.effects
          , types: program.types
          , ctors: program.ctors
          , functions
          , entry: program.entry
          }
      )
  -- The instantiation rule needs every body's final types; coverage runs
  -- last, on a program whose specialization is known to be finite.
  instantiationRule checked
  coverage checked
  pure checked
  where
  holders = functional program.ctors
  checkDefinition definition = either explained (Right <<< _.function)
    (rechecked definition)
  rechecked = recheck holders program
  -- A rejection's notes may end in a call: the callee's own check says
  -- where in its body the label arose (design §6).
  explained diagnostic = Left
    (diagnostic { related = expandPath locate diagnostic.related })
  locate name = relocated =<< Array.find (named name) program.functions
  named name definition = definition.name == name
  relocated definition = located definition <$> hush (rechecked definition)
  located definition result =
    { name: definition.name, span: definition.span, state: result.state }

-- `main`'s result is printed, so it may hold no function, directly or
-- through a declared type's fields (FN001 design §3). Resolve has already
-- made it ground; judged before any body, as Resolve judges `main` first.
printableEntry ∷ Functional → Resolved.Program → Either Diagnostic Unit
printableEntry holders program =
  maybe' missing judged (Array.index program.functions (index program.entry))
  where
  index (Resolved.FunctionId entry) = entry
  missing _ = Left (problemAt (Internal "Invalid entry") nowhere)
  nowhere = { start: origin, end: origin }
  judged main =
    if containsFunction holders main.result then Left
      (problemAt (EntryProblem EntryFunction) main.span)
    else Right unit

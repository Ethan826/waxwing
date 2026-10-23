-- The collecting driver (T-R0a §7, G-hide): every declaration is checked
-- whatever happened to the others, and the report keeps each result.
module Features.Check.Outcomes
  ( DeclReport
  , Report
  , Today
  , checkProgram
  ) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either (Either(..), either, hush)
import Data.Maybe (Maybe(..), maybe')
import Domain.Checked.Internal as Checked
import Domain.Problem (EntryKind(..), Problem(..))
import Domain.Recorded (RecordedProblem)
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, origin, problemAt)
import Domain.Verdict (FunctionName(..))
import Features.Check.Coverage (coverage)
import Features.Check.Function (recheck)
import Features.Check.Functional (Functional, containsFunction, functional)
import Features.Check.Instantiation (instantiationRule)
import Features.Check.Path (expandPath)
import Features.Check.Scheme (State)
import Features.Check.Strip (stripProgram)

-- Today's checker result for one body: the shadow phase's legacy slot
-- (ruling R2), until generation and decision replace it (Task 4.6).
type Today =
  Either Diagnostic { function ∷ Checked.FunctionDecl, state ∷ State }

-- `problem` stays Nothing until generation exists (Task 3.x); nothing
-- builds a Decided or Refused outcome from a diagnostic (ruling R2).
type DeclReport =
  { name ∷ FunctionName
  , today ∷ Today
  , problem ∷ Maybe RecordedProblem
  }

-- `program` holds every diagnostic, in order: `main`'s printability
-- (judged before any body, as Resolve judges `main` first), each body's
-- in declaration order, then the program-wide stages, which run only
-- when the entry and every body passed (instantiation rule, then
-- coverage on a program whose specialization is known to be finite).
type Report =
  { entry ∷ Either Diagnostic Unit
  , outcomes ∷ Array DeclReport
  , program ∷ Either (NonEmptyArray Diagnostic) Checked.Program
  }

checkProgram ∷ Resolved.Program → Report
checkProgram program =
  { entry, outcomes, program: staged entry outcomes >>= programWide program }
  where
  holders = functional program.ctors
  entry = printableEntry holders program
  bare = map (declared holders program) program.functions
  outcomes = map (explained bare) bare

-- The diagnostics before the program-wide stages, or every checked body.
staged
  ∷ Either Diagnostic Unit
  → Array DeclReport
  → Either (NonEmptyArray Diagnostic) (Array Checked.FunctionDecl)
staged entry outcomes =
  maybe' passed Left (NonEmptyArray.fromArray found)
  where
  found = Array.mapMaybe leftOf
    (Array.cons (void entry) (map bodyResult outcomes))
  bodyResult outcome = void outcome.today
  passed _ = Right (Array.mapMaybe checkedBody outcomes)
  checkedBody outcome = _.function <$> hush outcome.today
  leftOf = either Just (const Nothing)

programWide
  ∷ Resolved.Program
  → Array Checked.FunctionDecl
  → Either (NonEmptyArray Diagnostic) Checked.Program
programWide program functions =
  either (Left <<< NonEmptyArray.singleton) Right do
    instantiationRule checked
    coverage checked
    pure checked
  where
  checked = stripProgram
    ( Checked.Program
        { effects: program.effects
        , types: program.types
        , ctors: program.ctors
        , functions
        , entry: program.entry
        }
    )

type Declared = { definition ∷ Resolved.FunctionDecl, report ∷ DeclReport }

declared ∷ Functional → Resolved.Program → Resolved.FunctionDecl → Declared
declared holders program definition =
  { definition
  , report:
      { name: FunctionName definition.name
      , today: recheck holders program definition
      , problem: Nothing
      }
  }

-- A rejection's notes may end in a call: the callee's report says where
-- in its body the label arose (design §6).
explained ∷ Array Declared → Declared → DeclReport
explained bare { report } =
  report { today = either relocated Right report.today }
  where
  relocated diagnostic = Left
    (diagnostic { related = expandPath locate diagnostic.related })
  locate name = callee =<< Array.find (named name) bare
  named name entry = entry.definition.name == name
  callee entry = located entry.definition <$> hush entry.report.today
  located definition result =
    { name: definition.name, span: definition.span, state: result.state }

-- `main`'s result is printed, so it may hold no function, directly or
-- through a declared type's fields (FN001 design §3). Resolve has already
-- made it ground.
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

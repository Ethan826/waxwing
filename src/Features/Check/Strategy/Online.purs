-- The online solver as one search strategy (T-R0a §4.2; Task 4.3):
-- today's checker (`recheck`, Features.Check.Function) is the search,
-- G0's guard and check (Task 4.2) judge, and the search's candidate is
-- its answer read back to problem variables (ReadBack). Nothing
-- reachable from compile builds it (ruling R6); Task 4.6 wires it.
--
-- On an accepted body the search gives `Candidate`, claiming what the
-- read-back claims. A refusal gives `NoCandidate`, ended as
-- Online.Ending routes it, with the diagnostic's place as an advisory
-- hint ("the current solver stopped here", never the program's error).
-- A problem the program does not record (no declaration of its id, or
-- one from which generation records another problem) is `Inconsistent`:
-- the injected context disagrees with the problem, which stops the run
-- (ruling R10 (iii)). A read-back failure is the search's
-- own (`Broke`, G-Q13). The online solver's own limits are its budget;
-- the injected `Budget`'s fuel is spent by `strategy` alone.
module Features.Check.Strategy.Online
  ( Certificate
  , OnlineContext
  , online
  , onlineSearch
  , onlineWith
  , searched
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either, either)
import Data.Maybe (Maybe(..), maybe')
import Domain.Checked.Internal as Checked
import Domain.Recorded (RecordedProblem, fields)
import Domain.Resolved (FunctionId(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic)
import Domain.Verdict
  ( Assurance(..)
  , Compilation
  , SearchEnd(..)
  , StrategyName(..)
  , Valid
  )
import Domain.Verdict.Search (Budget, CheckRefusal, SearchHint(..))
import Features.Check.Functional (Functional)
import Features.Check.Generate (generate)
import Features.Check.Generate.Inputs (Inputs, generationInputs)
import Features.Check.Function (recheck)
import Features.Check.Scheme (State)
import Features.Check.Strategy (Search(..), Strategy, strategy)
import Features.Check.Strategy.Candidate (Substitution)
import Features.Check.Strategy.Guard (g0Guard)
import Features.Check.Strategy.Online.Ending (Ending(..), ending)
import Features.Check.Strategy.ReadBack (readBack)
import Features.Check.Strategy.Witness (substitutionWitness)
import Features.Check.Strategy.Substitution
  ( checkSubstitution
  , genericSubstitutionSound
  )

-- What `checkFunction` needs that a recorded problem does not carry.
type OnlineContext = { holders ∷ Functional, program ∷ Resolved.Program }

-- σ, and the checked declaration today's solver built with it: the
-- baseline Task 7.1 compares `build`'s IR against; and the holes σ bound
-- (ReadBack step 4, provisional, pending the author's ambiguity ruling);
-- and σ before that step, which the witness binds (Task 4.4).
type Certificate =
  { substitution ∷ Substitution
  , unsettled ∷ Substitution
  , checked ∷ Checked.FunctionDecl
  , holes ∷ Array Int
  }

type Today =
  Either Diagnostic { function ∷ Checked.FunctionDecl, state ∷ State }

online ∷ OnlineContext → Strategy
online = onlineWith <<< onlineSearch

-- The strategy over a given search: what `online` injects, and what the
-- fault-confinement tests inject in its place.
onlineWith ∷ (Budget → RecordedProblem → Search Certificate) → Strategy
onlineWith search = strategy
  { name: OnlineSolver
  , sound: Pending genericSubstitutionSound
  , guard: g0Guard
  , search
  , check: certified
  , witness: witnessed
  }

onlineSearch ∷ OnlineContext → Budget → RecordedProblem → Search Certificate
onlineSearch context = search
  where
  inputs = generationInputs context.program
  search _ problem = maybe' missing
    (searched problem <<< recheck context.holders context.program)
    (declaration inputs context.program problem)
  missing _ = Inconsistent "the program does not record the problem"

-- Today's result for the problem's declaration, as a search's.
searched ∷ RecordedProblem → Today → Search Certificate
searched problem = either refused accepted
  where
  accepted found = either broke (offered found.function)
    (readBack problem found.function)
  offered checked made = Candidate
    { substitution: made.substitution
    , unsettled: made.unsettled
    , checked
    , holes: made.holes
    }
    made.claim
    []
  broke why = NoCandidate (Broke ("read-back: " <> why)) []

refused ∷ ∀ cert. Diagnostic → Search cert
refused diagnostic = case ending diagnostic.problem of
  Ended end → NoCandidate end [ stoppedHere diagnostic ]
  Stopped what → Inconsistent what

stoppedHere ∷ Diagnostic → SearchHint
stoppedHere diagnostic = SearchHint
  ( "the current solver stopped here: " <> show start.line <> ":"
      <> show start.column
  )
  where
  start = diagnostic.span.start

-- The declaration the problem names, if generation records exactly this
-- problem from it: an id alone would match a declaration of another
-- program (Task 4.3's fault tests found it).
declaration
  ∷ Inputs → Resolved.Program → RecordedProblem → Maybe Resolved.FunctionDecl
declaration inputs program problem =
  Array.index program.functions index >>= recorded
  where
  FunctionId index = (fields problem).decl
  recorded found =
    if either (const false) same (generated found) then Just found
    else Nothing
  -- By the read-only view: the problem's own `Eq` is in
  -- Domain.Recorded.Internal, which no strategy imports.
  same regenerated = fields regenerated == fields problem
  generated = generate inputs.tables inputs.signatures

certified ∷ RecordedProblem → Certificate → Either CheckRefusal Valid
certified problem certificate =
  checkSubstitution problem certificate.substitution

-- G0's adapter over σ before the read-back's hole defaults (Task 4.4),
-- so a defaulted hole is a `Free` binding the hole contract judges.
witnessed ∷ RecordedProblem → Certificate → Compilation
witnessed problem certificate =
  substitutionWitness problem certificate.unsettled

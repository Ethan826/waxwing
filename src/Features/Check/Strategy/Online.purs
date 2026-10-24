-- trusted surface: every diff needs token review; see docs/engineering.md
-- The online solver as one search strategy (T-R0a §4.2; Task 4.3):
-- today's checker (`recheck`, Features.Check.Function) is the search,
-- G0's guard and check (Task 4.2) judge, and the search's candidate is
-- its answer read back to problem variables (ReadBack). Nothing
-- reachable from compile builds it (ruling R6); Task 4.6 wires it.
--
-- On an accepted body the search gives `Candidate`, claiming what the
-- read-back claims. A refusal gives `NoCandidate`, ended as
-- Online.Ending routes it, with today's text and place as an untrusted
-- search hint: the legacy solver's reason for stopping, never evidence
-- of a contradiction (Task 4.5 fix round, the author's ruling R-b3).
-- The text is rendered by the injected `legacyText` (Format renders;
-- Features does not import it).
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
import Domain.Elaborating as Elaborating
import Domain.Recorded (RecordedProblem, fields)
import Domain.Resolved (FunctionId(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic)
import Domain.Verdict (Assurance(..), SearchEnd(..), StrategyName(..))
import Domain.Verdict.Certified (Certified)
import Domain.Verdict.Search (Budget, CheckRefusal, SearchHint(..))
import Features.Check.Functional (Functional)
import Features.Check.Generate (Inputs, generate, generationInputs)
import Features.Check.Function (recheck)
import Features.Check.Scheme (State)
import Features.Check.Strategy (Search(..), Strategy, strategy)
import Features.Check.Strategy.Candidate (Substitution)
import Features.Check.Strategy.Guard (g0Guard)
import Features.Check.Strategy.Online.Ending (Ending(..), ending)
import Features.Check.Strategy.ReadBack (readBack)
import Features.Check.Strategy.Substitution
  ( certify
  , genericSubstitutionSound
  )

-- What `checkFunction` needs that a recorded problem does not carry,
-- and the renderer of today's diagnostic text for the hint.
type OnlineContext =
  { holders ∷ Functional
  , program ∷ Resolved.Program
  , legacyText ∷ Diagnostic → String
  }

-- σ before ReadBack's step 4 (its holes still `holeVar n`), which the
-- check settles and judges and the witness binds (`certify`; BACKLOG
-- R026: the certificate carries no separately settled σ); the checked
-- declaration today's solver built, the baseline Task 7.1 compares
-- `build`'s IR against; and the holes step 4 binds (provisional,
-- pending the author's ambiguity ruling), reported for RT8 only.
type Certificate =
  { unsettled ∷ Substitution
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
  }

onlineSearch ∷ OnlineContext → Budget → RecordedProblem → Search Certificate
onlineSearch context = search
  where
  inputs = generationInputs context.program
  search _ problem = maybe' missing
    ( searched context.legacyText problem
        <<< recheck context.holders context.program
    )
    (declaration inputs context.program problem)
  missing _ = Inconsistent "the program does not record the problem"

-- Today's result for the problem's declaration, as a search's.
searched
  ∷ (Diagnostic → String) → RecordedProblem → Today → Search Certificate
searched legacyText problem = either (refused legacyText) accepted
  where
  accepted found = either broke (offered found.function)
    (readBack problem found.function)
  offered checked made = Candidate
    { unsettled: made.unsettled
    , checked
    , holes: made.holes
    }
    made.claim
    []
  broke why = NoCandidate (Broke ("read-back: " <> why)) []

refused ∷ ∀ cert. (Diagnostic → String) → Diagnostic → Search cert
refused legacyText diagnostic = case ending diagnostic.problem of
  Ended end → NoCandidate end [ stoppedHere legacyText diagnostic ]
  Stopped what → Inconsistent what

stoppedHere ∷ (Diagnostic → String) → Diagnostic → SearchHint
stoppedHere legacyText diagnostic = SearchHint
  ( "untrusted search hint: the legacy solver stopped at "
      <> show start.line
      <> ":"
      <> show start.column
      <> ", reporting \""
      <> legacyText diagnostic
      <> "\" (its reason for stopping, never evidence of a contradiction)"
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
  same regenerated = fields (Elaborating.problem regenerated) == fields problem
  generated = generate inputs.tables inputs.signatures

certified ∷ RecordedProblem → Certificate → Either CheckRefusal Certified
certified problem certificate = certify problem certificate.unsettled

-- trusted surface: every diff needs token review; see docs/engineering.md
-- `decide` (T-R0a §5.3; Task 4.1): one declaration's verdict from its
-- recorded problem and the injected `Checking`. It runs beside today's
-- path in tests only: nothing reachable from compile builds a `Checking`
-- (ruling R6), and Task 4.6 is the switch.
--
-- Rule 1's inputs are the `outside` markers, a second spread (rule 1′)
-- and §3.2(a)'s open `BQ` atoms, read by the injected
-- `openRequirements` (Task 4.2's detector; a stub until it lands). Its
-- erased-row input follows the author's ruling of 2026-10-23
-- (docs/plans/r0-erased-rows.md §7.1): the `ErasedRow` marker and the
-- `EffectsUnchecked` reason join rule 1 with the task that builds them.
--
-- Order independence (§5.3 "Order"). These conditions are met by
-- construction; they are conditions, not a general promise:
-- - fuel is per strategy and per refuter: each receives the whole
--   `Budget`, which has no shared bound;
-- - refuters run only when no strategy gave Solved, so every strategy
--   has run, and they receive the hints as a set, sorted canonically;
-- - each refuter's search is monotone in its hint set: the unseeded
--   search and each hint get their own run and fuel
--   (Features.Check.Decide.Refuters);
-- - attempts share no mutable state: each is a pure function of
--   `(Budget, RecordedProblem)`.
module Features.Check.Decide
  ( Checking
  , Progress
  , decide
  , untilVerdict
  ) where

import Prelude
import Data.Array (length, nub, null, snoc)
import Data.Array.NonEmpty (toArray)
import Data.Either (Either(..), either)
import Data.Foldable (foldM)
import Data.Maybe (Maybe(..), isJust, maybe, maybe')
import Domain.Recorded (RecordedProblem)
import Domain.Recorded.Atom (ReqAtom)
import Domain.Recorded.Origin (Entry)
import Domain.Verdict
  ( Attempt(..)
  , Decision
  , Evidence(..)
  , InternalFault(..)
  , RuleName(..)
  , Solution
  , Unsupport
  , Verdict(..)
  )
import Domain.Verdict.Search (Budget, SearchHint)
import Features.Check.Decide.Reason (blocks, reason, searchFaults)
import Features.Check.Decide.Refuters
  ( ShadowRefuter
  , canonical
  , refute
  , shadowRecord
  )
import Features.Check.Refute.Rules
  ( Refuter
  , SoundRule
  , checkDerivation
  , refuterParts
  , ruleDerivation
  , ruleName
  )
import Features.Check.Strategy (Ran, Strategy, runStrategy)

-- T-R0a's five fields, and two injected implementations: §3.2(a)'s
-- detector, and `ends`, when the run stops early. Production injects
-- `untilVerdict`; rule 5's test-only value never ends early, so it runs
-- every strategy and refuter and reports `BothVerdicts` if both succeed.
type Checking =
  { strategies ∷ Array Strategy
  , refuters ∷ Array Refuter
  , shadows ∷ Array ShadowRefuter
  , rules ∷ Array SoundRule
  , budget ∷ Budget
  , openRequirements ∷ RecordedProblem → Array (Entry ReqAtom)
  , ends ∷ Progress → Boolean
  }

type Progress = { blocked ∷ Boolean, solved ∷ Boolean, refuted ∷ Boolean }

-- What the run has gathered: the first solution and the first evidence.
type Run =
  { attempts ∷ Array Attempt
  , hints ∷ Array SearchHint
  , solution ∷ Maybe Solution
  , evidence ∷ Maybe Evidence
  }

-- Rule 2: the first acceptance or contradiction ends the run, unless
-- rule 1 or 1′ blocks Solved, when every rule, strategy and refuter runs.
untilVerdict ∷ Progress → Boolean
untilVerdict progress =
  not progress.blocked && (progress.solved || progress.refuted)

-- Rule 2's order: rules, strategies, trusted refuters seeded with the
-- strategies' hints, then shadows, which add records and nothing else.
decide ∷ Checking → RecordedProblem → Either InternalFault Decision
decide checking problem = do
  distinctRules checking.rules
  ran ← foldM (gated checking blocked) start (steps checking problem)
  map (decision ran) (verdictOf blocked ran)
  where
  blocked = blocks (checking.openRequirements problem) problem
  start = { attempts: [], hints: [], solution: Nothing, evidence: Nothing }
  decision ran verdict =
    { verdict
    , attempts: ran.attempts <> map (shadowed ran) checking.shadows
    , searchFaults: searchFaults ran.attempts
    }
  shadowed ran = Shadow <<< shadowRecord checking.budget ran.hints problem

type Step = Run → Either InternalFault Run

steps ∷ Checking → RecordedProblem → Array Step
steps checking problem =
  map (ruleStep checking.rules problem) checking.rules
    <> map (strategyStep checking.budget problem) checking.strategies
    <> map (refuterStep checking.budget problem) checking.refuters

gated ∷ Checking → Array Unsupport → Run → Step → Either InternalFault Run
gated checking blocked ran step =
  if checking.ends progress then Right ran else step ran
  where
  progress =
    { blocked: not (null blocked)
    , solved: isJust ran.solution
    , refuted: isJust ran.evidence
    }

-- A registered rule's derivation that `checkDerivation` refuses is a
-- trusted-component failure: it stops the run (§5.2, Q13).
ruleStep ∷ Array SoundRule → RecordedProblem → SoundRule → Step
ruleStep rules problem rule ran =
  maybe (Right ran) checked (ruleDerivation problem rule)
  where
  checked derivation = either (Left <<< DerivationRefused derivation.rule)
    (Right <<< contradicted ran)
    (checkDerivation rules problem derivation)

strategyStep ∷ Budget → RecordedProblem → Strategy → Step
strategyStep budget problem strategy ran =
  map (ranInto ran) (runStrategy budget problem strategy)

ranInto ∷ Run → Ran → Run
ranInto ran one = ran
  { attempts = snoc ran.attempts one.attempt
  , hints = ran.hints <> one.hints
  , solution = maybe' (const one.solution) Just ran.solution
  }

refuterStep ∷ Budget → RecordedProblem → Refuter → Step
refuterStep budget problem refuter ran =
  Right (either ended (contradicted ran <<< ByCounterInstance) found)
  where
  found = refute budget (canonical ran.hints) problem refuter
  ended end = ran
    { attempts = snoc ran.attempts
        (RefuterEnded (refuterParts refuter).name end)
    }

-- The first evidence is kept. A rule's blame is its premises' sites,
-- whatever the rule said: a culprit is named only with its evidence.
contradicted ∷ Run → Evidence → Run
contradicted ran evidence =
  ran { evidence = maybe' (const (Just (blamed evidence))) Just ran.evidence }

blamed ∷ Evidence → Evidence
blamed = case _ of
  ByRule derivation → ByRule derivation
    { blame = nub (map _.path (toArray derivation.premises)) }
  ByCounterInstance refuted → ByCounterInstance refuted

-- Rules 3 and 4.
verdictOf ∷ Array Unsupport → Run → Either InternalFault Verdict
verdictOf blocked ran =
  maybe' (const (Right unaccepted)) accepted ran.solution
  where
  accepted solution = maybe' (const (Right (solvedUnlessBlocked solution)))
    (Left <<< BothVerdicts solution.strategy)
    ran.evidence
  solvedUnlessBlocked solution =
    if null blocked then Solved solution else unresolved
  unaccepted = maybe' (const unresolved) Contradiction ran.evidence
  unresolved = Unresolved
    { reason: reason blocked ran.attempts, hints: canonical ran.hints }

-- `checkDerivation` finds a rule by name in `Checking.rules`; two rules
-- of one name would let one's derivation be checked by the other.
distinctRules ∷ Array SoundRule → Either InternalFault Unit
distinctRules rules =
  if length (nub names) == length names then Right unit
  else Left (BrokenInvariant "Checking.rules names a rule twice")
  where
  names = map (text <<< ruleName) rules
  text (RuleName name) = name

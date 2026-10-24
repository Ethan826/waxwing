-- D1's `elaborate` (docs/plans/r0-generation-continuation.md §3.5, §7,
-- §8; R0 Task 7.1a): the only caller of `build` (rule E1). Its steps run
-- in order, each a named arm:
-- 1. a seal fault: `Broken` (§5 layer 2);
-- 2. a solution judged for another problem: `Broken` (§6.2), compared
--    field by field (the read-only view, ruling R4: the problem's own
--    `Eq` instance lives in Domain.Recorded.Internal, a token module
--    whose compiled JS only its allowed importers may import);
-- 3. a `Recon` variable `build` reads: `Broken` (§7); it needs no
--    witness, so it runs before the witness steps;
-- 4. `NoWitness r`: `NotCompiled r`;
-- 5. a `Named` binding: none exists until Task 6.1 (Task 4.4's witness
--    has no `Named` constructor and an uninhabited `NameEntry`), so the
--    step has no arm; §8.3's `AdapterUnsupported NameMarker` joins with
--    the constructor;
-- 6. Task 4.4's `coverage` over `covDomain` refusing: `NotCompiled`;
-- 7. `build`: `Elaborated`, or `Broken` for every `ElabFault` (§8.2:
--    `build` is inside the lowering trust boundary, so a fault stops
--    the run; one arm per constructor, no catch-all).
-- Shadow only: nothing reachable from compile calls it (ruling R6).
module Features.Check.Elaborate
  ( Elaboration(..)
  , covDomain
  , elaborate
  ) where

import Prelude
import Data.Array (null)
import Data.Either (Either(..), either)
import Data.Set (Set)
import Data.Set as Set
import Domain.Elaborating (Elaborating, problem, requests, untracked)
import Domain.Elaborating.Build (build)
import Domain.Elaborating.Types (ElabFault(..))
-- Qualified for `Unbound`, also a placed `Problem` constructor's name
-- (test/r0-static-problem.test.mjs reads unqualified names).
import Domain.Elaborating.Types as Fault
import Domain.Recorded (fields)
import Domain.Recorded.Atom (Var)
import Domain.Verdict
  ( Compilation(..)
  , InternalFault(..)
  , NoWitnessReason
  )
import Domain.Verdict.Judged (Judged, judgedProblem, judgedSolution)
import Domain.Verdict.Witness (Witness)
import Features.Check.Strategy.Witness (coverage, flexDomain)

data Elaboration a
  = Elaborated a
  | NotCompiled NoWitnessReason
  | Broken InternalFault

-- W §4's domain: every flexible variable outside `Recon` (empty until
-- G-Recon), which holds every requested one, since `requests e ⊆
-- flex(P)` (Mint). A `Recon` that holds a requested variable breaks W
-- §1.6's premise, so it is a fault, not repaired (§7).
covDomain ∷ ∀ a. Set Var → Elaborating a → Either InternalFault (Set Var)
covDomain recon elaborating
  | Set.isEmpty (Set.intersection recon (requests elaborating)) =
      Right (Set.difference (flexDomain (problem elaborating)) recon)
  | otherwise =
      Left (BrokenInvariant "elaboration: a Recon variable is read")

elaborate ∷ ∀ a. Set Var → Elaborating a → Judged → Elaboration a
elaborate recon elaborating judged
  | not (null (untracked elaborating)) =
      Broken (BrokenInvariant "elaboration: the seal check failed")
  | fields (judgedProblem judged) /= fields (problem elaborating) =
      Broken (BrokenInvariant "elaboration: problem mismatch")
  | otherwise = either Broken (witnessed elaborating judged)
      (covDomain recon elaborating)

witnessed ∷ ∀ a. Elaborating a → Judged → Set Var → Elaboration a
witnessed elaborating judged domain =
  case (judgedSolution judged).compilation of
    NoWitness reason → NotCompiled reason
    Witnessed witness → either NotCompiled (built elaborating witness)
      (coverage domain (problem elaborating) witness)

-- Called only once coverage has passed, so `build` never runs on a
-- witness Cov refused (PureScript is strict: an argument would run).
built ∷ ∀ a. Elaborating a → Witness → Unit → Elaboration a
built elaborating witness _ =
  either (Broken <<< BrokenInvariant <<< faultText) Elaborated
    (build elaborating witness)

faultText ∷ ElabFault → String
faultText = case _ of
  Fault.Unbound _ → "elaboration: build read an unbound variable"
  SortMismatch _ → "elaboration: a row variable bound to a non-record"
  NamedUnread _ → "elaboration: build read a Named binding"
  DuplicateLabel _ _ → "elaboration: a spliced row repeats a label"
  ImageVariable _ _ → "elaboration: an image mentions a problem variable"

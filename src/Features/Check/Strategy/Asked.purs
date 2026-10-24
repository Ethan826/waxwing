-- trusted surface: every diff needs token review; see docs/engineering.md
-- G0's judgement of one `BQ` atom under a candidate (Task 4.2), by the
-- ground rule (Features.Check.GroundRule). The atoms of §3.2(a)'s open
-- set are passed over: rule 1 blocks on them already. Under the
-- candidate a variable that remains is judged as follows:
-- - a rigid one under `cmp` is `Open` (its value at θR's fresh bases
--   waits on G-ValidR's κ policy), so the refusal is `RequirementOpen`,
--   classed with §3.2(a) and read by rule 3 as a decline;
-- - a rigid one under `pr` is `Unjudged`: Pr-1 makes it printable, but
--   G0 has no rule for it (§3.2(b)), and its guard declines such atoms;
-- - a flexible one the candidate leaves unbound is `Unjudged`.
-- An `Unjudged` atom is the `RequirementUnjudged` backstop: the guard
-- admitted what the check cannot judge (Task 4.3's RT8 counts it).
module Features.Check.Strategy.Asked (requirementUnder) where

import Prelude
import Data.Either (Either(..))
import Domain.Recorded (AtomId, RecordedProblem, fields)
import Domain.Recorded.Atom (ReqAtom(..), Var)
import Domain.Recorded.Origin (Entry)
import Domain.Verdict.Search (CheckRefusal(..))
import Features.Check.Decide.Open (openAtom)
import Features.Check.GroundRule (Judgement(..), View, atomType, judge)
import Features.Check.Mentions (isRigid)
import Features.Check.Strategy.Candidate (Substitution, under)

requirementUnder
  ∷ RecordedProblem
  → Substitution
  → Entry ReqAtom
  → Either CheckRefusal Unit
requirementUnder problem candidate = judged
  where
  holders = (fields problem).holders
  isOpen = openAtom problem
  judged entry
    | isOpen entry.value = Right unit
    | otherwise = refusal entry.origin.atom
        (judge holders (candidateView entry.value) (typeUnder entry))
  typeUnder entry = under candidate (atomType entry.value)

refusal ∷ AtomId → Judgement → Either CheckRefusal Unit
refusal id = case _ of
  Holds → Right unit
  Unjudged → Left (RequirementUnjudged id)
  Open → Left (RequirementOpen id)
  Fails → Left (RequirementFails id)

candidateView ∷ ReqAtom → View
candidateView = case _ of
  Printable _ → const Unjudged
  Comparable _ → rigidOpen

rigidOpen ∷ Var → Judgement
rigidOpen variable = if isRigid variable then Open else Unjudged

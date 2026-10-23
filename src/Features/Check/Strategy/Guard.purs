-- G0's guard, §3.2(b) (Task 4.2; plan G-A-i(f), revised for §18.70): a
-- complete requirement G0 cannot discharge is a decline of the
-- strategies whose check is G0, never a global block; `decide` never
-- reads this guard. An atom of §3.2(a)'s open set is left to rule 1, so
-- no atom is in both detectors.
--
-- It declines when some `BQ` atom outside the open set is not ground
-- after reduction through entailed equalities and mentions a rigid
-- variable, or lies outside the unitary fragment and is not ground.
-- After a unification failure there is no reduced type, so it reads the
-- atom as recorded (docs/plans/r0-entailed-ground.md §2, "Answer").
module Features.Check.Strategy.Guard (g0Guard) where

import Prelude
import Data.Array (any)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (RTExpr, ReqAtom)
import Domain.Verdict (Unsupport(..))
import Features.Check.Decide.Open (openAtom)
import Features.Check.Entailed (Reduction(..), reduction)
import Features.Check.Functional (Functional)
import Features.Check.GroundRule (atomType)
import Features.Check.Mentions (isGround, isRigid, mentions)
import Features.Check.Strategy (Guarded(..))

g0Guard ∷ Functional → RecordedProblem → Guarded
g0Guard holders problem =
  if any beyond (map _.value (fields problem).bq) then
    OutOfScope RequirementAtoms
  else InScope
  where
  reduce = reduction problem
  isOpen = openAtom holders problem
  beyond atom = not (isOpen atom) && unjudgeable reduce atom

unjudgeable ∷ (RTExpr → Reduction) → ReqAtom → Boolean
unjudgeable reduce atom = case reduce recorded of
  Reduced ty → rigidAndOpen ty
  NoUnifier → rigidAndOpen recorded
  OutsideFragment → not (isGround recorded)
  where
  recorded = atomType atom
  rigidAndOpen ty = not (isGround ty) && mentions isRigid ty

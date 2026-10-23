-- T-R0b Sig1, §5.1: the declaration's rigid (∀) variables, its `VarId`s
-- of sort type or record row; effect rows are erased. Each is at
-- `parameters/variables/i` with the declaration's span (docs/findings.md
-- "RT1's translator", readings 2 and 14), positioned at its checked
-- `Rigid i` (§5.2).
module Features.Check.Generate.Rigid (rigidVariables) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom (CheckedName(..), Quant(..), Var(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..), RuleId(..), Step(..))
import Domain.Resolved (FunctionDecl, VarId(..))
import Features.Check.Generate.Fresh (sortVar)
import Features.Check.Generate.Out (Out, varsOut)

rigidVariables ∷ FunctionDecl → Out
rigidVariables function = varsOut
  (Array.catMaybes (Array.mapWithIndex rigid function.sorts))
  where
  rigid index sort = map (entry index) (sortVar sort)
  entry index sort = Tuple (RigidVar (VarId index))
    { sort
    , quant: Forall (VarId index)
    , origin:
        { path: Path
            { root: InParameters
            , steps: [ Named "variables", Index index ]
            }
        , role: Nothing
        , rule: SigRule 1
        , span: function.span
        }
    , position: RigidName (VarId index)
    }

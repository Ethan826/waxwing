module Features.Check.Strip (stripProgram) where

import Prelude
import Domain.Checked.Internal as Checked
import Domain.Resolved (CtorInfo, EffectInfo, OperationInfo)
import Domain.Type.Marks (stripMarks, stripRowMarks)
import Features.Check.Walk (retype)

-- Marks are checking's alone (design §3.3, P4): no mark and no clause row
-- C reaches specialization. Every type in the function declarations, in
-- bodies and the effect, type and constructor tables is stripped, so
-- specialization keys never split on marks.
stripProgram ∷ Checked.Program → Checked.Program
stripProgram (Checked.Program program) = Checked.Program
  program
    { effects = map effect program.effects
    , ctors = map constructor program.ctors
    , functions = map function program.functions
    }
  where
  effect ∷ EffectInfo → EffectInfo
  effect info = info { operations = map operation info.operations }

  operation ∷ OperationInfo → OperationInfo
  operation info = info
    { parameters = map parameter info.parameters
    , result = stripMarks info.result
    }
  parameter declared = declared { ty = stripMarks declared.ty }

  constructor ∷ CtorInfo → CtorInfo
  constructor info = info { fields = map stripMarks info.fields }
  function declared = declared
    { parameters = map stripMarks declared.parameters
    , result = stripMarks declared.result
    , row = stripRowMarks declared.row
    , body = retype stripMarks declared.body
    }

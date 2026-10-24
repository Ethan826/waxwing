-- An arrow spine's stages, each parameter with its effect row, and its
-- result (R0 Task 7.1a, for `elabTy`): taken apart by a loop and put
-- back by Array.foldr, so a declaration of thousands of parameters does
-- not recurse along its spine (Domain.Type.Core's note on spines).
module Features.Check.Generate.Elab.Stages
  ( Stages
  , arrowed
  , stagesOf
  ) where

import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (foldr, snoc)
import Data.Tuple (Tuple(..))
import Domain.Type (Ty(..), TyRow)

type Stages v = { stages ∷ Array (Tuple (Ty v) (TyRow v)), result ∷ Ty v }

-- An arrow spine's parameters with their rows, by a loop.
stagesOf ∷ ∀ v. Ty v → Stages v
stagesOf ty = tailRec step { stages: [], result: ty }
  where
  step found = case found.result of
    TFun parameter row rest → Loop
      { stages: snoc found.stages (Tuple parameter row), result: rest }
    _ → Done found

arrowed ∷ ∀ v. Array (Tuple (Ty v) (TyRow v)) → Ty v → Ty v
arrowed stages result = foldr stage result stages
  where
  stage (Tuple parameter row) rest = TFun parameter row rest

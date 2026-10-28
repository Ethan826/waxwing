-- trusted surface: every diff needs token review; see docs/engineering.md
-- What the declaration itself records in `effects` (a-min §10; BACKLOG
-- R032), split from Generate.Signature: its rigid marks and effect-row
-- variables, and its own signature, marked as declared (Generate.Marked
-- `Declared`: rigid variables, marks as written). The signature is one
-- item per declaration, `SignatureAt` at the result root `InResult` with
-- no steps (the path Sig10 uses), so a second one is a duplicate write.
-- Declared naming mints nothing (no `EffFresh`, no position).
module Features.Check.Generate.Declared
  ( declaredSignature
  , rigidEffects
  , signatureItems
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..))
import Data.Traversable (traverse)
import Domain.Recorded.Effect (InstanceSig, MTy(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Resolved (FunctionDecl, VarId(..))
import Domain.Syntax (Sort(..))
import Domain.Type (Ty(..)) as Type
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Inputs (Tables)
import Features.Check.Generate.Marked (MarkNaming(..), marked)
import Features.Check.Generate.Out (EffectItem(..))

-- The declaration's rigid marks (its `nofail(k)` names) and effect-row
-- variables, once each (a-min §10 `rigidMarks`, `effectRigids`).
rigidEffects ∷ FunctionDecl → Array EffectItem
rigidEffects function = map RigidMark (Array.nub function.markVariables)
  <> Array.catMaybes (Array.mapWithIndex effectRow function.sorts)
  where
  effectRow index = case _ of
    RowSort → Just (EffectRigid (VarId index))
    _ → Nothing

-- The declaration's parameters, own row and result, marked as declared.
-- The row is marked as the one stage of `Unit → Unit`, as Generate.Callee
-- `atUse` reads a callee's; any other shape is `MarkShape`.
declaredSignature
  ∷ Tables → FunctionDecl → Either GenerationFault InstanceSig
declaredSignature tables function =
  { parameters: _, row: _, result: _ }
    <$> traverse (markedOf <<< _.ty) function.parameters
    <*> (rowOf =<< markedOf (Type.TFun Type.TUnit function.row Type.TUnit))
    <*> markedOf function.result
  where
  markedOf = marked tables Declared
  rowOf = case _ of
    MArrow _ found _ → Right found
    _ → Left MarkShape

signatureItems
  ∷ Tables → FunctionDecl → Either GenerationFault (Array EffectItem)
signatureItems tables function = Array.singleton <<< SignatureAt root
  <$> declaredSignature tables function
  where
  root = Path { root: InResult, steps: [] }

-- A use's recorded instance signature laid over the live type at its
-- node (tranche 2 read-back design §C.1; the inventory's
-- research/t2-read-back-inventory/sources.mjs `instance`): at a
-- reference (`FunctionRef`, `CtorRef`, `OperationRef`), the reference's
-- arrow type, parameter by parameter, then its row and result; at any
-- other node only the result, after exactly the arrows a call missing
-- arguments still has (a call, construction or perform given k of its n
-- parameters, also a pipe's right side, is typed by the n - k arrows
-- left, then the result, which may itself be an arrow;
-- Generate/Call.purs `applied`). An over-applied call's instance is its
-- saturated callee's, whose type is the result. Untrusted search: a
-- shape that differs gives no value.
module Features.Check.Strategy.ReadBack.Instances (instanceFacts) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Effect (InstanceSig)
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Type (Ty(..))
import Features.Check.Strategy.ReadBack.EffectMatch (Fact, matchRow, matchTy)
import Features.Check.Strategy.ReadBack.Walk (Node(..), nodeAt)

type Walked = { at ∷ Ty Open, facts ∷ Array Fact, stopped ∷ Boolean }

instanceFacts ∷ Checked.Expr → Tuple Path InstanceSig → Array Fact
instanceFacts body (Tuple (Path path) sig) = case path.root of
  InBody → maybe [] atNode (nodeAt (AtExpr body) path.steps)
  _ → []
  where
  atNode = case _ of
    AtExpr (Checked.Expr expr) → atExpr expr.node expr.ty
    AtPattern (Checked.Pattern pattern) → results sig 0 pattern.ty
  atExpr node ty = case node of
    Checked.FunctionRef _ _ → staged sig ty
    Checked.CtorRef _ _ → staged sig ty
    Checked.OperationRef _ _ _ → staged sig ty
    Checked.Call _ _ arguments → results sig (missing arguments) ty
    Checked.Construct _ _ arguments → results sig (missing arguments) ty
    Checked.Perform _ _ _ arguments → results sig (missing arguments) ty
    Checked.Apply callee _ → results sig 0 (Checked.typeOf callee)
    _ → results sig 0 ty
  missing arguments = max 0
    (Array.length sig.parameters - Array.length arguments)

-- The result, after exactly `count` arrows; fewer arrows give no value.
results ∷ InstanceSig → Int → Ty Open → Array Fact
results sig count ty = maybe [] (matchTy sig.result) (afterArrows count ty)

afterArrows ∷ Int → Ty Open → Maybe (Ty Open)
afterArrows count ty = tailRec step { count, at: ty }
  where
  step found
    | found.count <= 0 = Done (Just found.at)
    | otherwise = case found.at of
        TFun _ _ result → Loop { count: found.count - 1, at: result }
        _ → Done Nothing

-- Parameter by parameter along the arrow, then its row and result.
staged ∷ InstanceSig → Ty Open → Array Fact
staged sig ty = case walked.stopped, walked.at of
  false, TFun _ row result → walked.facts <> matchRow sig.row row
    <> matchTy sig.result result
  _, _ → walked.facts
  where
  count = Array.length sig.parameters
  walked = Array.foldl parameter { at: ty, facts: [], stopped: false }
    (Array.mapWithIndex Tuple sig.parameters)
  parameter found (Tuple index recorded) = case found.stopped, found.at of
    false, TFun live _ result → found
      { at = if index < count - 1 then result else found.at
      , facts = found.facts <> matchTy recorded live
      }
    _, _ → found { stopped = true }


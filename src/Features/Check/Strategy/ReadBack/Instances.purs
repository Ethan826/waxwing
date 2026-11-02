-- A use's recorded instance signature laid over the live type at its
-- node (tranche 2 read-back design §C.1; the inventory's
-- research/t2-read-back-inventory/sources.mjs `instance`): at a
-- reference (`FunctionRef`, `CtorRef`, `OperationRef`), the reference's
-- arrow type, parameter by parameter, then its row and result; at any
-- other node only the result, after the arrows a call missing arguments
-- still has (a pipe's left side, a partial construction). An
-- over-applied call's instance is its saturated callee's. Untrusted
-- search: a shape that differs gives no value.
module Features.Check.Strategy.ReadBack.Instances (instanceFacts) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Effect (InstanceSig, MTy(..))
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
    AtPattern (Checked.Pattern pattern) → results sig pattern.ty
  atExpr node ty = case node of
    Checked.FunctionRef _ _ → staged sig ty
    Checked.CtorRef _ _ → staged sig ty
    Checked.OperationRef _ _ _ → staged sig ty
    Checked.Apply callee _ → results sig (Checked.typeOf callee)
    _ → results sig ty

-- The result, after every arrow unless the recorded result is one.
results ∷ InstanceSig → Ty Open → Array Fact
results sig ty = case sig.result of
  MArrow _ _ _ → matchTy sig.result ty
  _ → matchTy sig.result (tailRec step ty)
  where
  step = case _ of
    TFun _ _ result → Loop result
    other → Done other

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


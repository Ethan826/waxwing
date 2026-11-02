-- The recorded mark positions that some `Fail` or Console label refers
-- to (tranche 2 Task 9; ruling on Task 9's report): statements §2 makes
-- every such label N, so readMarks refuses a term other than N at these
-- positions rather than forcing N. Corpus-observed, one declaration has
-- one: test/fx008-probes/rev6/con2.wxw#f, a `with` installing a Console
-- handler, whose `Frame p` sits on the Console label of the body's
-- ambient row and its consumption. Every marked type and row the
-- problem records is scanned: the tables and the obligations.
-- Untrusted search.
module Features.Check.Strategy.ReadBack.MarkLabels (fixedNPositions) where

import Prelude
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Recorded.Effect
  ( EffectProblem
  , InstanceSig
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Obligation(..)
  , Position
  )
import Domain.Row (EffectRef(..))

fixedNPositions ∷ EffectProblem → Set Position
fixedNPositions effects = Set.fromFoldable
  ( Array.concatMap inTy (values effects.nodes)
      <> Array.concatMap inTy (values effects.annotations)
      <> Array.concatMap inSig (values effects.instances)
      <> Array.concatMap inRow (values effects.ambient)
      <> inSig effects.signature
      <> Array.concatMap (inObligation <<< _.value) effects.obligations
  )

values ∷ ∀ k v. Map k v → Array v
values = Array.fromFoldable <<< Map.values

inObligation ∷ Obligation → Array Position
inObligation = case _ of
  Equal one other → inTy one <> inTy other
  Consume consumed → inRow consumed.source <> inRow consumed.target
  Install installed → inTy installed.handler <> inRow installed.ambient
  Defer deferred → inRow deferred.enclosing
  Entry row → inRow row
  FailConcrete ty → inTy ty
  HandlerLit _ → []
  Unsupported _ → []

inSig ∷ InstanceSig → Array Position
inSig sig = Array.concatMap inTy sig.parameters <> inRow sig.row
  <> inTy sig.result

inTy ∷ MTy → Array Position
inTy = case _ of
  MBase _ → []
  MVar _ → []
  MArrow parameter row result → inTy parameter <> inRow row <> inTy result
  MRecord fields _ → Array.concatMap fieldTy fields
  MData _ arguments rows → Array.concatMap inTy arguments
    <> Array.concatMap inRow rows
  MHandler label rows → inLabel label <> inRow rows.inference
    <> maybe [] inRow rows.clauses
  where
  fieldTy (Tuple _ ty) = inTy ty

inRow ∷ MRow → Array Position
inRow row = Array.concatMap inLabel row.labels

inLabel ∷ MLabel → Array Position
inLabel label = own <> Array.concatMap inTy label.args
  where
  own = case label.effect, label.mark of
    FailEffect, At position → [ position ]
    ConsoleEffect, At position → [ position ]
    _, _ → []

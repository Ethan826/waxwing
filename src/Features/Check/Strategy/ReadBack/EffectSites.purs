-- The traced roles of the effect read-back (tranche 2 read-back design
-- §C.1-§C.2; dossier §18.155 (3), (8)): a recorded `EffInst`,
-- `OpenedRow` or `Stage k` at path p is read from the trace entry keyed
-- by the span of the checked node at p (ReadBack/Walk.purs `nodeAt`),
-- the map and index chosen by the node's kind:
--   use node (Call, Construct, FunctionRef, CtorRef, OperationRef,
--   Perform, or an over-applied call's Apply): its use entry; `EffInst i`
--   slot i, `OpenedRow` the minted tail, `Stage k` stage k;
--   `Stage k` at an Apply: the row consumed for its k-th argument, keyed
--   by the Apply's span and that argument's; at a Pipe: the row consumed
--   for its left operand, keyed by that operand's span.
-- A lambda's stages (a `show` or `crash` reference's synthesized lambda
-- included) and a pattern's instances are read from types, positionally
-- (ReadBack/EffectPlaces.purs). Applied and piped rows are the consumed
-- row (§18.155 (8)). Untrusted search; `research/t2-read-back-design/
-- trace-rules.mjs` is the research reading this one agrees with.
--
-- Fail-closed: two entries under one key are `Clash`; no entry reads
-- nothing here, and the caller reports a variable no source reads.
module Features.Check.Strategy.ReadBack.EffectSites
  ( entryAt
  , exprAt
  , keyOf
  , tracedRow
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Effect (ERole(..), EVar(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Syntax (Span)
import Domain.Type (TyRow)
import Domain.Type.Core (VarId(..))
import Features.Check.Strategy.ReadBack.Fault (ReadFault(..))
import Features.Check.Strategy.ReadBack.Walk (Node(..), nodeAt)
import Features.Check.Trace
  ( Slot(..)
  , SpanKey
  , TraceKey(..)
  , Traced
  , UseTrace
  )

type Entry a = Either ReadFault (Maybe a)

type Read = Entry (TyRow Open)

-- The trace's value for a traced role, if the variable has one.
tracedRow ∷ Traced → Checked.Expr → EVar → Read
tracedRow traced body variable = case variable of
  EffFresh path role → maybe (Right Nothing) (atNode traced role)
    (exprAt body path)
  EffRigid _ → Right Nothing

-- The checked expression a body path names, if any.
exprAt ∷ Checked.Expr → Path → Maybe Checked.Expr
exprAt body (Path path) = case path.root of
  InBody → nodeAt (AtExpr body) path.steps >>= expression
  _ → Nothing
  where
  expression = case _ of
    AtExpr found → Just found
    AtPattern _ → Nothing

-- The one entry under `key`, nothing when there is none.
entryAt ∷ ∀ k a. Ord k ⇒ (k → TraceKey) → k → Map k (Array a) → Entry a
entryAt named key entries = maybe (Right Nothing) one
  (Map.lookup key entries)
  where
  one found
    | Array.length found > 1 = Left (Clash (named key))
    | otherwise = Right (Array.head found)

keyOf ∷ Span → SpanKey
keyOf span = Tuple span.start.offset span.end.offset

atNode ∷ Traced → ERole → Checked.Expr → Read
atNode traced role (Checked.Expr found) = case role, found.node of
  Stage k, Checked.Apply _ arguments → applied traced found.span
    (Array.index arguments k)
  Stage _, Checked.Pipe left _ → entryAt PipedKey
    (keyOf (Checked.spanOf left))
    traced.piped
  Stage _, Checked.Lambda _ _ → Right Nothing
  _, node
    | isUse node → map (bindMaybe (fromUse role)) useEntry
    | otherwise → Right Nothing
  where
  useEntry = entryAt UseKey (keyOf found.span) traced.uses

applied ∷ Traced → Span → Maybe Checked.Expr → Read
applied traced span = maybe (Right Nothing) consumed
  where
  consumed argument = entryAt keyed
    (Tuple (keyOf span) (keyOf (Checked.spanOf argument)))
    traced.applied
  keyed (Tuple key argument) = AppliedKey key argument

fromUse ∷ ERole → UseTrace → Maybe (TyRow Open)
fromUse role use = case role of
  EffInst (VarId index) → Array.index use.slots index >>= rowSlot
  OpenedRow → use.opened
  Stage k → Array.index use.stages k
  _ → Nothing

rowSlot ∷ Slot → Maybe (TyRow Open)
rowSlot = case _ of
  RowSlot row → Just row
  TypeSlot _ → Nothing

bindMaybe ∷ ∀ a b. (a → Maybe b) → Maybe a → Maybe b
bindMaybe = (=<<)

isUse ∷ Checked.Node → Boolean
isUse = case _ of
  Checked.Call _ _ _ → true
  Checked.Construct _ _ _ → true
  Checked.FunctionRef _ _ → true
  Checked.CtorRef _ _ → true
  Checked.OperationRef _ _ _ → true
  Checked.Perform _ _ _ _ → true
  Checked.Apply _ _ → true
  _ → false

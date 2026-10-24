-- T-R0b §3.5, E17, E20 and E21: operations, handlers and `with` (E22
-- and E23 are Generate.Failure). Each marker's condition is syntactic
-- (§3.5): decided from the node and the tables, never a solved type.
-- Children: `Perform/args/k`, `Handler/clauses/k/body`, `With/handler`,
-- `With/body`. Checked nodes as today's (Check/Operation.purs,
-- Handler.purs, ClauseBody.purs; D1 spec §3.5, R0 Task 7.1b): a perform
-- is a named call (Generate.Call `applied`), and a clause's parameter
-- types are read at `ClauseParamType p c k` (spec §12.2).
module Features.Check.Generate.Effect
  ( agree
  , handler
  , marker
  , operationRef
  , perform
  , with
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Ids (EffectId(..))
import Domain.Recorded.Atom (CheckedName(..), OutsideKind(..))
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  , Step(..)
  )
import Domain.Resolved (Expr, HandlerClause, Ty, VarId)
import Domain.Row (EffectRef(..), Label(..), closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..)) as Type
import Features.Check.Generate.Call (applied)
import Features.Check.Generate.Callee (Called)
import Features.Check.Generate.Context (Context, Recur, at, bindLocal)
import Features.Check.Generate.Elab (Elab)
import Features.Check.Generate.Fresh
  ( child
  , childAt
  , childOf
  , instances
  , nodeRes
  )
import Features.Check.Generate.Gen
  ( Gen
  , GenAtom
  , GenEntry(..)
  , Tagged
  , emit
  , lifted
  , positioned
  , slots
  )
import Features.Check.Generate.Lookup (effectSorts, operationShape)
import Features.Check.Generate.Node
  ( Ruled
  , arrowOf
  , fixed
  , flex
  , markersAt
  , tagged
  )
import Features.Check.Generate.Out (TypeMarker)
import Features.Check.Generate.Translate (Naming, translate, translateAll)

-- E17, a reference: `θ(⟦T̄ → result⟧)`.
operationRef
  ∷ ∀ s. Context s → Path → Span → EffectId → Int → Gen s (Ruled s)
operationRef context path span effect index = referenced
  <$> operation context path span effect index
  where
  referenced found =
    { ty: arrowOf found.parameters found.result
    , node: fixed (Checked.OperationRef effect index <$> found.slots)
    , emits: emit (at context path (ExprRule 17))
        (found.entries <> found.markers)
    }

-- E17, a call: `eq τ_{e_k} θ(⟦T_k⟧)` per argument up to the operation's
-- `n` parameters (B1), typed as E5 types a call (amendment, Task 4.3: a
-- perform is checked as a named call, Check/Operation.purs `named`, so
-- the rule takes E5's cases, where §3.5 wrote `θ(⟦result⟧)` alone):
-- `θ(⟦result⟧)` with `n` arguments, the arrow of the rest with fewer,
-- and with more `⟨p, res⟩` and `eq θ(⟦result⟧) (τ_{e_{n+1}} → … → ⟨p,
-- res⟩)` (B1), as RT8's read-back found. The arguments are generated
-- before the operation is looked up.
perform
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → EffectId
  → Int
  → Array Expr
  → Gen s (Ruled s)
perform recur context path span effect index arguments = do
  generated ← sequence (Array.mapWithIndex argument arguments)
  found ← operation context path span effect index
  applied context { path, span, rule: ExprRule 17, row: RowB }
    (Checked.Perform effect index)
    found
    generated
  where
  argument place = recur context (childAt path "Perform" "args" place)

-- The operation instantiated. When the effect has parameters, `Outside
-- EffectArgument` (O2, origin body): their link to the handler's
-- instantiation runs through the erased row and is not recorded. Then
-- the markers of `T̄` and the result (origin inst). Both follow the
-- argument equations, so they are the instance's markers.
operation
  ∷ ∀ s. Context s → Path → Span → EffectId → Int → Gen s (Called s)
operation context path span effect index = do
  shape ← lifted (operationShape context.tables effect index)
  inst ← instances path (ExprRule 17) span shape.sorts
  parameters ← lifted (translateAll context.tables inst.naming shape.parameters)
  result ← lifted (translate context.tables inst.naming shape.result)
  read ← slots path inst.slots
  pure
    { parameters: parameters.tys
    , result: result.ty
    , entries: []
    , markers: marker (not (Array.null shape.sorts)) EffectArgument 2 span
        <> markersAt InstOrigin span (parameters.marks <> result.marks)
    , slots: read
    }

-- E20: `app (Handler e) [⟨p, inst j⟩ …]`, `Outside HandlerType` (O3),
-- clause bodies with parameters at θ of their declared types; markers of
-- those types follow (origin inst). The checked node holds the written
-- label's arguments (Check/ClauseBody.purs `labelArgs`), which the
-- witness binds `⟨p, inst j⟩` to.
handler
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Label (Ty VarId)
  → Array HandlerClause
  → Gen s (Ruled s)
handler recur context path span (Label effect _ mark) clauses = do
  sorts ← lifted (effectSorts context.tables effect)
  inst ← instances path (ExprRule 20) span sorts
  found ← sequence (Array.mapWithIndex (clauseOf inst.naming) clauses)
  read ← slots path inst.slots
  pure
    { ty: Type.THandler (Label effect (map snd inst.slots) mark)
        { inference: closedRow, clauses: Nothing }
    , node: fixed
        ( Checked.Handler (effectId effect) <$> read
            <*> traverse _.clause found
        )
    , emits: do
        emit (at context path (ExprRule 20))
          ( marker true HandlerType 3 span
              <> markersAt InstOrigin span (Array.concatMap _.marks found)
          )
        traverse_ _.emits found
    }
  where
  snd (Tuple _ ty) = ty
  clauseOf naming place = handlerClause recur context
    { handler: path, clause: place }
    naming

-- A clause's id for the checked node, as Check/Handler.purs `effectId`.
effectId ∷ EffectRef → EffectId
effectId = case _ of
  UserEffect id → id
  ConsoleEffect → EffectId (-1)
  FailEffect → EffectId (-1)

type Clause s =
  { clause ∷ Elab s Checked.HandlerClause
  , marks ∷ Array TypeMarker
  , emits ∷ Gen s Unit
  }

handlerClause
  ∷ ∀ s
  . Recur s
  → Context s
  → { handler ∷ Path, clause ∷ Int }
  → Naming s
  → HandlerClause
  → Gen s (Clause s)
handlerClause recur context site naming clause = do
  typed ← traverse typedParameter clause.parameters
  read ← traverse sited (Array.mapWithIndex Tuple typed)
  body ← recur (Array.foldl bindParameter context typed)
    (child path [ Named "body" ])
    clause.body
  pure
    { clause:
        { operation: clause.operation
        , parameters: _
        , body: _
        , span: clause.span
        }
          <$> sequence read
          <*> body.expr
    , marks: Array.concatMap _.marks typed
    , emits: body.emits
    }
  where
  path = childAt site.handler "Handler" "clauses" site.clause
  typedParameter parameter = withLocal parameter.local
    <$> lifted (translate context.tables naming parameter.ty)
  withLocal local found = { local, ty: found.ty, marks: found.marks }
  sited (Tuple index parameter) = map ({ local: parameter.local, ty: _ })
    <$> positioned (ClauseParamType site.handler site.clause index) parameter.ty
  bindParameter current parameter = maybe current (bindAt current parameter)
    parameter.local
  bindAt current parameter local = bindLocal local parameter.ty current

-- E21: `⟨p, res⟩`, `Outside HandlerType`; no equation through the
-- handler.
with
  ∷ ∀ s. Recur s → Context s → Path → Span → Expr → Expr → Gen s (Ruled s)
with recur context path span installed body = do
  handlerPart ← recur context (childOf path "With" "handler") installed
  bodyPart ← recur context (childOf path "With" "body") body
  res ← nodeRes path (ExprRule 21) span
  pure
    { ty: flex res
    , node: fixed (Checked.With <$> handlerPart.expr <*> bodyPart.expr)
    , emits: do
        emit (at context path (ExprRule 21)) (marker true HandlerType 3 span)
        handlerPart.emits
        bodyPart.emits
    }

-- An explicit marker of this rule (origin body), when its condition
-- holds.
marker ∷ ∀ s. Boolean → OutsideKind → Int → Span → Array (Tagged s)
marker holds kind row span =
  if holds then [ tagged (EmitOutside kind) RowO row Body span ] else []

agree ∷ ∀ s. Span → GenAtom s → Tagged s
agree span atom = tagged (EmitB atom) RowB 1 Body span

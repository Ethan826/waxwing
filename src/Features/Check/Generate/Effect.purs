-- T-R0b §3.5, E17, E20 and E21: operations, handlers and `with` (E22
-- and E23 are Generate.Failure). Each marker's condition is syntactic
-- (§3.5): decided from the node and the tables, never a solved type.
-- Children: `Perform/args/k`, `Handler/clauses/k/body`, `With/handler`,
-- `With/body`.
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
import Data.Maybe (maybe)
import Data.Traversable (sequence, traverse)
import Data.Tuple (fst)
import Domain.Ids (EffectId)
import Domain.Recorded.Atom
  ( Atom(..)
  , Head(..)
  , OutsideKind(..)
  , RTExpr(..)
  )
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  , Step(..)
  )
import Domain.Resolved (Expr, HandlerClause, Ty, VarId)
import Domain.Row (Label(..))
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, Recur, at, bindLocal)
import Features.Check.Generate.Fault (Gen)
import Features.Check.Generate.Fresh
  ( child
  , childAt
  , childOf
  , instNaming
  , instVars
  , nodeRes
  , Naming
  )
import Features.Check.Generate.Lookup (effectSorts, operationShape)
import Features.Check.Generate.Out
  ( Generated
  , Item(..)
  , Listed
  , Out
  , TypeMarker
  , concatOut
  , emit
  , listed
  , markersAt
  , varsOut
  )
import Features.Check.Generate.Translate (arrowOf, translate, translateAll)

-- An operation referenced, or performed with these arguments.
data Use = Referenced | Performed (Array Generated)

-- E17, a reference: `θ(⟦T̄ → result⟧)`.
operationRef ∷ Context → Path → Span → EffectId → Int → Gen Generated
operationRef context path span effect index = operation context path span
  effect
  index
  Referenced

-- E17, a call: `θ(⟦result⟧)`, `eq τ_{e_k} θ(⟦T_k⟧)` per argument (B1).
perform
  ∷ Recur
  → Context
  → Path
  → Span
  → EffectId
  → Int
  → Array Expr
  → Gen Generated
perform recur context path span effect index arguments =
  sequence (Array.mapWithIndex argument arguments)
    >>= operation context path span effect index <<< Performed
  where
  argument place = recur context (childAt path "Perform" "args" place)

-- When the effect has parameters, `Outside EffectArgument` (O2, origin
-- body): their link to the handler's instantiation runs through the
-- erased row and is not recorded. Then the markers of `T̄` and the
-- result (origin inst).
operation
  ∷ Context → Path → Span → EffectId → Int → Use → Gen Generated
operation context path span effect index use =
  operationShape context.tables effect index >>= shaped
  where
  naming = instNaming path
  shaped shape = performed shape
    <$> translateAll context.tables naming shape.parameters
    <*> translate context.tables naming shape.result
  performed shape parameters result =
    { ty: typeOf parameters result use
    , out: concatOut
        ( [ varsOut (instVars path (ExprRule 17) span shape.sorts)
          , emit (at context path (ExprRule 17))
              ( Array.zipWith equation arguments parameters.tys
                  <> marker (not (Array.null shape.sorts)) EffectArgument 2
                    span
                  <> markersAt InstOrigin span
                    (parameters.marks <> result.marks)
              )
          ]
            <> map _.out arguments
        )
    }
  equation found declared = agree span (Equal found.ty declared)
  arguments = case use of
    Referenced → []
    Performed found → found
  typeOf parameters result = case _ of
    Referenced → arrowOf parameters.tys result.ty
    Performed _ → result.ty

-- E20: `app (Handler e) [⟨p, inst j⟩ …]`, `Outside HandlerType` (O3),
-- clause bodies with parameters at θ of their declared types; markers of
-- those types follow (origin inst).
handler
  ∷ Recur
  → Context
  → Path
  → Span
  → Label (Ty VarId)
  → Array HandlerClause
  → Gen Generated
handler recur context path span (Label effect _ _) clauses = handled
  <$> effectSorts context.tables effect
  <*> sequence (Array.mapWithIndex clauseOf clauses)
  where
  handled sorts found = handledWith (instVars path (ExprRule 20) span sorts)
    found
  handledWith vars found =
    { ty: App (HandlerHead effect) (map (TVar <<< fst) vars)
    , out: concatOut
        ( [ varsOut vars
          , emit (at context path (ExprRule 20))
              ( marker true HandlerType 3 span
                  <> markersAt InstOrigin span (Array.concatMap _.marks found)
              )
          ]
            <> map _.out found
        )
    }
  clauseOf place clause = handlerClause recur context
    (childAt path "Handler" "clauses" place)
    (instNaming path)
    clause

handlerClause
  ∷ Recur
  → Context
  → Path
  → Naming
  → HandlerClause
  → Gen { out ∷ Out, marks ∷ Array TypeMarker }
handlerClause recur context path naming clause = do
  typed ← traverse typedParameter clause.parameters
  body ← recur (Array.foldl bindParameter context typed)
    (child path [ Named "body" ])
    clause.body
  pure { out: body.out, marks: Array.concatMap _.marks typed }
  where
  typedParameter parameter = withLocal parameter.local
    <$> translate context.tables naming parameter.ty
  withLocal local found = { local, ty: found.ty, marks: found.marks }
  bindParameter current parameter = maybe current (bindAt current parameter)
    parameter.local
  bindAt current parameter local = bindLocal local parameter.ty current

-- E21: `⟨p, res⟩`, `Outside HandlerType`; no equation through the
-- handler.
with ∷ Recur → Context → Path → Span → Expr → Expr → Gen Generated
with recur context path span installed body = ado
  handlerPart ← recur context (childOf path "With" "handler") installed
  bodyPart ← recur context (childOf path "With" "body") body
  in
    { ty: TVar (fst resVar)
    , out: concatOut
        [ varsOut [ resVar ]
        , emit (at context path (ExprRule 21))
            (marker true HandlerType 3 span)
        , handlerPart.out
        , bodyPart.out
        ]
    }
  where
  resVar = nodeRes path (ExprRule 21) span

-- An explicit marker of this rule (origin body), when its condition
-- holds.
marker ∷ Boolean → OutsideKind → Int → Span → Array Listed
marker holds kind row span =
  if holds then [ listed (ToOutside kind) RowO row Body span ] else []

agree ∷ Span → Atom → Listed
agree span atom = listed (ToB atom) RowB 1 Body span

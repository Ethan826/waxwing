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
import Data.Tuple (Tuple, fst)
import Domain.Ids (EffectId)
import Domain.Recorded.Atom
  ( Atom(..)
  , Head(..)
  , OutsideKind(..)
  , RTExpr(..)
  , Var
  , VarInfo
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
import Features.Check.Generate.Translate
  ( Translations
  , arrowOf
  , translate
  , translateAll
  )

-- An operation referenced, or performed with these arguments.
data Use = Referenced | Performed (Array Generated)

-- A use's type, and an over-application's entry and `⟨p, res⟩`.
type Applied =
  { ty ∷ RTExpr, over ∷ Array Listed, vars ∷ Array (Tuple Var VarInfo) }

-- E17, a reference: `θ(⟦T̄ → result⟧)`.
operationRef ∷ Context → Path → Span → EffectId → Int → Gen Generated
operationRef context path span effect index = operation context path span
  effect
  index
  Referenced

-- E17, a call: `eq τ_{e_k} θ(⟦T_k⟧)` per argument up to the operation's
-- `n` parameters (B1), typed as E5 types a call (amendment, Task 4.3: a
-- perform is checked as a named call, Check/Operation.purs `named`, so
-- the rule takes E5's cases, where §3.5 wrote `θ(⟦result⟧)` alone):
-- `θ(⟦result⟧)` with `n` arguments, the arrow of the rest with fewer,
-- and with more `⟨p, res⟩` and `eq θ(⟦result⟧) (τ_{e_{n+1}} → … → ⟨p,
-- res⟩)` (B1), as RT8's read-back found.
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
  performed shape parameters result = typed shape parameters result
    (applied path span use parameters result.ty)
  typed shape parameters result found =
    { ty: found.ty
    , out: concatOut
        ( [ varsOut (instVars path (ExprRule 17) span shape.sorts <> found.vars)
          , emit (at context path (ExprRule 17))
              ( Array.zipWith equation arguments parameters.tys
                  <> found.over
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

-- E17's type and over-application entries: E5's three cases.
applied ∷ Path → Span → Use → Translations → RTExpr → Applied
applied path span use parameters result = case use of
  Referenced → plain (arrowOf parameters.tys result)
  Performed found
    | Array.length found > count →
        { ty: res
        , over:
            [ agree span
                (Equal result (arrowOf (map _.ty (Array.drop count found)) res))
            ]
        , vars: [ resVar ]
        }
    | otherwise → plain
        (arrowOf (Array.drop (Array.length found) parameters.tys) result)
  where
  count = Array.length parameters.tys
  resVar = nodeRes path (ExprRule 17) span
  res = TVar (fst resVar)
  plain ty = { ty, over: [], vars: [] }

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

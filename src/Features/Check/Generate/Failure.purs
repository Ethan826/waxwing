-- T-R0b §3.5, E22 and E23: `handle` and `fail`. `Outside FailFamily`
-- is decided from the written family alone (§3.5, §4), never from a
-- solved payload. Children: `Handle/body`, `Handle/clauses/k/body`,
-- `Fail/payload`.
module Features.Check.Generate.Failure (fail, handle) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (sequence, traverse)
import Data.Tuple (fst)
import Domain.Recorded.Atom (Atom(..), OutsideKind(..), RTExpr(..))
import Domain.Recorded.Origin (OriginKind(..), Path, RuleId(..), Step(..))
import Domain.Resolved (Expr, FailClause, Ty, VarId)
import Domain.Row (Label(..))
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, Recur, at, bindLocal)
import Features.Check.Generate.Effect (agree, marker)
import Features.Check.Generate.Fault (Gen, GenerationFault(..))
import Features.Check.Generate.Fresh
  ( child
  , childAt
  , childOf
  , nodeRes
  , rigidNaming
  )
import Features.Check.Generate.Out
  ( Generated
  , Out
  , TypeMarker
  , concatOut
  , emit
  , markersAt
  , varsOut
  )
import Features.Check.Generate.Translate (translate)

-- E22: `Outside FailFamily` (O4), `eq τ_body ⟨p, res⟩` and `eq τ_clause
-- ⟨p, res⟩` (B1); a clause's local at its label's single argument,
-- written in the body (`ν_f`, markers origin types; reading 16). Resolve
-- writes every clause label with one payload
-- (Resolve/HandlerExpression.purs:120); any other is a fault.
handle
  ∷ Recur → Context → Path → Span → Expr → Array FailClause → Gen Generated
handle recur context path span body clauses = handledWith
  <$> recur context (childOf path "Handle" "body") body
  <*> sequence (Array.mapWithIndex clauseOf clauses)
  where
  resVar = nodeRes path (ExprRule 22) span
  res = TVar (fst resVar)
  clauseOf place clause = failClause recur context
    (child (childAt path "Handle" "clauses" place) [ Named "body" ])
    clause
  handledWith handled found =
    { ty: res
    , out: concatOut
        ( [ varsOut [ resVar ]
          , emit (at context path (ExprRule 22))
              ( marker true FailFamily 4 span
                  <> [ agree span (Equal handled.ty res) ]
                  <> map (agree span <<< (Equal <@> res) <<< _.ty) found
                  <> markersAt Types span (Array.concatMap _.marks found)
              )
          , handled.out
          ]
            <> map _.out found
        )
    }

failClause
  ∷ Recur
  → Context
  → Path
  → FailClause
  → Gen { ty ∷ RTExpr, out ∷ Out, marks ∷ Array TypeMarker }
failClause recur context path clause = do
  written ← maybe (Left PayloadShape) Right (singleArgument clause.label)
  payload ← translate context.tables rigidNaming written
  generated ← recur
    ( maybe context (bindLocal <@> payload.ty <@> context)
        clause.local
    )
    path
    clause.body
  pure { ty: generated.ty, out: generated.out, marks: payload.marks }

-- E23: `⟨p, res⟩`; if the family is written, `eq τ_e ⟦family⟧` (B1);
-- `Outside FailFamily` (O4) unless the family is written and translates
-- to a type with no record and no variable (reading 11: on the
-- translation, so a declared family is `base` and unmarked). The payload
-- is at `Fail/payload` (controller ruling, Task 3.2 fix round 1: the
-- translator's step).
fail
  ∷ Recur → Context → Path → Span → Maybe (Ty VarId) → Expr → Gen Generated
fail recur context path span family value = failed
  <$> recur context (childOf path "Fail" "payload") value
  <*> traverse (translate context.tables rigidNaming) family
  where
  resVar = nodeRes path (ExprRule 23) span
  failed paid written =
    { ty: TVar (fst resVar)
    , out: concatOut
        [ varsOut [ resVar ]
        , emit (at context path (ExprRule 23))
            ( map (payloadAtom paid) (Array.fromFoldable written)
                <> marker (maybe true (not <<< plain <<< _.ty) written)
                  FailFamily
                  4
                  span
                <> markersAt Types span (maybe [] _.marks written)
            )
        , paid.out
        ]
    }
  payloadAtom paid found = agree span (Equal paid.ty found.ty)

singleArgument ∷ ∀ t. Label t → Maybe t
singleArgument (Label _ arguments _) =
  if Array.length arguments == 1 then Array.head arguments else Nothing

-- No record node and no variable anywhere in the type.
plain ∷ RTExpr → Boolean
plain = case _ of
  Base _ → true
  Arrow parameter result → plain parameter && plain result
  TVar _ → false
  Record _ _ → false
  App _ arguments → Array.all plain arguments

-- T-R0b §3.5, E22 and E23: `handle` and `fail`. `Outside FailFamily`
-- is decided from the written family alone (§3.5, §4), never from a
-- solved payload. Children: `Handle/body`, `Handle/clauses/k/body`,
-- `Fail/payload`. Checked nodes as today's (Check/Handle.purs,
-- Failure.purs; D1 spec §3.5, R0 Task 7.1b): a clause's payload type is
-- its written label's argument, rigid and static, so nothing reads it.
module Features.Check.Generate.Failure (fail, handle) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (sequence, traverse)
import Domain.Checked.Internal (rigid)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (OutsideKind(..))
import Domain.Recorded.Origin (OriginKind(..), Path, RuleId(..), Step(..))
import Domain.Resolved (Expr, FailClause, Ty, VarId)
import Domain.Row (Label(..))
import Domain.Syntax (Span)
import Domain.Type (Ty(..)) as Type
import Features.Check.Generate.Context (Context, Recur, at, bindLocal)
import Features.Check.Generate.Effect (agree, marker)
import Features.Check.Generate.Elab (Elab, GenTy)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Fresh (child, childAt, childOf, nodeRes)
import Features.Check.Generate.Gen (Gen, GenAtom(..), emit, lifted)
import Features.Check.Generate.Node (Ruled, fixed, flex, markersAt)
import Features.Check.Generate.Out (TypeMarker)
import Features.Check.Generate.Translate (Naming(..), translate)

-- E22: `Outside FailFamily` (O4), `eq τ_body ⟨p, res⟩` and `eq τ_clause
-- ⟨p, res⟩` (B1); a clause's local at its label's single argument,
-- written in the body (`ν_f`, markers origin types; reading 16). Resolve
-- writes every clause label with one payload and a binder
-- (Resolve/HandlerExpression.purs:116-121); any other is a fault.
handle
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Expr
  → Array FailClause
  → Gen s (Ruled s)
handle recur context path span body clauses = do
  handled ← recur context (childOf path "Handle" "body") body
  found ← sequence (Array.mapWithIndex clauseOf clauses)
  res ← flex <$> nodeRes path (ExprRule 22) span
  pure
    { ty: res
    , node: fixed (Checked.Handle <$> handled.expr <*> traverse _.clause found)
    , emits: do
        emit (at context path (ExprRule 22))
          ( marker true FailFamily 4 span
              <> [ agree span (GenEqual handled.ty res) ]
              <> map (agree span <<< (GenEqual <@> res) <<< _.ty) found
              <> markersAt Types span (Array.concatMap _.marks found)
          )
        handled.emits
        traverse_ _.emits found
    }
  where
  clauseOf place clause = failClause recur context
    (child (childAt path "Handle" "clauses" place) [ Named "body" ])
    clause

type Clause s =
  { ty ∷ GenTy s
  , clause ∷ Elab s Checked.FailClause
  , marks ∷ Array TypeMarker
  , emits ∷ Gen s Unit
  }

failClause
  ∷ ∀ s. Recur s → Context s → Path → FailClause → Gen s (Clause s)
failClause recur context path clause = do
  written ← lifted
    (maybe (Left PayloadShape) Right (singleArgument clause.label))
  payload ← lifted (translate context.tables Rigidly written)
  generated ← recur
    ( maybe context (bindLocal <@> payload.ty <@> context)
        clause.local
    )
    path
    clause.body
  local ← lifted (maybe (Left BinderShape) Right clause.local)
  pure
    { ty: generated.ty
    , clause: { payload: rigid written, local, body: _, span: clause.span }
        <$> generated.expr
    , marks: payload.marks
    , emits: generated.emits
    }

-- E23: `⟨p, res⟩`; if the family is written, `eq τ_e ⟦family⟧` (B1);
-- `Outside FailFamily` (O4) unless the family is written and translates
-- to a type with no record and no variable (reading 11: on the
-- translation, so a declared family is `base` and unmarked). The payload
-- is at `Fail/payload` (controller ruling, Task 3.2 fix round 1: the
-- translator's step).
fail
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Maybe (Ty VarId)
  → Expr
  → Gen s (Ruled s)
fail recur context path span family value = do
  paid ← recur context (childOf path "Fail" "payload") value
  written ← lifted (traverse (translate context.tables Rigidly) family)
  res ← nodeRes path (ExprRule 23) span
  pure
    { ty: flex res
    , node: fixed (Checked.Fail <$> paid.expr)
    , emits: do
        emit (at context path (ExprRule 23))
          ( map (payloadAtom paid.ty) (Array.fromFoldable written)
              <> marker (maybe true (not <<< plain <<< _.ty) written)
                FailFamily
                4
                span
              <> markersAt Types span (maybe [] _.marks written)
          )
        paid.emits
    }
  where
  payloadAtom paid found = agree span (GenEqual paid found.ty)

singleArgument ∷ ∀ t. Label t → Maybe t
singleArgument (Label _ arguments _) =
  if Array.length arguments == 1 then Array.head arguments else Nothing

-- No record node and no variable anywhere in the type's recorded form
-- (rows are erased there).
plain ∷ ∀ v. Type.Ty v → Boolean
plain = case _ of
  Type.TInt → true
  Type.TBool → true
  Type.TText → true
  Type.TUnit → true
  Type.TVar _ → false
  Type.TRecord _ → false
  Type.TData _ arguments _ → Array.all plain arguments
  Type.THandler (Label _ arguments _) _ → Array.all plain arguments
  Type.TFun parameter _ result → plain parameter && plain result

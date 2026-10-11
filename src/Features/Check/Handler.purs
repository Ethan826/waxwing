module Features.Check.Handler
  ( handler
  , withHandler
  ) where

import Prelude
import Data.Either (Either(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Ids (EffectId(..))
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Row (EffectRef(..), Label(..), withMark)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..))
import Features.Check.ClauseBody (HandlerEnv, labelArgs, openLabel)
import Features.Check.Clauses (checkClauses)
import Features.Check.Context (Infer, Locals)
import Features.Check.Require (typeName)
import Features.Check.Install (install)
import Features.Check.Scheme (State, Threaded, headOf)
import Features.Check.Sync (sync)

type Checked = Either Diagnostic (Threaded Checked.Expr)

handler
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → State
  → Span
  → Label (Ty Resolved.VarId)
  → Array Resolved.HandlerClause
  → Checked
handler infer env state span label clauses = do
  checked ← checkClauses infer env state span label clauses
  pure
    { value: Checked.Expr
        { ty: THandler (withMark checked.value.own (openLabel label))
            checked.value.rows
        , span
        , node: Checked.Handler (effectId label) (labelArgs label)
            checked.value.clauses
        }
    , state: checked.state
    }

withHandler
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → State
  → Span
  → Resolved.Expr
  → Resolved.Expr
  → Checked
withHandler infer env state span handlerExpr body = do
  inferred ← infer env state handlerExpr
  synced ← sync env inferred.state span
  let handlerValue = inferred { state = synced }
  case headOf handlerValue.state (Checked.typeOf handlerValue.value) of
    THandler label rows → withValue handlerValue label rows
    other → expectedHandler env span other
  where
  withValue handlerValue label rows = install infer env handlerValue.state
    span
    handlerValue.value
    label
    rows
    body

expectedHandler ∷ ∀ r. HandlerEnv r → Span → Ty Open → Checked
expectedHandler env span ty = do
  name ← typeName env span ty
  Left (problemAt (ExpectedHandler name) span)

effectId ∷ Label (Ty Resolved.VarId) → EffectId
effectId (Label (UserEffect id) _ _) = id
effectId _ = EffectId (-1)

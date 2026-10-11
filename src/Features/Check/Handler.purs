module Features.Check.Handler
  ( handler
  , withHandler
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Ids (EffectId(..))
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Row (EffectRef(..), Label(..), Row(..), withMark)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..), TyRow)
import Features.Check.Clauses (HandlerEnv, checkClauses, labelArgs, openLabel)
import Features.Check.Consume (consumeIgnoring)
import Features.Check.Context (Infer, Locals)
import Features.Check.Provenance (Boundary(Installation), Consumed(Application))
import Features.Check.Require (typeName)
import Features.Check.RowName (labelName)
import Features.Check.Scheme (State, Threaded, flexible, headOf)
import Features.Check.Sync (sync)
import Features.Check.Unify (Flex)

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
    THandler label rows → withValue handlerValue label rows.inference
    other → expectedHandler env span other
  where
  withValue handlerValue label row = do
    installed ← labelName env span (flexLabel label)
    consumed ← consumeIgnoring env handlerValue.state
      { origin:
          { span, consumed: Application, via: Just (Installation installed) }
      , stage: row
      , target: env.current
      }
    bodyValue ← infer (installing label) consumed body
    pure
      { value: Checked.Expr
          { ty: Checked.typeOf bodyValue.value
          , span
          , node: Checked.With handlerValue.value bodyValue.value
          }
      , state: bodyValue.state
      }
  installing label = env
    { current = prepend label env.current
    , sites = Array.cons { span, count: 1 } env.sites
    }

expectedHandler ∷ ∀ r. HandlerEnv r → Span → Ty Open → Checked
expectedHandler env span ty = do
  name ← typeName env span ty
  Left (problemAt (ExpectedHandler name) span)

effectId ∷ Label (Ty Resolved.VarId) → EffectId
effectId (Label (UserEffect id) _ _) = id
effectId _ = EffectId (-1)

flexLabel ∷ Label (Ty Open) → Label (Ty Flex)
flexLabel (Label effect arguments mark) = Label effect
  (map flexible arguments)
  mark

prepend ∷ Label (Ty Open) → TyRow Open → TyRow Open
prepend label (Row labels tail) = Row (Array.cons label labels) tail

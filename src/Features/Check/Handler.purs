module Features.Check.Handler
  ( HandlerEnv
  , handler
  , withHandler
  , openLabel
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Ids (EffectId(..))
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Row (EffectRef(..), Label(..), Row(..), closedRow, uniformRows)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..), TyRow, VarId(..), substitute)
import Features.Check.Context (CheckEnv, Infer, Locals)
import Features.Check.Consume (consumeIgnoring)
import Features.Check.MarkUse (literalMark)
import Features.Check.Provenance (Boundary(Installation), Consumed(Application))
import Features.Check.Require (require, typeName)
import Features.Check.RowName (labelName)
import Features.Check.Scheme (State, Threaded, flexible, headOf, threadAll)
import Features.Check.Unify (Flex)

type HandlerEnv r = CheckEnv (locals ∷ Locals | r)
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
  let row = Row [] (Just (Hole state.next))
  checked ← threadAll (handlerClause infer env row label)
    (state { next = state.next + 2 })
    clauses
  pure
    { value: Checked.Expr
        { ty: THandler (literalMark (state.next + 1) (openLabel label))
            (uniformRows row)
        , span
        , node: Checked.Handler (effectId label) (labelArgs label)
            checked.value
        }
    , state: checked.state
    }

handlerClause
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → TyRow Open
  → Label (Ty Resolved.VarId)
  → State
  → Resolved.HandlerClause
  → Either Diagnostic { value ∷ Checked.HandlerClause, state ∷ State }
handlerClause
  infer
  env
  row
  label
  state
  (clause ∷ Resolved.HandlerClause) = do
  let checkedParameters = map (typedParameter label) clause.parameters
  let
    scoped = env
      { current = row
      , sites = []
      , locals = bindParameters checkedParameters env.locals
      }
  checkedBody ← inferHandlerBody infer scoped state clause.body
  reached ← require scoped checkedBody.state
    (instantiateType label clause.result)
    checkedBody.value
  pure
    { value:
        { operation: clause.operation
        , parameters: checkedParameters
        , body: checkedBody.value
        , span: clause.span
        }
    , state: reached
    }
  where
  typedParameter effectLabel found =
    { local: found.local, ty: instantiateType effectLabel found.ty }
  bindParameters parameters locals =
    foldl insertParameter locals parameters
  insertParameter locals entry = maybe locals (insertLocal entry locals)
    entry.local
  insertLocal entry locals local = Map.insert local entry.ty locals

inferHandlerBody
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → State
  → Resolved.Expr
  → Either Diagnostic (Threaded Checked.Expr)
inferHandlerBody infer env state body = infer env state body

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
  handlerValue ← infer env state handlerExpr
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

instantiateType ∷ Label (Ty Resolved.VarId) → Ty Resolved.VarId → Ty Open
instantiateType label = substitute
  { types: argument (labelArgs label)
  , rows: closed
  }
  where
  closed _ = closedRow

argument ∷ Array (Ty Open) → VarId → Ty Open
argument args (VarId index) = maybe (TVar (Rigid (VarId index))) identity
  (Array.index args index)

labelArgs ∷ Label (Ty Resolved.VarId) → Checked.Instantiation
labelArgs (Label _ args _) = map (map Rigid) args

openLabel ∷ Label (Ty Resolved.VarId) → Label (Ty Open)
openLabel (Label effect args mark) = Label effect (map (map Rigid) args)
  mark

effectId ∷ Label (Ty Resolved.VarId) → EffectId
effectId (Label (UserEffect id) _ _) = id
effectId _ = EffectId (-1)

flexLabel ∷ Label (Ty Open) → Label (Ty Flex)
flexLabel (Label effect arguments mark) = Label effect
  (map flexible arguments)
  mark

prepend ∷ Label (Ty Open) → TyRow Open → TyRow Open
prepend label (Row labels tail) = Row (Array.cons label labels) tail

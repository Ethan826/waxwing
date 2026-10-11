module Features.Check.Handle (handleFailure) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldr)
import Data.Map as Map
import Data.Maybe (maybe')
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Row (Label(..), Row(..))
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..), TyRow)
import Features.Check.Context (Infer, Locals)
import Features.Check.Handler (HandlerEnv, openLabel)
import Features.Check.Require (require)
import Features.Check.Scheme (State, Threaded, threadAll)

type Checked = Either Diagnostic (Threaded Checked.Expr)

handleFailure
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → State
  → Span
  → Resolved.Expr
  → Array Resolved.FailClause
  → Checked
handleFailure infer env state span body clauses = do
  bodyValue ← infer failing state body
  finished ← threadAll
    (failureClause infer env (Checked.typeOf bodyValue.value))
    bodyValue.state
    clauses
  pure
    { value: Checked.Expr
        { ty: Checked.typeOf bodyValue.value
        , span
        , node: Checked.Handle bodyValue.value finished.value
        }
    , state: finished.state
    }
  where
  failing = env
    { current = withFailures clauses env.current
    , sites = Array.cons { span, count: Array.length clauses } env.sites
    }

failureClause
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → Ty Open
  → State
  → Resolved.FailClause
  → Either Diagnostic { value ∷ Checked.FailClause, state ∷ State }
failureClause infer env expected state clause = do
  local ← maybe' invalid Right clause.local
  let payload = map Rigid (payloadType clause.label)
  let scoped = env { locals = Map.insert local payload env.locals }
  body ← infer scoped state clause.body
  reached ← require scoped body.state expected body.value
  pure
    { value: { payload, local, body: body.value, span: clause.span }
    , state: reached
    }
  where
  invalid _ = Left (problemAt (Internal "Missing fail binder") clause.span)

payloadType ∷ Label (Ty Resolved.VarId) → Ty Resolved.VarId
payloadType (Label _ arguments _) = maybe' noPayload identity
  (Array.head arguments)
  where
  noPayload _ = TUnit

withFailures ∷ Array Resolved.FailClause → TyRow Open → TyRow Open
withFailures clauses row = foldr add row clauses
  where
  add clause (Row labels tail) =
    Row (Array.cons (openLabel clause.label) labels) tail

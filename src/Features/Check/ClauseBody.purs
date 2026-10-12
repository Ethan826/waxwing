module Features.Check.ClauseBody
  ( HandlerEnv
  , handlerClause
  , labelArgs
  , openLabel
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (maybe)
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Resolved as Resolved
import Domain.Row (Label(..), closedRow)
import Domain.Syntax (Diagnostic)
import Domain.Type (Ty(..), TyRow, VarId(..), substitute)
import Features.Check.Context (CheckEnv, Infer, Locals)
import Features.Check.Require (require)
import Features.Check.Scheme (State, Threaded)

type HandlerEnv r = CheckEnv (locals ∷ Locals | r)

-- One clause body checked against the clause's own row `row`, with the
-- handled label's arguments substituted into its types.
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


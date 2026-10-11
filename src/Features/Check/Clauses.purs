module Features.Check.Clauses
  ( HandlerEnv
  , checkClauses
  , labelArgs
  , openLabel
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Tuple (fst, snd)
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Ids (EffectId(..))
import Domain.Resolved as Resolved
import Domain.Row
  ( HandlerRows
  , Label(..)
  , Mark(..)
  , EffectRef(..)
  , Row(..)
  , closedRow
  , normalMark
  )
import Domain.Syntax (Diagnostic, Span)
import Domain.Type (Ty(..), TyRow, VarId(..), substitute)
import Features.Check.Consume (consumeLabels)
import Features.Check.Context (CheckEnv, Infer, Locals)
import Features.Check.Defer (placed)
import Features.Check.Entry (resolvedRow)
import Features.Check.Provenance (Consumed(Application), Origin)
import Features.Check.Require (require)
import Features.Check.Restricted (registerClause)
import Features.Check.Scheme (State, Threaded, threadAll)
import Features.Check.Watch (watchTail)

type HandlerEnv r = CheckEnv (locals ∷ Locals | r)

-- What each clause of one handler literal shares: its label, the span, the
-- rows R (inference) and C (clauses), and the handled label's mark m.
type Setup =
  { label ∷ Label (Ty Resolved.VarId)
  , span ∷ Span
  , inference ∷ TyRow Open
  , clauses ∷ TyRow Open
  , own ∷ Mark
  }

-- Fresh numbers for one clause: its id (also its group's), its row's tail
-- meta and the remainder meta φ of its group.
type Ids = { clause ∷ Int, tail ∷ Int, phi ∷ Int }

-- Each clause is checked against a row c of its own (design §3.4). It is
-- consumed into C here and registered for `sync`, which feeds R; R is
-- reached only through the hook and settling.
checkClauses
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → State
  → Span
  → Label (Ty Resolved.VarId)
  → Array Resolved.HandlerClause
  → Either Diagnostic
      ( Threaded
          { clauses ∷ Array Checked.HandlerClause
          , rows ∷ HandlerRows (Ty Open) Open
          , own ∷ Mark
          }
      )
checkClauses infer env state span label clauses = do
  checked ← threadAll (checkClause infer env setup)
    (state { next = state.next + 3 })
    clauses
  pure
    { value: { clauses: checked.value, rows, own }
    , state: checked.state
    }
  where
  rows = { inference: openRow state.next, clauses: Just (openRow (state.next + 1)) }
  own = markOf label (state.next + 2)
  setup =
    { label
    , span
    , inference: openRow state.next
    , clauses: openRow (state.next + 1)
    , own
    }

markOf ∷ Label (Ty Resolved.VarId) → Int → Mark
markOf (Label effect _ _) meta = normalMark effect (MarkMeta meta)

openRow ∷ Int → TyRow Open
openRow meta = Row [] (Just (Hole meta))

checkClause
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → Setup
  → State
  → Resolved.HandlerClause
  → Either Diagnostic { value ∷ Checked.HandlerClause, state ∷ State }
checkClause infer env setup state clause = do
  checked ← handlerClause infer env (openRow ids.tail) setup.label
    (state { next = state.next + 3 })
    clause
  filed ← file env setup ids (openRow ids.tail) checked.value checked.state
  pure { value: checked.value, state: filed }
  where
  ids = { clause: state.next, tail: state.next + 1, phi: state.next + 2 }

-- The operation's name, for the notes of later tasks.
operationName
  ∷ ∀ r. HandlerEnv r → Label (Ty Resolved.VarId) → Int → String
operationName env (Label effect _ _) index = fromMaybe "" do
  EffectId id ← userEffect effect
  found ← Array.index env.effects id
  _.name <$> Array.index found.operations index
  where
  userEffect = case _ of
    UserEffect id → Just id
    _ → Nothing

-- c's labels consumed into C (Directional, `Fail` kept, origin the handler
-- span), then c is registered as a clause of a new group and its tail
-- watched. Registered after the body, so the clause's own `sync`s do not
-- see it; the handler node's `sync` finds it pending.
file
  ∷ ∀ r
  . HandlerEnv r
  → Setup
  → Ids
  → TyRow Open
  → Checked.HandlerClause
  → State
  → Either Diagnostic State
file env setup ids row clause state = do
  consumed ← consumeLabels env state
    { origin
    , sources: map snd kept
    , labels: map fst kept
    , target: setup.clauses
    , sites: []
    , ignoreMarks: false
    }
  pure consumed
    { subst = watchTail tail consumed.subst
    , restricted = registerClause ids.clause group entry consumed.restricted
    }
  where
  origin ∷ Origin
  origin = { span: setup.span, consumed: Application, via: Nothing }
  Row labels found = resolvedRow state.subst row
  kept = placed state labels row
  tail = case found of
    Just (Hole meta) → meta
    _ → ids.tail
  group = { representative: tail, remainder: openRow ids.phi }
  entry =
    { row
    , inference: setup.inference
    , clauses: setup.clauses
    , own: setup.own
    , handler: setup.span
    , clause: clause.span
    , operation: operationName env setup.label clause.operation
    , group: ids.clause
    , tail
    , signature: Nothing
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


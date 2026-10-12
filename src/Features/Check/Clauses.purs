module Features.Check.Clauses (checkClauses) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe(..), fromMaybe)
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
  , normalMark
  )
import Domain.Syntax (Diagnostic, Span)
import Domain.Type (Ty, TyRow)
import Features.Check.ClauseBody (HandlerEnv, handlerClause, openLabel)
import Features.Check.Consume (consumeBare)
import Features.Check.Context (Infer, Locals)
import Features.Check.Defer (placed)
import Features.Check.Walked (End(..), bareLabel, endOf, walkedRow)
import Features.Check.Provenance (Consumed(ClauseRow), Origin)
import Features.Check.Restricted (registerClause)
import Features.Check.Scheme (State, Threaded, threadAll)
import Features.Check.Watch (watchTail)

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
  rows =
    { inference: openRow state.next, clauses: Just (openRow (state.next + 1)) }
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
-- span) as bare labels: C keeps no arguments of its own, R holds them. Then
-- c is registered as a clause of a new group and its tail watched.
-- Registered after the body, so the clause's own `sync`s do not see it; the
-- handler node's `sync` finds it pending.
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
  consumed ← consumeBare env state
    { origin
    , sources: map snd kept
    , labels: map (bareLabel state.subst <<< fst) kept
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
  origin = { span: setup.span, consumed: ClauseRow, via: Nothing }
  Row labels _ = walkedRow state.subst row
  kept = placed state labels row
  tail = case endOf state.subst row of
    Loose meta → meta
    _ → ids.tail
  group = { representative: tail, remainder: openRow ids.phi }
  entry =
    { row
    , inference: setup.inference
    , clauses: setup.clauses
    , own: setup.own
    , label: openLabel setup.label
    , handler: setup.span
    , clause: clause.span
    , operation: operationName env setup.label clause.operation
    , group: ids.clause
    , tail
    , signature: Nothing
    }

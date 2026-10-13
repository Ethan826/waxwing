module Features.Check.ArgumentRow (argumentLacks) where

import Prelude
import Data.Array as Array
import Data.Either (Either, either, isRight)
import Data.Maybe (Maybe(..), fromMaybe)
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Note (NoteReason(..))
import Domain.Problem (CallbackKind(..), Problem(..))
import Domain.Row (Label, Row(..))
import Domain.Syntax (Diagnostic, Note, Span)
import Domain.Type (Ty(..), TyRow)
import Features.Check.CallbackParts
  ( calleeNotes
  , labelsOf
  , lacksProblem
  , printed
  , tailSuffix
  )
import Features.Check.Consume (consumeAt)
import Features.Check.Context (CheckEnv)
import Features.Check.Provenance as Provenance
import Features.Check.Report (noteAt)
import Features.Check.Scheme (State, flexible, flexibleRow, headOf)
import Features.Check.Unify (Failure(..), Flex, resolveRow, unify)
import Features.Check.UnifyRow (unifyRows)
import Features.Check.Use (Use)
import Features.Check.Use as Use

type Rows =
  { expected ∷ Ty Flex
  , parameter ∷ Ty Flex
  , result ∷ Ty Flex
  , wanted ∷ TyRow Flex
  , given ∷ TyRow Flex
  }

-- FX018 (b). A function passed where the parameter's row has a label the
-- function's row lacks. Only the top-level arrow row of the argument
-- against that of the parameter's type counts: the two rows are unified on
-- their own, and must fail for a label the argument's row lacks
-- (`RowMissing`, the parameter's row being the left). A mismatch anywhere
-- else, or in the other direction, is not reported here and keeps its old
-- text. `named` is the argument when it is a single-stage parameter of the
-- enclosing function. The hint writes the parameter's labels and the tail
-- of the row at the call: the callee's own row ends in it once the call is
-- consumed, so the argument's row must end in it too.
argumentLacks
  ∷ ∀ r
  . CheckEnv r
  → State
  → Use
  → Int
  → Ty Open
  → Checked.Expr
  → Maybe Provenance.Callee
  → Diagnostic
  → Maybe Diagnostic
argumentLacks env state use index expected actual named diagnostic =
  case diagnostic.problem of
    EffectNotAllowed "This function" _ →
      topRows state expected (Checked.typeOf actual)
        >>= short state
        >>= reported
    _ → Nothing
  where
  reported rows = either (const Nothing) Just
    (build env state use index named diagnostic rows)

topRows ∷ State → Ty Open → Ty Open → Maybe Rows
topRows state expected actual =
  case headOf state expected, headOf state actual of
    TFun _ wanted _, TFun parameter given result → Just
      { expected: flexible expected
      , parameter: flexible parameter
      , result: flexible result
      , wanted: flexibleRow wanted
      , given: flexibleRow given
      }
    _, _ → Nothing

short ∷ State → Rows → Maybe Rows
short state rows = either missing (const Nothing)
  (unifyRows unify state.subst rows.wanted rows.given)
  where
  missing = case _ of
    RowMissing _ _ _ → Just rows
    _ → Nothing

build
  ∷ ∀ r
  . CheckEnv r
  → State
  → Use
  → Int
  → Maybe Provenance.Callee
  → Diagnostic
  → Rows
  → Either Diagnostic Diagnostic
build env state use index named diagnostic rows = do
  row ← printed env diagnostic.span wanted
  own ← printed env diagnostic.span given
  pure
    ( diagnostic
        { problem = lacksProblem AsArgument named (subject use index)
            { row
            , own
            , suffix: tailSuffix env tail
            , writable: writes env state use diagnostic.span rows wanted tail
            }
            wanted
        , related = calleeNotes named <> parameterNotes use index
        }
    )
  where
  wanted = labelsOf (resolveRow state.subst rows.wanted)
  Row given _ = resolveRow state.subst rows.given
  Row _ tail = resolveRow state.subst (flexibleRow env.current)

-- The function and parameter an argument is passed to, when they have
-- names (a constructor's field has none).
subject ∷ Use.Use → Int → String
subject use index = fromMaybe "" do
  callee ← use.callee
  found ← Array.index callee.parameters index
  pure (callee.name <> "'s parameter " <> found.name)

parameterNotes ∷ Use.Use → Int → Array Note
parameterNotes use index = fromMaybe [] do
  callee ← use.callee
  found ← Array.index callee.parameters index
  pure
    [ noteAt (fromMaybe found.span found.rowSpan) (RowWrittenHere found.name) ]

-- Whether the row the hint writes would fix this call: the argument given
-- that row ends in the tail of the row at the call, where the callee's own
-- row ends once consumed. The parameter's labels then must also be the
-- call's whole row; a caller with more labels than the callee keeps the
-- hint's row short, and the hint is left unwritten.
writes
  ∷ ∀ r
  . CheckEnv r
  → State
  → Use
  → Span
  → Rows
  → Array (Label (Ty Flex))
  → Maybe Flex
  → Boolean
writes env state use span rows wanted tail = either (const false) fixes
  (unify state.subst rows.expected hypothetical)
  where
  hypothetical = TFun rows.parameter (Row wanted tail) rows.result
  fixes subst = isRight
    (consumeAt env (state { subst = subst }) span use.consumed use.row)

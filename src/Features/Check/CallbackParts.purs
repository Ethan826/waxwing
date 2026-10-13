module Features.Check.CallbackParts
  ( labelsOf
  , printed
  , lacksProblem
  , tailSuffix
  , calleeNotes
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe(..), maybe)
import Data.String (joinWith)
import Data.Traversable (traverse)
import Domain.Note (NoteReason(..))
import Domain.Problem (CallbackKind, Hint(..), Problem(..))
import Domain.Row (Label(..), Row(..))
import Domain.Syntax (Diagnostic, Note, Span)
import Domain.Type (Ty(..), TyRow)
import Domain.Type.Parts (children)
import Features.Check.Context (CheckEnv)
import Features.Check.Provenance (Callee)
import Features.Check.Report (noteAt)
import Features.Check.RowName (labelName, tailName)
import Features.Check.Subst (Flex)

-- Pieces shared by the callback-row diagnostics (FX017, FX018).

labelsOf ∷ TyRow Flex → Array (Label (Ty Flex))
labelsOf (Row labels _) = labels

-- Labels as the headline prints them: `L + M`, payload rows left out.
printed
  ∷ ∀ r
  . CheckEnv r
  → Span
  → Array (Label (Ty Flex))
  → Either Diagnostic String
printed env span labels = joinWith " + " <$> traverse (labelName env span)
  labels

-- The hint writes a row as written: a named tail stays, the ambient one
-- (no name) is implicit.
tailSuffix ∷ ∀ r. CheckEnv r → Maybe Flex → String
tailSuffix env = maybe "" suffix
  where
  suffix variable = tailText (tailName env variable)
  tailText name = if name == "" then "" else " + ..." <> name

-- The problem and its hint. A payload's arrow rows are not printed, so a
-- row written from the text would not be the one required: the hint then
-- names no row to write, and neither does it when the row would not fix
-- the program (`writable`). `labels` are the labels the callback must allow,
-- `row` and `own` their text and the callback's.
lacksProblem
  ∷ CallbackKind
  → Maybe Callee
  → String
  → { row ∷ String, own ∷ String, suffix ∷ String, writable ∷ Boolean }
  → Array (Label (Ty Flex))
  → Problem
lacksProblem kind named subject text labels = Hinted
  (CallbackRowLacks kind (_.name <$> named) subject text.row own)
  (CallbackRow kind hinted (text.row <> text.suffix))
  where
  own = if text.own == "" then Nothing else Just text.own
  hinted =
    if not text.writable || Array.any holdsRow payloads then Nothing
    else _.name <$> named
  payloads = Array.concatMap arguments labels
  arguments (Label _ found _) = found

-- Whether a type carries a row: an arrow, a handler, or a type applied to
-- a row argument, at any depth.
holdsRow ∷ Ty Flex → Boolean
holdsRow ty = case ty of
  TFun _ _ _ → true
  THandler _ _ → true
  TData _ _ rows | not (Array.null rows) → true
  _ → Array.any holdsRow (children ty)

-- Where the callee's row is written, or that it is not (none for a function
-- value that is not a parameter).
calleeNotes ∷ Maybe Callee → Array Note
calleeNotes = maybe [] (Array.singleton <<< note)
  where
  note callee = noteAt callee.rowSpan (reason callee)
  reason callee =
    if callee.written then RowWrittenHere callee.name
    else RowNotWritten callee.name

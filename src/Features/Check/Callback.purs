module Features.Check.Callback (callbackLacks) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), fromMaybe, isNothing, maybe)
import Data.String (joinWith)
import Data.Traversable (traverse)
import Domain.Note (NoteReason(..))
import Domain.Problem (Hint(..), Problem(..))
import Domain.Row (Label, Row(..))
import Domain.Syntax (Diagnostic, Note)
import Domain.Type (Ty, TyRow)
import Features.Check.Context (CheckEnv)
import Features.Check.Occurrence (OccurrenceId(..))
import Features.Check.Provenance (Callee, Consumed(..), Origin)
import Features.Check.Report (noteAt)
import Features.Check.RowName (labelName, tailName)
import Features.Check.Scheme (State, flexibleRow)
import Features.Check.Subst (Flex, resolveRow)

-- FX017. An application of a function value whose row, closed by a rigid
-- tail, lacks a label that the caller's signature row writes. Consumption
-- pairs the callee's labels first, so a label of the callee that the
-- caller lacks (`RowMissing`) is reported before any caller label the
-- callee lacks (`RowExtra`): this is only the second kind. The current row
-- must be the signature's alone: inside a `with` or `handle` it holds
-- installed labels too, a callee's label may pair with an installed
-- duplicate, and the signature's own would be named as missing from a row
-- that prints it. An installation or `defer` crossing a boundary has a
-- `via`, and no other consumer is an `Application`.
callbackLacks
  ∷ ∀ r a
  . CheckEnv r
  → State
  → Origin
  → OccurrenceId
  → TyRow Flex
  → Maybe (Either Diagnostic a)
callbackLacks env state origin placed calleeRow = case origin.consumed of
  Application named
    | isNothing origin.via && signatureOnly env && topLevel env placed →
        Just (lacking env state origin named calleeRow)
  _ → Nothing

-- A label of the current row itself. A row nested in a label's payload is
-- unified with rows written nowhere, and its leftover is not the callee's
-- row but a part of it, which no `with` of the callee can fix.
topLevel ∷ ∀ r. CheckEnv r → OccurrenceId → Boolean
topLevel env = case _ of
  Written span _ → span == env.functionSpan
  Extended _ → false

signatureOnly ∷ ∀ r. CheckEnv r → Boolean
signatureOnly env = case env.sites of
  [ site ] → site.span == env.functionSpan
  _ → false

lacking
  ∷ ∀ r a
  . CheckEnv r
  → State
  → Origin
  → Maybe Callee
  → TyRow Flex
  → Either Diagnostic a
lacking env state origin named calleeRow = do
  caller ← printed env origin (signatureLabels env state)
  callee ← printed env origin (labelsOf calleeRow)
  Left
    { problem: Hinted
        ( CallbackRowLacks (_.name <$> named) env.functionName caller
            (nonEmpty callee)
        )
        (CallbackRow (_.name <$> named) (caller <> written))
    , span: origin.span
    , related: notes env named
    }
  where
  written = writtenTail env state
  nonEmpty text = if text == "" then Nothing else Just text

-- The hint writes the row as the caller wrote it: a named tail stays, the
-- ambient one (no name) is implicit.
writtenTail ∷ ∀ r. CheckEnv r → State → String
writtenTail env state = maybe "" named tail
  where
  Row _ tail = resolveRow state.subst (flexibleRow env.current)
  named variable = tailText (tailName env variable)
  tailText name = if name == "" then "" else " + ..." <> name

-- The labels of the current row, which is the signature's own.
signatureLabels ∷ ∀ r. CheckEnv r → State → Array (Label (Ty Flex))
signatureLabels env state =
  labelsOf (resolveRow state.subst (flexibleRow env.current))

labelsOf ∷ TyRow Flex → Array (Label (Ty Flex))
labelsOf (Row labels _) = labels

printed
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → Array (Label (Ty Flex))
  → Either Diagnostic String
printed env origin labels = joinWith " + " <$> traverse
  (labelName env origin.span)
  labels

-- Where the callee's row is written (none for a function value that is not
-- a parameter), then where the caller's is: its `with`, or, when none is
-- written, the signature.
notes ∷ ∀ r. CheckEnv r → Maybe Callee → Array Note
notes env named = maybe [] (Array.singleton <<< calleeNote) named
  <>
    [ noteAt (fromMaybe env.functionSpan env.rowSpan) (written env.functionName)
    ]
  where
  calleeNote callee = noteAt callee.rowSpan (written callee.name)
  written = RowWrittenHere

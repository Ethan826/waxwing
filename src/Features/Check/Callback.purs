module Features.Check.Callback (callbackLacks) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldl)
import Data.Maybe (Maybe(..), fromMaybe, isNothing, maybe)
import Data.Traversable (traverse)
import Domain.Note (NoteReason(..))
import Domain.Problem (CallbackKind(..))
import Domain.Row (Label, Row(..))
import Domain.Syntax (Diagnostic, Note, Span)
import Domain.Type (Ty, TyRow)
import Features.Check.CallbackParts
  ( calleeNotes
  , labelsOf
  , lacksProblem
  , printed
  , tailSuffix
  )
import Features.Check.Context (CheckEnv)
import Features.Check.LocalUses (usesOf)
import Features.Check.Occurrence (OccurrenceId(..))
import Features.Check.Provenance (Callee, Consumed(..), Origin)
import Features.Check.Report (noteAt)
import Features.Check.RowName (labelName)
import Features.Check.Scheme (State, flexibleRow)
import Features.Check.Subst (Flex, resolveRow)

-- FX017, FX018. An application of a function value whose row, closed by a
-- rigid tail, lacks a label of the row at the call. Consumption pairs the
-- callee's labels first, so a label of the callee that the caller lacks
-- (`RowMissing`) is reported before any label of the row at the call that
-- the callee lacks (`RowExtra`): this is only the second kind. The row at
-- the call is the signature's alone (FX017), or, under `with` or `handle`
-- directly in the function's body, the installed labels first (FX018). A
-- body inside a lambda has no signature site, and its row is open, so it
-- keeps the old text. An installation or `defer` crossing a boundary has a
-- `via`, and no other consumer is an `Application`. The leftover must be a
-- label of the row itself: a row nested in a label's payload is unified
-- with rows written nowhere, and its leftover is part of the callee's row,
-- which no `with` of the callee can fix.
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
    | isNothing origin.via && inFunction env && siteLabel env placed →
        Just (lacking (kindOf env) env state origin named calleeRow)
  _ → Nothing

siteLabel ∷ ∀ r. CheckEnv r → OccurrenceId → Boolean
siteLabel env = case _ of
  Written span _ → Array.any (isSite span) env.sites
  Extended _ → false
  where
  isSite span site = site.span == span

-- Directly in a function's body: its signature is the outermost site.
inFunction ∷ ∀ r. CheckEnv r → Boolean
inFunction env = map _.span (Array.last env.sites) == Just env.functionSpan

kindOf ∷ ∀ r. CheckEnv r → CallbackKind
kindOf env = if Array.length env.sites == 1 then OfCaller else AtCall

lacking
  ∷ ∀ r a
  . CallbackKind
  → CheckEnv r
  → State
  → Origin
  → Maybe Callee
  → TyRow Flex
  → Either Diagnostic a
lacking kind env state origin named calleeRow = do
  row ← printed env origin.span labels
  own ← printed env origin.span (labelsOf calleeRow)
  installed ← handled env origin.span kind labels
  Left
    { problem: lacksProblem kind named env.functionName
        { row, own, suffix: tailSuffix env tail, writable: singleUse env named }
        labels
    , span: origin.span
    , related: calleeNotes named <> installed
        <> [ noteAt (fromMaybe env.functionSpan env.rowSpan) written ]
    }
  where
  Row labels tail = resolveRow state.subst (flexibleRow env.current)
  written = RowWrittenHere env.functionName

-- Each installation's labels, innermost first as the row orders them, with
-- the `with` or `handle` that installed them. Only the row at a call under
-- an installation has any.
handled
  ∷ ∀ r
  . CheckEnv r
  → Span
  → CallbackKind
  → Array (Label (Ty Flex))
  → Either Diagnostic (Array Note)
handled env span kind labels = case kind of
  AtCall → Array.concat <$> traverse siteNotes slices
  _ → Right []
  where
  slices = (foldl slice { offset: 0, found: [] } installing).found
  installing = Array.dropEnd 1 env.sites
  slice pending site =
    { offset: pending.offset + site.count
    , found: Array.snoc pending.found { site, offset: pending.offset }
    }
  siteNotes slice' = map (note slice'.site)
    <$> traverse (labelName env span)
      (Array.take slice'.site.count (Array.drop slice'.offset labels))
  note site label = noteAt site.span (HandledHere label)

-- The hint rewrites the parameter's row for this call; any other use of the
-- parameter, outside or inside another `with`, has a row of its own to meet,
-- and no one row may serve both. The hint is written only for a parameter
-- read once in the function (a callee with no name has no hint at all).
singleUse ∷ ∀ r. CheckEnv r → Maybe Callee → Boolean
singleUse env = maybe false single
  where
  single callee = maybe false (once callee) (Array.find named env.functions)
  named function = function.name == env.functionName
  once callee function = usesOf callee.index function.body == 1

module Features.Check.MarkNotes (clausePayload, pathNotes) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe, fromMaybe, maybe')
import Data.Traversable (traverse)
import Domain.Problem (AbortCause(..), TypeName(..))
import Domain.Row (Label, Mark(..), withMark)
import Domain.Syntax (Diagnostic, Note, NoteReason(..), Span)
import Domain.Type (Ty)
import Features.Check.Context (CheckEnv)
import Features.Check.Mark (Violation)
import Features.Check.MarkStore (EdgeReason(..), MarkEdge)
import Features.Check.RowName (labelName, labelView)
import Features.Check.Scheme (State)
import Features.Check.Subst (Flex, resolveLabel)

type Edge = MarkEdge (Ty Flex)

-- The notes of a violation (design §3.6), from the demand back to the
-- source: one per frame or abort edge of the path, then the signature or
-- mark variable the path starts at. Notes never influence typing. The path
-- comes from BFS predecessors, so a duplicate edge adds no note.
pathNotes
  ∷ ∀ r. CheckEnv r → State → Violation → Either Diagnostic (Array Note)
pathNotes env state found = do
  along ← traverse (edgeNotes env state) (Array.reverse found.path)
  origin ← maybe' none (originNote env state found) (Array.head found.path)
  Right (Array.concat along <> origin)
  where
  none _ = Right []

edgeNotes ∷ ∀ r. CheckEnv r → State → Edge → Either Diagnostic (Array Note)
edgeNotes env state edge = case edge.reason of
  FrameOwn span → single span HandledHere <$> shown span
  FrameOuter span → single span ClausesReach <$> shown span
  FrameRigid span name → Right
    [ { span, reason: ClausesMayPerform ("..." <> name) } ]
  OwnAbort site → single site.clause ClauseAborts <$> abortCause env state
    edge.label
    site
  _ → Right []
  where
  shown span = unmarkedName env state span edge.label

  single ∷ ∀ a. Span → (a → NoteReason) → a → Array Note
  single span reason found = [ { span, reason: reason found } ]

-- Why the clause may abort: it fails with a payload, or performs whatever
-- the rigid tail of its row allows.
abortCause
  ∷ ∀ r
  . CheckEnv r
  → State
  → Label (Ty Flex)
  → { handler ∷ Span, clause ∷ Span, operation ∷ String, rigid ∷ Maybe String }
  → Either Diagnostic AbortCause
abortCause env state label site = maybe' failed perform site.rigid
  where
  perform name = Right (ClauseMayPerform site.operation ("..." <> name))
  failed _ = ClauseFails site.operation <$> clausePayload env state label
    site.handler

clausePayload
  ∷ ∀ r
  . CheckEnv r
  → State
  → Label (Ty Flex)
  → Span
  → Either Diagnostic TypeName
clausePayload env state label span = payload <$> labelView env span
  (resolveLabel state.subst label)
  where
  payload view = fromMaybe HoleName (Array.head view.arguments)

-- A path from `Plain` that begins at the declaration's own row (P1: an
-- assumed edge, or a demand on a label the signature wrote), or from a
-- rigid mark variable.
originNote
  ∷ ∀ r
  . CheckEnv r
  → State
  → Violation
  → Edge
  → Either Diagnostic (Array Note)
originNote env state found first = case found.start, first.reason of
  MarkVariable variable, _ → origin (MarkVariableHere variable)
  Plain, Assumed _ → origin (SignatureMayFail env.functionName)
  Plain, DeferDemand _ → origin (SignatureMayFail env.functionName)
  _, _ → Right []
  where
  span = fromMaybe env.functionSpan env.rowSpan
  origin reason = single reason <$> unmarkedName env state span first.label
  single reason label = [ { span, reason: reason label } ]

unmarkedName
  ∷ ∀ r
  . CheckEnv r
  → State
  → Span
  → Label (Ty Flex)
  → Either Diagnostic String
unmarkedName env state span label = labelName env span
  (withMark Unmarked (resolveLabel state.subst label))

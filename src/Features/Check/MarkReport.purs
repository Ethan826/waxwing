module Features.Check.MarkReport (reportViolation) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe, fromMaybe, maybe, maybe')
import Domain.Problem (AbortCause(..), Problem(..), TypeName(..))
import Domain.Row (Label, Mark(..), withMark)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty)
import Features.Check.Context (CheckEnv)
import Features.Check.Mark (Violation)
import Features.Check.MarkStore (EdgeReason(..), MarkEdge, reasonSpan)
import Features.Check.RowName (labelName, labelView)
import Features.Check.Scheme (State)
import Features.Check.Subst (Flex, resolveLabel)

-- A violation as a diagnostic (P6). The headline follows the path's last
-- edge: a defer demand, a handler's own abort, else a call or a frame that
-- expected N. Notes are Task 10's.
reportViolation
  ∷ ∀ r. CheckEnv r → State → Violation → Either Diagnostic Diagnostic
reportViolation env state found = maybe unreachable headlined
  (Array.last found.path)
  where
  unreachable = Left (problemAt (Internal "Empty mark path") env.functionSpan)
  headlined edge = case edge.reason of
    DeferDemand span → deferHeadline env state found span edge
    OwnAbort site → abortHeadline env state edge.label site
    reason → expectedHeadline env state found (reasonSpan reason) edge

deferHeadline
  ∷ ∀ r
  . CheckEnv r
  → State
  → Violation
  → Span
  → MarkEdge (Ty Flex)
  → Either Diagnostic Diagnostic
deferHeadline env state found span edge = problem <$> labelName env span
  (withMark Unmarked (resolveLabel state.subst edge.label))
  where
  problem name = noted span case found.start of
    MarkVariable variable → DeferHandlerVariable variable name
    _ → DeferHandlerMayFail name

abortHeadline
  ∷ ∀ r
  . CheckEnv r
  → State
  → Label (Ty Flex)
  → { handler ∷ Span, clause ∷ Span, operation ∷ String, rigid ∷ Maybe String }
  → Either Diagnostic Diagnostic
abortHeadline env state label site = maybe' failed perform site.rigid
  where
  perform name = Right
    ( noted site.handler
        (HandlerMayFail (ClauseMayPerform site.operation ("..." <> name)))
    )
  failed _ = payloaded <$> labelView env site.handler
    (resolveLabel state.subst label)
  payloaded view = noted site.handler
    ( HandlerMayFail
        ( ClauseFails site.operation
            (fromMaybe HoleName (Array.head view.arguments))
        )
    )

expectedHeadline
  ∷ ∀ r
  . CheckEnv r
  → State
  → Violation
  → Span
  → MarkEdge (Ty Flex)
  → Either Diagnostic Diagnostic
expectedHeadline env state found span edge = do
  wanted ← shown found.end
  seen ← shown found.start
  Right (noted span (ExpectedNofail wanted seen))
  where
  shown mark = labelName env span
    (withMark mark (resolveLabel state.subst edge.label))

noted ∷ Span → Problem → Diagnostic
noted span problem = { problem, span, related: [] }

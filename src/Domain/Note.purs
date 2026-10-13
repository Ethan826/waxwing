module Domain.Note where

import Domain.Problem (AbortCause)

-- Why a note is attached (FX001 design §6); Format.Diagnostic.Note gives
-- each its text. `ContinuesInto` is internal: Features.Check replaces it,
-- before reporting, with the path through the named function's body.
data NoteReason
  = PerformedHere String
  | FromCallOf String String
  | FromFunctionValue String
  | RaisedHere String
  | ThroughFunction String
  | MoreCalls Int
  | SignatureForbids String String
  | SignatureAmbient String
  | MustBePureParameter
  | RowWrittenHere String
  | RowNotWritten String
  | HandledHere String
  | MainOnlyConsole
  | CleanupMustNotFail
  | FailAlternatives
  | DeclaredHere String
  | InnermostHere String
  | ContinuesInto String Int String
  -- The notes of a mark rejection (FX008 design §3.6): a frame, a clause
  -- that may abort, and the signature or mark variable the path starts at.
  | ClausesReach String
  | ClausesMayPerform String
  | ClauseAborts AbortCause
  | SignatureMayFail String String
  | MarkVariableHere String String

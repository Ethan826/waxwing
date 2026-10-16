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
  -- FX020 §3: the bare notes of the duplicate-binding errors.
  | EffectDeclaredHere
  | FirstImportedHere
  | FirstBoundHere
  -- R001: the first of two uses of a field label or a row variable.
  | FirstWrittenHere
  -- R001: the signature's `...r` that introduces a record row variable.
  | IntroducedHere String
  -- R005: the label of a written `where r lacks { … }` a call violates.
  | RequiredHere
  | InnermostHere String
  | ContinuesInto String Int String
  -- The notes of a mark rejection (FX008 design §3.6): a frame, a clause
  -- that may abort, and the signature or mark variable the path starts at.
  | ClausesReach String
  | ClausesMayPerform String
  | ClauseAborts AbortCause
  | SignatureMayFail String String
  | MarkVariableHere String String

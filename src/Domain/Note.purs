module Domain.Note where

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
  | HandledHere String
  | MainOnlyConsole
  | CleanupMustNotFail
  | FailAlternatives
  | DeclaredHere String
  | InnermostHere String
  | ContinuesInto String Int String

module Format.Diagnostic
  ( WireDiagnostic
  , module Format.Diagnostic.Code
  , message
  , typeName
  , wire
  ) where

import Prelude
import Domain.Problem
  ( DuplicateKind(..)
  , EntryKind(..)
  , Hint(..)
  , Problem(..)
  , TypeName
  , UnboundKind(..)
  , Witness(..)
  )
import Domain.Syntax (Diagnostic, Span)
import Format.Diagnostic.Callback as Callback
import Format.Diagnostic.Code (code, codeName)
import Format.Diagnostic.Mark as Mark
import Format.Diagnostic.Name (listed)
import Format.Diagnostic.Name as Name
import Format.Diagnostic.Note (WireNote, wireNotes)
import Format.Diagnostic.Qualify as Qualify
import Format.Diagnostic.Row (equalityMessage, mismatchMessage, shortLabel)

type WireDiagnostic =
  { code ∷ String, message ∷ String, span ∷ Span, related ∷ Array WireNote }

message ∷ Problem → String
message = case _ of
  Lexical → "Unexpected character"
  Syntax text → text
  IntegerOutOfRange → "Integer literal is outside signed 32-bit range"
  NestingTooDeep limit → "Nesting exceeds " <> show limit <> " levels"
  TypeTooDeep limit → "Inferred type nesting exceeds " <> show limit
    <> " levels"
  EntryProblem kind → entryMessage kind
  Duplicate kind name → "Duplicate " <> duplicateWord kind <> " " <> name
  Unbound kind name → "Unbound " <> unboundWord kind <> " " <> name
  NotCallable name → "Local is not callable: " <> name
  CtorNotCallable name → "Constructor is not callable: " <> name
  FunctionNeedsCall name → "Expected " <> name <> "()"
  Arity → "Wrong number of arguments"
  FieldArity → "Wrong number of fields"
  TypeArguments name → "Wrong number of type arguments for " <> name
  TypeMismatch expected found → "Expected " <> typeName expected
    <> ", found "
    <> typeName found
  NotAFunction found → "Expected a function, found " <> typeName found
  InfiniteType meta whole → "Infinite type: " <> typeName meta
    <> " occurs in "
    <> typeName whole
  NotComparable ty → "Type " <> typeName ty <> " is not comparable"
  AmbiguousType ty → "Ambiguous type " <> typeName ty <> " in comparison"
  PolymorphicRecursion name → "Recursive call to " <> name
    <> " changes its type arguments"
  NestedDatatype name → "Recursive use of " <> name
    <> " changes its type arguments"
  SpecializationLimit limit → "More than " <> show limit <> " specializations"
  RedundantArm → "Redundant match arm"
  NonExhaustive witness → "Missing pattern: " <> pattern witness
  Internal text → text
  Hinted problem hint → message problem <> hintMessage hint
  EffectNotAllowed name label → name <> " performs " <> shortLabel label
    <> ", which its signature does not allow"
  CallbackRowLacks kind callee subject row own →
    Callback.headline kind callee subject row own
  UnhandledEffect label → "Unhandled " <> shortLabel label <> " in main"
  MustBePure label → "This function must be pure, but it performs "
    <> shortLabel label
  RowSort true → "Expected an effect row, found a type"
  RowSort false → "Expected a type, found an effect row"
  RecordRowAsEffect name → name <> " is a record row, not an effect row"
  EffectRowAsRecord name → name <> " is an effect row, not a record row"
  NotPrintable ty → "Expected a printable value, found " <> typeName ty
  DeferMayFail label → "defer must not fail, but it performs "
    <> shortLabel label
  DeferMayPerform tail →
    "defer must not fail, but it may perform any effect of "
      <> tail
  RowEquality left right tail → equalityMessage left right tail
  LabelMismatch expected found → mismatchMessage expected found
  HandlerMissing operation → "Missing clause for " <> operation
  HandlerDuplicate operation → "Duplicate clause for " <> operation
  HandlerOperation operation effect → operation
    <> " is not an operation of "
    <> effect
  FailNeedsConcrete → "Fail needs a concrete error family"
  ExpectedHandler _ → "Expected a handler"
  NofailOnFail → "nofail does not apply to Fail"
  MarkVariableOutsideSignature name → "nofail(" <> name
    <> ") is allowed only in function signatures"
  DeferHandlerMayFail label → Mark.deferFails label
  DeferHandlerVariable name label → Mark.deferVariable name label
  ExpectedNofail expected found → Mark.expected expected found
  HandlerMayFail cause → Mark.handlerFails typeName cause

wire ∷ Diagnostic → WireDiagnostic
wire diagnostic =
  { code: codeName (code diagnostic.problem)
  , message: text
  , span: diagnostic.span
  , related: notes
  }
  where
  text = message diagnostic.problem
  -- Only the effect and label diagnostics carry notes; the rest never read
  -- the field, so a diagnostic built without it still renders.
  notes =
    if noted diagnostic.problem then wireNotes text diagnostic.related else []

noted ∷ Problem → Boolean
noted = case _ of
  EffectNotAllowed _ _ → true
  CallbackRowLacks _ _ _ _ _ → true
  Hinted problem _ → noted problem
  Duplicate DuplicateField _ → true
  RecordRowAsEffect _ → true
  EffectRowAsRecord _ → true
  UnhandledEffect _ → true
  MustBePure _ → true
  RowEquality _ _ _ → true
  LabelMismatch _ _ → true
  DeferMayFail _ → true
  DeferMayPerform _ → true
  FailNeedsConcrete → true
  Syntax _ → true
  DeferHandlerMayFail _ → true
  DeferHandlerVariable _ _ → true
  ExpectedNofail _ _ → true
  HandlerMayFail _ → true
  _ → false

entryMessage ∷ EntryKind → String
entryMessage = case _ of
  MissingEntry → "Expected fn main()"
  EntryParameters → "main must have no parameters"
  EntryPolymorphic → "Expected fn main() with a concrete result type"
  EntryFunction → "Expected fn main() with a printable result type"

hintMessage ∷ Hint → String
hintMessage = case _ of
  MissingArguments name count → "; missing " <> counted count
    <> " to "
    <> name
    <> "?"
  TrailingSemicolon → "; remove the trailing ;?"
  QualifyOperation name effects → Qualify.hint name effects
  CallbackRow kind name row → "; " <> Callback.hint kind name row
  where
  counted count
    | count == 1 = "1 argument"
    | otherwise = show count <> " arguments"

duplicateWord ∷ DuplicateKind → String
duplicateWord = case _ of
  DuplicateType → "type"
  DuplicateConstructor → "constructor"
  DuplicateFunction → "function"
  DuplicateParameter → "parameter"
  DuplicateBinder → "binder"
  DuplicateTypeParameter → "type parameter"
  DuplicateEffect → "effect"
  DuplicateOperation → "operation"
  DuplicateField → "field"

unboundWord ∷ UnboundKind → String
unboundWord = case _ of
  UnboundLocal → "local"
  UnboundFunction → "function"
  UnboundConstructor → "constructor"
  UnboundType → "type"
  UnboundTypeVariable → "type variable"
  UnboundMarkVariable → "mark variable"

typeName ∷ TypeName → String
typeName = Name.typeName

-- Witnesses print as Waxwing patterns: `_`, literals, `Name(field, …)`.
pattern ∷ Witness → String
pattern = case _ of
  WAny → "_"
  WInt value → show value
  WBool value → show value
  WCtor name fields → name <> listed (map pattern fields)

module Format.Diagnostic.Code (code, codeName) where

import Domain.Problem (Problem(..))
import Domain.Syntax (ErrorCode)
import Domain.Syntax as Code

code ∷ Problem → ErrorCode
code = case _ of
  Lexical → Code.LexError
  Syntax _ → Code.SyntaxError
  IntegerOutOfRange → Code.IntegerRange
  NestingTooDeep _ → Code.NestingLimit
  TypeTooDeep _ → Code.NestingLimit
  EntryProblem _ → Code.EntryError
  Duplicate _ _ → Code.DuplicateName
  Unbound _ _ → Code.UnboundName
  NotCallable _ → Code.NotCallable
  CtorNotCallable _ → Code.NotCallable
  FunctionNeedsCall _ → Code.ArityMismatch
  Arity → Code.ArityMismatch
  FieldArity → Code.ArityMismatch
  TypeArguments _ → Code.ArityMismatch
  TypeMismatch _ _ → Code.TypeMismatch
  NotAFunction _ → Code.TypeMismatch
  InfiniteType _ _ → Code.TypeMismatch
  NotComparable _ → Code.TypeMismatch
  AmbiguousType _ → Code.TypeMismatch
  PolymorphicRecursion _ → Code.SpecializationError
  NestedDatatype _ → Code.SpecializationError
  SpecializationLimit _ → Code.SpecializationError
  RedundantArm → Code.Redundant
  NonExhaustive _ → Code.NonExhaustive
  Internal _ → Code.InternalError
  Hinted problem _ → code problem
  EffectNotAllowed _ _ → Code.EffectError
  CallbackRowLacks _ _ _ _ _ → Code.EffectError
  UnhandledEffect _ → Code.EffectError
  MustBePure _ → Code.EffectError
  RowEquality _ _ _ → Code.EffectError
  LabelMismatch _ _ → Code.TypeMismatch
  RowSort _ → Code.TypeMismatch
  RecordRowAsEffect _ → Code.TypeMismatch
  EffectRowAsRecord _ → Code.TypeMismatch
  NotPrintable _ → Code.TypeMismatch
  MissingField _ _ → Code.TypeMismatch
  ExpectedRecord _ → Code.TypeMismatch
  PatternMissingField _ → Code.TypeMismatch
  PatternMissingRest _ → Code.TypeMismatch
  SecondSpread → Code.TypeMismatch
  TypeAsRecordRow _ → Code.TypeMismatch
  RowMayHaveField _ _ → Code.TypeMismatch
  DeferMayFail _ → Code.EffectError
  DeferMayPerform _ → Code.EffectError
  HandlerMissing _ → Code.HandlerError
  HandlerDuplicate _ → Code.HandlerError
  HandlerOperation _ _ → Code.HandlerError
  FailNeedsConcrete → Code.TypeMismatch
  ExpectedHandler _ → Code.TypeMismatch
  NofailOnFail → Code.TypeMismatch
  MarkVariableOutsideSignature _ → Code.TypeMismatch
  DeferHandlerMayFail _ → Code.EffectError
  DeferHandlerVariable _ _ → Code.EffectError
  ExpectedNofail _ _ → Code.EffectError
  HandlerMayFail _ → Code.EffectError

codeName ∷ ErrorCode → String
codeName = case _ of
  Code.LexError → "E_LEX"
  Code.SyntaxError → "E_SYNTAX"
  Code.IntegerRange → "E_INTEGER"
  Code.NestingLimit → "E_NESTING"
  Code.EntryError → "E_ENTRY"
  Code.DuplicateName → "E_DUPLICATE"
  Code.UnboundName → "E_UNBOUND"
  Code.NotCallable → "E_NOT_CALLABLE"
  Code.TypeMismatch → "E_TYPE"
  Code.InternalError → "E_INTERNAL"
  Code.ArityMismatch → "E_ARITY"
  Code.Redundant → "E_REDUNDANT"
  Code.NonExhaustive → "E_NON_EXHAUSTIVE"
  Code.SpecializationError → "E_SPECIALIZATION"
  Code.EffectError → "E_EFFECT"
  Code.HandlerError → "E_HANDLER"

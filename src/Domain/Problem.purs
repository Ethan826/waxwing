module Domain.Problem where

import Prelude (class Eq)
import Data.Maybe (Maybe)
import Data.Tuple (Tuple)

-- What went wrong, as data. Features never write diagnostic text; Format
-- renders it, so a change of surface syntax changes only Format.

-- `HoleName` is a type checking left open, rendered `_`. `FunctionName`
-- is one arrow, parameter then result, curried like `Ty`'s; its row text is
-- present only when the row holds a `nofail` label (FX008).
data TypeName
  = IntName
  | BoolName
  | UnitName
  | TextName
  | DataName String
  | AppliedName String (Array TypeName)
  | VariableName String
  | HoleName
  -- Fields sorted by label, and the tails' names (`...r`), if it has any.
  | RecordName (Array (Tuple String TypeName)) (Array String)
  | FunctionName TypeName (Maybe String) TypeName

derive instance eqTypeName ∷ Eq TypeName

-- An effect label as names (FX001 design §6): its effect and arguments, so
-- a mismatch can elide the arguments off the path to the difference.
type LabelName = { effect ∷ String, arguments ∷ Array TypeName }

-- A row as a comparison prints it: each label's text, whether the other
-- row lacks it, and the tail (`...r`), if the row has one. Format
-- abbreviates it; the labels are not cut here.
type RowText =
  { labels ∷ Array { text ∷ String, differs ∷ Boolean }
  , tail ∷ Maybe String
  }

-- A missing value, with constructor names already resolved. A record
-- holds every known field in label order and whether its type is open.
data Witness
  = WAny
  | WCtor String (Array Witness)
  | WInt Int
  | WBool Boolean
  | WRecord (Array (Tuple String Witness)) Boolean

data UnboundKind
  = UnboundLocal
  | UnboundFunction
  | UnboundConstructor
  | UnboundType
  | UnboundTypeVariable
  | UnboundMarkVariable

data DuplicateKind
  = DuplicateType
  | DuplicateConstructor
  | DuplicateFunction
  | DuplicateParameter
  | DuplicateBinder
  | DuplicateTypeParameter
  | DuplicateEffect
  | DuplicateOperation
  | DuplicateField

data EntryKind
  = MissingEntry
  | EntryParameters
  | EntryPolymorphic
  | EntryFunction

-- What a diagnostic suggests beside its problem: a partial application
-- of the named function or constructor, short of this many arguments; or
-- a block whose trailing `;` made it Unit (FX001 design §1).
data Hint
  = MissingArguments String Int
  | TrailingSemicolon
  -- An unbound bare operation name (FX020): the name and the effects that
  -- declare it, built-ins first, then in declaration order, each with its
  -- parameter names (FX022). Never chosen.
  | QualifyOperation String (Array Candidate)
  -- A callback row that lacks a label (FX017, FX018): the callback's name,
  -- when it has one, and the row as `with` should write it.
  | CallbackRow CallbackKind (Maybe String) String

-- An effect that declares an operation, and its parameters as written.
type Candidate = { name ∷ String, parameters ∷ Array String }

-- Where a callback's row falls short: of its caller's signature row
-- (FX017), of the row at a call under `with` or `handle`, or of the
-- parameter a function is passed to (FX018).
data CallbackKind = OfCaller | AtCall | AsArgument

-- Why a handler may fail (FX008 design §3.6): a clause fails with a payload,
-- or its tail is a rigid row that may hold a `Fail` (its text: `...e`).
data AbortCause
  = ClauseFails String TypeName
  | ClauseMayPerform String String

-- The lexer and parser are Format, so their payloads may be text.
data Problem
  = Lexical
  | Syntax String
  | IntegerOutOfRange
  | NestingTooDeep Int
  | TypeTooDeep Int
  | EntryProblem EntryKind
  | Duplicate DuplicateKind String
  | Unbound UnboundKind String
  | NotCallable String
  | CtorNotCallable String
  | FunctionNeedsCall String
  | Arity
  | FieldArity
  | TypeArguments String
  | TypeMismatch TypeName TypeName
  | NotAFunction TypeName
  | InfiniteType TypeName TypeName
  | NotComparable TypeName
  | AmbiguousType TypeName
  | PolymorphicRecursion String
  | NestedDatatype String
  | SpecializationLimit Int
  | RedundantArm
  | NonExhaustive Witness
  | Internal String
  -- Rendered as its problem, with the hint after; code and span unchanged.
  | Hinted Problem Hint
  | EffectNotAllowed String String
  -- FX017, FX018: the kind, a callback's name (none for an anonymous
  -- function value), the subject the kind names (the caller, or the
  -- function and parameter an argument is passed to; empty when unnamed),
  -- the row it must allow and the callback's (none when it has no labels).
  -- The labels arrive printed.
  | CallbackRowLacks CallbackKind (Maybe String) String String (Maybe String)
  | UnhandledEffect String
  | MustBePure String
  | RowSort Boolean
  -- R001: a row variable used at both sorts; its name. The first use
  -- fixed the sort named (record row, or effect row).
  | RecordRowAsEffect String
  | EffectRowAsRecord String
  | NotPrintable TypeName
  -- R001: a label the record's type does not hold, and that type; a
  -- field read or updated on a value that is no record, and its type.
  | MissingField String TypeName
  | ExpectedRecord TypeName
  -- R004: a record pattern without `...` that leaves out a known field
  -- (the first in label order), or the open rest of its type (the type).
  | PatternMissingField String
  | PatternMissingRest TypeName
  -- R005: a second `...` in one record literal (until Tranche B), and a
  -- `where` constraint on a type variable, by name (design §2, §5).
  | SecondSpread
  | TypeAsRecordRow String
  -- R001: a record row variable of the enclosing signature and a label a
  -- type written in the body puts beside it, which it may already hold.
  | RowMayHaveField String String
  -- R005: a label a call's argument puts in a row a written `where r lacks
  -- { … }` forbids it, and the clause's variable (design §5).
  | LackedField String String
  | DeferMayFail String
  | DeferMayPerform String
  | RowEquality RowText RowText String
  | LabelMismatch LabelName LabelName
  | HandlerMissing String
  | HandlerDuplicate String
  | HandlerOperation String String
  | FailNeedsConcrete
  | ExpectedHandler TypeName
  | NofailOnFail
  | MarkVariableOutsideSignature String
  -- The mark check (FX008 Task 9): labels arrive printed, marks included.
  | DeferHandlerMayFail String
  | DeferHandlerVariable String String
  | ExpectedNofail String String
  | HandlerMayFail AbortCause

-- The subject of the effect error for a function value met in unification
-- (Features.Check.Require). Named once so that the passes refining that
-- error (Features.Check.ArgumentRow) match the constructor and this subject,
-- not a copy of the text. A constructor of its own would be the structural
-- signal, but Format.Diagnostic is at its line cap and would need three more
-- arms (code, message, notes) for what is the same error.
thisFunction ∷ String
thisFunction = "This function"

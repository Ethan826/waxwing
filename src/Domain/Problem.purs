module Domain.Problem
  ( module Domain.Problem
  , module Domain.Problem.Names
  , module Domain.Problem.Merge
  ) where

import Data.Maybe (Maybe)
import Domain.Problem.Merge
  ( Fault(..)
  , MergeAtom(..)
  , MergeHint(..)
  , MustBe
  , Subject(..)
  , Undetermined
  )
import Domain.Problem.Names (LabelName, RowText, TypeName(..), Witness(..))

-- What went wrong, as data. Features never write diagnostic text; Format
-- renders it, so a change of surface syntax changes only Format.

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
  -- Two rows that are not known to be disjoint: the clause to write.
  | RequireDisjoint String String

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
  -- R005: a `where` constraint on a type variable, by name (design §5).
  -- (Tranche A's refusal of a second `...` in one literal retired in
  -- Tranche B Task 7.)
  | TypeAsRecordRow String
  -- R001: a record row variable of the enclosing signature and a label a
  -- type written in the body puts beside it, which it may already hold.
  | RowMayHaveField String String
  -- R005: a label a call's argument puts in a row a written `where r lacks
  -- { … }` forbids it, and the clause's variable (design §5).
  | LackedField String String
  -- R005 Tranche B (design §8, §10): a tail written twice in one record, a
  -- `where r disjoint r`, and two tails of a body type the signature does
  -- not say are disjoint.
  | RepeatedTail String
  | SameDisjoint
  | NotKnownDisjoint String String
  -- Tranche B Task 3: a label two disjoint rows both hold, with the
  -- variables of the clause or type that says they are disjoint (D2); a
  -- rigid tail in both rows (D3').
  | InBothRecords String String String
  | InBothRows String
  -- Tranche B B5: D4 (the body undetermined) and D6 (a predicate's
  -- contradiction), Domain.Problem.Merge.
  | CannotTell Undetermined
  | MustBeRow MustBe
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

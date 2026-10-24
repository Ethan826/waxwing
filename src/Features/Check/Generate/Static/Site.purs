-- trusted surface: every diff needs token review; see docs/engineering.md
-- Where today's code raises the refusals R0 Task 2.3 classifies: one
-- constructor per raise site, grouped by what the site reads, each
-- cited by file:line in test/r0-static.test.mjs (which checks the line).
module Features.Check.Generate.Static.Site
  ( AritySite(..)
  , EffectSite(..)
  , HandlerSite(..)
  , MarkSite(..)
  , NameSite(..)
  , PolicySite(..)
  , RaiseSite(..)
  , SettledSite(..)
  , TypeSite(..)
  ) where

data RaiseSite
  = ArityAt AritySite
  | NameAt NameSite
  | TypeAt TypeSite
  | HandlerAt HandlerSite
  | PolicyAt PolicySite
  | EffectAt EffectSite
  | MarkAt MarkSite
  | SettledAt SettledSite

-- `Arity` raised by check.
data AritySite
  = PipeFixedResult
  | PipeFunctionLike
  | CallFixedResult
  | CallFunctionLike
  | CallWithoutArguments
  | ShowArguments
  | PrintArguments
  | CrashArguments

-- Names and their counts: `EntryProblem` (Resolve, and `main`'s
-- printable result at check), `Arity` in Resolve, `FieldArity`,
-- `FunctionNeedsCall`.
data NameSite
  = EntryMissing
  | EntryShape
  | EntryPrintable
  | ClauseParameters
  | FailArguments
  | PatternFields
  | OperationNeedsCall
  | FunctionNeedsCall

-- Written types and labels, in Resolve: `TypeArguments`,
-- `FailNeedsConcrete`, `NofailOnFail`, `MarkVariableOutsideSignature`.
data TypeSite
  = LabelArguments
  | TypeArgumentCount
  | HandlerArguments
  | FailPayloadWritten
  | NofailLabel
  | MarkVariableWritten

-- Handler clauses against declared operations, in Resolve.
data HandlerSite
  = MissingClause
  | DuplicateClause
  | ClauseOperation
  | ImportedOperation
  | QualifiedOperation

-- `SameDisjoint` and `RepeatedTail` (twice), in Resolve.
data PolicySite
  = DisjointSame
  | TailTwiceInRecord
  | TailTwiceThroughType

-- Effect refusals raised by check.
data EffectSite
  = ConsumedNotAllowed
  | RequiredNotAllowed
  | RequiredPure
  | ArgumentRowEquality
  | SharedTailEquality
  | CallbackLacks
  | MainUnhandled
  | HandlerExpected

-- The deferral and mark checks, on settled rows.
data MarkSite
  = DeferredFails
  | DeferredPerforms
  | DeferredHandlerFails
  | DeferredHandlerVariable
  | NofailExpected
  | HandlerFails

-- Checks of a settled type: a Fail payload, coverage, comparability.
data SettledSite
  = FailPayloadSettled
  | ArmRedundant
  | MatchNonExhaustive
  | AmbiguousOperand

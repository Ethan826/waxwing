-- Where each `Problem` is raised and what it is there (R0 Task 3.2;
-- Task 2.3 carry): a typed path from a raised problem to its class. A
-- refusal Task 2.3 classified gives its raise sites, each classed by
-- `staticClass`; every other names the phases that raise it, with the
-- class each phase gives. test/r0-static-problem.test.mjs injects every
-- constructor, checks each against its table of reasons and cited raise
-- lines, and that every line naming one is in a phase given here.
module Features.Check.Generate.Static.Problem
  ( Disposition(..)
  , Placement(..)
  , disposition
  ) where

import Data.Array.NonEmpty (NonEmptyArray, cons')
import Domain.Problem (Problem(..))
import Domain.Problem as Problem
import Domain.Verdict (StaticCode(..))
import Features.Check.Generate.Static.Site
  ( AritySite(..)
  , EffectSite(..)
  , HandlerSite(..)
  , MarkSite(..)
  , NameSite
      ( ClauseParameters
      , EntryMissing
      , EntryPrintable
      , EntryShape
      , FailArguments
      , OperationNeedsCall
      , PatternFields
      )
  , PolicySite(..)
  , RaiseSite(..)
  , SettledSite(..)
  , TypeSite(..)
  )
import Features.Check.Generate.Static.Site as Site

data Disposition
  = AtSites (NonEmptyArray RaiseSite)
  | Placed (NonEmptyArray Placement)

-- `BeforeResolution`: the lexer or parser; there is no resolved syntax,
-- so no problem and no static refusal beside one (T-R0b §8).
-- `ResolveRule`: class a, raised in Resolve. `ResolveSemantic`: a
-- body-type `lacks`/`disjoint` check still made in Resolve, semantic and
-- decided to move into generation (T-R0b §3.2 note, §18.69 Q4).
-- `ResolveSupport`: a second spread, a support limitation (S1, §18.69
-- Q4). `CheckSemantic`: raised by check on the solver's types, left to
-- the verdict. `ProgramWide`: a whole-program stage after the bodies.
-- `Lowering`: specialization. `ResourceLimit`: an inferred type's depth
-- bound (`InferredTypeDepth`). `Fault`: an internal error, never a
-- refusal (ruling R3).
data Placement
  = BeforeResolution
  | ResolveRule StaticCode
  | ResolveSemantic
  | ResolveSupport
  | CheckSemantic
  | ProgramWide
  | Lowering
  | ResourceLimit
  | Fault

disposition ∷ Problem → Disposition
disposition = case _ of
  Lexical → placed BeforeResolution []
  Syntax _ → placed BeforeResolution []
  IntegerOutOfRange → placed BeforeResolution []
  NestingTooDeep _ → placed BeforeResolution []
  TypeTooDeep _ → placed ResourceLimit []
  EntryProblem _ → sites (NameAt EntryMissing)
    [ NameAt EntryShape, NameAt EntryPrintable ]
  Duplicate _ _ → placed (ResolveRule StaticDuplicate) [ CheckSemantic ]
  Unbound _ _ → placed (ResolveRule StaticUnbound) []
  NotCallable _ → placed (ResolveRule StaticNotCallable) []
  CtorNotCallable _ → placed (ResolveRule StaticNotCallable) []
  Problem.FunctionNeedsCall _ → sites (NameAt OperationNeedsCall)
    [ NameAt Site.FunctionNeedsCall ]
  Arity → sites (ArityAt PipeFixedResult)
    [ ArityAt PipeFunctionLike
    , ArityAt CallFixedResult
    , ArityAt CallFunctionLike
    , ArityAt CallWithoutArguments
    , ArityAt ShowArguments
    , ArityAt PrintArguments
    , ArityAt CrashArguments
    , NameAt ClauseParameters
    , NameAt FailArguments
    ]
  FieldArity → sites (NameAt PatternFields) []
  TypeArguments _ → sites (TypeAt LabelArguments)
    [ TypeAt TypeArgumentCount, TypeAt HandlerArguments ]
  TypeMismatch _ _ → placed CheckSemantic []
  NotAFunction _ → placed CheckSemantic []
  InfiniteType _ _ → placed CheckSemantic []
  NotComparable _ → placed CheckSemantic []
  AmbiguousType _ → sites (SettledAt AmbiguousOperand) []
  PolymorphicRecursion _ → placed ProgramWide []
  NestedDatatype _ → placed ProgramWide []
  SpecializationLimit _ → placed Lowering []
  RedundantArm → sites (SettledAt ArmRedundant) []
  NonExhaustive _ → sites (SettledAt MatchNonExhaustive) []
  Internal _ _ → placed Fault []
  Hinted inner _ → disposition inner
  EffectNotAllowed _ _ → sites (EffectAt ConsumedNotAllowed)
    [ EffectAt RequiredNotAllowed ]
  CallbackRowLacks _ _ _ _ _ → sites (EffectAt CallbackLacks) []
  UnhandledEffect _ → sites (EffectAt MainUnhandled) []
  MustBePure _ → sites (EffectAt RequiredPure) []
  RowSort _ → placed BeforeResolution [ ResolveRule StaticSort ]
  RecordRowAsEffect _ → placed (ResolveRule StaticSort) []
  EffectRowAsRecord _ → placed (ResolveRule StaticSort) []
  NotPrintable _ → placed CheckSemantic [ Lowering ]
  MissingField _ _ → placed CheckSemantic []
  ExpectedRecord _ → placed (ResolveRule StaticSort) [ CheckSemantic ]
  PatternMissingField _ → placed CheckSemantic []
  PatternMissingRest _ → placed CheckSemantic []
  SecondSpread → placed ResolveSupport []
  TypeAsRecordRow _ → placed (ResolveRule StaticSort) []
  RowMayHaveField _ _ → placed ResolveSemantic [ CheckSemantic ]
  LackedField _ _ → placed CheckSemantic []
  RepeatedTail _ → sites (PolicyAt TailTwiceInRecord)
    [ PolicyAt TailTwiceThroughType ]
  SameDisjoint → sites (PolicyAt DisjointSame) []
  NotKnownDisjoint _ _ → placed ResolveSemantic [ CheckSemantic ]
  InBothRecords _ _ _ → placed CheckSemantic []
  InBothRows _ → placed CheckSemantic []
  CannotTell _ → placed CheckSemantic []
  MustBeRow _ → placed CheckSemantic []
  DeferMayFail _ → sites (MarkAt DeferredFails) []
  DeferMayPerform _ → sites (MarkAt DeferredPerforms) []
  RowEquality _ _ _ → sites (EffectAt ArgumentRowEquality)
    [ EffectAt SharedTailEquality ]
  LabelMismatch _ _ → placed CheckSemantic []
  HandlerMissing _ → sites (HandlerAt MissingClause) []
  HandlerDuplicate _ → sites (HandlerAt DuplicateClause) []
  HandlerOperation _ _ → sites (HandlerAt ClauseOperation)
    [ HandlerAt ImportedOperation, HandlerAt QualifiedOperation ]
  FailNeedsConcrete → sites (TypeAt FailPayloadWritten)
    [ SettledAt FailPayloadSettled ]
  ExpectedHandler _ → sites (EffectAt HandlerExpected) []
  NofailOnFail → sites (TypeAt NofailLabel) []
  MarkVariableOutsideSignature _ → sites (TypeAt MarkVariableWritten) []
  DeferHandlerMayFail _ → sites (MarkAt DeferredHandlerFails) []
  DeferHandlerVariable _ _ → sites (MarkAt DeferredHandlerVariable) []
  ExpectedNofail _ _ → sites (MarkAt NofailExpected) []
  HandlerMayFail _ → sites (MarkAt HandlerFails) []
  where
  sites first rest = AtSites (cons' first rest)
  placed first rest = Placed (cons' first rest)

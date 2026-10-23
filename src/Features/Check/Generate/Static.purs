-- Static rules beside the verdict (R0 Task 2.3, AT10; T-R0a §3.2). Each
-- constructor of Static.Site is one place where today's code raises a
-- refusal, named after the `Problem` it raises and cited by file:line in
-- test/r0-static.test.mjs, which checks the line. Nothing is moved and
-- no raise site is edited (ruling R5): this is a classification of the
-- sites where they stand, and the cited line is the metadata.
--
-- A check that reads a type the online solver selected is semantic, and
-- left to the verdict (dossier §18.69 Q4). The classes follow the closed
-- gates (docs/findings.md, "Effect and coverage audit"): every effect
-- refusal raised by check is semantic, so are coverage and
-- `AmbiguousType`; arity is a static rule at a declared result that is
-- never a function and a count against declared fields, semantic at
-- `functionLike`. Every refusal raised in Resolve reads written text and
-- declarations (Resolve reaches none of the solver), so is static, or a
-- policy: `r disjoint r` and a tail written twice (class b′), which stay
-- in Resolve (plan review S5, N5).
--
-- Ordering: every check keeps the position where today's code raises
-- it, so the first diagnostic is unchanged. `staticRules`, a pass before
-- generation, is Task 3.2's, and takes effect only with Task 4.6.
module Features.Check.Generate.Static
  ( StaticClass(..)
  , staticClass
  , staticRefusal
  ) where

import Data.Maybe (Maybe(..))
import Domain.Verdict
  ( PolicyCode(..)
  , Site
  , StaticCode(..)
  , StaticRefusal(..)
  )
import Features.Check.Generate.Static.Site
  ( AritySite(..)
  , EffectSite(..)
  , HandlerSite(..)
  , MarkSite(..)
  , NameSite(..)
  , PolicySite(..)
  , RaiseSite(..)
  , SettledSite(..)
  , TypeSite(..)
  )

data StaticClass
  = Rule StaticCode
  | ByPolicy PolicyCode
  | Semantic

-- The refusal a site gives at a node, or none when it is semantic.
staticRefusal ∷ Site → RaiseSite → Maybe StaticRefusal
staticRefusal at raised = case staticClass raised of
  Rule code → Just (StaticRule code at)
  ByPolicy code → Just (Policy code at)
  Semantic → Nothing

staticClass ∷ RaiseSite → StaticClass
staticClass = case _ of
  ArityAt site → arityClass site
  NameAt site → Rule (nameCode site)
  TypeAt site → Rule (typeCode site)
  HandlerAt site → Rule (handlerCode site)
  PolicyAt site → ByPolicy (policyCode site)
  EffectAt site → effectClass site
  MarkAt site → markClass site
  SettledAt site → settledClass site

arityClass ∷ AritySite → StaticClass
arityClass = case _ of
  PipeFixedResult → Rule StaticArity
  PipeFunctionLike → Semantic
  CallFixedResult → Rule StaticArity
  CallFunctionLike → Semantic
  CallWithoutArguments → Rule StaticArity
  ShowArguments → Rule StaticArity
  PrintArguments → Rule StaticArity
  CrashArguments → Rule StaticArity

nameCode ∷ NameSite → StaticCode
nameCode = case _ of
  EntryMissing → StaticEntry
  EntryShape → StaticEntry
  EntryPrintable → StaticEntry
  ClauseParameters → StaticArity
  FailArguments → StaticArity
  PatternFields → StaticFieldArity
  OperationNeedsCall → StaticFunctionNeedsCall
  FunctionNeedsCall → StaticFunctionNeedsCall

typeCode ∷ TypeSite → StaticCode
typeCode = case _ of
  LabelArguments → StaticTypeArguments
  TypeArgumentCount → StaticTypeArguments
  HandlerArguments → StaticTypeArguments
  FailPayloadWritten → StaticFailNeedsConcrete
  NofailLabel → StaticNofailOnFail
  MarkVariableWritten → StaticMarkVariable

handlerCode ∷ HandlerSite → StaticCode
handlerCode = case _ of
  MissingClause → StaticHandlerMissing
  DuplicateClause → StaticHandlerDuplicate
  ClauseOperation → StaticHandlerOperation
  ImportedOperation → StaticHandlerOperation
  QualifiedOperation → StaticHandlerOperation

policyCode ∷ PolicySite → PolicyCode
policyCode = case _ of
  DisjointSame → PolicySameDisjoint
  TailTwiceInRecord → PolicyRepeatedTail
  TailTwiceThroughType → PolicyRepeatedTail

effectClass ∷ EffectSite → StaticClass
effectClass = case _ of
  ConsumedNotAllowed → Semantic
  RequiredNotAllowed → Semantic
  RequiredPure → Semantic
  ArgumentRowEquality → Semantic
  SharedTailEquality → Semantic
  CallbackLacks → Semantic
  MainUnhandled → Semantic
  HandlerExpected → Semantic

markClass ∷ MarkSite → StaticClass
markClass = case _ of
  DeferredFails → Semantic
  DeferredPerforms → Semantic
  DeferredHandlerFails → Semantic
  DeferredHandlerVariable → Semantic
  NofailExpected → Semantic
  HandlerFails → Semantic

settledClass ∷ SettledSite → StaticClass
settledClass = case _ of
  FailPayloadSettled → Semantic
  ArmRedundant → Semantic
  MatchNonExhaustive → Semantic
  AmbiguousOperand → Semantic

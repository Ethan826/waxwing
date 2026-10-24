-- Generation's own fault (R0 Task 3.2 fix round 1): an id the tables or
-- signatures do not hold, or input not of the shape Resolve guarantees.
-- Generation stops with it rather than reading the gap as an empty
-- callee, `Unit` or a marker, which would drop obligations silently.
-- `Gen` is `Either`, an applicative, so the rules stay applicative
-- (T-R0b §4): a fault is a result, never a branch on a solved shape.
-- Since R0 Task 7.1b, generation builds checked IR: `BinderShape` is a
-- fail clause with no binder, which the checked clause needs and
-- Resolve always writes; `VariableSort` is an occurrence's naming with
-- no handle for an effect-row variable, which Resolve keeps out of type
-- and tail positions. The generator stops rather than invent either.
-- Each maps to today's `Internal` kind, both of which stop a run under
-- ruling R3's partition: `TableLookup` for an id, `InputShape` for a
-- shape.
module Features.Check.Generate.Fault
  ( Gen
  , GenerationFault(..)
  , generationProblem
  ) where

import Data.Either (Either)
import Domain.Ids (EffectId, TypeId)
import Domain.Problem (InternalKind(..), Problem(..))
import Domain.Resolved (CtorId, FunctionId, LocalId, VarId)

data GenerationFault
  = UnknownFunction FunctionId
  | UnknownCtor CtorId
  | UnknownType TypeId
  | UnknownEffect EffectId
  | UnknownBuiltinEffect
  | UnknownOperation EffectId Int
  | UnboundLocal LocalId
  | PayloadShape
  | BinderShape
  | ResultShape
  | VariableSort VarId

type Gen a = Either GenerationFault a

generationProblem ∷ GenerationFault → Problem
generationProblem = case _ of
  UnknownFunction _ → Internal TableLookup "Generation: unknown function id"
  UnknownCtor _ → Internal TableLookup "Generation: unknown constructor id"
  UnknownType _ → Internal TableLookup "Generation: unknown type id"
  UnknownEffect _ → Internal TableLookup "Generation: unknown effect id"
  UnknownBuiltinEffect → Internal TableLookup
    "Generation: unknown builtin effect"
  UnknownOperation _ _ → Internal TableLookup
    "Generation: unknown operation index"
  UnboundLocal _ → Internal InputShape "Generation: unbound local"
  PayloadShape → Internal InputShape
    "Generation: a fail clause without one payload"
  BinderShape → Internal InputShape
    "Generation: a fail clause without its binder"
  ResultShape → Internal InputShape
    "Generation: no written result type"
  VariableSort _ → Internal InputShape
    "Generation: an effect-row variable in a type position"

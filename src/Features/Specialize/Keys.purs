module Features.Specialize.Keys
  ( module Features.Specialize.State
  , applied
  , arrowOf
  , called
  , ctorAt
  , claim
  , internal
  ) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe')
import Data.Tuple (Tuple(..))
import Domain.IR.Internal as IR
import Domain.Problem (Problem(..))
import Domain.Resolved (CtorId(..), FunctionId(..))
import Domain.Syntax (Span, problemAt)
import Domain.Type (TypeId(..))
import Features.Specialize.Copy (failWith, get, modify)
import Features.Specialize.Intern (dataType, internSpine)
import Features.Specialize.State
  ( Counts
  , Env
  , Key
  , Specializing
  , State
  , Work
  , WorkKind(..)
  , enqueue
  , specializationLimit
  )

-- The output type of a declared type at ground arguments, created on
-- first reference at `span`.
applied ∷ Env → Span → TypeId → Array IR.Ty → Specializing IR.Ty
applied env span (TypeId declaration) arguments
  | Array.null arguments = maybe' (internal "Invalid type id" span)
      (pure <<< dataType)
      (join (Array.index env.monoTypes declaration))
  | otherwise = get >>= remembered
      where
      key = Tuple declaration arguments
      remembered state = maybe' (newType env span key)
        (pure <<< dataType)
        (Map.lookup key state.typeKeys)

-- The arrow of `parameters` to `result`, every suffix interned once.
arrowOf ∷ Array IR.Ty → IR.Ty → Specializing IR.Ty
arrowOf parameters result = do
  state ← get
  let spun = internSpine parameters result state.arrows
  modify (withArrows spun.arrows)
  pure spun.ty
  where
  withArrows arrows state = state { arrows = arrows }

-- The output function for a call at ground arguments.
called ∷ Env → Span → FunctionId → Array IR.Ty → Specializing FunctionId
called env span (FunctionId declaration) arguments
  | Array.null arguments = maybe' (internal "Invalid function id" span)
      (pure <<< FunctionId)
      (join (Array.index env.monoFunctions declaration))
  | otherwise = get >>= remembered
      where
      key = Tuple declaration arguments
      remembered state = maybe' (newFunction span key)
        (pure <<< FunctionId)
        (Map.lookup key state.functionKeys)

-- The output constructor of `id` in the output type `owner`.
ctorAt ∷ Env → Span → IR.Ty → CtorId → Specializing CtorId
ctorAt env span owner (CtorId id) = do
  state ← get
  maybe' (internal "Invalid constructor id" span) pure
    (outputCtor state owner =<< join (Array.index env.positions id))

internal ∷ ∀ a b. String → Span → a → Specializing b
internal text span _ = failWith (problemAt (Internal text) span)

outputCtor ∷ State → IR.Ty → Int → Maybe CtorId
outputCtor state owner position = case owner of
  IR.TData (TypeId output) → Map.lookup output state.types >>= at
  _ → Nothing
  where
  at info = Array.index info.ctors position

-- A type key takes the next output id and a block of constructor ids, one
-- per declared constructor in order; its fields are filled when its work
-- item is reached.
newType ∷ Env → Span → Key → Unit → Specializing IR.Ty
newType env span key@(Tuple declaration arguments) _ = do
  claim span
  info ← maybe' (internal "Invalid type id" span) pure
    (Array.index env.types declaration)
  modify (created info)
  state ← get
  pure (dataType (state.counts.types - 1))
  where
  created info state = enqueue
    { output: state.counts.types
    , declaration
    , arguments
    , kind: TypeWork
    , span
    }
    state
      { typeKeys = Map.insert key state.counts.types state.typeKeys
      , types = Map.insert state.counts.types (output info state) state.types
      , counts = state.counts
          { types = state.counts.types + 1
          , ctors = state.counts.ctors + Array.length info.ctors
          }
      }
  output info state =
    { name: info.name
    , arguments
    , ctors: Array.mapWithIndex (offset state.counts.ctors) info.ctors
    , span: info.span
    }
  offset base index _ = CtorId (base + index)

newFunction ∷ Span → Key → Unit → Specializing FunctionId
newFunction span key@(Tuple declaration arguments) _ = do
  claim span
  modify created
  state ← get
  pure (FunctionId (state.counts.functions - 1))
  where
  created state = enqueue
    { output: state.counts.functions
    , declaration
    , arguments
    , kind: FunctionWork
    , span
    }
    state
      { functionKeys = Map.insert key state.counts.functions
          state.functionKeys
      , counts = state.counts { functions = state.counts.functions + 1 }
      }

-- Counts one more polymorphic key, failing at the reference that would
-- create key `specializationLimit + 1`.
claim ∷ Span → Specializing Unit
claim span = do
  state ← get
  if state.counts.polymorphic >= specializationLimit then
    failWith (problemAt (SpecializationLimit specializationLimit) span)
  else modify counted
  where
  counted state = state
    { counts = state.counts { polymorphic = state.counts.polymorphic + 1 } }

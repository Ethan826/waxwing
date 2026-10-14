module Features.Resolve.Name (bareName, callName) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe, maybe')
import Data.String as String
import Data.Traversable (traverse)
import Domain.Problem (Problem(..), UnboundKind(..))
import Domain.Syntax as Syntax
import Domain.Resolved (Global)
import Domain.Resolved as Resolved
import Features.Resolve.Fresh (Fresh, failure, liftEither)
import Features.Resolve.Qualified (failCall, failReference)
import Features.Resolve.Scope (Scope)

-- Design §2: a local wins; then a function, a value if it has parameters
-- and E_ARITY without its call if it has none; then a constructor.
bareName
  ∷ Scope
  → Syntax.Span
  → String
  → Fresh Resolved.Expr
bareName scope span name = maybe' otherwise found (findLocal scope name)
  where
  found id = pure (Resolved.Local span id)
  otherwise _ = maybe' unbound global (findGlobal scope name)
  unbound _ = failure
    (Syntax.problemAt (Unbound UnboundLocal name) span)
  global entry = case entry.ref of
    Resolved.GlobalCtor id → liftEither (bareConstructor scope span id)
    Resolved.GlobalFunction id arity → liftEither
      (bareFunction span name id arity)
    Resolved.Operation effect index arity →
      if arity == 0 then failure
        (Syntax.problemAt (FunctionNeedsCall name) span)
      else pure (Resolved.OperationRef span effect index)
    Resolved.BuiltinPrint → pure (Resolved.PrintRef span)
    Resolved.BuiltinShow → pure (Resolved.ShowRef span)
    Resolved.BuiltinCrash → pure (Resolved.CrashRef span)
    Resolved.LegacyFail → failReference span

bareFunction
  ∷ Syntax.Span
  → String
  → Resolved.FunctionId
  → Int
  → Either Syntax.Diagnostic Resolved.Expr
bareFunction span name id arity =
  if arity == 0 then Left (Syntax.problemAt (FunctionNeedsCall name) span)
  else pure (Resolved.FunctionRef span id)

-- A constructor with fields is a value; a nullary one is its construction.
bareConstructor
  ∷ Scope
  → Syntax.Span
  → Resolved.CtorId
  → Either Syntax.Diagnostic Resolved.Expr
bareConstructor scope span id = do
  count ← fieldCount scope span id
  if count == 0 then pure (Resolved.Construct span id [])
  else pure (Resolved.CtorRef span id)

callName
  ∷ (Syntax.Expr → Fresh Resolved.Expr)
  → Scope
  → Syntax.Span
  → String
  → Array Syntax.Expr
  → Fresh Resolved.Expr
callName nested scope span name arguments = maybe' globalCall localCall
  (findLocal scope name)
  where
  -- Applying a local needs at least one argument (design §4).
  localCall id
    | Array.null arguments = failure
        (Syntax.problemAt (NotCallable name) span)
    | otherwise = Resolved.Apply span (Resolved.Local (nameSpan span name) id)
        <$> resolved
  globalCall _ = maybe' unbound dispatch (findGlobal scope name)
  unbound _ = failure
    (Syntax.problemAt (Unbound UnboundFunction name) span)
  dispatch global = case global.ref of
    Resolved.GlobalFunction id _ → Resolved.Call span id <$> resolved
    Resolved.GlobalCtor id → constructorCall scope span name id resolved
    Resolved.Operation effect index _ → Resolved.Perform span effect index
      <$> resolved
    Resolved.BuiltinPrint → Resolved.Print span <$> resolved
    Resolved.BuiltinShow → Resolved.Show span <$> resolved
    Resolved.BuiltinCrash → Resolved.Crash span <$> resolved
    Resolved.LegacyFail → failCall span arguments resolved
  resolved = traverse nested arguments

constructorCall
  ∷ Scope
  → Syntax.Span
  → String
  → Resolved.CtorId
  → Fresh (Array Resolved.Expr)
  → Fresh Resolved.Expr
constructorCall scope span name id resolved = do
  count ← liftEither (fieldCount scope span id)
  if count == 0 then failure (Syntax.problemAt (CtorNotCallable name) span)
  else Resolved.Construct span id <$> resolved

-- A call's name starts its span and never crosses a line.
nameSpan ∷ Syntax.Span → String → Syntax.Span
nameSpan span name = { start: span.start, end }
  where
  width = String.length name
  end = span.start
    { offset = span.start.offset + width
    , column = span.start.column + width
    }

findLocal ∷ Scope → String → Maybe Resolved.LocalId
findLocal scope name = Map.lookup name scope.locals

findGlobal ∷ Scope → String → Maybe Global
findGlobal scope name = Array.find named scope.globals
  where
  named global = global.name == name

-- A global's CtorId always indexes the table; a miss is a compiler bug.
fieldCount
  ∷ Scope → Syntax.Span → Resolved.CtorId → Either Syntax.Diagnostic Int
fieldCount scope span (Resolved.CtorId index) =
  maybe' missing count (Array.index scope.ctors index)
  where
  missing _ = Left
    (Syntax.problemAt (Internal "Invalid constructor id") span)
  count info = Right (Array.length info.fields)

module Features.Resolve.Expression (expression) where

import Prelude
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Traversable (traverse)
import Domain.Syntax as Syntax
import Features.Resolve.Block (block)
import Features.Resolve.Fresh (Fresh)
import Features.Resolve.HandlerExpression as HandlerExpression
import Features.Resolve.Lambda (lambda)
import Features.Resolve.Name (bareName, callName)
import Features.Resolve.Pattern (resolvePattern)
import Features.Resolve.Record (recordLiteral, recordUpdate)
import Features.Resolve.Qualified (qualifiedCall, qualifiedName)
import Features.Resolve.Scope (Scope)
import Domain.Resolved as Resolved

-- Binders are numbered in source pre-order: scrutinee before arms, each
-- arm's pattern before its body, a lambda's parameters before its body,
-- a block's items in order, each `let` before its expression.
-- A flat exhaustive dispatch (BACKLOG E003).
expression ∷ Scope → Syntax.Expr → Fresh Resolved.Expr
expression scope = case _ of
  Syntax.Integer span value → pure (Resolved.Integer span value)
  Syntax.Boolean span value → pure (Resolved.Boolean span value)
  Syntax.TextLiteral span value → pure (Resolved.TextLiteral span value)
  Syntax.Variable span name → bareName scope span name
  Syntax.Call span name arguments → callName nested scope span name arguments
  Syntax.Qualified span qualifier member → qualifiedName scope span qualifier
    member
  Syntax.QualifiedCall span qualifier member arguments → qualifiedCall scope
    span
    qualifier
    member
    arguments
    (traverse nested arguments)
  Syntax.Add span left right → Resolved.Add span <$> nested left
    <*> nested right
  Syntax.Concat span left right → Resolved.Concat span <$> nested left
    <*> nested right
  Syntax.Interpolate span parts → Resolved.Interpolate span
    <$> traverse nested parts
  Syntax.Compare span operator left right → Resolved.Compare span operator
    <$> nested left
    <*> nested right
  Syntax.If span condition yes no → Resolved.If span <$> nested condition
    <*> nested yes
    <*> nested no
  Syntax.Match span scrutinee arms → Resolved.Match span
    <$> nested scrutinee
    <*> traverse (resolveArm scope) arms
  Syntax.Lambda span parameters body → lambda scope span parameters
    (withLocals scope body)
  Syntax.Apply span callee arguments → Resolved.Apply span <$> nested callee
    <*> traverse nested arguments
  Syntax.Pipe span left right → Resolved.Pipe span <$> nested left
    <*> nested right
  Syntax.HandlerExpr span reference clauses →
    HandlerExpression.handlerExpression expression scope span reference clauses
  Syntax.With span handler body → Resolved.With span <$> nested handler
    <*> nested body
  Syntax.Handle span body clauses → HandlerExpression.failureHandler expression
    scope
    span
    body
    clauses
  Syntax.UnitValue span → pure (Resolved.UnitValue span)
  Syntax.Block span items value → block expression scope span items value
  Syntax.RecordLiteral span fields → recordLiteral nested span fields
  Syntax.FieldAccess span record label → Resolved.FieldAccess span
    <$> nested record
    <*> pure label
  Syntax.RecordUpdate span record fields → recordUpdate nested span record
    fields
  where
  -- Eta-expanded: a point-free `expression scope` would recurse at once.
  nested syntax = expression scope syntax

-- A binder is in scope only in its own arm body, where it may shadow.
resolveArm ∷ Scope → Syntax.Arm → Fresh Resolved.Arm
resolveArm scope arm = do
  matched ← resolvePattern scope.globals scope.ctors arm.pattern
  body ← withLocals scope arm.body matched.binders
  pure { pattern: matched.pattern, body, span: arm.span }

-- Later locals shadow earlier ones.
withLocals
  ∷ Scope → Syntax.Expr → Array Resolved.Local → Fresh Resolved.Expr
withLocals scope body locals =
  expression (scope { locals = foldl inserted scope.locals locals }) body
  where
  inserted found local = Map.insert local.name local.id found

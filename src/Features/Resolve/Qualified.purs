module Features.Resolve.Qualified
  ( failCall
  , qualifiedCall
  , qualifiedName
  , unappliedFail
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Maybe (Maybe, maybe')
import Domain.Ids (EffectId(..))
import Domain.Problem (Problem(..), UnboundKind(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.Effect
  ( BuiltinEffect
  , Declared
  , Operation(..)
  , builtinEffects
  )
import Features.Resolve.Fresh (Fresh, failure, liftEither)
import Features.Resolve.Scope (Scope)

-- Why a qualified name has no declaration.
data Missing = NotAnEffect | NotAnOperation

-- A user effect of that name wins; the built-ins are searched after.
declared ∷ Scope → String → String → Either Missing Declared
declared scope qualifier member = maybe' builtin user
  (Array.findIndex (called qualifier) scope.effectInfos)
  where
  builtin _ = maybe' notAnEffect (builtinMember member)
    (Array.find (called qualifier) builtinEffects)
  user index = maybe' notAnOperation Right
    (Array.index scope.effectInfos index >>= userMember index member)
  notAnEffect _ = Left NotAnEffect
  notAnOperation _ = Left NotAnOperation

userMember
  ∷ Int → String → Resolved.EffectInfo → Maybe Declared
userMember index member effect =
  Array.findIndex (called member)
    effect.operations >>= declaredAt
  where
  declaredAt position = arityOf <$> Array.index effect.operations position
    where
    arityOf info =
      { operation: UserOperation (EffectId index) position
      , arity: Array.length info.parameters
      }

builtinMember ∷ String → BuiltinEffect → Either Missing Declared
builtinMember member effect = maybe' notAnOperation (Right <<< _.declared)
  (Array.find (called member) effect.operations)
  where
  notAnOperation _ = Left NotAnOperation

called ∷ ∀ r. String → { name ∷ String | r } → Boolean
called wanted entry = entry.name == wanted

-- `Effect.op` as a value: a reference, as the bare name is.
qualifiedName
  ∷ Scope
  → Syntax.Span
  → String
  → String
  → Either Syntax.Diagnostic Resolved.Expr
qualifiedName scope span qualifier member =
  either (missing UnboundLocal span qualifier member) (reference span written)
    (declared scope qualifier member)
  where
  written = qualifier <> "." <> member

reference
  ∷ Syntax.Span → String → Declared → Either Syntax.Diagnostic Resolved.Expr
reference span written found = case found.operation of
  UserOperation effect index →
    if found.arity == 0 then Left
      (Syntax.problemAt (FunctionNeedsCall written) span)
    else Right (Resolved.OperationRef span effect index)
  PrintOperation → Right (Resolved.PrintRef span)
  FailOperation → unappliedFail span

-- `Effect.op(args)` performs, prints or fails; the resolved node is the one
-- the bare call resolves to. `resolved` is the arguments, resolved.
qualifiedCall
  ∷ Scope
  → Syntax.Span
  → String
  → String
  → Array Syntax.Expr
  → Fresh (Array Resolved.Expr)
  → Fresh Resolved.Expr
qualifiedCall scope span qualifier member arguments resolved =
  either (liftEither <<< missing UnboundFunction span qualifier member)
    (call span arguments resolved)
    (declared scope qualifier member)

call
  ∷ Syntax.Span
  → Array Syntax.Expr
  → Fresh (Array Resolved.Expr)
  → Declared
  → Fresh Resolved.Expr
call span arguments resolved found = case found.operation of
  UserOperation effect index → Resolved.Perform span effect index <$> resolved
  PrintOperation → Resolved.Print span <$> resolved
  FailOperation → failCall span arguments resolved

missing
  ∷ UnboundKind
  → Syntax.Span
  → String
  → String
  → Missing
  → Either Syntax.Diagnostic Resolved.Expr
missing kind span qualifier member = case _ of
  NotAnEffect → Left
    (Syntax.problemAt (Unbound kind (qualifier <> "." <> member)) span)
  NotAnOperation → Left
    (Syntax.problemAt (HandlerOperation member qualifier) span)

-- `fail(e)` and `Fail.fail(e)`: one payload, and a node spanning `fail`
-- through the payload's end, exactly as the parser's old form did.
failCall
  ∷ Syntax.Span
  → Array Syntax.Expr
  → Fresh (Array Resolved.Expr)
  → Fresh Resolved.Expr
failCall span arguments resolved = resolved >>= single
  where
  unchanged _ = span
  single = case _ of
    [ value ] → pure (Resolved.Fail failSpan value)
    _ → failure (Syntax.problemAt Arity span)
  failSpan = maybe' unchanged payloadEnd (Array.head arguments)
  payloadEnd payload =
    { start: span.start, end: (Syntax.exprSpan payload).end }

-- Fail has no value form (a reference to it never existed); this is the
-- parser's old text for `fail` without `(`.
unappliedFail ∷ Syntax.Span → Either Syntax.Diagnostic Resolved.Expr
unappliedFail span = Left (Syntax.problemAt (Syntax "Expected '('") span)

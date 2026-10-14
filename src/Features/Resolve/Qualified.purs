module Features.Resolve.Qualified
  ( Missing(..)
  , declared
  , failCall
  , failReference
  , importedCall
  , importedName
  , missing
  , qualifiedCall
  , qualifiedName
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..), maybe')
import Domain.Ids (EffectId(..))
import Domain.Problem (Problem(..), UnboundKind(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (Ty, VarId)
import Features.Resolve.Effect
  ( BuiltinEffect
  , Declared
  , Operation(..)
  , builtinEffects
  )
import Features.Resolve.Fresh (Fresh, failure, fresh, liftEither)
import Features.Resolve.Scope (Import, Scope)

-- Why a qualified name has no declaration.
data Missing = NotAnEffect | NotAnOperation

-- A user effect of that name wins; the built-ins are searched after.
declared
  ∷ Array Resolved.EffectInfo → String → String → Either Missing Declared
declared effectInfos qualifier member = maybe' builtin user
  (Array.findIndex (called qualifier) effectInfos)
  where
  builtin _ = maybe' notAnEffect (builtinMember member)
    (Array.find (called qualifier) builtinEffects)
  user index = maybe' notAnOperation Right
    (Array.index effectInfos index >>= userMember index member)
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

-- An alias names its effect for the function body; the canonical name stays
-- valid beside it, since no alias may equal an effect name (FX020 §3).
canonical ∷ Scope → String → String
canonical scope qualifier = maybe' (const qualifier) _.effect
  (Array.find (called qualifier) scope.bindings.aliases)

-- `Effect.op` as a value: a reference, as the bare name is.
qualifiedName
  ∷ Scope
  → Syntax.Span
  → String
  → String
  → Fresh Resolved.Expr
qualifiedName scope span qualifier member =
  either (liftEither <<< missing UnboundLocal span effect member)
    (reference Nothing span (effect <> "." <> member))
    (declared scope.effectInfos effect member)
  where
  effect = canonical scope qualifier

-- An imported name as a value, as `reference` makes it.
importedName ∷ Syntax.Span → Import → Fresh Resolved.Expr
importedName span found =
  reference found.family span found.local found.declared

reference
  ∷ Maybe (Ty VarId) → Syntax.Span → String → Declared → Fresh Resolved.Expr
reference family span written found = case found.operation of
  UserOperation effect index →
    if found.arity == 0 then failure
      (Syntax.problemAt (FunctionNeedsCall written) span)
    else pure (Resolved.OperationRef span effect index)
  PrintOperation → pure (Resolved.PrintRef span)
  FailOperation → failReference family span

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
  either (liftEither <<< missing UnboundFunction span effect member)
    (call Nothing span arguments resolved)
    (declared scope.effectInfos effect member)
  where
  effect = canonical scope qualifier

-- An imported name called, as `call` makes it.
importedCall
  ∷ Syntax.Span
  → Array Syntax.Expr
  → Fresh (Array Resolved.Expr)
  → Import
  → Fresh Resolved.Expr
importedCall span arguments resolved found =
  call found.family span arguments resolved found.declared

call
  ∷ Maybe (Ty VarId)
  → Syntax.Span
  → Array Syntax.Expr
  → Fresh (Array Resolved.Expr)
  → Declared
  → Fresh Resolved.Expr
call family span arguments resolved found = case found.operation of
  UserOperation effect index → Resolved.Perform span effect index <$> resolved
  PrintOperation → Resolved.Print span <$> resolved
  FailOperation → failCall family span arguments resolved

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
-- through the payload's end, exactly as the parser's old form did. A family
-- (from `Fail(E) { fail }`) rides on the node and fixes the payload's type.
failCall
  ∷ Maybe (Ty VarId)
  → Syntax.Span
  → Array Syntax.Expr
  → Fresh (Array Resolved.Expr)
  → Fresh Resolved.Expr
failCall family span arguments resolved = resolved >>= single
  where
  unchanged _ = span
  single = case _ of
    [ value ] → pure (Resolved.Fail failSpan family value)
    _ → failure (Syntax.problemAt Arity span)
  failSpan = maybe' unchanged payloadEnd (Array.head arguments)
  payloadEnd payload =
    { start: span.start, end: (Syntax.exprSpan payload).end }

-- `Fail.fail` as a value: `fn(e) => Fail.fail(e)` over a fresh binder,
-- every part at the reference's span. Applying it is then exactly a
-- `fail(e)`: the family is keyed by the payload's type head, settled as
-- every `fail` is, and a payload never decided is FailNeedsConcrete at the
-- reference. A lambda is monomorphic, so one bound reference has one
-- family, while each written reference gets its own. An imported
-- `Fail(E) { fail }` annotates the binder with `E`.
failReference ∷ Maybe (Ty VarId) → Syntax.Span → Fresh Resolved.Expr
failReference family span = eta <$> fresh
  where
  eta payload = Resolved.Lambda span
    [ { local: Just payload, ty: family, span } ]
    (Resolved.Fail span Nothing (Resolved.Local span payload))

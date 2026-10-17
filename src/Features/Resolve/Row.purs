module Features.Resolve.Row (resolveRow, label, failFamily) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Traversable (traverse)
import Domain.Ids (EffectId(..))
import Domain.Problem (Problem(..), UnboundKind(..))
import Domain.Row (EffectRef(..), Label(..), Mark(..), Row(..), normalMark)
import Domain.Syntax as Syntax
import Features.Resolve.Builtin (builtinEffects)
import Domain.Type (Ty(..), TyRow, VarId(..))

type Effects = Array { name ∷ String, arity ∷ Int }

resolveRow
  ∷ Effects
  → Array String
  → Maybe VarId
  → (Syntax.TypeRef → Either Syntax.Diagnostic (Ty VarId))
  → Maybe Syntax.RowRef
  → Either Syntax.Diagnostic (TyRow VarId)
resolveRow effects variables ambient resolve = maybe
  (Right (Row [] ambient))
  written
  where
  written (Syntax.RowRef span labels tail) = Row
    <$> traverse (label effects resolve) labels
    <*> maybe (Right ambient) (ending span) tail
  ending _ Syntax.Pure = Right Nothing
  ending span (Syntax.Spread name) = maybe' (missing span name) found
    (Array.elemIndex name variables)
  found index = Right (Just (VarId index))
  -- The same E_UNBOUND a record row's unbound tail gets.
  missing span name _ = Left
    (Syntax.problemAt (Unbound UnboundTypeVariable name) span)

label
  ∷ Effects
  → (Syntax.TypeRef → Either Syntax.Diagnostic (Ty VarId))
  → Syntax.LabelRef
  → Either Syntax.Diagnostic (Label (Ty VarId))
label effects resolve reference = do
  effect ← lookupEffect effects reference
  if effect.arity /= Array.length reference.arguments then
    Left (Syntax.problemAt (TypeArguments reference.name) reference.span)
  else traverse resolve reference.arguments >>= concrete effect.ref reference

concrete
  ∷ EffectRef
  → Syntax.LabelRef
  → Array (Ty VarId)
  → Either Syntax.Diagnostic (Label (Ty VarId))
concrete effect reference arguments = case effect, arguments of
  FailEffect, [ payload ] → refusedOnFail reference
    *> (toLabel <$> failFamily reference.span payload)
  _, _ → Right (Label effect arguments (normalMark effect written))
  where
  toLabel payload = Label effect [ payload ] Unmarked
  written = maybe Plain writtenMark reference.mark
  writtenMark = case _ of
    Syntax.NofailRef _ → NoFail
    Syntax.NofailVariableRef _ name → MarkVariable name

-- `nofail` says nothing about Fail, whose clauses are never run twice
-- (design §3.2): E_TYPE at the label.
refusedOnFail ∷ Syntax.LabelRef → Either Syntax.Diagnostic Unit
refusedOnFail reference = maybe (Right unit) refused reference.mark
  where
  refused _ = Left (Syntax.problemAt NofailOnFail reference.span)

-- A Fail payload needs a family key: Int, Bool, Unit, Text, a declared
-- type or a closed record's label set. A type variable, a function, a
-- handler type or a record with a row tail (`{ code: Int, ...r }`, whose
-- labels a signature never fixes) has none, so nothing it is matched
-- against could ever be decided: it is refused where it is written
-- (design §2, FX009; R001 design §3a).
failFamily ∷ Syntax.Span → Ty VarId → Either Syntax.Diagnostic (Ty VarId)
failFamily span payload =
  if keyless payload then Left
    { problem: FailNeedsConcrete
    , span
    , related: [ { span, reason: Syntax.FailAlternatives } ]
    }
  else Right payload
  where
  keyless = case _ of
    TVar _ → true
    TFun _ _ _ → true
    THandler _ _ → true
    TRecord { tails } | not (Array.null tails) → true
    _ → false

lookupEffect
  ∷ Effects
  → Syntax.LabelRef
  → Either Syntax.Diagnostic { ref ∷ EffectRef, arity ∷ Int }
lookupEffect effects reference = maybe' userEffect builtin
  (Array.find (builtinNamed reference.name) builtinEffects)
  where
  builtin effect = Right { ref: effect.ref, arity: effect.arity }
  builtinNamed name effect = effect.name == name
  userEffect _ = maybe' missing found
    (Array.findIndex (named reference.name) effects)
  named name effect = effect.name == name
  found index = Right
    { ref: UserEffect (EffectId index)
    , arity: maybe 0 arityOf (Array.index effects index)
    }
  arityOf effect = effect.arity
  missing _ = Left
    (Syntax.problemAt (Unbound UnboundType reference.name) reference.span)

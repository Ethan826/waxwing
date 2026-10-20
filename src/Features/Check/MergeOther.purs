module Features.Check.MergeOther (otherName, wholeName, writtenName) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Problem (TypeName(..))
import Domain.Resolved (EffectInfo)
import Domain.Syntax (Diagnostic, Span, TypeArgument(..), TypeRef(..))
import Domain.Type (Ty(..))
import Features.Check.MergeParts (View)
import Features.Check.Scheme (opened)
import Features.Check.Subst (Subst, resolve)
import Features.Check.TypeName (Names, typeName)

-- R5's two sides (R005 Tranche B diagnostics; decision 4 of 2026-10-17):
-- the other side through the substitution, the owner's as written. The
-- other side whole (D6, R8's `is required here`), or only what the parts
-- share (D4's `split`).
wholeName
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → Subst
  → View
  → Either Diagnostic TypeName
wholeName env span subst view = typeName env span
  (opened (resolve subst (TRecord view.whole)))

otherName
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → Subst
  → View
  → Either Diagnostic TypeName
otherName env span subst view = typeName env span
  (opened (resolve subst (TRecord view.other)))

-- The owner's row as its declaration writes it, with its variables'
-- names; with no written type, the parts' names alone.
writtenName ∷ Array String → View → TypeName
writtenName names view = maybe fallback refName
  (view.owner >>= written)
  where
  written owner = owner.written
  fallback = RecordName [] names

refName ∷ TypeRef → TypeName
refName = case _ of
  IntRef _ → IntName
  BoolRef _ → BoolName
  UnitRef _ → UnitName
  TextRef _ → TextName
  VarRef _ name → VariableName name
  NamedRef _ name arguments
    | Array.null arguments → DataName name
    | otherwise → AppliedName name (Array.mapMaybe argumentName arguments)
  THandlerRef _ _ _ → HoleName
  RecordRef _ fields tails → RecordName
    (Array.sortWith fieldLabel (map fieldName fields))
    (map tailName tails)
  FunRef _ parameter _ result → FunctionName (refName parameter) Nothing
    (refName result)
  where
  fieldName field = Tuple field.name (refName field.ty)
  fieldLabel (Tuple label _) = label
  tailName tail = tail.name
  argumentName = case _ of
    TypeArgument ref → Just (refName ref)
    RowArgument _ → Nothing

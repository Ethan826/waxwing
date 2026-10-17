module Features.Resolve.TypeArguments (appliedTo) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..), TypeName, UnboundKind(..))
import Domain.Syntax as Syntax
import Domain.Resolved as Resolved
import Domain.Type (Ty(..))
import Domain.Type.Record (recordRow)
import Features.Resolve.Builtin (builtinEffects)
import Features.Resolve.RecordArguments (asRow)
import Features.Resolve.Row (resolveRow)

type Resolver =
  Syntax.TypeRef → Either Syntax.Diagnostic (Resolved.Ty Resolved.VarId)

-- How the owner's scope resolves a type, with and without its ambient row,
-- names a resolved type for a diagnostic, and tells a declared type's name.
type Resolvers =
  { resolved ∷ Resolver
  , bare ∷ Resolver
  , named ∷
      Syntax.Span
      → Resolved.Ty Resolved.VarId
      → Either Syntax.Diagnostic TypeName
  , declared ∷ String → Boolean
  }

-- A declared type applied to arguments, given the resolvers of a type
-- reference in the owner's scope, with its ambient row and without it (for
-- a label's arguments, FX024). Type and row arguments are each taken in
-- declaration order, whatever order they were written in.
appliedTo
  ∷ Array { name ∷ String, arity ∷ Int }
  → Array String
  → Maybe Resolved.VarId
  → Resolvers
  → Syntax.Span
  → Array Syntax.TypeArgument
  → Int
  → Resolved.TypeInfo
  → Either Syntax.Diagnostic (Resolved.Ty Resolved.VarId)
appliedTo effects variables ambient resolvers span arguments index info
  | Array.length arguments /= Array.length info.sourceSorts = Left
      (Syntax.problemAt (TypeArguments info.name) span)
  | otherwise =
      do
        typeArguments ← traverse resolveTypeSlot typeSlots
        rowArguments ← traverse resolveRowArgument rowArgumentsSyntax
        pure
          (Resolved.TData (Resolved.TypeId index) typeArguments rowArguments)
      where
      ordered sort = Array.mapMaybe (matching sort)
        (Array.zip info.sourceSorts arguments)
      matching sort (Tuple foundSort argument) =
        if foundSort == sort then Just argument else Nothing
      -- A record row parameter takes its argument among the type arguments.
      typeSlots = Array.filter typeSlot
        (Array.zip info.sourceSorts arguments)
      typeSlot (Tuple sort _) = sort /= Syntax.RowSort
      rowArgumentsSyntax = ordered Syntax.RowSort
      resolveTypeSlot (Tuple sort argument) =
        if sort == Syntax.RecordSort then recordArgument argument
        else typeArgument argument
      typeArgument = case _ of
        Syntax.TypeArgument reference → resolved reference
        Syntax.RowArgument row → sortError false (rowSpan row)
      -- `...s` or `{ ...s }`, else a record type (R012, user-approved
      -- 2026-10-15).
      recordArgument argument = case asRow argument of
        Syntax.RowArgument
          (Syntax.RowRef tailSpan [] (Just (Syntax.Spread tailName))) →
          maybe' (unboundTail tailName tailSpan)
            (pure <<< recordTail)
            (Array.elemIndex tailName variables)
        Syntax.RowArgument row → sortError false (rowSpan row)
        Syntax.TypeArgument reference → recordType resolvers effects
          reference
      recordTail found = Resolved.TRecord
        (recordRow [] [ Resolved.VarId found ])
      unboundTail tailName tailSpan _ = Left
        (Syntax.problemAt (Unbound UnboundTypeVariable tailName) tailSpan)
      resolved = resolvers.resolved
      bare = resolvers.bare
      resolveRowArgument = rowArgument
      rowArgument = case _ of
        Syntax.RowArgument row → resolveRow effects variables ambient
          bare
          (Just (closedRowArgument row))
        Syntax.TypeArgument
          ( Syntax.NamedRef referenceSpan effectName
              effectArguments
          ) → maybe' (notAnEffect referenceSpan)
          (effectRow referenceSpan effectName effectArguments)
          (Array.findIndex (namedEffect effectName) effects)
        Syntax.TypeArgument reference → sortError true
          (Syntax.typeRefSpan reference)
      effectRow referenceSpan effectName effectArguments _ = do
        argumentTypes ← traverse effectTypeArgument effectArguments
        resolveRow effects variables ambient bare
          ( Just
              ( Syntax.RowRef referenceSpan
                  [ { name: effectName
                    , arguments: argumentTypes
                    , mark: Nothing
                    , alias: Nothing
                    , imports: Nothing
                    , span: referenceSpan
                    }
                  ]
                  Nothing
              )
          )
      effectTypeArgument = case _ of
        Syntax.TypeArgument reference → Right reference
        Syntax.RowArgument row → sortError false (rowSpan row)
      namedEffect effectName effect = effect.name == effectName
      notAnEffect referenceSpan _ = sortError true referenceSpan
      closedRowArgument (Syntax.RowRef argumentSpan labels tail) =
        Syntax.RowRef
          argumentSpan
          labels
          (maybe' pureTail Just tail)
      pureTail _ = Just Syntax.Pure

-- A record parameter's type argument must be a record: an effect's name
-- is an effect row, and any other type is not a record.
recordType
  ∷ Resolvers
  → Array { name ∷ String, arity ∷ Int }
  → Syntax.TypeRef
  → Either Syntax.Diagnostic (Resolved.Ty Resolved.VarId)
recordType resolvers effects reference =
  if effectNamed then sortError false span
  else resolvers.resolved reference >>= recordOnly
  where
  span = Syntax.typeRefSpan reference
  effectNamed = case reference of
    Syntax.NamedRef _ name _ → not (resolvers.declared name)
      && (Array.any (builtin name) builtinEffects || effect name)
    _ → false
  effect name = Array.any (named name) effects
  named name found = found.name == name
  builtin name found = found.name == name
  recordOnly = case _ of
    record@(TRecord _) → Right record
    other → resolvers.named span other >>= notRecord
  notRecord name = Left (Syntax.problemAt (ExpectedRecord name) span)

sortError ∷ ∀ a. Boolean → Syntax.Span → Either Syntax.Diagnostic a
sortError expectedRow span = Left
  (Syntax.problemAt (RowSort expectedRow) span)

rowSpan ∷ Syntax.RowRef → Syntax.Span
rowSpan (Syntax.RowRef span _ _) = span

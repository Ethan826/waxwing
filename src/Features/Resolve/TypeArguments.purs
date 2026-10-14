module Features.Resolve.TypeArguments (appliedTo) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..))
import Domain.Syntax as Syntax
import Domain.Resolved as Resolved
import Features.Resolve.Row (resolveRow)

-- A declared type applied to arguments, given the resolver of a type
-- reference in the owner's scope. Type and row arguments are each taken in
-- declaration order, whatever order they were written in.
appliedTo
  ∷ Array { name ∷ String, arity ∷ Int }
  → Array String
  → Maybe Resolved.VarId
  → (Syntax.TypeRef → Either Syntax.Diagnostic (Resolved.Ty Resolved.VarId))
  → Syntax.Span
  → Array Syntax.TypeArgument
  → Int
  → Resolved.TypeInfo
  → Either Syntax.Diagnostic (Resolved.Ty Resolved.VarId)
appliedTo effects variables ambient resolved span arguments index info
  | Array.length arguments /= Array.length info.sourceSorts = Left
      (Syntax.problemAt (TypeArguments info.name) span)
  | otherwise =
      do
        typeArguments ← traverse resolveTypeArgument typeArgumentsSyntax
        rowArguments ← traverse resolveRowArgument rowArgumentsSyntax
        pure
          (Resolved.TData (Resolved.TypeId index) typeArguments rowArguments)
      where
      ordered sort = Array.mapMaybe (matching sort)
        (Array.zip info.sourceSorts arguments)
      matching sort (Tuple foundSort argument) =
        if foundSort == sort then Just argument else Nothing
      typeArgumentsSyntax = ordered Syntax.TypeSort
      rowArgumentsSyntax = ordered Syntax.RowSort
      resolveTypeArgument = typeArgument
      typeArgument = case _ of
        Syntax.TypeArgument reference → resolved reference
        Syntax.RowArgument row → sortError false (rowSpan row)
      resolveRowArgument = rowArgument
      rowArgument = case _ of
        Syntax.RowArgument row → resolveRow effects variables ambient
          resolved
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
        resolveRow effects variables ambient resolved
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

sortError ∷ ∀ a. Boolean → Syntax.Span → Either Syntax.Diagnostic a
sortError expectedRow span = Left
  (Syntax.problemAt (RowSort expectedRow) span)

rowSpan ∷ Syntax.RowRef → Syntax.Span
rowSpan (Syntax.RowRef span _ _) = span

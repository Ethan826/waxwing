module Features.Resolve.Variables
  ( signatureVariables
  , sortedVariables
  , uniqueTypeParameters
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences
  ( rowOccurrences
  , typeOccurrences
  )
import Features.Resolve.Repeated (laterRepeat)
import Features.Resolve.SortConflict (settledOccurrences)

-- A function's type variables are implicitly quantified over its whole
-- signature: every lowercase name in its parameter and result types, in
-- first-occurrence order, so `VarId i` is the i-th of them.
signatureVariables ∷ Array Syntax.TypeRef → Array String
signatureVariables references =
  Array.nub (Array.concatMap occurrences references)

-- A type parameter that repeats an earlier one of its declaration is
-- reported at the repetition, declaration by declaration.
uniqueTypeParameters ∷ Array Syntax.TypeDecl → Either Syntax.Diagnostic Unit
uniqueTypeParameters = traverse_ uniqueIn
  where
  uniqueIn declaration = traverse_ duplicate
    ( laterRepeat (map name declaration.parameters)
        >>= Array.index declaration.parameters
    )
  name parameter = parameter.name
  duplicate parameter = Left
    ( Syntax.problemAt (Duplicate DuplicateTypeParameter parameter.name)
        parameter.span
    )

occurrences ∷ Syntax.TypeRef → Array String
occurrences = case _ of
  Syntax.IntRef _ → []
  Syntax.BoolRef _ → []
  Syntax.UnitRef _ → []
  Syntax.TextRef _ → []
  Syntax.VarRef _ name → [ name ]
  Syntax.NamedRef _ _ arguments → Array.concatMap argumentNames arguments
  Syntax.THandlerRef _ label row → labelOccurrences label
    <> maybe [] rowVariableNames row
  Syntax.RecordRef _ fields tail → Array.concatMap fieldNames fields
    <> maybe [] tailName tail
  arrow@(Syntax.FunRef _ _ _ _) → spineOccurrences (Syntax.typeRefSpine arrow)
  where
  fieldNames field = occurrences field.ty
  tailName tail = [ tail.name ]
  spineOccurrences found = Array.concatMap occurrences
    (Array.snoc found.parameters found.result)

-- Sort disagreements are diagnosed at the second written occurrence.
sortedVariables
  ∷ Array Resolved.TypeInfo
  → Array Syntax.TypeRef
  → Maybe Syntax.RowRef
  → Either Syntax.Diagnostic (Array { name ∷ String, sort ∷ Syntax.Sort })
sortedVariables types references row = settledOccurrences
  ( Array.concatMap (typeOccurrences declared) references
      <> maybe [] (rowOccurrences declared Nothing) row
  )
  where
  declared = map declaredType types
  declaredType info = { name: info.name, sorts: info.sourceSorts }

argumentNames ∷ Syntax.TypeArgument → Array String
argumentNames = case _ of
  Syntax.TypeArgument reference → occurrences reference
  Syntax.RowArgument row → rowVariableNames row
    <> Array.concatMap labelNames (rowLabels row)

labelNames ∷ Syntax.LabelRef → Array String
labelNames label = Array.concatMap occurrences label.arguments

rowLabels ∷ Syntax.RowRef → Array Syntax.LabelRef
rowLabels (Syntax.RowRef _ labels _) = labels

labelOccurrences ∷ Syntax.LabelRef → Array String
labelOccurrences label = Array.concatMap occurrences label.arguments

rowVariableNames ∷ Syntax.RowRef → Array String
rowVariableNames (Syntax.RowRef _ _ tail) = maybe [] ending tail
  where
  ending Syntax.Pure = []
  ending (Syntax.Spread name) = [ name ]

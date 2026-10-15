module Features.Resolve.Types
  ( module Features.Resolve.TypeRef
  , typeTable
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe(..))
import Data.Traversable (traverse)
import Domain.Syntax as Syntax
import Domain.Resolved as Resolved
import Features.Resolve.Marks (markVariableRefs, refuseMarkVariables)
import Features.Resolve.Sorts (settleDeclarations)
import Features.Resolve.TypeIndices (TypeIndices)
import Features.Resolve.TypeRef (resolveType, resolveTypeWith)
import Features.Resolve.TypeValidation as TypeValidation
import Features.Resolve.Variables (uniqueTypeParameters)

-- `parameters` are the owner's, the variables its fields may name.
type Owned =
  { id ∷ Resolved.CtorId
  , owner ∷ Resolved.TypeId
  , parameters ∷ Array String
  , decl ∷ Syntax.CtorDecl
  }

-- A function or constructor name, for the shared-namespace duplicate check.
-- Declarations are checked in the order the spec fixes: types, constructors,
-- functions and parameters, then type parameters, then constructor fields.
-- `indices` are the program's types by name (TypeIndices).
typeTable
  ∷ TypeIndices → Syntax.Program → Either Syntax.Diagnostic Resolved.Tables
typeTable indices program = do
  TypeValidation.uniqueTypes program.types
  TypeValidation.uniqueCtors program.functions program.types
  TypeValidation.uniqueFunctions program.functions
  uniqueTypeParameters program.types
  declarations ← settleDeclarations indices program.types
  let
    types = Array.zipWith typeInfo (firstCtors declarations) declarations
  ctors ← traverse (resolveCtor types effects) (ownedCtors declarations)
  pure { types, ctors }
  where
  effects = map summary program.effects
  summary effect =
    { name: effect.name, arity: Array.length effect.parameters }

ownedCtors ∷ Array Syntax.TypeDecl → Array Owned
ownedCtors types = Array.mapWithIndex numbered
  (Array.concat (Array.mapWithIndex ownedBy types))
  where
  ownedBy index declaration = map
    (withOwner (Resolved.TypeId index) (parameterNames declaration.parameters))
    declaration.ctors
  name parameter = parameter.name
  parameterNames parameters = map name (Array.filter isType parameters)
    <> map name (Array.filter isRow parameters)
  withOwner owner parameters decl = { owner, parameters, decl }
  numbered index entry =
    { id: Resolved.CtorId index
    , owner: entry.owner
    , parameters: entry.parameters
    , decl: entry.decl
    }

-- Constructors are numbered in declaration order (ownedCtors), so each type
-- owns the run of ids after all earlier types' constructors. Filtering every
-- constructor per type was O(types × constructors) (A003 final review I3).
firstCtors ∷ Array Syntax.TypeDecl → Array Int
firstCtors types = Array.zipWith sub (Array.scanl add 0 counts) counts
  where
  counts = map ctorCount types
  ctorCount declaration = Array.length declaration.ctors

typeInfo ∷ Int → Syntax.TypeDecl → Resolved.TypeInfo
typeInfo first declaration =
  { name: declaration.name
  , parameters: map parameterName (typeParameters declaration.parameters)
  , rowParameters: map parameterName (rowParameters declaration.parameters)
  , variables: map parameterName (typeParameters declaration.parameters)
      <> map parameterName (rowParameters declaration.parameters)
  , sorts: map parameterSort (typeParameters declaration.parameters)
      <> map parameterSort (rowParameters declaration.parameters)
  , sourceSorts: map parameterSort declaration.parameters
  , ctors: Array.mapWithIndex ctorId declaration.ctors
  , span: declaration.span
  }
  where
  ctorId position _ = Resolved.CtorId (first + position)
  parameterName parameter = parameter.name
  typeParameters = Array.filter isType
  rowParameters = Array.filter isRow
  parameterSort parameter = parameter.sort

-- A record row parameter stands for the rest of a record type, so it is
-- passed and numbered with the type parameters, in declaration order; only
-- effect rows are row parameters (R001 design §2).
isType ∷ Syntax.TypeParameter → Boolean
isType parameter = parameter.sort /= Syntax.RowSort

isRow ∷ Syntax.TypeParameter → Boolean
isRow parameter = parameter.sort == Syntax.RowSort

resolveCtor
  ∷ Array Resolved.TypeInfo
  → Array { name ∷ String, arity ∷ Int }
  → Owned
  → Either Syntax.Diagnostic Resolved.CtorInfo
resolveCtor types effects entry = do
  refuseMarkVariables (Array.concatMap markVariableRefs entry.decl.fields)
  withFields <$> traverse field entry.decl.fields
  where
  field reference = resolveTypeWith types effects entry.parameters Nothing
    reference
  withFields fields =
    { name: entry.decl.name
    , owner: entry.owner
    , fields
    , fieldSyntax: entry.decl.fields
    , span: entry.decl.span
    }

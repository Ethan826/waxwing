module Features.Check.Tables (Lookup, typeInfo, ctorInfo, ownerType) where

import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
import Domain.Problem (Problem(..))
import Domain.Resolved
  ( CtorId(..)
  , CtorInfo
  , Ty(..)
  , TypeId(..)
  , TypeInfo
  , VarId(..)
  )
import Data.Tuple (Tuple(..))
import Domain.Row (Row(..))
import Domain.Type.Record (recordRow)
import Domain.Syntax as Syntax

-- Ids come from the checker's own tables, so a failed lookup is a compiler
-- bug. It is reported as E_INTERNAL, never read as "uninhabited" or `_`.
type Lookup a = Either Problem a

typeInfo ∷ Array TypeInfo → TypeId → Lookup TypeInfo
typeInfo types (TypeId index) = maybe' missing Right
  (Array.index types index)
  where
  missing _ = Left (Internal "Invalid type id")

ctorInfo ∷ Array CtorInfo → CtorId → Lookup CtorInfo
ctorInfo ctors (CtorId index) = maybe' missing Right
  (Array.index ctors index)
  where
  missing _ = Left (Internal "Invalid constructor id")

-- A constructor's owner applied to its own variables: a type argument per
-- type parameter and a row argument per row parameter, in declaration
-- order. Construction and patterns both instantiate it, so a row-
-- parameterized type is the same type in both.
ownerType ∷ TypeId → TypeInfo → Ty VarId
ownerType owner info = TData owner
  (Array.mapMaybe typeArgument indexed)
  (Array.mapMaybe rowArgument indexed)
  where
  indexed = Array.mapWithIndex Tuple info.sorts
  -- A record row parameter is passed as a record: the rest of one.
  typeArgument (Tuple position sort) = case sort of
    Syntax.TypeSort → Just (TVar (VarId position))
    Syntax.RecordSort → Just
      (TRecord (recordRow [] (Just (VarId position))))
    Syntax.RowSort → Nothing
  rowArgument (Tuple position sort) = case sort of
    Syntax.RowSort → Just (Row [] (Just (VarId position)))
    _ → Nothing

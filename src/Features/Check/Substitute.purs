module Features.Check.Substitute (substitute) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (maybe')
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..))
import Domain.Row (Label(..), closedRow, uniformRows)
import Domain.Type (Ty(..), VarId(..), spliceRecord)
import Domain.Type.Parts (arrows, spine)
import Features.Check.Tables (Lookup)

-- A declared field type with the owner's arguments put for its variables.
-- Coverage never reads a row (an arrow or handler is abstract to it), so
-- rows are left out: arrows pure, applications without row arguments.
substitute ∷ ∀ v. Ord v ⇒ Array (Ty v) → Ty VarId → Lookup (Ty v)
substitute arguments = case _ of
  TInt → Right TInt
  TBool → Right TBool
  TUnit → Right TUnit
  TText → Right TText
  TData id inner _ → rowless id <$> traverse (substitute arguments) inner
  TVar (VarId index) → maybe' missing Right (Array.index arguments index)
  THandler (Label effect inner mark) _ → handler effect mark <$> traverse
    (substitute arguments)
    inner
  arrow@(TFun _ _ _) → substituteSpine (spine arrow)
  TRecord row → spliceRecord <$> traverse recordField row.fields
    <*> traverse tailImage row.tails
  where
  recordField (Tuple label ty) = Tuple label <$> substitute arguments ty
  tailImage (VarId index) = maybe' missing Right
    (Array.index arguments index)
  rowless id inner = TData id inner []
  handler effect mark inner = THandler (Label effect inner mark)
    (uniformRows closedRow)
  missing _ = Left (Internal "Invalid type argument")
  substituteSpine found = arrows
    <$> traverse (substitute arguments) found.parameters
    <*> substitute arguments found.result

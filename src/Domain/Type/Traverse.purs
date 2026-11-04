-- A renaming that may fail: every variable of a type or row passed
-- through `change` in an `Applicative`, the result rebuilt as
-- `Domain.Type.rename` builds it (R036 (2); dossier §18.161 (2)). The
-- applicative traversal is McBride and Paterson's ("Applicative
-- programming with effects", JFP 18(1), 2008).
--
-- What the type gives, and no more: `traverseTy` is polymorphic in `v`
-- and `w`, so a `Ty w` it returns cannot hold a `v` that did not pass
-- through `change` (parametricity: Wadler, "Theorems for free!", FPCA
-- 1989). That every variable is visited is not given by the type; the
-- rename-agreement test (test/r0-type-traverse.test.mjs) checks it.
--
-- Spines: an `Applicative` cannot drive `tailRecM`, which needs
-- `MonadRec`, so an arrow's spine is taken by the pure loop
-- (`stagesThrough identity`), its stages traversed by Array's `traverse`,
-- and the arrow rebuilt by `Array.foldr` (a loop), as `substitute` does.
-- No recursion per arrow. Record tails are rebuilt with `spliceRecord`,
-- so fields and tails are ordered as `rename` orders them.
module Domain.Type.Traverse (traverseTy, traverseRow) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Row (Label(..), Row(..))
import Domain.Type (Ty(..), TyRow, spliceRecord, stagesThrough)

type Stage v = { parameter ∷ Ty v, row ∷ TyRow v }

traverseTy
  ∷ ∀ f v w. Applicative f ⇒ Ord w ⇒ (v → f w) → Ty v → f (Ty w)
traverseTy change = case _ of
  TInt → pure TInt
  TBool → pure TBool
  TUnit → pure TUnit
  TText → pure TText
  TVar variable → TVar <$> change variable
  TData id arguments rows → TData id <$> traverse recur arguments
    <*> traverse (traverseRow change) rows
  THandler label rows → THandler <$> traverseLabel change label
    <*> handlerRows rows.inference rows.clauses
  TRecord row → spliceRecord <$> traverse field row.fields
    <*> traverse tail row.tails
  arrow@(TFun _ _ _) → traverseArrow change arrow
  where
  recur part = traverseTy change part
  handlerRows inference clauses = { inference: _, clauses: _ }
    <$> traverseRow change inference
    <*> traverse (traverseRow change) clauses
  field (Tuple label value) = Tuple label <$> recur value
  tail variable = TVar <$> change variable

traverseRow
  ∷ ∀ f v w. Applicative f ⇒ Ord w ⇒ (v → f w) → TyRow v → f (TyRow w)
traverseRow change (Row labels tail) = Row
  <$> traverse (traverseLabel change) labels
  <*> traverse change tail

traverseLabel
  ∷ ∀ f v w
  . Applicative f
  ⇒ Ord w
  ⇒ (v → f w)
  → Label (Ty v)
  → f (Label (Ty w))
traverseLabel change (Label effect arguments mark) =
  rebuilt <$> traverse (traverseTy change) arguments
  where
  rebuilt changed = Label effect changed mark

-- The spine's arrows and final result by the pure loop; each stage's
-- parameter and row traversed; the arrow rebuilt right to left.
traverseArrow
  ∷ ∀ f v w. Applicative f ⇒ Ord w ⇒ (v → f w) → Ty v → f (Ty w)
traverseArrow change arrow =
  rebuilt <$> traverse stage (Array.mapMaybe stageOf found.arrows)
    <*> traverseTy change found.result
  where
  found = stagesThrough identity arrow
  stage each = { parameter: _, row: _ } <$> traverseTy change each.parameter
    <*> traverseRow change each.row
  rebuilt stages result = Array.foldr link result stages
  link each rest = TFun each.parameter each.row rest

-- An arrow node's parameter and row. `stagesThrough` keeps only arrows,
-- so the other arm never runs (as in `foldStages`).
stageOf ∷ ∀ v. Ty v → Maybe (Stage v)
stageOf = case _ of
  TFun parameter row _ → Just { parameter, row }
  _ → Nothing

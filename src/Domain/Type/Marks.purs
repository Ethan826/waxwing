module Domain.Type.Marks
  ( mapMarks
  , mapRowMarks
  , stripMarks
  , stripRowMarks
  , markVariables
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Domain.Row
  ( HandlerRows
  , Label(..)
  , Mark(..)
  , Row(..)
  , labelMark
  , mapHandlerRows
  )
import Domain.Type (Ty(..), TyRow, foldStages, stagesThrough)
import Domain.Type.Parts (children, rowArguments, rowsOf)

-- What a pass changes: every mark, and each handler type's pair of rows
-- once its parts are done.
type Edit v =
  { mark ∷ Mark → Mark
  , handler ∷ HandlerRows (Ty v) v → HandlerRows (Ty v) v
  }

-- Every label's mark through `change`. Spines are walked by a loop, as
-- `substitute` does; recursion enters only parameters, type arguments and
-- label arguments, which the nesting limits bound.
mapMarks ∷ ∀ v. (Mark → Mark) → Ty v → Ty v
mapMarks change = edited { mark: change, handler: identity }

mapRowMarks ∷ ∀ v. (Mark → Mark) → TyRow v → TyRow v
mapRowMarks change = editedRow { mark: change, handler: identity }

-- After Check no mark means anything: all become `Unmarked`, and a
-- handler type's clause row C is dropped, meaning R (P4).
stripMarks ∷ ∀ v. Ty v → Ty v
stripMarks = edited stripping

stripRowMarks ∷ ∀ v. TyRow v → TyRow v
stripRowMarks = editedRow stripping

stripping ∷ ∀ v. Edit v
stripping = { mark: const Unmarked, handler: onlyInference }
  where
  onlyInference rows = rows { clauses = Nothing }

edited ∷ ∀ v. Edit v → Ty v → Ty v
edited edit = case _ of
  TData id arguments rows → TData id (map recur arguments)
    (map (editedRow edit) rows)
  THandler label rows → THandler (editedLabel edit label)
    (edit.handler (mapHandlerRows (editedRow edit) rows))
  arrow@(TFun _ _ _) → editedStages (stagesThrough identity arrow)
  leaf → leaf
  where
  recur ty = edited edit ty
  editedStages found = foldStages stage (recur found.result) found.arrows
  stage parameter row rest = TFun (recur parameter) (editedRow edit row) rest

editedRow ∷ ∀ v. Edit v → TyRow v → TyRow v
editedRow edit (Row labels tail) = Row (map (editedLabel edit) labels) tail

editedLabel ∷ ∀ v. Edit v → Label (Ty v) → Label (Ty v)
editedLabel edit (Label effect arguments mark) = Label effect
  (map (edited edit) arguments)
  (edit.mark mark)

-- The mark variables a signature mentions, distinct, in first-occurrence
-- order: types left to right, a type's own label before its parts.
markVariables ∷ ∀ v. Array (Ty v) → Array String
markVariables types = Array.nub (Array.concatMap named types)

named ∷ ∀ v. Ty v → Array String
named ty = ownNames ty
  <> Array.concatMap named (children ty)
  <> Array.concatMap rowNames (rowsOf ty)

ownNames ∷ ∀ v. Ty v → Array String
ownNames = case _ of
  THandler label _ → labelNames label
  _ → []

rowNames ∷ ∀ v. TyRow v → Array String
rowNames row@(Row labels _) = Array.concatMap labelNames labels
  <> Array.concatMap named (rowArguments row)

labelNames ∷ ∀ t. Label t → Array String
labelNames label = case labelMark label of
  MarkVariable name → [ name ]
  _ → []

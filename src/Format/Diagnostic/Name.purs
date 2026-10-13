module Format.Diagnostic.Name (typeName, listed) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.String (joinWith)
import Domain.Problem (TypeName(..))

typeName ∷ TypeName → String
typeName = case _ of
  IntName → "Int"
  BoolName → "Bool"
  UnitName → "Unit"
  TextName → "Text"
  DataName name → name
  AppliedName name arguments → name <> listed (map typeName arguments)
  VariableName name → name
  HoleName → "_"
  arrow@(FunctionName _ _ _) → arrowName arrow

-- Right-associative: `(Int -> Int) -> List(Int) -> List(Int)`, a parameter
-- that is itself an arrow parenthesized. An arrow's row, when it has one to
-- show, follows the segment after the arrow: `Unit -> Unit with nofail Log`.
-- The spine of results is followed by a loop, so a name of thousands of
-- parameters costs no stack.
arrowName ∷ TypeName → String
arrowName name = tailRec step { written: "", row: Nothing, rest: name }
  where
  step pending = case pending.rest of
    FunctionName parameter row result → Loop
      { written: pending.written <> parameterName parameter
          <> rowText pending.row
          <> " -> "
      , row
      , rest: result
      }
    result → Done (pending.written <> typeName result <> rowText pending.row)
  parameterName = case _ of
    parameter@(FunctionName _ _ _) → "(" <> arrowName parameter <> ")"
    parameter → typeName parameter
  rowText = maybe "" (append " with ")

-- `(a, b)`, or nothing for no items: `Nil`, not `Nil()`.
listed ∷ Array String → String
listed items =
  if Array.null items then ""
  else "(" <> joinWith ", " items <> ")"

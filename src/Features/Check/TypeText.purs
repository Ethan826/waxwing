module Features.Check.TypeText (listed, rendered) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.String (joinWith)
import Data.Tuple (Tuple(..))
import Domain.Problem (TypeName(..))

listed ∷ Array String → String
listed parts =
  if Array.null parts then "" else "(" <> joinWith ", " parts <> ")"

-- A name as plain text, for a label's elided argument; an arrow's row follows
-- the segment it is written after, as the diagnostic's own printer does.
rendered ∷ TypeName → String
rendered = case _ of
  IntName → "Int"
  BoolName → "Bool"
  UnitName → "Unit"
  TextName → "Text"
  DataName name → name
  AppliedName name arguments → name <> listed (map rendered arguments)
  VariableName name → name
  HoleName → "_"
  RecordName fields tail → recordText fields tail
  arrow@(FunctionName _ _ _) → arrowText Nothing arrow

arrowText ∷ Maybe String → TypeName → String
arrowText pending = case _ of
  FunctionName parameter row result → rendered parameter <> withRow pending
    <> " -> "
    <> arrowText row result
  other → rendered other <> withRow pending
  where
  withRow = maybe "" (append " with ")

-- `{ a: Int, ...r }`, the fields sorted by label; `{}` for none.
recordText ∷ Array (Tuple String TypeName) → Array String → String
recordText fields tails =
  if Array.null items then "{}" else "{ " <> joinWith ", " items <> " }"
  where
  items = map field fields <> map tailItem tails
  field (Tuple label ty) = label <> ": " <> rendered ty
  tailItem name = "..." <> name

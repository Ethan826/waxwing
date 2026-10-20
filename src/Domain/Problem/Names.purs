module Domain.Problem.Names where

import Prelude (class Eq)
import Data.Maybe (Maybe)
import Data.Tuple (Tuple)

-- The names a problem carries (Domain.Problem): types, effect labels,
-- rows and missing values, already resolved to text where Format needs
-- no more.

-- `HoleName` is a type checking left open, rendered `_`. `FunctionName`
-- is one arrow, parameter then result, curried like `Ty`'s; its row text is
-- present only when the row holds a `nofail` label (FX008).
data TypeName
  = IntName
  | BoolName
  | UnitName
  | TextName
  | DataName String
  | AppliedName String (Array TypeName)
  | VariableName String
  | HoleName
  -- Fields sorted by label, and the tails' names (`...r`), if it has any.
  | RecordName (Array (Tuple String TypeName)) (Array String)
  | FunctionName TypeName (Maybe String) TypeName

derive instance eqTypeName ∷ Eq TypeName

-- An effect label as names (FX001 design §6): its effect and arguments, so
-- a mismatch can elide the arguments off the path to the difference.
type LabelName = { effect ∷ String, arguments ∷ Array TypeName }

-- A row as a comparison prints it: each label's text, whether the other
-- row lacks it, and the tail (`...r`), if the row has one. Format
-- abbreviates it; the labels are not cut here.
type RowText =
  { labels ∷ Array { text ∷ String, differs ∷ Boolean }
  , tail ∷ Maybe String
  }

-- A missing value, with constructor names already resolved. A record
-- holds every known field in label order and whether its type is open.
data Witness
  = WAny
  | WCtor String (Array Witness)
  | WInt Int
  | WBool Boolean
  | WRecord (Array (Tuple String Witness)) Boolean


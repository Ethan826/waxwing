module Format.Diagnostic.Witness (pattern) where

import Prelude
import Data.Array as Array
import Data.String (joinWith)
import Data.Tuple (Tuple(..))
import Domain.Problem (Witness(..))
import Format.Diagnostic.Name (listed)

-- Witnesses print as Waxwing patterns: `_`, literals, `Name(field, …)`,
-- and a record literal with every known field in label order, `...` last
-- for an open type (R004 design §3).
pattern ∷ Witness → String
pattern = case _ of
  WAny → "_"
  WInt value → show value
  WBool value → show value
  WCtor name fields → name <> listed (map pattern fields)
  WRecord fields open → record fields open

-- `{ ... }` and `{}` are no patterns, so a record type with no known field
-- prints as the `_` that covers it.
record ∷ Array (Tuple String Witness) → Boolean → String
record fields open =
  if Array.null fields then "_"
  else "{ " <> joinWith ", " (map field fields <> rest) <> " }"
  where
  field (Tuple label value) = label <> ": " <> pattern value
  rest = if open then [ "..." ] else []

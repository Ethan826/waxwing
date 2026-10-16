module Format.Parse.RecordPattern (recordPattern) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax (FieldPattern, Pattern(..), Span)
import Format.Parse.Grammar
  ( Parser
  , dispatch
  , expect
  , ifSecond
  , manyOn
  , nested
  , on
  , optionalOn
  , spanned
  )
import Format.Parse.RecordType (label)

data Item = FieldItem FieldPattern | RestItem Span | EndItem

-- `{ a: p, b, ... }` (R004 design §1): a first field, then `, field` or a
-- final `, ...`, and a comma may follow the last item. Parsing the first
-- field alone is what refuses `{}` and `{ ... }` with the field parser's own
-- text, and a `...` that does not end the list with the closing brace's.
-- Each field's pattern is one level deeper, as a constructor's are.
recordPattern ∷ Parser Pattern → Parser Pattern
recordPattern inner = spanned written
  (expect "{" *> (assemble <$> first <*> manyOn "," (more inner)) <* expect "}")
  where
  first = field inner
  written span found = PRecord span found.fields found.rest
  assemble head items =
    { fields: [ head ] <> Array.mapMaybe fieldOf items
    , rest: Array.findMap restOf items
    }
  fieldOf = case _ of
    FieldItem value → Just value
    _ → Nothing
  restOf = case _ of
    RestItem span → Just span
    _ → Nothing

-- One item after a comma; the comma belongs to it, so that a `...` can
-- demand what follows it.
more ∷ Parser Pattern → Parser Item
more inner = expect "," *> dispatch
  [ on "}" (pure EndItem), on "..." restItem ]
  (FieldItem <$> field inner)

-- `...` ends the list: only `}` or `,}` may follow, so a later field is
-- refused at the comma.
restItem ∷ Parser Item
restItem = spanned restOf (expect "...") <* closing
  where
  restOf span _ = RestItem span
  closing = dispatch [ on "}" (pure unit), on "," afterComma ] unexpected
  afterComma = ifSecond (eq "}") (void (expect ",")) unexpected
  unexpected = void (expect "}")

-- A bare label puns: it binds the name it spells (design §5).
field ∷ Parser Pattern → Parser FieldPattern
field inner = fieldOf <$> label <*> optionalOn ":" (expect ":" *> nested inner)
  where
  fieldOf found given =
    { label: found.text
    , span: found.span
    , pattern: maybe (PBind found.span found.text) identity given
    }

module Format.Diagnostic.Records
  ( effectRowAsRecord
  , expectedRecord
  , lackedField
  , mayHaveField
  , missingField
  , patternMissingField
  , patternMissingRest
  , recordRowAsEffect
  , secondSpread
  , typeAsRecordRow
  ) where

import Prelude

-- The texts of the record diagnostics (R001, R004, R005), apart from
-- Format.Diagnostic so that Tranche B's texts have room there. Types
-- arrive printed.
recordRowAsEffect ∷ String → String
recordRowAsEffect name = name <> " is a record row, not an effect row"

effectRowAsRecord ∷ String → String
effectRowAsRecord name = name <> " is an effect row, not a record row"

typeAsRecordRow ∷ String → String
typeAsRecordRow name = name <> " is a type, not a record row"

missingField ∷ String → String → String
missingField label ty = label <> " is not a field of " <> ty

mayHaveField ∷ String → String → String
mayHaveField name label = name <> " may already have field " <> label

lackedField ∷ String → String → String
lackedField label name = label <> " is not allowed here: " <> name
  <> " lacks { "
  <> label
  <> " }"

expectedRecord ∷ String → String
expectedRecord ty = "Expected a record, found " <> ty

patternMissingField ∷ String → String
patternMissingField label = "Pattern is missing field " <> label
  <> "; add it or end the pattern with ..."

patternMissingRest ∷ String → String
patternMissingRest ty = "Pattern is missing the rest of " <> ty
  <> "; end the pattern with ..."

secondSpread ∷ String
secondSpread = "A record literal accepts at most one spread"

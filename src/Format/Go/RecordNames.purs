module Format.Go.RecordNames
  ( recordName
  , recordField
  , compareRecordName
  , showRecordName
  ) where

import Prelude
import Domain.IR.Internal (LayoutId(..))

-- One Go struct per record layout (R001 design §5), with its helpers.
recordName ∷ LayoutId → String
recordName (LayoutId index) = "waxwingRec" <> show index

-- A label is an identifier, and the fixed prefix makes every field name
-- distinct from every other and from every Go keyword.
recordField ∷ String → String
recordField label = "f_" <> label

compareRecordName ∷ LayoutId → String
compareRecordName (LayoutId index) = "waxwingCmpRec" <> show index

showRecordName ∷ LayoutId → String
showRecordName (LayoutId index) = "waxwingShowRec" <> show index

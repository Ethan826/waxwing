module Domain.Type.RecordSubst (Image(..), spliceImage) where

import Prelude
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple)
import Domain.Type.Record (RecordRow, recordRow)

-- What a record's tail variable became under a substitution, seen through
-- the field type `a` without naming the type: Core owns `Ty` and
-- classifies the image, so this module does not depend on it. A tail is a
-- record-sorted variable (resolution checks), so another image does not
-- arise; were one to, the row ends there.
data Image a v
  = Spliced (RecordRow a v)
  | Renamed v
  | Ended

-- The written fields, then what the tail became: a record's fields join
-- them and its tail ends the row; another variable is the new tail.
spliceImage
  ∷ ∀ a v
  . Array (Tuple String a)
  → Maybe (Image a v)
  → RecordRow a v
spliceImage written = maybe (recordRow written Nothing) spliced
  where
  spliced = case _ of
    Spliced more → recordRow (written <> more.fields) more.tail
    Renamed variable → recordRow written (Just variable)
    Ended → recordRow written Nothing

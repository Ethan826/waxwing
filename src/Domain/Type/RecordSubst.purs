module Domain.Type.RecordSubst (Image(..), spliceImages) where

import Prelude
import Data.Array as Array
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

-- The written fields, then what each tail became: a record's fields join
-- them and its tails join the row's; another variable is itself a tail.
-- No tail is the common case and allocates nothing beyond the row.
spliceImages
  ∷ ∀ a v
  . Ord v
  ⇒ Array (Tuple String a)
  → Array (Image a v)
  → RecordRow a v
spliceImages written images
  | Array.null images = recordRow written []
  | otherwise =
      recordRow (written <> Array.concatMap fieldsOf images)
        (Array.concatMap tailsOf images)
      where
      fieldsOf = case _ of
        Spliced more → more.fields
        _ → []
      tailsOf = case _ of
        Spliced more → more.tails
        Renamed variable → [ variable ]
        Ended → []

module Domain.Type.Record
  ( RecordRow
  , recordRow
  , sortFields
  , labels
  , fieldTypes
  , mapFields
  , traverseFields
  , emptyRecord
  , withoutLabels
  ) where

import Prelude
import Data.Array as Array
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst, snd)

-- A record's fields by label, and the variables standing for the rest of
-- the record (R001 design §2; R005 Tranche B design P1: several), none if
-- it is closed. `a` is the field type: Core owns `Ty` and applies this to
-- it, so the row cannot name it. A tail is a variable of record sort,
-- whose image is a record type: `{ a: A, ...r }` with `r` bound to
-- `{ b: B }` is `{ a: A, b: B }`; the row's value is the fields and every
-- tail's image together. Fields are kept sorted by label and tails by the
-- variable's order, repeats kept, so neither label nor tail order
-- distinguishes two records and structural equality and ordering are the
-- sorted row's.
type RecordRow a v = { fields ∷ Array (Tuple String a), tails ∷ Array v }

recordRow
  ∷ ∀ a v. Ord v ⇒ Array (Tuple String a) → Array v → RecordRow a v
recordRow fields tails = { fields: sortFields fields, tails: sortTails tails }

-- Rows have no tail or one almost always: sorting those would copy the
-- array for nothing.
sortTails ∷ ∀ v. Ord v ⇒ Array v → Array v
sortTails tails
  | Array.length tails < 2 = tails
  | otherwise = Array.sort tails

sortFields ∷ ∀ a. Array (Tuple String a) → Array (Tuple String a)
sortFields = Array.sortWith fst

labels ∷ ∀ a v. RecordRow a v → Array String
labels row = map fst row.fields

-- Written `{}` since R005 (design §4); still the empty closed row.
emptyRecord ∷ ∀ a v. RecordRow a v
emptyRecord = { fields: [], tails: [] }

-- The row without these labels' fields, its tails kept: a removal's or a
-- rest binder's remainder (R005 design §3).
withoutLabels ∷ ∀ a v. Array String → RecordRow a v → RecordRow a v
withoutLabels removed row = row { fields = Array.filter kept row.fields }
  where
  kept (Tuple label _) = not (Array.elem label removed)

fieldTypes ∷ ∀ a v. RecordRow a v → Array a
fieldTypes row = map snd row.fields

-- Labels and the tails stay, so the order stays sorted.
mapFields ∷ ∀ a b v. (a → b) → RecordRow a v → RecordRow b v
mapFields change row = row { fields = map field row.fields }
  where
  field (Tuple label ty) = Tuple label (change ty)

traverseFields
  ∷ ∀ f a b v
  . Applicative f
  ⇒ (a → f b)
  → RecordRow a v
  → f (RecordRow b v)
traverseFields change row = withFields <$> traverse field row.fields
  where
  field (Tuple label ty) = Tuple label <$> change ty
  withFields fields = row { fields = fields }

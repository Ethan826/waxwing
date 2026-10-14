module Domain.Type.Record
  ( RecordRow
  , recordRow
  , sortFields
  , labels
  , fieldTypes
  , mapFields
  , traverseFields
  , emptyRecord
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst, snd)

-- A record's fields by label, and the variable standing for the rest of
-- the record (R001 design §2), if it is open. `a` is the field type: Core
-- owns `Ty` and applies this to it, so the row cannot name it. The tail is
-- a variable of record sort, whose image is a record type: `{ a: A, ...r }`
-- with `r` bound to `{ b: B }` is `{ a: A, b: B }`. Fields are kept sorted
-- by label, so label order never distinguishes two records and structural
-- equality and ordering are the sorted row's.
type RecordRow a v = { fields ∷ Array (Tuple String a), tail ∷ Maybe v }

recordRow ∷ ∀ a v. Array (Tuple String a) → Maybe v → RecordRow a v
recordRow fields tail = { fields: sortFields fields, tail }

sortFields ∷ ∀ a. Array (Tuple String a) → Array (Tuple String a)
sortFields = Array.sortWith fst

labels ∷ ∀ a v. RecordRow a v → Array String
labels row = map fst row.fields

-- Internal only: source has no empty record type (design §1).
emptyRecord ∷ ∀ a v. RecordRow a v
emptyRecord = { fields: [], tail: Nothing }

fieldTypes ∷ ∀ a v. RecordRow a v → Array a
fieldTypes row = map snd row.fields

-- Labels and the tail stay, so the order stays sorted.
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

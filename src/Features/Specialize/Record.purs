module Features.Specialize.Record (recordType, writtenField) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.IR.Internal as IR
import Domain.Syntax (FieldRef)
import Domain.Type.Record (RecordRow)
import Features.Specialize.Copy (get, modify)
import Features.Specialize.Layouts (internLayout, layoutFields)
import Features.Specialize.State (Specializing)

-- A record type at one key (R001 design §5): each field lowered by `field`
-- in sorted label order, then the tail's image, the layout a key argument
-- stands for, spliced in; the whole is interned as one layout. A field's
-- types are numbered before the layout holding them, as an arrow's are
-- before the arrow. A tail no key fixes, an unsolved hole (`tail` gives
-- Nothing), is the empty rest. So is an image that is not a layout, which
-- no key gives: an unsolved record-sorted instantiation argument is
-- lowered as the empty rest too (Features.Specialize.Values), not as the
-- representative.
recordType
  ∷ ∀ a v
  . (String → a → Specializing IR.Ty)
  → (v → Specializing (Maybe IR.Ty))
  → RecordRow a v
  → Specializing IR.Ty
recordType field tail row = do
  fields ← traverse lowered row.fields
  rest ← maybe (pure Nothing) tail row.tail
  state ← get
  let
    interned = internLayout
      (fields <> maybe [] (layoutFields state.layouts) rest)
      state.layouts
  modify (withLayouts interned.layouts)
  pure interned.ty
  where
  lowered (Tuple label ty) = Tuple label <$> field label ty
  withLayouts layouts state = state { layouts = layouts }

-- A record field's written source, found by its label: the type keeps
-- fields sorted, the source keeps them as written.
writtenField
  ∷ ∀ a
  . (Unit → Specializing a)
  → (FieldRef → Specializing a)
  → Array FieldRef
  → String
  → Specializing a
writtenField missing found written label = maybe' missing found
  (Array.find named written)
  where
  named reference = reference.name == label

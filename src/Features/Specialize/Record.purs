module Features.Specialize.Record (recordType, writtenField) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe, maybe, maybe')
import Data.Traversable (traverse)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.IR.Internal as IR
import Domain.Syntax (FieldRef, Span)
import Domain.Type.Record (RecordRow)
import Features.Specialize.Copy (get, modify)
import Features.Specialize.Keys (internal)
import Features.Specialize.Layouts (internLayout, layoutFields)
import Features.Specialize.State (Specializing)

-- A record type at one key (R001 design §5): each field lowered by `field`
-- in sorted label order, then each tail's image, the layout a key argument
-- stands for, spliced in; the whole is interned as one layout. A field's
-- types are numbered before the layout holding them, as an arrow's are
-- before the arrow. A tail no key fixes, an unsolved hole (`tail` gives
-- Nothing), is the empty rest. So is an image that is not a layout, which
-- no key gives: an unsolved record-sorted instantiation argument is
-- lowered as the empty rest too (Features.Specialize.Values), not as the
-- representative. A label both written and in the tail's image is
-- E_INTERNAL at `span`: the checker's lacks sets exclude it (R001 design
-- §2, rule 4), so it is a checker defect, reported rather than lowered to
-- a Go struct with a field declared twice.
recordType
  ∷ ∀ a v
  . (String → a → Specializing IR.Ty)
  → (v → Specializing (Maybe IR.Ty))
  → Span
  → RecordRow a v
  → Specializing IR.Ty
recordType field tail span row = do
  fields ← traverse lowered row.fields
  rests ← traverse tail row.tails
  state ← get
  let spliced = fields <> Array.concatMap (restOf state) rests
  if repeated spliced then internal "Duplicate record label" span unit
  else interned (internLayout spliced state.layouts)
  where
  lowered (Tuple label ty) = Tuple label <$> field label ty
  restOf state = maybe [] (layoutFields state.layouts)
  interned found = modify (withLayouts found.layouts) $> found.ty
  withLayouts layouts state = state { layouts = layouts }
  repeated spliced = Set.size (Set.fromFoldable (map fst spliced))
    /= Array.length spliced

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

module Features.Check.WrittenRef (refAt) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax (TypeRef(..))
import Features.Check.PartOrigin as Part

-- The written type at these steps from a written type's root (R005
-- Tranche B diagnostics R8: where a row is written), when the source
-- writes that position: a field of a written record, an arrow's
-- parameter or result. An alias or an applied type's argument is no
-- position here (Nothing).
refAt ∷ TypeRef → Array Part.Step → Maybe TypeRef
refAt root steps = tailRec step { at: root, rest: steps }
  where
  step found = maybe (Done (Just found.at)) (onwardFrom found.at)
    (Array.uncons found.rest)
  onwardFrom at next = onward at next.head next.tail
  onward at head tail = case head, at of
    Part.Field name, RecordRef _ fields _ →
      continue tail (fieldType name fields)
    Part.Parameter, FunRef _ parameter _ _ → Loop { at: parameter, rest: tail }
    Part.Result, FunRef _ _ _ result → Loop { at: result, rest: tail }
    _, _ → Done Nothing
  continue tail = maybe (Done Nothing) (resumed tail)
  resumed tail at = Loop { at, rest: tail }
  fieldType name fields = map fieldTy (Array.find (named name) fields)
  named name field = field.name == name
  fieldTy field = field.ty

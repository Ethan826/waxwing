module Features.Check.RowMerge.Several (severalUnknownBy) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..))
import Domain.Row (Label(..))
import Domain.Row as EffectRow
import Domain.Type (Ty(..))

-- Whether some record row in the type has two tails `unknown` holds of,
-- by a loop along arrow spines, a handler's own rows included.
severalUnknownBy ∷ ∀ v. (v → Boolean) → Ty v → Boolean
severalUnknownBy unknown = several
  where
  several ty = tailRec step ty
  step = case _ of
    TRecord row → Done
      (twoUnknown row.tails || Array.any fieldHolds row.fields)
    TData _ arguments rows → Done
      (Array.any several arguments || Array.any rowHolds rows)
    TFun parameter row result
      | several parameter || rowHolds row → Done true
      | otherwise → Loop result
    THandler label rows → Done
      ( labelHolds label || rowHolds rows.inference
          || maybe false rowHolds rows.clauses
      )
    _ → Done false
  fieldHolds (Tuple _ part) = several part
  twoUnknown tails = Array.length (Array.filter unknown tails) > 1
  rowHolds (EffectRow.Row labels _) = Array.any labelHolds labels
  labelHolds (Label _ arguments _) = Array.any several arguments


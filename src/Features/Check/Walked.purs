module Features.Check.Walked (End(..), walkedRow, headedRow, endOf) where

import Prelude
import Prim hiding (Row)
import Data.Maybe (maybe)
import Domain.Checked.Internal (Open(..))
import Domain.Row (Label(..), Row(..))
import Domain.Type (Ty(..), TyRow, VarId)
import Features.Check.Scheme (flexibleRow, opened)
import Features.Check.Subst (Flex, Subst, walk, walkRow)

-- How a row ends once its tail's bindings are spliced in: an unbound meta, a
-- signature's own variable, or closed.
data End = Loose Int | Fixed VarId | Ended

endOf ∷ Subst → TyRow Open → End
endOf subst row = maybe Ended ended tail
  where
  Row _ tail = walkedRow subst row
  ended = case _ of
    Hole meta → Loose meta
    Rigid variable → Fixed variable

-- A row with its tail's bindings spliced in and nothing else resolved: the
-- labels keep their arguments as written. `resolvedRow` resolves every
-- label argument, which for a handler type carrying a clause row beside its
-- inference row doubles the tree per level of nesting (Task 7); the hook
-- reads only a row's spine, its tail and its label keys, so it uses this.
walkedRow ∷ Subst → TyRow Open → TyRow Open
walkedRow subst row = case opened (TFun TUnit spine TUnit) of
  TFun _ found _ → found
  _ → row
  where
  spine = walkRow subst (flexibleRow row)

-- The spliced row with each label argument followed to its head, enough for
-- a `Fail` label's key; the arguments below the head stay as written.
headedRow ∷ Subst → TyRow Open → TyRow Flex
headedRow subst row = Row (map headed labels) tail
  where
  Row labels tail = walkRow subst (flexibleRow row)
  headed (Label effect arguments mark) =
    Label effect (map (walk subst) arguments) mark

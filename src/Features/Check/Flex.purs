module Features.Check.Flex (Flex(..), metaOf) where

import Prelude
import Data.Maybe (Maybe(..))
import Domain.Type (VarId)

-- A checker variable: a signature's own variable, which is fixed inside
-- its function and unifies only with itself, or a meta, which stands for
-- one use's still unknown type or row and may be bound to any. A variable
-- has one sort by construction, so a meta is looked up by its position:
-- a type's variable in `types`, a row's tail in `rows`.
data Flex = Rigid VarId | Meta Int

derive instance eqFlex ∷ Eq Flex
derive instance ordFlex ∷ Ord Flex

metaOf ∷ Flex → Maybe Int
metaOf = case _ of
  Meta meta → Just meta
  Rigid _ → Nothing

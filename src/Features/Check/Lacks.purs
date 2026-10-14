module Features.Check.Lacks
  ( lacksOf
  , addLacks
  , seedLacks
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Set (Set)
import Data.Set as Set
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (Ty)
import Features.Check.Implied (Implied, implied)
import Features.Check.Subst (Flex, Subst(..))

-- The labels a record tail may never hold (R001 design §2, rule 4).
lacksOf ∷ Subst → Flex → Set String
lacksOf (Subst bindings) tail = maybe Set.empty identity
  (Map.lookup tail bindings.lacks)

addLacks ∷ Flex → Set String → Subst → Subst
addLacks tail labels subst@(Subst bindings)
  | Set.isEmpty labels = subst
  | otherwise = Subst bindings
      { lacks = Map.insertWith Set.union tail labels bindings.lacks }

-- What a signature's types say its record tails lack, at one use (each
-- tail a fresh meta) or for its own body (each a rigid). A signature with
-- no record row variable has no record tail, so its types are not
-- searched (every program before records).
seedLacks
  ∷ Resolved.Tables → Array Syntax.Sort → Array (Ty Flex) → Subst → Subst
seedLacks tables sorts types subst =
  if Array.elem Syntax.RecordSort sorts then
    foldl noted subst (Array.concatMap (implied tables) types)
  else subst
  where
  noted reached (found ∷ Implied Flex) = addLacks found.tail found.labels
    reached

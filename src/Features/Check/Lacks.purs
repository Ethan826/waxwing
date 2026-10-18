module Features.Check.Lacks
  ( lacksOf
  , lacksIn
  , addLacks
  , addLackTable
  , seedLacks
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Set (Set)
import Data.Tuple (Tuple(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (Ty)
import Features.Check.Implied (Implied, implied)
import Features.Check.RowStore (Lack, lackTable, plain, withLacks)
import Features.Check.Subst (Flex, Subst, onStore, storeOf)

-- The labels a record tail may never hold (R001 design §2, rule 4).
lacksOf ∷ Subst → Flex → Set String
lacksOf subst tail = Map.keys (lacksIn subst tail)

-- The same, each with why (R005 Tranche B design §1.3).
lacksIn ∷ Subst → Flex → Map String Lack
lacksIn subst = lackTable (storeOf subst)

-- Labels the tail lacks for no reason a diagnostic names: implied by a
-- type, or by a row the checker made (Tranche A's shape text).
addLacks ∷ Flex → Set String → Subst → Subst
addLacks tail labels = addLackTable tail
  (Map.fromFoldable (map withPlain (Array.fromFoldable labels)))
  where
  withPlain label = Tuple label plain

-- Labels with their reasons; of two reasons for one label the preferred.
addLackTable ∷ Flex → Map String Lack → Subst → Subst
addLackTable tail found = onStore (withLacks tail found)

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

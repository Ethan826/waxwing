module Features.Check.RowStore
  ( RowStore(..)
  , WrittenLack
  , emptyStore
  ) where

import Data.Map (Map)
import Data.Map as Map
import Data.Set (Set)
import Domain.Syntax (Span)
import Features.Check.Flex (Flex)

-- What the record tails of a substitution are known to satisfy (R005
-- Tranche B design §1.3), kept inside the substitution so that a
-- postponed effect pair that reverts it reverts these too. `lacks` (R001):
-- the labels each record tail may never hold, a meta's or a signature's
-- rigid one's (Features.Check.Lacks). `written` (R005): for a lacked
-- label that a `where` clause wrote, the clause's variable and the
-- label's span.
newtype RowStore = RowStore
  { lacks ∷ Map Flex (Set String)
  , written ∷ Map Flex (Map String WrittenLack)
  }

type WrittenLack = { variable ∷ String, span ∷ Span }

emptyStore ∷ RowStore
emptyStore = RowStore { lacks: Map.empty, written: Map.empty }

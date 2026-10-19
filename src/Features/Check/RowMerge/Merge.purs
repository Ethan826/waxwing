module Features.Check.RowMerge.Merge
  ( Row
  , Merge
  , Merges
  , emptyMerges
  ) where

import Prim hiding (Row)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe)
import Domain.Syntax (Span)
import Domain.Type (Ty)
import Domain.Type.Record (RecordRow)
import Features.Check.Flex (Flex)

type Row = RecordRow (Ty Flex) Flex

-- A waiting predicate `Merge left right result`: `result` is the disjoint
-- union of `left` and `right` (R005 Tranche B plan §2.2; PureScript's
-- `Prim.Row.Union` with `Nub`, research/row-merge-qt qt-strict.mjs). Its
-- parts were required disjoint when it was made. `site` is the span of
-- the use that made it, diagnostic metadata no case reads.
type Merge =
  { id ∷ Int, left ∷ Row, right ∷ Row, result ∷ Row, site ∷ Maybe Span }

-- The predicates of one substitution, kept in its row store so that a
-- postponed effect pair's revert removes what was made inside it.
-- `waiting`, by identity; `next`, the next identity; `boundBy`, for each
-- meta a case bound, the predicate whose case it was (R10.1, extended to
-- case 2; read when a later failure meets the binding); `moves`, for each
-- predicate, the labels each case 3 moved into its result, in order (the
-- termination lemma's record, rules §5, checked by the oracle runner).
type Merges =
  { waiting ∷ Map Int Merge
  , next ∷ Int
  , boundBy ∷ Map Int Int
  , moves ∷ Map Int (Array (Array String))
  }

emptyMerges ∷ Merges
emptyMerges =
  { waiting: Map.empty, next: 0, boundBy: Map.empty, moves: Map.empty }

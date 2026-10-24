-- A recorded problem from what generation wrote (T-R0b §10; moved from
-- Features.Check.Generate unchanged in R0 Task 7.1a, so that D1's `seal`
-- assembles its problem the same way): the variables by quantifier and
-- sort, the entries as written, `q` empty, and the declaration and the
-- program's holder set (ruling K-a) from the header.
module Features.Check.Generate.Assemble
  ( Header
  , assemble
  ) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom (Holders, Quant(..), Var, VarInfo, VarSort(..))
import Domain.Recorded.Internal (RecordedProblem(..))
import Domain.Resolved (FunctionId)
import Features.Check.Generate.Out (Out)

type Header = { decl ∷ FunctionId, holders ∷ Holders }

assemble ∷ Header → Out → RecordedProblem
assemble header out = RecordedProblem
  { decl: header.decl
  , rigidTy: keys rigidType
  , rigidRow: keys rigidRow
  , flexTy: keys flexType
  , flexRow: keys flexRow
  , d: out.d
  , q: []
  , b: out.b
  , bq: out.bq
  , outside: out.outside
  , adm: out.adm
  , split: out.split
  , vars
  , types: Map.fromFoldable out.types
  , holders: header.holders
  }
  where
  vars = Map.fromFoldable out.vars
  keys wanted = Array.mapMaybe (keyOf wanted)
    (Map.toUnfoldable vars ∷ Array (Tuple Var VarInfo))
  keyOf wanted (Tuple var info) =
    if wanted info then Just var else Nothing
  rigidType info = rigid info && info.sort == SortType
  rigidRow info = rigid info && info.sort == SortRow
  flexType info = not (rigid info) && info.sort == SortType
  flexRow info = not (rigid info) && info.sort == SortRow
  rigid info = case info.quant of
    Forall _ → true
    Exists → false

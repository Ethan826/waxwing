module Features.Check.ResultClauses (ownClauses) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Maybe (Maybe(..), isNothing)
import Domain.Checked.Internal (Open(..))
import Domain.Row (Row(..))
import Domain.Type (Ty(..), TyRow)
import Features.Check.Scheme (foldHoles)
import Features.Check.Subst (empty)
import Features.Check.Walked (bareLabel)

-- A written handler type has no clause row of its own (P2): C is R. At a
-- function's use, a top-level result handler type gets one (design §3.4,
-- refined by Task 9). R is bound to the installing row at `with`, which
-- must not reach C, and C must still see what the callee's clauses perform.
-- C's tail is R's only when that variable occurs in a parameter or in the
-- function's own row, where a caller's handler can fill it. Elsewhere it is
-- the callee's alone, and by parametricity its clauses can reach it only
-- through a rigid tail, which already makes the handler's own mark M.
-- C keeps no label arguments (`bareLabel`).
ownClauses ∷ Array (Ty Open) → TyRow Open → Ty Open → Ty Open
ownClauses parameters row result = case result of
  THandler label rows
    | isNothing rows.clauses → THandler label
        rows { clauses = Just (copied rows.inference) }
  _ → result
  where
  copied (Row labels tail) = Row (map (bareLabel empty) labels)
    (tail >>= kept)
  kept = case _ of
    Hole meta | not (occurs meta) → Nothing
    other → Just other
  occurs meta = foldHoles (found meta) false (TFun TUnit row TUnit)
    || Array.any (foldHoles (found meta) false) parameters
  found meta reached other = reached || other == meta

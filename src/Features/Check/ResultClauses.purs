module Features.Check.ResultClauses (ownClauses) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Maybe (Maybe(..), isNothing, maybe)
import Data.Tuple (Tuple(..))
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
-- a fresh meta of the callee's alone: by parametricity its clauses reach
-- nothing else through R's tail. It is not closed, because C ≡ C with
-- another value's C (an `if`, a `let`) must be able to merge in more labels
-- or a rigid tail (§6); unbound, the tail pass closes it. C keeps no label
-- arguments (`bareLabel`). Returns the next unused meta and the type.
ownClauses
  ∷ Int → Array (Ty Open) → TyRow Open → Ty Open → Tuple Int (Ty Open)
ownClauses next parameters row result = case result of
  THandler label rows
    | isNothing rows.clauses → Tuple (spent rows.inference)
        (THandler label rows { clauses = Just (copied rows.inference) })
  _ → Tuple next result
  where
  copied (Row labels tail) = Row (map (bareLabel empty) labels)
    (kept =<< tail)
  spent (Row _ tail) = maybe next (const (next + 1)) (replaced =<< tail)
  replaced = case _ of
    Hole meta | not (occurs meta) → Just meta
    _ → Nothing
  kept = case _ of
    Hole meta | not (occurs meta) → Just (Hole next)
    other → Just other
  occurs meta = foldHoles (found meta) false (TFun TUnit row TUnit)
    || Array.any (foldHoles (found meta) false) parameters
  found meta reached other = reached || other == meta

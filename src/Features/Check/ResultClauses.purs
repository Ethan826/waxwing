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
-- Rule H′ (FX033; docs/plans/r0-amin-resultc-tail.md on r0-t2-d1, §5 and
-- Review 2): C's tail is R's when that variable occurs anywhere a caller
-- can fill it: in a parameter, in the function's own row, or in the result
-- type outside R's own tail position (the handled label's arguments, R's
-- label arguments, and everything nested in them). A clause then receives
-- values typed by it as operation arguments (FX033's x1), so C must reach
-- the installing row's assumptions. Only when the variable occurs as R's
-- tail alone is C's tail a fresh meta of the callee's. That H′ suffices is
-- an argued candidate, not an established result: the argument (§6, RC′)
-- rests on an unproved parametricity step and substitution property, and
-- blocking FX033's probes is not soundness. H′ also refuses programs whose
-- clauses never use such values (c1, x1z): a precision limitation, not
-- policy. The fresh tail is not closed, because C ≡ C with another value's
-- C (an `if`, a `let`) must be able to merge in more labels or a rigid
-- tail (§6); unbound, the tail pass closes it. C keeps no label arguments
-- (`bareLabel`). Returns the next unused meta and the type.
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
    || foldHoles (found meta) false (untailed result)
  found meta reached other = reached || other == meta

-- A result handler type without its inference row's tail: every position
-- of the result where R's tail variable may occur other than as R's tail.
untailed ∷ Ty Open → Ty Open
untailed = case _ of
  THandler label rows → THandler label rows
    { inference = withoutTail rows.inference }
  other → other
  where
  withoutTail (Row labels _) = Row labels Nothing

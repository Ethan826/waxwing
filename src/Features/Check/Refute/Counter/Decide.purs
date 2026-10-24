-- The call-site decider, a port of Lean's `decideCall`
-- (Composition/Unify/Decider.lean; Reduction.lean): one presence pattern
-- per subset of `pairsOf C` (a row variable of `C` with a label written
-- in `C`), each row variable replaced by the closed record of its
-- present labels at fresh type variables (`patternSubst`, allocated as
-- `freshAlloc`: past every type variable, by position in the pairs), and
-- the closed problem decided by `decideClosed`. Lean proves
-- `decideCall_correct` for its definition (true exactly when `C` is
-- satisfiable); this port is checked against a brute-force oracle
-- (test/r0-cx.test.mjs). An unsatisfiable problem enumerates all
-- 2^|pairs| patterns, which is CX question 3's cost; `patterns` reports
-- how many were tried. Lean's `dedup` keeps last occurrences, `nub`
-- (Counter/Term.purs) first ones: only the order of the pairs, so the
-- fresh numbering and field order, differs; the fresh variables stay
-- distinct and past every type variable (`FreshFor` still holds).
module Features.Check.Refute.Counter.Decide
  ( Decided
  , decideCall
  , pairCount
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (concatMap, filter, foldr, length, mapWithIndex, replicate)
import Data.Array (zip) as Array
import Data.Map (empty, fromFoldable)
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..), snd)
import Features.Check.Refute.Counter.Term
  ( Atom
  , RowValue
  , Term(..)
  , labelsOf
  , rowVarsOf
  , substProblem
  , tyVarsOf
  )
import Features.Check.Refute.Counter.Unify (decideClosed)

type Decided = { satisfiable ∷ Boolean, patterns ∷ Int }

type Pair = { row ∷ Int, label ∷ String, fresh ∷ Int }

decideCall ∷ Array Atom → Decided
decideCall atoms =
  tailRec tried { present: replicate (length pairs) false, patterns: 1 }
  where
  pairs = pairsOf atoms
  rows = rowVarsOf atoms
  tried { present, patterns } =
    if decideClosed (patternProblem atoms rows pairs present) then
      Done { satisfiable: true, patterns }
    else maybe (Done { satisfiable: false, patterns }) (continue patterns)
      (successor present)
  continue patterns present = Loop { present, patterns: patterns + 1 }

-- |pairsOf C|: the pattern count is 2 to this power.
pairCount ∷ Array Atom → Int
pairCount atoms = length (rowVarsOf atoms) * length (labelsOf atoms)

pairsOf ∷ Array Atom → Array Pair
pairsOf atoms = mapWithIndex allocated
  (concatMap withLabels (rowVarsOf atoms))
  where
  labels = labelsOf atoms
  base = foldr max 0 (tyVarsOf atoms) + 1
  withLabels row = map (Tuple row) labels
  allocated at (Tuple row label) = { row, label, fresh: base + at }

-- The closed problem of the pattern that makes the `present` pairs
-- present.
patternProblem
  ∷ Array Atom → Array Int → Array Pair → Array Boolean → Array Atom
patternProblem atoms rows pairs present =
  substProblem { ty: empty, row: fromFoldable (map closed rows) } atoms
  where
  chosen = map snd (filter isPresent (Array.zip present pairs))
  isPresent (Tuple flag _) = flag
  closed row = Tuple row (fieldsOf row)
  fieldsOf row =
    { fields: map field (filter (at row) chosen), tails: [] }
      ∷ RowValue
  at row pair = pair.row == row
  field pair = Tuple pair.label (TVar pair.fresh)

-- The next subset in binary order, or `Nothing` after the last.
successor ∷ Array Boolean → Maybe (Array Boolean)
successor present = if carried.carry then Nothing else Just carried.flags
  where
  carried = foldr bump { carry: true, flags: [] } present
  bump flag { carry, flags } =
    { carry: carry && flag, flags: [ flag /= carry ] <> flags }

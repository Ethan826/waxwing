-- Applying a substitution to a recorded type (Task 4.2,
-- docs/plans/r0-entailed-ground.md §2 "Binding"): a bound tail's row is
-- merged into the record it closes, `{K | ρ}` under `ρ := {M | T}`
-- becoming `{K ∪ M | T}`. A label in both `K` and `M` makes the record
-- undefined in every assignment, so the application fails (`Nothing`).
module Features.Check.Entailed.Merge
  ( Fields
  , substitute
  ) where

import Prelude
import Data.Array (concatMap, length, nub)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom (RTExpr(..), Var)
import Features.Check.Spine (spine, unspine)

type Fields = { fields ∷ Array (Tuple String RTExpr), tails ∷ Array Var }

substitute ∷ Map Var RTExpr → RTExpr → Maybe RTExpr
substitute theta ty = case ty of
  Arrow _ _ → arrow <$> traverse recur found.parameters <*> recur found.result
  Base base → Just (Base base)
  TVar variable → Just (maybe ty identity (Map.lookup variable theta))
  Record entries tails →
    traverse field entries >>= record <@> map (rowOf theta) tails
  App head arguments → App head <$> traverse recur arguments
  where
  recur = substitute theta
  found = spine ty
  arrow parameters result = unspine { parameters, result }
  field (Tuple label value) = Tuple label <$> recur value

-- The record with each tail's row merged in; images are already
-- substituted (θ is idempotent), so they are not walked again.
record ∷ Array (Tuple String RTExpr) → Array Fields → Maybe RTExpr
record own added =
  if length (nub labels) == length labels then
    Just (Record entries (concatMap _.tails added))
  else Nothing
  where
  entries = own <> concatMap _.fields added
  labels = map fst entries

-- A tail's row under θ: its binding, or the tail itself. A row
-- variable is bound only to a record (R5's bindings), so the other
-- arms keep the tail, which is never reached.
rowOf ∷ Map Var RTExpr → Var → Fields
rowOf theta tail = maybe kept bound (Map.lookup tail theta)
  where
  kept = { fields: [], tails: [ tail ] }
  bound = case _ of
    Record fields tails → { fields, tails }
    Arrow _ _ → kept
    Base _ → kept
    TVar _ → kept
    App _ _ → kept


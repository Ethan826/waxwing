-- G0's candidate (T-R0a §4.2; Task 4.2): a generic substitution, which
-- maps flexible variables of the problem to terms over rigid variables,
-- and its application. Untrusted plumbing: only
-- Features.Check.Strategy.Substitution's check judges a candidate.
module Features.Check.Strategy.Candidate
  ( Substitution
  , generic
  , under
  ) where

import Prelude
import Data.Array (all, concatMap, sort, sortWith)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom
  ( Quant(..)
  , RTExpr(..)
  , Var
  , VarInfo
  , VarSort(..)
  )
import Features.Check.Mentions (mentions)
import Features.Check.Spine (spine, unspine)

-- A row variable maps to a record term: its fields and tails are what
-- the row adds where the variable is a tail.
type Substitution = Map Var RTExpr

-- Generic: every key is a flexible variable of the problem, a row
-- variable's image is a record, and no image mentions a key, so one
-- application is the whole substitution (idempotence).
generic ∷ RecordedProblem → Substitution → Boolean
generic problem candidate =
  all bound (Map.toUnfoldable candidate ∷ Array (Tuple Var RTExpr))
  where
  bound (Tuple variable image) =
    maybe false (fits image) (Map.lookup variable (fields problem).vars)
      && not (mentions keyed image)
  keyed variable = Map.member variable candidate

-- The type under the candidate, in canonical form: record fields by
-- label and tails sorted, as generation writes them, so record equality
-- is syntactic equality.
under ∷ Substitution → RTExpr → RTExpr
under candidate ty = case ty of
  Arrow _ _ → unspine
    { parameters: map recur found.parameters, result: recur found.result }
  Base base → Base base
  TVar variable → maybe ty canonical (Map.lookup variable candidate)
  Record fields tails → canonical
    ( Record (map field fields <> concatMap _.fields (rows tails))
        (concatMap _.tails (rows tails))
    )
  App head arguments → App head (map recur arguments)
  where
  recur = under candidate
  found = spine ty
  field (Tuple label value) = Tuple label (recur value)
  rows = map (rowOf candidate)

-- What a tail adds under the candidate. An unbound tail stays; so does
-- one bound to a non-record, which `generic` refuses before any use.
rowOf
  ∷ Substitution
  → Var
  → { fields ∷ Array (Tuple String RTExpr), tails ∷ Array Var }
rowOf candidate tail = maybe kept added (Map.lookup tail candidate)
  where
  kept = { fields: [], tails: [ tail ] }
  added = case _ of
    Record found remaining → { fields: found, tails: remaining }
    Arrow _ _ → kept
    Base _ → kept
    TVar _ → kept
    App _ _ → kept

fits ∷ RTExpr → VarInfo → Boolean
fits image info = case info.quant, info.sort of
  Forall _, _ → false
  Exists, SortType → true
  Exists, SortRow → isRecord image

isRecord ∷ RTExpr → Boolean
isRecord = case _ of
  Record _ _ → true
  Arrow _ _ → false
  Base _ → false
  TVar _ → false
  App _ _ → false

-- Records sorted at every depth; labels are kept, repeats included, so
-- definedness can still see a repeated label.
canonical ∷ RTExpr → RTExpr
canonical ty = case ty of
  Arrow _ _ → unspine
    { parameters: map canonical found.parameters
    , result: canonical found.result
    }
  Base base → Base base
  TVar variable → TVar variable
  Record fields tails → Record (sortWith fst (map field fields)) (sort tails)
  App head arguments → App head (map canonical arguments)
  where
  found = spine ty
  field (Tuple label value) = Tuple label (canonical value)

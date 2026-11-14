-- trusted surface: every diff needs token review; see docs/engineering.md
-- G0's judgement of one `B` atom under a candidate, against `D` (T-R0a
-- §4.2; Task 4.2). `D` holds `lacks` and `disjoint` atoms on rigid rows
-- only (Generate/Signature.purs), so what it entails about a rigid row
-- is what it lists: no `D` atom makes a row empty or equates two rows.
-- A tail the candidate leaves unbound has no facts at all, so nothing
-- about it is entailed. Each judgement is sound for every rigid
-- assignment satisfying `D` (argued: an equation's two canonical sides
-- are syntactically equal, so equal whenever both are defined, and
-- definedness is checked from the listed facts alone).
module Features.Check.Strategy.Atoms
  ( Facts
  , atomUnder
  , defined
  , facts
  ) where

import Prelude
import Data.Array
  ( all
  , any
  , concat
  , concatMap
  , drop
  , length
  , mapWithIndex
  , nub
  )
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Recorded (AtomId, RecordedProblem, fields)
import Domain.Recorded.Atom (Atom(..), RTExpr(..), Var)
import Domain.Recorded.Origin (Entry)
import Domain.Verdict.Search (CheckRefusal(..))
import Features.Check.Spine (spine)
import Features.Check.Strategy.Candidate (Substitution, under)

type Facts =
  { lacks ∷ Set (Tuple Var String), disjoint ∷ Set (Tuple Var Var) }

type RowTerm = { entries ∷ Array (Tuple String RTExpr), tails ∷ Array Var }

-- `D`'s facts, each `disjoint` in both orders.
facts ∷ RecordedProblem → Facts
facts problem =
  { lacks: Set.fromFoldable (concatMap lacked found)
  , disjoint: Set.fromFoldable (concatMap separated found)
  }
  where
  found = map _.value (fields problem).d
  lacked = case _ of
    Lacks row label → [ Tuple row label ]
    Disjoint _ _ → []
    Equal _ _ → []
    Ff → []
  separated = case _ of
    Disjoint one other → [ Tuple one other, Tuple other one ]
    Lacks _ _ → []
    Equal _ _ → []
    Ff → []

atomUnder ∷ Facts → Substitution → Entry Atom → Either CheckRefusal Unit
atomUnder known candidate entry = case entry.value of
  Equal one other → equal known id (under candidate one) (under candidate other)
  Lacks row label → lacking known id (rowUnder candidate row) label
  Disjoint one other →
    apart known id (rowUnder candidate one) (rowUnder candidate other)
  Ff → Left (Unsatisfied id)
  where
  id = entry.origin.atom

equal ∷ Facts → AtomId → RTExpr → RTExpr → Either CheckRefusal Unit
equal known id one other
  | not (defined known one && defined known other) = Left (Undefined id)
  | one == other = Right unit
  | otherwise = Left (Unsatisfied id)

lacking ∷ Facts → AtomId → RowTerm → String → Either CheckRefusal Unit
lacking known id row label
  | not (rowDefined known row) = Left (Undefined id)
  | rowLacks known row label = Right unit
  | otherwise = Left (NotEntailed id)

apart ∷ Facts → AtomId → RowTerm → RowTerm → Either CheckRefusal Unit
apart known id one other
  | not (rowDefined known one && rowDefined known other) =
      Left (Undefined id)
  | rowsApart known one other = Right unit
  | otherwise = Left (NotEntailed id)

-- Every composition defined, at every depth.
defined ∷ Facts → RTExpr → Boolean
defined known ty = case ty of
  Arrow _ _ → all recur found.parameters && recur found.result
  Base _ → true
  TVar _ → true
  Record entries tails → rowDefined known { entries, tails }
  App _ arguments → all recur arguments
  where
  recur = defined known
  found = spine ty

-- One row's own composition and its field types: no label twice, each
-- tail lacking each field, the tails pairwise apart.
rowDefined ∷ Facts → RowTerm → Boolean
rowDefined known row =
  length (nub labels) == length labels
    && all lacksAll row.tails
    && all pairApart (pairs row.tails)
    && all (defined known <<< snd) row.entries
  where
  labels = map fst row.entries
  lacksAll tail = all (listedLacks known tail) labels
  pairApart (Tuple one other) = listedApart known one other

rowLacks ∷ Facts → RowTerm → String → Boolean
rowLacks known row label =
  not (any (eq label <<< fst) row.entries) && all lacksLabel row.tails
  where
  lacksLabel tail = listedLacks known tail label

rowsApart ∷ Facts → RowTerm → RowTerm → Boolean
rowsApart known one other =
  all (rowLacks known other <<< fst) one.entries
    && all (rowLacks known one <<< fst) other.entries
    && all tailApart one.tails
  where
  tailApart tail = all (listedApart known tail) other.tails

-- A row variable's row under the candidate. An unbound one is its own
-- tail; so is one bound to a non-record, which `generic` refuses first.
rowUnder ∷ Substitution → Var → RowTerm
rowUnder candidate row = maybe kept bound (Map.lookup row candidate)
  where
  kept = { entries: [], tails: [ row ] }
  bound image = case under candidate image of
    Record entries tails → { entries, tails }
    Arrow _ _ → kept
    Base _ → kept
    TVar _ → kept
    App _ _ → kept

listedLacks ∷ Facts → Var → String → Boolean
listedLacks known tail label = Set.member (Tuple tail label) known.lacks

listedApart ∷ Facts → Var → Var → Boolean
listedApart known one other =
  one /= other && Set.member (Tuple one other) known.disjoint

-- Each unordered pair of distinct positions once.
pairs ∷ ∀ a. Array a → Array (Tuple a a)
pairs items = concat (mapWithIndex later items)
  where
  later index item = map (Tuple item) (drop (index + 1) items)

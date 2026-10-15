module Features.Check.UnifyRow
  ( Unifier
  , ignoringArguments
  , unifyRows
  , unifyRowsIgnoring
  , unifyRowsTraced
  , untraced
  ) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldM)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Tuple (Tuple(..))
import Domain.Row (Label(..), isPure, labelKey)
import Domain.Type (Ty, TyRow)
import Features.Check.FlatRecord (failHead)
import Features.Check.Binding (extendRow)
import Features.Check.MarkStore (RowMode(..))
import Features.Check.Occurrence (Sides, nowhere)
import Features.Check.Origin (RowEvent(..), linked)
import Features.Check.RowFinish
  ( Operands
  , Pending
  , Traced
  , finish
  , postponed
  , shared
  )
import Features.Check.RowSide
  ( Entry
  , Tail(..)
  , expanded
  , mismatched
  , tailOf
  , written
  )
import Features.Check.Search (Stack(..))
import Features.Check.UnifyMark (pairMarks, targetLabel)
import Features.Check.Subst (Flex(..), Subst, resolveLabel, resolveRow)
import Features.Check.UnifyFailure (Failure(..))

-- The type unifier, passed in: Features.Check.Unify calls this module.
type Unifier = Subst → Ty Flex → Ty Flex → Either Failure Subst

-- The unifier for a clause row C, which keeps no label arguments of its own
-- (Task 7 ruling): C's labels pair by key and relate marks and tails only.
-- C's arguments are never unified; R carries and checks them.
ignoringArguments ∷ Unifier
ignoringArguments subst _ _ = Right subst

-- Leijen's scoped-label unification (2005, §7; design §2). Each left
-- label, in order, matches the first right entry with its key, whose
-- arguments then unify; with none, the right's meta tail is extended with
-- it, unless that would bind the left's own tail (`tail(r1) ∉ dom(θ)`),
-- which would rewrite forever (`Clock + ...r` against `Log + ...r`).
-- Left over right entries extend the left's meta tail, one at a time.
-- A loop over labels: no recursion per label. A Fail label whose key is
-- still deferred (its payload's head unknown), on the left or among the
-- right entries up to the match, postpones the whole pair: the
-- substitution reverts to `subst` with the pair added to its `postponed`
-- (Features.Check.Unify `settleRows` retries it), and the enclosing
-- unification goes on.
-- Two pure rows (every row before row syntax) skip the loop.
unifyRows ∷ Unifier → Subst → TyRow Flex → TyRow Flex → Either Failure Subst
unifyRows unify = unifyRowsIn unify EqualMarks

-- The same, ignoring marks: a handler's inference row R, whose marks are
-- dead (design §3.4). A label either side gains has a fresh mark.
unifyRowsIgnoring
  ∷ Unifier → Subst → TyRow Flex → TyRow Flex → Either Failure Subst
unifyRowsIgnoring unify = unifyRowsIn unify IgnoreMarks

unifyRowsIn
  ∷ Unifier
  → RowMode
  → Subst
  → TyRow Flex
  → TyRow Flex
  → Either Failure Subst
unifyRowsIn unify mode subst left right =
  if isPure left && isPure right then Right subst
  else solved <$> unifyRowsTraced unify mode untraced subst left right
  where
  solved traced = linked traced.events traced.subst

-- The same, with each label's fate reported by occurrence; the caller
-- links them (Features.Check.Origin) once it has named them.
unifyRowsTraced
  ∷ Unifier
  → RowMode
  → Sides
  → Subst
  → TyRow Flex
  → TyRow Flex
  → Either Failure Traced
unifyRowsTraced unify mode sides subst left right = tailRec
  (step unify { left, right, start: subst, sides, mode })
  { subst
  , left: written sides.left left
  , right: written sides.right right
  , events: Bottom
  , mode
  }

-- Spans for an untraced use, whose events are dropped unread.
untraced ∷ Sides
untraced = { left: nowhere, right: nowhere }

step
  ∷ Unifier
  → Operands
  → Pending
  → Step Pending (Either Failure Traced)
step unify operands pending =
  maybe' (finish operands current) (consume unify operands current)
    (Array.index current.left.entries current.left.next)
  where
  current = pending
    { left = expanded pending.subst pending.left
    , right = expanded pending.subst pending.right
    }

consume
  ∷ Unifier
  → Operands
  → Pending
  → Entry
  → Step Pending (Either Failure Traced)
consume unify operands pending entry =
  maybe' (postponed operands) keyed (keyOf entry)
  where
  keyOf found = labelKey (failHead pending.subst) found.label
  entries = pending.right.entries
  keyed key = maybe' (absent operands pending entry) (decided key)
    (Array.findIndex (stops key) entries)
  -- The first entry with the key, or with a key not yet known.
  stops key other = maybe true (eq key) (keyOf other)
  decided key index = maybe' (postponed operands)
    (present unify operands.sides pending entry <<< withIndex index)
    (matching key =<< Array.index entries index)
  matching key other =
    if keyOf other == Just key then Just other else Nothing
  withIndex index other = { index, other }

present
  ∷ Unifier
  → Sides
  → Pending
  → Entry
  → { index ∷ Int, other ∷ Entry }
  → Step Pending (Either Failure Traced)
present unify sides pending entry found =
  either (Done <<< Left <<< mismatched sides pending.subst entry found.other)
    (Loop <<< matched)
    (foldM unifyPair pending.subst (Array.zip arguments others) >>= marked)
  where
  Label _ arguments _ = entry.label
  Label _ others _ = found.other.label
  unifyPair subst (Tuple one other) = unify subst one other
  marked subst = pairMarks pending.mode subst found.other.occurrence
    entry.label
    found.other.label
  entries = pending.right.entries
  matched subst = pending
    { subst = subst
    , left = pending.left { next = pending.left.next + 1 }
    , right = pending.right
        { entries = Array.take found.index entries
            <> Array.drop (found.index + 1) entries
        }
    , events = Push (Matched entry.occurrence found.other.occurrence)
        pending.events
    }

-- No right entry has the label's key: extend the right's meta tail.
absent
  ∷ Operands → Pending → Entry → Unit → Step Pending (Either Failure Traced)
absent operands pending entry _ = case tailOf pending.right.tail of
  MetaTail meta
    | tailOf pending.left.tail == MetaTail meta → Done
        (Left (shared operands pending.subst))
    | otherwise → either (Done <<< Left) (Loop <<< extended meta)
        (extendRow made.subst meta made.label)
  _ → Done
    ( Left
        ( RowMissing (resolveLabel pending.subst entry.label)
            (resolveRow pending.subst operands.right)
            entry.occurrence
        )
    )
  where
  made = targetLabel pending.mode pending.subst entry.label
  extended meta extension = pending
    { subst = extension.subst
    , left = pending.left { next = pending.left.next + 1 }
    , right = pending.right { tail = Just (Meta extension.fresh) }
    , events = Push (Extended meta entry.occurrence) pending.events
    }


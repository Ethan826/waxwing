module Features.Check.RowMerge.End
  ( Ended
  , Judge
  , endOfBody
  , ended
  , homeless
  , withoutH
  , waitingSite
  ) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmpty
import Data.Either (Either(..), either)
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax (Span)
import Features.Check.Atom (Atom)
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Homes (admits)
import Features.Check.RowMerge.Cases (Progress(..), Unifier, examine)
import Features.Check.RowMerge.Merge (Merge)
import Features.Check.RowMerge.Predicate (waiting)
import Features.Check.RowResidue (atomOf, constants, residue)
import Features.Check.Subst (Subst)
import Features.Check.UnifyFailure (Failure(..))

-- How a body ended (R005 Tranche B plan §2.5): no predicate waits, so the
-- substitution read with every unknown left `{}` is the solution; or
-- predicates wait and H found no constant without a home, so the body is
-- undecided, with every waiting predicate in identity order. Only
-- `endOfBody` makes one (Features.Check.RowOutcome's `Settled` witness
-- is made from it alone).
data Ended = Accepted Subst | Undecided Subst (NonEmptyArray Merge)

-- H (rules §7), injected so the test entry can run without it: an atom
-- of a waiting predicate that no unknown of the other side can hold.
type Judge = Subst → Merge → Maybe Atom

-- The end of a body, after settling and its joint fixpoint (§2.9). A
-- waiting predicate that could still progress is a broken invariant (the
-- fixpoint did not finish), a stop that stays a stop. Then H, in
-- identity order, on the final substitution, which it cannot change:
-- its refusal is the predicate's, at the predicate's site (B5 gives it
-- the approved location).
endOfBody ∷ Unifier → Judge → Subst → Either Failure Ended
endOfBody unify judge subst =
  maybe (Right (Accepted subst)) waited (NonEmpty.fromArray (waiting subst))
  where
  waited merges = traverse_ (stillWaits unify subst) merges
    *> judged merges
  judged merges = maybe (Right (Undecided subst merges)) Left
    (Array.findMap refused (NonEmpty.toArray merges))
  refused merge = refusal merge <$> judge subst merge
  refusal merge atom = FromMerge { predicate: merge.id, at: merge.site }
    (Homeless atom)

ended ∷ ∀ a. (Subst → a) → (Subst → NonEmptyArray Merge → a) → Ended → a
ended accepted undecided = case _ of
  Accepted subst → accepted subst
  Undecided subst merges → undecided subst merges

-- H's test on one predicate (plan §2.5): cancel equal atoms between
-- `left ⊎ right` and `result` (research/row-merge-qt qt-strict.mjs
-- `homeless`); the first constant, the parts' side first, that every
-- unknown of the other side cannot hold (Features.Check.Homes, §2.6).
homeless ∷ Judge
homeless subst merge = Array.head
  (unhoused found.mine found.theirs <> unhoused found.theirs found.mine)
  where
  found = residue
    ( joined (flatten subst merge.left)
        (flatten subst merge.right)
    )
    (flatten subst merge.result)
  unhoused one other = Array.filter (nowhere other)
    (map atomOf (constants one))
  nowhere other atom = Array.all (not <<< flip (admits subst) atom)
    other.metas

withoutH ∷ Judge
withoutH _ _ = Nothing

-- The earliest made waiting predicate's site.
waitingSite ∷ Subst → Maybe Span
waitingSite subst = Array.head (Array.mapMaybe _.site (waiting subst))

stillWaits ∷ Unifier → Subst → Merge → Either Failure Unit
stillWaits unify subst merge = either failed progressed
  (examine unify merge subst)
  where
  failed failure
    | stop failure = Left failure
    | otherwise = Left (Unexpected unfinished)
  progressed = case _ of
    Waits → Right unit
    _ → Left (Unexpected unfinished)
  unfinished = "a waiting predicate could still progress at the end of a "
    <> "body"

joined ∷ Flat → Flat → Flat
joined one other =
  { fields: one.fields <> other.fields, tails: one.tails <> other.tails }

stop ∷ Failure → Boolean
stop = case _ of
  TooDeep → true
  Unexpected _ → true
  Placeholder _ → true
  Exhausted _ → true
  _ → false

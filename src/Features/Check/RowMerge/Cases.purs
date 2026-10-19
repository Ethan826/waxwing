module Features.Check.RowMerge.Cases
  ( Unifier
  , Progress(..)
  , examine
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty(..))
import Domain.Type.Record (recordRow)
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Lacks (addLacks)
import Features.Check.RowMerge.Merge (Merge, Row)
import Features.Check.Subst (Flex(..), Subst(..))
import Features.Check.UnifyFailure (Failure)

-- The ordinary unifier, without re-examination (Features.Check.Unify).
type Unifier = Subst → Ty Flex → Ty Flex → Either Failure Subst

-- What examining one predicate did: it holds and is gone; case 3 replaced
-- it, moving these labels into its result; or nothing could be decided.
data Progress = Solved Subst | Replaced Merge (Array String) Subst | Waits

-- PureScript 0.15.16's `unionRows` cases on the parts as written, then,
-- if none progresses, on the parts swapped (Sym, approved 2026-10-19;
-- plan §2.3). Each effect goes through the ordinary unifier, so a failure
-- is an ordinary one. A case never guesses and makes no predicate.
examine ∷ Unifier → Merge → Subst → Either Failure Progress
examine unify merge subst = oriented unify asWritten merge subst
  >>= mirrored
  where
  mirrored = case _ of
    Waits → oriented unify swapped merge subst
    progress → Right progress

-- One orientation: which part is the left one, and how a replaced left
-- part is written back.
type Orientation =
  { left ∷ Merge → Row, right ∷ Merge → Row, rest ∷ Merge → Row → Merge }

asWritten ∷ Orientation
asWritten = { left: _.left, right: _.right, rest: leftRest }
  where
  leftRest merge row = merge { left = row }

swapped ∷ Orientation
swapped = { left: _.right, right: _.left, rest: rightRest }
  where
  rightRest merge row = merge { right = row }

-- research/row-merge-qt qt-strict.mjs `oriented`: case 1 (the left part
-- closed; Entailment.hs 636-638) and the adaptation 1g (no part has an
-- unknown; rules file §3) give t := L ⊎ R; case 2 (the right part and t
-- closed; 639-660) gives the left part t minus R's labels, each shared
-- field's types unified, or waits if R holds a label t lacks (654); case
-- 3 (the left part has fields and a tail; 661-672) moves L's fields into
-- t beside a fresh u that lacks them and leaves `Merge rest(L) R u`.
oriented ∷ Unifier → Orientation → Merge → Subst → Either Failure Progress
oriented unify way merge subst =
  if closed left || (unknownless left && unknownless right) then
    Solved <$> unify subst (TRecord merge.result) union
  else if closed right && closed result then
    subtracted unify (way.left merge) right result subst
  else if not (Array.null left.fields) then
    moved unify way merge left subst
  else Right Waits
  where
  union = TRecord
    ( recordRow (left.fields <> right.fields)
        (left.tails <> right.tails)
    )
  left = flatten subst (way.left merge)
  right = flatten subst (way.right merge)
  result = flatten subst merge.result

subtracted ∷ Unifier → Row → Flat → Flat → Subst → Either Failure Progress
subtracted unify part right result subst =
  if Array.all (flip Map.member table <<< fst) right.fields then
    Solved <$> (foldM shared subst right.fields >>= rested)
  else Right Waits
  where
  table = Map.fromFoldable result.fields
  taken = Set.fromFoldable (map fst right.fields)
  shared reached (Tuple label ty) = maybe (Right reached) (unify reached ty)
    (Map.lookup label table)
  rested reached = unify reached (TRecord part)
    ( TRecord
        ( recordRow
            ( Array.filter (not <<< flip Set.member taken <<< fst)
                result.fields
            )
            []
        )
    )

moved
  ∷ Unifier → Orientation → Merge → Flat → Subst → Either Failure Progress
moved unify way merge left (Subst bindings) =
  replaced <$> unify lacking (TRecord merge.result)
    (TRecord (recordRow left.fields [ fresh ]))
  where
  fresh = Meta bindings.fresh
  taken = Subst bindings { fresh = bindings.fresh - 1 }
  labels = map fst left.fields
  lacking = addLacks fresh (Set.fromFoldable labels) taken
  replaced reached = Replaced
    ( (way.rest merge { fields: [], tails: left.tails })
        { result = { fields: [], tails: [ fresh ] } }
    )
    labels
    reached

closed ∷ Flat → Boolean
closed row = Array.null row.tails

unknownless ∷ Flat → Boolean
unknownless row = not (Array.any isMeta row.tails)

isMeta ∷ Flex → Boolean
isMeta = case _ of
  Meta _ → true
  Rigid _ → false

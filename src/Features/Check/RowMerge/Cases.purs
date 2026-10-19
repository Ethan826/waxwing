module Features.Check.RowMerge.Cases
  ( Unifier
  , Progress(..)
  , examine
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM, foldl)
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
-- field's types unified, or waits if R holds a label t lacks (654); the
-- adaptation 2g (R and t hold no unknown, and t holds every label and
-- rigid tail of R; rules file §3, approved 2026-10-19) gives t minus R's
-- labels and rigid tails the same way, and otherwise makes no claim, so a
-- missing atom never stops case 3; case 3 (the left part has fields and a
-- tail; 661-672) moves L's fields into t beside a fresh u that lacks them
-- and leaves `Merge rest(L) R u`.
oriented ∷ Unifier → Orientation → Merge → Subst → Either Failure Progress
oriented unify way merge subst =
  if closed left || (unknownless left && unknownless right) then
    Solved <$> unify subst (TRecord merge.result) union
  else if closed right && closed result then
    if holdsAll right result then subtract
    else Right Waits
  else if
    unknownless right && unknownless result
      && holdsAll right result then subtract
  else if not (Array.null left.fields) then
    moved unify way merge left subst
  else Right Waits
  where
  union = TRecord
    ( recordRow (left.fields <> right.fields)
        (left.tails <> right.tails)
    )
  subtract = subtracted unify (way.left merge) right result subst
  left = flatten subst (way.left merge)
  right = flatten subst (way.right merge)
  result = flatten subst merge.result

-- Whether t holds every label of R, by name, and every rigid tail of R,
-- one of t's tails each, by identity alone.
holdsAll ∷ Flat → Flat → Boolean
holdsAll right result =
  Array.all (flip Set.member labels <<< fst) right.fields
    && Array.null (cancelled result.tails right.tails).missing
  where
  labels = Set.fromFoldable (map fst result.fields)

-- Case 2 or 2g once `holdsAll` holds: each shared field's types unified,
-- then the left part is t less R's labels and less one equal tail for
-- each rigid tail of R (2g's justification: with no unknown on either
-- side, disjoint union cancels, so the left part has this one value).
subtracted ∷ Unifier → Row → Flat → Flat → Subst → Either Failure Progress
subtracted unify part right result subst =
  Solved <$> (foldM shared subst right.fields >>= rested)
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
            (cancelled result.tails right.tails).rest
        )
    )

-- The tails of `from` less one occurrence of each of `taken`, and those
-- of `taken` that `from` did not hold.
cancelled
  ∷ Array Flex → Array Flex → { rest ∷ Array Flex, missing ∷ Array Flex }
cancelled from = foldl cancel { rest: from, missing: [] }
  where
  cancel found tail
    | Array.elem tail found.rest = found
        { rest = Array.delete tail found.rest }
    | otherwise = found { missing = Array.snoc found.missing tail }

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

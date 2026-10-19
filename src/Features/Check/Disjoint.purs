module Features.Check.Disjoint
  ( requireDisjoint
  , requireLack
  , requireApart
  , wellFormed
  , ownPairs
  , seedApart
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe')
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty)
import Domain.Type.Record (RecordRow)
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Lacks (addLackTable, lacksOf)
import Features.Check.Narrow (prune)
import Features.Check.Refused (Solving, refusedBy)
import Features.Check.RowStore (Because, Lack, partnersOf, withApart)
import Features.Check.Subst (Flex(..), Subst, onStore, storeOf)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

type Row = RecordRow (Ty Flex) Flex

-- Design §3.1, rules §10: `left # right` (their union well formed), for
-- `lack`'s reason, decomposed on the rows as flattened now. A label on
-- both sides is the overlap; each label of one side is lacked by each
-- tail of the other, in sorted order, the left side's labels first
-- (location rule 5); then each tail of one side is apart from each tail
-- of the other. This is the pair's meaning written pairwise, so solutions
-- are kept, and each refusal (overlap, a rigid without the hypothesis, a
-- rigid twice) has none. `lack.from` is the meta whose binding brought
-- the left side's labels, kept on each lack (D2's `first written here`).
requireDisjoint ∷ Solving → Lack → Subst → Row → Row → Either Failure Subst
requireDisjoint solving lack subst left right =
  maybe' separated overlapped (Array.find shared (labelsOf one))
  where
  one = flatten subst left
  other = flatten subst right
  shared label = Array.elem label (labelsOf other)
  overlapped label = refusedBy solving.failed subst Nothing (Tuple label lack)
  separated _ = labelsAgainst solving lack one other subst
    >>= labelsAgainst solving lack other one
    >>= tailsApart solving lack one.tails other.tails

-- Each label of `labelled` lacked by each tail of `tailed`.
labelsAgainst ∷ Solving → Lack → Flat → Flat → Subst → Either Failure Subst
labelsAgainst solving lack labelled tailed subst = foldM lacked subst
  (Array.concatMap byLabel (labelsOf labelled))
  where
  byLabel label = map (Tuple label) tailed.tails
  lacked reached (Tuple label tail) = requireLack solving lack reached tail
    label

-- Each tail of one side apart from each tail of the other.
tailsApart
  ∷ Solving → Lack → Array Flex → Array Flex → Subst → Either Failure Subst
tailsApart solving lack ones others subst = foldM paired subst
  (Array.concatMap byTail ones)
  where
  byTail tail = map (Tuple tail) others
  paired reached (Tuple tail other) = requireApart solving lack reached tail
    other

-- `tail` lacks `label`. A rigid must lack it by hypothesis (D3'' for a
-- pair's reason). A meta bound since the requirement was made passes it
-- to its image: the label must not be among the image's fields, and each
-- of its tails lacks it. An unbound meta records it, with its reason, and
-- its upper bound loses the label (U2, Features.Check.Narrow).
requireLack ∷ Solving → Lack → Subst → Flex → String → Either Failure Subst
requireLack solving lack subst tail label = case tail of
  Rigid _
    | Set.member label (lacksOf subst tail) → Right subst
    | otherwise → refusedBy solving.failed subst (Just tail) (Tuple label lack)
  Meta _
    | bare tail image → prunedTail solving
        (addLackTable tail (Map.singleton label lack) subst)
        tail
    | Array.elem label (labelsOf image) →
        refusedBy solving.failed subst Nothing (Tuple label lack)
    | otherwise → foldM inherited subst image.tails
  where
  image = flatten subst { fields: [], tails: [ tail ] }
  inherited reached part = requireLack solving lack reached part label

-- `one # other` for two tails. Bound since the requirement was made,
-- their images are decomposed instead. A meta apart from itself holds
-- nothing, so it is bound to `{}`; a rigid apart from itself is D3'; two
-- rigids need the body's hypothesis (D3); otherwise the pair is stored,
-- and a meta's upper bound loses a rigid it is now apart from (U2).
requireApart ∷ Solving → Lack → Subst → Flex → Flex → Either Failure Subst
requireApart solving lack subst one other =
  if alone one && alone other then tailPair solving lack.because subst one other
  else requireDisjoint solving lack subst (row one) (row other)
  where
  alone tail = bare tail (flatten subst (row tail))

tailPair ∷ Solving → Because → Subst → Flex → Flex → Either Failure Subst
tailPair solving because subst one other = case one, other of
  Meta meta, Meta again | meta == again → solving.emptied subst meta
  Rigid _, Rigid _
    | one == other → Left (Refused (Twice one because))
    | Map.member one (partnersOf (storeOf subst) other) → Right subst
    | otherwise → Left
        (Refused (Unproven (min one other) (max one other) because))
  _, _ → pruneBoth solving one other
    (onStore (withApart one other because) subst)

-- Design §3.1's last paragraph: a row's own parts are disjoint, each tail
-- lacking each label and each two tails apart, required where the row is
-- made. A label twice in the row is the caller's mismatch.
wellFormed ∷ Solving → Lack → Subst → Row → Either Failure Subst
wellFormed solving lack subst written =
  if repeated (labelsOf flat) then solving.failed subst
  else labelsAgainst solving lack flat flat subst
    >>= ownPairs solving lack flat.tails
  where
  flat = flatten subst written

-- Each two of these tails apart, the earlier first.
ownPairs ∷ Solving → Lack → Array Flex → Subst → Either Failure Subst
ownPairs solving lack tails subst = foldM paired subst
  (Array.concat (Array.mapWithIndex later tails))
  where
  later index tail = map (Tuple tail) (Array.drop (index + 1) tails)
  paired reached (Tuple tail other) = requireApart solving lack reached tail
    other

-- A pair a signature or a clause states, between two different fresh
-- metas at a use or two rigids in the body: stored as it is.
seedApart ∷ Flex → Flex → Because → Subst → Subst
seedApart one other because = onStore (withApart one other because)

pruneBoth ∷ Solving → Flex → Flex → Subst → Either Failure Subst
pruneBoth solving one other subst = prunedTail solving subst one
  >>= pruneOther
  where
  pruneOther reached = prunedTail solving reached other

-- The one place this module narrows a meta's upper bound (U2): the tail
-- if it is a meta, nothing for a rigid.
prunedTail ∷ Solving → Subst → Flex → Either Failure Subst
prunedTail solving subst = case _ of
  Meta meta → prune solving subst meta
  Rigid _ → Right subst

-- Whether the flattened row is the tail alone: unbound, or rigid.
bare ∷ Flex → Flat → Boolean
bare tail flat = Array.null flat.fields && flat.tails == [ tail ]

row ∷ Flex → Row
row tail = { fields: [], tails: [ tail ] }

labelsOf ∷ Flat → Array String
labelsOf flat = map fst flat.fields

-- Sorted, so a label held twice is held by neighbours.
repeated ∷ Array String → Boolean
repeated labels = Array.any same (Array.zip labels (Array.drop 1 labels))
  where
  same (Tuple one other) = one == other

module Features.Check.UnifyRecord (unifyRecord) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe, maybe, maybe')
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty(..))
import Domain.Type.Record (RecordRow)
import Features.Check.RecordTail (Fields, bindTail, shareTails)
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Subst (Flex(..), Subst, metaOf, walk)
import Features.Check.UnifyFailure (Failure(..))
import Features.Check.UnifyParts (mismatch)

-- Record rows unify by label (R001 design §2). Each side is first
-- followed through its tail's bindings to its fields and a tail that is
-- closed, rigid or an unbound meta. The labels both sides hold unify
-- field-wise, in label order, through `unifyField` (Features.Check.Unify,
-- one level deeper). The rest decides the tails: none left on either
-- side, the tails are the same (rule 1, or a meta bound to the other's
-- tail); labels left on one side only extend the other side's meta tail
-- (rule 2); on both sides, two distinct meta tails share one fresh
-- remainder (rule 3). Any other case, a closed or rigid tail asked to
-- grow (rule 6) or one tail on both sides (rule 5), is the records'
-- mismatch, as is a binding the tail's lacks set refuses (rule 4).
unifyRecord
  ∷ (Subst → Ty Flex → Ty Flex → Either Failure Subst)
  → Subst
  → RecordRow (Ty Flex) Flex
  → RecordRow (Ty Flex) Flex
  → Either Failure Subst
unifyRecord unifyField subst left right =
  if several then Left (Placeholder severalTails)
  else if duplicated one || duplicated other then failed subst
  else foldM fieldPair subst (common one other) >>= decided
  where
  flatLeft = flatten subst left
  flatRight = flatten subst right
  one = viewed flatLeft
  other = viewed flatRight
  -- No producer makes a row of several tails before Tranche B Task 2's
  -- parser; the rule for them is Task 4's, and until then they reach this
  -- greppable placeholder rather than a mismatch that would pass for an
  -- answer.
  several = Array.length flatLeft.tails > 1 || Array.length flatRight.tails > 1
  fieldPair reached (Tuple mine theirs) = unifyField reached mine theirs
  failed reached = mismatch reached (TRecord left) (TRecord right)
  decided reached =
    if rebound reached one || rebound reached other then
      unifyRecord unifyField reached left right
    else tails failed one other reached

severalTails ∷ String
severalTails = "rows with several tails are checked in Task 4"

-- A flattened row with at most one tail, which is all this rule reads.
type Single = { fields ∷ Fields, tail ∷ Maybe Flex }

viewed ∷ Flat → Single
viewed row = { fields: row.fields, tail: Array.head row.tails }

-- Whether unifying the shared fields bound the row's own tail meta, as in
-- `{ a: { ...r }, ...r }`. The rows are then flattened again and unified
-- anew, so that binding is followed rather than overwritten. Each round
-- binds one more of their tails, so the rounds end.
rebound ∷ Subst → Single → Boolean
rebound subst row = maybe false bound (metaTail row.tail)
  where
  bound meta = walk subst (TVar (Meta meta)) /= TVar (Meta meta)

-- The tails, once the labels both rows hold have unified.
tails
  ∷ (Subst → Either Failure Subst)
  → Single
  → Single
  → Subst
  → Either Failure Subst
tails failed one other subst =
  case Array.null onlyMine, Array.null onlyTheirs of
    true, true → sameTails failed subst one.tail other.tail
    true, false → grown failed subst one.tail onlyTheirs other.tail
    false, true → grown failed subst other.tail onlyMine one.tail
    false, false → shared failed subst one other onlyMine onlyTheirs
  where
  onlyMine = only one other
  onlyTheirs = only other one

-- Sorted, so a label held twice is held by neighbours. Lacks sets keep
-- this from arising; were it to, the row is no record.
duplicated ∷ Single → Boolean
duplicated row = Array.any same (Array.zip labels (Array.drop 1 labels))
  where
  labels = map fst row.fields
  same (Tuple one other) = one == other

-- The field types of each label both rows hold, mine first.
common ∷ Single → Single → Array (Tuple (Ty Flex) (Ty Flex))
common mine theirs = Array.mapMaybe paired mine.fields
  where
  table = Map.fromFoldable theirs.fields
  paired (Tuple label ty) = Tuple ty <$> Map.lookup label table

-- The fields of `mine` whose labels `theirs` does not hold.
only ∷ Single → Single → Fields
only mine theirs = Array.filter absent mine.fields
  where
  table = Map.fromFoldable theirs.fields
  absent (Tuple label _) = not (Map.member label table)

-- No labels left on either side: the same tail, or the newer meta of the
-- two (the larger) bound to the other tail, or a meta to the other tail.
sameTails
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Maybe Flex
  → Maybe Flex
  → Either Failure Subst
sameTails failed subst one other =
  if one == other then Right subst
  else maybe' refused bound (Array.last (Array.sortWith metaKey choices))
  where
  choices = Array.catMaybes
    [ toward other <$> metaTail one, toward one <$> metaTail other ]
  toward rest meta = { meta, rest }
  metaKey choice = choice.meta
  refused _ = failed subst
  bound choice = bindTail failed subst choice.meta [] choice.rest

-- Only a meta tail grows.
grown
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Maybe Flex
  → Fields
  → Maybe Flex
  → Either Failure Subst
grown failed subst tail fields rest = maybe' refused extended (metaTail tail)
  where
  refused _ = failed subst
  extended meta = bindTail failed subst meta fields rest

-- Labels left on both sides: two distinct meta tails, or a mismatch.
shared
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Single
  → Single
  → Fields
  → Fields
  → Either Failure Subst
shared failed subst one other onlyMine onlyTheirs = maybe' refused distinct
  (Tuple <$> metaTail one.tail <*> metaTail other.tail)
  where
  refused _ = failed subst
  distinct (Tuple mine theirs) =
    if mine == theirs then failed subst
    else shareTails failed subst { meta: mine, fields: onlyTheirs }
      { meta: theirs, fields: onlyMine }

metaTail ∷ Maybe Flex → Maybe Int
metaTail tail = metaOf =<< tail

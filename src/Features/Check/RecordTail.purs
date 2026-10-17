module Features.Check.RecordTail
  ( Fields
  , Share
  , bindTail
  , shareTails
  , labelSet
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple, fst)
import Domain.Type (Ty(..))
import Domain.Type.Parts (children, rowArguments, rowsOf)
import Domain.Type.Record (recordRow)
import Features.Check.Binding (exceedsLimit)
import Features.Check.Lacks (addLacks, addWritten, lacksOf, writtenOf)
import Features.Check.Subst (Flex(..), Subst(..), resolve)
import Features.Check.UnifyFailure (Failure(..))

type Fields = Array (Tuple String (Ty Flex))

-- One of two meta tails, and the fields the other side adds to it.
type Share = { meta ∷ Int, fields ∷ Fields }

-- Binds an unbound meta tail to `fields` and the tail `rest` (rule 4).
-- None of the fields may be a label the meta lacks. What it lacks passes
-- on to `rest`: a meta rest lacks it too, with the fields' own labels; a
-- rigid rest must already lack it, since nothing can be added to a
-- signature's variable; a closed rest holds nothing more. `failed` is the
-- caller's mismatch, unless a `where` clause wrote the lack (R005):
-- that is `Forbidden`, and a meta rest inherits where it was written.
bindTail
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Int
  → Fields
  → Maybe Flex
  → Either Failure Subst
bindTail failed subst meta fields rest =
  maybe' fitting (refused failed subst meta)
    (Array.find forbidden (map fst fields))
  where
  lacking = lacksOf subst (Meta meta)
  forbidden label = Set.member label lacking
  fitting _ = maybe' placed onto rest
  tails = Array.fromFoldable rest
  placed _ = place failed subst meta (TRecord (recordRow fields tails))
  onto tail = case tail of
    Meta _ → place failed
      ( addWritten tail (writtenOf subst (Meta meta))
          (addLacks tail (Set.union lacking (labelSet fields)) subst)
      )
      meta
      (TRecord (recordRow fields tails))
    Rigid _ → maybe' placed (refused failed subst meta)
      (Array.find (unlackedBy tail) (Set.toUnfoldable lacking))
  unlackedBy tail label = not (Set.member label (lacksOf subst tail))

-- A label the meta may not take: `Forbidden` when a clause wrote the
-- lack, else the caller's mismatch.
refused
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Int
  → String
  → Either Failure Subst
refused failed subst meta label = maybe' mismatched (Left <<< Forbidden label)
  (Map.lookup label (writtenOf subst (Meta meta)))
  where
  mismatched _ = failed subst

-- Rule 3: two distinct unbound meta tails, each given the other side's
-- fields and one fresh remainder, which therefore lacks both sides'
-- labels and what either tail lacked.
shareTails
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Share
  → Share
  → Either Failure Subst
shareTails failed (Subst bindings) mine theirs =
  bindTail failed fresh mine.meta mine.fields remainder >>= bindTheirs
  where
  fresh = Subst bindings { fresh = bindings.fresh - 1 }
  remainder = Just (Meta bindings.fresh)
  bindTheirs reached = bindTail failed reached theirs.meta theirs.fields
    remainder

labelSet ∷ Fields → Set String
labelSet fields = Set.fromFoldable (map fst fields)

-- The occurs check (rule 5) on the resolved binding, which sees through
-- bindings already made; a cycle is the records' mismatch. The depth
-- bound is decided first, by a loop (Features.Check.Binding).
place
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Int
  → Ty Flex
  → Either Failure Subst
place failed subst@(Subst bindings) meta ty
  | exceedsLimit subst ty = Left TooDeep
  | holdsTail meta (resolve subst ty) = failed subst
  | otherwise = Right
      (Subst bindings { types = Map.insert meta ty bindings.types })

-- Whether a resolved type has meta `meta` as a record's tail, or at all.
holdsTail ∷ Int → Ty Flex → Boolean
holdsTail meta = case _ of
  TVar (Meta other) → other == meta
  TRecord { tails } | Array.elem (Meta meta) tails → true
  ty → Array.any held (children ty)
    || Array.any (Array.any held <<< rowArguments) (rowsOf ty)
  where
  held part = holdsTail meta part

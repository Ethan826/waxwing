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
import Data.Foldable (foldM)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty(..))
import Domain.Type.Parts (children, rowArguments, rowsOf)
import Domain.Type.Record (recordRow)
import Features.Check.Binding (exceedsLimit)
import Features.Check.Disjoint (requireApart)
import Features.Check.Lacks (addLackTable, lacksIn, lacksOf)
import Features.Check.RowStore
  ( Because(..)
  , Lack
  , partnersOf
  , plain
  , stamped
  , withoutPairs
  )
import Features.Check.Subst (Flex(..), Subst(..), onStore, resolve, storeOf)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

type Fields = Array (Tuple String (Ty Flex))

-- One of two meta tails, and the fields the other side adds to it.
type Share = { meta ∷ Int, fields ∷ Fields }

-- Binds an unbound meta tail to `fields` and the tail `rest` (rule 4; the
-- bind rule of R005 Tranche B design §3.2, rules §7). None of the fields
-- may be a label the meta lacks. What it lacks passes on to `rest` with
-- its reason: a meta rest lacks it too, with the fields' own labels; a
-- rigid rest must already lack it, since nothing can be added to a
-- signature's variable; a closed rest holds nothing more. Then the meta is
-- bound, stamped with the requirement's span, and each pair it was in is
-- required of its image (Features.Check.Disjoint). A refusal is reported
-- by the lack's reason (`refusedBy`).
bindTail
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Int
  → Fields
  → Maybe Flex
  → Either Failure Subst
bindTail failed subst meta fields rest =
  maybe' fitting (refusedBy failed subst Nothing)
    (Array.findMap forbidden (map fst fields))
  where
  lacking = lacksIn subst (Meta meta)
  forbidden label = Tuple label <$> Map.lookup label lacking
  fitting _ = passed failed subst lacking fields rest
    >>= place failed meta (TRecord (recordRow fields (Array.fromFoldable rest)))
    >>= rebound

  partners ∷ Array (Tuple Flex Because)
  partners = Map.toUnfoldable (partnersOf (storeOf subst) (Meta meta))
  rebound placed = foldM (requireApart (emptied failed) meta fields rest)
    (onStore (withoutPairs (Meta meta) <<< stamped meta) placed)
    partners

-- What the meta lacks, passed on to its rest.
passed
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Map String Lack
  → Fields
  → Maybe Flex
  → Either Failure Subst
passed failed subst lacking fields =
  maybe (Right subst) passedTo
  where
  passedTo tail = case tail of
    Meta _ → Right (addLackTable tail own subst)
    Rigid _ → maybe' (const (Right subst))
      (refusedBy failed subst (Just tail))
      (Array.find (unlackedBy tail) (Map.toUnfoldable lacking))
  own = Map.union lacking (Map.fromFoldable (map plainLack fields))
  plainLack (Tuple label _) = Tuple label plain
  unlackedBy tail (Tuple label _) = not (Set.member label (lacksOf subst tail))

-- A label the meta may not take, by why it lacks it: D1 for a written
-- `lacks`; for a pair's reason D2 when the label was being bound, D3''
-- when a rigid rest may hold it; otherwise the caller's mismatch, the
-- shape text Tranche A gives an implied lack.
refusedBy
  ∷ (Subst → Either Failure Subst)
  → Subst
  → Maybe Flex
  → Tuple String Lack
  → Either Failure Subst
refusedBy failed subst rigid (Tuple label lack) = case lack.because of
  Lacks written → Left (Refused (Forbidden label written))
  Disjoint pair → paired pair
  Joined pair → paired pair
  _ → failed subst
  where
  paired pair = Left (Refused (maybe (Overlap label pair lack.from) held rigid))
  held tail = MayHold tail label lack.because

-- The empty row, which a meta apart from itself is (design §3.1).
emptied ∷ (Subst → Either Failure Subst) → Subst → Int → Either Failure Subst
emptied failed subst meta = bindTail failed subst meta [] Nothing

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
  → Int
  → Ty Flex
  → Subst
  → Either Failure Subst
place failed meta ty subst@(Subst bindings)
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

module Features.Check.RecordTail
  ( Fields
  , Share
  , bindTail
  , shareTails
  , solvingWith
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe')
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty(..))
import Domain.Type.Parts (children, rowArguments, rowsOf)
import Domain.Type.Record (RecordRow, recordRow)
import Features.Check.FlatRecord (flatten)
import Features.Check.Binding (exceedsLimit)
import Features.Check.Disjoint (ownPairs, requireDisjoint, requireLack)
import Features.Check.Lacks (addLackTable, lacksIn)
import Features.Check.Refused (Failed, Solving, refusedBy)
import Features.Check.RowStore
  ( Because
  , Lack
  , counted
  , partnersOf
  , plain
  , stamped
  , withoutPairs
  )
import Features.Check.Subst (Flex(..), Subst(..), onStore, resolve, storeOf)
import Features.Check.UnifyFailure (Failure(..))

type Row = RecordRow (Ty Flex) Flex

type Fields = Array (Tuple String (Ty Flex))

-- One of two meta tails, and the fields and rigid tails the other side
-- gives it, beside the shared remainder.
type Share = { meta ∷ Int, fields ∷ Fields, rigids ∷ Array Flex }

-- The bind rule (R005 Tranche B design §3.2, rules §7): binds an unbound
-- meta to `fields` and the tails `rests`. None of the fields may be a
-- label the meta lacks (step 1). What it lacks passes to each rest with
-- its reason: a meta rest lacks it too, with the fields' own labels; a
-- rigid rest must already lack both, since nothing can be added to a
-- signature's variable (steps 3 and 5). Then the occurs check (step 7);
-- the meta is bound, stamped with the requirement's span, and each pair
-- it was in is required of its image, decomposed in full
-- (Features.Check.Disjoint, step 4); and the image's own tails are
-- required apart (step 5). A refusal is reported by the fact's reason
-- (Features.Check.Refused). (Task 4's steps 2 and 6, the upper bound U3,
-- went with the bounds in B2.)
bindTail ∷ Failed → Subst → Int → Fields → Array Flex → Either Failure Subst
bindTail failed subst meta fields rests =
  maybe' fitting (refusedBy failed subst Nothing)
    (Array.findMap forbidden (map fst fields))
  where
  solving = solvingWith failed
  lacking = lacksIn subst (Meta meta)
  forbidden label = Tuple label <$> Map.lookup label lacking

  partners ∷ Array (Tuple Flex Because)
  partners = Map.toUnfoldable (partnersOf (storeOf subst) (Meta meta))
  fitting _ = passed solving lacking fields rests subst
    >>= place failed meta (recordRow fields rests)
    >>= repaired solving { meta, partners, fields, rests }

-- Steps 4 and 5 (pairs), once the meta is bound: each pair it was in
-- required of its image, the image's own tails apart.
repaired
  ∷ Solving
  → { meta ∷ Int
    , partners ∷ Array (Tuple Flex Because)
    , fields ∷ Fields
    , rests ∷ Array Flex
    }
  → Subst
  → Either Failure Subst
repaired solving binding placed =
  foldM pairedWith (onStore settled placed) binding.partners
    >>= ownPairs solving plain binding.rests
  where
  meta = binding.meta
  settled = withoutPairs (Meta meta) <<< stamped meta <<< counted
  pairedWith reached (Tuple partner because) = requireDisjoint solving
    { because, from: Just meta }
    reached
    (recordRow binding.fields binding.rests)
    { fields: [], tails: [ partner ] }

-- The rules' view of the caller: its mismatch.
solvingWith ∷ Failed → Solving
solvingWith failed = { failed }

-- What the meta lacks, passed on to each rest (steps 3 and 5).
passed
  ∷ Solving
  → Map String Lack
  → Fields
  → Array Flex
  → Subst
  → Either Failure Subst
passed solving lacking fields rests subst = foldM handed subst rests
  where
  own = Map.union lacking (Map.fromFoldable (map plainLack fields))
  plainLack (Tuple label _) = Tuple label plain
  handed reached tail = case tail of
    Meta _ | unbound reached tail → Right (addLackTable tail own reached)
    _ → foldM (lackedBy tail) reached
      (Map.toUnfoldable lacking <> map plainLack fields)
  lackedBy tail reached (Tuple label lack) = requireLack solving lack reached
    tail
    label

-- Rule 3: two distinct unbound meta tails, each given the other side's
-- constants and one fresh remainder, which therefore lacks both sides'
-- labels and what either tail lacked.
shareTails ∷ Failed → Subst → Share → Share → Either Failure Subst
shareTails failed (Subst bindings) mine theirs =
  bindTail failed fresh mine.meta mine.fields (mine.rigids <> remainder)
    >>= bindTheirs
  where
  fresh = Subst bindings { fresh = bindings.fresh - 1 }
  remainder = [ Meta bindings.fresh ]
  bindTheirs reached = bindTail failed reached theirs.meta theirs.fields
    (theirs.rigids <> remainder)

-- The occurs check (rule 5) on the resolved binding, which sees through
-- bindings already made; a cycle is the records' mismatch. The depth
-- bound is decided first, by a loop (Features.Check.Binding). The meta
-- among its own image's tails is impossible once common tails cancel and
-- remainders are fresh (rules §7, ledger L33): were it to happen, it is
-- a checker defect, reported as one.
place ∷ Failed → Int → Row → Subst → Either Failure Subst
place failed meta image subst@(Subst bindings) =
  if exceedsLimit subst ty then Left TooDeep
  else if Array.elem (Meta meta) (flatten subst image).tails then Left
    (Unexpected "A record tail occurs in its own binding")
  else if holdsTail meta (resolve subst ty) then failed subst
  else Right (Subst bindings { types = Map.insert meta ty bindings.types })
  where
  ty = TRecord image

-- Whether a resolved type has meta `meta` as a record's tail, or at all.
holdsTail ∷ Int → Ty Flex → Boolean
holdsTail meta = case _ of
  TVar (Meta other) → other == meta
  TRecord { tails } | Array.elem (Meta meta) tails → true
  ty → Array.any held (children ty)
    || Array.any (Array.any held <<< rowArguments) (rowsOf ty)
  where
  held part = holdsTail meta part

unbound ∷ Subst → Flex → Boolean
unbound (Subst bindings) = case _ of
  Meta meta → not (Map.member meta bindings.types)
  Rigid _ → false

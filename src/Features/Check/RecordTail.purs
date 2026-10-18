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
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty(..))
import Domain.Type.Parts (children, rowArguments, rowsOf)
import Domain.Type.Record (RecordRow, recordRow)
import Features.Check.FlatRecord (flatten)
import Features.Check.Binding (exceedsLimit)
import Features.Check.Disjoint (ownPairs, requireDisjoint, requireLack)
import Features.Check.Lacks (addLackTable, lacksIn)
import Features.Check.Narrow (narrow, prune)
import Features.Check.Refused (Failed, Solving, refusedBy)
import Features.Check.RowStore
  ( Atom(..)
  , Because
  , Bound
  , Lack
  , boundOf
  , counted
  , partnersOf
  , plain
  , stamped
  , withoutBound
  , withoutPairs
  )
import Features.Check.Subst (Flex(..), Subst(..), onStore, resolve, storeOf)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

type Fields = Array (Tuple String (Ty Flex))

type Row = RecordRow (Ty Flex) Flex

-- One of two meta tails, and the fields and rigid tails the other side
-- gives it, beside the shared remainder.
type Share = { meta ∷ Int, fields ∷ Fields, rigids ∷ Array Flex }

-- The bind rule (R005 Tranche B design §3.2, rules §7): binds an unbound
-- meta to `fields` and the tails `rests`. None of the fields may be a
-- label the meta lacks (step 1), and the image's constants must lie
-- within its upper bound (step 2, U3). What it lacks passes to each rest
-- with its reason: a meta rest lacks it too, with the fields' own labels;
-- a rigid rest must already lack both, since nothing can be added to a
-- signature's variable (steps 3 and 5). Then the occurs check (step 7);
-- the meta is bound, stamped with the requirement's span, and each pair
-- it was in is required of its image, decomposed in full
-- (Features.Check.Disjoint, step 4); the image's own tails are required
-- apart (step 5); and each meta rest is narrowed to the bound less the
-- image's constants (step 6, U3). A refusal is reported by the fact's
-- reason (Features.Check.Refused).
bindTail ∷ Failed → Subst → Int → Fields → Array Flex → Either Failure Subst
bindTail failed subst meta fields rests =
  maybe' fitting (refusedBy failed subst Nothing)
    (Array.findMap forbidden (map fst fields))
  where
  solving = solvingWith failed
  lacking = lacksIn subst (Meta meta)
  bound = boundOf (storeOf subst) meta
  forbidden label = Tuple label <$> Map.lookup label lacking

  partners ∷ Array (Tuple Flex Because)
  partners = Map.toUnfoldable (partnersOf (storeOf subst) (Meta meta))
  fitting _ = within failed subst bound fields rests
    >>= passed solving lacking fields rests
    >>= place failed meta (recordRow fields rests)
    >>= repaired solving { meta, bound, partners, fields, rests }

-- Steps 4, 5 (pairs), 6 and 8, once the meta is bound: each pair it was
-- in required of its image, the image's own tails apart, each meta rest
-- narrowed.
repaired
  ∷ Solving
  → { meta ∷ Int
    , bound ∷ Maybe Bound
    , partners ∷ Array (Tuple Flex Because)
    , fields ∷ Fields
    , rests ∷ Array Flex
    }
  → Subst
  → Either Failure Subst
repaired solving binding placed =
  foldM pairedWith (onStore settled placed) binding.partners
    >>= ownPairs solving plain binding.rests
    >>= narrowedRests solving binding.bound binding.fields binding.rests
  where
  meta = binding.meta
  settled = withoutPairs (Meta meta) <<< stamped meta <<< withoutBound meta
    <<< counted
  pairedWith reached (Tuple partner because) = requireDisjoint solving
    { because, from: Just meta }
    reached
    (recordRow binding.fields binding.rests)
    { fields: [], tails: [ partner ] }

-- The rules' view of the caller: its mismatch, and the empty binding.
solvingWith ∷ Failed → Solving
solvingWith failed = { failed, emptied: emptiedBy failed }

-- The empty row, which a meta apart from itself, or whose bound is
-- empty, is (design §3.1, U4).
emptiedBy ∷ Failed → Subst → Int → Either Failure Subst
emptiedBy failed subst meta = bindTail failed subst meta [] []

-- U3's check: every constant of the image within the meta's bound. An
-- atom a fact pruned from the bound is reported by that fact, as the
-- bind rule would have without the bound (R10.2): the label's lack, or
-- the rigid in both rows of its pair (D3'); one the bound's equations
-- excluded is `Outside` (D6, Task 6).
within
  ∷ Failed → Subst → Maybe Bound → Fields → Array Flex → Either Failure Subst
within failed subst bound fields rests = maybe (Right subst) checked bound
  where
  constants = imageConstants fields rests
  checked found = maybe (Right subst) (excluded found)
    (Array.find (outside found) constants)
  outside found atom = not (Set.member atom found.atoms)
  excluded found atom = maybe (Left (Refused (Outside atom found.narrowings)))
    (prunedBy failed subst atom)
    (Map.lookup atom found.pruned)

prunedBy ∷ Failed → Subst → Atom → Lack → Either Failure Subst
prunedBy failed subst atom lack = case atom of
  LabelAtom label → refusedBy failed subst Nothing (Tuple label lack)
  RigidAtom tail → Left (Refused (Twice tail lack.because))

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
    Meta meta | unbound reached tail → prune solving
      (addLackTable tail own reached)
      meta
    _ → foldM (lackedBy tail) reached
      (Map.toUnfoldable lacking <> map plainLack fields)
  lackedBy tail reached (Tuple label lack) = requireLack solving lack reached
    tail
    label

-- Step 6: each meta rest narrowed to the bound less the image's
-- constants.
narrowedRests
  ∷ Solving → Maybe Bound → Fields → Array Flex → Subst → Either Failure Subst
narrowedRests solving bound fields rests subst = maybe (Right subst) narrowed
  bound
  where
  constants = Set.fromFoldable (imageConstants fields rests)
  narrowed found = foldM (narrow solving (rest found.atoms) (whys found))
    subst
    (Array.mapMaybe metaOf rests)
  rest atoms = Set.difference atoms constants
  whys found = map without found.narrowings
  without narrowing = narrowing { allowed = rest narrowing.allowed }

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

-- The image's constants: its labels and its rigid tails.
imageConstants ∷ Fields → Array Flex → Array Atom
imageConstants fields rests = map (LabelAtom <<< fst) fields
  <> map RigidAtom (Array.filter rigid rests)

unbound ∷ Subst → Flex → Boolean
unbound (Subst bindings) = case _ of
  Meta meta → not (Map.member meta bindings.types)
  Rigid _ → false

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

metaOf ∷ Flex → Maybe Int
metaOf = case _ of
  Meta meta → Just meta
  Rigid _ → Nothing

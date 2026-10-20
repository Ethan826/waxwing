module Features.Check.Fault (faultIn) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Set (Set)
import Data.Set as Set
import Data.Maybe (Maybe(..), maybe')
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Type (Ty(..))
import Features.Check.Atom (Atom(..))
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Homes (admits)
import Features.Check.MergeParts (View)
import Features.Check.RowMerge.Reach (metasThrough)
import Features.Check.RowStore (mergesOf)
import Features.Check.Clash (clashes)
import Features.Check.Subst (Flex(..), Subst, storeOf, walk)
import Features.Check.UnifyFailure (Failure(..))

type Fault = { part ∷ Int, atom ∷ Atom }

-- The part a failure puts at fault (D6's `so A cannot have field l`,
-- R005 Tranche B diagnostics R10), in the parts' order: a field a part
-- holds that the other side cannot take, or, for a clash of field types,
-- holds at a type established as different (Features.Check.Clash: an
-- unresolved type is no evidence); a rigid tail a part holds that the
-- other side cannot take; else (R10.1, a binding predicate `predicate`'s
-- case made that failed later) a part that case bound and a field of the
-- failing types it cannot take. Nothing when no part explains the
-- failure: its own text then stands.
faultIn ∷ Subst → Int → View → Failure → Maybe Fault
faultIn subst predicate view failure =
  maybe' (caseBound subst predicate view failure) Just
    (Array.findMap faulty view.parts)
  where
  faulty part = maybe' (rigidFault part) Just (fieldFault part)
  fieldFault part = Array.findMap (fieldAt part) (rowOf subst part).fields
  rigidFault part _ = Array.findMap (tailAt part)
    (Array.filter rigid (rowOf subst part).tails)
  fieldAt part (Tuple label ty) = maybe' (absent part label)
    (clashing part label ty)
    (Array.find (eq label <<< fst) view.other.fields)
  absent part label _
    | refuses subst view.other.tails (LabelAtom label) =
        Just { part, atom: LabelAtom label }
    | otherwise = Nothing
  clashing part label ty other
    | typed failure && clashes subst ty (snd other) =
        Just { part, atom: LabelAtom label }
    | otherwise = Nothing
  tailAt part tail
    | Array.elem tail view.other.tails = Nothing
    | refuses subst view.other.tails (RigidAtom tail) =
        Just { part, atom: RigidAtom tail }
    | otherwise = Nothing

-- R10.1: a part predicate `predicate`'s case bound that the failure puts
-- at fault: a label one failing record holds and the other cannot take
-- (decision 22: evidence, not inequality), blamed on a part that cannot
-- take it either and that the lacking record is: built through it, or,
-- as the failure may hold it flattened, with the part's own row. A part
-- that is not the lacking record explains nothing (Task 7: a removal's
-- rest lacks the label it removed, whatever the parts hold).
caseBound ∷ Subst → Int → View → Failure → Unit → Maybe Fault
caseBound subst predicate view failure _ = Array.findMap faulted
  (missingLabels subst failure)
  where
  bound = Array.filter boundHere view.parts
  boundHere part = Array.any (byThis <<< flip Map.lookup boundBy)
    (Array.fromFoldable (metasThrough subst [ Meta part ]))
  byThis = eq (Just predicate)
  boundBy = (mergesOf (storeOf subst)).boundBy
  faulted missing = map (atPart missing.label)
    (Array.find (refusedBy missing) bound)
  atPart label part = { part, atom: LabelAtom label }
  refusedBy missing part = lackingIs missing part
    && not (holdsLabel missing.label (rowOf subst part))
    && refuses subst (rowOf subst part).tails (LabelAtom missing.label)
  holdsLabel label row = Array.any (eq label <<< fst) row.fields
  lackingIs missing part = Set.member part missing.through
    || missing.row == rowOf subst part

-- The labels one record of a failed unification holds and the other
-- cannot take, in label order, each with the metas the lacking record was
-- built through and its row.
missingLabels
  ∷ Subst
  → Failure
  → Array { label ∷ String, through ∷ Set Int, row ∷ Flat }
missingLabels subst = case _ of
  Mismatch one other → Array.sortWith labelOf
    (lacking (rowIn one) (rowIn other) <> lacking (rowIn other) (rowIn one))
  FromMerge _ inner → missingLabels subst inner
  _ → []
  where
  labelOf found = found.label
  rowIn ty = case walk subst ty of
    TRecord row → Just row
    _ → Nothing
  lacking (Just holder) (Just lacker) = Array.mapMaybe
    (missing (flatten subst lacker) (metasThrough subst lacker.tails))
    (map fst (flatten subst holder).fields)
  lacking _ _ = []
  missing flat through label
    | Array.any (eq label <<< fst) flat.fields = Nothing
    | refuses subst flat.tails (LabelAtom label) =
        Just { label, through, row: flat }
    | otherwise = Nothing

-- No tail of a row can take the atom: a rigid tail never does (rules:
-- rigid tails are cancelled by identity, never given labels), a meta
-- when the exclusion test refuses it.
refuses ∷ Subst → Array Flex → Atom → Boolean
refuses subst tails atom = Array.all (not <<< admitting) tails
  where
  admitting = case _ of
    Meta meta → admits subst meta atom
    Rigid _ → false

rowOf ∷ Subst → Int → Flat
rowOf subst part = flatten subst { fields: [], tails: [ Meta part ] }

-- A clash of field types rather than of labels.
typed ∷ Failure → Boolean
typed = case _ of
  Mismatch _ _ → true
  RowPayload _ _ _ → true
  FromMerge _ inner → typed inner
  _ → false

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

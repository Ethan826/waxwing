module Features.Check.Fault (faultIn) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe')
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Type (Ty(..))
import Features.Check.Atom (Atom(..))
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Homes (admits)
import Features.Check.MergeParts (View)
import Features.Check.RowMerge.Reach (metasThrough)
import Features.Check.RowStore (mergesOf)
import Features.Check.Subst (Flex(..), Subst, resolve, storeOf, walk)
import Features.Check.UnifyFailure (Failure(..))

type Fault = { part ∷ Int, atom ∷ Atom }

-- The part a failure puts at fault (D6's `so A cannot have field l`,
-- R005 Tranche B diagnostics R10), in the parts' order: a field a part
-- holds that the other side cannot take, or, for a clash of field types,
-- holds at another type; a rigid tail a part holds that the other side
-- cannot take; else (R10.1, a binding predicate `predicate`'s case made
-- that failed later) a part that case bound and a field of the failing
-- types it cannot take. Nothing when no part explains the failure: its
-- own text then stands.
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
    | typed failure && resolve subst ty /= resolve subst (snd other) =
        Just { part, atom: LabelAtom label }
    | otherwise = Nothing
  tailAt part tail
    | Array.elem tail view.other.tails = Nothing
    | refuses subst view.other.tails (RigidAtom tail) =
        Just { part, atom: RigidAtom tail }
    | otherwise = Nothing

-- R10.1: the parts predicate `predicate`'s case bound, and the first
-- field of the failing types one of them cannot take.
caseBound ∷ Subst → Int → View → Failure → Unit → Maybe Fault
caseBound subst predicate view failure _ = Array.findMap faulted bound
  where
  bound = Array.filter boundHere view.parts
  boundHere part = Array.any (byThis <<< flip Map.lookup boundBy)
    (Array.fromFoldable (metasThrough subst [ Meta part ]))
  byThis = eq (Just predicate)
  boundBy = (mergesOf (storeOf subst)).boundBy
  faulted part = map (atPart part)
    (Array.find (refusedBy part) (failingLabels subst failure))
  atPart part label = { part, atom: LabelAtom label }
  refusedBy part label = not (holdsLabel label (rowOf subst part))
    && refuses subst (rowOf subst part).tails (LabelAtom label)
  holdsLabel label row = Array.any (eq label <<< fst) row.fields

-- The fields of the records a unification failed on, in label order.
failingLabels ∷ Subst → Failure → Array String
failingLabels subst = case _ of
  Mismatch one other → Array.sort (Array.nub (labelsOf one <> labelsOf other))
  FromMerge _ inner → failingLabels subst inner
  _ → []
  where
  labelsOf ty = case walk subst ty of
    TRecord row → map fst (flatten subst row).fields
    _ → []

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

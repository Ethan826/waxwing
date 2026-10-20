module Features.Check.MergeParts
  ( View
  , viewOf
  , viewById
  , constantsOf
  , candidatesOf
  , partNames
  , lambdaPart
  , pathOf
  , atomName
  , holds
  ) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Syntax (Span)
import Features.Check.Atom (Atom(..))
import Features.Check.FlatRecord (Flat, flatten)
import Features.Check.Homes (admits)
import Features.Check.OriginStore (originsOf)
import Features.Check.PartOrigin
  ( Occurrence
  , Owner
  , Step(..)
  , occurrenceKey
  , occurrenceOf
  , parametersOf
  )
import Features.Check.RowMerge.Merge (Merge)
import Features.Check.RowMerge.Reach (metasThrough)
import Features.Check.RowName (tailName)
import Features.Check.Subst (Flex(..), Subst)

-- What the renderers read of one waiting or refused predicate (R005
-- Tranche B diagnostics R1-R6): the written row it came from, through
-- its occurrence (Features.Check.PartOrigin): the row's unknown tails
-- (`parts`), the other side (`reach`, the tails it was replaced by;
-- `other`, them flattened: what the parts share; `whole`, with the
-- fields and rigid tails written beside them), the owner and the steps
-- to the row. A
-- predicate no occurrence records stands for itself. `key` identifies
-- the occurrence; `site` is the predicate's location (T6).
type View =
  { key ∷ Int
  , site ∷ Maybe Span
  , parts ∷ Array Int
  , reach ∷ Array Flex
  , other ∷ Flat
  , whole ∷ Flat
  , owner ∷ Maybe Owner
  , steps ∷ Array Step
  }

viewOf ∷ Subst → Merge → View
viewOf subst merge = maybe' alone found
  (occurrenceOf merge.id (originsOf subst))
  where
  found occurrence = viewFrom subst merge.id occurrence
  alone _ =
    { key: merge.id
    , site: merge.site
    , parts: Array.mapMaybe metaOf (merge.left.tails <> merge.right.tails)
    , reach: merge.result.tails
    , other: flatten subst merge.result
    , whole: flatten subst merge.result
    , owner: Nothing
    , steps: []
    }

-- The view of a predicate by its identity alone, as its occurrence
-- records it (a predicate that was solved before its binding failed waits
-- no more).
viewById ∷ Subst → Int → Maybe View
viewById subst id = viewFrom subst id <$> occurrenceOf id (originsOf subst)

viewFrom ∷ Subst → Int → Occurrence → View
viewFrom subst id occurrence =
  { key: maybe id identity (occurrenceKey id (originsOf subst))
  , site: occurrence.site
  , parts: occurrence.parts
  , reach: [ occurrence.result ]
  , other: flatten subst { fields: [], tails: [ occurrence.result ] }
  , whole: flatten subst occurrence.row
  , owner: occurrence.owner
  , steps: occurrence.steps
  }

-- The other side's constants (R4): its labels in label order, then its
-- rigid tails.
constantsOf ∷ View → Array Atom
constantsOf view = map labelAtom view.other.fields
  <> map RigidAtom (Array.filter rigid view.other.tails)
  where
  labelAtom (Tuple label _) = LabelAtom label

-- R3: the parts that may still hold the atom, in the parts' order; none
-- when a part already holds it.
candidatesOf ∷ Subst → View → Atom → Array Int
candidatesOf subst view atom =
  if Array.any (holds atom <<< partRow subst) view.parts then []
  else Array.filter (mayHold subst atom <<< partRow subst) view.parts

-- R1, R2: each part as its owner's variable, else numbered `..._n` in
-- the order given (`..._` when only one is unnamed).
partNames ∷ View → Array Int → Array String
partNames view parts = map name parts
  where
  names = maybe Map.empty ownerNames view.owner
  ownerNames owner = owner.names
  unnamed = Array.filter (not <<< flip Map.member names) parts
  name part = maybe' (numbered part) identity (Map.lookup part names)
  numbered part _
    | Array.length unnamed == 1 = "..._"
    | otherwise = "..._" <> maybe "" (show <<< add 1)
        (Array.elemIndex part unnamed)

-- Whether the part is, or is bound with, an unannotated lambda
-- parameter's row (R9's `annotate this lambda's parameters`).
lambdaPart ∷ Subst → Int → Boolean
lambdaPart subst part = Array.any linked
  (parametersOf (originsOf subst))
  where
  reached = metasThrough subst [ Meta part ]
  linked parameter = not Set.isEmpty
    ( Set.intersection reached
        (Set.delete parameter.meta (metasThrough subst [ Meta parameter.meta ]))
    )

-- R6: the field labels from the type's root to the row.
pathOf ∷ View → Array String
pathOf view = Array.mapMaybe label view.steps
  where
  label = case _ of
    Field name → Just name
    _ → Nothing

atomName ∷ ∀ r. { variables ∷ Array String | r } → Atom → String
atomName env = case _ of
  LabelAtom label → label
  RigidAtom tail → tailName env tail

partRow ∷ Subst → Int → Flat
partRow subst part = flatten subst { fields: [], tails: [ Meta part ] }

holds ∷ Atom → Flat → Boolean
holds atom row = case atom of
  LabelAtom label → Array.any (eq label <<< fst) row.fields
  RigidAtom tail → Array.elem tail row.tails

mayHold ∷ Subst → Atom → Flat → Boolean
mayHold subst atom row = Array.any admitting row.tails
  where
  admitting = case _ of
    Meta meta → admits subst meta atom
    Rigid _ → false

metaOf ∷ Flex → Maybe Int
metaOf = case _ of
  Meta meta → Just meta
  Rigid _ → Nothing

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

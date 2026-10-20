module Features.Check.Contradicted (contradicted) where

import Prelude
import Data.Array as Array
import Data.Either (either)
import Data.Maybe (Maybe(..), maybe, maybe')
import Domain.Note (NoteReason(..))
import Domain.Problem
  ( Fault(..)
  , MergeAtom(..)
  , MustBe
  , Problem(..)
  , TypeName
  )
import Domain.Resolved (EffectInfo)
import Domain.Syntax (Diagnostic, Note, Span)
import Features.Check.Atom (Atom(..))
import Features.Check.Collision (naming)
import Features.Check.Exclusion (exclusions)
import Features.Check.Fault (faultIn)
import Features.Check.MergeOther (wholeName, writtenName)
import Features.Check.FlatRecord (flatten)
import Features.Check.MergeParts
  ( View
  , atomName
  , holds
  , partNames
  , pathOf
  , viewById
  )
import Features.Check.Subst (Flex(..), Subst)
import Features.Check.TypeName (Names)
import Features.Check.UnifyFailure (Cause, Failure(..))

-- D6 (R005 Tranche B diagnostics §2, R5-R8, R10.1; implementation plan
-- §2.10): a contradiction predicate `cause.predicate` established. H's
-- refusal names the parts none of which can hold the atom, located by T4
-- (the latest use whose seeding stated an excluding fact, else the
-- predicate's location) with an `excluded here` note at each fact's
-- reason; any other failure names the part at fault, at the expression
-- being checked (R7; L2's location when re-examining found it). Nothing
-- for a failure no part explains or a predicate no occurrence records:
-- the caller keeps the failure's own text.
contradicted
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo, functionName ∷ String | r)
  → Subst
  → Span
  → Cause
  → Failure
  → Maybe Diagnostic
contradicted env before span cause inner =
  viewById subst cause.predicate >>= rendered
  where
  subst = maybe before identity cause.within
  at = maybe span identity cause.at
  rendered view = case inner of
    Homeless atom → Just $ maybe' (homeless env subst at view atom)
      (atFault env subst (located view) view)
      (heldBy subst view atom)
    _ → atFault env subst at view <$> faultIn subst cause.predicate view inner
  located view = maybe at identity view.site

-- H's refusal of an atom a part holds, which the other side cannot: that
-- part is at fault, at the predicate's location.
heldBy ∷ Subst → View → Atom → Maybe { part ∷ Int, atom ∷ Atom }
heldBy subst view atom = map found (Array.find holding view.parts)
  where
  holding part = holds atom (flatten subst { fields: [], tails: [ Meta part ] })
  found part = { part, atom }

-- H's refusal: no part can hold the atom.
homeless
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo, functionName ∷ String | r)
  → Subst
  → Span
  → View
  → Atom
  → Unit
  → Diagnostic
homeless env subst at view atom _ = reported env subst view primary
  { fault: NoPart, parts: found.parts, atom }
  (requiredNote primary view <> map excluded found.reasons)
  where
  found = exclusions subst view atom
  primary = maybe' located identity
    (Array.last (Array.sortWith start found.uses))
  located _ = maybe at identity view.site
  start span = span.start.offset
  excluded span = { span, reason: ExcludedHere }

-- A case's failure: the part that holds what the other side cannot.
atFault
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo, functionName ∷ String | r)
  → Subst
  → Span
  → View
  → { part ∷ Int, atom ∷ Atom }
  → Diagnostic
atFault env subst at view found = reported env subst view at
  { fault: OnePart, parts: [ found.part ], atom: found.atom }
  (requiredNote at view)

reported
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo, functionName ∷ String | r)
  → Subst
  → View
  → Span
  → { fault ∷ Fault, parts ∷ Array Int, atom ∷ Atom }
  → Array Note
  → Diagnostic
reported env subst view primary found notes =
  either identity report (wholeName env primary subst view)
  where
  report other =
    { problem: MustBeRow (mustBe other)
    , span: primary
    , related: Array.filter (not <<< at primary) notes
    }

  mustBe ∷ TypeName → MustBe
  mustBe other =
    { owner: map ownerName view.owner
    , row: writtenName (partNames view view.parts) view
    , path: pathOf view
    , other
    , otherOwner: names.row
    , fault: found.fault
    , parts: map names.part (partNames view found.parts)
    , atom: case found.atom of
        LabelAtom label → FieldAtom label
        RigidAtom _ → TailAtom (names.rigid (atomName env found.atom))
    }
  -- Decision 23: names qualified when a part and a rigid tail collide.
  names = naming env view [ found.atom ] view.whole.tails
  ownerName owner = owner.name
  at span note = note.span == span

-- R8's first D6 note: `required here` at the predicate's location.
requiredNote ∷ Span → View → Array Note
requiredNote primary view = maybe [] note view.site
  where
  note site
    | site == primary = []
    | otherwise = [ { span: site, reason: RequiredHere } ]

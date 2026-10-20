module Features.Check.Unresolved (undetermined) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmpty
import Data.Either (Either, either)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Tuple (Tuple(..))
import Domain.Note (NoteReason(..))
import Domain.Problem (MergeHint(..), Problem(..), Subject(..), TypeName)
import Domain.Resolved (EffectInfo)
import Domain.Syntax (Diagnostic, Note, Span, TypeRef, typeRefSpan)
import Features.Check.Atom (Atom(..))
import Features.Check.Collision (naming)
import Features.Check.PartNames (partNames, partNotes)
import Features.Check.MergeOther (otherName, wholeName)
import Features.Check.MergeParts
  ( View
  , atomName
  , candidatesOf
  , constantsOf
  , lambdaPart
  , pathOf
  , viewOf
  )
import Features.Check.OriginStore (originsOf)
import Features.Check.PartOrigin (Owner, OwnerKind(..), requiredOf)
import Features.Check.RowMerge.Merge (Merge)
import Features.Check.RowMerge.Reach (metasThrough)
import Features.Check.Subst (Subst)
import Features.Check.TypeName (Names)

-- D4 (R005 Tranche B diagnostics §2, R1-R9, R11; implementation plan
-- §2.10, §10 decisions 20, 21): the body is undetermined. Reported for
-- one occurrence (R11): the earliest located with a constant two parts
-- may hold, else the earliest; occurrences at one location ordered by
-- source data alone (the field path, then where the owner writes the
-- row), never by when they were made. Then R4's constant, R3's parts and
-- R9's hint as decision 20 chose it; notes by R8.
undetermined
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo, functionName ∷ String | r)
  → Span
  → Subst
  → NonEmptyArray Merge
  → Diagnostic
undetermined env fallback subst merges =
  either identity identity (reported env fallback subst chosen)
  where
  ordered = NonEmpty.sortWith sourceKey
    (map (viewOf subst) merges)
  chosen = maybe (NonEmpty.head ordered) identity
    (Array.find (splitting subst) (NonEmpty.toArray ordered))

reported
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo, functionName ∷ String | r)
  → Span
  → Subst
  → View
  → Either Diagnostic Diagnostic
reported env fallback subst view = report
  <$> otherName env site subst view
  <*> wholeName env site subst view
  where
  site = maybe fallback identity view.site
  split = firstSplit subst view
  constants = constantsOf view
  parts = maybe view.parts candidatesOf' split
  candidatesOf' found = found.candidates
  names = partNames subst view parts
  report other whole =
    { problem: CannotTell
        { owner: map ownerName view.owner
        , parts: names
        , subject: subject other
        , path: pathOf view
        , hint: hintOf subst view parts
        }
    , span: site
    , related: notes whole
    }
  subject other = maybe' (unsplit other) splitSubject split
  -- Decision 23: names qualified when a part and a rigid tail collide.
  splitSubject found = case found.atom of
    LabelAtom label → HasField label
    RigidAtom _ → HoldsTail
      ((naming env subst view [ found.atom ] []).rigid (atomName env found.atom))
  unsplit other _
    | Array.null constants = Holds
    | otherwise = Splits (naming env subst view [] view.other.tails).row other
  notes whole = Array.fromFoldable (written names view)
    <> partNotes subst view parts
    <> Array.fromFoldable (required site subst view whole)
  ownerName owner = owner.name

-- R4: the first constant two or more parts may still hold.
firstSplit ∷ Subst → View → Maybe { atom ∷ Atom, candidates ∷ Array Int }
firstSplit subst view = Array.findMap split (constantsOf view)
  where
  split atom = several atom (candidatesOf subst view atom)
  several atom found
    | Array.length found >= 2 = Just { atom, candidates: found }
    | otherwise = Nothing

splitting ∷ Subst → View → Boolean
splitting subst view = maybe false (const true) (firstSplit subst view)

-- R11's order: the location, then the field path, then where the owner
-- writes the row; a view with no location last.
sourceKey ∷ View → Tuple (Array Int) (Tuple (Array String) Int)
sourceKey view = Tuple located (Tuple (pathOf view) writtenAt)
  where
  located = maybe [ top, top ] offsets view.site
  offsets span = [ span.start.offset, span.end.offset ]
  writtenAt = maybe top (startOf <<< typeRefSpan)
    (view.owner >>= writtenRef)
  startOf span = span.start.offset
  -- After every offset a source can have.
  top = 2147483647

-- R9 as decision 20 chose it: a function value or partial application
-- is replaced by a lambda; a part that is a lambda parameter's row asks
-- for its annotation; a constructor's row arguments are written; a
-- direct call's own rows take no annotation.
hintOf ∷ Subst → View → Array Int → Maybe MergeHint
hintOf subst view parts = maybe' ownerless (Just <<< owned) view.owner
  where
  owned owner = case owner.kind of
    Reference → LambdaInPlaceOf owner.name
    PartlyApplied → LambdaInPlaceOfPartial owner.name
    Construction → RowArgumentsOf owner.name
    Call
      | lambdaParts → AnnotateLambda
      | otherwise → OwnCall owner.name
  ownerless _
    | lambdaParts = Just AnnotateLambda
    | otherwise = Nothing
  lambdaParts = Array.any (lambdaPart subst) parts

-- R8's first note: the owner's written row holding the parts.
written ∷ Array String → View → Maybe Note
written names view = view.owner >>= writtenRef >>= note
  where
  note ref = Just { span: typeRefSpan ref, reason: PartsWrittenHere names }

-- R8's third: the written type the other side came from, when it is not
-- the primary expression (Features.Check.Required).
required ∷ Span → Subst → View → TypeName → Maybe Note
required site subst view other = Array.findMap spanOf metas >>= note
  where
  metas = Array.fromFoldable (metasThrough subst view.reach)
  spanOf meta = requiredOf meta (originsOf subst)
  note span
    | span == site = Nothing
    | otherwise = Just { span, reason: RowRequiredHere other }

writtenRef ∷ Owner → Maybe TypeRef
writtenRef owner = owner.written

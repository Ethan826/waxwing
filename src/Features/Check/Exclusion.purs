module Features.Check.Exclusion (Excluded, exclusions) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Domain.Syntax (Span)
import Features.Check.Atom (Atom(..))
import Features.Check.FlatRecord (flatten)
import Features.Check.Lacks (lacksIn)
import Features.Check.MergeParts (View)
import Features.Check.OriginStore (originsOf)
import Features.Check.PartOrigin (seededOf)
import Features.Check.RowMerge.Reach (metasThrough)
import Features.Check.RowStore (Because(..), partnersOf)
import Features.Check.Subst (Flex(..), Subst, storeOf)

-- What ruled an atom out of a refused predicate's parts (H's D6, plan
-- §2.10 and T4): the open parts, which were candidates before the facts
-- (R3); each one's excluding fact's written reason, in the parts' order
-- (R8's `excluded here`); and the uses whose seeding stated those facts
-- (diagnostic metadata, Features.Check.UseOrigin).
type Excluded =
  { parts ∷ Array Int, reasons ∷ Array Span, uses ∷ Array Span }

exclusions ∷ Subst → View → Atom → Excluded
exclusions subst view atom =
  { parts: open
  , reasons: Array.nub (Array.mapMaybe reasonOf open)
  , uses: Array.nub (Array.mapMaybe useOf open)
  }
  where
  open = Array.filter (maybe false (const true) <<< tailOf) view.parts
  tailOf part = Array.findMap meta
    (flatten subst { fields: [], tails: [ Meta part ] }).tails
  reasonOf part = tailOf part >>= reason
  reason tail = case atom of
    LabelAtom label → Map.lookup label (lacksIn subst (Meta tail))
      >>= writtenOf <<< lackReason
    RigidAtom rigid → Map.lookup rigid (partnersOf (storeOf subst) (Meta tail))
      >>= writtenOf
  lackReason lack = lack.because
  useOf part = do
    tail ← tailOf part
    label ← reason tail
    found ← Array.find (seededOn tail label) (seededOf (originsOf subst))
    pure found.use
  seededOn tail label seeded = seeded.label == label
    && Set.member tail (metasThrough subst [ Meta seeded.meta ])

writtenOf ∷ Because → Maybe Span
writtenOf = case _ of
  Lacks written → Just written.span
  Disjoint pair → Just pair.span
  Joined pair → Just pair.span
  Implied → Nothing
  Spread spread → Just spread.later

meta ∷ Flex → Maybe Int
meta = case _ of
  Meta found → Just found
  Rigid _ → Nothing

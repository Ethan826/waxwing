-- trusted surface: every diff needs token review; see docs/engineering.md
-- I3 (A2 spec §5 item 3): the input package's domain and forms, checked
-- before G0 and any obligation; the first failing check, in the order
-- (a)-(j), each over the maps effects, marks, types, rows with keys in
-- `Ord` order. The input domain (§2.3): `effects` exactly `flexEff`
-- minus the forced tails F, `marks` exactly `positions` (the unread
-- frame of a non-handler `with` included), `types` and `rows` any
-- subset of the flexible variables of their sort. Binding a member of F
-- is `BindsForced` (§3), checked first so it is never read as an extra
-- key. A missing source of a forced tail is a missing key, which
-- Effects.Complete's forcing relies on.
module Features.Check.Strategy.Effects.Malformed
  ( malformed
  ) where

import Prelude
import Data.Array (findMap, null)
import Data.Foldable (find)
import Data.Map as Map
import Data.Maybe (Maybe, maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Recorded (Fields, RecordedProblem, fields)
import Domain.Recorded.Atom (Var, VarSort(..))
import Domain.Recorded.Effect (EVar)
import Domain.Verdict.EffectPackage (EffectPackage)
import Domain.Verdict.Search (MalformedReason(..), PackageKey(..))
import Features.Check.Strategy.Effects.Forced (forcedTails)
import Features.Check.Strategy.Effects.MalformedTerms
  ( Parts
  , holesOf
  , keyedParts
  , keylessFail
  , notN
  , twoSortHoles
  , unknownMark
  )
import Features.Check.Strategy.Witness (flexDomain, unsolvedKey)

type Scope =
  { problem ∷ RecordedProblem
  , view ∷ Fields
  , package ∷ EffectPackage
  , parts ∷ Array (Tuple PackageKey Parts)
  , forced ∷ Set EVar
  , owned ∷ Set EVar
  }

malformed ∷ RecordedProblem → EffectPackage → Maybe MalformedReason
malformed problem package = findMap run checks
  where
  run check = check scope
  scope =
    { problem
    , view
    , package
    , parts: keyedParts package
    , forced
    , owned: Set.difference (Set.fromFoldable view.effects.flexEff) forced
    }
  view = fields problem
  forced = Set.fromFoldable (map _.forced (forcedTails problem))
  checks =
    [ bindsForced
    , wrongSort
    , missingKey
    , extraKey
    , nonCanonical
    , unknownMarkIn
    , notNIn
    , holeTwoSorts
    , unsolvedImage
    , keylessFailIn
    ]

-- (a)
bindsForced ∷ Scope → Maybe MalformedReason
bindsForced scope = BindsForced <$>
  find (flip Set.member scope.forced) (Map.keys scope.package.effects)

-- (b): only a type or row key can carry the other sort. A choice: a
-- declared rigid of the other sort used as a key is `WrongSort`, not
-- `ExtraKey`, since each key's recorded sort must be its map's (§2.2);
-- a rigid of the map's own sort is an extra key (d).
wrongSort ∷ Scope → Maybe MalformedReason
wrongSort scope = WrongSort <$> firstOf
  [ sorted KeyType SortRow scope.package.types
  , sorted KeyRow SortType scope.package.rows
  ]
  where
  sorted
    ∷ ∀ a. (Var → PackageKey) → VarSort → Map.Map Var a → Maybe PackageKey
  sorted made wrong images = made <$> find (hasSort wrong) (Map.keys images)
  hasSort wrong variable =
    maybe false (eq wrong <<< _.sort) (Map.lookup variable scope.view.vars)

-- (c): absent type and row variables are allowed (§2.3).
missingKey ∷ Scope → Maybe MalformedReason
missingKey scope = MissingKey <$> firstOf
  [ KeyEffect <$> absent scope.owned scope.package.effects
  , KeyMark <$> absent positions scope.package.marks
  ]
  where
  positions = Set.fromFoldable scope.view.effects.positions

  absent ∷ ∀ k a. Ord k ⇒ Set k → Map.Map k a → Maybe k
  absent domain images = find (not <<< flip Map.member images) domain

-- (d)
extraKey ∷ Scope → Maybe MalformedReason
extraKey scope = ExtraKey <$> firstOf
  [ KeyEffect <$> extra scope.owned scope.package.effects
  , KeyMark <$> extra positions scope.package.marks
  , KeyType <$> extra flexible scope.package.types
  , KeyRow <$> extra flexible scope.package.rows
  ]
  where
  positions = Set.fromFoldable scope.view.effects.positions
  flexible = flexDomain scope.problem

  extra ∷ ∀ k a. Ord k ⇒ Set k → Map.Map k a → Maybe k
  extra domain images = find (not <<< flip Set.member domain)
    (Map.keys images)

-- (e)
nonCanonical ∷ Scope → Maybe MalformedReason
nonCanonical = firstKey NonCanonical (not <<< null <<< _.dataBases)

-- (f)
unknownMarkIn ∷ Scope → Maybe MalformedReason
unknownMarkIn scope = findMap unknown scope.parts
  where
  known = Set.fromFoldable scope.view.effects.rigidMarks
  unknown (Tuple found parts) = UnknownMark found <$> unknownMark known parts

-- (g)
notNIn ∷ Scope → Maybe MalformedReason
notNIn = firstKey NotN notN

-- (h): the smallest two-sort hole of the first key using one.
holeTwoSorts ∷ Scope → Maybe MalformedReason
holeTwoSorts scope = HoleTwoSorts <$> findMap twice images
  where
  images = map snd scope.parts
  twoSorts = twoSortHoles images
  twice parts = Set.findMin
    ( Set.intersection twoSorts
        (Set.fromFoldable (holesOf parts))
    )

-- (i): Strategy.Witness's solved form, shared with the witness (D9).
unsolvedImage ∷ Scope → Maybe MalformedReason
unsolvedImage scope = UnsolvedImage <$> unsolvedKey scope.problem scope.package

-- (j)
keylessFailIn ∷ Scope → Maybe MalformedReason
keylessFailIn = firstKey KeylessFail keylessFail

-- The first present, in the maps' order.
firstOf ∷ ∀ a. Array (Maybe a) → Maybe a
firstOf = findMap identity

firstKey
  ∷ (PackageKey → MalformedReason)
  → (Parts → Boolean)
  → Scope
  → Maybe MalformedReason
firstKey made breaks scope = made <<< fst <$> find hit scope.parts
  where
  hit (Tuple _ parts) = breaks parts

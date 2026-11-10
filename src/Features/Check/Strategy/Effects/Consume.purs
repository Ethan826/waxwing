-- trusted surface: every diff needs token review; see docs/engineering.md
-- E2, consumption of a row s into a target ρ, and Definition 4.2
-- (statements §4; spec §9's `Consume` rows), on rows read through the
-- settled completed package. Each label of s, in source order, is matched
-- by key and rank: the r-th occurrence of its key in s with the r-th in ρ
-- (spec §4.2's keys, through Effects.Rows' grouped form of ρ). The check
-- index j follows spec §9: per source label its partner, its arguments
-- unless the row is bare, its edge mark(ρ occurrence) ⊑ mark(s
-- occurrence) if the site reads marks; then the tail (closed: none; a
-- rigid ϱ: ρ ends in ϱ); then Definition 4.2's exact count for each key
-- of ρ in first-occurrence order, which alone fails with `limit` (spec
-- §5: a limitation never hides an ordinary failure at the same site).
-- Arguments are compared by E1 (Effects.Equal `samePTy`, nested marks and
-- nested handler types included), one check per matched pair.
-- `AtInstalledC` reads only pairing and its edge (the author's ruling of
-- 2026-10-31: no argument equality, tail or remainder); `AtDefer` and
-- `AtDeferredRow` read s's labels only, as a closed row.
module Features.Check.Strategy.Effects.Consume
  ( ConsumeRecord
  , consumeCheck
  ) where

import Prelude
import Data.Array
  ( all
  , catMaybes
  , filter
  , index
  , length
  , mapWithIndex
  , nub
  , take
  , zipWith
  )
import Data.Either (Either(..), either, isRight)
import Data.Foldable (lookup)
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Effect (MRow, SiteKind(..))
import Domain.Row (LabelKey)
import Domain.Verdict.EffectPackage (PLabel, PRow, PTail(..), PTy)
import Features.Check.Strategy.Effects.Equal (samePTy)
import Features.Check.Strategy.Effects.Handler (Checks, check, sequenced)
import Features.Check.Strategy.Effects.Judged (Context, Judged)
import Features.Check.Strategy.Effects.Package (key, underRow)
import Features.Check.Strategy.Effects.Rows (Grouped, grouped)
import Features.Check.Strategy.Effects.Term (holds)

type ConsumeRecord =
  { site ∷ SiteKind
  , source ∷ MRow
  , target ∷ MRow
  , marks ∷ Boolean
  , bare ∷ Boolean
  }

-- What a site's condition reads besides each label's partner: `tail`
-- false reads s as its labels, closed, so neither the tail condition nor
-- Definition 4.2 applies.
type Reading = { arguments ∷ Boolean, marks ∷ Boolean, tail ∷ Boolean }

-- An unreadable side is refused at check 0, never accepted unread. I3
-- runs first and binds every key a record names (spec §5), so this is
-- defensive and unreachable from `certifyPackage`.
consumeCheck ∷ Context → ConsumeRecord → Judged
consumeCheck context record = maybe unread judged
  (Tuple <$> read record.source <*> read record.target)
  where
  read = underRow context.package
  unread = Left { check: 0, limit: false }
  judged (Tuple source target) =
    void (consumed context (readingAt record) source target 0)

readingAt ∷ ConsumeRecord → Reading
readingAt record = case record.site of
  AtInstalledC → { arguments: false, marks: record.marks, tail: false }
  AtDefer → labelsOnly
  AtDeferredRow → labelsOnly
  _ → labelsOnly { tail = true }
  where
  labelsOnly =
    { arguments: not record.bare, marks: record.marks, tail: false }

-- A keyless label on either side cannot be matched: the run stops at the
-- first check (spec §4.2). A source ending in a hole is refused there
-- too: `settle` leaves no hole in a settled row, so this is defensive and
-- unreachable from `certifyPackage`.
consumed ∷ Context → Reading → PRow → PRow → Checks
consumed context reading row target =
  maybe (check false) judged
    (Tuple <$> sourceKeyed <*> grouped target)
  where
  source
    | reading.tail = row
    | otherwise = row { tail = Nothing }
  sourceKeyed
    | holeTail source = Nothing
    | otherwise = traverse keyed source.labels
  keyed label = flip Tuple label <$> key label
  judged (Tuple sourceKeys targetForm) =
    labels sourceKeys targetForm
      >=> rigid (endsIn target)
      >=> rigid (const (exact sourceKeys target))
  labels sourceKeys targetForm = sequenced
    (mapWithIndex (paired context reading sourceKeys targetForm) sourceKeys)
  -- Run only when s ends in a rigid ϱ.
  rigid checks = maybe pure (rigidOnly checks) source.tail
  rigidOnly checks = case _ of
    PTailRigid variable → checks (PTailRigid variable)
    PTailHole _ → pure

paired
  ∷ Context
  → Reading
  → Array (Tuple LabelKey PLabel)
  → Grouped
  → Int
  → Tuple LabelKey PLabel
  → Checks
paired context reading sourceKeys targetForm position (Tuple labelKey label) =
  maybe (check false) matched partner
  where
  rank = length (filter (eq labelKey <<< fst) (take position sourceKeys))
  partners = fromMaybe [] (lookup labelKey targetForm.keyed)
  partner = index partners rank
  matched found = check true >=> arguments found >=> edge found
  arguments found
    | reading.arguments =
        check (argumentsEqual context label.args found.args)
    | otherwise = pure
  edge found
    | reading.marks = check (holds found.mark label.mark)
    | otherwise = pure

argumentsEqual ∷ Context → Array PTy → Array PTy → Boolean
argumentsEqual context lefts rights =
  length lefts == length rights && all identity (zipWith same lefts rights)
  where
  same left right = isRight (samePTy context left right)

holeTail ∷ PRow → Boolean
holeTail row = maybe false isHole row.tail
  where
  isHole = case _ of
    PTailHole _ → true
    PTailRigid _ → false

endsIn ∷ PRow → PTail → Checks
endsIn target ending = check (target.tail == Just ending)

-- Definition 4.2: ρ holds exactly as many occurrences of each key as s.
-- The partners already give ρ at least as many, so only ρ's keys are
-- read, in first-occurrence order.
exact ∷ Array (Tuple LabelKey PLabel) → PRow → Checks
exact sourceKeys target =
  limited (sequenced (map counted order))
  where
  targetKeys = catMaybes (map key target.labels)
  order = nub targetKeys
  counted labelKey =
    check (occurrences targetKeys == occurrences (map fst sourceKeys))
    where
    occurrences = length <<< filter (eq labelKey)

limited ∷ Checks → Checks
limited checks index = either limitation Right (checks index)
  where
  limitation failure = Left failure { limit = true }

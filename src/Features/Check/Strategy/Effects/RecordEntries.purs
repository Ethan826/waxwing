-- trusted surface: every diff needs token review; see docs/engineering.md
-- The recorded problem's entries, for record validation (Effects.Record;
-- spec §4.1), in spec §5 item 1's order: the obligations as recorded,
-- then the tables `instances`, `annotations`, `nodes`, `ambient` and
-- `signature`, keys in `Ord` order. Each entry carries where a defect in
-- it is reported (an obligation's provenance, or `InRecord` naming the
-- table and key), its consume flags if it is a `Consume`, the obligation
-- itself if it is one (for check 4, Effects.RecordCompanions) and what it
-- references (Effects.RecordRefs, which reads the forcing instances'
-- results as the copies the placement rule allows).
module Features.Check.Strategy.Effects.RecordEntries
  ( Entry
  , coverageAt
  , entriesOf
  ) where

import Prelude
import Data.Array (mapMaybe)
import Data.Map (lookup, toUnfoldable)
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Effect
  ( EVar(..)
  , MTy(..)
  , Obligation(..)
  , Placed
  , Provenance(..)
  , RecordTable(..)
  , SiteKind
  )
import Domain.Recorded.Origin (Path)
import Domain.Resolved (FunctionId)
import Features.Check.Strategy.Effects.Forced (forcedTails)
import Features.Check.Strategy.Effects.RecordRefs
  ( Copies
  , Refs
  , obligationRefs
  , rowRefs
  , signatureRefs
  , tyRefs
  )

type Entry =
  { provenance ∷ Provenance
  , consume ∷ Maybe { site ∷ SiteKind, marks ∷ Boolean, bare ∷ Boolean }
  , refs ∷ Refs
  , obligation ∷ Maybe (Placed Obligation)
  }

entriesOf ∷ RecordedProblem → Array Entry
entriesOf problem = map obligationEntry effects.obligations
  <> map instanceEntry (toUnfoldable effects.instances)
  <> map (tableEntry decl InAnnotations <<< map (tyRefs copies))
    (toUnfoldable effects.annotations)
  <> map (tableEntry decl InNodes <<< map (tyRefs copies))
    (toUnfoldable effects.nodes)
  <> map (tableEntry decl InAmbient <<< map (rowRefs copies))
    (toUnfoldable effects.ambient)
  <>
    [ plain (InRecord { decl, table: InSignature, path: Nothing })
        (signatureRefs copies effects.signature)
    ]
  where
  decl = (fields problem).decl
  effects = (fields problem).effects
  copies = copiesOf problem
  obligationEntry placed =
    (plain placed.provenance (obligationRefs copies placed.value))
      { consume = consumeOf placed, obligation = Just placed }
  instanceEntry (Tuple path sig) =
    tableEntry decl InInstances (Tuple path (signatureRefs copies sig))

-- Where check 1's coverage clause, about the record as a whole, is
-- reported.
coverageAt ∷ FunctionId → Provenance
coverageAt decl = InRecord { decl, table: InCoverage, path: Nothing }

copiesOf ∷ RecordedProblem → Copies
copiesOf problem = { results, clauses: mapMaybe clausesOf results }
  where
  instances = (fields problem).effects.instances
  results = mapMaybe resultOf (forcedTails problem)
  resultOf forced = case forced.forced of
    EffFresh path _ → map _.result (lookup path instances)
    EffRigid _ → Nothing
  clausesOf = case _ of
    MHandler _ rows → rows.clauses
    _ → Nothing

-- A keyed table's entry, named by its table and key.
tableEntry ∷ FunctionId → RecordTable → Tuple Path Refs → Entry
tableEntry decl table (Tuple path refs) =
  plain (InRecord { decl, table, path: Just path }) refs

plain ∷ Provenance → Refs → Entry
plain provenance refs =
  { provenance, consume: Nothing, refs, obligation: Nothing }

consumeOf
  ∷ Placed Obligation
  → Maybe { site ∷ SiteKind, marks ∷ Boolean, bare ∷ Boolean }
consumeOf placed = case placed.value of
  Consume { site, marks, bare } → Just { site, marks, bare }
  _ → Nothing

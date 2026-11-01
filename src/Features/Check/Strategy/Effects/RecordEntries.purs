-- trusted surface: every diff needs token review; see docs/engineering.md
-- The recorded problem's entries, for record validation (Effects.Record;
-- spec §4.1), in spec §5 item 1's order: the obligations as recorded,
-- then the tables `instances`, `annotations`, `nodes`, `ambient` and
-- `signature`, keys in `Ord` order. Each entry carries where a defect in
-- it is reported, its consume flags if it is a `Consume`, check 3's
-- verdict for an instance (true is a violation) and what it references
-- (Effects.RecordRefs, which reads the forcing instances' results as the
-- copies the placement rule allows).
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
  ( ERole(..)
  , EVar(..)
  , InstanceSig
  , MTy(..)
  , Obligation(..)
  , Placed
  , Provenance(..)
  , SiteKind
  )
import Domain.Recorded.Origin (Path(..), PathRoot(..), RuleId(..))
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
  , closedForced ∷ Boolean
  , refs ∷ Refs
  }

-- Each table's index in `tableAt`'s provenance.
tables
  ∷ { instances ∷ Int
    , annotations ∷ Int
    , nodes ∷ Int
    , ambient ∷ Int
    , signature ∷ Int
    , coverage ∷ Int
    }
tables =
  { instances: 0
  , annotations: 1
  , nodes: 2
  , ambient: 3
  , signature: 4
  , coverage: 5
  }

root ∷ Path
root = Path { root: InResult, steps: [] }

entriesOf ∷ RecordedProblem → Array Entry
entriesOf problem = map obligationEntry effects.obligations
  <> map instanceEntry (toUnfoldable effects.instances)
  <> map (tableEntry decl tables.annotations <<< map (tyRefs copies))
    (toUnfoldable effects.annotations)
  <> map (tableEntry decl tables.nodes <<< map (tyRefs copies))
    (toUnfoldable effects.nodes)
  <> map (tableEntry decl tables.ambient <<< map (rowRefs copies))
    (toUnfoldable effects.ambient)
  <>
    [ tableEntry decl tables.signature
        (Tuple root (signatureRefs copies effects.signature))
    ]
  where
  decl = (fields problem).decl
  effects = (fields problem).effects
  copies = copiesOf problem
  obligationEntry placed =
    (plain placed.provenance (obligationRefs copies placed.value))
      { consume = consumeOf placed }
  instanceEntry (Tuple path sig) =
    (tableEntry decl tables.instances (Tuple path (signatureRefs copies sig)))
      { closedForced = closedForced path sig }

-- Where check 1's coverage clause, about the record as a whole, is
-- reported (see `tableAt`).
coverageAt ∷ FunctionId → Provenance
coverageAt decl = tableAt decl tables.coverage root

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

-- Check 3: `⟨p, result clauses⟩` as the ResultC's tail at p, R closed.
closedForced ∷ Path → InstanceSig → Boolean
closedForced path sig = case sig.result of
  MHandler _
    { inference: { tail: Nothing }, clauses: Just { tail: Just tail } } →
    tail == EffFresh path ResultClauses
  _ → false

tableEntry ∷ FunctionId → Int → Tuple Path Refs → Entry
tableEntry decl table (Tuple path refs) = plain (tableAt decl table path) refs

plain ∷ Provenance → Refs → Entry
plain provenance refs =
  { provenance, consume: Nothing, closedForced: false, refs }

-- No obligation stands beside a table entry, and `Provenance` has no
-- form for one. PROVISIONAL, pending the controller's ruling: the
-- entry is named as beside an atom of `SigRule 0`, which no rule is
-- (signature rules are 1-10), at the entry's key path, the index naming
-- the table (`tables`). `signature` and the coverage entry have no key;
-- they take the result root.
tableAt ∷ FunctionId → Int → Path → Provenance
tableAt decl table path = BesideAtom (SigRule 0) { decl, path, index: table }

consumeOf
  ∷ Placed Obligation
  → Maybe { site ∷ SiteKind, marks ∷ Boolean, bare ∷ Boolean }
consumeOf placed = case placed.value of
  Consume { site, marks, bare } → Just { site, marks, bare }
  _ → Nothing

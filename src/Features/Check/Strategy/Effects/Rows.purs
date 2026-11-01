-- trusted surface: every diff needs token review; see docs/engineering.md
-- R-A's row normal form (spec §9; statements §4): rows are equal up to
-- scoped-label order (Leijen 2005, eq-swap: adjacent labels of distinct
-- keys commute), labels compared by key as Leijen 2017 §3 does. A row's
-- normal form groups its labels by key, keys ascending, each key's labels
-- in row order (a scoped label's occurrences never commute), and keeps the
-- tail. Keys are Effects.Package's `key`, on settled labels (spec §4.2);
-- `Nothing` when a label is keyless. Equal grouped forms against
-- eq-swap's closure, bounded, is test/r0-a2-terms.test.mjs.
module Features.Check.Strategy.Effects.Rows
  ( Grouped
  , grouped
  ) where

import Prelude
import Data.Map as Map
import Data.Maybe (Maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Row (LabelKey)
import Domain.Verdict.EffectPackage (PLabel, PRow, PTail)
import Features.Check.Strategy.Effects.Package (key)

type Grouped =
  { keyed ∷ Array (Tuple LabelKey (Array PLabel)), tail ∷ Maybe PTail }

grouped ∷ PRow → Maybe Grouped
grouped row = assemble <$> traverse keyed row.labels
  where
  keyed label = flip Tuple [ label ] <$> key label
  -- `fromFoldableWith` combines a later value with the earlier one as
  -- `f later earlier`, so `flip append` keeps row order.
  assemble pairs =
    { keyed: Map.toUnfoldable (Map.fromFoldableWith (flip append) pairs)
    , tail: row.tail
    }

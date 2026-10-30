-- trusted surface: every diff needs token review; see docs/engineering.md
-- E2 at the call and application sites (a-min statements §4; plan Task
-- 8): each stage of a use consumes its row into the ambient row
-- (`context.ambient`). A named use of `count` parameters given
-- `supplied` arguments: saturated or over-applied, the call itself
-- consumes the callee's row at the site's own kind, then each extra
-- argument its stage `⟨p, stage i⟩` at `AtStage i` (Check/Call.purs
-- `overApplied`, Apply.purs `applyAll`); a partial application consumes
-- the stages it supplies, `AtStage k` for k below `supplied`. The live
-- checker consumes nothing at a partial application (the stages before a
-- declaration's last are inert quantified rows, Check/Stages.purs), so
-- these sources are open, empty and flexible: they hold no label and no
-- rigid tail, and the statements' site list (§4 E2, §12.2 `sites`) names
-- them. An application of a value (`Apply`, `Pipe`) consumes its k
-- stages in order, each `⟨p, stage j⟩` (Check/Apply.purs `applyNext`).
module Features.Check.Generate.Consume
  ( Place
  , Use
  , applyStages
  , callStages
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Domain.Recorded.Effect (ERole(..), EVar(..), MRow, SiteKind(..))
import Domain.Recorded.Origin (Path, RuleId)
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, at)
import Features.Check.Generate.Gen (Gen, effected)
import Features.Check.Generate.Obligation (consumeAt, stageRow)
import Features.Check.Generate.Out (EffectItem(..))

-- The node: its path, span, rule and the site kind of its own stage.
type Place r =
  { path ∷ Path, span ∷ Span, rule ∷ RuleId, site ∷ SiteKind | r }

-- A named use: its parameter count, the arguments given and its row.
type Use = { count ∷ Int, supplied ∷ Int, row ∷ MRow }

callStages ∷ ∀ s r. Context s → Place r → Use → Gen s Unit
callStages context place use
  | use.supplied < use.count = partialStages context place use.supplied
  | otherwise = do
      consumeAt (at context place.path place.rule) place.span
        { site: place.site, ordinal: 0, source: use.row }
        context.ambient
      traverse_ (staged context place) (indices (use.supplied - use.count))

-- The stages a partial application supplies. Nothing else names them (the
-- rest of the arrow starts at `supplied`), so they are minted here.
partialStages ∷ ∀ s r. Context s → Place r → Int → Gen s Unit
partialStages context place supplied = do
  effected (map minted (indices supplied))
  traverse_ (staged context place) (indices supplied)
  where
  minted k = MintedVar (EffFresh place.path (Stage k))

-- An application of a value to `count` arguments: one stage each.
applyStages ∷ ∀ s r. Context s → Place r → Int → Gen s Unit
applyStages context place count = traverse_ stage (indices count)
  where
  stage k = consumeAt (at context place.path place.rule) place.span
    { site: place.site, ordinal: k, source: stageRow place.path k }
    context.ambient

staged ∷ ∀ s r. Context s → Place r → Int → Gen s Unit
staged context place k = consumeAt (at context place.path place.rule)
  place.span
  { site: AtStage k, ordinal: k, source: stageRow place.path k }
  context.ambient

-- 0 … n − 1 (none for n ≤ 0).
indices ∷ Int → Array Int
indices count = Array.mapWithIndex const (Array.replicate count unit)

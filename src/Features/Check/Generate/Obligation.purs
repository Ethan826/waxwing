-- trusted surface: every diff needs token review; see docs/engineering.md
-- What a rule records as obligations (a-min statements §4; plan Task 7).
-- `agreeEqual` is a body agreement `eq τ τ′` listed with its E1 at full
-- marked types: one entry, so the atom's AtomId is also the E1's
-- provenance and no index moves. `equalAt` is an E1 with no atom (O1 at a
-- handler clause, O2 at a `with` node), identified by its declaration,
-- path, rule and role (Domain.Recorded.Effect `Provenance`).
module Features.Check.Generate.Obligation
  ( agreeEqual
  , builtArrow
  , equalAt
  , equalTagged
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , MTy(..)
  , Obligation(..)
  , Provenance(..)
  , SiteRole
  )
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..))
import Domain.Syntax (Span)
import Features.Check.Generate.Elab (GenTy)
import Features.Check.Generate.Gen
  ( Gen
  , GenEntry(..)
  , Tagged
  , effected
  )
import Features.Check.Generate.Node (tagged)
import Features.Check.Generate.Out (At, EffectItem(..))

-- A body agreement (B1, origin body) at a span.
agreeEqual ∷ ∀ s. Span → GenTy s → GenTy s → MTy → MTy → Tagged s
agreeEqual = equalTagged RowB 1 Body

equalTagged
  ∷ ∀ s
  . RowGroup
  → Int
  → OriginKind
  → Span
  → GenTy s
  → GenTy s
  → MTy
  → MTy
  → Tagged s
equalTagged group number kind span left right markedLeft markedRight =
  tagged (EmitEqual left right markedLeft markedRight) group number kind span

-- The marked `σ₁ → … → σₙ → τ` an equation builds (E14, E15, E5's
-- over-application), where generation's `arrowOf` puts the closed row:
-- stage k's row is the fresh `⟨p, stage k⟩`, minted here.
builtArrow ∷ ∀ s. Path → Array MTy → MTy → Gen s MTy
builtArrow path parameters result = built
  <$ effected (Array.mapWithIndex mint parameters)
  where
  built = Array.foldr stage result (Array.mapWithIndex Tuple parameters)
  stage (Tuple k parameter) = MArrow parameter
    { labels: [], tail: Just (EffFresh path (Stage k)) }
  mint k _ = MintedVar (EffFresh path (Stage k))

equalAt ∷ ∀ s. At → SiteRole → Span → MTy → MTy → Gen s Unit
equalAt site role span left right = effected
  [ Obliged
      { provenance: AtSite
          { decl: site.decl, path: site.path, rule: site.rule, role }
      , rule: site.rule
      , span
      , value: Equal left right
      }
  ]

-- trusted surface: every diff needs token review; see docs/engineering.md
-- What a rule records as obligations (a-min statements §4; plan Task 7).
-- `agreeEqual` is a body agreement `eq τ τ′` listed with its E1 at full
-- marked types: one entry, so the atom's AtomId is also the E1's
-- provenance and no index moves. `equalAt` is an E1 with no atom (O1 at a
-- handler clause, O2 at a `with` node), identified by its declaration,
-- path, rule and role (Domain.Recorded.Effect `Provenance`). Task 8 adds
-- E2 consumptions (`consumeAt`, one per stage at a site; role `Consumed
-- site ordinal`), the ambient row of a body (`ambientAt`, E11) and a
-- use's callee arity (`arityAt`).
module Features.Check.Generate.Obligation
  ( StageSite
  , agreeEqual
  , ambientAt
  , arityAt
  , builtArrow
  , consumeAt
  , equalAt
  , equalTagged
  , stageRow
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , MRow
  , MTy(..)
  , Obligation(..)
  , Provenance(..)
  , SiteKind
  , SiteRole(..)
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

-- One stage of a site: its kind, its ordinal among that kind's stages at
-- the path (so no two share an identity), and the row it consumes.
type StageSite = { site ∷ SiteKind, ordinal ∷ Int, source ∷ MRow }

-- E2: the stage's row consumed into `target`, marks kept and clauses not
-- bare (§4: every ordinary site; E4's and E5's variants are Task 9).
consumeAt ∷ ∀ s. At → Span → StageSite → MRow → Gen s Unit
consumeAt place span stage target = effected
  [ Obliged
      { provenance: AtSite
          { decl: place.decl
          , path: place.path
          , rule: place.rule
          , role: Consumed stage.site stage.ordinal
          }
      , rule: place.rule
      , span
      , value: Consume
          { site: stage.site
          , source: stage.source
          , target
          , marks: true
          , bare: false
          }
      }
  ]

-- The open row `⟨p, stage k⟩` of an application's or over-application's
-- k-th stage (the variable `builtArrow` mints).
stageRow ∷ Path → Int → MRow
stageRow path k = { labels: [], tail: Just (EffFresh path (Stage k)) }

-- E11: the ambient row of the body at `path`.
ambientAt ∷ ∀ s. Path → MRow → Gen s Unit
ambientAt path row = effected [ AmbientAt path row ]

-- A use's callee arity at the use's path.
arityAt ∷ ∀ s. Path → Int → Gen s Unit
arityAt path count = effected [ ArityAt path count ]

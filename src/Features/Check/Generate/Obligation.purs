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
-- Task 10 adds the other atom-free obligations, each identified the
-- same way (plan Task 10): `deferAt` (E6 with its E2), `entryAt` (E8),
-- `payloadAt` (E9) and `unsupportedAt` (FX032). Task 9's handler family
-- (Generate.Effect) records through `siteAt` and `consumedAt`.
module Features.Check.Generate.Obligation
  ( Consumption
  , StageSite
  , agreeEqual
  , ambientAt
  , arityAt
  , builtArrow
  , consumeAt
  , consumedAt
  , deferAt
  , entryAt
  , equalAt
  , equalTagged
  , payloadAt
  , siteAt
  , stageRow
  , unsupportedAt
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
  , SiteKind(..)
  , SiteRole(..)
  , UnsupportedKind(..)
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

-- E6 at a `defer`: the deferred row d (the `defer`'s `⟨p, effect⟩`) and
-- the enclosing ambient row, and E2's consumption of d into it. `defer`
-- consumes labels with marks respected (Defer.purs `checkDefer`,
-- `ignoreMarks: false`; statements §4 K3), so `marks` holds and the
-- source is d's own row, `bare` does not.
deferAt ∷ ∀ s. At → Span → EVar → MRow → Gen s Unit
deferAt site span row enclosing =
  siteAt site DeferRegistration span (Defer { row, enclosing })
    *> siteAt site DeferInto span
      ( Consume
          { site: AtDefer
          , source: { labels: [], tail: Just row }
          , target: enclosing
          , marks: true
          , bare: false
          }
      )

-- E8: `main`'s declared row, which must lie within `Console`.
entryAt ∷ ∀ s. At → Span → MRow → Gen s Unit
entryAt site span row = siteAt site EntryRow span (Entry row)

-- E9: a `fail` or a fail clause's payload type, whose head must be
-- concrete after settling.
payloadAt ∷ ∀ s. At → Span → MTy → Gen s Unit
payloadAt site span payload =
  siteAt site PayloadHead span (FailConcrete payload)

-- A form the validator does not support, under the role naming it:
-- FX032's perform of an operation that writes a `with` row, or a `with`
-- over a handler whose marked type is not a handler type (§18.124).
unsupportedAt ∷ ∀ s. At → Span → UnsupportedKind → Gen s Unit
unsupportedAt site span kind =
  siteAt site (roleOf kind) span (Unsupported kind)
  where
  roleOf = case _ of
    OperationWithRow _ _ → UnsupportedOperation
    UnframedInstall → UnframedWith

-- A consumption as recorded: its site kind, rows and flags.
type Consumption =
  { site ∷ SiteKind
  , source ∷ MRow
  , target ∷ MRow
  , marks ∷ Boolean
  , bare ∷ Boolean
  }

-- A consumption at a site with one stage of its kind at the path (E4's
-- clause rows, E5's R and installed C), so its ordinal is 0.
consumedAt ∷ ∀ s. At → Span → Consumption → Gen s Unit
consumedAt site span consumption =
  siteAt site (Consumed consumption.site 0) span (Consume consumption)

-- An obligation with no atom, identified by its site and role.
siteAt ∷ ∀ s. At → SiteRole → Span → Obligation → Gen s Unit
siteAt site role span value = effected
  [ Obliged
      { provenance: AtSite
          { decl: site.decl, path: site.path, rule: site.rule, role }
      , rule: site.rule
      , span
      , value
      }
  ]

-- trusted surface: every diff needs token review; see docs/engineering.md
-- E20's handler literal as the effect problem records it (split from
-- Generate.Effect, amin tranche 1 Task 9, for the line budget): its
-- marked type keeps the label with the mark at `Literal p`, its R
-- `⟨p, handler inference⟩` and its C `⟨p, handler clauses⟩` (statements
-- §2, "Copies through equations"), and `HandlerLit` with its clause
-- rows' consumptions (E4). No E1 is recorded at the literal's node: its
-- type is the node's own, and reaches each use by identity or through
-- the moving rule's E1 (R9 Q1, §18.124).
module Features.Check.Generate.Literal
  ( literalAt
  , literalType
  , literalVars
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (sequence_)
import Data.Maybe (Maybe(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Obligation(..)
  , Position(..)
  , SiteKind(..)
  , SiteRole(..)
  )
import Domain.Recorded.Origin (Path)
import Domain.Row (EffectRef)
import Domain.Syntax (Span)
import Features.Check.Generate.Elab (Ref)
import Features.Check.Generate.Gen (Gen)
import Features.Check.Generate.Node (markedRef)
import Features.Check.Generate.Obligation (consumedAt, siteAt)
import Features.Check.Generate.Out (At)

-- E4 (statements §4, §2's ownership table): `HandlerLit` under
-- `LiteralSite` names the own-abort mark `Literal p`, R, C and each
-- clause's row `⟨p, clauses k⟩` (the literal mints it, shared with the
-- clause's ambient row, R9 Q5); then each c_k is consumed into R
-- ignoring marks and into C with marks, C bare (Definition 4.2's
-- sites). E4's `M ⊑ m` and tail conditions are the validator's, read
-- from these records.
literalAt ∷ ∀ s. At → Span → Array EVar → Gen s Unit
literalAt site span clauseRows =
  siteAt site LiteralSite span
    ( HandlerLit
        { m: Literal site.path
        , inference: own.inference
        , clauses: own.clauses
        , clauseRows
        }
    )
    *> sequence_ (Array.mapWithIndex intoBoth clauseRows)
  where
  own = literalRows site.path
  intoBoth k row =
    consumedAt site span
      { site: ClauseIntoR k
      , source: tailOnly row
      , target: tailOnly own.inference
      , marks: false
      , bare: false
      }
      *> consumedAt site span
        { site: ClauseIntoC k
        , source: tailOnly row
        , target: tailOnly own.clauses
        , marks: true
        , bare: true
        }

-- A handler literal's marked type, R and C its own variables.
literalType ∷ ∀ s. Path → EffectRef → Array (Ref s) → MTy
literalType path effect arguments = MHandler
  { effect, args: map markedRef arguments, mark: At (Literal path) }
  { inference: tailOnly own.inference, clauses: Just (tailOnly own.clauses) }
  where
  own = literalRows path

literalVars ∷ Path → Array EVar
literalVars path = [ own.inference, own.clauses ]
  where
  own = literalRows path

-- The literal's own R and C variables, `⟨p, handler inference⟩` and
-- `⟨p, handler clauses⟩`.
literalRows ∷ Path → { inference ∷ EVar, clauses ∷ EVar }
literalRows path =
  { inference: EffFresh path HandlerInference
  , clauses: EffFresh path HandlerClauses
  }

tailOnly ∷ EVar → MRow
tailOnly variable = { labels: [], tail: Just variable }

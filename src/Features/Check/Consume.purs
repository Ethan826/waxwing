module Features.Check.Consume
  ( LabelConsumption
  , consumeAt
  , consumeVia
  , consumeLabels
  , consumeIgnoring
  , closeTail
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldl)
import Data.Maybe (Maybe(..))
import Domain.Checked.Internal (Open(..))
import Domain.Row (Label, Row(..), closedRow)
import Domain.Syntax (Diagnostic, Span)
import Domain.Type (Ty, TyRow)
import Features.Check.Context (CheckEnv)
import Features.Check.MarkStore (RowMode(..))
import Features.Check.Occurrence (OccurrenceId(Written), Sides)
import Features.Check.Origin (RowEvent(..), attributed, linked)
import Features.Check.Provenance (Consumed, Origin, remember)
import Features.Check.Reject (rejected, rightSpan, siteOccurrence)
import Features.Check.Scheme (State, flexibleRow)
import Features.Check.Site (Site)
import Features.Check.Subst (linkTo)
import Features.Check.Unify (Failure, Flex(..), Subst(..), resolveRow, unify)
import Features.Check.RowFinish (Traced)
import Features.Check.UnifyRow (unifyRowsIgnoring, unifyRowsTraced)

-- A row consumed into the current one at `span`, recording what was
-- consumed there as the origin of each label occurrence it adds or
-- reaches (design §6).
consumeAt
  ∷ ∀ r
  . CheckEnv r
  → State
  → Span
  → Consumed
  → TyRow Open
  → Either Diagnostic State
consumeAt env state span consumed =
  consumeVia env state { span, consumed, via: Nothing } []

-- The same through a boundary, or with each stage label known to be an
-- occurrence already (`sources`, by position: a deferred expression's
-- labels, consumed into the enclosing row, are linked to where `e`
-- performed them before the consumption's own links, which come second).
-- The stage as it stands is consumed; a closed one gets a throwaway tail.
consumeVia
  ∷ ∀ r
  . CheckEnv r
  → State
  → Origin
  → Array OccurrenceId
  → TyRow Open
  → Either Diagnostic State
consumeVia env state origin sources = consumeIn env state origin sources
  (Directional { span: origin.span, throwaway: Nothing })

-- Labels consumed into an explicit `target` (its `sites` say where its
-- labels were written), with one fresh tail meta as the stage's throwaway:
-- the tail is never read, so no copy lands on it. Every settling entry
-- uses this (rev6 M9, review I4).
type LabelConsumption =
  { origin ∷ Origin
  , sources ∷ Array OccurrenceId
  , labels ∷ Array (Label (Ty Open))
  , target ∷ TyRow Open
  , sites ∷ Array Site
  , ignoreMarks ∷ Boolean
  }

consumeLabels
  ∷ ∀ r
  . CheckEnv r
  → State
  → LabelConsumption
  → Either Diagnostic State
consumeLabels env state spec = consumeIn
  (env { current = spec.target, sites = spec.sites })
  (state { next = state.next + 1 })
  spec.origin
  spec.sources
  mode
  (Row spec.labels (Just (Hole state.next)))
  where
  mode =
    if spec.ignoreMarks then IgnoreMarks
    else Directional { span: spec.origin.span, throwaway: Just state.next }

-- The stage as it stands into `target`, ignoring marks: R ≡ ρ at `with`
-- and the hook (design §3.4).
consumeIgnoring
  ∷ ∀ r
  . CheckEnv r
  → State
  → { origin ∷ Origin, stage ∷ TyRow Open, target ∷ TyRow Open }
  → Either Diagnostic State
consumeIgnoring env state spec = consumeIn (env { current = spec.target })
  state
  spec.origin
  []
  IgnoreMarks
  spec.stage

-- The row unified with the closed row, ignoring marks. A remainder or a
-- clause row whose tail is bound to nothing ends there for good; a row that
-- still has labels to add is refused like any other consumption.
closeTail
  ∷ ∀ r
  . CheckEnv r
  → State
  → Origin
  → TyRow Open
  → Either Diagnostic State
closeTail env state origin row = either (rejected env state origin) closed
  ( unifyRowsIgnoring unify state.subst (flexibleRow row)
      (flexibleRow closedRow)
  )
  where
  closed subst = Right (state { subst = subst })

consumeIn
  ∷ ∀ r
  . CheckEnv r
  → State
  → Origin
  → Array OccurrenceId
  → RowMode
  → TyRow Open
  → Either Diagnostic State
consumeIn env state origin sources mode row = either failed finished
  (consume mode start sides (flexibleRow row) (flexibleRow env.current))
  where
  sides = { left: origin.span, right: rightSpan env }
  start = foldl linkSource state.subst (Array.mapWithIndex numbered sources)
  numbered index source = { index, source }
  linkSource subst found =
    linkTo (Written origin.span found.index) found.source subst
  failed = rejected env state origin
  finished traced = Right
    ( state
        { subst = linked (named traced.events) traced.subst
        , origins = recorded traced
        }
    )
  named = map site
  site = case _ of
    Matched consumed existing → Matched consumed (siteOccurrence env existing)
    Extended meta source → Extended meta (siteOccurrence env source)
  recorded traced =
    if traced.postponed then foldl keep state.origins (stageOccurrences row)
    else attributed origin (named traced.events) state.origins
  keep origins occurrence = remember occurrence origin origins
  stageOccurrences (Row labels _) = Array.mapWithIndex placed labels
  placed index _ = Written origin.span index

-- Closed rows open only for consumption; the function value stays closed.
-- Whether the stage is closed is decided on the row resolved, but an open
-- one is consumed as it stands, so its labels keep the occurrences their
-- meta bindings gave them.
consume
  ∷ RowMode
  → Subst
  → Sides
  → TyRow Flex
  → TyRow Flex
  → Either Failure Traced
consume mode subst sides stage current = case resolveRow subst stage of
  Row labels Nothing → unifyRowsTraced unify (throwing mode) sides fresh
    (Row labels (Just (Meta bindings.fresh)))
    current
  _ → unifyRowsTraced unify mode sides subst stage current
  where
  Subst bindings = subst
  fresh = Subst bindings { fresh = bindings.fresh - 1 }
  -- The tail added to a closed stage is the one nobody reads.
  throwing = case _ of
    Directional direction → Directional
      direction { throwaway = Just bindings.fresh }
    other → other

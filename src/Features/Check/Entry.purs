module Features.Check.Entry (check, finalEntries, resolvedRow) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (maybe)
import Domain.Checked.Internal (Open)
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Row (EffectRef(..), Label(..))
import Domain.Syntax (Diagnostic, Span)
import Domain.Type (TyRow)
import Features.Check.Context (CheckEnv)
import Features.Check.Provenance (Boundary(Main), trail)
import Features.Check.Report (boundaryNote, crossingNotes, originNotes)
import Features.Check.RowName (labelName)
import Features.Check.RowSide (Entry, expanded, written)
import Features.Check.Scheme (State, checkedRow, flexibleRow)
import Features.Check.Subst (Subst, resolveLabel, resolveRow)

resolvedRow ∷ Subst → TyRow Open → TyRow Open
resolvedRow subst row = checkedRow (resolveRow subst (flexibleRow row))

-- A row written at `span`, its tail's bindings spliced in: `resolveRow`'s
-- labels, in order with duplicates kept, each paired with its occurrence
-- by the one walk that reaches it (R037 (2): no zip to truncate).
finalEntries ∷ Subst → Span → TyRow Open → Array Entry
finalEntries subst span row =
  map resolved (expanded subst (written span (flexibleRow row))).entries
  where
  resolved entry = entry { label = resolveLabel subst entry.label }

-- `main` may perform only Console. The first other label of its final row
-- is rejected at the expression whose consumption put it there, with
-- notes for where it arose and for `main` as the boundary (design §6).
check
  ∷ ∀ r
  . CheckEnv r
  → State
  → Resolved.FunctionDecl
  → Either Diagnostic Unit
check env state definition
  | definition.name /= "main" = Right unit
  | otherwise =
      traverse_ allowed
        (finalEntries state.subst definition.span env.current)
      where
      allowed { label: Label ConsoleEffect _ _ } = Right unit
      allowed { label, occurrence } = do
        name ← labelName env definition.span label
        rejection name (trail state.subst state.origins occurrence)
      rejection name hops = Left
        { problem: UnhandledEffect name
        , span: primary hops
        , related: originNotes (primary hops) name hops
            <> crossingNotes name hops
            <> [ boundaryNote definition.span name Main ]
        }
      primary hops = maybe definition.span _.span (firstOrigin hops)
      firstOrigin hops = Array.head (Array.mapMaybe originOf hops)
      originOf hop = hop.origin

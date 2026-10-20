module Features.Check.RestBinder (Labelled, matched) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic)
import Domain.Type (Ty(..))
import Domain.Type.Record (withoutLabels)
import Features.Check.Matched (Matched, Typed)
import Features.Check.PatternRow (Written, writtenLabels)
import Features.Check.Scheme (State, Threaded, resolved)
import Features.Check.SeveralTails (withinOneTail)

-- A record pattern's result once its fields are checked: the checked
-- pattern, its binders, and a named rest's type. A module of its own so
-- that Features.Check.RecordPattern stays under the file budget (R005
-- Tranche B Task 7).

-- A field's label and its checked pattern.
type Labelled = { label ∷ String, matched ∷ Matched }

matched
  ∷ Ty Open
  → Written
  → Threaded (Array Labelled)
  → Either Diagnostic (Threaded Matched)
matched expected written checked = built <$> restOf checked.state expected
  written
  where
  built rest =
    { value:
        { pattern: Checked.Pattern
            { ty: expected
            , span: written.span
            , shape: Checked.Record (map fieldOf checked.value) rest
            }
        , locals: Array.concatMap localsOf checked.value <> restLocals rest
        }
    , state: checked.state
    }
  fieldOf field = { label: field.label, pattern: field.matched.pattern }
  localsOf field = field.matched.locals

-- R005 design §3: a named rest is the matched record without the written
-- labels, its tail kept (the open rest, or the closed remainder, `{}`
-- when none is left). The record is the expected type as the fields'
-- checks left it, which holds every written label by then. Over several
-- tails it is a placeholder (Features.Check.SeveralTails).
restOf
  ∷ State → Ty Open → Written → Either Diagnostic Checked.Rest
restOf state expected written = case written.rest of
  Resolved.NoRest → Right Checked.NoRest
  Resolved.IgnoredRest → Right Checked.IgnoredRest
  Resolved.NamedRest id →
    Checked.NamedRest id (remainder known)
      <$ withinOneTail written.span state.subst known
  where
  known = resolved state.subst expected
  remainder = case _ of
    TRecord row → TRecord (withoutLabels (writtenLabels written) row)
    other → other

-- A named rest is a binder of its arm.
restLocals ∷ Checked.Rest → Array Typed
restLocals = case _ of
  Checked.NamedRest id ty → [ { id, ty } ]
  Checked.NoRest → []
  Checked.IgnoredRest → []

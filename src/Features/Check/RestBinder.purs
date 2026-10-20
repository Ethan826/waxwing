module Features.Check.RestBinder (Labelled, matched) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic)
import Domain.Type (Ty)
import Features.Check.Matched (Matched, PatternEnv, Typed)
import Features.Check.PatternRow (Written, writtenLabels)
import Features.Check.Remainder (remainder)
import Features.Check.Scheme (State, Threaded)

-- A record pattern's result once its fields are checked: the checked
-- pattern, its binders, and a named rest's type. A module of its own so
-- that Features.Check.RecordPattern stays under the file budget (R005
-- Tranche B Task 7).

-- A field's label and its checked pattern.
type Labelled = { label ∷ String, matched ∷ Matched }

matched
  ∷ ∀ r
  . PatternEnv r
  → Ty Open
  → Written
  → Threaded (Array Labelled)
  → Either Diagnostic (Threaded Matched)
matched env expected written checked = built
  <$> restOf env checked.state expected written
  where
  built rest =
    { value:
        { pattern: Checked.Pattern
            { ty: expected
            , span: written.span
            , shape: Checked.Record (map fieldOf checked.value) rest.value
            }
        , locals: Array.concatMap localsOf checked.value
            <> restLocals rest.value
        }
    , state: rest.state
    }
  fieldOf field = { label: field.label, pattern: field.matched.pattern }
  localsOf field = field.matched.locals

-- R005 design §3, Tranche B design §5.2 (user decision 6, Task 7): a
-- named rest's type is ρ, the matched record required, once its fields
-- are checked, against `{ l1: α1, …, ln: αn, ...ρ }` with ρ and the αi
-- fresh and ρ lacking the labels: never a subtraction from a resolved
-- type, which over a label with two possible homes would remove nothing.
-- The fields' checks have put every written label in the record by then,
-- so the requirement only names what is left.
restOf
  ∷ ∀ r
  . PatternEnv r
  → State
  → Ty Open
  → Written
  → Either Diagnostic (Threaded Checked.Rest)
restOf env state expected written = case written.rest of
  Resolved.NoRest → Right { value: Checked.NoRest, state }
  Resolved.IgnoredRest → Right { value: Checked.IgnoredRest, state }
  Resolved.NamedRest id → named id <$> remainder env state expected
    (writtenLabels written)
    written.span
  where
  named id found = found { value = Checked.NamedRest id found.value }

-- A named rest is a binder of its arm.
restLocals ∷ Checked.Rest → Array Typed
restLocals = case _ of
  Checked.NamedRest id ty → [ { id, ty } ]
  Checked.NoRest → []
  Checked.IgnoredRest → []

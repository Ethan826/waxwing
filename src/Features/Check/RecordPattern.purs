module Features.Check.RecordPattern (Written, recordAgainst) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (lookup)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Traversable (traverse)
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..))
import Domain.Type.Record (RecordRow, labels, recordRow)
import Features.Check.FreshRecord (freshRecord)
import Features.Check.Matched (Against, Matched, PatternEnv)
import Features.Check.Require (bounded, expectType, typeName)
import Features.Check.Scheme (State, Threaded, resolved, threadAll)

-- A record pattern as resolved: its span, fields and how it ends (none,
-- a bare `...`, or a named rest, R005 design §3).
type Written =
  { span ∷ Span, fields ∷ Array Resolved.FieldPattern, rest ∷ Resolved.Rest }

-- A field to check: its label, the type expected of it, and its pattern.
type Expected = { label ∷ String, ty ∷ Ty Open, pattern ∷ Resolved.Pattern }

type KnownRow = RecordRow (Ty Open) Open

-- A field's label and its checked pattern.
type Labelled = { label ∷ String, matched ∷ Matched }

-- R004 design §2: the type expected, under the substitution, decides. A
-- record type, closed or open, supplies the fields' types; one whose tail
-- is a hole first grows by the labels it lacks; a hole becomes the record
-- the pattern writes; anything else, a rigid variable included, is no
-- record.
recordAgainst
  ∷ ∀ r
  . Against r
  → PatternEnv r
  → State
  → Ty Open
  → Written
  → Either Diagnostic (Threaded Matched)
recordAgainst against env state expected written = do
  bounded state expected written.span
  restChecked written
  case ty of
    TRecord row
      | growable row written → extended against env state expected written
          (unknown row written)
      | otherwise → matched expected written
          <$> fromRecord against env state expected { ty, row } written
    TVar (Hole _) → matched expected written
      <$> fromHole against env state expected written
    _ → notRecord unit
  where
  ty = resolved state.subst expected
  notRecord _ = do
    name ← typeName env written.span ty
    Left (problemAt (ExpectedRecord name) written.span)

-- R005 Task 1 placeholder: a named rest resolves, but its remainder type
-- is judged in Task 2. A bare `...` and no rest are checked as in R004.
restChecked ∷ Written → Either Diagnostic Unit
restChecked written = case written.rest of
  Resolved.NamedRest _ → Left
    ( problemAt
        (Internal "R005 placeholder: rest binders are checked in Task 2")
        written.span
    )
  _ → Right unit

-- Whether the pattern ends with `...`, bare or named: it then lists no
-- more fields than it writes.
endsOpen ∷ Written → Boolean
endsOpen written = case written.rest of
  Resolved.NoRest → false
  Resolved.IgnoredRest → true
  Resolved.NamedRest _ → true

-- A hole tail grows by the labels the pattern writes and the record lacks,
-- as `.l` grows one (user decision 2026-10-16), so arm order does not
-- matter; the grown record is then judged anew, holding every label.
extended
  ∷ ∀ r
  . Against r
  → PatternEnv r
  → State
  → Ty Open
  → Written
  → Array String
  → Either Diagnostic (Threaded Matched)
extended against env state expected written labels = do
  reached ← expectType env fresh.state expected fresh.record written.span
  recordAgainst against env reached expected written
  where
  fresh = freshRecord state labels true

-- Each label must be the type's (the first that is not, in written order,
-- at its label); then each field against its type; then, without `...`,
-- every known field must be listed and the row closed. A rigid tail never
-- supplies a field.
fromRecord
  ∷ ∀ r
  . Against r
  → PatternEnv r
  → State
  → Ty Open
  → { ty ∷ Ty Open, row ∷ KnownRow }
  → Written
  → Either Diagnostic (Threaded (Array Labelled))
fromRecord against env state expected known written = do
  typed ← traverse (knownField env known) written.fields
  checked ← fieldsAgainst against env state typed
  closed ← finished env checked.state expected known written
  pure checked { state = closed }

-- With `...` a pattern is done; without, it must list every known field.
finished
  ∷ ∀ r
  . PatternEnv r
  → State
  → Ty Open
  → { ty ∷ Ty Open, row ∷ KnownRow }
  → Written
  → Either Diagnostic State
finished env state expected known written =
  if endsOpen written then Right state
  else listed env state expected known
    written

knownField
  ∷ ∀ r
  . PatternEnv r
  → { ty ∷ Ty Open, row ∷ KnownRow }
  → Resolved.FieldPattern
  → Either Diagnostic Expected
knownField env known field = maybe' missing found
  (lookup field.label known.row.fields)
  where
  found ty = Right { label: field.label, ty, pattern: field.pattern }
  missing _ = do
    name ← typeName env field.span known.ty
    Left (problemAt (MissingField field.label name) field.span)

-- The first unlisted label in label order, else the tail: a hole tail is
-- closed, as a closed pattern makes a bare hole closed; a rigid one is
-- the rest the pattern misses.
listed
  ∷ ∀ r
  . PatternEnv r
  → State
  → Ty Open
  → { ty ∷ Ty Open, row ∷ KnownRow }
  → Written
  → Either Diagnostic State
listed env state expected known written = maybe' ended missingField
  (Array.find unlisted (labels known.row))
  where
  unlisted label = not (Array.elem label (writtenLabels written))
  missingField label = Left
    (problemAt (PatternMissingField label) written.span)
  ended _ = maybe' closedRow ofTail known.row.tail
  closedRow _ = Right state
  ofTail = case _ of
    Hole _ → expectType env state expected closed written.span
    Rigid _ → restMissing unit
  closed = TRecord (recordRow known.row.fields Nothing)
  restMissing _ = do
    name ← typeName env written.span known.ty
    Left (problemAt (PatternMissingRest name) written.span)

-- A record type grows only at a hole tail, and only when a label is new.
growable ∷ KnownRow → Written → Boolean
growable row written = maybe false grows row.tail
  where
  grows = case _ of
    Hole _ → not (Array.null (unknown row written))
    Rigid _ → false

-- The written labels the record type does not hold, in written order.
unknown ∷ KnownRow → Written → Array String
unknown row written = Array.filter absent (writtenLabels written)
  where
  absent label = not (Array.elem label (labels row))

writtenLabels ∷ Written → Array String
writtenLabels written = map fieldLabel written.fields
  where
  fieldLabel field = field.label

-- The hole is unified with the pattern's record: a fresh hole per label,
-- and with `...` a fresh tail lacking those labels (as `.l` makes one);
-- without, a closed record.
fromHole
  ∷ ∀ r
  . Against r
  → PatternEnv r
  → State
  → Ty Open
  → Written
  → Either Diagnostic (Threaded (Array Labelled))
fromHole against env state expected written = do
  reached ← expectType env fresh.state expected fresh.record written.span
  fieldsAgainst against env reached
    (Array.zipWith typed fresh.fields written.fields)
  where
  fresh = freshRecord state (writtenLabels written) (endsOpen written)
  typed ty field = { label: field.label, ty, pattern: field.pattern }

-- Each field against its type, in written order.
fieldsAgainst
  ∷ ∀ r
  . Against r
  → PatternEnv r
  → State
  → Array Expected
  → Either Diagnostic (Threaded (Array Labelled))
fieldsAgainst against env state typed = threadAll checkField state typed
  where
  checkField reached field =
    labelled field <$> against env reached field.ty field.pattern
  labelled field checked = checked
    { value = { label: field.label, matched: checked.value } }

matched
  ∷ Ty Open
  → Written
  → Threaded (Array Labelled)
  → Threaded Matched
matched expected written checked =
  { value:
      { pattern: Checked.Pattern
          { ty: expected
          , span: written.span
          , shape: Checked.Record (map fieldOf checked.value) (endsOpen written)
          }
      , locals: Array.concatMap localsOf checked.value
      }
  , state: checked.state
  }
  where
  fieldOf field = { label: field.label, pattern: field.matched.pattern }
  localsOf field = field.matched.locals

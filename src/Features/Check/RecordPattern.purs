module Features.Check.RecordPattern (Written, recordAgainst) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (lookup)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set as Set
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..))
import Domain.Type.Record (RecordRow, labels, recordRow)
import Features.Check.Lacks (addLacks)
import Features.Check.Matched (Against, Matched, PatternEnv)
import Features.Check.Require (bounded, expectType, typeName)
import Features.Check.Scheme (State, Threaded, resolved, threadAll)
import Features.Check.Unify (Flex(..))

-- A record pattern as resolved: its span, fields and whether it ends with
-- `...`.
type Written =
  { span ∷ Span, fields ∷ Array Resolved.FieldPattern, rest ∷ Boolean }

-- A field to check: its label, the type expected of it, and its pattern.
type Expected = { label ∷ String, ty ∷ Ty Open, pattern ∷ Resolved.Pattern }

type KnownRow = RecordRow (Ty Open) Open

-- A field's label and its checked pattern.
type Labelled = { label ∷ String, matched ∷ Matched }

-- R004 design §2: the type expected, under the substitution, decides. A
-- record type, closed or open, supplies the fields' types; a hole becomes
-- the record the pattern writes; anything else, a rigid variable included,
-- is no record.
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
  case ty of
    TRecord row → matched expected written
      <$> fromRecord against env state { ty, row } written
    TVar (Hole _) → matched expected written
      <$> fromHole against env state expected written
    _ → notRecord unit
  where
  ty = resolved state.subst expected
  notRecord _ = do
    name ← typeName env written.span ty
    Left (problemAt (ExpectedRecord name) written.span)

-- Each label must be the type's (the first that is not, in written order,
-- at its label); then each field against its type; then, without `...`,
-- every known field must be listed and the row closed. A tail never
-- supplies a field.
fromRecord
  ∷ ∀ r
  . Against r
  → PatternEnv r
  → State
  → { ty ∷ Ty Open, row ∷ KnownRow }
  → Written
  → Either Diagnostic (Threaded (Array Labelled))
fromRecord against env state known written = do
  typed ← traverse (knownField env known) written.fields
  checked ← fieldsAgainst against env state typed
  when (not written.rest) (listed env known written)
  pure checked

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

-- The first unlisted label in label order, else an open tail.
listed
  ∷ ∀ r
  . PatternEnv r
  → { ty ∷ Ty Open, row ∷ KnownRow }
  → Written
  → Either Diagnostic Unit
listed env known written = maybe' openRest missingField
  (Array.find unlisted (labels known.row))
  where
  writtenLabels = map fieldLabel written.fields
  fieldLabel field = field.label
  unlisted label = not (Array.elem label writtenLabels)
  missingField label = Left
    (problemAt (PatternMissingField label) written.span)
  openRest _ = maybe (pure unit) restMissing known.row.tail
  restMissing _ = do
    name ← typeName env written.span known.ty
    Left (problemAt (PatternMissingRest name) written.span)

-- The hole is unified with the pattern's record: a fresh hole per label,
-- and with `...` a fresh tail lacking those labels (as Check/Record's
-- `select` makes one); without, a closed record.
fromHole
  ∷ ∀ r
  . Against r
  → PatternEnv r
  → State
  → Ty Open
  → Written
  → Either Diagnostic (Threaded (Array Labelled))
fromHole against env state expected written = do
  reached ← expectType env widened expected wanted written.span
  fieldsAgainst against env reached typed
  where
  typed = Array.mapWithIndex fresh written.fields
  fresh index field =
    { label: field.label
    , ty: TVar (Hole (state.next + index))
    , pattern: field.pattern
    }
  tail = state.next + Array.length typed
  wanted = TRecord (recordRow (map entry typed) (openTail written tail))
  entry field = Tuple field.label field.ty
  widened = state
    { next = tail + 1
    , subst = addLacks (Meta tail) (lacking written) state.subst
    }

openTail ∷ Written → Int → Maybe Open
openTail written tail = if written.rest then Just (Hole tail) else Nothing

-- A closed record's tail is no meta, so it lacks nothing.
lacking ∷ Written → Set.Set String
lacking written =
  if written.rest then Set.fromFoldable (map label written.fields)
  else Set.empty
  where
  label field = field.label

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
          , shape: Checked.Record (map fieldOf checked.value) written.rest
          }
      , locals: Array.concatMap localsOf checked.value
      }
  , state: checked.state
  }
  where
  fieldOf field = { label: field.label, pattern: field.matched.pattern }
  localsOf field = field.matched.locals

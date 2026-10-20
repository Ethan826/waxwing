module Features.Check.RecordPattern (recordAgainst) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (lookup)
import Data.Maybe (maybe')
import Data.Traversable (traverse)
import Domain.Checked.Internal (Open(..))
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, problemAt)
import Domain.Type (Ty(..))
import Features.Check.FreshRecord (freshRecord)
import Features.Check.Matched (Against, Matched, PatternEnv)
import Features.Check.PatternRow
  ( KnownRow
  , Written
  , endsOpen
  , growable
  , listed
  , unknown
  , writtenLabels
  )
import Features.Check.Require (bounded, expectType, typeName)
import Features.Check.RestBinder (Labelled, matched)
import Features.Check.Scheme (State, Threaded, resolved, threadAll)

-- A field to check: its label, the type expected of it, and its pattern.
type Expected = { label ∷ String, ty ∷ Ty Open, pattern ∷ Resolved.Pattern }

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
  case ty of
    TRecord row
      | growable row written → extended against env state expected written
          (unknown row written)
      | otherwise → fromRecord against env state expected { ty, row } written
          >>= matched env expected written
    TVar (Hole _) → fromHole against env state expected written
      >>= matched env expected written
    _ → notRecord unit
  where
  ty = resolved state.subst expected
  notRecord _ = do
    name ← typeName env written.span ty
    Left (problemAt (ExpectedRecord name) written.span)

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

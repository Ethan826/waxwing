module Format.Parse.Record
  ( Removed
  , Updated
  , access
  , literal
  , removal
  , update
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Domain.Syntax
  ( Expr(..)
  , FieldName
  , FieldValue
  , Label
  , LiteralItem(..)
  , Position
  , Span
  )
import Format.Lex (Token)
import Format.Parse.Grammar
  ( Parser
  , dispatch
  , expect
  , on
  , sepByTrailing1
  , spanned
  )
import Format.Parse.RecordType (label)

-- An update's replacements, and where its `}` ends.
type Updated = { fields ∷ Array FieldValue, end ∷ Position }

-- The labels `without` removes, and where its `}` ends.
type Removed = { labels ∷ Array Label, end ∷ Position }

-- `{ l: e, … }` (R001 design §1): the caller has seen `{`, a lowercase
-- name and `:`. Fields stay in written order, which is evaluation order;
-- a comma may follow the last (G005). Each value is a nested position
-- (ADR 006), as a call argument is. With a `...e` item (R005 design §1;
-- the caller has seen `{` and `...`) the literal is an extension, items
-- still in written order; without one it is the literal it always was, so
-- programs before R005 resolve and lower as before.
literal ∷ Parser Expr → Parser Expr
literal inner = spanned built
  (expect "{" *> sepByTrailing1 "," "}" (item inner) <* expect "}")

built ∷ Span → Array LiteralItem → Expr
built span items =
  if Array.any spreads items then RecordExtension span items
  else RecordLiteral span (Array.mapMaybe fieldOf items)
  where
  spreads = case _ of
    Spreading _ _ → true
    Given _ → false
  fieldOf = case _ of
    Given found → Just found
    Spreading _ _ → Nothing

-- `...e` spans the three dots through the end of `e`; `e` is a nested
-- position as a field's value is.
item ∷ Parser Expr → Parser LiteralItem
item inner = dispatch [ on "..." (spanned Spreading (expect "..." *> inner)) ]
  (Given <$> field ":" inner)

-- `without { l, … }` after an operand: the caller has seen `without`.
removal ∷ Parser Removed
removal = removed <$ expect "without" <* expect "{"
  <*> sepByTrailing1 "," "}" labelled
  <*> expect "}"
  where
  removed labels close = { labels, end: close.span.end }
  labelled = named <$> label
  named found = { name: found.text, span: found.span }

-- `{ l = v, … }` after an operand: the caller has seen `{`, a lowercase
-- name and `=`, so `name =>` stays a match arm.
update ∷ Parser Expr → Parser Updated
update inner = spanned updated (fields "=" inner)
  where
  updated span found = { fields: found, end: span.end }

-- `.l`, the `.` touching the operand and the label (the caller's check).
access ∷ Parser FieldName
access = named <$ expect "." <*> label
  where
  named found = { name: found.text, span: found.span }

fields ∷ String → Parser Expr → Parser (Array FieldValue)
fields separator inner = expect "{"
  *> sepByTrailing1 "," "}" (field separator inner)
  <* expect "}"

-- Each label keeps its own span, for the duplicate and missing-field
-- diagnostics (design §6).
field ∷ String → Parser Expr → Parser FieldValue
field separator inner = valueOf <$> label <* expect separator <*> inner

valueOf ∷ Token → Expr → FieldValue
valueOf found value = { name: found.text, span: found.span, value }


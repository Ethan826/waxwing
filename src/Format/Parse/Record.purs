module Format.Parse.Record (Updated, literal, update, access) where

import Prelude
import Domain.Syntax (Expr(..), FieldName, FieldValue, Position)
import Format.Lex (Token)
import Format.Parse.Grammar
  ( Parser
  , expect
  , sepByTrailing1
  , spanned
  )
import Format.Parse.RecordType (label)

-- An update's replacements, and where its `}` ends.
type Updated = { fields ∷ Array FieldValue, end ∷ Position }

-- `{ l: e, … }` (R001 design §1): the caller has seen `{`, a lowercase
-- name and `:`. Fields stay in written order, which is evaluation order;
-- a comma may follow the last (G005). Each value is a nested position
-- (ADR 006), as a call argument is.
literal ∷ Parser Expr → Parser Expr
literal inner = spanned RecordLiteral (fields ":" inner)

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


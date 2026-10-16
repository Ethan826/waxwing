module Format.Parse.Postfix (Suffix, suffixes, applied) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Maybe (maybe)
import Domain.Syntax (Expr(..), FieldName, Position)
import Format.Parse.Grammar
  ( Parser
  , dispatch
  , expect
  , infixed
  , manyOn
  , manyWhile
  , on
  , sepBy1
  )
import Format.Parse.Lookahead (startsSuffix)
import Format.Parse.Name (Primary)
import Format.Parse.Record (Removed, Updated, access, removal, update)

-- A postfix chain's arguments, in order, and where its last `)` ends.
type Application = { arguments ∷ Array Expr, end ∷ Position }

-- One postfix operation: a run of `(…)` groups, `.l`, `{ l = v, … }` or
-- `without { l, … }`.
data Suffix
  = Arguments Application
  | Field FieldName
  | Update Updated
  | Without Removed

-- Call, access, update and removal are postfix at one level, applied left
-- to right (R001 design §1, R005 design §3), so `f(x) { name = n }.name` is
-- `((f(x)) { name = n }).name` and `f(x) without { a }.b` is
-- `((f(x)) without { a }).b`. Each operation pushes the operand before it
-- one level deeper, once per run of groups as before records (ADR 006);
-- the operations are read by a loop, so no phase of parsing recurses once
-- per operation. They are read only after the primary returns, so the
-- frames a nested primary costs are unchanged (G002).
suffixes ∷ Parser Expr → Parser (Array Suffix)
suffixes inner = manyWhile startsSuffix (infixed (suffix inner))

-- Each operation's node spans from where the primary starts (its `(` if
-- parenthesized, FN001 Task 4 review) to the operation's end.
applied ∷ Primary → Array Suffix → Expr
applied callee found = (foldl appliedTo callee found).value

suffix ∷ Parser Expr → Parser Suffix
suffix inner = dispatch
  [ on "(" (Arguments <$> chain inner)
  , on "." (Field <$> access)
  , on "without" (Without <$> removal)
  ]
  (Update <$> update inner)

appliedTo ∷ Primary → Suffix → Primary
appliedTo reached operation = { value: node, start: reached.start }
  where
  node = case operation of
    Arguments found → Apply (spanTo found.end) reached.value found.arguments
    Field label → FieldAccess (spanTo label.span.end) reached.value label
    Update found → RecordUpdate (spanTo found.end) reached.value found.fields
    Without found →
      RecordRemoval (spanTo found.end) reached.value found.labels
  spanTo end = { start: reached.start, end }

-- A primary's `(…)` groups read as one application of every group's
-- arguments in order: by design §5 `g(1)(2)` is `g(1, 2)`, same order and
-- stage boundaries, so `g(1)(2)` is `Apply (Call g [1]) [2]`. Each group
-- takes at least one argument; the run ends at its last `)`.
chain ∷ Parser Expr → Parser Application
chain inner = joined <$> group <*> manyOn "(" group
  where
  group = groupOf <$ expect "(" <*> sepBy1 "," inner <*> expect ")"
  groupOf arguments close = { arguments, end: close.span.end }
  joined first rest =
    { arguments: Array.concat (Array.cons first.arguments (map args rest))
    , end: maybe first.end endOf (Array.last rest)
    }
  args found = found.arguments
  endOf found = found.end

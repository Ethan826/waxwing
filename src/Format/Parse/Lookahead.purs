module Format.Parse.Lookahead
  ( labelled
  , literalStart
  , startsSuffix
  ) where

import Prelude
import Format.Lex (isName, isUpper)
import Format.Parse.Cursor (State, peekText, skip, touchesQualifier)

-- Decisions on the next few tokens, consuming none, beneath
-- Format.Parse.Grammar (R001 design §1).

-- `{`, then a lowercase name and `separator`: a record literal (`:`) or
-- update (`=`). No block item, match arm (`=>`) or handler clause begins
-- so, and `{}` and `{ x }` stay Unit and a block.
labelled ∷ String → State → Boolean
labelled separator state = state.upcoming == "{" && isName label
  && not (isUpper label)
  && peekText (skip after) == separator
  where
  after = skip state
  label = peekText after

-- `{`, then a field (`l:`) or a `...`: a record literal. A block item
-- never begins with `...` (R005 design §1), so a literal is never a block.
literalStart ∷ State → Boolean
literalStart state = labelled ":" state
  || state.upcoming == "{" && peekText (skip state) == "..."

-- A postfix operation after an operand: a call's `(`, a `.` touching the
-- operand and the label (as a qualifier's does, R19), an update, or
-- `without` (R005 design §3).
startsSuffix ∷ State → Boolean
startsSuffix state = state.upcoming == "(" || touchesQualifier state
  || labelled "=" state
  || state.upcoming == "without"

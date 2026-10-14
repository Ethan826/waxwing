module Format.Parse.Lookahead (labelled, startsSuffix) where

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

-- A postfix operation after an operand: a call's `(`, a `.` touching the
-- operand and the label (as a qualifier's does, R19), or an update.
startsSuffix ∷ State → Boolean
startsSuffix state = state.upcoming == "(" || touchesQualifier state
  || labelled "=" state
